"""Administrative profile mutations for Schedule Creator."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import replace
from datetime import datetime
from typing import Any
from uuid import uuid4

import voluptuous as vol
from homeassistant.components.websocket_api.connection import ActiveConnection
from homeassistant.components.websocket_api.decorators import (
    async_response,
    require_admin,
    websocket_command,
)
from homeassistant.core import HomeAssistant

from .models import IntegrationConfig, Profile, ProfileType
from .mutation_api import MutationClientError, async_mutate_config

_REVISION = vol.All(int, vol.Range(min=0))
_PROFILE_ID = vol.All(str, vol.Length(min=1))
_NAME = vol.All(str, vol.Length(min=1))
_PROFILE_TYPE = vol.In(tuple(item.value for item in ProfileType))
_OPTIONAL_TEXT = vol.Any(None, str)
_ORDER = vol.All(int, vol.Range(min=0))


def _profile(config: IntegrationConfig, profile_id: str) -> Profile:
    try:
        return next(item for item in config.profiles if item.id == profile_id)
    except StopIteration as err:
        raise MutationClientError("not_found", "Profile was not found.") from err


def _replace_profile(
    config: IntegrationConfig, updated: Profile, now: datetime
) -> IntegrationConfig:
    profiles = tuple(
        updated
        if profile.id == updated.id
        else (
            replace(
                profile,
                active=False,
                revision=profile.revision + 1,
                updated_at=max(profile.updated_at, now),
            )
            if updated.active
            and updated.profile_type is ProfileType.EXCLUSIVE
            and profile.active
            and profile.profile_type is ProfileType.EXCLUSIVE
            else profile
        )
        for profile in config.profiles
    )
    return replace(
        config,
        revision=config.revision + 1,
        profiles=profiles,
        active_profile_ids=tuple(
            profile.id for profile in profiles if profile.active
        ),
        updated_at=max(config.updated_at, now),
    )


async def _mutate(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
    mutation: Callable[[IntegrationConfig, datetime], IntegrationConfig],
    response: Callable[[IntegrationConfig], dict[str, Any]],
) -> None:
    await async_mutate_config(
        hass,
        connection,
        msg,
        mutation,
        response,
        invalid_message="Profile data is invalid.",
        internal_message="Unable to update Schedule Creator profiles.",
    )


@require_admin
@websocket_command(
    {
        vol.Required("type"): "schedule_creator/profile/create",
        vol.Required("expected_revision"): _REVISION,
        vol.Required("name"): _NAME,
        vol.Required("profile_type"): _PROFILE_TYPE,
        vol.Optional("icon", default=None): _OPTIONAL_TEXT,
        vol.Optional("color", default=None): _OPTIONAL_TEXT,
        vol.Optional("order", default=0): _ORDER,
    }
)
@async_response
async def websocket_create_profile(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    """Create one inactive profile with a server-owned identity."""

    profile_id = str(uuid4())

    def mutation(config: IntegrationConfig, now: datetime) -> IntegrationConfig:
        profile = Profile(
            id=profile_id,
            revision=1,
            name=msg["name"],
            profile_type=ProfileType(msg["profile_type"]),
            active=False,
            icon=msg["icon"],
            color=msg["color"],
            order=msg["order"],
            created_at=now,
            updated_at=now,
        )
        return replace(
            config,
            revision=config.revision + 1,
            profiles=(*config.profiles, profile),
            updated_at=max(config.updated_at, now),
        )

    await _mutate(
        hass,
        connection,
        msg,
        mutation,
        lambda config: {
            "revision": config.revision,
            "profile": _profile(config, profile_id).to_dict(),
        },
    )


@require_admin
@websocket_command(
    {
        vol.Required("type"): "schedule_creator/profile/update",
        vol.Required("expected_revision"): _REVISION,
        vol.Required("profile_id"): _PROFILE_ID,
        vol.Optional("name"): _NAME,
        vol.Optional("profile_type"): _PROFILE_TYPE,
        vol.Optional("icon"): _OPTIONAL_TEXT,
        vol.Optional("color"): _OPTIONAL_TEXT,
        vol.Optional("order"): _ORDER,
    }
)
@async_response
async def websocket_update_profile(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    """Update editable profile fields and advance its record revision."""

    editable = {"name", "profile_type", "icon", "color", "order"}

    def mutation(config: IntegrationConfig, now: datetime) -> IntegrationConfig:
        current = _profile(config, msg["profile_id"])
        changes = {key: msg[key] for key in editable if key in msg}
        if not changes:
            raise ValueError("no profile fields supplied")
        if "profile_type" in changes:
            changes["profile_type"] = ProfileType(changes["profile_type"])
        updated = replace(
            current,
            **changes,
            revision=current.revision + 1,
            updated_at=max(current.updated_at, now),
        )
        return _replace_profile(config, updated, now)

    await _mutate(
        hass,
        connection,
        msg,
        mutation,
        lambda config: {
            "revision": config.revision,
            "profile": _profile(config, msg["profile_id"]).to_dict(),
        },
    )


@require_admin
@websocket_command(
    {
        vol.Required("type"): "schedule_creator/profile/delete",
        vol.Required("expected_revision"): _REVISION,
        vol.Required("profile_id"): _PROFILE_ID,
    }
)
@async_response
async def websocket_delete_profile(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    """Delete a profile only when no group or schedule still references it."""

    def mutation(config: IntegrationConfig, now: datetime) -> IntegrationConfig:
        profile_id = msg["profile_id"]
        _profile(config, profile_id)
        if any(item.profile_id == profile_id for item in config.groups) or any(
            item.profile_id == profile_id for item in config.schedules
        ):
            raise MutationClientError(
                "profile_in_use", "Profile still owns groups or schedules."
            )
        return replace(
            config,
            revision=config.revision + 1,
            profiles=tuple(item for item in config.profiles if item.id != profile_id),
            active_profile_ids=tuple(
                item for item in config.active_profile_ids if item != profile_id
            ),
            updated_at=max(config.updated_at, now),
        )

    await _mutate(
        hass,
        connection,
        msg,
        mutation,
        lambda config: {
            "revision": config.revision,
            "deleted_profile_id": msg["profile_id"],
        },
    )


@require_admin
@websocket_command(
    {
        vol.Required("type"): "schedule_creator/profile/set_active",
        vol.Required("expected_revision"): _REVISION,
        vol.Required("profile_id"): _PROFILE_ID,
        vol.Required("active"): bool,
    }
)
@async_response
async def websocket_set_profile_active(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    """Activate a profile, enforcing exclusivity among exclusive profiles."""

    def mutation(config: IntegrationConfig, now: datetime) -> IntegrationConfig:
        selected = _profile(config, msg["profile_id"])
        profiles: list[Profile] = []
        for profile in config.profiles:
            active = profile.active
            if profile.id == selected.id:
                active = msg["active"]
            elif (
                msg["active"]
                and selected.profile_type is ProfileType.EXCLUSIVE
                and profile.profile_type is ProfileType.EXCLUSIVE
            ):
                active = False
            profiles.append(
                profile
                if active is profile.active
                else replace(
                    profile,
                    active=active,
                    revision=profile.revision + 1,
                    updated_at=max(profile.updated_at, now),
                )
            )
        if tuple(profiles) == config.profiles:
            raise ValueError("profile already has requested active state")
        return replace(
            config,
            revision=config.revision + 1,
            profiles=tuple(profiles),
            active_profile_ids=tuple(
                profile.id for profile in profiles if profile.active
            ),
            updated_at=max(config.updated_at, now),
        )

    await _mutate(
        hass,
        connection,
        msg,
        mutation,
        lambda config: {
            "revision": config.revision,
            "profiles": [profile.to_dict() for profile in config.profiles],
            "active_profile_ids": list(config.active_profile_ids),
        },
    )


PROFILE_COMMANDS = (
    websocket_create_profile,
    websocket_update_profile,
    websocket_delete_profile,
    websocket_set_profile_active,
)
