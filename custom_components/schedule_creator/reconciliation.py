"""Idempotent persistence boundary for projected schedule occurrences."""

from __future__ import annotations

from dataclasses import replace
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from .models import IntegrationConfig, Occurrence
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


async def async_reconcile_horizon(
    repository: RuntimeRepository,
    config: IntegrationConfig,
    timezone: ZoneInfo,
    now: datetime,
) -> RuntimeStoreData:
    """Reconcile the active instant and the fixed forward planning horizon."""

    horizon_start = _utc(now, "now")
    return await async_reconcile_window(
        repository,
        config,
        horizon_start,
        horizon_start + PLANNING_HORIZON,
        timezone,
        horizon_start,
    )
