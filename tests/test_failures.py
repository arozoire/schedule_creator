"""Test the failed-command summary returned by get_state."""

import json
from dataclasses import replace
from datetime import UTC, datetime
from pathlib import Path

from custom_components.schedule_creator.models import (
    Occurrence,
    OccurrenceState,
    OperationState,
    PendingOperation,
    Snapshot,
)
from custom_components.schedule_creator.storage import RuntimeStoreData
from custom_components.schedule_creator.websocket_api import _failures

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "models_v1.json"


def test_failures_list_final_errors_newest_first() -> None:
    """Only commands that failed for good are reported, with their schedule."""
    bundle = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    occurrence = replace(
        Occurrence.from_dict(bundle["occurrence"]), state=OccurrenceState.COMPLETED
    )
    failed = replace(
        PendingOperation.from_dict(bundle["pending_operation"]),
        state=OperationState.FAILED_FINAL,
        next_retry_at=None,
        error_code="service_failed",
    )
    runtime = RuntimeStoreData(
        schema_version=1,
        revision=0,
        operation_counter=1,
        occurrences=(occurrence,),
        snapshots=(Snapshot.from_dict(bundle["snapshot"]),),
        leases=(),
        pending_operations=(failed,),
        quick_timers=(),
        notification_deduplication_keys=(),
        updated_at=datetime(2026, 9, 16, tzinfo=UTC),
    )

    assert _failures(runtime) == [
        {
            "at": failed.updated_at.isoformat(),
            "kind": "target_action",
            "phase": None,
            "entity_id": "light.living_room",
            "schedule_id": occurrence.frozen_schedule.id,
            "schedule_name": occurrence.frozen_schedule.name,
            "quick_timer": False,
            "error_code": "service_failed",
            "attempts": 1,
        }
    ]
    succeeded = replace(failed, state=OperationState.SUCCEEDED, error_code=None)
    assert _failures(replace(runtime, pending_operations=(succeeded,))) == []
