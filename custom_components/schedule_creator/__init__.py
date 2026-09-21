"""Schedule Creator integration."""

from dataclasses import dataclass
from datetime import UTC, datetime

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

from .journal import RecoveryInstruction, build_recovery_plan
from .storage import ScheduleCreatorStorage
from .websocket_api import async_register_commands


@dataclass(slots=True)
class ScheduleCreatorRuntimeData:
    """Non-persistent objects owned by a loaded config entry."""

    storage: ScheduleCreatorStorage
    recovery_plan: tuple[RecoveryInstruction, ...]
    loaded: bool = True

    async def async_shutdown(self) -> None:
        """Release runtime resources."""

        await self.storage.async_shutdown()
        self.loaded = False


type ScheduleCreatorConfigEntry = ConfigEntry[ScheduleCreatorRuntimeData]


async def async_setup(hass: HomeAssistant, _config: ConfigType) -> bool:
    """Register the global read API independently of config-entry reloads."""

    async_register_commands(hass)
    return True


async def async_setup_entry(
    hass: HomeAssistant, entry: ScheduleCreatorConfigEntry
) -> bool:
    """Set up Schedule Creator from a config entry."""

    storage = ScheduleCreatorStorage(hass)
    await storage.async_load(datetime.now(UTC))
    recovery_plan = build_recovery_plan(storage.runtime.data, datetime.now(UTC))
    entry.runtime_data = ScheduleCreatorRuntimeData(
        storage=storage,
        recovery_plan=recovery_plan,
    )
    return True


async def async_unload_entry(
    hass: HomeAssistant, entry: ScheduleCreatorConfigEntry
) -> bool:
    """Unload Schedule Creator."""

    await entry.runtime_data.async_shutdown()
    return True


async def async_remove_entry(
    _hass: HomeAssistant, _entry: ScheduleCreatorConfigEntry
) -> None:
    """Preserve native data; only the future explicit RESET path deletes it."""
