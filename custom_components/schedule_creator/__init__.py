"""Schedule Creator integration."""

from dataclasses import dataclass

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant


@dataclass(slots=True)
class ScheduleCreatorRuntimeData:
    """Non-persistent objects owned by a loaded config entry."""

    loaded: bool = True

    async def async_shutdown(self) -> None:
        """Release runtime resources."""

        self.loaded = False


type ScheduleCreatorConfigEntry = ConfigEntry[ScheduleCreatorRuntimeData]


async def async_setup_entry(
    hass: HomeAssistant, entry: ScheduleCreatorConfigEntry
) -> bool:
    """Set up Schedule Creator from a config entry."""

    entry.runtime_data = ScheduleCreatorRuntimeData()
    return True


async def async_unload_entry(
    hass: HomeAssistant, entry: ScheduleCreatorConfigEntry
) -> bool:
    """Unload Schedule Creator."""

    await entry.runtime_data.async_shutdown()
    return True
