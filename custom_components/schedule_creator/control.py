"""Control Schedule Creator from automations, scripts and voice.

Services accept a profile or schedule by name (case-insensitive) or ID. They
act on the current configuration, like the card, through the same validated
commits; asking for the state something already has is not an error.
"""

from __future__ import annotations

from typing import Any
from uuid import uuid4

import voluptuous as vol
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError
from homeassistant.helpers import config_validation as cv

from .const import DOMAIN
from .models import APPLY_STATE_ACTION, ModelValidationError, QuickTimerState
from .mutation_api import MutationClientError, _loaded_runtime, async_commit_config
from .profile_api import profile_activation
from .quick_timer_api import (
    async_commit_runtime,
    quick_timer_cancellation,
    quick_timer_creation,
)
from .schedule_api import schedule_enabling

SERVICE_SET_PROFILE = "set_profile"
SERVICE_SET_SCHEDULE = "set_schedule"
SERVICE_START_TIMER = "start_timer"
SERVICE_CANCEL_TIMER = "cancel_timer"
SERVICES = (
    SERVICE_SET_PROFILE,
    SERVICE_SET_SCHEDULE,
    SERVICE_START_TIMER,
    SERVICE_CANCEL_TIMER,
)
MAX_TIMER_SECONDS = 604800

_SET_PROFILE_SCHEMA = vol.Schema(
    {
        vol.Required("profile"): cv.string,
        vol.Optional("active", default=True): cv.boolean,
    }
)
_SET_SCHEDULE_SCHEMA = vol.Schema(
    {
        vol.Required("schedule"): cv.string,
        vol.Optional("enabled", default=True): cv.boolean,
    }
)
_START_TIMER_SCHEMA = vol.Schema(
    {
        vol.Required("entity_id"): cv.entity_id,
        vol.Required("duration"): cv.positive_time_period,
        vol.Optional("action", default="turn_on"): cv.string,
        vol.Optional("data", default=dict): dict,
    }
)
_CANCEL_TIMER_SCHEMA = vol.Schema({vol.Required("entity_id"): cv.entity_id})


def find_record(records: Any, reference: str, kind: str) -> Any:
    """Return the record whose ID or (case-insensitive) name matches."""

    items = tuple(records)
    by_id = [item for item in items if item.id == reference]
    if by_id:
        return by_id[0]
    wanted = reference.strip().casefold()
    by_name = [item for item in items if str(item.name).casefold() == wanted]
    if len(by_name) == 1:
        return by_name[0]
    if by_name:
        raise ServiceValidationError(
            f"Several {kind}s are called “{reference}”: use the ID."
        )
    raise ServiceValidationError(f"No {kind} called “{reference}”.")


def _config(hass: HomeAssistant) -> Any:
    loaded = _loaded_runtime(hass)
    config = None if loaded is None else loaded.storage.config.data
    if config is None:
        raise HomeAssistantError("Schedule Creator is not loaded.")
    return config


async def _commit_config(hass: HomeAssistant, mutation: Any) -> None:
    try:
        await async_commit_config(hass, mutation)
    except MutationClientError as err:
        raise HomeAssistantError(err.client_message) from err
    except ModelValidationError as err:
        raise ServiceValidationError(str(err)) from err
    except ValueError:
        # Already in the requested state: nothing to do.
        return


async def async_set_profile(hass: HomeAssistant, profile_id: str, active: bool) -> None:
    """Activate or deactivate a profile (shared by the service and switches)."""

    await _commit_config(hass, profile_activation(profile_id, active))


async def async_set_schedule(
    hass: HomeAssistant, schedule_id: str, enabled: bool
) -> None:
    """Enable or disable a schedule (shared by the service and switches)."""

    await _commit_config(hass, schedule_enabling(schedule_id, enabled))


async def _handle_set_profile(call: ServiceCall) -> None:
    profile = find_record(_config(call.hass).profiles, call.data["profile"], "profile")
    await async_set_profile(call.hass, profile.id, call.data["active"])


async def _handle_set_schedule(call: ServiceCall) -> None:
    schedule = find_record(
        _config(call.hass).schedules, call.data["schedule"], "schedule"
    )
    await async_set_schedule(call.hass, schedule.id, call.data["enabled"])


async def _handle_start_timer(call: ServiceCall) -> None:
    entity_id: str = call.data["entity_id"]
    seconds = call.data["duration"].total_seconds()
    if not 1 <= seconds <= MAX_TIMER_SECONDS:
        raise ServiceValidationError("The duration must be between 1 s and 7 days.")
    action = str(call.data["action"])
    data = dict(call.data["data"])
    if action == APPLY_STATE_ACTION and not isinstance(data.get("state"), str):
        raise ServiceValidationError('apply_state needs data with a "state".')
    _config(call.hass)
    payload = {"domain": entity_id.split(".", 1)[0], "action": action, "data": data}
    try:
        await async_commit_runtime(
            call.hass,
            quick_timer_creation(str(uuid4()), entity_id, seconds, payload),
        )
    except MutationClientError as err:
        raise HomeAssistantError(err.client_message) from err
    except (ModelValidationError, ValueError) as err:
        raise ServiceValidationError(f"Invalid Quick Timer: {err}") from err


async def _handle_cancel_timer(call: ServiceCall) -> None:
    loaded = _loaded_runtime(call.hass)
    if loaded is None:
        raise HomeAssistantError("Schedule Creator is not loaded.")
    timers = [
        timer
        for timer in loaded.storage.runtime.data.quick_timers
        if timer.entity_id == call.data["entity_id"]
        and timer.state is QuickTimerState.ACTIVE
    ]
    if not timers:
        raise ServiceValidationError(
            f"No active Quick Timer for {call.data['entity_id']}."
        )
    for timer in timers:
        try:
            await async_commit_runtime(call.hass, quick_timer_cancellation(timer.id))
        except MutationClientError as err:
            raise HomeAssistantError(err.client_message) from err


def async_register_services(hass: HomeAssistant) -> None:
    """Register the automation services while the entry is loaded."""

    hass.services.async_register(
        DOMAIN, SERVICE_SET_PROFILE, _handle_set_profile, _SET_PROFILE_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, SERVICE_SET_SCHEDULE, _handle_set_schedule, _SET_SCHEDULE_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, SERVICE_START_TIMER, _handle_start_timer, _START_TIMER_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, SERVICE_CANCEL_TIMER, _handle_cancel_timer, _CANCEL_TIMER_SCHEMA
    )


def async_remove_services(hass: HomeAssistant) -> None:
    """Remove the services when the entry unloads."""

    for service in SERVICES:
        hass.services.async_remove(DOMAIN, service)
