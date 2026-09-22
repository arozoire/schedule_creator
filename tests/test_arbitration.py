"""Test pure deterministic overlap arbitration."""

import json
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest

from custom_components.schedule_creator.arbitration import (
    ArbitrationCandidate,
    arbitrate_candidates,
    build_arbitration_plan,
    comparison_key,
)
from custom_components.schedule_creator.models import (
    ControllerType,
    Occurrence,
    OccurrenceState,
    QuickTimer,
    QuickTimerState,
)
from custom_components.schedule_creator.storage import RuntimeStoreData

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "models_v1.json"
NOW = datetime(2026, 9, 15, 17, 5, tzinfo=UTC)


def _bundle() -> dict:
    return json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))


def _candidate(
    controller_id: str,
    controller_type: ControllerType,
    effective_start: datetime,
    entity_id: str = "light.living_room",
) -> ArbitrationCandidate:
    return ArbitrationCandidate(
        entity_id=entity_id,
        controller_id=controller_id,
        controller_type=controller_type,
        occurrence_id=None,
        effective_start=effective_start,
        comparison_key=comparison_key(
            effective_start, controller_type, controller_id
        ),
    )


def _runtime(*, occurrence: Occurrence, timer: QuickTimer) -> RuntimeStoreData:
    return RuntimeStoreData(
        schema_version=1,
        revision=0,
        operation_counter=0,
        occurrences=(occurrence,),
        snapshots=(),
        leases=(),
        pending_operations=(),
        quick_timers=(timer,),
        notification_deduplication_keys=(),
        updated_at=NOW,
    )


def test_newer_effective_start_wins_before_controller_rank() -> None:
    """Recency is the primary overlap rule."""
    older_timer = _candidate(
        "quick:older", ControllerType.QUICK_TIMER, NOW - timedelta(minutes=2)
    )
    newer_schedule = _candidate(
        "schedule:newer", ControllerType.NORMAL_SCHEDULE, NOW - timedelta(minutes=1)
    )

    decision = arbitrate_candidates((older_timer, newer_schedule))[0]

    assert decision.winner is newer_schedule
    assert decision.losers == (older_timer,)


def test_controller_rank_breaks_equal_start_ties() -> None:
    """Quick Timer then conditional then normal win at the same instant."""
    normal = _candidate("normal", ControllerType.NORMAL_SCHEDULE, NOW)
    conditional = _candidate("conditional", ControllerType.CONDITIONAL_SCHEDULE, NOW)
    timer = _candidate("timer", ControllerType.QUICK_TIMER, NOW)

    decision = arbitrate_candidates((conditional, timer, normal))[0]

    assert decision.winner is timer
    assert decision.losers == (conditional, normal)


def test_controller_id_is_stable_final_tiebreaker() -> None:
    """Input ordering cannot affect an otherwise equal decision."""
    first = _candidate("controller:a", ControllerType.NORMAL_SCHEDULE, NOW)
    second = _candidate("controller:b", ControllerType.NORMAL_SCHEDULE, NOW)

    forward = arbitrate_candidates((first, second))
    reverse = arbitrate_candidates((second, first))

    assert forward == reverse
    assert forward[0].winner is second


def test_plan_collects_active_schedule_and_quick_timer() -> None:
    """Runtime extraction selects only effective controllers and target entities."""
    bundle = _bundle()
    occurrence = replace(
        Occurrence.from_dict(bundle["occurrence"]),
        snapshot_ids=(),
        pending_operation_ids=(),
        last_operation_id=None,
    )
    timer = replace(
        QuickTimer.from_dict(bundle["quick_timer"]),
        snapshot_id=None,
    )
    runtime = _runtime(occurrence=occurrence, timer=timer)

    decisions = build_arbitration_plan(runtime, NOW)

    assert len(decisions) == 1
    assert decisions[0].winner.controller_type is ControllerType.QUICK_TIMER
    assert decisions[0].winner.controller_id == timer.controller_id
    assert decisions[0].losers[0].controller_id == occurrence.id


def test_plan_ignores_inactive_or_out_of_window_controllers() -> None:
    """Persisted state alone cannot make an expired controller effective."""
    bundle = _bundle()
    occurrence = replace(
        Occurrence.from_dict(bundle["occurrence"]),
        state=OccurrenceState.COMPLETED,
        snapshot_ids=(),
        pending_operation_ids=(),
        last_operation_id=None,
    )
    timer = replace(
        QuickTimer.from_dict(bundle["quick_timer"]),
        snapshot_id=None,
        state=QuickTimerState.ACTIVE,
    )
    runtime = _runtime(occurrence=occurrence, timer=timer)

    assert build_arbitration_plan(runtime, timer.expires_at) == ()


def test_duplicate_controller_entity_candidate_is_rejected() -> None:
    """Ambiguous duplicate inputs fail rather than silently changing precedence."""
    candidate = _candidate("controller", ControllerType.NORMAL_SCHEDULE, NOW)

    with pytest.raises(ValueError, match="only once"):
        arbitrate_candidates((candidate, candidate))


def test_decisions_are_sorted_by_entity() -> None:
    """Plans remain stable across candidate input order."""
    kitchen = _candidate(
        "kitchen", ControllerType.NORMAL_SCHEDULE, NOW, "light.kitchen"
    )
    living = _candidate(
        "living", ControllerType.NORMAL_SCHEDULE, NOW, "light.living_room"
    )

    decisions = arbitrate_candidates((living, kitchen))

    assert tuple(item.entity_id for item in decisions) == (
        "light.kitchen",
        "light.living_room",
    )
