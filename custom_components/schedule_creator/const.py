"""Constants for Schedule Creator."""

from homeassistant.util.hass_dict import HassKey

DOMAIN = "schedule_creator"
CONFIG_ENTRY_TITLE = "Schedule Creator"
CONFIG_ENTRY_UNIQUE_ID = DOMAIN
EVENT_RUNTIME_UPDATED = f"{DOMAIN}_runtime_updated"
EVENT_CONFIG_UPDATED = f"{DOMAIN}_config_updated"
INTEGRATION_VERSION: HassKey[str] = HassKey(f"{DOMAIN}.integration_version")
