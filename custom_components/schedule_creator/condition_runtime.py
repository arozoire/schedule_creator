"""Home Assistant state adapter and persisted condition reconciliation."""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from dataclasses import replace
from datetime import UTC, datetime
from typing import TYPE_CHECKING, cast

from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.helpers.event import (
    async_track_point_in_utc_time,
    async_track_state_change_event,
)

from .conditions import ConditionEvaluation, evaluate_condition
from .leases import async_reconcile_entity_leases
from .models import ConditionBranch, ConditionNode, OccurrenceState
from .storage import RuntimeRepository, RuntimeStoreData

if TYPE_CHECKING:
    from homeassistant.core import (
        CALLBACK_TYPE,
        Event,
        EventStateChangedData,
        HomeAssistant,
    )

_LOGGER = logging.getLogger(__name__)
_EVALUATED_STATES = {
    OccurrenceState.PENDING,
    OccurrenceState.ACTIVE,
    OccurrenceState.SUSPENDED,
}


def condition_entity_ids(condition: ConditionNode) -> frozenset[str]:
    """Return every entity referenced by a condition tree."""

    entity_ids = {condition.entity_id} if condition.entity_id is not None else set()
    for child in condition.children:
        entity_ids.update(condition_entity_ids(child))
    return frozenset(entity_ids)


def _node_ids(condition: ConditionNode) -> tuple[str, ...]:
    return (
        condition.id,
        *(item for child in condition.children for item in _node_ids(child)),
    )


def _state_values(
    hass: HomeAssistant, condition: ConditionNode
) -> dict[str, str | None]:
    values: dict[str, str | None] = {}
    for entity_id in condition_entity_ids(condition):
        state = hass.states.get(entity_id)
        values[entity_id] = (
            None
            if state is None or state.state in {STATE_UNKNOWN, STATE_UNAVAILABLE}
            else state.state
        )
    return values


async def async_reconcile_condition_branches(
    hass: HomeAssistant,
    repository: RuntimeRepository,
    now: datetime,
    previous: dict[str, ConditionEvaluation],
) -> tuple[RuntimeStoreData, dict[str, ConditionEvaluation]]:
    """Read required HA states and atomically persist changed branches."""

    evaluations: dict[str, ConditionEvaluation] = {}
    branches: dict[str, ConditionBranch] = {}
    # Occurrences of one condition share its history: a slot replaced after an
    # edit keeps the running durations instead of starting again from zero.
    by_nodes = {
        frozenset(node.node_id for node in evaluation.nodes): evaluation
        for evaluation in previous.values()
    }
    for occurrence in repository.data.occurrences:
        condition = occurrence.frozen_schedule.condition
        if condition is None or occurrence.state not in _EVALUATED_STATES:
            continue
        evaluation = evaluate_condition(
            condition,
            _state_values(hass, condition),
            now,
            previous.get(occurrence.id)
            or by_nodes.get(frozenset(_node_ids(condition))),
        )
        evaluations[occurrence.id] = evaluation
        branches[occurrence.id] = (
            ConditionBranch.TRUE if evaluation.result else ConditionBranch.FALSE
        )

    def mutation(current: RuntimeStoreData) -> RuntimeStoreData | None:
        occurrences = tuple(
            replace(item, condition_branch=branches[item.id])
            if item.id in branches and item.condition_branch is not branches[item.id]
            else item
            for item in current.occurrences
        )
        if occurrences == current.occurrences:
            return None
        return replace(
            current,
            revision=current.revision + 1,
            occurrences=occurrences,
            updated_at=max(current.updated_at, now),
        )

    result = await repository.async_update_if_changed(mutation)
    return result, evaluations


def _next_duration_deadline(
    evaluations: dict[str, ConditionEvaluation], now: datetime
) -> datetime | None:
    candidates = (
        node.ready_at
        for evaluation in evaluations.values()
        for node in evaluation.nodes
        if node.ready_at is not None
    )
    future = tuple(candidate for candidate in candidates if candidate > now)
    return min(future, default=None)


class ConditionCoordinator:
    """Own condition state listeners, duration callbacks and evaluation memory."""

    def __init__(
        self,
        hass: HomeAssistant,
        runtime: RuntimeRepository,
        on_leases_reconciled: Callable[[datetime], Awaitable[object]] | None = None,
    ) -> None:
        self._hass = hass
        self._runtime = runtime
        self._on_leases_reconciled = on_leases_reconciled
        self._evaluations: dict[str, ConditionEvaluation] = {}
        self._cancel_states: CALLBACK_TYPE | None = None
        self._cancel_deadline: CALLBACK_TYPE | None = None
        self._active = False

    @property
    def active(self) -> bool:
        """Return whether the coordinator accepts callbacks."""

        return self._active

    async def async_refresh(self, now: datetime) -> RuntimeStoreData:
        """Evaluate branches, persist changes and then reconcile leases."""

        result, evaluations = await async_reconcile_condition_branches(
            self._hass, self._runtime, now, self._evaluations
        )
        self._evaluations = evaluations
        result = await async_reconcile_entity_leases(self._runtime, now)
        if self._on_leases_reconciled is not None:
            result = cast(
                RuntimeStoreData, await self._on_leases_reconciled(now)
            )
        self.reschedule(now)
        return result

    def start(self, now: datetime) -> None:
        """Activate state and duration tracking after initial reconciliation."""

        self._active = True
        self.reschedule(now)

    def reschedule(self, now: datetime) -> None:
        """Replace owned listeners from the current runtime and memory."""

        if not self._active:
            return
        if self._cancel_states is not None:
            self._cancel_states()
            self._cancel_states = None
        if self._cancel_deadline is not None:
            self._cancel_deadline()
            self._cancel_deadline = None

        entity_ids: set[str] = set()
        for occurrence in self._runtime.data.occurrences:
            condition = occurrence.frozen_schedule.condition
            if condition is not None and occurrence.state in _EVALUATED_STATES:
                entity_ids.update(condition_entity_ids(condition))
        if entity_ids:
            self._cancel_states = async_track_state_change_event(
                self._hass, entity_ids, self._async_state_changed
            )
        deadline = _next_duration_deadline(self._evaluations, now)
        if deadline is not None:
            self._cancel_deadline = async_track_point_in_utc_time(
                self._hass, self._async_deadline, deadline
            )

    def shutdown(self) -> None:
        """Cancel every callback and discard non-persistent evaluation memory."""

        self._active = False
        if self._cancel_states is not None:
            self._cancel_states()
            self._cancel_states = None
        if self._cancel_deadline is not None:
            self._cancel_deadline()
            self._cancel_deadline = None
        self._evaluations.clear()

    async def _async_state_changed(
        self, event: Event[EventStateChangedData]
    ) -> None:
        """Reconcile after one referenced entity changes."""

        await self._async_reconcile(event.time_fired)

    async def _async_deadline(self, now: datetime) -> None:
        """Reconcile when a continuously matching node reaches its duration."""

        await self._async_reconcile(now)

    async def _async_reconcile(self, now: datetime) -> None:
        from . import lifecycle_lock

        async with lifecycle_lock(self._hass):
            if not self._active:
                return
            try:
                await self.async_refresh(now.astimezone(UTC))
            except Exception:
                _LOGGER.exception("Unable to reconcile schedule conditions")
                self.reschedule(now.astimezone(UTC))
