"""Schedule Creator integration."""

import asyncio
from dataclasses import dataclass
from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType
from homeassistant.loader import async_get_integration
from homeassistant.util.hass_dict import HassKey

from .actions import (
    ActionExecutionCoordinator,
    ActionPreparationCoordinator,
    async_reconcile_sent_operations,
)
from .boundaries import (
    OccurrenceBoundaryCoordinator,
    async_advance_occurrence_states,
    async_advance_quick_timer_states,
)
from .completions import CompletionCoordinator
from .condition_runtime import ConditionCoordinator
from .const import DOMAIN, INTEGRATION_VERSION
from .frontend_loader import async_register_frontend
from .horizon import HorizonRefreshCoordinator
from .journal import RecoveryInstruction, build_recovery_plan
from .reconciliation import async_reconcile_horizon
from .retention import async_prune_terminal_occurrences
from .snapshots import SnapshotCoordinator
from .status_notifications import StatusNotificationCoordinator
from .storage import ScheduleCreatorStorage
from .websocket_api import async_register_commands

LIFECYCLE_LOCK: HassKey[asyncio.Lock] = HassKey(f"{DOMAIN}.lifecycle_lock")


@dataclass(slots=True)
class ScheduleCreatorRuntimeData:
    """Non-persistent objects owned by a loaded config entry."""

    storage: ScheduleCreatorStorage
    recovery_plan: tuple[RecoveryInstruction, ...]
    horizon_refresh: HorizonRefreshCoordinator
    occurrence_boundaries: OccurrenceBoundaryCoordinator
    conditions: ConditionCoordinator
    snapshots: SnapshotCoordinator
    action_execution: ActionExecutionCoordinator
    completions: CompletionCoordinator
    status_notifications: StatusNotificationCoordinator
    loaded: bool = True

    async def async_shutdown(self) -> None:
        """Release runtime resources."""

        self.loaded = False
        self.horizon_refresh.shutdown()
        self.occurrence_boundaries.shutdown()
        self.conditions.shutdown()
        self.snapshots.shutdown()
        self.action_execution.shutdown()
        self.status_notifications.shutdown()
        await self.storage.async_shutdown()


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
    # The version of the Python code actually running, not the file on disk:
    # the card compares it with its own version to suggest reload or restart.
    integration = await async_get_integration(hass, DOMAIN)
    hass.data[INTEGRATION_VERSION] = str(integration.version or "")
    async_register_commands(hass)
    await async_register_frontend(hass)
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
        await async_advance_occurrence_states(storage.runtime, now)
        await async_advance_quick_timer_states(storage.runtime, now)
        await async_reconcile_sent_operations(storage.runtime, now)
        completions = CompletionCoordinator(hass, storage.runtime)
        action_execution = ActionExecutionCoordinator(
            hass, storage.runtime, completions.async_refresh
        )
        actions = ActionPreparationCoordinator(
            storage.runtime, action_execution.async_refresh
        )
        snapshots = SnapshotCoordinator(hass, storage.runtime, actions.async_refresh)
        conditions = ConditionCoordinator(
            hass, storage.runtime, snapshots.async_refresh
        )
        await conditions.async_refresh(now)
        await async_prune_terminal_occurrences(storage.runtime, now)
        recovery_plan = build_recovery_plan(storage.runtime.data, now)
        occurrence_boundaries = OccurrenceBoundaryCoordinator(
            hass, storage.runtime, conditions.async_refresh
        )
        horizon_refresh = HorizonRefreshCoordinator(
            hass,
            storage,
            occurrence_boundaries.reschedule,
            conditions.async_refresh,
        )
        entry.runtime_data = ScheduleCreatorRuntimeData(
            storage=storage,
            recovery_plan=recovery_plan,
            horizon_refresh=horizon_refresh,
            occurrence_boundaries=occurrence_boundaries,
            conditions=conditions,
            snapshots=snapshots,
            action_execution=action_execution,
            completions=completions,
            status_notifications=StatusNotificationCoordinator(
                hass, storage.config, storage.runtime
            ),
        )
        action_execution.start(now)
        snapshots.start()
        conditions.start(now)
        occurrence_boundaries.start(now)
        horizon_refresh.start()
        entry.runtime_data.status_notifications.start()
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
