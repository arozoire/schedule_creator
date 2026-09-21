"""Schedule Creator integration."""

import asyncio
from dataclasses import dataclass
from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType
from homeassistant.util.hass_dict import HassKey

from .const import DOMAIN
from .journal import RecoveryInstruction, build_recovery_plan
from .reconciliation import async_reconcile_horizon
from .storage import ScheduleCreatorStorage
from .websocket_api import async_register_commands

LIFECYCLE_LOCK: HassKey[asyncio.Lock] = HassKey(f"{DOMAIN}.lifecycle_lock")


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


def lifecycle_lock(hass: HomeAssistant) -> asyncio.Lock:
    """Return the integration-wide lock shared by lifecycle and mutations."""

    lock = hass.data.get(LIFECYCLE_LOCK)
    if lock is None:
        lock = hass.data[LIFECYCLE_LOCK] = asyncio.Lock()
    return lock


async def async_setup(hass: HomeAssistant, _config: ConfigType) -> bool:
    """Register the global read API independently of config-entry reloads."""

    lifecycle_lock(hass)
    async_register_commands(hass)
    return True


async def async_setup_entry(
    hass: HomeAssistant, entry: ScheduleCreatorConfigEntry
) -> bool:
    """Set up Schedule Creator from a config entry."""

    async with lifecycle_lock(hass):
        storage = ScheduleCreatorStorage(hass)
        now = datetime.now(UTC)
        await storage.async_load(now)
        config = storage.config.data
        if config is None:
            raise RuntimeError("configuration was not initialized")
        await async_reconcile_horizon(
            storage.runtime, config, ZoneInfo(hass.config.time_zone), now
        )
        recovery_plan = build_recovery_plan(storage.runtime.data, now)
        entry.runtime_data = ScheduleCreatorRuntimeData(
            storage=storage,
            recovery_plan=recovery_plan,
        )
    return True


async def async_unload_entry(
    hass: HomeAssistant, entry: ScheduleCreatorConfigEntry
) -> bool:
    """Unload Schedule Creator."""

    async with lifecycle_lock(hass):
        await entry.runtime_data.async_shutdown()
    return True


async def async_remove_entry(
    _hass: HomeAssistant, _entry: ScheduleCreatorConfigEntry
) -> None:
    """Preserve native data; only the future explicit RESET path deletes it."""
