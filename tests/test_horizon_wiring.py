"""Test bounded occurrence reconciliation wiring."""

import json
from copy import deepcopy
from datetime import timedelta
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch

from homeassistant import config_entries

from custom_components.schedule_creator.const import DOMAIN
from custom_components.schedule_creator.horizon import HORIZON_REFRESH_INTERVAL
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

    assert runtime.revision == 2
    assert len(runtime.occurrences) in {14, 15}
    occurrence_ids = tuple(item.id for item in runtime.occurrences)

    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    reloaded = entry.runtime_data.storage.runtime.data
    assert reloaded.revision == 2
    assert tuple(item.id for item in reloaded.occurrences) == occurrence_ids


async def test_schedule_mutation_reconciles_active_horizon(hass, hass_ws_client):
    """Creating an active schedule immediately materializes its horizon."""
    entry = await _create_entry(hass)
    client = await hass_ws_client(hass)

    response = await _create_active_schedule(client)

    assert response["success"] is True
    runtime = entry.runtime_data.storage.runtime.data
    assert runtime.revision == 2
    assert len(runtime.occurrences) in {14, 15}


async def test_schedule_update_replans_only_future_pending_records(
    hass, hass_ws_client
):
    """An edit refreshes future freezes but preserves the current occurrence."""
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
    after = entry.runtime_data.storage.runtime.data
    assert after.revision == before.revision + 1
    assert after.occurrences[0] is before.occurrences[0]
    assert after.occurrences[0].frozen_schedule.name == "Always"
    assert {
        item.frozen_schedule.name for item in after.occurrences[1:]
    } == {"Renamed"}


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


async def test_periodic_refresh_advances_the_materialized_horizon(
    hass, hass_storage
):
    """The lifecycle callback extends the horizon once per day."""
    _store_always_active_fixture(hass_storage)
    entry = await _create_entry(hass)
    runtime_data = entry.runtime_data
    before = runtime_data.storage.runtime.data
    previous_latest = max(item.start_utc for item in before.occurrences)

    await runtime_data.horizon_refresh._async_refresh(
        before.occurrences[0].start_utc + timedelta(days=2)
    )

    after = runtime_data.storage.runtime.data
    assert HORIZON_REFRESH_INTERVAL == timedelta(days=1)
    assert after.revision == before.revision + 2
    assert max(item.start_utc for item in after.occurrences) > previous_latest


async def test_unload_cancels_periodic_refresh_and_late_callback_is_safe(
    hass, hass_storage
):
    """Unload unregisters refresh and a callback already queued becomes a no-op."""
    _store_always_active_fixture(hass_storage)
    cancel = Mock()
    with patch(
        "custom_components.schedule_creator.horizon.async_track_time_interval",
        return_value=cancel,
    ) as track:
        entry = await _create_entry(hass)

    runtime_data = entry.runtime_data
    before = runtime_data.storage.runtime.data
    callback = track.call_args.args[1]

    assert runtime_data.horizon_refresh.active
    assert track.call_args.args[2] == timedelta(days=1)
    assert await hass.config_entries.async_unload(entry.entry_id)
    await callback(before.updated_at + timedelta(days=1))

    cancel.assert_called_once_with()
    assert not runtime_data.horizon_refresh.active
    assert runtime_data.storage.runtime.data is before


async def test_periodic_refresh_failure_is_contained(hass, hass_storage, caplog):
    """A Store failure is logged without disabling later refresh attempts."""
    _store_always_active_fixture(hass_storage)
    entry = await _create_entry(hass)
    coordinator = entry.runtime_data.horizon_refresh
    now = entry.runtime_data.storage.runtime.data.updated_at + timedelta(days=1)

    reconcile = AsyncMock(side_effect=OSError("simulated runtime failure"))
    with patch(
        "custom_components.schedule_creator.horizon.async_reconcile_horizon",
        reconcile,
    ):
        await coordinator._async_refresh(now)

    assert coordinator.active
    assert "Unable to refresh occurrence horizon" in caplog.text
