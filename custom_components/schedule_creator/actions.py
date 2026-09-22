"""Idempotent preparation of target-action journal records."""

from __future__ import annotations

from dataclasses import replace
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid5

from .models import (
    EntityLease,
    FrozenJsonValue,
    LeaseState,
    OperationKind,
    OperationState,
    PendingOperation,
    TargetAction,
)
from .storage import RuntimeRepository, RuntimeStoreData

_OPERATION_NAMESPACE = UUID("639890ae-ec49-4c94-b925-6b022bd92a8f")


def _utc(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() != timedelta(0):
        raise ValueError("now must be UTC")
    return value.astimezone(UTC)


def _operation_id(lease: EntityLease) -> str:
    return str(uuid5(_OPERATION_NAMESPACE, f"{lease.id}\0{lease.generation}"))


def _target_action(runtime: RuntimeStoreData, lease: EntityLease) -> TargetAction:
    if lease.occurrence_id is not None:
        occurrence = next(
            item for item in runtime.occurrences if item.id == lease.occurrence_id
        )
        return occurrence.frozen_schedule.start_action
    timer = next(
        item
        for item in runtime.quick_timers
        if item.controller_id == lease.controller_id
    )
    return timer.action


def _payload(
    lease: EntityLease, action: TargetAction
) -> dict[str, FrozenJsonValue]:
    return {
        "lease_id": lease.id,
        "lease_generation": lease.generation,
        "action_id": action.id,
        "domain": action.domain,
        "action": action.action,
        "data": action.data,
    }


async def async_prepare_target_actions(
    repository: RuntimeRepository, now: datetime
) -> RuntimeStoreData:
    """Atomically prepare missing target actions for snapshotted active leases."""

    prepared_at = _utc(now)

    def mutation(runtime: RuntimeStoreData) -> RuntimeStoreData | None:
        snapshot_owners = {
            (snapshot.occurrence_id, snapshot.entity_id)
            for snapshot in runtime.snapshots
        }
        existing_ids = {item.id for item in runtime.pending_operations}
        desired_ids = {
            _operation_id(lease)
            for lease in runtime.leases
            if lease.state is LeaseState.ACTIVE
            and (lease.controller_id, lease.entity_id) in snapshot_owners
        }
        candidates = tuple(
            lease
            for lease in sorted(
                runtime.leases,
                key=lambda item: (item.entity_id, item.controller_id),
            )
            if lease.state is LeaseState.ACTIVE
            and (lease.controller_id, lease.entity_id) in snapshot_owners
            and _operation_id(lease) not in existing_ids
        )
        superseded_ids = {
            operation.id
            for operation in runtime.pending_operations
            if operation.kind is OperationKind.TARGET_ACTION
            and operation.state is OperationState.PREPARED
            and "lease_id" in operation.payload
            and "lease_generation" in operation.payload
            and operation.id not in desired_ids
        }
        if not candidates and not superseded_ids:
            return None

        persisted_at = max(runtime.updated_at, prepared_at)
        existing_operations = tuple(
            replace(
                operation,
                state=OperationState.SUPERSEDED,
                updated_at=persisted_at,
                next_retry_at=None,
                error_code="lease_replaced",
            )
            if operation.id in superseded_ids
            else operation
            for operation in runtime.pending_operations
        )
        operations: list[PendingOperation] = []
        for offset, lease in enumerate(candidates, start=1):
            action = _target_action(runtime, lease)
            operations.append(
                PendingOperation(
                    id=_operation_id(lease),
                    sequence=runtime.operation_counter + offset,
                    occurrence_id=lease.controller_id,
                    entity_id=lease.entity_id,
                    kind=OperationKind.TARGET_ACTION,
                    state=OperationState.PREPARED,
                    payload=_payload(lease, action),
                    attempt_count=0,
                    created_at=persisted_at,
                    updated_at=persisted_at,
                    next_retry_at=None,
                    error_code=None,
                )
            )

        operations_by_occurrence: dict[str, list[PendingOperation]] = {}
        for operation in operations:
            assert operation.occurrence_id is not None
            operations_by_occurrence.setdefault(
                operation.occurrence_id, []
            ).append(operation)
        occurrences = tuple(
            replace(
                occurrence,
                pending_operation_ids=(
                    *occurrence.pending_operation_ids,
                    *(
                        operation.id
                        for operation in operations_by_occurrence.get(
                            occurrence.id, ()
                        )
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
            pending_operations=(*existing_operations, *operations),
            updated_at=persisted_at,
        )

    return await repository.async_update_if_changed(mutation)


class ActionPreparationCoordinator:
    """Expose action preparation as a lifecycle reconciliation stage."""

    def __init__(self, runtime: RuntimeRepository) -> None:
        self._runtime = runtime

    async def async_refresh(self, now: datetime) -> RuntimeStoreData:
        """Prepare all currently eligible target actions."""

        return await async_prepare_target_actions(self._runtime, now)
