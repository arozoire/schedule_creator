"""Test the uncached card loader and the version reported to the card."""

import json
from pathlib import Path
from unittest.mock import patch

from homeassistant import config_entries
from homeassistant.setup import async_setup_component

from custom_components.schedule_creator import frontend_loader
from custom_components.schedule_creator.const import DOMAIN

MANIFEST = Path(__file__).parents[1] / "custom_components" / DOMAIN / "manifest.json"


async def _create_entry(hass):
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    await hass.config_entries.flow.async_configure(result["flow_id"], {})
    await hass.async_block_till_done()
    return hass.config_entries.async_entries(DOMAIN)[0]


async def test_loader_imports_bundle_by_content_hash(
    hass, hass_client_no_auth, tmp_path
):
    """A replaced bundle gets a new URL without restart or manual query string."""
    bundle = tmp_path / frontend_loader.BUNDLE_NAME
    bundle.write_text("console.log('one');\n", encoding="utf-8")
    assert await async_setup_component(hass, "http", {"http": {}})
    with patch.object(frontend_loader, "BUNDLE_DIRECTORY", tmp_path):
        await _create_entry(hass)
        client = await hass_client_no_auth()

        first = await client.get(f"{frontend_loader.LOADER_URL}?hacstag=123")
        assert first.status == 200
        assert first.headers["Cache-Control"] == "no-store"
        assert "javascript" in first.headers["Content-Type"]
        first_source = await first.text()
        fingerprint = frontend_loader.bundle_fingerprint(bundle)
        assert first_source == frontend_loader.loader_source(fingerprint)

        bundle.write_text("console.log('version two');\n", encoding="utf-8")
        second = await client.get(frontend_loader.LOADER_URL)
        second_source = await second.text()
        assert second_source != first_source
        assert frontend_loader.bundle_fingerprint(bundle) in second_source

    served = await client.get(
        f"{frontend_loader.STATIC_URL}/{frontend_loader.BUNDLE_NAME}?v=x"
    )
    assert served.status == 200
    assert "schedule-creator-card" in await served.text()


async def test_get_state_reports_running_integration_version(hass, hass_ws_client):
    """The card compares this value with its own build version."""
    await _create_entry(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "schedule_creator/get_state"})
    response = await client.receive_json(timeout=5)

    expected = json.loads(MANIFEST.read_text(encoding="utf-8"))["version"]
    assert response["result"]["integration_version"] == expected
