"""Atomic reconciliation of persisted arbitration leases."""

from __future__ import annotations

from dataclasses import replace
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid5

from .arbitration import ArbitrationCandidate, build_arbitration_plan
from .models import EntityLease, LeaseState
from .storage import RuntimeRepository, RuntimeStoreData

_LEASE_NAMESPACE = UUID("86b2bb93-3fea-4ca7-86d7-e80d989456cb")


def _utc(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() != timedelta(0):
        raise ValueError("now must be UTC")
    return value.astimezone(UTC)


def _lease_id(candidate: ArbitrationCandidate) -> str:
    return str(
        uuid5(
            _LEASE_NAMESPACE,
            f"{candidate.entity_id}\0{candidate.controller_id}",
        )
    )


def _desired_candidates(
    runtime: RuntimeStoreData, now: datetime
) -> tuple[tuple[ArbitrationCandidate, LeaseState], ...]:
    desired: list[tuple[ArbitrationCandidate, LeaseState]] = []
    for decision in build_arbitration_plan(runtime, now):
        desired.append((decision.winner, LeaseState.ACTIVE))
        desired.extend(
            (candidate, LeaseState.SUSPENDED)
            for candidate in decision.losers
        )
    return tuple(desired)


def _unchanged(
    lease: EntityLease,
    candidate: ArbitrationCandidate,
    state: LeaseState,
) -> bool:
    return (
        lease.entity_id == candidate.entity_id
        and lease.controller_id == candidate.controller_id
        and lease.controller_type is candidate.controller_type
        and lease.occurrence_id == candidate.occurrence_id
        and lease.effective_start == candidate.effective_start
        and lease.comparison_key == candidate.comparison_key
        and lease.state is state
    )


async def async_reconcile_entity_leases(
    repository: RuntimeRepository, now: datetime
) -> RuntimeStoreData:
    """Persist one idempotent lease set derived from the arbitration plan."""

    reconciled_at = _utc(now)

    def mutation(current: RuntimeStoreData) -> RuntimeStoreData | None:
        existing = {
            (lease.entity_id, lease.controller_id): lease
            for lease in current.leases
        }
        reconciled: list[EntityLease] = []
        for candidate, state in _desired_candidates(current, reconciled_at):
            identity = candidate.entity_id, candidate.controller_id
            previous = existing.get(identity)
            if previous is not None and _unchanged(previous, candidate, state):
                reconciled.append(previous)
                continue
            reconciled.append(
                EntityLease(
                    id=_lease_id(candidate),
                    entity_id=candidate.entity_id,
                    controller_id=candidate.controller_id,
                    controller_type=candidate.controller_type,
                    occurrence_id=candidate.occurrence_id,
                    effective_start=candidate.effective_start,
                    comparison_key=candidate.comparison_key,
                    acquired_at=reconciled_at,
                    generation=1 if previous is None else previous.generation + 1,
                    state=state,
                )
            )
        leases = tuple(
            sorted(
                reconciled,
                key=lambda lease: (
                    lease.entity_id,
                    lease.comparison_key,
                    lease.controller_id,
                ),
                reverse=True,
            )
        )
        if leases == current.leases:
            return None
        return replace(
            current,
            revision=current.revision + 1,
            leases=leases,
            updated_at=max(current.updated_at, reconciled_at),
        )

    return await repository.async_update_if_changed(mutation)
