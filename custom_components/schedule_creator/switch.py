"""One switch per profile (active) and per schedule (enabled).

They make profiles and schedules usable from automations, dashboards and
voice assistants. Entities follow the configuration: new profiles and
schedules appear, deleted ones are removed from the entity registry.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.const import EntityCategory
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo

from .const import DOMAIN, EVENT_CONFIG_UPDATED, EVENT_RUNTIME_UPDATED
from .control import async_set_profile, async_set_schedule
from .models import IntegrationConfig, OccurrenceState

if TYPE_CHECKING:
    from homeassistant.helpers.entity_platform import AddEntitiesCallback

    from . import ScheduleCreatorConfigEntry

# Entity name prefixes follow the Home Assistant language.
_LABELS = {
    "it": ("Profilo", "Schedule"),
    "en": ("Profile", "Schedule"),
    "fr": ("Profil", "Planning"),
    "de": ("Profil", "Zeitplan"),
    "es": ("Perfil", "Programación"),
}


def labels(hass: HomeAssistant) -> tuple[str, str]:
    """(profile, schedule) prefixes for the configured language."""

    return _LABELS.get(str(hass.config.language or "en")[:2].lower(), _LABELS["en"])


def device_info(entry_id: str) -> DeviceInfo:
    """All Schedule Creator entities belong to one service device."""

    return DeviceInfo(
        identifiers={(DOMAIN, entry_id)},
        name="Schedule Creator",
        manufacturer="Schedule Creator",
        entry_type=DeviceEntryType.SERVICE,
    )


class _ConfigSwitch(SwitchEntity):
    """Switch backed by one configuration record."""

    _attr_has_entity_name = True
    _attr_should_poll = False
    # Settings, not devices: kept out of automatic dashboards and favourites.
    _attr_entity_category = EntityCategory.CONFIG

    def __init__(
        self, entry: ScheduleCreatorConfigEntry, kind: str, record_id: str
    ) -> None:
        self._entry = entry
        self._record_id = record_id
        self._attr_unique_id = f"{entry.entry_id}_{kind}_{record_id}"
        self._attr_device_info = device_info(entry.entry_id)

    @property
    def _config(self) -> IntegrationConfig | None:
        runtime = getattr(self._entry, "runtime_data", None)
        return None if runtime is None else runtime.storage.config.data

    @property
    def available(self) -> bool:
        return self._record() is not None

    def _record(self) -> Any:
        raise NotImplementedError


class ProfileSwitch(_ConfigSwitch):
    """On while the profile is active; turning on an exclusive profile
    switches the other exclusive profiles off."""

    _attr_icon = "mdi:account-switch"

    def __init__(self, entry: ScheduleCreatorConfigEntry, profile_id: str) -> None:
        super().__init__(entry, "profile", profile_id)

    def _record(self) -> Any:
        config = self._config
        return next(
            (
                p
                for p in (config.profiles if config else ())
                if p.id == self._record_id
            ),
            None,
        )

    @property
    def name(self) -> str:
        profile = self._record()
        return f"{labels(self.hass)[0]} {profile.name if profile else ''}".strip()

    @property
    def is_on(self) -> bool:
        profile = self._record()
        return bool(profile and profile.active)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        profile = self._record()
        if profile is None:
            return {}
        return {"exclusive": profile.profile_type == "exclusive"}

    async def async_turn_on(self, **kwargs: Any) -> None:
        await async_set_profile(self.hass, self._record_id, True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        await async_set_profile(self.hass, self._record_id, False)


class ScheduleSwitch(_ConfigSwitch):
    """On while the schedule is enabled; `running` tells if a slot is active."""

    _attr_icon = "mdi:calendar-clock"

    def __init__(self, entry: ScheduleCreatorConfigEntry, schedule_id: str) -> None:
        super().__init__(entry, "schedule", schedule_id)

    def _record(self) -> Any:
        config = self._config
        return next(
            (
                s
                for s in (config.schedules if config else ())
                if s.id == self._record_id
            ),
            None,
        )

    @property
    def name(self) -> str:
        schedule = self._record()
        return f"{labels(self.hass)[1]} {schedule.name if schedule else ''}".strip()

    @property
    def is_on(self) -> bool:
        schedule = self._record()
        return bool(schedule and schedule.enabled)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        schedule, config = self._record(), self._config
        if schedule is None or config is None:
            return {}
        profile = next(
            (p for p in config.profiles if p.id == schedule.profile_id), None
        )
        runtime = self._entry.runtime_data.storage.runtime.data
        running = any(
            item.frozen_schedule.id == schedule.id
            and item.state in {OccurrenceState.ACTIVE, OccurrenceState.SUSPENDED}
            for item in runtime.occurrences
        )
        return {
            "profile": None if profile is None else profile.name,
            "profile_active": bool(profile and profile.active),
            "entities": list(schedule.target_entity_ids),
            "running": running,
        }

    async def async_turn_on(self, **kwargs: Any) -> None:
        await async_set_schedule(self.hass, self._record_id, True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        await async_set_schedule(self.hass, self._record_id, False)


class _SwitchManager:
    """Keep one switch per profile and schedule in step with the configuration."""

    def __init__(
        self,
        hass: HomeAssistant,
        entry: ScheduleCreatorConfigEntry,
        add_entities: AddEntitiesCallback,
    ) -> None:
        self._hass = hass
        self._entry = entry
        self._add = add_entities
        self._entities: dict[str, _ConfigSwitch] = {}

    @callback
    def refresh(self, _event: Event | None = None) -> None:
        config = self._entry.runtime_data.storage.config.data
        if config is None:
            return
        wanted: dict[str, _ConfigSwitch] = {}
        for profile in config.profiles:
            key = f"{self._entry.entry_id}_profile_{profile.id}"
            wanted[key] = self._entities.get(key) or ProfileSwitch(
                self._entry, profile.id
            )
        for schedule in config.schedules:
            key = f"{self._entry.entry_id}_schedule_{schedule.id}"
            wanted[key] = self._entities.get(key) or ScheduleSwitch(
                self._entry, schedule.id
            )
        registry = er.async_get(self._hass)
        for key in set(self._entities) - set(wanted):
            entity_id = registry.async_get_entity_id("switch", DOMAIN, key)
            if entity_id is not None:
                registry.async_remove(entity_id)
        new = [entity for key, entity in wanted.items() if key not in self._entities]
        self._entities = wanted
        if new:
            self._add(new)
        for entity in wanted.values():
            if entity not in new and entity.hass is not None:
                entity.async_write_ha_state()


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ScheduleCreatorConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Create the switches and follow configuration and runtime changes."""

    manager = _SwitchManager(hass, entry, async_add_entities)
    manager.refresh()
    for event_type in (EVENT_CONFIG_UPDATED, EVENT_RUNTIME_UPDATED):
        entry.async_on_unload(hass.bus.async_listen(event_type, manager.refresh))
