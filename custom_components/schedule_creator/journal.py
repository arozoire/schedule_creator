"""Write-ahead operation journal and deterministic restart planning."""

from __future__ import annotations

from collections.abc import Callable, Mapping
from dataclasses import dataclass, replace
from datetime import UTC, datetime
from enum import StrEnum
from uuid import uuid4

from .models import (
    FrozenJsonValue,
    Occurrence,
    OperationKind,
    OperationState,
    PendingOperation,
    Snapshot,
)
from .storage import RuntimeRepository, RuntimeStoreData


class OperationNotFoundError(KeyError):
    """A requested journal operation is not present."""


class InvalidOperationTransitionError(ValueError):
    """A journal transition is not legal from the current state."""


class RecoveryDecision(StrEnum):
    """Safe next step for an unfinished operation after startup."""

    RETRY_PREPARED = "retry_prepared"
    RECONCILE_SENT = "reconcile_sent"
    RETRY_DUE = "retry_due"
    WAIT_FOR_RETRY = "wait_for_retry"


@dataclass(frozen=True, slots=True, kw_only=True)
class RecoveryInstruction:
    """One deterministic, side-effect-free journal recovery instruction."""

    operation_id: str
    sequence: int
    decision: RecoveryDecision
    not_before: datetime | None


def build_recovery_plan(
    runtime: RuntimeStoreData, now: datetime
) -> tuple[RecoveryInstruction, ...]:
    """Classify unfinished operations without calling a Home Assistant service."""

    current_time = _utc(now)
    instructions: list[RecoveryInstruction] = []
    for operation in sorted(
        runtime.pending_operations, key=lambda item: item.sequence
    ):
        if operation.state is OperationState.PREPARED:
            decision = RecoveryDecision.RETRY_PREPARED
            not_before = None
        elif operation.state is OperationState.SENT:
            decision = RecoveryDecision.RECONCILE_SENT
            not_before = None
        elif operation.state is OperationState.RETRY_WAIT:
            retry_at = operation.next_retry_at
            if retry_at is None:
                raise InvalidOperationTransitionError(
                    f"retry operation {operation.id} has no retry timestamp"
                )
            decision = (
                RecoveryDecision.RETRY_DUE
                if retry_at <= current_time
                else RecoveryDecision.WAIT_FOR_RETRY
            )
            not_before = retry_at
        else:
            continue
        instructions.append(
            RecoveryInstruction(
                operation_id=operation.id,
                sequence=operation.sequence,
                decision=decision,
                not_before=not_before,
            )
        )
    return tuple(instructions)


class JournalCoordinator:
    """Persist journal boundaries before and after future service calls."""

    def __init__(self, runtime: RuntimeRepository) -> None:
        self._runtime = runtime

    async def async_prepare(
        self,
        *,
        kind: OperationKind,
        payload: Mapping[str, FrozenJsonValue],
        now: datetime,
        occurrence_id: str | None = None,
        entity_id: str | None = None,
        snapshots: tuple[Snapshot, ...] = (),
        occurrence: Occurrence | None = None,
        operation_id: str | None = None,
    ) -> PendingOperation:
        """Persist an intent and required immutable snapshots in one write."""

        timestamp = _utc(now)
        allocated_id = str(uuid4()) if operation_id is None else operation_id

        def prepare(current: RuntimeStoreData) -> RuntimeStoreData:
            if any(item.id == allocated_id for item in current.pending_operations):
                raise InvalidOperationTransitionError(
                    f"operation {allocated_id} already exists"
                )
            if occurrence is not None and occurrence.id != occurrence_id:
                raise InvalidOperationTransitionError(
                    "new occurrence must match the operation occurrence_id"
                )
            if snapshots and occurrence_id is None:
                raise InvalidOperationTransitionError(
                    "snapshots require an operation occurrence_id"
                )
            if any(snapshot.occurrence_id != occurrence_id for snapshot in snapshots):
                raise InvalidOperationTransitionError(
                    "snapshots must belong to the operation controller"
                )

            operation = PendingOperation(
                id=allocated_id,
                sequence=current.operation_counter + 1,
                occurrence_id=occurrence_id,
                entity_id=entity_id,
                kind=kind,
                state=OperationState.PREPARED,
                payload=payload,
                attempt_count=0,
                created_at=timestamp,
                updated_at=timestamp,
                next_retry_at=None,
                error_code=None,
            )
            occurrences = list(current.occurrences)
            matching_index = next(
                (
                    index
                    for index, item in enumerate(occurrences)
                    if item.id == occurrence_id
                ),
                None,
            )
            if occurrence is not None:
                if matching_index is not None:
                    raise InvalidOperationTransitionError(
                        f"occurrence {occurrence.id} already exists"
                    )
                occurrences.append(occurrence)
                matching_index = len(occurrences) - 1
            if occurrence_id is not None and matching_index is None:
                timer_ids = {timer.controller_id for timer in current.quick_timers}
                if occurrence_id not in timer_ids:
                    raise InvalidOperationTransitionError(
                        f"controller {occurrence_id} does not exist"
                    )
            if matching_index is not None:
                current_occurrence = occurrences[matching_index]
                snapshot_ids = (
                    *current_occurrence.snapshot_ids,
                    *(snapshot.id for snapshot in snapshots),
                )
                if len(set(snapshot_ids)) != len(snapshot_ids):
                    raise InvalidOperationTransitionError(
                        "an occurrence snapshot cannot be overwritten"
                    )
                occurrences[matching_index] = replace(
                    current_occurrence,
                    snapshot_ids=snapshot_ids,
                    pending_operation_ids=(
                        *current_occurrence.pending_operation_ids,
                        operation.id,
                    ),
                    last_operation_id=operation.id,
                )

            return RuntimeStoreData(
                schema_version=current.schema_version,
                revision=current.revision + 1,
                operation_counter=operation.sequence,
                occurrences=tuple(occurrences),
                snapshots=(*current.snapshots, *snapshots),
                leases=current.leases,
                pending_operations=(*current.pending_operations, operation),
                quick_timers=current.quick_timers,
                notification_deduplication_keys=(
                    current.notification_deduplication_keys
                ),
                updated_at=timestamp,
            )

        updated = await self._runtime.async_update(prepare)
        return _find_operation(updated, allocated_id)

    async def async_mark_sent(
        self, operation_id: str, now: datetime
    ) -> PendingOperation:
        """Persist SENT before the caller is allowed to invoke a service."""

        timestamp = _utc(now)

        def mark(operation: PendingOperation) -> PendingOperation:
            _require_state(
                operation,
                {OperationState.PREPARED, OperationState.RETRY_WAIT},
                OperationState.SENT,
            )
            if (
                operation.state is OperationState.RETRY_WAIT
                and operation.next_retry_at is not None
                and operation.next_retry_at > timestamp
            ):
                raise InvalidOperationTransitionError(
                    f"operation {operation.id} is not due for retry"
                )
            return replace(
                operation,
                state=OperationState.SENT,
                attempt_count=operation.attempt_count + 1,
                updated_at=timestamp,
                next_retry_at=None,
                error_code=None,
            )

        return await self._async_transition(operation_id, timestamp, mark)

    async def async_mark_succeeded(
        self, operation_id: str, now: datetime
    ) -> PendingOperation:
        """Persist a confirmed service result."""

        timestamp = _utc(now)

        def mark(operation: PendingOperation) -> PendingOperation:
            _require_state(
                operation, {OperationState.SENT}, OperationState.SUCCEEDED
            )
            return replace(
                operation,
                state=OperationState.SUCCEEDED,
                updated_at=timestamp,
                error_code=None,
            )

        return await self._async_transition(operation_id, timestamp, mark)

    async def async_schedule_retry(
        self,
        operation_id: str,
        *,
        now: datetime,
        retry_at: datetime,
        error_code: str,
    ) -> PendingOperation:
        """Retain an unsuccessful SENT operation for a later retry."""

        timestamp = _utc(now)
        next_retry = _utc(retry_at)
        if next_retry < timestamp:
            raise InvalidOperationTransitionError("retry_at cannot precede now")

        def mark(operation: PendingOperation) -> PendingOperation:
            _require_state(
                operation, {OperationState.SENT}, OperationState.RETRY_WAIT
            )
            return replace(
                operation,
                state=OperationState.RETRY_WAIT,
                updated_at=timestamp,
                next_retry_at=next_retry,
                error_code=error_code,
            )

        return await self._async_transition(operation_id, timestamp, mark)

    async def async_fail_final(
        self, operation_id: str, *, now: datetime, error_code: str
    ) -> PendingOperation:
        """Persist an unrecoverable journal result."""

        return await self._async_finish(
            operation_id, now, OperationState.FAILED_FINAL, error_code
        )

    async def async_supersede(
        self, operation_id: str, *, now: datetime, error_code: str
    ) -> PendingOperation:
        """Persist lease loss so the operation can never target the entity again."""

        return await self._async_finish(
            operation_id, now, OperationState.SUPERSEDED, error_code
        )

    async def _async_finish(
        self,
        operation_id: str,
        now: datetime,
        target: OperationState,
        error_code: str,
    ) -> PendingOperation:
        timestamp = _utc(now)

        def mark(operation: PendingOperation) -> PendingOperation:
            _require_state(
                operation,
                {
                    OperationState.PREPARED,
                    OperationState.SENT,
                    OperationState.RETRY_WAIT,
                },
                target,
            )
            return replace(
                operation,
                state=target,
                updated_at=timestamp,
                next_retry_at=None,
                error_code=error_code,
            )

        return await self._async_transition(operation_id, timestamp, mark)

    async def _async_transition(
        self,
        operation_id: str,
        timestamp: datetime,
        transition: Callable[[PendingOperation], PendingOperation],
    ) -> PendingOperation:
        def update(current: RuntimeStoreData) -> RuntimeStoreData:
            found = False
            operations: list[PendingOperation] = []
            for operation in current.pending_operations:
                if operation.id == operation_id:
                    operation = transition(operation)
                    found = True
                operations.append(operation)
            if not found:
                raise OperationNotFoundError(operation_id)
            return replace(
                current,
                revision=current.revision + 1,
                pending_operations=tuple(operations),
                updated_at=timestamp,
            )

        updated = await self._runtime.async_update(update)
        return _find_operation(updated, operation_id)


def _find_operation(
    runtime: RuntimeStoreData, operation_id: str
) -> PendingOperation:
    try:
        return next(
            operation
            for operation in runtime.pending_operations
            if operation.id == operation_id
        )
    except StopIteration as err:
        raise OperationNotFoundError(operation_id) from err


def _require_state(
    operation: PendingOperation,
    allowed: set[OperationState],
    target: OperationState,
) -> None:
    if operation.state not in allowed:
        raise InvalidOperationTransitionError(
            f"cannot move {operation.id} from {operation.state} to {target}"
        )


def _utc(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() != UTC.utcoffset(value):
        raise ValueError("journal timestamps must use UTC")
    return value.astimezone(UTC)
