"""Simple import files: profiles, groups and schedules without ids or revisions.

A ``schedule_creator.import`` file (for example written by an AI assistant)
only describes what to add. It is completed here (ids, defaults), checked with
the same validator as every other change, previewed in the card with the faulty
field named, and appended as inactive profiles: an import never sends commands.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

import probatio as vol
from homeassistant.components.websocket_api.connection import ActiveConnection
from homeassistant.components.websocket_api.decorators import (
    async_response,
    require_admin,
    websocket_command,
)
from homeassistant.core import HomeAssistant

from .import_api import _SCHEDULE_FIELDS, merged_config
from .models import IntegrationConfig, ModelValidationError
from .mutation_api import MutationClientError, _loaded_runtime, async_mutate_config

_REVISION = vol.All(int, vol.Range(min=0))
IMPORT_FORMAT = "schedule_creator.import"
IMPORT_FORMAT_VERSION = 1
# Fields of a full backup that an import file may carry: they are recreated.
_IGNORED = frozenset(
    {
        "id",
        "schema_version",
        "revision",
        "created_at",
        "updated_at",
        "order",
        "active",
        "profile_id",
        "group_id",
    }
)
_DAY_NAMES = {
    "mon": (0,),
    "tue": (1,),
    "wed": (2,),
    "thu": (3,),
    "fri": (4,),
    "sat": (5,),
    "sun": (6,),
    "workdays": (0, 1, 2, 3, 4),
    "weekend": (5, 6),
    "daily": (0, 1, 2, 3, 4, 5, 6),
}
# Sun boundaries only need an approximate clock time for the card views.
_SUN_CLOCK = {"sunrise": 7 * 60, "sunset": 19 * 60}
_SLOT_FIELDS = {
    "weekdays",
    "start",
    "end",
    "start_sun",
    "start_offset_minutes",
    "end_sun",
    "end_offset_minutes",
}
_CONDITION_FIELDS = {
    "operator",
    "entity_id",
    "value",
    "lower",
    "upper",
    "children",
    "minimum_duration_seconds",
    "hysteresis",
    "release_delay_seconds",
}


def _bad(path: str, message: str) -> MutationClientError:
    return MutationClientError("invalid_import", f"{path}: {message}")


def _clean(value: object, path: str, allowed: set[str]) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise _bad(path, "must be an object")
    item = {key: val for key, val in value.items() if key not in _IGNORED}
    unknown = sorted(set(item) - allowed)
    if unknown:
        raise _bad(path, f"unknown field(s) {', '.join(unknown)}")
    return item


def _list(value: object, path: str) -> list[Any]:
    if not isinstance(value, list):
        raise _bad(path, "must be a list")
    return value


def _name(item: dict[str, Any], path: str) -> str:
    name = item.get("name")
    if not isinstance(name, str) or not name.strip():
        raise _bad(f"{path}.name", "is required")
    return name.strip()


def _weekdays(value: object, path: str) -> list[int]:
    days: set[int] = set()
    values = [value] if isinstance(value, str) else _list(value, path)
    for index, day in enumerate(values):
        text = day.strip().lower() if isinstance(day, str) else None
        if isinstance(day, int) and not isinstance(day, bool) and 0 <= day <= 6:
            days.add(day)
        elif text is not None and text in _DAY_NAMES:
            days.update(_DAY_NAMES[text])
        elif text is not None and text[:3] in _DAY_NAMES:
            days.update(_DAY_NAMES[text[:3]])
        else:
            raise _bad(f"{path}[{index}]", "must be 0 (Monday) … 6 (Sunday)")
    if not days:
        raise _bad(path, "must not be empty")
    return sorted(days)


def _slot(value: object, path: str) -> dict[str, Any]:
    item = _clean(value, path, _SLOT_FIELDS)
    item["weekdays"] = _weekdays(item.get("weekdays"), f"{path}.weekdays")
    for side in ("start", "end"):
        if item.get(side) is not None:
            continue
        sun = item.get(f"{side}_sun")
        offset = item.get(f"{side}_offset_minutes") or 0
        if sun not in _SUN_CLOCK or not isinstance(offset, int):
            raise _bad(f"{path}.{side}", 'is required ("HH:MM")')
        minutes = (_SUN_CLOCK[sun] + offset) % 1440
        item[side] = f"{minutes // 60:02d}:{minutes % 60:02d}"
    return item


def _action(value: object, domain: str, path: str) -> dict[str, Any] | None:
    if value is None:
        return None
    item = _clean(value, path, {"domain", "action", "data"})
    item.setdefault("domain", domain)
    item.setdefault("data", {})
    return item


def _condition(value: object, path: str) -> dict[str, Any] | None:
    if value is None:
        return None
    item = _clean(value, path, _CONDITION_FIELDS)
    if "children" in item:
        children = _list(item["children"], f"{path}.children")
        item["children"] = [
            _condition(child, f"{path}.children[{index}]")
            for index, child in enumerate(children)
        ]
    return item


def _schedule(value: object, group_entities: list[Any], path: str) -> dict[str, Any]:
    item = _clean(value, path, _SCHEDULE_FIELDS)
    item["name"] = _name(item, path)
    targets = item.get("target_entity_ids", group_entities)
    targets = _list([targets] if isinstance(targets, str) else targets, path)
    if not targets or not all(isinstance(entity, str) for entity in targets):
        raise _bad(f"{path}.target_entity_ids", "must list the devices to control")
    item["target_entity_ids"] = list(dict.fromkeys(targets))
    domain = targets[0].split(".", 1)[0]
    slots = _list(item.get("time_slots"), f"{path}.time_slots")
    if not slots:
        raise _bad(f"{path}.time_slots", "must not be empty")
    item["time_slots"] = [
        _slot(slot, f"{path}.time_slots[{index}]") for index, slot in enumerate(slots)
    ]
    if item.get("start_action") is None:
        raise _bad(f"{path}.start_action", "is required")
    for field in ("start_action", "end_action"):
        if field in item:
            item[field] = _action(item[field], domain, f"{path}.{field}")
    if "condition" in item:
        item["condition"] = _condition(item["condition"], f"{path}.condition")
    return item


def import_file_profiles(
    document: object, existing_names: list[str]
) -> list[dict[str, Any]]:
    """Complete a simple import file into the ``import/merge`` profile tree.

    Missing ``profile_type`` means exclusive, a schedule without targets drives
    its whole group, the action domain follows the targets, groups also get the
    devices their schedules drive, and a name already in use gets a number.
    """

    if (
        not isinstance(document, dict)
        or document.get("format") != IMPORT_FORMAT
        or document.get("format_version") != IMPORT_FORMAT_VERSION
    ):
        raise _bad(
            "file",
            f'not a Schedule Creator import file (format "{IMPORT_FORMAT}", '
            f"format_version {IMPORT_FORMAT_VERSION})",
        )
    raw_profiles = _list(document.get("profiles"), "profiles")
    if not raw_profiles:
        raise _bad("profiles", "must not be empty")
    used = {name.casefold() for name in existing_names}
    profiles: list[dict[str, Any]] = []
    for p_index, raw_profile in enumerate(raw_profiles):
        path = f"profiles[{p_index}]"
        profile = _clean(
            raw_profile, path, {"name", "profile_type", "icon", "color", "groups"}
        )
        base = name = _name(profile, path)
        copy = 2
        while name.casefold() in used:
            name, copy = f"{base} ({copy})", copy + 1
        used.add(name.casefold())
        groups: list[dict[str, Any]] = []
        raw_groups = _list(profile.get("groups", []), f"{path}.groups")
        for g_index, raw_group in enumerate(raw_groups):
            g_path = f"{path}.groups[{g_index}]"
            group = _clean(
                raw_group, g_path, {"name", "entity_ids", "icon", "color", "schedules"}
            )
            entities = _list(group.get("entity_ids", []), f"{g_path}.entity_ids")
            raw_schedules = _list(group.get("schedules", []), f"{g_path}.schedules")
            schedules = [
                _schedule(item, entities, f"{g_path}.schedules[{s_index}]")
                for s_index, item in enumerate(raw_schedules)
            ]
            targets = [e for s in schedules for e in s["target_entity_ids"]]
            entity_ids = list(dict.fromkeys([*entities, *targets]))
            if not entity_ids:
                raise _bad(f"{g_path}.entity_ids", "must list the devices of the group")
            groups.append(
                {
                    "name": _name(group, g_path),
                    "entity_ids": entity_ids,
                    "icon": group.get("icon"),
                    "color": group.get("color"),
                    "schedules": schedules,
                }
            )
        profiles.append(
            {
                "name": name,
                "profile_type": profile.get("profile_type", "exclusive"),
                "icon": profile.get("icon"),
                "color": profile.get("color"),
                "groups": groups,
            }
        )
    return profiles


def _merge(
    current: IntegrationConfig, tree: list[dict[str, Any]], now: datetime
) -> IntegrationConfig:
    return merged_config(
        current,
        {"source": IMPORT_FORMAT, "source_created_at": None, "profiles": tree},
        now,
    )


def _checked(
    current: IntegrationConfig, profiles: list[dict[str, Any]], now: datetime
) -> IntegrationConfig:
    """Merge; on a refusal, name the first record at fault."""

    try:
        return _merge(current, profiles, now)
    except (MutationClientError, ValueError) as err:
        whole: Exception = err
    attempts: list[tuple[str, list[dict[str, Any]]]] = []
    for p_index, profile in enumerate(profiles):
        head = {**profile, "groups": []}
        attempts.append((f"profiles[{p_index}]", [head]))
        for g_index, group in enumerate(profile["groups"]):
            g_path = f"profiles[{p_index}].groups[{g_index}]"
            shell = {**group, "schedules": []}
            attempts.append((g_path, [{**head, "groups": [shell]}]))
            for s_index, item in enumerate(group["schedules"]):
                tree = [{**head, "groups": [{**shell, "schedules": [item]}]}]
                attempts.append((f"{g_path}.schedules[{s_index}]", tree))
    for path, tree in attempts:
        try:
            _merge(current, tree, now)
        except ModelValidationError as err:
            raise _bad(path, f"{err.path} {err.message}") from err
        except MutationClientError as err:
            raise _bad(path, err.client_message) from err
        except ValueError as err:
            raise _bad(path, str(err)) from err
    raise _bad("file", str(whole)) from whole


def imported_file_config(
    current: IntegrationConfig, document: object, now: datetime
) -> tuple[IntegrationConfig, list[dict[str, Any]]]:
    """Return the configuration with the file appended and the completed tree."""

    profiles = import_file_profiles(document, [p.name for p in current.profiles])
    return _checked(current, profiles, now), profiles


@require_admin
@websocket_command(
    {
        vol.Required("type"): "schedule_creator/import/file/preview",
        vol.Required("file"): dict,
    }
)
@async_response
async def websocket_import_file_preview(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    """Check an import file and return what would be added, without saving."""

    runtime = _loaded_runtime(hass)
    config = None if runtime is None else runtime.storage.config.data
    if config is None:
        connection.send_error(
            msg["id"], "not_loaded", "Schedule Creator is not loaded."
        )
        return
    try:
        _, profiles = imported_file_config(config, msg["file"], config.updated_at)
    except MutationClientError as err:
        connection.send_error(msg["id"], err.code, err.client_message)
        return
    connection.send_result(msg["id"], {"profiles": profiles})


@require_admin
@websocket_command(
    {
        vol.Required("type"): "schedule_creator/import/file",
        vol.Required("expected_revision"): _REVISION,
        vol.Required("file"): dict,
    }
)
@async_response
async def websocket_import_file(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    """Append the profiles of an import file (inactive) in one commit."""

    before: set[str] = set()

    def mutation(config: IntegrationConfig, now: datetime) -> IntegrationConfig:
        before.update(profile.id for profile in config.profiles)
        return imported_file_config(config, msg["file"], now)[0]

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
        internal_message="Unable to import the file.",
    )


FILE_IMPORT_COMMANDS = (websocket_import_file_preview, websocket_import_file)
