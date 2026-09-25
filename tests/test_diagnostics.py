"""Test Schedule Creator diagnostics."""

from homeassistant import config_entries
from homeassistant.core import HomeAssistant

from custom_components.schedule_creator.const import DOMAIN
from custom_components.schedule_creator.control import SERVICES
from custom_components.schedule_creator.diagnostics import (
    async_get_config_entry_diagnostics,
)


async def test_diagnostics_are_read_only(hass: HomeAssistant) -> None:
    """Reading diagnostics reports lifecycle state without creating HA objects."""

    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    await hass.config_entries.flow.async_configure(result["flow_id"], {})
    await hass.async_block_till_done()
    entry = hass.config_entries.async_entries(DOMAIN)[0]

    diagnostics = await async_get_config_entry_diagnostics(hass, entry)

    assert diagnostics == {
        "integration": {
            "domain": DOMAIN,
            "config_entry_version": 1,
        },
        "runtime": {
            "loaded": True,
            "registered_services": len(SERVICES),
            "owned_entities": 0,
        },
    }
    assert not any(
        state.entity_id.startswith(f"{DOMAIN}.") for state in hass.states.async_all()
    )
