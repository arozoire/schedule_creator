"""Test per-schedule activity counters."""

import json
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from pathlib import Path

from custom_components.schedule_creator.models import (
    ConditionBranch,
    Occurrence,
    OperationState,
    PendingOperation,
    Snapshot,
)
from custom_components.schedule_creator.stats import empty_stats, update_stats
from custom_components.schedule_creator.storage import RuntimeStoreData

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "models_v1.json"
NOW = datetime(2026, 9, 15, 17, tzinfo=UTC)


def _runtime(branch: ConditionBranch, succeeded: bool) -> RuntimeStoreData:
    bundle = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    occurrence = replace(
        Occurrence.from_dict(bundle["occurrence"]), condition_branch=branch
    )
    operation = PendingOperation.from_dict(bundle["pending_operation"])
    if succeeded:
        operation = replace(
            operation,
            state=OperationState.SUCCEEDED,
            next_retry_at=None,
            error_code=None,
            payload={**operation.payload, "lease_id": "lease", "lease_generation": 1},
        )
    return RuntimeStoreData(
        schema_version=1,
        revision=0,
        operation_counter=1,
        occurrences=(occurrence,),
        snapshots=(Snapshot.from_dict(bundle["snapshot"]),),
        leases=(),
        pending_operations=(operation,),
        quick_timers=(),
        notification_deduplication_keys=(),
        updated_at=NOW,
    )


def test_activation_is_counted_once_per_slot() -> None:
    """A succeeded start counts once, however often the runtime changes."""
    data = empty_stats()
    runtime = _runtime(ConditionBranch.TRUE, succeeded=True)
    schedule_id = runtime.occurrences[0].frozen_schedule.id

    assert update_stats(data, runtime, NOW) is True
    assert update_stats(data, runtime, NOW) is False

    entry = data["schedules"][schedule_id]
    assert entry["activations"] == 1
    assert entry["muted"] == 0
    assert entry["last_activation"] == (
        runtime.pending_operations[0].updated_at.isoformat()
    )


def test_false_condition_counts_a_muted_slot() -> None:
    """A slot whose condition was false while it ran is counted as muted."""
    data = empty_stats()
    runtime = _runtime(ConditionBranch.FALSE, succeeded=False)

    assert update_stats(data, runtime, NOW) is True

    entry = data["schedules"][runtime.occurrences[0].frozen_schedule.id]
    assert (entry["activations"], entry["muted"]) == (0, 1)
    assert entry["last_muted"] == NOW.isoformat()


def test_seen_markers_expire_but_counters_stay() -> None:
    """Old per-slot markers are dropped; the totals are kept."""
    data = empty_stats()
    runtime = _runtime(ConditionBranch.TRUE, succeeded=True)
    update_stats(data, runtime, NOW)
    empty = replace(
        runtime,
        occurrences=(),
        snapshots=(),
        pending_operations=(),
        operation_counter=0,
    )

    assert update_stats(data, empty, NOW + timedelta(days=11)) is True

    assert data["seen"]["activated"] == {}
    assert sum(item["activations"] for item in data["schedules"].values()) == 1
