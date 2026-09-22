"""Idempotent preparation of target-action journal records."""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable, Mapping
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Any, cast
from uuid import UUID, uuid5

from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.event import async_track_point_in_utc_time

from .journal import JournalCoordinator
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

if TYPE_CHECKING:
    from homeassistant.core import CALLBACK_TYPE, HomeAssistant

_OPERATION_NAMESPACE = UUID("639890ae-ec49-4c94-b925-6b022bd92a8f")
_LOGGER = logging.getLogger(__name__)
ACTION_RETRY_INTERVAL = timedelta(seconds=30)
MAX_ACTION_ATTEMPTS = 3
UNKNOWN_SENT_OUTCOME = "sent_outcome_unknown"


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

    def __init__(
        self,
        runtime: RuntimeRepository,
        on_actions_prepared: Callable[[datetime], Awaitable[object]] | None = None,
    ) -> None:
        self._runtime = runtime
        self._on_actions_prepared = on_actions_prepared

    async def async_refresh(self, now: datetime) -> RuntimeStoreData:
        """Prepare all currently eligible target actions."""

        result = await async_prepare_target_actions(self._runtime, now)
        if self._on_actions_prepared is not None:
            result = cast(RuntimeStoreData, await self._on_actions_prepared(now))
        return result


async def async_reconcile_sent_operations(
    repository: RuntimeRepository, now: datetime
) -> RuntimeStoreData:
    """Fail closed for service operations left SENT by an interrupted process."""

    reconciled_at = _utc(now)

    def mutation(runtime: RuntimeStoreData) -> RuntimeStoreData | None:
        sent_ids = {
            operation.id
            for operation in runtime.pending_operations
            if operation.kind in {
                OperationKind.TARGET_ACTION,
                OperationKind.RESTORE,
            }
            and operation.state is OperationState.SENT
        }
        if not sent_ids:
            return None
        persisted_at = max(runtime.updated_at, reconciled_at)
        return replace(
            runtime,
            revision=runtime.revision + 1,
            pending_operations=tuple(
                replace(
                    operation,
                    state=OperationState.FAILED_FINAL,
                    updated_at=persisted_at,
                    next_retry_at=None,
                    error_code=UNKNOWN_SENT_OUTCOME,
                )
                if operation.id in sent_ids
                else operation
                for operation in runtime.pending_operations
            ),
            updated_at=persisted_at,
        )

    return await repository.async_update_if_changed(mutation)


def _current_lease(
    runtime: RuntimeStoreData, operation: PendingOperation
) -> bool:
    lease_id = operation.payload.get("lease_id")
    generation = operation.payload.get("lease_generation")
    if (
        not isinstance(lease_id, str)
        or not isinstance(generation, int)
        or isinstance(generation, bool)
    ):
        return False
    return any(
        lease.id == lease_id
        and lease.generation == generation
        and lease.state is LeaseState.ACTIVE
        and lease.controller_id == operation.occurrence_id
        and lease.entity_id == operation.entity_id
        for lease in runtime.leases
    )


def _service_request(
    operation: PendingOperation,
) -> tuple[str, str, dict[str, Any]]:
    domain = operation.payload.get("domain")
    action = operation.payload.get("action")
    data = operation.payload.get("data")
    if (
        not isinstance(domain, str)
        or not isinstance(action, str)
        or not isinstance(data, Mapping)
    ):
        raise ValueError("invalid target-action payload")
    return domain, action, dict(data)


def _due_operations(
    runtime: RuntimeStoreData, now: datetime
) -> tuple[PendingOperation, ...]:
    return tuple(
        operation
        for operation in runtime.pending_operations
        if operation.kind is OperationKind.TARGET_ACTION
        and (
            operation.state is OperationState.PREPARED
            or (
                operation.state is OperationState.RETRY_WAIT
                and operation.next_retry_at is not None
                and operation.next_retry_at <= now
            )
        )
    )


async def async_execute_target_actions(
    hass: HomeAssistant, repository: RuntimeRepository, now: datetime
) -> RuntimeStoreData:
    """Execute due target actions through durable journal boundaries."""

    wall_clock = _utc(now)
    journal = JournalCoordinator(repository)
    operation_ids = tuple(
        operation.id for operation in _due_operations(repository.data, wall_clock)
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
        if operation is None or operation not in _due_operations(
            repository.data, wall_clock
        ):
            continue
        if not _current_lease(repository.data, operation):
            await journal.async_supersede(
                operation.id, now=wall_clock, error_code="lease_replaced"
            )
            continue
        try:
            domain, action, data = _service_request(operation)
        except ValueError:
            await journal.async_fail_final(
                operation.id, now=wall_clock, error_code="invalid_payload"
            )
            continue

        sent = await journal.async_mark_sent(operation.id, wall_clock)
        try:
            await hass.services.async_call(
                domain,
                action,
                service_data=data,
                target={"entity_id": operation.entity_id},
                blocking=True,
            )
        except (HomeAssistantError, TimeoutError):
            if sent.attempt_count >= MAX_ACTION_ATTEMPTS:
                await journal.async_fail_final(
                    operation.id,
                    now=wall_clock,
                    error_code="service_failed",
                )
            else:
                await journal.async_schedule_retry(
                    operation.id,
                    now=wall_clock,
                    retry_at=wall_clock + ACTION_RETRY_INTERVAL,
                    error_code="service_error",
                )
            continue
        await journal.async_mark_succeeded(operation.id, wall_clock)
    return repository.data


class ActionExecutionCoordinator:
    """Execute actions now and own the nearest persisted retry callback."""

    def __init__(
        self,
        hass: HomeAssistant,
        runtime: RuntimeRepository,
        on_actions_executed: Callable[[datetime], Awaitable[object]] | None = None,
    ) -> None:
        self._hass = hass
        self._runtime = runtime
        self._on_actions_executed = on_actions_executed
        self._cancel: CALLBACK_TYPE | None = None
        self._active = False

    async def async_refresh(self, now: datetime) -> RuntimeStoreData:
        """Execute all due actions and reschedule the nearest retry."""

        result = await async_execute_target_actions(
            self._hass, self._runtime, now
        )
        if self._on_actions_executed is not None:
            result = cast(
                RuntimeStoreData, await self._on_actions_executed(now)
            )
        self.reschedule(now)
        return result

    def start(self, now: datetime) -> None:
        """Activate persisted retry scheduling after initial execution."""

        self._active = True
        self.reschedule(now)

    def reschedule(self, now: datetime) -> None:
        """Replace the owned callback with the nearest future retry."""

        if not self._active:
            return
        if self._cancel is not None:
            self._cancel()
            self._cancel = None
        wall_clock = _utc(now)
        retry_at = min(
            (
                operation.next_retry_at
                for operation in self._runtime.data.pending_operations
                if operation.state is OperationState.RETRY_WAIT
                and operation.next_retry_at is not None
                and operation.next_retry_at > wall_clock
            ),
            default=None,
        )
        if retry_at is not None:
            self._cancel = async_track_point_in_utc_time(
                self._hass, self._async_retry, retry_at
            )

    def shutdown(self) -> None:
        """Cancel the retry callback before runtime storage is released."""

        self._active = False
        if self._cancel is not None:
            self._cancel()
            self._cancel = None

    async def _async_retry(self, now: datetime) -> None:
        from . import lifecycle_lock

        async with lifecycle_lock(self._hass):
            if not self._active:
                return
            try:
                await self.async_refresh(now.astimezone(UTC))
            except Exception:
                _LOGGER.exception("Unable to retry target action")
                self.reschedule(now.astimezone(UTC))
