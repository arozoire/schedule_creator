"""Administrative group mutations for Schedule Creator."""

from __future__ import annotations

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

from .models import Group, IntegrationConfig
from .mutation_api import (
    ConfigMutation,
    MutationClientError,
    MutationResponse,
    async_mutate_config,
)

_REVISION = vol.All(int, vol.Range(min=0))
_RECORD_ID = vol.All(str, vol.Length(min=1))
_NAME = vol.All(str, vol.Length(min=1))
_OPTIONAL_TEXT = vol.Any(None, str)
_ORDER = vol.All(int, vol.Range(min=0))
_ENTITY_IDS = [str]


def _profile_exists(config: IntegrationConfig, profile_id: str) -> None:
    if not any(profile.id == profile_id for profile in config.profiles):
        raise MutationClientError("not_found", "Profile was not found.")


def _group(config: IntegrationConfig, group_id: str) -> Group:
    try:
        return next(item for item in config.groups if item.id == group_id)
    except StopIteration as err:
        raise MutationClientError("not_found", "Group was not found.") from err


async def _mutate(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
    mutation: ConfigMutation,
    response: MutationResponse,
) -> None:
    await async_mutate_config(
        hass,
        connection,
        msg,
        mutation,
        response,
        invalid_message="Group data is invalid.",
        internal_message="Unable to update Schedule Creator groups.",
    )


@require_admin
@websocket_command(
    {
        vol.Required("type"): "schedule_creator/group/create",
        vol.Required("expected_revision"): _REVISION,
        vol.Required("profile_id"): _RECORD_ID,
        vol.Required("name"): _NAME,
        vol.Required("entity_ids"): _ENTITY_IDS,
        vol.Optional("icon", default=None): _OPTIONAL_TEXT,
        vol.Optional("color", default=None): _OPTIONAL_TEXT,
        vol.Optional("order", default=0): _ORDER,
    }
)
@async_response
async def websocket_create_group(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    """Create a group inside an existing profile."""

    group_id = str(uuid4())

    def mutation(config: IntegrationConfig, now: datetime) -> IntegrationConfig:
        _profile_exists(config, msg["profile_id"])
        group = Group(
            id=group_id,
            revision=1,
            profile_id=msg["profile_id"],
            name=msg["name"],
            entity_ids=tuple(msg["entity_ids"]),
            icon=msg["icon"],
            color=msg["color"],
            order=msg["order"],
            created_at=now,
            updated_at=now,
        )
        return replace(
            config,
            revision=config.revision + 1,
            groups=(*config.groups, group),
            updated_at=max(config.updated_at, now),
        )

    await _mutate(
        hass,
        connection,
        msg,
        mutation,
        lambda config: {
            "revision": config.revision,
            "group": _group(config, group_id).to_dict(),
        },
    )


@require_admin
@websocket_command(
    {
        vol.Required("type"): "schedule_creator/group/update",
        vol.Required("expected_revision"): _REVISION,
        vol.Required("group_id"): _RECORD_ID,
        vol.Optional("name"): _NAME,
        vol.Optional("entity_ids"): _ENTITY_IDS,
        vol.Optional("icon"): _OPTIONAL_TEXT,
        vol.Optional("color"): _OPTIONAL_TEXT,
        vol.Optional("order"): _ORDER,
    }
)
@async_response
async def websocket_update_group(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    """Update group presentation and entity membership."""

    editable = {"name", "entity_ids", "icon", "color", "order"}

    def mutation(config: IntegrationConfig, now: datetime) -> IntegrationConfig:
        current = _group(config, msg["group_id"])
        changes = {key: msg[key] for key in editable if key in msg}
        if not changes:
            raise ValueError("no group fields supplied")
        if "entity_ids" in changes:
            changes["entity_ids"] = tuple(changes["entity_ids"])
        updated = replace(
            current,
            **changes,
            revision=current.revision + 1,
            updated_at=max(current.updated_at, now),
        )
        return replace(
            config,
            revision=config.revision + 1,
            groups=tuple(
                updated if group.id == updated.id else group
                for group in config.groups
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
            "group": _group(config, msg["group_id"]).to_dict(),
        },
    )


@require_admin
@websocket_command(
    {
        vol.Required("type"): "schedule_creator/group/delete",
        vol.Required("expected_revision"): _REVISION,
        vol.Required("group_id"): _RECORD_ID,
    }
)
@async_response
async def websocket_delete_group(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    """Delete a group only when no schedule still references it."""

    def mutation(config: IntegrationConfig, now: datetime) -> IntegrationConfig:
        group_id = msg["group_id"]
        _group(config, group_id)
        if any(schedule.group_id == group_id for schedule in config.schedules):
            raise MutationClientError(
                "group_in_use", "Group still owns one or more schedules."
            )
        return replace(
            config,
            revision=config.revision + 1,
            groups=tuple(group for group in config.groups if group.id != group_id),
            updated_at=max(config.updated_at, now),
        )

    await _mutate(
        hass,
        connection,
        msg,
        mutation,
        lambda config: {
            "revision": config.revision,
            "deleted_group_id": msg["group_id"],
        },
    )


GROUP_COMMANDS = (
    websocket_create_group,
    websocket_update_group,
    websocket_delete_group,
)
