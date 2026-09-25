"""Test conservative terminal occurrence retention."""

import json
from copy import deepcopy
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from custom_components.schedule_creator.models import (
    EntityLease,
    IntegrationConfig,
    Occurrence,
    OccurrenceState,
    OperationKind,
    OperationState,
    PendingOperation,
    QuickTimer,
    QuickTimerState,
    Snapshot,
)
from custom_components.schedule_creator.planner import plan_occurrences
from custom_components.schedule_creator.retention import (
    OCCURRENCE_RETENTION,
    async_prune_terminal_occurrences,
)
from custom_components.schedule_creator.storage import (
    RuntimeRepository,
    RuntimeStoreData,
    empty_runtime,
)

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "models_v1.json"
NOW = datetime(2026, 9, 14, tzinfo=UTC)


class MemoryJsonStore:
    """Minimal Store double retaining saves."""

    def __init__(self) -> None:
        self.data = None
        self.saves: list[dict] = []

    async def async_load(self):
        return deepcopy(self.data)

    async def async_save(self, data):
        self.data = deepcopy(data)
        self.saves.append(deepcopy(data))


def _bundle() -> dict:
    return json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))


def _projected():
    config = IntegrationConfig.from_dict(_bundle()["config"])
    return plan_occurrences(
        config,
        datetime(2026, 9, 15, tzinfo=UTC),
        datetime(2026, 9, 19, tzinfo=UTC),
        ZoneInfo("Europe/Rome"),
    )


async def _repository(hass, runtime: RuntimeStoreData):
    store = MemoryJsonStore()
    repository = RuntimeRepository(hass, store)
    assert await repository.async_load() is None
    await repository.async_initialize(runtime)
    return repository, store


async def test_prune_removes_only_terminal_records_older_than_cutoff(hass):
    """Recent terminal and nonterminal occurrences are retained unchanged."""
    first, second, third = _projected()[:3]
    runtime = replace(
        empty_runtime(NOW),
        occurrences=(
            replace(first, state=OccurrenceState.COMPLETED),
            replace(second, state=OccurrenceState.CANCELLED),
            third,
        ),
    )
    repository, store = await _repository(hass, runtime)
    prune_at = first.end_utc + OCCURRENCE_RETENTION + timedelta(days=1)

    result = await async_prune_terminal_occurrences(repository, prune_at)

    assert tuple(item.id for item in result.occurrences) == (second.id, third.id)
    assert result.revision == 1
    assert len(store.saves) == 2


async def test_prune_preserves_old_terminal_occurrence_with_references(hass):
    """Snapshots, operations and leases protect their terminal controller."""
    bundle = _bundle()
    occurrence = replace(
        Occurrence.from_dict(bundle["occurrence"]),
        state=OccurrenceState.COMPLETED,
    )
    runtime = RuntimeStoreData(
        schema_version=1,
        revision=0,
        operation_counter=1,
        occurrences=(occurrence,),
        snapshots=(Snapshot.from_dict(bundle["snapshot"]),),
        leases=(EntityLease.from_dict(bundle["lease"]),),
        pending_operations=(
            PendingOperation.from_dict(bundle["pending_operation"]),
        ),
        quick_timers=(),
        notification_deduplication_keys=(),
        updated_at=NOW,
    )
    repository, store = await _repository(hass, runtime)

    result = await async_prune_terminal_occurrences(
        repository, occurrence.end_utc + OCCURRENCE_RETENTION + timedelta(days=1)
    )

    assert result is repository.data
    assert result.occurrences == (occurrence,)
    assert result.revision == 0
    assert len(store.saves) == 1


async def test_prune_is_idempotent_after_removal(hass):
    """Repeating retention without eligible history is a Store no-op."""
    occurrence = replace(_projected()[0], state=OccurrenceState.FAILED)
    repository, store = await _repository(
        hass, replace(empty_runtime(NOW), occurrences=(occurrence,))
    )
    prune_at = occurrence.end_utc + OCCURRENCE_RETENTION + timedelta(seconds=1)

    first = await async_prune_terminal_occurrences(repository, prune_at)
    second = await async_prune_terminal_occurrences(repository, prune_at)

    assert second is first
    assert second.occurrences == ()
    assert second.revision == 1
    assert len(store.saves) == 2


def _finished_runtime() -> RuntimeStoreData:
    """A completed slot and a completed timer, each with a finished operation."""
    bundle = _bundle()
    occurrence = replace(
        Occurrence.from_dict(bundle["occurrence"]),
        state=OccurrenceState.COMPLETED,
    )
    snapshot = Snapshot.from_dict(bundle["snapshot"])
    operation = replace(
        PendingOperation.from_dict(bundle["pending_operation"]),
        state=OperationState.SUCCEEDED,
        next_retry_at=None,
        error_code=None,
    )
    timer = replace(
        QuickTimer.from_dict(bundle["quick_timer"]),
        state=QuickTimerState.COMPLETED,
        snapshot_id=None,
    )
    restore = replace(
        operation,
        id="eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        sequence=2,
        occurrence_id=timer.controller_id,
        kind=OperationKind.RESTORE,
    )
    return RuntimeStoreData(
        schema_version=1,
        revision=0,
        operation_counter=2,
        occurrences=(occurrence,),
        snapshots=(snapshot,),
        leases=(),
        pending_operations=(operation, restore),
        quick_timers=(timer,),
        notification_deduplication_keys=(f"{occurrence.id}:start:rule",),
        updated_at=NOW,
    )


async def test_prune_removes_finished_controllers_with_everything_they_own(hass):
    """Operations, snapshots, timers and notification keys go with the slot."""
    runtime = _finished_runtime()
    repository, _store = await _repository(hass, runtime)
    prune_at = runtime.occurrences[0].end_utc + OCCURRENCE_RETENTION + timedelta(days=1)

    result = await async_prune_terminal_occurrences(repository, prune_at)

    assert result.occurrences == ()
    assert result.snapshots == ()
    assert result.pending_operations == ()
    assert result.quick_timers == ()
    assert result.notification_deduplication_keys == ()
    assert result.revision == 1


async def test_prune_keeps_controllers_with_unfinished_operations(hass):
    """A retry still waiting protects its slot and its snapshot."""
    runtime = _finished_runtime()
    waiting = replace(
        runtime.pending_operations[0],
        state=OperationState.RETRY_WAIT,
        next_retry_at=NOW,
    )
    runtime = replace(
        runtime, pending_operations=(waiting, runtime.pending_operations[1])
    )
    repository, _store = await _repository(hass, runtime)
    prune_at = runtime.occurrences[0].end_utc + OCCURRENCE_RETENTION + timedelta(days=1)

    result = await async_prune_terminal_occurrences(repository, prune_at)

    assert result.occurrences == runtime.occurrences
    assert result.snapshots == runtime.snapshots
    assert result.pending_operations == (waiting,)
    assert result.quick_timers == ()
