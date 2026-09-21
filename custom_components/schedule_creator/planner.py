"""Pure deterministic occurrence projection for configured schedules."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

from .models import (
    ConditionBranch,
    IntegrationConfig,
    Occurrence,
    OccurrenceState,
    RecoveryState,
    Schedule,
    TimeSlot,
)

_MAX_GAP_SEARCH = timedelta(hours=3)
_GAP_STEP = timedelta(minutes=1)


def _utc_boundary(value: datetime, path: str) -> datetime:
    if value.tzinfo is None or value.utcoffset() != timedelta(0):
        raise ValueError(f"{path} must be UTC")
    return value.astimezone(UTC)


def _valid_instants(local_value: datetime, timezone: ZoneInfo) -> tuple[datetime, ...]:
    """Return distinct UTC instants which round-trip to one naive wall time."""

    candidates: list[datetime] = []
    for fold in (0, 1):
        aware = local_value.replace(tzinfo=timezone, fold=fold)
        instant = aware.astimezone(UTC)
        if instant.astimezone(timezone).replace(tzinfo=None) == local_value:
            candidates.append(instant)
    return tuple(sorted(set(candidates)))


def _resolve_boundary(
    local_value: datetime, timezone: ZoneInfo, *, use_latest: bool
) -> datetime:
    """Resolve overlap deterministically and move nonexistent wall time forward."""

    candidate = local_value
    deadline = local_value + _MAX_GAP_SEARCH
    while candidate <= deadline:
        instants = _valid_instants(candidate, timezone)
        if instants:
            return instants[-1] if use_latest else instants[0]
        candidate += _GAP_STEP
    raise ValueError("local boundary is outside the supported DST gap")


def _occurrence(
    schedule: Schedule, slot: TimeSlot, local_date: date, timezone: ZoneInfo
) -> Occurrence:
    local_start_naive = datetime.combine(local_date, slot.start)
    end_date = local_date if slot.end > slot.start else local_date + timedelta(days=1)
    local_end_naive = datetime.combine(end_date, slot.end)
    start_utc = _resolve_boundary(local_start_naive, timezone, use_latest=False)
    end_utc = _resolve_boundary(local_end_naive, timezone, use_latest=True)
    if end_utc <= start_utc:
        raise ValueError("resolved occurrence end must follow start")
    local_start = start_utc.astimezone(timezone).isoformat()
    local_end = end_utc.astimezone(timezone).isoformat()
    return Occurrence(
        id=f"{schedule.id}:{slot.id}:{local_start}",
        frozen_schedule=schedule,
        slot_id=slot.id,
        start_utc=start_utc,
        end_utc=end_utc,
        local_start=local_start,
        local_end=local_end,
        state=OccurrenceState.PENDING,
        condition_branch=ConditionBranch.UNKNOWN,
        recovery_state=RecoveryState.NORMAL,
        snapshot_ids=(),
        pending_operation_ids=(),
        last_operation_id=None,
    )


def _included(schedule: Schedule, slot: TimeSlot, local_date: date) -> bool:
    if local_date in schedule.exclusion_dates:
        return False
    return (
        local_date in schedule.inclusion_dates
        or local_date.weekday() in slot.weekdays
    )


def plan_occurrences(
    config: IntegrationConfig,
    window_start_utc: datetime,
    window_end_utc: datetime,
    timezone: ZoneInfo,
) -> tuple[Occurrence, ...]:
    """Project occurrences which overlap a half-open UTC planning window.

    Ambiguous starts use the earliest instant and ambiguous ends the latest.
    Nonexistent local boundaries advance to the first valid wall time. Equal or
    earlier slot end times represent an interval ending on the following day.
    """

    start = _utc_boundary(window_start_utc, "window_start_utc")
    end = _utc_boundary(window_end_utc, "window_end_utc")
    if end <= start:
        raise ValueError("window_end_utc must follow window_start_utc")

    first_date = start.astimezone(timezone).date() - timedelta(days=1)
    last_date = end.astimezone(timezone).date()
    active_profiles = set(config.active_profile_ids)
    projected: list[Occurrence] = []
    local_date = first_date
    while local_date <= last_date:
        for schedule in config.schedules:
            if not schedule.enabled or schedule.profile_id not in active_profiles:
                continue
            for slot in schedule.time_slots:
                if not _included(schedule, slot, local_date):
                    continue
                occurrence = _occurrence(schedule, slot, local_date, timezone)
                if occurrence.end_utc > start and occurrence.start_utc < end:
                    projected.append(occurrence)
        local_date += timedelta(days=1)

    return tuple(
        sorted(
            projected,
            key=lambda item: (
                item.start_utc,
                item.end_utc,
                item.frozen_schedule.id,
                item.slot_id,
            ),
        )
    )
