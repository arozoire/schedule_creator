"""Test bounded occurrence reconciliation wiring."""

import json
from copy import deepcopy
from pathlib import Path
from unittest.mock import patch

from homeassistant import config_entries

from custom_components.schedule_creator.const import DOMAIN
from custom_components.schedule_creator.storage import (
    CONFIG_STORE_KEY,
    RuntimeRepository,
)

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "models_v1.json"


async def _create_entry(hass):
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    await hass.config_entries.flow.async_configure(result["flow_id"], {})
    await hass.async_block_till_done()
    return hass.config_entries.async_entries(DOMAIN)[0]


async def _request(client, message):
    await client.send_json_auto_id(message)
    return await client.receive_json(timeout=5)


def _store_always_active_fixture(hass_storage):
    bundle = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    config = deepcopy(bundle["config"])
    slot = config["schedules"][0]["time_slots"][0]
    slot.update({"weekdays": list(range(7)), "start": "00:00:00", "end": "23:59:59"})
    config["schedules"][0]["inclusion_dates"] = []
    config["schedules"][0]["exclusion_dates"] = []
    hass_storage[CONFIG_STORE_KEY] = {
        "version": 1,
        "minor_version": 1,
        "key": CONFIG_STORE_KEY,
        "data": config,
    }


async def _create_active_schedule(client):
    profile = await _request(
        client,
        {
            "type": "schedule_creator/profile/create",
            "expected_revision": 1,
            "name": "Home",
            "profile_type": "shared",
        },
    )
    profile_id = profile["result"]["profile"]["id"]
    await _request(
        client,
        {
            "type": "schedule_creator/profile/set_active",
            "expected_revision": 2,
            "profile_id": profile_id,
            "active": True,
        },
    )
    group = await _request(
        client,
        {
            "type": "schedule_creator/group/create",
            "expected_revision": 3,
            "profile_id": profile_id,
            "name": "Living",
            "entity_ids": ["light.living_room"],
        },
    )
    response = await _request(
        client,
        {
            "type": "schedule_creator/schedule/create",
            "expected_revision": 4,
            "profile_id": profile_id,
            "group_id": group["result"]["group"]["id"],
            "name": "Always",
            "target_entity_ids": ["light.living_room"],
            "time_slots": [
                {"weekdays": list(range(7)), "start": "00:00", "end": "23:59"}
            ],
            "start_action": {
                "domain": "light",
                "action": "turn_on",
                "data": {},
            },
        },
    )
    return response


async def test_setup_reconciles_horizon_and_reload_is_idempotent(
    hass, hass_storage
):
    """Startup materializes a horizon and reload does not duplicate it."""
    _store_always_active_fixture(hass_storage)
    entry = await _create_entry(hass)
    runtime = entry.runtime_data.storage.runtime.data

    assert runtime.revision == 1
    assert len(runtime.occurrences) in {14, 15}
    occurrence_ids = tuple(item.id for item in runtime.occurrences)

    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    reloaded = entry.runtime_data.storage.runtime.data
    assert reloaded.revision == 1
    assert tuple(item.id for item in reloaded.occurrences) == occurrence_ids


async def test_schedule_mutation_reconciles_active_horizon(hass, hass_ws_client):
    """Creating an active schedule immediately materializes its horizon."""
    entry = await _create_entry(hass)
    client = await hass_ws_client(hass)

    response = await _create_active_schedule(client)

    assert response["success"] is True
    runtime = entry.runtime_data.storage.runtime.data
    assert runtime.revision == 1
    assert len(runtime.occurrences) in {14, 15}


async def test_non_temporal_update_does_not_rewrite_runtime(hass, hass_ws_client):
    """An unchanged projection remains a Runtime Store no-op."""
    entry = await _create_entry(hass)
    client = await hass_ws_client(hass)
    created = await _create_active_schedule(client)
    schedule_id = created["result"]["schedule"]["id"]
    before = entry.runtime_data.storage.runtime.data

    response = await _request(
        client,
        {
            "type": "schedule_creator/schedule/update",
            "expected_revision": 5,
            "schedule_id": schedule_id,
            "name": "Renamed",
        },
    )

    assert response["success"] is True
    assert entry.runtime_data.storage.runtime.data is before


async def test_post_commit_runtime_failure_does_not_falsify_config_result(
    hass, hass_ws_client
):
    """A second-Store failure cannot turn a committed config into client failure."""
    entry = await _create_entry(hass)
    client = await hass_ws_client(hass)

    with patch.object(
        RuntimeRepository,
        "async_update_if_changed",
        side_effect=OSError("simulated runtime failure"),
    ):
        response = await _create_active_schedule(client)

    assert response["success"] is True
    assert response["result"]["revision"] == 5
    assert entry.runtime_data.storage.config.data.revision == 5
    assert entry.runtime_data.storage.runtime.data.revision == 0
