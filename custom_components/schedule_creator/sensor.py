"""Sensors: start of the next slot, and one weekly plan per scheduled entity."""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import TYPE_CHECKING, Any
from zoneinfo import ZoneInfo

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.const import EntityCategory
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.event import (
    async_track_state_change_event,
    async_track_time_change,
)

from .const import DOMAIN, EVENT_CONFIG_UPDATED, EVENT_RUNTIME_UPDATED
from .models import Occurrence, OccurrenceState
from .plan import (
    PLAN_ATTRIBUTES,
    compute_plan,
    plan_entity_ids,
    project_weeks,
    week_start,
)
from .reconciliation import sun_resolver
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


_PLAN_NAMES = {"it": "Piano", "en": "Plan", "fr": "Plan", "de": "Plan", "es": "Plan"}


class PlanSensor(SensorEntity):
    """Weekly plan of one scheduled entity, as plain strings for displays."""

    _attr_has_entity_name = True
    _attr_should_poll = False
    _attr_entity_category = EntityCategory.DIAGNOSTIC
    _attr_entity_registry_enabled_default = True
    _attr_icon = "mdi:calendar-week"
    # The plan is rebuilt from the configuration: no need to fill the history.
    _unrecorded_attributes = frozenset(PLAN_ATTRIBUTES)

    def __init__(self, manager: _PlanManager, target: str) -> None:
        self._manager = manager
        self._target = target
        domain, object_id = target.split(".", 1)
        # Stable across languages: displays refer to it by entity_id.
        self.entity_id = f"sensor.schedule_creator_plan_{domain}_{object_id}"
        self._attr_unique_id = f"{manager.entry.entry_id}_plan_{target}"
        self._attr_device_info = device_info(manager.entry.entry_id)

    @property
    def name(self) -> str:
        language = str(self.hass.config.language or "en")[:2].lower()
        state = self.hass.states.get(self._target)
        target = (
            state.attributes.get("friendly_name", self._target)
            if state is not None
            else self._target
        )
        return f"{_PLAN_NAMES.get(language, _PLAN_NAMES['en'])} {target}"

    @callback
    def refresh(self) -> None:
        """Recompute the plan and publish it."""

        result = self._manager.plan(self._target)
        if result is None:
            return
        self._attr_native_value, self._attr_extra_state_attributes = result
        if self.hass is not None:
            self.async_write_ha_state()

    @callback
    def _target_changed(self, _event: Event) -> None:
        self.refresh()

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(
            async_track_state_change_event(
                self.hass, [self._target], self._target_changed
            )
        )
        self.refresh()


class _PlanManager:
    """One plan sensor per scheduled entity, following the configuration."""

    def __init__(
        self,
        hass: HomeAssistant,
        entry: ScheduleCreatorConfigEntry,
        add_entities: AddEntitiesCallback,
    ) -> None:
        self.hass = hass
        self.entry = entry
        self._add = add_entities
        self._entities: dict[str, PlanSensor] = {}
        self._cache: tuple[tuple[int, date, str], tuple[Occurrence, ...]] | None = None

    def plan(self, target: str) -> tuple[str, dict[str, str]] | None:
        runtime = getattr(self.entry, "runtime_data", None)
        config = None if runtime is None else runtime.storage.config.data
        if runtime is None or config is None:
            return None
        zone = ZoneInfo(self.hass.config.time_zone)
        now = datetime.now(UTC)
        monday = week_start(now, zone)
        # One projection per configuration revision and week for all sensors.
        key = (config.revision, monday, self.hass.config.time_zone)
        if self._cache is None or self._cache[0] != key:
            self._cache = (
                key,
                project_weeks(config, monday, zone, sun_resolver(self.hass)),
            )
        data = runtime.storage.runtime.data
        state = self.hass.states.get(target)
        return compute_plan(
            config,
            self._cache[1],
            data.occurrences,
            data.leases,
            target,
            now,
            zone,
            None if state is None else state.state,
            None if state is None else dict(state.attributes),
        )

    @callback
    def refresh(self, _event: Event | Any = None) -> None:
        runtime = getattr(self.entry, "runtime_data", None)
        config = None if runtime is None else runtime.storage.config.data
        if config is None:
            return
        wanted = {
            target: self._entities.get(target) or PlanSensor(self, target)
            for target in plan_entity_ids(config)
        }
        registry = er.async_get(self.hass)
        for target in set(self._entities) - set(wanted):
            entity_id = registry.async_get_entity_id(
                "sensor", DOMAIN, f"{self.entry.entry_id}_plan_{target}"
            )
            if entity_id is not None:
                registry.async_remove(entity_id)
        new = [entity for key, entity in wanted.items() if key not in self._entities]
        self._entities = wanted
        if new:
            self._add(new)
        for entity in wanted.values():
            if entity not in new and entity.hass is not None:
                entity.refresh()


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ScheduleCreatorConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Add the next-slot sensor and the plan sensors."""

    async_add_entities([NextSlotSensor(entry)])
    manager = _PlanManager(hass, entry, async_add_entities)
    manager.refresh()
    for event_type in (EVENT_CONFIG_UPDATED, EVENT_RUNTIME_UPDATED):
        entry.async_on_unload(hass.bus.async_listen(event_type, manager.refresh))
    # A new day, and on Monday a new week.
    entry.async_on_unload(
        async_track_time_change(hass, manager.refresh, hour=0, minute=0, second=5)
    )
