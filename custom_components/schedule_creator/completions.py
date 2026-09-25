"""Durable completion intents for one-shot runtime controllers."""

from __future__ import annotations

from dataclasses import replace
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING
from uuid import UUID, uuid5

from homeassistant.exceptions import HomeAssistantError

from .actions import (
    ACTION_RETRY_INTERVAL,
    MAX_ACTION_ATTEMPTS,
    async_call_service,
    async_execute_target_actions,
)
from .journal import JournalCoordinator
from .models import (
    ConditionBranch,
    FrozenJsonValue,
    LeaseState,
    Occurrence,
    OccurrenceState,
    OperationKind,
    OperationState,
    PendingOperation,
    QuickTimerState,
    Snapshot,
    TargetAction,
)
from .notifications import async_execute_notifications, async_prepare_notifications
from .storage import RuntimeRepository, RuntimeStoreData

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

_COMPLETION_NAMESPACE = UUID("8d180d6c-f980-4c36-a5c7-0bfa750ba435")


# A slot cancelled by a configuration change ends like a completed one.
_ENDED_STATES = {OccurrenceState.COMPLETED, OccurrenceState.CANCELLED}


def _utc(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() != timedelta(0):
        raise ValueError("now must be UTC")
    return value.astimezone(UTC)


def _restore_id(controller_id: str) -> str:
    return str(uuid5(_COMPLETION_NAMESPACE, f"quick_timer\0{controller_id}"))


def _schedule_end_id(controller_id: str, entity_id: str) -> str:
    return str(
        uuid5(_COMPLETION_NAMESPACE, f"schedule_end\0{controller_id}\0{entity_id}")
    )


def _condition_fallback_id(controller_id: str, entity_id: str, source_id: str) -> str:
    return str(
        uuid5(
            _COMPLETION_NAMESPACE,
            f"condition_fallback\0{controller_id}\0{entity_id}\0{source_id}",
        )
    )


async def async_prepare_quick_timer_restores(
    repository: RuntimeRepository, now: datetime
) -> RuntimeStoreData:
    """Prepare one safe restore intent for each completed applied Quick Timer."""

    prepared_at = _utc(now)

    def mutation(runtime: RuntimeStoreData) -> RuntimeStoreData | None:
        existing_ids = {operation.id for operation in runtime.pending_operations}
        successful_controllers = {
            operation.occurrence_id
            for operation in runtime.pending_operations
            if operation.kind is OperationKind.TARGET_ACTION
            and operation.state is OperationState.SUCCEEDED
        }
        snapshots = {snapshot.id: snapshot for snapshot in runtime.snapshots}
        active_entities = {
            lease.entity_id
            for lease in runtime.leases
            if lease.state is LeaseState.ACTIVE
        }
        candidates = tuple(
            (timer, snapshots[timer.snapshot_id])
            for timer in runtime.quick_timers
            if timer.state in {QuickTimerState.COMPLETED, QuickTimerState.CANCELLED}
            and timer.controller_id in successful_controllers
            and timer.snapshot_id is not None
            and timer.snapshot_id in snapshots
            and _restore_id(timer.controller_id) not in existing_ids
        )
        if not candidates:
            return None
        persisted_at = max(runtime.updated_at, prepared_at)
        operations = tuple(
            PendingOperation(
                id=_restore_id(timer.controller_id),
                sequence=runtime.operation_counter + offset,
                occurrence_id=timer.controller_id,
                entity_id=timer.entity_id,
                kind=OperationKind.RESTORE,
                state=(
                    OperationState.SUPERSEDED
                    if timer.entity_id in active_entities
                    else OperationState.PREPARED
                ),
                payload={
                    "snapshot_id": snapshot.id,
                    "domain": snapshot.domain,
                    "state": snapshot.state,
                    "attributes": snapshot.attributes,
                    "checksum": snapshot.checksum,
                },
                attempt_count=0,
                created_at=persisted_at,
                updated_at=persisted_at,
                next_retry_at=None,
                error_code=(
                    "controller_replaced"
                    if timer.entity_id in active_entities
                    else None
                ),
            )
            for offset, (timer, snapshot) in enumerate(candidates, start=1)
        )
        return replace(
            runtime,
            revision=runtime.revision + 1,
            operation_counter=runtime.operation_counter + len(operations),
            pending_operations=(*runtime.pending_operations, *operations),
            updated_at=persisted_at,
        )

    return await repository.async_update_if_changed(mutation)


async def async_prepare_schedule_end_actions(
    repository: RuntimeRepository, now: datetime
) -> RuntimeStoreData:
    """Prepare explicit end actions only for schedules that applied their start."""

    prepared_at = _utc(now)

    def mutation(runtime: RuntimeStoreData) -> RuntimeStoreData | None:
        existing_ids = {operation.id for operation in runtime.pending_operations}
        successful_targets = {
            (operation.occurrence_id, operation.entity_id)
            for operation in runtime.pending_operations
            if operation.kind is OperationKind.TARGET_ACTION
            and operation.state is OperationState.SUCCEEDED
            and operation.payload.get("phase") != "completion"
        }
        active_entities = {
            lease.entity_id
            for lease in runtime.leases
            if lease.state is LeaseState.ACTIVE
        }
        candidates = tuple(
            (occurrence, entity_id, occurrence.frozen_schedule.end_action)
            for occurrence in runtime.occurrences
            if occurrence.state in _ENDED_STATES
            and occurrence.frozen_schedule.end_action is not None
            for entity_id in occurrence.frozen_schedule.target_entity_ids
            if (occurrence.id, entity_id) in successful_targets
            and _schedule_end_id(occurrence.id, entity_id) not in existing_ids
        )
        if not candidates:
            return None
        persisted_at = max(runtime.updated_at, prepared_at)
        operations = tuple(
            PendingOperation(
                id=_schedule_end_id(occurrence.id, entity_id),
                sequence=runtime.operation_counter + offset,
                occurrence_id=occurrence.id,
                entity_id=entity_id,
                kind=OperationKind.TARGET_ACTION,
                state=(
                    OperationState.SUPERSEDED
                    if entity_id in active_entities
                    else OperationState.PREPARED
                ),
                payload={
                    "phase": "schedule_end",
                    "action_id": action.id,
                    "domain": action.domain,
                    "action": action.action,
                    "data": action.data,
                },
                attempt_count=0,
                created_at=persisted_at,
                updated_at=persisted_at,
                next_retry_at=None,
                error_code=(
                    "controller_replaced" if entity_id in active_entities else None
                ),
            )
            for offset, (occurrence, entity_id, action) in enumerate(
                candidates, start=1
            )
            if action is not None
        )
        operations_by_occurrence: dict[str, list[PendingOperation]] = {}
        for operation in operations:
            assert operation.occurrence_id is not None
            operations_by_occurrence.setdefault(operation.occurrence_id, []).append(
                operation
            )
        occurrences = tuple(
            replace(
                occurrence,
                pending_operation_ids=(
                    *occurrence.pending_operation_ids,
                    *(
                        operation.id
                        for operation in operations_by_occurrence.get(occurrence.id, ())
                    ),
                ),
                last_operation_id=operations_by_occurrence[occurrence.id][-1].id,
            )
            if occurrence.id in operations_by_occurrence
            else occurrence
            for occurrence in runtime.occurrences
        )
        return replace(
            runtime,
            revision=runtime.revision + 1,
            operation_counter=runtime.operation_counter + len(operations),
            occurrences=occurrences,
            pending_operations=(*runtime.pending_operations, *operations),
            updated_at=persisted_at,
        )

    return await repository.async_update_if_changed(mutation)


async def async_prepare_condition_fallbacks(
    repository: RuntimeRepository, now: datetime
) -> RuntimeStoreData:
    """Prepare one fallback for each applied conditional-control episode."""

    prepared_at = _utc(now)

    def mutation(runtime: RuntimeStoreData) -> RuntimeStoreData | None:
        existing_ids = {operation.id for operation in runtime.pending_operations}
        active_entities = {
            lease.entity_id
            for lease in runtime.leases
            if lease.state is LeaseState.ACTIVE
        }
        snapshots = {
            (snapshot.occurrence_id, snapshot.entity_id): snapshot
            for snapshot in runtime.snapshots
        }
        successful: dict[tuple[str | None, str | None], PendingOperation] = {}
        for operation in runtime.pending_operations:
            if (
                operation.kind is OperationKind.TARGET_ACTION
                and operation.state is OperationState.SUCCEEDED
                and operation.payload.get("phase")
                not in {"schedule_end", "condition_fallback"}
            ):
                key = operation.occurrence_id, operation.entity_id
                previous = successful.get(key)
                if previous is None or operation.sequence > previous.sequence:
                    successful[key] = operation

        candidates: list[
            tuple[Occurrence, str, str, TargetAction | None, Snapshot | None]
        ] = []
        for occurrence in runtime.occurrences:
            if (
                occurrence.state
                not in {OccurrenceState.ACTIVE, OccurrenceState.SUSPENDED}
                or occurrence.condition_branch is not ConditionBranch.FALSE
                or occurrence.frozen_schedule.condition is None
            ):
                continue
            for entity_id in occurrence.frozen_schedule.target_entity_ids:
                applied = successful.get((occurrence.id, entity_id))
                if applied is None:
                    if occurrence.frozen_schedule.end_action is None:
                        continue
                    source_id = "initial_false"
                else:
                    source_id = applied.id
                operation_id = _condition_fallback_id(
                    occurrence.id, entity_id, source_id
                )
                if operation_id in existing_ids:
                    continue
                action = occurrence.frozen_schedule.end_action
                snapshot = snapshots.get((occurrence.id, entity_id))
                if action is None and snapshot is None:
                    continue
                candidates.append((occurrence, entity_id, source_id, action, snapshot))
        if not candidates:
            return None

        persisted_at = max(runtime.updated_at, prepared_at)
        operations: list[PendingOperation] = []
        for offset, candidate in enumerate(candidates, start=1):
            occurrence, entity_id, source_id, action, snapshot = candidate
            controller_id = occurrence.id
            operation_id = _condition_fallback_id(controller_id, entity_id, source_id)
            payload: dict[str, FrozenJsonValue]
            if action is not None:
                payload = {
                    "phase": "condition_fallback",
                    "source_operation_id": source_id,
                    "action_id": action.id,
                    "domain": action.domain,
                    "action": action.action,
                    "data": action.data,
                }
                kind = OperationKind.TARGET_ACTION
            else:
                assert snapshot is not None
                payload = {
                    "phase": "condition_fallback",
                    "source_operation_id": source_id,
                    "snapshot_id": snapshot.id,
                    "domain": snapshot.domain,
                    "state": snapshot.state,
                    "attributes": snapshot.attributes,
                    "checksum": snapshot.checksum,
                }
                kind = OperationKind.RESTORE
            operations.append(
                PendingOperation(
                    id=operation_id,
                    sequence=runtime.operation_counter + offset,
                    occurrence_id=controller_id,
                    entity_id=entity_id,
                    kind=kind,
                    state=(
                        OperationState.SUPERSEDED
                        if entity_id in active_entities
                        else OperationState.PREPARED
                    ),
                    payload=payload,
                    attempt_count=0,
                    created_at=persisted_at,
                    updated_at=persisted_at,
                    next_retry_at=None,
                    error_code=(
                        "controller_replaced" if entity_id in active_entities else None
                    ),
                )
            )

        operations_by_occurrence: dict[str, list[PendingOperation]] = {}
        for operation in operations:
            assert operation.occurrence_id is not None
            operations_by_occurrence.setdefault(operation.occurrence_id, []).append(
                operation
            )
        occurrences = tuple(
            replace(
                occurrence,
                pending_operation_ids=(
                    *occurrence.pending_operation_ids,
                    *(
                        operation.id
                        for operation in operations_by_occurrence.get(occurrence.id, ())
                    ),
                ),
                last_operation_id=operations_by_occurrence[occurrence.id][-1].id,
            )
            if occurrence.id in operations_by_occurrence
            else occurrence
            for occurrence in runtime.occurrences
        )
        return replace(
            runtime,
            revision=runtime.revision + 1,
            operation_counter=runtime.operation_counter + len(operations),
            occurrences=occurrences,
            pending_operations=(*runtime.pending_operations, *operations),
            updated_at=persisted_at,
        )

    return await repository.async_update_if_changed(mutation)


def _due_restores(
    runtime: RuntimeStoreData, now: datetime
) -> tuple[PendingOperation, ...]:
    return tuple(
        operation
        for operation in runtime.pending_operations
        if operation.kind is OperationKind.RESTORE
        and (
            operation.state is OperationState.PREPARED
            or (
                operation.state is OperationState.RETRY_WAIT
                and operation.next_retry_at is not None
                and operation.next_retry_at <= now
            )
        )
    )


def _restore_snapshot(
    runtime: RuntimeStoreData, operation: PendingOperation
) -> Snapshot | None:
    snapshot_id = operation.payload.get("snapshot_id")
    checksum = operation.payload.get("checksum")
    if not isinstance(snapshot_id, str) or not isinstance(checksum, str):
        return None
    return next(
        (
            snapshot
            for snapshot in runtime.snapshots
            if snapshot.id == snapshot_id
            and snapshot.checksum == checksum
            and snapshot.occurrence_id == operation.occurrence_id
            and snapshot.entity_id == operation.entity_id
        ),
        None,
    )


def _sendable_restore(runtime: RuntimeStoreData, operation: PendingOperation) -> bool:
    if any(
        lease.entity_id == operation.entity_id and lease.state is LeaseState.ACTIVE
        for lease in runtime.leases
    ):
        return False
    if operation.payload.get("phase") != "condition_fallback":
        return True
    return any(
        occurrence.id == operation.occurrence_id
        and occurrence.state in {OccurrenceState.ACTIVE, OccurrenceState.SUSPENDED}
        and occurrence.condition_branch is ConditionBranch.FALSE
        for occurrence in runtime.occurrences
    )


async def async_execute_restores(
    hass: HomeAssistant, repository: RuntimeRepository, now: datetime
) -> RuntimeStoreData:
    """Execute due restores through scene reproduction and journal boundaries."""

    wall_clock = _utc(now)
    journal = JournalCoordinator(repository)
    operation_ids = tuple(
        operation.id for operation in _due_restores(repository.data, wall_clock)
    )
    for operation_id in operation_ids:
        operation = next(
            (
                item
                for item in repository.data.pending_operations
                if item.id == operation_id
            ),
            None,
        )
        if operation is None or operation not in _due_restores(
            repository.data, wall_clock
        ):
            continue
        if not _sendable_restore(repository.data, operation):
            active_controller = any(
                lease.entity_id == operation.entity_id
                and lease.state is LeaseState.ACTIVE
                for lease in repository.data.leases
            )
            await journal.async_supersede(
                operation.id,
                now=wall_clock,
                error_code=(
                    "controller_replaced" if active_controller else "fallback_obsolete"
                ),
            )
            continue
        snapshot = _restore_snapshot(repository.data, operation)
        if snapshot is None or operation.entity_id is None:
            await journal.async_fail_final(
                operation.id, now=wall_clock, error_code="invalid_snapshot"
            )
            continue
        sent = await journal.async_mark_sent(operation.id, wall_clock)
        try:
            await async_call_service(
                hass,
                "scene",
                "apply",
                service_data={
                    "entities": {
                        operation.entity_id: {
                            **snapshot.attributes,
                            "state": snapshot.state,
                        }
                    }
                },
                blocking=True,
            )
        except (HomeAssistantError, TimeoutError):
            if sent.attempt_count >= MAX_ACTION_ATTEMPTS:
                await journal.async_fail_final(
                    operation.id,
                    now=wall_clock,
                    error_code="restore_failed",
                )
            else:
                await journal.async_schedule_retry(
                    operation.id,
                    now=wall_clock,
                    retry_at=wall_clock + ACTION_RETRY_INTERVAL,
                    error_code="restore_error",
                )
            continue
        await journal.async_mark_succeeded(operation.id, wall_clock)
    return repository.data


class CompletionCoordinator:
    """Prepare and execute safe completion operations."""

    def __init__(self, hass: HomeAssistant, runtime: RuntimeRepository) -> None:
        self._hass = hass
        self._runtime = runtime

    async def async_refresh(self, now: datetime) -> RuntimeStoreData:
        """Prepare and execute all currently eligible completion operations."""

        await async_prepare_quick_timer_restores(self._runtime, now)
        await async_prepare_schedule_end_actions(self._runtime, now)
        await async_prepare_condition_fallbacks(self._runtime, now)
        await async_execute_restores(self._hass, self._runtime, now)
        await async_execute_target_actions(self._hass, self._runtime, now)
        await async_prepare_notifications(self._runtime, now)
        return await async_execute_notifications(self._hass, self._runtime, now)
