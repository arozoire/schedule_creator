"""Authenticated, read-only access to loaded Schedule Creator state."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any, cast

from homeassistant.components import websocket_api
from homeassistant.components.websocket_api.connection import ActiveConnection
from homeassistant.components.websocket_api.decorators import websocket_command
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant, callback
from homeassistant.util.hass_dict import HassKey

from .const import DOMAIN
from .group_api import GROUP_COMMANDS
from .models import LeaseState
from .profile_api import PROFILE_COMMANDS
from .quick_timer_api import QUICK_TIMER_COMMANDS
from .schedule_api import SCHEDULE_COMMANDS
from .storage import StorageNotLoadedError

if TYPE_CHECKING:
    from . import ScheduleCreatorConfigEntry

_LOGGER = logging.getLogger(__name__)
_REGISTERED: HassKey[bool] = HassKey(f"{DOMAIN}.websocket_registered")


@callback
def async_register_commands(hass: HomeAssistant) -> None:
    """Register once per HA instance; the global command survives entry unload."""

    if hass.data.get(_REGISTERED):
        return
    websocket_api.async_register_command(hass, websocket_get_state)
    for command in PROFILE_COMMANDS:
        websocket_api.async_register_command(hass, command)
    for command in GROUP_COMMANDS:
        websocket_api.async_register_command(hass, command)
    for command in SCHEDULE_COMMANDS:
        websocket_api.async_register_command(hass, command)
    for command in QUICK_TIMER_COMMANDS:
        websocket_api.async_register_command(hass, command)
    hass.data[_REGISTERED] = True


@websocket_command({"type": "schedule_creator/get_state"})
@callback
def websocket_get_state(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Read immutable repositories without I/O, side effects or yield points."""

    try:
        entry = next(iter(hass.config_entries.async_entries(DOMAIN)), None)
        if entry is None or entry.state is not ConfigEntryState.LOADED:
            connection.send_error(
                msg["id"], "not_loaded", "Schedule Creator is not loaded."
            )
            return
        loaded_entry = cast("ScheduleCreatorConfigEntry", entry)
        if (
            not hasattr(loaded_entry, "runtime_data")
            or not loaded_entry.runtime_data.loaded
        ):
            connection.send_error(
                msg["id"], "not_loaded", "Schedule Creator is not loaded."
            )
            return

        runtime_data = loaded_entry.runtime_data
        config = runtime_data.storage.config.data
        runtime = runtime_data.storage.runtime.data
        if config is None:
            raise StorageNotLoadedError("configuration is unavailable")

        config_payload = config.to_dict()
        result = {
            "schema_version": config_payload.pop("schema_version"),
            "revision": config_payload.pop("revision"),
            "config": config_payload,
            "runtime_summary": {
                "revision": runtime.revision,
                "occurrences": len(runtime.occurrences),
                "active_leases": sum(
                    lease.state is LeaseState.ACTIVE for lease in runtime.leases
                ),
                "suspended_leases": sum(
                    lease.state is LeaseState.SUSPENDED for lease in runtime.leases
                ),
                # Includes terminal records still retained in the journal.
                "pending_operations": len(runtime.pending_operations),
                "quick_timers": len(runtime.quick_timers),
                "recovery_instructions": len(runtime_data.recovery_plan),
            },
        }
        connection.send_result(msg["id"], result)
    except (StorageNotLoadedError, OSError):
        _LOGGER.exception("Unable to read Schedule Creator storage")
        connection.send_error(
            msg["id"], "storage_unavailable", "Schedule Creator storage is unavailable."
        )
    except Exception:  # Client errors must never expose raw exception details.
        _LOGGER.exception("Unexpected error reading Schedule Creator state")
        connection.send_error(
            msg["id"], "internal_error", "Unable to read Schedule Creator state."
        )
