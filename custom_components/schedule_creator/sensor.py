"""Timestamp sensor with the start of the next slot of an active profile."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.const import EntityCategory
from homeassistant.core import Event, HomeAssistant, callback

from .const import EVENT_CONFIG_UPDATED, EVENT_RUNTIME_UPDATED
from .models import Occurrence, OccurrenceState
from .switch import device_info

if TYPE_CHECKING:
    from homeassistant.helpers.entity_platform import AddEntitiesCallback

    from . import ScheduleCreatorConfigEntry

_NAMES = {
    "it": "Prossima fascia",
    "en": "Next slot",
    "fr": "Prochaine plage",
    "de": "Nächstes Zeitfenster",
    "es": "Próxima franja",
}


class NextSlotSensor(SensorEntity):
    """When the next slot starts, with its schedule and devices as attributes."""

    _attr_has_entity_name = True
    _attr_should_poll = False
    _attr_device_class = SensorDeviceClass.TIMESTAMP
    _attr_entity_category = EntityCategory.DIAGNOSTIC
    _attr_icon = "mdi:calendar-arrow-right"

    def __init__(self, entry: ScheduleCreatorConfigEntry) -> None:
        self._entry = entry
        self._attr_unique_id = f"{entry.entry_id}_next_slot"
        self._attr_device_info = device_info(entry.entry_id)

    @property
    def name(self) -> str:
        language = str(self.hass.config.language or "en")[:2].lower()
        return _NAMES.get(language, _NAMES["en"])

    def _next(self) -> Occurrence | None:
        runtime = getattr(self._entry, "runtime_data", None)
        if runtime is None:
            return None
        now = datetime.now(UTC)
        upcoming = [
            item
            for item in runtime.storage.runtime.data.occurrences
            if item.state is OccurrenceState.PENDING and item.start_utc > now
        ]
        return min(upcoming, key=lambda item: item.start_utc, default=None)

    @property
    def native_value(self) -> datetime | None:
        item = self._next()
        return None if item is None else item.start_utc

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        item = self._next()
        if item is None:
            return {}
        return {
            "schedule": item.frozen_schedule.name,
            "schedule_id": item.frozen_schedule.id,
            "entities": list(item.frozen_schedule.target_entity_ids),
            "end": item.end_utc.isoformat(),
        }

    @callback
    def _changed(self, _event: Event) -> None:
        self.async_write_ha_state()

    async def async_added_to_hass(self) -> None:
        for event_type in (EVENT_CONFIG_UPDATED, EVENT_RUNTIME_UPDATED):
            self.async_on_remove(self.hass.bus.async_listen(event_type, self._changed))


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ScheduleCreatorConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Add the next-slot sensor."""

    async_add_entities([NextSlotSensor(entry)])
