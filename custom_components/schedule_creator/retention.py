"""Retention of finished controllers and everything they own.

A finished occurrence or Quick Timer is removed together with its journal
operations, snapshots and notification keys once it is older than the retention
window and nothing is still in flight. Without this the runtime Store, which is
rewritten on every change, would grow forever.
"""

from __future__ import annotations

from dataclasses import replace
from datetime import UTC, datetime, timedelta

from .models import OccurrenceState, OperationState, QuickTimerState
from .storage import RuntimeRepository, RuntimeStoreData

OCCURRENCE_RETENTION = timedelta(days=7)
_TERMINAL_STATES = {
    OccurrenceState.COMPLETED,
    OccurrenceState.CANCELLED,
    OccurrenceState.FAILED,
}
_TERMINAL_TIMER_STATES = {QuickTimerState.COMPLETED, QuickTimerState.CANCELLED}
_OPEN_OPERATION_STATES = {
    OperationState.PREPARED,
    OperationState.SENT,
    OperationState.RETRY_WAIT,
}


def _utc(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() != timedelta(0):
        raise ValueError("now must be UTC")
    return value.astimezone(UTC)


def _busy_controller_ids(runtime: RuntimeStoreData) -> set[str]:
    """Controllers that still own a lease or an unfinished operation."""

    return {
        lease.controller_id for lease in runtime.leases
    } | {
        operation.occurrence_id
        for operation in runtime.pending_operations
        if operation.occurrence_id is not None
        and operation.state in _OPEN_OPERATION_STATES
    }


def collectable_controller_ids(runtime: RuntimeStoreData, now: datetime) -> set[str]:
    """Return finished controllers older than the retention window."""

    cutoff = _utc(now) - OCCURRENCE_RETENTION
    busy = _busy_controller_ids(runtime)
    return {
        occurrence.id
        for occurrence in runtime.occurrences
        if occurrence.state in _TERMINAL_STATES
        and occurrence.end_utc < cutoff
        and occurrence.id not in busy
    } | {
        timer.controller_id
        for timer in runtime.quick_timers
        if timer.state in _TERMINAL_TIMER_STATES
        and timer.expires_at < cutoff
        and timer.controller_id not in busy
    }


async def async_prune_terminal_occurrences(
    repository: RuntimeRepository, now: datetime
) -> RuntimeStoreData:
    """Remove old finished controllers with their operations and snapshots."""

    pruned_at = _utc(now)

    def mutation(current: RuntimeStoreData) -> RuntimeStoreData | None:
        removed = collectable_controller_ids(current, pruned_at)
        if not removed:
            return None
        prefixes = tuple(f"{controller_id}:" for controller_id in removed)
        return replace(
            current,
            revision=current.revision + 1,
            occurrences=tuple(
                item for item in current.occurrences if item.id not in removed
            ),
            quick_timers=tuple(
                item
                for item in current.quick_timers
                if item.controller_id not in removed
            ),
            snapshots=tuple(
                item
                for item in current.snapshots
                if item.occurrence_id not in removed
            ),
            pending_operations=tuple(
                item
                for item in current.pending_operations
                if item.occurrence_id not in removed
            ),
            notification_deduplication_keys=tuple(
                key
                for key in current.notification_deduplication_keys
                if not key.startswith(prefixes)
            ),
            updated_at=max(current.updated_at, pruned_at),
        )

    return await repository.async_update_if_changed(mutation)
