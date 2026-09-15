"""Test Schedule Creator config-entry lifecycle."""

from homeassistant import config_entries
from homeassistant.core import HomeAssistant

from custom_components.schedule_creator.const import DOMAIN


async def _create_entry(hass: HomeAssistant):
    """Create and load the integration through its real Config Flow."""

    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    await hass.config_entries.flow.async_configure(result["flow_id"], {})
    await hass.async_block_till_done()
    return hass.config_entries.async_entries(DOMAIN)[0]


async def test_unload_releases_runtime(hass: HomeAssistant) -> None:
    """Unload calls the runtime shutdown hook and leaves no domain service."""

    entry = await _create_entry(hass)
    runtime = entry.runtime_data

    assert await hass.config_entries.async_unload(entry.entry_id)
    assert runtime.loaded is False
    assert DOMAIN not in hass.services.async_services()
    assert not any(
        state.entity_id.startswith(f"{DOMAIN}.") for state in hass.states.async_all()
    )
