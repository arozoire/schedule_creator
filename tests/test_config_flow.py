"""Test Schedule Creator setup and single-instance enforcement."""

from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType

from custom_components.schedule_creator.const import CONFIG_ENTRY_TITLE, DOMAIN


async def test_user_flow_creates_and_loads_entry(hass: HomeAssistant) -> None:
    """The zero-input flow creates the only Schedule Creator entry."""

    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "user"
    assert not result["errors"]

    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == CONFIG_ENTRY_TITLE
    assert result["data"] == {}

    await hass.async_block_till_done()
    entry = hass.config_entries.async_entries(DOMAIN)[0]
    assert entry.unique_id == DOMAIN
    assert entry.runtime_data.loaded is True
    assert DOMAIN not in hass.services.async_services()


async def test_second_entry_is_rejected(hass: HomeAssistant) -> None:
    """Only one Schedule Creator config entry is allowed."""

    first = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    await hass.config_entries.flow.async_configure(first["flow_id"], {})
    await hass.async_block_till_done()

    second = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result = await hass.config_entries.flow.async_configure(second["flow_id"], {})
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "already_configured"
