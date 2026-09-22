"""Initial state capture for active entity-lease winners."""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable, Mapping
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from hashlib import sha256
from typing import TYPE_CHECKING, Any, cast
from uuid import UUID, uuid5

import orjson
from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.helpers.json import json_bytes_sorted

from .models import FrozenJsonValue, LeaseState, Snapshot
from .storage import RuntimeRepository, RuntimeStoreData

if TYPE_CHECKING:
    from homeassistant.core import (
        CALLBACK_TYPE,
        Event,
        EventStateChangedData,
        HomeAssistant,
    )

_LOGGER = logging.getLogger(__name__)
_SNAPSHOT_NAMESPACE = UUID("e117b965-2439-4ad9-8d93-62a52430ae12")


def _utc(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() != timedelta(0):
        raise ValueError("now must be UTC")
    return value.astimezone(UTC)


def _snapshot_id(controller_id: str, entity_id: str) -> str:
    return str(uuid5(_SNAPSHOT_NAMESPACE, f"{controller_id}\0{entity_id}"))


def _snapshot(
    hass: HomeAssistant,
    controller_id: str,
    entity_id: str,
    captured_at: datetime,
) -> Snapshot | None:
    state = hass.states.get(entity_id)
    if state is None or state.state in {STATE_UNKNOWN, STATE_UNAVAILABLE}:
        return None
    try:
        encoded_attributes = json_bytes_sorted(state.attributes)
        attributes = cast(
            Mapping[str, FrozenJsonValue], orjson.loads(encoded_attributes)
        )
        checksum_payload: dict[str, Any] = {
            "state": state.state,
            "attributes": attributes,
        }
        checksum = f"sha256:{sha256(json_bytes_sorted(checksum_payload)).hexdigest()}"
        return Snapshot(
            id=_snapshot_id(controller_id, entity_id),
            occurrence_id=controller_id,
            entity_id=entity_id,
            domain=entity_id.split(".", 1)[0],
            state=state.state,
            attributes=attributes,
            checksum=checksum,
            captured_at=captured_at,
        )
    except (TypeError, ValueError):
        _LOGGER.warning("Unable to serialize initial state for %s", entity_id)
        return None


async def async_capture_initial_snapshots(
    hass: HomeAssistant, repository: RuntimeRepository, now: datetime
) -> RuntimeStoreData:
    """Atomically capture readable states for unsnapshotted active leases."""

    captured_at = _utc(now)
    current = repository.data
    existing = {
        (snapshot.occurrence_id, snapshot.entity_id)
        for snapshot in current.snapshots
    }
    captures = tuple(
        snapshot
        for lease in current.leases
        if lease.state is LeaseState.ACTIVE
        and (lease.controller_id, lease.entity_id) not in existing
        and (
            snapshot := _snapshot(
                hass,
                lease.controller_id,
                lease.entity_id,
                captured_at,
            )
        )
        is not None
    )
    if not captures:
        return current

    def mutation(runtime: RuntimeStoreData) -> RuntimeStoreData | None:
        active = {
            (lease.controller_id, lease.entity_id)
            for lease in runtime.leases
            if lease.state is LeaseState.ACTIVE
        }
        owned = {
            (snapshot.occurrence_id, snapshot.entity_id)
            for snapshot in runtime.snapshots
        }
        accepted = tuple(
            snapshot
            for snapshot in captures
            if (snapshot.occurrence_id, snapshot.entity_id) in active
            and (snapshot.occurrence_id, snapshot.entity_id) not in owned
        )
        if not accepted:
            return None

        by_controller: dict[str, list[Snapshot]] = {}
        for snapshot in accepted:
            by_controller.setdefault(snapshot.occurrence_id, []).append(snapshot)
        occurrences = tuple(
            replace(
                occurrence,
                snapshot_ids=(
                    *occurrence.snapshot_ids,
                    *(item.id for item in by_controller.get(occurrence.id, ())),
                ),
            )
            if occurrence.id in by_controller
            else occurrence
            for occurrence in runtime.occurrences
        )
        quick_timers = tuple(
            replace(
                timer,
                snapshot_id=by_controller[timer.controller_id][0].id,
            )
            if timer.controller_id in by_controller and timer.snapshot_id is None
            else timer
            for timer in runtime.quick_timers
        )
        return replace(
            runtime,
            revision=runtime.revision + 1,
            occurrences=occurrences,
            snapshots=(*runtime.snapshots, *accepted),
            quick_timers=quick_timers,
            updated_at=max(runtime.updated_at, captured_at),
        )

    return await repository.async_update_if_changed(mutation)


def _uncaptured_active_entities(runtime: RuntimeStoreData) -> frozenset[str]:
    existing = {
        (snapshot.occurrence_id, snapshot.entity_id)
        for snapshot in runtime.snapshots
    }
    return frozenset(
        lease.entity_id
        for lease in runtime.leases
        if lease.state is LeaseState.ACTIVE
        and (lease.controller_id, lease.entity_id) not in existing
    )


class SnapshotCoordinator:
    """Capture initial states and retry unreadable winners on state changes."""

    def __init__(
        self,
        hass: HomeAssistant,
        runtime: RuntimeRepository,
        on_snapshots_reconciled: Callable[[datetime], Awaitable[object]] | None = None,
    ) -> None:
        self._hass = hass
        self._runtime = runtime
        self._on_snapshots_reconciled = on_snapshots_reconciled
        self._cancel: CALLBACK_TYPE | None = None
        self._active = False

    @property
    def active(self) -> bool:
        """Return whether the coordinator accepts callbacks."""

        return self._active

    async def async_refresh(self, now: datetime) -> RuntimeStoreData:
        """Capture newly eligible initial states and replace retry tracking."""

        result = await async_capture_initial_snapshots(
            self._hass, self._runtime, now
        )
        if self._on_snapshots_reconciled is not None:
            result = cast(
                RuntimeStoreData, await self._on_snapshots_reconciled(now)
            )
        self.reschedule()
        return result

    def start(self) -> None:
        """Activate retry tracking after initial lifecycle reconciliation."""

        self._active = True
        self.reschedule()

    def reschedule(self) -> None:
        """Track only active lease entities still missing a snapshot."""

        if not self._active:
            return
        if self._cancel is not None:
            self._cancel()
            self._cancel = None
        entity_ids = _uncaptured_active_entities(self._runtime.data)
        if entity_ids:
            self._cancel = async_track_state_change_event(
                self._hass, entity_ids, self._async_state_changed
            )

    def shutdown(self) -> None:
        """Cancel state tracking before the runtime Store is released."""

        self._active = False
        if self._cancel is not None:
            self._cancel()
            self._cancel = None

    async def _async_state_changed(
        self, event: Event[EventStateChangedData]
    ) -> None:
        """Retry capture after an unavailable winning entity changes."""

        from . import lifecycle_lock

        async with lifecycle_lock(self._hass):
            if not self._active:
                return
            try:
                await self.async_refresh(event.time_fired.astimezone(UTC))
            except Exception:
                _LOGGER.exception("Unable to capture initial entity snapshot")
                self.reschedule()
