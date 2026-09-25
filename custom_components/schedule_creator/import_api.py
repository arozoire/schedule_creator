"""Add profiles, groups and schedules converted from another tool in one commit.

The conversion itself (e.g. from a weekly-schedule-card backup) runs in the
card, where the user reviews it; this command only validates and appends.
Imported profiles are always inactive, so an import never sends commands.
"""

from __future__ import annotations

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

from .models import Group, IntegrationConfig, Profile, Schedule
from .mutation_api import MutationClientError, async_mutate_config
from .schedule_api import _nested_changes

_REVISION = vol.All(int, vol.Range(min=0))
_SOURCE = vol.In(("weekly-schedule-card",))
MAX_IMPORT_PROFILES = 20
MAX_IMPORT_GROUPS = 100
MAX_IMPORT_SCHEDULES = 500
MAX_IMPORT_HISTORY = 20
_SCHEDULE_FIELDS = {
    "name",
    "enabled",
    "target_entity_ids",
    "time_slots",
    "start_action",
    "end_action",
    "condition",
    "override_policy",
    "start_notification",
    "end_notification",
    "inclusion_dates",
    "exclusion_dates",
}


def _fields(
    value: object, allowed: set[str], required: set[str], path: str
) -> dict[str, Any]:
    if (
        not isinstance(value, dict)
        or not set(value) <= allowed
        or not required <= set(value)
    ):
        raise MutationClientError("invalid_import", f"Invalid {path} in the import.")
    return value


def merged_config(
    current: IntegrationConfig, msg: dict[str, Any], now: datetime
) -> IntegrationConfig:
    """Append the imported tree after validating every record and the whole config."""

    profiles_in = msg["profiles"]
    groups_in = [
        group
        for profile in profiles_in
        if isinstance(profile, dict)
        for group in profile.get("groups") or []
    ]
    schedules_in = [
        item
        for group in groups_in
        if isinstance(group, dict)
        for item in group.get("schedules") or []
    ]
    if not profiles_in or len(profiles_in) > MAX_IMPORT_PROFILES:
        raise MutationClientError(
            "invalid_import", "The import has no profiles or too many."
        )
    if len(groups_in) > MAX_IMPORT_GROUPS or len(schedules_in) > MAX_IMPORT_SCHEDULES:
        raise MutationClientError("invalid_import", "The import is too large.")
    stamp = now.isoformat()
    order = max((profile.order for profile in current.profiles), default=-1) + 1
    profiles: list[Profile] = []
    groups: list[Group] = []
    schedules: list[Schedule] = []
    for p_index, raw_profile in enumerate(profiles_in):
        item = _fields(
            raw_profile,
            {"name", "profile_type", "icon", "color", "groups"},
            {"name", "profile_type", "groups"},
            "profile",
        )
        profile = Profile.from_dict(
            {
                "schema_version": 1,
                "id": str(uuid4()),
                "revision": 1,
                "name": item["name"],
                "profile_type": item["profile_type"],
                "active": False,
                "icon": item.get("icon"),
                "color": item.get("color"),
                "order": order + p_index,
                "created_at": stamp,
                "updated_at": stamp,
            }
        )
        profiles.append(profile)
        for g_index, raw_group in enumerate(item["groups"]):
            entry = _fields(
                raw_group,
                {"name", "entity_ids", "icon", "color", "schedules"},
                {"name", "entity_ids", "schedules"},
                "group",
            )
            group = Group.from_dict(
                {
                    "schema_version": 1,
                    "id": str(uuid4()),
                    "revision": 1,
                    "profile_id": profile.id,
                    "name": entry["name"],
                    "entity_ids": entry["entity_ids"],
                    "icon": entry.get("icon"),
                    "color": entry.get("color"),
                    "order": g_index,
                    "created_at": stamp,
                    "updated_at": stamp,
                }
            )
            groups.append(group)
            for raw_schedule in entry["schedules"]:
                fields = _fields(
                    raw_schedule,
                    _SCHEDULE_FIELDS,
                    {"name", "target_entity_ids", "time_slots", "start_action"},
                    "schedule",
                )
                try:
                    nested = _nested_changes(fields)
                except ValueError as err:
                    raise MutationClientError(
                        "invalid_import", "Invalid schedule in the import."
                    ) from err
                schedules.append(
                    Schedule.from_dict(
                        {
                            "schema_version": 1,
                            "id": str(uuid4()),
                            "revision": 1,
                            "profile_id": profile.id,
                            "group_id": group.id,
                            "enabled": True,
                            "end_action": None,
                            "condition": None,
                            "override_policy": "cooperative",
                            "start_notification": None,
                            "end_notification": None,
                            "inclusion_dates": [],
                            "exclusion_dates": [],
                            **nested,
                            "created_at": stamp,
                            "updated_at": stamp,
                        }
                    )
                )
    # Rebuild through the strict decoder so the whole result is validated.
    payload = current.to_dict()
    metadata = dict(payload["migration_metadata"])
    history = metadata.get("imports")
    history = list(history) if isinstance(history, list) else []
    history.append(
        {
            "source": msg["source"],
            "source_created_at": msg.get("source_created_at"),
            "imported_at": stamp,
            "profile_ids": [profile.id for profile in profiles],
        }
    )
    metadata["imports"] = history[-MAX_IMPORT_HISTORY:]
    payload.update(
        revision=current.revision + 1,
        profiles=[*payload["profiles"], *(p.to_dict() for p in profiles)],
        groups=[*payload["groups"], *(g.to_dict() for g in groups)],
        schedules=[*payload["schedules"], *(s.to_dict() for s in schedules)],
        migration_metadata=metadata,
        updated_at=max(current.updated_at, now).isoformat(),
    )
    return IntegrationConfig.from_dict(payload)


@require_admin
@websocket_command(
    {
        vol.Required("type"): "schedule_creator/import/merge",
        vol.Required("expected_revision"): _REVISION,
        vol.Required("source"): _SOURCE,
        vol.Optional("source_created_at"): vol.Any(None, str),
        vol.Required("profiles"): [dict],
    }
)
@async_response
async def websocket_import_merge(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    """Append imported profiles (inactive), groups and schedules."""

    before: set[str] = set()

    def mutation(config: IntegrationConfig, now: datetime) -> IntegrationConfig:
        before.update(profile.id for profile in config.profiles)
        return merged_config(config, msg, now)

    await async_mutate_config(
        hass,
        connection,
        msg,
        mutation,
        lambda config: {
            "revision": config.revision,
            "profile_ids": [p.id for p in config.profiles if p.id not in before],
            "schedules": len(config.schedules),
        },
        invalid_message="Import content is invalid.",
        internal_message="Unable to import the schedules.",
    )


IMPORT_COMMANDS = (websocket_import_merge,)
