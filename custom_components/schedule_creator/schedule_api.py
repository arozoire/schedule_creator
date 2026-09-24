"""Administrative schedule mutations for Schedule Creator."""

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

from .models import IntegrationConfig, Schedule
from .mutation_api import (
    ConfigMutation,
    MutationClientError,
    MutationResponse,
    async_mutate_config,
)
from .status_notifications import STATUS_SETTING, URL_SETTING, opted_in

_REVISION = vol.All(int, vol.Range(min=0))
_RECORD_ID = vol.All(str, vol.Length(min=1))
_NAME = vol.All(str, vol.Length(min=1))
_ENTITY_IDS = [str]
_OBJECT = dict
_OBJECTS = [dict]
_DATES = [str]


def _schedule(config: IntegrationConfig, schedule_id: str) -> Schedule:
    try:
        return next(item for item in config.schedules if item.id == schedule_id)
    except StopIteration as err:
        raise MutationClientError("not_found", "Schedule was not found.") from err


def _owned_group(config: IntegrationConfig, profile_id: str, group_id: str) -> None:
    if not any(profile.id == profile_id for profile in config.profiles):
        raise MutationClientError("not_found", "Profile was not found.")
    group = next((item for item in config.groups if item.id == group_id), None)
    if group is None:
        raise MutationClientError("not_found", "Group was not found.")
    if group.profile_id != profile_id:
        raise MutationClientError(
            "ownership_mismatch", "Group does not belong to the profile."
        )


def _record(value: object, allowed: set[str], path: str) -> dict[str, Any]:
    if not isinstance(value, dict) or not set(value) <= allowed:
        raise ValueError(f"invalid {path}")
    return value


def _time_slot(value: object) -> dict[str, Any]:
    item = _record(value, {"weekdays", "start", "end"}, "time slot")
    return {"schema_version": 1, "id": str(uuid4()), **item}


def _action(value: object) -> dict[str, Any]:
    item = _record(value, {"domain", "action", "data"}, "action")
    return {"schema_version": 1, "id": str(uuid4()), **item}


def _condition(value: object) -> dict[str, Any]:
    item = _record(
        value,
        {
            "operator",
            "entity_id",
            "value",
            "lower",
            "upper",
            "children",
            "minimum_duration_seconds",
            "hysteresis",
            "release_delay_seconds",
        },
        "condition",
    )
    children = item.get("children", [])
    if not isinstance(children, list):
        raise ValueError("invalid condition children")
    return {
        "schema_version": 1,
        "id": str(uuid4()),
        "operator": item.get("operator"),
        "entity_id": item.get("entity_id"),
        "value": item.get("value"),
        "lower": item.get("lower"),
        "upper": item.get("upper"),
        "children": [_condition(child) for child in children],
        "minimum_duration_seconds": item.get("minimum_duration_seconds"),
        "hysteresis": item.get("hysteresis"),
        **(
            {"release_delay_seconds": item["release_delay_seconds"]}
            if item.get("release_delay_seconds") is not None
            else {}
        ),
    }


def _notification(value: object) -> dict[str, Any]:
    item = _record(value, {"action", "title", "message"}, "notification")
    return {"schema_version": 1, "id": str(uuid4()), **item}


def _nested_changes(msg: dict[str, Any]) -> dict[str, Any]:
    changes = {
        key: msg[key]
        for key in {
            "name",
            "enabled",
            "target_entity_ids",
            "override_policy",
            "inclusion_dates",
            "exclusion_dates",
        }
        if key in msg
    }
    if "time_slots" in msg:
        changes["time_slots"] = [_time_slot(item) for item in msg["time_slots"]]
    for field in ("start_action", "end_action"):
        if field in msg:
            value = msg[field]
            changes[field] = None if value is None else _action(value)
    if "condition" in msg:
        value = msg["condition"]
        changes["condition"] = None if value is None else _condition(value)
    for field in ("start_notification", "end_notification"):
        if field in msg:
            value = msg[field]
            changes[field] = None if value is None else _notification(value)
    return changes


def _with_status(
    config: IntegrationConfig, schedule_id: str, enabled: bool | None
) -> dict[str, Any]:
    """Return settings with the live status opt-in for one schedule updated."""

    settings = dict(config.settings)
    if enabled is None:
        return settings
    selected = set(opted_in(config.settings))
    if enabled:
        selected.add(schedule_id)
    else:
        selected.discard(schedule_id)
    settings[STATUS_SETTING] = tuple(sorted(selected))
    return settings


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
        invalid_message="Schedule data is invalid.",
        internal_message="Unable to update Schedule Creator schedules.",
    )


@require_admin
@websocket_command(
    {
        vol.Required("type"): "schedule_creator/schedule/create",
        vol.Required("expected_revision"): _REVISION,
        vol.Required("profile_id"): _RECORD_ID,
        vol.Required("group_id"): _RECORD_ID,
        vol.Required("name"): _NAME,
        vol.Optional("enabled", default=True): bool,
        vol.Required("target_entity_ids"): _ENTITY_IDS,
        vol.Required("time_slots"): _OBJECTS,
        vol.Required("start_action"): _OBJECT,
        vol.Optional("end_action", default=None): vol.Any(None, _OBJECT),
        vol.Optional("condition", default=None): vol.Any(None, _OBJECT),
        vol.Optional("override_policy", default="cooperative"): str,
        vol.Optional("start_notification", default=None): vol.Any(None, _OBJECT),
        vol.Optional("end_notification", default=None): vol.Any(None, _OBJECT),
        vol.Optional("inclusion_dates", default=[]): _DATES,
        vol.Optional("exclusion_dates", default=[]): _DATES,
        vol.Optional("status_notification"): bool,
    }
)
@async_response
async def websocket_create_schedule(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    """Create a schedule in an existing profile group."""

    schedule_id = str(uuid4())

    def mutation(config: IntegrationConfig, now: datetime) -> IntegrationConfig:
        _owned_group(config, msg["profile_id"], msg["group_id"])
        payload = {
            "schema_version": 1,
            "id": schedule_id,
            "revision": 1,
            "profile_id": msg["profile_id"],
            "group_id": msg["group_id"],
            **_nested_changes(msg),
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }
        schedule = Schedule.from_dict(payload)
        return replace(
            config,
            revision=config.revision + 1,
            schedules=(*config.schedules, schedule),
            settings=_with_status(config, schedule_id, msg.get("status_notification")),
            updated_at=max(config.updated_at, now),
        )

    await _mutate(
        hass,
        connection,
        msg,
        mutation,
        lambda config: {
            "revision": config.revision,
            "schedule": _schedule(config, schedule_id).to_dict(),
        },
    )


@require_admin
@websocket_command(
    {
        vol.Required("type"): "schedule_creator/schedule/update",
        vol.Required("expected_revision"): _REVISION,
        vol.Required("schedule_id"): _RECORD_ID,
        vol.Optional("name"): _NAME,
        vol.Optional("enabled"): bool,
        vol.Optional("target_entity_ids"): _ENTITY_IDS,
        vol.Optional("time_slots"): _OBJECTS,
        vol.Optional("start_action"): _OBJECT,
        vol.Optional("end_action"): vol.Any(None, _OBJECT),
        vol.Optional("condition"): vol.Any(None, _OBJECT),
        vol.Optional("override_policy"): str,
        vol.Optional("start_notification"): vol.Any(None, _OBJECT),
        vol.Optional("end_notification"): vol.Any(None, _OBJECT),
        vol.Optional("inclusion_dates"): _DATES,
        vol.Optional("exclusion_dates"): _DATES,
        vol.Optional("status_notification"): bool,
    }
)
@async_response
async def websocket_update_schedule(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    """Update schedule behavior without moving its ownership."""

    def mutation(config: IntegrationConfig, now: datetime) -> IntegrationConfig:
        current = _schedule(config, msg["schedule_id"])
        changes = _nested_changes(msg)
        status = msg.get("status_notification")
        if not changes and status is None:
            raise ValueError("no schedule fields supplied")
        settings = _with_status(config, current.id, status)
        if not changes:
            return replace(
                config,
                revision=config.revision + 1,
                settings=settings,
                updated_at=max(config.updated_at, now),
            )
        payload = current.to_dict()
        payload.update(changes)
        payload.update(
            {
                "revision": current.revision + 1,
                "updated_at": max(current.updated_at, now).isoformat(),
            }
        )
        updated = Schedule.from_dict(payload)
        return replace(
            config,
            revision=config.revision + 1,
            schedules=tuple(
                updated if item.id == updated.id else item for item in config.schedules
            ),
            settings=settings,
            updated_at=max(config.updated_at, now),
        )

    await _mutate(
        hass,
        connection,
        msg,
        mutation,
        lambda config: {
            "revision": config.revision,
            "schedule": _schedule(config, msg["schedule_id"]).to_dict(),
        },
    )


@require_admin
@websocket_command(
    {
        vol.Required("type"): "schedule_creator/schedule/delete",
        vol.Required("expected_revision"): _REVISION,
        vol.Required("schedule_id"): _RECORD_ID,
    }
)
@async_response
async def websocket_delete_schedule(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    """Delete a schedule configuration without touching frozen runtime records."""

    def mutation(config: IntegrationConfig, now: datetime) -> IntegrationConfig:
        schedule_id = msg["schedule_id"]
        _schedule(config, schedule_id)
        return replace(
            config,
            revision=config.revision + 1,
            schedules=tuple(
                item for item in config.schedules if item.id != schedule_id
            ),
            settings=_with_status(config, schedule_id, False),
            updated_at=max(config.updated_at, now),
        )

    await _mutate(
        hass,
        connection,
        msg,
        mutation,
        lambda config: {
            "revision": config.revision,
            "deleted_schedule_id": msg["schedule_id"],
        },
    )


@require_admin
@websocket_command(
    {
        vol.Required("type"): "schedule_creator/settings/update",
        vol.Required("expected_revision"): _REVISION,
        vol.Required("notification_url"): vol.Any(
            None, vol.All(str, vol.Match(r"^/[^\s]*$"))
        ),
    }
)
@async_response
async def websocket_update_settings(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    """Set the dashboard path opened by notifications."""

    def mutation(config: IntegrationConfig, now: datetime) -> IntegrationConfig:
        settings = dict(config.settings)
        if msg["notification_url"] is None:
            settings.pop(URL_SETTING, None)
        else:
            settings[URL_SETTING] = msg["notification_url"]
        return replace(
            config,
            revision=config.revision + 1,
            settings=settings,
            updated_at=max(config.updated_at, now),
        )

    await _mutate(
        hass,
        connection,
        msg,
        mutation,
        lambda config: {"revision": config.revision, "settings": dict(config.settings)},
    )


SCHEDULE_COMMANDS = (
    websocket_update_settings,
    websocket_create_schedule,
    websocket_update_schedule,
    websocket_delete_schedule,
)
