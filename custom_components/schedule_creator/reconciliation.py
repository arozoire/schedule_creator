"""Idempotent persistence boundary for projected schedule occurrences."""

from __future__ import annotations

from dataclasses import replace
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from .models import IntegrationConfig, Occurrence, OccurrenceState, Schedule
from .planner import plan_occurrences
from .snapshots import _snapshot_id
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


_RUNNING_STATES = {
    OccurrenceState.PENDING,
    OccurrenceState.ACTIVE,
    OccurrenceState.SUSPENDED,
}


def _without_ids(value: object) -> object:
    if isinstance(value, dict):
        return {
            key: _without_ids(item)
            for key, item in value.items()
            if key not in {"id", "schema_version"}
        }
    if isinstance(value, list):
        return [_without_ids(item) for item in value]
    return value


def _behaviour(schedule: Schedule) -> object:
    """What a running occurrence does; names and notifications do not count."""

    payload = schedule.to_dict()
    return _without_ids(
        {
            key: payload[key]
            for key in ("target_entity_ids", "start_action", "end_action", "condition")
        }
    )


def _running_at(occurrence: Occurrence, instant: datetime) -> bool:
    return (
        occurrence.state in _RUNNING_STATES
        and occurrence.start_utc <= instant < occurrence.end_utc
    )


def _successor(
    running: Occurrence, projected: tuple[Occurrence, ...], instant: datetime
) -> Occurrence | None:
    """The projected occurrence of the same schedule covering the instant."""

    candidates = [
        item
        for item in projected
        if item.frozen_schedule.id == running.frozen_schedule.id
        and item.start_utc <= instant < item.end_utc
    ]
    same_slot = [item for item in candidates if item.slot_id == running.slot_id]
    return (same_slot or candidates or [None])[0]


def _unique_id(candidate: str, taken: set[str], revision: int) -> str:
    if candidate not in taken:
        return candidate
    base = f"{candidate}#r{revision}"
    identifier, counter = base, 1
    while identifier in taken:
        counter += 1
        identifier = f"{base}.{counter}"
    return identifier


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
        # A slot in progress follows the configuration: it is cancelled when its
        # schedule or profile no longer runs, and replaced when what it does
        # changed. Cancelled slots run their end action like completed ones.
        plan = list(projected)
        cancelled: set[str] = set()
        kept: set[str] = set()
        added: list[Occurrence] = []
        snapshots = list(current.snapshots)
        taken = {occurrence.id for occurrence in current.occurrences}
        for occurrence in current.occurrences:
            if not _running_at(occurrence, window_start):
                continue
            successor = _successor(occurrence, tuple(plan), window_start)
            if successor is not None:
                plan.remove(successor)
                plan = [item for item in plan if item.id != occurrence.id]
                if (
                    _behaviour(successor.frozen_schedule)
                    == _behaviour(occurrence.frozen_schedule)
                    and successor.start_utc == occurrence.start_utc
                    and successor.end_utc == occurrence.end_utc
                ):
                    kept.add(occurrence.id)
                    continue
            cancelled.add(occurrence.id)
            if successor is None:
                continue
            identifier = _unique_id(
                successor.id, taken, successor.frozen_schedule.revision
            )
            taken.add(identifier)
            # Keep the state from before the slot for restores and fallbacks.
            copies = tuple(
                replace(
                    snapshot,
                    id=_snapshot_id(identifier, snapshot.entity_id),
                    occurrence_id=identifier,
                )
                for snapshot in current.snapshots
                if snapshot.occurrence_id == occurrence.id
                and snapshot.entity_id
                in successor.frozen_schedule.target_entity_ids
            )
            snapshots.extend(copies)
            added.append(
                replace(
                    successor,
                    id=identifier,
                    condition_branch=occurrence.condition_branch,
                    snapshot_ids=tuple(item.id for item in copies),
                )
            )
        projected_by_id = {item.id: item for item in plan}
        for occurrence in current.occurrences:
            if occurrence.id in cancelled:
                retained.append(
                    replace(occurrence, state=OccurrenceState.CANCELLED)
                )
                retained_ids.add(occurrence.id)
                continue
            if occurrence.id not in kept and _replaceable(
                occurrence, protected_ids, window_start, window_end
            ):
                replacement = projected_by_id.get(occurrence.id)
                if replacement is not None:
                    replacement = replace(
                        replacement,
                        condition_branch=occurrence.condition_branch,
                    )
                    retained.append(replacement)
                    retained_ids.add(replacement.id)
                continue
            retained.append(occurrence)
            retained_ids.add(occurrence.id)

        combined = tuple(
            sorted(
                (
                    *retained,
                    *added,
                    *(
                        occurrence
                        for occurrence in plan
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
            snapshots=tuple(snapshots),
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
