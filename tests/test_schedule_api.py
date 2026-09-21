"""Test administrative schedule mutations through Home Assistant WebSocket."""

from homeassistant import config_entries

from custom_components.schedule_creator.const import DOMAIN


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


async def _parents(client):
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
    group = await _request(
        client,
        {
            "type": "schedule_creator/group/create",
            "expected_revision": 2,
            "profile_id": profile_id,
            "name": "Living",
            "entity_ids": ["light.living_room"],
        },
    )
    return profile_id, group["result"]["group"]["id"]


def _create_message(profile_id, group_id, revision=3):
    return {
        "type": "schedule_creator/schedule/create",
        "expected_revision": revision,
        "profile_id": profile_id,
        "group_id": group_id,
        "name": "Evening",
        "target_entity_ids": ["light.living_room"],
        "time_slots": [
            {"weekdays": [0, 1, 2, 3, 4], "start": "18:30", "end": "23:00"}
        ],
        "start_action": {
            "domain": "light",
            "action": "turn_on",
            "data": {"brightness": 180},
        },
    }


async def test_schedule_mutations_require_admin(
    hass, hass_ws_client, hass_read_only_access_token
):
    """A read-only user cannot create schedules."""
    entry = await _create_entry(hass)
    before = entry.runtime_data.storage.config.data
    client = await hass_ws_client(hass, access_token=hass_read_only_access_token)

    response = await _request(
        client,
        _create_message(
            "11111111-1111-4111-8111-111111111111",
            "22222222-2222-4222-8222-222222222222",
            1,
        ),
    )

    assert response["error"]["code"] == "unauthorized"
    assert entry.runtime_data.storage.config.data is before


async def test_schedule_create_update_delete(hass, hass_ws_client):
    """Schedule CRUD advances configuration and record revisions once."""
    entry = await _create_entry(hass)
    client = await hass_ws_client(hass)
    profile_id, group_id = await _parents(client)

    created = await _request(client, _create_message(profile_id, group_id))
    schedule = created["result"]["schedule"]
    schedule_id = schedule["id"]
    assert created["result"]["revision"] == 4
    assert schedule["revision"] == 1
    assert schedule["time_slots"][0]["id"]
    assert schedule["start_action"]["id"]

    updated = await _request(
        client,
        {
            "type": "schedule_creator/schedule/update",
            "expected_revision": 4,
            "schedule_id": schedule_id,
            "name": "Late evening",
            "enabled": False,
            "end_action": {"domain": "light", "action": "turn_off", "data": {}},
            "exclusion_dates": ["2026-12-25"],
        },
    )
    assert updated["result"]["revision"] == 5
    assert updated["result"]["schedule"]["revision"] == 2
    assert updated["result"]["schedule"]["enabled"] is False
    assert updated["result"]["schedule"]["end_action"]["id"]

    deleted = await _request(
        client,
        {
            "type": "schedule_creator/schedule/delete",
            "expected_revision": 5,
            "schedule_id": schedule_id,
        },
    )
    assert deleted["result"] == {
        "revision": 6,
        "deleted_schedule_id": schedule_id,
    }
    assert entry.runtime_data.storage.config.data.schedules == ()


async def test_schedule_parent_and_revision_errors_are_stable(hass, hass_ws_client):
    """Unknown ownership and stale revisions return stable errors."""
    await _create_entry(hass)
    client = await hass_ws_client(hass)
    profile_id, group_id = await _parents(client)

    missing_group = await _request(
        client,
        _create_message(
            profile_id, "ffffffff-ffff-4fff-8fff-ffffffffffff"
        ),
    )
    assert missing_group["error"] == {
        "code": "not_found",
        "message": "Group was not found.",
    }

    created = await _request(client, _create_message(profile_id, group_id))
    stale = await _request(
        client,
        {
            "type": "schedule_creator/schedule/update",
            "expected_revision": 3,
            "schedule_id": created["result"]["schedule"]["id"],
            "name": "Stale",
        },
    )
    assert stale["error"]["code"] == "revision_conflict"

    missing = await _request(
        client,
        {
            "type": "schedule_creator/schedule/update",
            "expected_revision": 4,
            "schedule_id": "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
            "name": "Missing",
        },
    )
    assert missing["error"] == {
        "code": "not_found",
        "message": "Schedule was not found.",
    }

    empty = await _request(
        client,
        {
            "type": "schedule_creator/schedule/update",
            "expected_revision": 4,
            "schedule_id": created["result"]["schedule"]["id"],
        },
    )
    assert empty["error"] == {
        "code": "invalid_payload",
        "message": "Schedule data is invalid.",
    }


async def test_schedule_rejects_invalid_targets_and_nested_payloads(
    hass, hass_ws_client
):
    """Complete model validation protects targets and nested records."""
    entry = await _create_entry(hass)
    client = await hass_ws_client(hass)
    profile_id, group_id = await _parents(client)
    before = entry.runtime_data.storage.config.data

    message = _create_message(profile_id, group_id)
    message["target_entity_ids"] = ["switch.not_in_group"]
    response = await _request(client, message)
    assert response["error"] == {
        "code": "invalid_payload",
        "message": "Schedule data is invalid.",
    }
    assert entry.runtime_data.storage.config.data is before

    message = _create_message(profile_id, group_id)
    message["start_action"]["id"] = "client-owned"
    response = await _request(client, message)
    assert response["error"]["code"] == "invalid_payload"


async def test_schedule_condition_and_notification_ids_are_server_owned(
    hass, hass_ws_client
):
    """Nested condition and notification trees receive server IDs."""
    await _create_entry(hass)
    client = await hass_ws_client(hass)
    profile_id, group_id = await _parents(client)
    message = _create_message(profile_id, group_id)
    message["condition"] = {
        "operator": "and",
        "children": [
            {"operator": "available", "entity_id": "sensor.outdoor_lux"},
            {
                "operator": "numeric_less",
                "entity_id": "sensor.outdoor_lux",
                "value": 80,
            },
        ],
    }
    message["start_notification"] = {
        "action": "notify.mobile_app_phone",
        "title": "Schedule Creator",
        "message": "Started",
    }

    response = await _request(client, message)
    schedule = response["result"]["schedule"]
    assert schedule["condition"]["id"]
    assert all(child["id"] for child in schedule["condition"]["children"])
    assert schedule["start_notification"]["id"]
