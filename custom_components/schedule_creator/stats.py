"""Per-schedule activity counters shown in the schedule editor.

Counted once per occurrence: an *activation* is a slot whose start action
succeeded; a *muted* slot is one whose condition was false while it ran. The
counters live in their own small Store because finished runtime records are
pruned after a week. They are informative only and never drive commands.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Any

from homeassistant.core import Event, callback
from homeassistant.helpers.storage import Store

from .const import DOMAIN, EVENT_RUNTIME_UPDATED
from .models import (
    ConditionBranch,
    OccurrenceState,
    OperationKind,
    OperationState,
)

if TYPE_CHECKING:
    from homeassistant.core import CALLBACK_TYPE, HomeAssistant

    from .storage import RuntimeRepository, RuntimeStoreData

STATS_STORE_KEY = f"{DOMAIN}.stats"
STATS_SAVE_DELAY = 30.0
# Longer than runtime retention, so a pruned occurrence is never counted twice.
_SEEN_RETENTION = timedelta(days=10)
_RAN_STATES = {
    OccurrenceState.ACTIVE,
    OccurrenceState.SUSPENDED,
    OccurrenceState.COMPLETED,
    OccurrenceState.CANCELLED,
}


def empty_stats() -> dict[str, Any]:
    """A Store payload without any counter."""

    return {"schedules": {}, "seen": {"activated": {}, "muted": {}}}


def _entry(data: dict[str, Any], schedule_id: str) -> dict[str, Any]:
    schedules: dict[str, Any] = data["schedules"]
    return schedules.setdefault(
        schedule_id,
        {"activations": 0, "muted": 0, "last_activation": None, "last_muted": None},
    )


def update_stats(
    data: dict[str, Any], runtime: RuntimeStoreData, now: datetime
) -> bool:
    """Count new activations and muted slots in place; return whether it changed."""

    changed = False
    activated: dict[str, str] = data["seen"]["activated"]
    muted: dict[str, str] = data["seen"]["muted"]
    occurrences = {item.id: item for item in runtime.occurrences}
    for operation in runtime.pending_operations:
        occurrence = occurrences.get(operation.occurrence_id or "")
        if (
            occurrence is None
            or operation.kind is not OperationKind.TARGET_ACTION
            or operation.state is not OperationState.SUCCEEDED
            or "lease_id" not in operation.payload
            or occurrence.id in activated
        ):
            continue
        at = operation.updated_at.isoformat()
        activated[occurrence.id] = at
        entry = _entry(data, occurrence.frozen_schedule.id)
        entry["activations"] += 1
        if entry["last_activation"] is None or entry["last_activation"] < at:
            entry["last_activation"] = at
        changed = True
    for occurrence in runtime.occurrences:
        if (
            occurrence.frozen_schedule.condition is None
            or occurrence.condition_branch is not ConditionBranch.FALSE
            or occurrence.state not in _RAN_STATES
            or occurrence.start_utc > now
            or occurrence.id in muted
        ):
            continue
        at = now.isoformat()
        muted[occurrence.id] = at
        entry = _entry(data, occurrence.frozen_schedule.id)
        entry["muted"] += 1
        entry["last_muted"] = at
        changed = True
    cutoff = (now - _SEEN_RETENTION).isoformat()
    for seen in (activated, muted):
        for key in [key for key, at in seen.items() if at < cutoff]:
            del seen[key]
            changed = True
    return changed


def public_stats(data: dict[str, Any]) -> dict[str, Any]:
    """Counters by schedule ID for get_state."""

    return dict(data["schedules"])


class StatsCoordinator:
    """Follow committed runtime changes and keep the counters saved."""

    def __init__(self, hass: HomeAssistant, runtime: RuntimeRepository) -> None:
        self._hass = hass
        self._runtime = runtime
        self._store: Store[dict[str, Any]] = Store(hass, 1, STATS_STORE_KEY)
        self.data = empty_stats()
        self._unsubscribe: CALLBACK_TYPE | None = None

    async def async_load(self) -> None:
        """Read saved counters; a damaged file starts again from zero."""

        stored = await self._store.async_load()
        if (
            isinstance(stored, dict)
            and isinstance(stored.get("schedules"), dict)
            and isinstance(stored.get("seen"), dict)
            and isinstance(stored["seen"].get("activated"), dict)
            and isinstance(stored["seen"].get("muted"), dict)
        ):
            self.data = stored

    @callback
    def start(self) -> None:
        """Count what is already there, then follow runtime changes."""

        self._unsubscribe = self._hass.bus.async_listen(
            EVENT_RUNTIME_UPDATED, self._async_changed
        )
        self.refresh(datetime.now(UTC))

    @callback
    def _async_changed(self, _event: Event) -> None:
        self.refresh(datetime.now(UTC))

    @callback
    def refresh(self, now: datetime) -> None:
        """Update counters from the committed runtime and schedule a save."""

        if update_stats(self.data, self._runtime.data, now):
            self._store.async_delay_save(lambda: self.data, STATS_SAVE_DELAY)

    async def async_shutdown(self) -> None:
        """Stop listening and write pending counters."""

        if self._unsubscribe is not None:
            self._unsubscribe()
            self._unsubscribe = None
        await self._store.async_save(self.data)


async def async_clear_stats(hass: HomeAssistant) -> None:
    """Forget every counter (used by RESET)."""

    await Store[dict[str, Any]](hass, 1, STATS_STORE_KEY).async_remove()
