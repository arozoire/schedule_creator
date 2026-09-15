"""Diagnostics support for Schedule Creator."""

from typing import Any

from homeassistant.core import HomeAssistant

from . import ScheduleCreatorConfigEntry
from .const import DOMAIN


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant, entry: ScheduleCreatorConfigEntry
) -> dict[str, Any]:
    """Return side-effect-free diagnostics for a config entry."""

    return {
        "integration": {
            "domain": DOMAIN,
            "config_entry_version": entry.version,
        },
        "runtime": {
            "loaded": entry.runtime_data.loaded,
            "registered_services": len(hass.services.async_services().get(DOMAIN, {})),
            "owned_entities": sum(
                state.entity_id.startswith(f"{DOMAIN}.")
                for state in hass.states.async_all()
            ),
        },
    }
