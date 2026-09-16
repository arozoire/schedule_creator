"""Test Schedule Creator config-entry lifecycle."""

from pathlib import Path

from homeassistant import config_entries
from homeassistant.core import HomeAssistant

from custom_components.schedule_creator.const import DOMAIN
from custom_components.schedule_creator.storage import (
    CONFIG_STORE_KEY,
    RUNTIME_STORE_KEY,
)


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


async def test_reload_replaces_runtime_after_shutdown(hass: HomeAssistant) -> None:
    """Reload shuts down the old runtime before creating a replacement."""

    entry = await _create_entry(hass)
    previous_runtime = entry.runtime_data

    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()

    assert previous_runtime.loaded is False
    assert entry.runtime_data is not previous_runtime
    assert entry.runtime_data.loaded is True


async def test_remove_unloads_entry_without_owned_objects(hass: HomeAssistant) -> None:
    """Removing the entry preserves native data for a later reinstall."""

    entry = await _create_entry(hass)
    runtime = entry.runtime_data
    config_path = Path(hass.config.path(".storage", CONFIG_STORE_KEY))
    runtime_path = Path(hass.config.path(".storage", RUNTIME_STORE_KEY))
    assert config_path.exists()
    assert runtime_path.exists()

    await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()

    assert runtime.loaded is False
    assert hass.config_entries.async_entries(DOMAIN) == []
    assert DOMAIN not in hass.services.async_services()
    assert not any(
        state.entity_id.startswith(f"{DOMAIN}.") for state in hass.states.async_all()
    )
    assert config_path.exists()
    assert runtime_path.exists()
