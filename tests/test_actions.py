"""Test idempotent target-action journal preparation."""

import json
from copy import deepcopy
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch

from homeassistant.exceptions import HomeAssistantError

from custom_components.schedule_creator.actions import (
    ACTION_RETRY_INTERVAL,
    MAX_ACTION_ATTEMPTS,
    UNKNOWN_SENT_OUTCOME,
    ActionExecutionCoordinator,
    ActionPreparationCoordinator,
    async_execute_target_actions,
    async_prepare_target_actions,
    async_reconcile_sent_operations,
)
from custom_components.schedule_creator.completions import (
    async_execute_restores,
    async_prepare_quick_timer_restores,
)
from custom_components.schedule_creator.journal import JournalCoordinator
from custom_components.schedule_creator.leases import async_reconcile_entity_leases
from custom_components.schedule_creator.models import (
    ControllerType,
    Occurrence,
    OccurrenceState,
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


async def test_execute_persists_sent_before_service_and_success_after(hass) -> None:
    """The service call is strictly enclosed by durable journal boundaries."""
    repository, store = await _repository(hass)
    await async_prepare_target_actions(repository, NOW)
    saves_before = len(store.saves)

    async def service_call(*args, **kwargs):
        assert repository.data.pending_operations[0].state is OperationState.SENT

    with patch.object(
        type(hass.services),
        "async_call",
        AsyncMock(side_effect=service_call),
    ) as call:
        result = await async_execute_target_actions(hass, repository, NOW)

    operation = result.pending_operations[0]
    assert operation.state is OperationState.SUCCEEDED
    assert operation.attempt_count == 1
    assert len(store.saves) == saves_before + 2
    call.assert_awaited_once_with(
        "light",
        "on",
        service_data={"brightness": 255},
        target={"entity_id": "light.living_room"},
        blocking=True,
    )


async def test_restart_fails_closed_for_indeterminate_sent_action(hass) -> None:
    """Startup never blindly replays a service call with an unknown outcome."""
    repository, store = await _repository(hass)
    await async_prepare_target_actions(repository, NOW)
    operation_id = repository.data.pending_operations[0].id
    await JournalCoordinator(repository).async_mark_sent(operation_id, NOW)
    saves_before = len(store.saves)

    with patch.object(type(hass.services), "async_call") as service_call:
        result = await async_reconcile_sent_operations(
            repository, NOW + timedelta(seconds=1)
        )
        replay = await async_reconcile_sent_operations(
            repository, NOW + timedelta(seconds=2)
        )

    operation = result.pending_operations[0]
    assert operation.state is OperationState.FAILED_FINAL
    assert operation.attempt_count == 1
    assert operation.error_code == UNKNOWN_SENT_OUTCOME
    assert operation.next_retry_at is None
    assert replay is result
    assert len(store.saves) == saves_before + 1
    service_call.assert_not_called()


async def test_completed_quick_timer_prepares_snapshot_restore(hass) -> None:
    """An applied one-shot timer durably prepares its original state restore."""
    repository, store = await _repository(hass)
    await async_prepare_target_actions(repository, NOW)
    operation_id = repository.data.pending_operations[0].id
    journal = JournalCoordinator(repository)
    await journal.async_mark_sent(operation_id, NOW)
    await journal.async_mark_succeeded(operation_id, NOW)
    await repository.async_update(
        lambda current: replace(
            current,
            revision=current.revision + 1,
            occurrences=(
                replace(
                    current.occurrences[0],
                    state=OccurrenceState.COMPLETED,
                ),
            ),
            quick_timers=(
                replace(
                    current.quick_timers[0], state=QuickTimerState.COMPLETED
                ),
            ),
            leases=(),
            updated_at=NOW + timedelta(minutes=1),
        )
    )
    saves_before = len(store.saves)

    result = await async_prepare_quick_timer_restores(
        repository, NOW + timedelta(minutes=1)
    )
    replay = await async_prepare_quick_timer_restores(
        repository, NOW + timedelta(minutes=2)
    )

    restore = result.pending_operations[-1]
    snapshot = result.snapshots[0]
    assert restore.kind is OperationKind.RESTORE
    assert restore.state is OperationState.PREPARED
    assert restore.payload["snapshot_id"] == snapshot.id
    assert restore.payload["state"] == snapshot.state
    assert replay is result
    assert len(store.saves) == saves_before + 1

    async def apply_scene(*args, **kwargs):
        assert repository.data.pending_operations[-1].state is OperationState.SENT

    with patch.object(
        type(hass.services),
        "async_call",
        AsyncMock(side_effect=apply_scene),
    ) as service_call:
        executed = await async_execute_restores(
            hass, repository, NOW + timedelta(minutes=2)
        )

    assert executed.pending_operations[-1].state is OperationState.SUCCEEDED
    service_call.assert_awaited_once_with(
        "scene",
        "apply",
        service_data={
            "entities": {
                "light.living_room": {
                    **snapshot.attributes,
                    "state": snapshot.state,
                }
            }
        },
        blocking=True,
    )


async def test_resumed_controller_supersedes_quick_timer_restore(hass) -> None:
    """A resumed schedule cannot be overwritten by an expired timer restore."""
    repository, _store = await _repository(hass)
    await async_prepare_target_actions(repository, NOW)
    operation_id = repository.data.pending_operations[0].id
    journal = JournalCoordinator(repository)
    await journal.async_mark_sent(operation_id, NOW)
    await journal.async_mark_succeeded(operation_id, NOW)
    await repository.async_update(
        lambda current: replace(
            current,
            revision=current.revision + 1,
            quick_timers=(
                replace(
                    current.quick_timers[0], state=QuickTimerState.COMPLETED
                ),
            ),
            updated_at=NOW + timedelta(minutes=1),
        )
    )
    await async_reconcile_entity_leases(
        repository, NOW + timedelta(minutes=1)
    )

    result = await async_prepare_quick_timer_restores(
        repository, NOW + timedelta(minutes=1)
    )

    restore = result.pending_operations[-1]
    assert restore.kind is OperationKind.RESTORE
    assert restore.state is OperationState.SUPERSEDED
    assert restore.error_code == "controller_replaced"


async def test_stale_lease_is_superseded_without_service_call(hass) -> None:
    """Lease revalidation immediately before SENT blocks obsolete intent."""
    repository, _store = await _repository(hass)
    await async_prepare_target_actions(repository, NOW)
    await repository.async_update(
        lambda current: replace(
            current,
            revision=current.revision + 1,
            leases=(),
            updated_at=NOW + timedelta(seconds=1),
        )
    )

    with patch.object(type(hass.services), "async_call") as service_call:
        result = await async_execute_target_actions(
            hass, repository, NOW + timedelta(seconds=1)
        )

    assert result.pending_operations[0].state is OperationState.SUPERSEDED
    assert result.pending_operations[0].error_code == "lease_replaced"
    service_call.assert_not_called()


async def test_service_failure_persists_bounded_retry(hass) -> None:
    """A transient HA failure becomes a timed retry with retained evidence."""
    repository, _store = await _repository(hass)
    await async_prepare_target_actions(repository, NOW)

    with patch.object(
        type(hass.services),
        "async_call",
        AsyncMock(side_effect=HomeAssistantError("unavailable")),
    ):
        result = await async_execute_target_actions(hass, repository, NOW)

    operation = result.pending_operations[0]
    assert operation.state is OperationState.RETRY_WAIT
    assert operation.attempt_count == 1
    assert operation.next_retry_at == NOW + ACTION_RETRY_INTERVAL
    assert operation.error_code == "service_error"


async def test_third_service_failure_is_final(hass) -> None:
    """Repeated failures stop after the configured bounded attempt count."""
    repository, _store = await _repository(hass)
    await async_prepare_target_actions(repository, NOW)
    await repository.async_update(
        lambda current: replace(
            current,
            revision=current.revision + 1,
            pending_operations=(
                replace(current.pending_operations[0], attempt_count=2),
            ),
        )
    )

    with patch.object(
        type(hass.services),
        "async_call",
        AsyncMock(side_effect=HomeAssistantError("still unavailable")),
    ):
        result = await async_execute_target_actions(hass, repository, NOW)

    operation = result.pending_operations[0]
    assert MAX_ACTION_ATTEMPTS == 3
    assert operation.state is OperationState.FAILED_FINAL
    assert operation.attempt_count == 3
    assert operation.next_retry_at is None
    assert operation.error_code == "service_failed"


async def test_execution_coordinator_runs_due_retry_and_cancels_callback(
    hass,
) -> None:
    """The lifecycle owner schedules and executes the nearest persisted retry."""
    repository, _store = await _repository(hass)
    await async_prepare_target_actions(repository, NOW)
    with patch.object(
        type(hass.services),
        "async_call",
        AsyncMock(side_effect=HomeAssistantError("temporary")),
    ):
        await async_execute_target_actions(hass, repository, NOW)

    cancel = Mock()
    with patch(
        "custom_components.schedule_creator.actions."
        "async_track_point_in_utc_time",
        return_value=cancel,
    ) as track:
        coordinator = ActionExecutionCoordinator(hass, repository)
        coordinator.start(NOW)
        callback = track.call_args.args[1]
        with patch.object(
            type(hass.services), "async_call", AsyncMock()
        ) as service_call:
            await callback(NOW + ACTION_RETRY_INTERVAL)

        assert track.call_args.args[2] == NOW + ACTION_RETRY_INTERVAL
        assert repository.data.pending_operations[0].state is OperationState.SUCCEEDED
        assert repository.data.pending_operations[0].attempt_count == 2
        service_call.assert_awaited_once()
        coordinator.shutdown()

    cancel.assert_called_once_with()
