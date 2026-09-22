"""Pure deterministic overlap arbitration for runtime controllers."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from .models import (
    ConditionBranch,
    ControllerType,
    OccurrenceState,
    QuickTimerState,
)
from .storage import RuntimeStoreData

_CONTROLLER_RANK = {
    ControllerType.NORMAL_SCHEDULE: "1",
    ControllerType.CONDITIONAL_SCHEDULE: "2",
    ControllerType.QUICK_TIMER: "3",
}


@dataclass(frozen=True, slots=True, kw_only=True)
class ArbitrationCandidate:
    """One controller competing for one entity."""

    entity_id: str
    controller_id: str
    controller_type: ControllerType
    occurrence_id: str | None
    effective_start: datetime
    comparison_key: tuple[str, ...]


@dataclass(frozen=True, slots=True, kw_only=True)
class ArbitrationDecision:
    """Deterministic winner and ordered losing controllers for one entity."""

    entity_id: str
    winner: ArbitrationCandidate
    losers: tuple[ArbitrationCandidate, ...]


def _utc(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() != timedelta(0):
        raise ValueError("now must be UTC")
    return value.astimezone(UTC)


def _instant_key(value: datetime) -> str:
    return _utc(value).isoformat().replace("+00:00", "Z")


def comparison_key(
    effective_start: datetime,
    controller_type: ControllerType,
    controller_id: str,
) -> tuple[str, ...]:
    """Build the stable key persisted by a future entity lease."""

    return (
        _instant_key(effective_start),
        _CONTROLLER_RANK[controller_type],
        controller_id,
    )


def arbitration_candidates(
    runtime: RuntimeStoreData, now: datetime
) -> tuple[ArbitrationCandidate, ...]:
    """Collect currently effective controllers without mutating runtime state."""

    wall_clock = _utc(now)
    candidates: list[ArbitrationCandidate] = []
    for occurrence in runtime.occurrences:
        if (
            occurrence.state is not OccurrenceState.ACTIVE
            or not occurrence.start_utc <= wall_clock < occurrence.end_utc
        ):
            continue
        controller_type = (
            ControllerType.CONDITIONAL_SCHEDULE
            if occurrence.frozen_schedule.condition is not None
            else ControllerType.NORMAL_SCHEDULE
        )
        if (
            controller_type is ControllerType.CONDITIONAL_SCHEDULE
            and occurrence.condition_branch is not ConditionBranch.TRUE
        ):
            continue
        key = comparison_key(
            occurrence.start_utc, controller_type, occurrence.id
        )
        for entity_id in occurrence.frozen_schedule.target_entity_ids:
            candidates.append(
                ArbitrationCandidate(
                    entity_id=entity_id,
                    controller_id=occurrence.id,
                    controller_type=controller_type,
                    occurrence_id=occurrence.id,
                    effective_start=occurrence.start_utc,
                    comparison_key=key,
                )
            )
    for timer in runtime.quick_timers:
        if (
            timer.state is not QuickTimerState.ACTIVE
            or not timer.starts_at <= wall_clock < timer.expires_at
        ):
            continue
        key = comparison_key(
            timer.starts_at, ControllerType.QUICK_TIMER, timer.controller_id
        )
        candidates.append(
            ArbitrationCandidate(
                entity_id=timer.entity_id,
                controller_id=timer.controller_id,
                controller_type=ControllerType.QUICK_TIMER,
                occurrence_id=None,
                effective_start=timer.starts_at,
                comparison_key=key,
            )
        )
    return tuple(
        sorted(
            candidates,
            key=lambda item: (item.entity_id, item.comparison_key),
        )
    )


def arbitrate_candidates(
    candidates: tuple[ArbitrationCandidate, ...],
) -> tuple[ArbitrationDecision, ...]:
    """Choose exactly one winner per entity from immutable candidates."""

    by_entity: dict[str, list[ArbitrationCandidate]] = {}
    seen: set[tuple[str, str]] = set()
    for candidate in candidates:
        identity = candidate.entity_id, candidate.controller_id
        if identity in seen:
            raise ValueError("controller may compete only once per entity")
        seen.add(identity)
        by_entity.setdefault(candidate.entity_id, []).append(candidate)

    decisions: list[ArbitrationDecision] = []
    for entity_id in sorted(by_entity):
        ordered = tuple(
            sorted(
                by_entity[entity_id],
                key=lambda item: item.comparison_key,
                reverse=True,
            )
        )
        decisions.append(
            ArbitrationDecision(
                entity_id=entity_id,
                winner=ordered[0],
                losers=ordered[1:],
            )
        )
    return tuple(decisions)


def build_arbitration_plan(
    runtime: RuntimeStoreData, now: datetime
) -> tuple[ArbitrationDecision, ...]:
    """Build a side-effect-free winner plan from one runtime snapshot."""

    return arbitrate_candidates(arbitration_candidates(runtime, now))
