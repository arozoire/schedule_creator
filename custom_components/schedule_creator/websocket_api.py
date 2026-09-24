"""Authenticated, read-only access to loaded Schedule Creator state."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any, cast

from homeassistant.components import websocket_api
from homeassistant.components.websocket_api.connection import ActiveConnection
from homeassistant.components.websocket_api.decorators import websocket_command
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.util.hass_dict import HassKey

from .backup_api import BACKUP_COMMANDS
from .const import (
    DOMAIN,
    EVENT_CONFIG_UPDATED,
    EVENT_RUNTIME_UPDATED,
    INTEGRATION_VERSION,
)
from .group_api import GROUP_COMMANDS
from .models import LeaseState, OccurrenceState, QuickTimerState
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
    websocket_api.async_register_command(hass, websocket_subscribe_runtime)
    for command in PROFILE_COMMANDS:
        websocket_api.async_register_command(hass, command)
    for command in GROUP_COMMANDS:
        websocket_api.async_register_command(hass, command)
    for command in SCHEDULE_COMMANDS:
        websocket_api.async_register_command(hass, command)
    for command in QUICK_TIMER_COMMANDS:
        websocket_api.async_register_command(hass, command)
    for command in BACKUP_COMMANDS:
        websocket_api.async_register_command(hass, command)
    hass.data[_REGISTERED] = True


# Attributes the cards need to describe a restored state; the rest stays private.
_PREVIOUS_ATTRIBUTES = (
    "brightness",
    "current_position",
    "fan_mode",
    "hvac_mode",
    "percentage",
    "preset_mode",
    "temperature",
)


def _previous_state(runtime: Any, timer: Any) -> dict[str, Any] | None:
    """State the timer restores when it ends, from its initial snapshot."""

    snapshot = next(
        (
            item
            for item in runtime.snapshots
            if item.id == timer.snapshot_id
            or (
                item.occurrence_id == timer.controller_id
                and item.entity_id == timer.entity_id
            )
        ),
        None,
    )
    if snapshot is None:
        return None
    return {
        "state": snapshot.state,
        "attributes": {
            key: snapshot.attributes[key]
            for key in _PREVIOUS_ATTRIBUTES
            if key in snapshot.attributes
        },
    }


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
            "integration_version": hass.data.get(INTEGRATION_VERSION, ""),
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
            "quick_timers": [
                {
                    "id": timer.id,
                    "entity_id": timer.entity_id,
                    "state": timer.state.value,
                    "expires_at": timer.expires_at.isoformat(),
                    "action": {
                        key: timer.action.to_dict()[key]
                        for key in ("domain", "action", "data")
                    },
                    "previous": _previous_state(runtime, timer),
                }
                for timer in runtime.quick_timers
                if timer.state is QuickTimerState.ACTIVE
            ],
            "operational": {
                "occurrences": [
                    {
                        "id": item.id,
                        "schedule_id": item.frozen_schedule.id,
                        "state": item.state.value,
                        "condition_branch": item.condition_branch.value,
                        "end_utc": item.end_utc.isoformat(),
                    }
                    for item in runtime.occurrences
                    if item.state in {OccurrenceState.ACTIVE, OccurrenceState.SUSPENDED}
                ],
                "leases": [
                    {
                        "entity_id": lease.entity_id,
                        "controller_type": lease.controller_type.value,
                        "state": lease.state.value,
                    }
                    for lease in runtime.leases
                    if lease.state in {LeaseState.ACTIVE, LeaseState.SUSPENDED}
                ],
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


@websocket_command({"type": "schedule_creator/subscribe_runtime"})
@callback
def websocket_subscribe_runtime(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Subscribe to committed runtime revisions; clients read snapshots separately."""

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
        runtime = loaded_entry.runtime_data.storage.runtime.data

        @callback
        def forward(event: Event[dict[str, int]]) -> None:
            connection.send_event(msg["id"], {"revision": event.data["revision"]})

        @callback
        def forward_config(event: Event[dict[str, int]]) -> None:
            connection.send_event(
                msg["id"], {"config_revision": event.data["revision"]}
            )

        unsubscribe_runtime = hass.bus.async_listen(
            EVENT_RUNTIME_UPDATED, forward, run_immediately=True
        )
        unsubscribe_config = hass.bus.async_listen(
            EVENT_CONFIG_UPDATED, forward_config, run_immediately=True
        )

        @callback
        def unsubscribe() -> None:
            unsubscribe_runtime()
            unsubscribe_config()

        connection.subscriptions[msg["id"]] = unsubscribe
        connection.send_result(msg["id"], {"revision": runtime.revision})
    except (StorageNotLoadedError, OSError):
        _LOGGER.exception("Unable to subscribe to Schedule Creator runtime")
        connection.send_error(
            msg["id"], "storage_unavailable", "Schedule Creator storage is unavailable."
        )
    except Exception:  # Client errors must never expose raw exception details.
        _LOGGER.exception("Unexpected error subscribing to Schedule Creator runtime")
        connection.send_error(
            msg["id"],
            "internal_error",
            "Unable to subscribe to Schedule Creator runtime.",
        )
