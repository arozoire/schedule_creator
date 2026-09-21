"""Clock-driven occurrence lifecycle boundaries without entity execution."""

from __future__ import annotations

import logging
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

from homeassistant.helpers.event import async_track_point_in_utc_time

from .models import Occurrence, OccurrenceState
from .storage import RuntimeRepository, RuntimeStoreData

if TYPE_CHECKING:
    from homeassistant.core import CALLBACK_TYPE, HomeAssistant

_LOGGER = logging.getLogger(__name__)

BOUNDARY_RETRY_INTERVAL = timedelta(minutes=1)


def _utc(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() != timedelta(0):
        raise ValueError("now must be UTC")
    return value.astimezone(UTC)


def _advance(occurrence: Occurrence, now: datetime) -> Occurrence:
    if occurrence.state is OccurrenceState.PENDING:
        if occurrence.end_utc <= now:
            return replace(occurrence, state=OccurrenceState.COMPLETED)
        if occurrence.start_utc <= now:
            return replace(occurrence, state=OccurrenceState.ACTIVE)
    elif (
        occurrence.state in {OccurrenceState.ACTIVE, OccurrenceState.SUSPENDED}
        and occurrence.end_utc <= now
    ):
        return replace(occurrence, state=OccurrenceState.COMPLETED)
    return occurrence


async def async_advance_occurrence_states(
    repository: RuntimeRepository, now: datetime
) -> RuntimeStoreData:
    """Persist all clock-due occurrence transitions in one atomic write."""

    wall_clock = _utc(now)

    def mutation(current: RuntimeStoreData) -> RuntimeStoreData | None:
        occurrences = tuple(_advance(item, wall_clock) for item in current.occurrences)
        if occurrences == current.occurrences:
            return None
        return replace(
            current,
            revision=current.revision + 1,
            occurrences=occurrences,
            updated_at=max(current.updated_at, wall_clock),
        )

    return await repository.async_update_if_changed(mutation)


def next_occurrence_boundary(
    runtime: RuntimeStoreData, now: datetime
) -> datetime | None:
    """Return the next lifecycle boundary strictly after the wall clock."""

    wall_clock = _utc(now)
    candidates: list[datetime] = []
    for occurrence in runtime.occurrences:
        if occurrence.state is OccurrenceState.PENDING:
            if occurrence.start_utc > wall_clock:
                candidates.append(occurrence.start_utc)
            elif occurrence.end_utc > wall_clock:
                candidates.append(occurrence.end_utc)
        elif occurrence.state in {
            OccurrenceState.ACTIVE,
            OccurrenceState.SUSPENDED,
        } and occurrence.end_utc > wall_clock:
            candidates.append(occurrence.end_utc)
    return min(candidates, default=None)


class OccurrenceBoundaryCoordinator:
    """Own exactly one callback for the nearest occurrence boundary."""

    def __init__(self, hass: HomeAssistant, runtime: RuntimeRepository) -> None:
        self._hass = hass
        self._runtime = runtime
        self._cancel: CALLBACK_TYPE | None = None
        self._active = False

    @property
    def active(self) -> bool:
        """Return whether the coordinator accepts callbacks."""

        return self._active

    def start(self, now: datetime) -> None:
        """Activate the coordinator and schedule its nearest boundary."""

        self._active = True
        self.reschedule(now)

    def reschedule(self, now: datetime) -> None:
        """Replace the owned callback after runtime state changes."""

        if not self._active:
            return
        if self._cancel is not None:
            self._cancel()
            self._cancel = None
        boundary = next_occurrence_boundary(self._runtime.data, now)
        if boundary is not None:
            self._cancel = async_track_point_in_utc_time(
                self._hass, self._async_boundary, boundary
            )

    def shutdown(self) -> None:
        """Cancel the callback and reject any callback already queued."""

        self._active = False
        if self._cancel is not None:
            self._cancel()
            self._cancel = None

    async def _async_boundary(self, now: datetime) -> None:
        """Advance due states and schedule the next boundary."""

        from . import lifecycle_lock

        async with lifecycle_lock(self._hass):
            if not self._active:
                return
            try:
                await async_advance_occurrence_states(self._runtime, now)
            except Exception:
                _LOGGER.exception("Unable to advance occurrence boundary")
                retry_at = _utc(now) + BOUNDARY_RETRY_INTERVAL
                if self._cancel is not None:
                    self._cancel()
                self._cancel = async_track_point_in_utc_time(
                    self._hass, self._async_boundary, retry_at
                )
                return
            self.reschedule(now)
