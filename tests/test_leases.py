"""Test atomic entity lease reconciliation."""

import json
from copy import deepcopy
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from pathlib import Path

from custom_components.schedule_creator.leases import (
    async_reconcile_entity_leases,
)
from custom_components.schedule_creator.models import (
    LeaseState,
    Occurrence,
    QuickTimer,
    QuickTimerState,
)
from custom_components.schedule_creator.storage import (
    RuntimeRepository,
    RuntimeStoreData,
)

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "models_v1.json"
NOW = datetime(2026, 9, 15, 17, 5, tzinfo=UTC)


class MemoryJsonStore:
    """Minimal Store double retaining authoritative saves."""

    def __init__(self) -> None:
        self.data = None
        self.saves: list[dict] = []

    async def async_load(self):
        return deepcopy(self.data)

    async def async_save(self, data):
        self.data = deepcopy(data)
        self.saves.append(deepcopy(data))


def _runtime() -> RuntimeStoreData:
    bundle = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    occurrence = replace(
        Occurrence.from_dict(bundle["occurrence"]),
        snapshot_ids=(),
        pending_operation_ids=(),
        last_operation_id=None,
    )
    timer = replace(QuickTimer.from_dict(bundle["quick_timer"]), snapshot_id=None)
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


async def _repository(hass):
    store = MemoryJsonStore()
    repository = RuntimeRepository(hass, store)
    assert await repository.async_load() is None
    await repository.async_initialize(_runtime())
    return repository, store


async def test_reconcile_persists_one_active_winner_and_suspended_loser(hass):
    """The full entity decision is committed in one Store write."""
    repository, store = await _repository(hass)

    result = await async_reconcile_entity_leases(repository, NOW)

    assert result.revision == 1
    assert len(result.leases) == 2
    active = [lease for lease in result.leases if lease.state is LeaseState.ACTIVE]
    suspended = [
        lease for lease in result.leases if lease.state is LeaseState.SUSPENDED
    ]
    assert len(active) == len(suspended) == 1
    assert active[0].controller_id == result.quick_timers[0].controller_id
    assert suspended[0].controller_id == result.occurrences[0].id
    assert all(lease.generation == 1 for lease in result.leases)
    assert len(store.saves) == 2


async def test_identical_lease_plan_is_a_store_no_op(hass):
    """Replaying one plan preserves objects, generations and revision."""
    repository, store = await _repository(hass)
    first = await async_reconcile_entity_leases(repository, NOW)

    second = await async_reconcile_entity_leases(repository, NOW)

    assert second is first
    assert second.revision == 1
    assert len(store.saves) == 2


async def test_winner_change_resumes_schedule_and_increments_generation(hass):
    """A suspended contender becomes active after the Quick Timer ends."""
    repository, _store = await _repository(hass)
    first = await async_reconcile_entity_leases(repository, NOW)
    schedule_lease = next(
        lease for lease in first.leases if lease.occurrence_id is not None
    )
    await repository.async_update(
        lambda current: replace(
            current,
            revision=current.revision + 1,
            quick_timers=(
                replace(
                    current.quick_timers[0], state=QuickTimerState.COMPLETED
                ),
            ),
            updated_at=NOW + timedelta(minutes=11),
        )
    )

    result = await async_reconcile_entity_leases(
        repository, NOW + timedelta(minutes=11)
    )

    assert len(result.leases) == 1
    resumed = result.leases[0]
    assert resumed.id == schedule_lease.id
    assert resumed.state is LeaseState.ACTIVE
    assert resumed.generation == schedule_lease.generation + 1


async def test_no_effective_controller_removes_stale_leases(hass):
    """Lease ownership disappears when every controller has ended."""
    repository, _store = await _repository(hass)
    await async_reconcile_entity_leases(repository, NOW)

    result = await async_reconcile_entity_leases(
        repository, datetime(2026, 9, 16, tzinfo=UTC)
    )

    assert result.leases == ()
