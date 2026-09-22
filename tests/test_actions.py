"""Test idempotent target-action journal preparation."""

import json
from copy import deepcopy
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from pathlib import Path
from unittest.mock import patch

from custom_components.schedule_creator.actions import (
    ActionPreparationCoordinator,
    async_prepare_target_actions,
)
from custom_components.schedule_creator.leases import async_reconcile_entity_leases
from custom_components.schedule_creator.models import (
    ControllerType,
    Occurrence,
    OperationKind,
    OperationState,
    QuickTimer,
    QuickTimerState,
)
from custom_components.schedule_creator.snapshots import (
    async_capture_initial_snapshots,
)
from custom_components.schedule_creator.storage import (
    RuntimeRepository,
    RuntimeStoreData,
)

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "models_v1.json"
NOW = datetime(2026, 9, 15, 17, 5, tzinfo=UTC)


class MemoryJsonStore:
    """Minimal native Store double retaining authoritative saves."""

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


async def _repository(hass, *, capture: bool = True):
    store = MemoryJsonStore()
    repository = RuntimeRepository(hass, store)
    assert await repository.async_load() is None
    await repository.async_initialize(_runtime())
    await async_reconcile_entity_leases(repository, NOW)
    if capture:
        hass.states.async_set("light.living_room", "off", {"brightness": None})
        await async_capture_initial_snapshots(hass, repository, NOW)
    return repository, store


async def test_prepare_quick_timer_winner_action(hass) -> None:
    """The active snapshotted winner receives one PREPARED journal record."""
    repository, _store = await _repository(hass)

    result = await async_prepare_target_actions(repository, NOW)

    assert result.operation_counter == 1
    assert len(result.pending_operations) == 1
    operation = result.pending_operations[0]
    timer = result.quick_timers[0]
    active_lease = next(
        lease
        for lease in result.leases
        if lease.controller_type is ControllerType.QUICK_TIMER
    )
    assert operation.occurrence_id == timer.controller_id
    assert operation.entity_id == timer.entity_id
    assert operation.kind is OperationKind.TARGET_ACTION
    assert operation.state is OperationState.PREPARED
    assert operation.attempt_count == 0
    assert operation.payload == {
        "lease_id": active_lease.id,
        "lease_generation": active_lease.generation,
        "action_id": timer.action.id,
        "domain": timer.action.domain,
        "action": timer.action.action,
        "data": timer.action.data,
    }


async def test_identical_preparation_is_store_no_op(hass) -> None:
    """A reload cannot duplicate an operation for the same lease generation."""
    repository, store = await _repository(hass)
    first = await async_prepare_target_actions(repository, NOW)
    saves_before = len(store.saves)

    second = await async_prepare_target_actions(
        repository, NOW + timedelta(seconds=1)
    )

    assert second is first
    assert len(store.saves) == saves_before


async def test_unsnapshotted_winner_does_not_prepare_action(hass) -> None:
    """An action cannot be prepared before its restore baseline is durable."""
    repository, store = await _repository(hass, capture=False)
    before = repository.data
    saves_before = len(store.saves)

    result = await async_prepare_target_actions(repository, NOW)

    assert result is before
    assert result.pending_operations == ()
    assert len(store.saves) == saves_before


async def test_resumed_schedule_prepares_frozen_start_action(hass) -> None:
    """A suspended schedule prepares its own action after it becomes winner."""
    repository, _store = await _repository(hass)
    await async_prepare_target_actions(repository, NOW)
    resumed_at = NOW + timedelta(minutes=1)
    await repository.async_update(
        lambda current: replace(
            current,
            revision=current.revision + 1,
            quick_timers=(
                replace(
                    current.quick_timers[0], state=QuickTimerState.COMPLETED
                ),
            ),
            updated_at=resumed_at,
        )
    )
    await async_reconcile_entity_leases(repository, resumed_at)
    hass.states.async_set("light.living_room", "on", {"brightness": 120})
    await async_capture_initial_snapshots(hass, repository, resumed_at)

    result = await async_prepare_target_actions(repository, resumed_at)

    assert result.operation_counter == 2
    assert result.pending_operations[0].state is OperationState.SUPERSEDED
    assert result.pending_operations[0].error_code == "lease_replaced"
    operation = result.pending_operations[-1]
    occurrence = result.occurrences[0]
    assert operation.occurrence_id == occurrence.id
    assert operation.payload["action_id"] == occurrence.frozen_schedule.start_action.id
    assert operation.payload["data"] == occurrence.frozen_schedule.start_action.data
    assert occurrence.pending_operation_ids == (operation.id,)
    assert occurrence.last_operation_id == operation.id


async def test_new_active_generation_prepares_new_operation(hass) -> None:
    """A schedule resume is actionable again, while replay remains idempotent."""
    repository, _store = await _repository(hass)
    await async_prepare_target_actions(repository, NOW)
    timer = repository.data.quick_timers[0]

    async def set_timer(state: QuickTimerState, when: datetime) -> None:
        await repository.async_update(
            lambda current: replace(
                current,
                revision=current.revision + 1,
                quick_timers=(replace(current.quick_timers[0], state=state),),
                updated_at=when,
            )
        )
        await async_reconcile_entity_leases(repository, when)

    first_resume = NOW + timedelta(minutes=1)
    await set_timer(QuickTimerState.COMPLETED, first_resume)
    hass.states.async_set("light.living_room", "on")
    await async_capture_initial_snapshots(hass, repository, first_resume)
    await async_prepare_target_actions(repository, first_resume)
    await set_timer(QuickTimerState.ACTIVE, NOW + timedelta(minutes=2))
    await set_timer(QuickTimerState.COMPLETED, NOW + timedelta(minutes=3))

    result = await async_prepare_target_actions(
        repository, NOW + timedelta(minutes=3)
    )

    occurrence = result.occurrences[0]
    schedule_operations = tuple(
        operation
        for operation in result.pending_operations
        if operation.occurrence_id == occurrence.id
    )
    assert timer.expires_at > NOW + timedelta(minutes=2)
    assert len(schedule_operations) == 2
    assert schedule_operations[0].id != schedule_operations[1].id
    assert schedule_operations[0].payload["lease_generation"] == 2
    assert schedule_operations[1].payload["lease_generation"] == 4
    assert occurrence.pending_operation_ids == tuple(
        operation.id for operation in schedule_operations
    )


async def test_coordinator_does_not_call_home_assistant_services(hass) -> None:
    """Preparation persists intent without crossing the service-call boundary."""
    repository, _store = await _repository(hass)
    coordinator = ActionPreparationCoordinator(repository)

    with patch.object(type(hass.services), "async_call") as service_call:
        result = await coordinator.async_refresh(NOW)

    assert len(result.pending_operations) == 1
    service_call.assert_not_called()
