"""Compact weekly plan of one entity, readable by small displays (ESPHome).

Every attribute is a plain string: ESPHome receives attributes as text and a
microcontroller cannot parse Python lists or dicts. A slot is one token

    <start>-<end>@<state>[:<number>]#<k>

with local minutes from midnight (0..1440), the state the slot applies, its
main value and the index of its schedule in the ``schedules`` attribute.
"""

from __future__ import annotations

import re
from collections.abc import Iterable, Mapping, Sequence
from datetime import UTC, date, datetime, time, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from .models import (
    APPLY_STATE_ACTION,
    RESTORE_PREVIOUS_ACTION,
    ConditionBranch,
    EntityLease,
    IntegrationConfig,
    LeaseState,
    Occurrence,
    OccurrenceState,
    Schedule,
    TargetAction,
)
from .planner import SunResolver, plan_occurrences

MAX_SLOTS_PER_DAY = 12
# The week and the following one: the next slot may be after Sunday.
PROJECTION_DAYS = 15
PLAN_ATTRIBUTES = (
    "today",
    "week",
    "week_start",
    "schedules",
    "profile",
    "current",
    "current_blocked",
    "after",
    "next_start",
    "next",
    "manual",
    "truncated",
    "updated",
)
_RUNNING = {OccurrenceState.ACTIVE, OccurrenceState.SUSPENDED}
_ON_OFF_DOMAINS = {"switch", "light", "fan", "input_boolean"}


def plan_entity_ids(config: IntegrationConfig) -> tuple[str, ...]:
    """Every entity targeted by a schedule, in any profile."""

    return tuple(
        sorted({entity for s in config.schedules for entity in s.target_entity_ids})
    )


def week_start(now: datetime, timezone: ZoneInfo) -> date:
    """Local Monday of the week containing ``now``."""

    today = now.astimezone(timezone).date()
    return today - timedelta(days=today.weekday())


def project_weeks(
    config: IntegrationConfig,
    monday: date,
    timezone: ZoneInfo,
    sun: SunResolver | None,
) -> tuple[Occurrence, ...]:
    """Occurrences the engine will run from Monday for ``PROJECTION_DAYS``."""

    start = _local_midnight(monday, timezone)
    end = _local_midnight(monday + timedelta(days=PROJECTION_DAYS), timezone)
    return plan_occurrences(config, start, end, timezone, sun)


def _local_midnight(day: date, timezone: ZoneInfo) -> datetime:
    return datetime.combine(day, time(), tzinfo=timezone).astimezone(UTC)


def _number(value: Any) -> str:
    if isinstance(value, bool) or not isinstance(value, int | float):
        return ""
    return f"{round(float(value), 1):.1f}".rstrip("0").rstrip(".")


def _word(value: object) -> str:
    return re.sub(r"[^A-Za-z0-9_.]", "_", str(value))


def action_code(action: TargetAction | None) -> str:
    """``state[:number]`` of an action; ``none`` without an action."""

    if action is None:
        return "none"
    if action.action == RESTORE_PREVIOUS_ACTION:
        return "restore"
    data = action.data
    if action.action == APPLY_STATE_ACTION:
        state = _word(data.get("state", "set"))
    elif action.domain == "climate" and action.action == "set_temperature":
        mode = data.get("hvac_mode")
        state = _word(mode) if isinstance(mode, str) else "set"
    else:
        state = _word(action.action)
    if action.domain == "climate":
        number = _number(data.get("temperature"))
        if not number:
            number = _number(data.get("target_temp_low"))
    elif action.domain in {"cover", "valve"}:
        number = _number(data.get("position"))
    elif action.domain == "light":
        number = _number(data.get("brightness_pct"))
        brightness = data.get("brightness")
        if not number and isinstance(brightness, int | float):
            number = _number(round(float(brightness) * 100 / 255))
    elif action.domain == "fan":
        number = _number(data.get("percentage"))
    else:
        number = ""
    return f"{state}:{number}" if number else state


def _minutes(value: datetime, timezone: ZoneInfo) -> int:
    local = value.astimezone(timezone)
    return local.hour * 60 + local.minute


def _day_part(
    occurrence: Occurrence, day: date, timezone: ZoneInfo
) -> tuple[int, int] | None:
    """Minutes of ``occurrence`` inside the local ``day``, if any."""

    day_start = _local_midnight(day, timezone)
    day_end = _local_midnight(day + timedelta(days=1), timezone)
    start = max(occurrence.start_utc, day_start)
    end = min(occurrence.end_utc, day_end)
    if start >= end:
        return None
    first = _minutes(start, timezone)
    last = 1440 if end >= day_end else _minutes(end, timezone)
    return (first, last) if last > first else None


def _token(part: tuple[int, int], schedule: Schedule, index: int) -> str:
    return f"{part[0]}-{part[1]}@{action_code(schedule.start_action)}#{index}"


def _manual(
    action: TargetAction, state: str | None, attributes: Mapping[str, Any]
) -> bool:
    """Whether the entity no longer shows what the running slot applied."""

    if state is None or state in {"unavailable", "unknown"}:
        return False
    data = action.data
    wanted: object = None
    if action.action == APPLY_STATE_ACTION:
        wanted = data.get("state")
    elif action.domain == "climate":
        wanted = data.get("hvac_mode")
    elif action.action in {"turn_on", "turn_off"}:
        wanted = action.action.removeprefix("turn_")
    if action.domain == "climate":
        if isinstance(wanted, str) and state != wanted:
            return True
        target, current = data.get("temperature"), attributes.get("temperature")
        return (
            isinstance(target, int | float)
            and isinstance(current, int | float)
            and abs(float(target) - float(current)) > 0.05
        )
    if action.domain in _ON_OFF_DOMAINS:
        return wanted in {"on", "off"} and state != wanted
    if action.domain in {"cover", "valve"}:
        target, current = data.get("position"), attributes.get("current_position")
        if isinstance(target, int | float) and isinstance(current, int | float):
            return abs(float(target) - float(current)) > 0.5
        if action.action.startswith("open_"):
            wanted = "open"
        elif action.action.startswith("close_"):
            wanted = "closed"
        return (
            wanted in {"open", "closed"}
            and state in {"open", "closed"}
            and (state != wanted)
        )
    return False


def _running(
    occurrences: Iterable[Occurrence],
    leases: Iterable[EntityLease],
    entity_id: str,
    now: datetime,
) -> Occurrence | None:
    candidates = [
        item
        for item in occurrences
        if item.state in _RUNNING
        and entity_id in item.frozen_schedule.target_entity_ids
        and item.start_utc <= now < item.end_utc
    ]
    held = {
        lease.occurrence_id
        for lease in leases
        if lease.entity_id == entity_id and lease.state is LeaseState.ACTIVE
    }
    candidates.sort(key=lambda item: (item.id not in held, item.start_utc, item.id))
    return candidates[0] if candidates else None


def compute_plan(
    config: IntegrationConfig,
    projected: Sequence[Occurrence],
    runtime_occurrences: Iterable[Occurrence],
    leases: Iterable[EntityLease],
    entity_id: str,
    now: datetime,
    timezone: ZoneInfo,
    state: str | None = None,
    attributes: Mapping[str, Any] | None = None,
) -> tuple[str, dict[str, str]]:
    """State (running/idle/none) and string attributes for one entity.

    ``projected`` comes from :func:`project_weeks` for the current Monday.
    """

    leases = tuple(leases)
    active = set(config.active_profile_ids)
    schedules = [
        s
        for s in config.schedules
        if s.enabled and s.profile_id in active and entity_id in s.target_entity_ids
    ]
    index = {s.id: i for i, s in enumerate(schedules)}
    names = [s.name for s in schedules]

    def position(schedule: Schedule) -> int:
        if schedule.id not in index:
            index[schedule.id] = len(names)
            names.append(schedule.name)
        return index[schedule.id]

    mine = [o for o in projected if entity_id in o.frozen_schedule.target_entity_ids]
    monday = week_start(now, timezone)
    today = now.astimezone(timezone).date()
    truncated = False
    days: list[str] = []
    for offset in range(7):
        day = monday + timedelta(days=offset)
        tokens = []
        for occurrence in mine:
            part = _day_part(occurrence, day, timezone)
            if part is not None:
                tokens.append((part, occurrence.frozen_schedule))
        tokens.sort(key=lambda item: item[0])
        if len(tokens) > MAX_SLOTS_PER_DAY:
            truncated = True
            tokens = tokens[:MAX_SLOTS_PER_DAY]
        days.append("|".join(_token(p, s, position(s)) for p, s in tokens))

    running = _running(runtime_occurrences, leases, entity_id, now)
    current = after = ""
    blocked = manual = False
    if running is not None:
        schedule = running.frozen_schedule
        part = _day_part(running, today, timezone)
        if part is not None:
            current = _token(part, schedule, position(schedule))
        after = action_code(schedule.end_action)
        blocked = (
            running.state is OccurrenceState.SUSPENDED
            or running.condition_branch is ConditionBranch.FALSE
        )
        holder = next(
            (
                lease
                for lease in leases
                if lease.entity_id == entity_id and lease.state is LeaseState.ACTIVE
            ),
            None,
        )
        manual = (
            not blocked
            and (holder is None or holder.occurrence_id == running.id)
            and _manual(schedule.start_action, state, attributes or {})
        )

    upcoming = next((o for o in mine if o.start_utc > now), None)
    next_token = next_start = ""
    if upcoming is not None:
        start_local = upcoming.start_utc.astimezone(timezone)
        part = _day_part(upcoming, start_local.date(), timezone)
        if part is not None:
            next_token = _token(
                part, upcoming.frozen_schedule, position(upcoming.frozen_schedule)
            )
        next_start = start_local.isoformat()

    contributing = {s.profile_id for s in schedules}
    profiles = [p.name for p in config.profiles if p.id in contributing]
    value = "running" if running is not None else "idle" if schedules else "none"
    return value, {
        "today": days[today.weekday()],
        "week": "/".join(days),
        "week_start": monday.isoformat(),
        "schedules": "|".join(names),
        "profile": " + ".join(profiles),
        "current": current,
        "current_blocked": "on" if blocked else "off",
        "after": after,
        "next_start": next_start,
        "next": next_token,
        "manual": "on" if manual else "off",
        "truncated": "on" if truncated else "off",
        "updated": now.astimezone(timezone).isoformat(timespec="seconds"),
    }
