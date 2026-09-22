"""Conservative retention for terminal schedule occurrences."""

from __future__ import annotations

from dataclasses import replace
from datetime import UTC, datetime, timedelta

from .models import OccurrenceState
from .storage import RuntimeRepository, RuntimeStoreData

OCCURRENCE_RETENTION = timedelta(days=30)
_TERMINAL_STATES = {
    OccurrenceState.COMPLETED,
    OccurrenceState.CANCELLED,
    OccurrenceState.FAILED,
}


def _utc(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() != timedelta(0):
        raise ValueError("now must be UTC")
    return value.astimezone(UTC)


def _protected_occurrence_ids(runtime: RuntimeStoreData) -> set[str]:
    return {
        snapshot.occurrence_id for snapshot in runtime.snapshots
    } | {
        operation.occurrence_id
        for operation in runtime.pending_operations
        if operation.occurrence_id is not None
    } | {
        lease.occurrence_id
        for lease in runtime.leases
        if lease.occurrence_id is not None
    }


async def async_prune_terminal_occurrences(
    repository: RuntimeRepository, now: datetime
) -> RuntimeStoreData:
    """Remove only old terminal occurrences with no operational references."""

    pruned_at = _utc(now)
    cutoff = pruned_at - OCCURRENCE_RETENTION

    def mutation(current: RuntimeStoreData) -> RuntimeStoreData | None:
        protected_ids = _protected_occurrence_ids(current)
        retained = tuple(
            occurrence
            for occurrence in current.occurrences
            if not (
                occurrence.state in _TERMINAL_STATES
                and occurrence.end_utc < cutoff
                and occurrence.id not in protected_ids
            )
        )
        if retained == current.occurrences:
            return None
        return replace(
            current,
            revision=current.revision + 1,
            occurrences=retained,
            updated_at=max(current.updated_at, pruned_at),
        )

    return await repository.async_update_if_changed(mutation)
