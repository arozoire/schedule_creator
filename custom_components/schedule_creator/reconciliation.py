"""Idempotent persistence boundary for projected schedule occurrences."""

from __future__ import annotations

from dataclasses import replace
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from .models import IntegrationConfig, Occurrence, OccurrenceState
from .planner import plan_occurrences
from .storage import RuntimeRepository, RuntimeStoreData

PLANNING_HORIZON = timedelta(days=14)


def _utc(value: datetime, path: str) -> datetime:
    if value.tzinfo is None or value.utcoffset() != timedelta(0):
        raise ValueError(f"{path} must be UTC")
    return value.astimezone(UTC)


def _order(occurrence: Occurrence) -> tuple[datetime, datetime, str]:
    return occurrence.start_utc, occurrence.end_utc, occurrence.id


async def async_reconcile_occurrences(
    repository: RuntimeRepository,
    projected: tuple[Occurrence, ...],
    now: datetime,
) -> RuntimeStoreData:
    """Persist only missing occurrence IDs while preserving existing records."""

    reconciled_at = _utc(now, "now")
    projected_ids = [occurrence.id for occurrence in projected]
    if len(set(projected_ids)) != len(projected_ids):
        raise ValueError("projected occurrences must have unique IDs")

    def mutation(current: RuntimeStoreData) -> RuntimeStoreData | None:
        existing_ids = {occurrence.id for occurrence in current.occurrences}
        missing = tuple(
            occurrence
            for occurrence in projected
            if occurrence.id not in existing_ids
        )
        if not missing:
            return None
        return replace(
            current,
            revision=current.revision + 1,
            occurrences=tuple(sorted((*current.occurrences, *missing), key=_order)),
            updated_at=max(current.updated_at, reconciled_at),
        )

    return await repository.async_update_if_changed(mutation)


async def async_reconcile_window(
    repository: RuntimeRepository,
    config: IntegrationConfig,
    window_start_utc: datetime,
    window_end_utc: datetime,
    timezone: ZoneInfo,
    now: datetime,
) -> RuntimeStoreData:
    """Project one bounded window and reconcile it into the runtime Store."""

    projected = plan_occurrences(
        config, window_start_utc, window_end_utc, timezone
    )
    return await async_reconcile_occurrences(repository, projected, now)


def _protected_occurrence_ids(runtime: RuntimeStoreData) -> set[str]:
    return {
        lease.occurrence_id
        for lease in runtime.leases
        if lease.occurrence_id is not None
    } | {
        operation.occurrence_id
        for operation in runtime.pending_operations
        if operation.occurrence_id is not None
    } | {snapshot.occurrence_id for snapshot in runtime.snapshots}


def _replaceable(
    occurrence: Occurrence,
    protected_ids: set[str],
    window_start: datetime,
    window_end: datetime,
) -> bool:
    return (
        occurrence.state is OccurrenceState.PENDING
        and window_start <= occurrence.start_utc < window_end
        and occurrence.id not in protected_ids
        and not occurrence.snapshot_ids
        and not occurrence.pending_operation_ids
        and occurrence.last_operation_id is None
    )


async def async_replan_window(
    repository: RuntimeRepository,
    config: IntegrationConfig,
    window_start_utc: datetime,
    window_end_utc: datetime,
    timezone: ZoneInfo,
    now: datetime,
) -> RuntimeStoreData:
    """Replace only unstarted, unreferenced occurrences inside one window."""

    window_start = _utc(window_start_utc, "window_start_utc")
    window_end = _utc(window_end_utc, "window_end_utc")
    if window_end <= window_start:
        raise ValueError("window_end_utc must follow window_start_utc")
    replanned_at = _utc(now, "now")
    projected = plan_occurrences(config, window_start, window_end, timezone)
    projected_by_id = {occurrence.id: occurrence for occurrence in projected}
    if len(projected_by_id) != len(projected):
        raise ValueError("projected occurrences must have unique IDs")

    def mutation(current: RuntimeStoreData) -> RuntimeStoreData | None:
        protected_ids = _protected_occurrence_ids(current)
        retained: list[Occurrence] = []
        retained_ids: set[str] = set()
        for occurrence in current.occurrences:
            if _replaceable(
                occurrence, protected_ids, window_start, window_end
            ):
                replacement = projected_by_id.get(occurrence.id)
                if replacement is not None:
                    retained.append(replacement)
                    retained_ids.add(replacement.id)
                continue
            retained.append(occurrence)
            retained_ids.add(occurrence.id)

        combined = tuple(
            sorted(
                (
                    *retained,
                    *(
                        occurrence
                        for occurrence in projected
                        if occurrence.id not in retained_ids
                    ),
                ),
                key=_order,
            )
        )
        if combined == current.occurrences:
            return None
        return replace(
            current,
            revision=current.revision + 1,
            occurrences=combined,
            updated_at=max(current.updated_at, replanned_at),
        )

    return await repository.async_update_if_changed(mutation)


async def async_reconcile_horizon(
    repository: RuntimeRepository,
    config: IntegrationConfig,
    timezone: ZoneInfo,
    now: datetime,
) -> RuntimeStoreData:
    """Reconcile the active instant and the fixed forward planning horizon."""

    horizon_start = _utc(now, "now")
    return await async_replan_window(
        repository,
        config,
        horizon_start,
        horizon_start + PLANNING_HORIZON,
        timezone,
        horizon_start,
    )
