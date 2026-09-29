"""Temperature limits of each climate entity, remembered per HVAC mode.

Some devices change ``min_temp``/``max_temp`` with the mode (a heat pump may
accept 25–55 °C for heating water and 5–22 °C for cooling) but Home Assistant
only shows the limits of the current mode. The editor needs the limits of the
mode being scheduled, so they are learned whenever the device is in that mode.
They are informative only and never drive commands.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from homeassistant.const import EVENT_STATE_CHANGED
from homeassistant.core import Event, EventStateChangedData, State, callback
from homeassistant.helpers.storage import Store

from .const import DOMAIN

if TYPE_CHECKING:
    from homeassistant.core import CALLBACK_TYPE, HomeAssistant

CLIMATE_LIMITS_STORE_KEY = f"{DOMAIN}.climate_limits"
CLIMATE_LIMITS_SAVE_DELAY = 30.0
_NO_LIMITS = {"off", "unavailable", "unknown"}


def _number(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, int | float):
        return None
    return float(value)


def learn_limits(data: dict[str, dict[str, dict[str, float]]], state: State) -> bool:
    """Remember the limits ``state`` shows for its mode; return whether new."""

    if not state.entity_id.startswith("climate.") or state.state in _NO_LIMITS:
        return False
    low = _number(state.attributes.get("min_temp"))
    high = _number(state.attributes.get("max_temp"))
    if low is None or high is None or low > high:
        return False
    limits = {"min": low, "max": high}
    step = _number(state.attributes.get("target_temp_step"))
    if step is not None and step > 0:
        limits["step"] = step
    modes = data.setdefault(state.entity_id, {})
    if modes.get(state.state) == limits:
        return False
    modes[state.state] = limits
    return True


class ClimateLimitsCoordinator:
    """Learn limits from climate state changes and keep them saved."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass
        self._store: Store[dict[str, Any]] = Store(hass, 1, CLIMATE_LIMITS_STORE_KEY)
        self.data: dict[str, dict[str, dict[str, float]]] = {}
        self._unsubscribe: CALLBACK_TYPE | None = None

    async def async_load(self) -> None:
        """Read what was learned; a damaged file starts again empty."""

        stored = await self._store.async_load()
        if isinstance(stored, dict) and all(
            isinstance(modes, dict) for modes in stored.values()
        ):
            self.data = stored

    @callback
    def start(self) -> None:
        """Learn from the current states, then follow climate changes."""

        changed = False
        for state in self._hass.states.async_all("climate"):
            changed = learn_limits(self.data, state) or changed
        if changed:
            self._save()
        self._unsubscribe = self._hass.bus.async_listen(
            EVENT_STATE_CHANGED, self._changed, event_filter=self._is_climate
        )

    @staticmethod
    @callback
    def _is_climate(data: EventStateChangedData) -> bool:
        return data["entity_id"].startswith("climate.")

    @callback
    def _changed(self, event: Event[EventStateChangedData]) -> None:
        state = event.data["new_state"]
        if state is not None and learn_limits(self.data, state):
            self._save()

    def _save(self) -> None:
        self._store.async_delay_save(lambda: self.data, CLIMATE_LIMITS_SAVE_DELAY)

    async def async_shutdown(self) -> None:
        """Stop listening and write what was learned."""

        if self._unsubscribe is not None:
            self._unsubscribe()
            self._unsubscribe = None
        await self._store.async_save(self.data)
