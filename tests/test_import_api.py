"""Test appending profiles converted from weekly-schedule-card."""

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


def _import(revision, schedules, **extra):
    return {
        "type": "schedule_creator/import/merge",
        "expected_revision": revision,
        "source": "weekly-schedule-card",
        "source_created_at": "2026-09-25T06:26:00.000Z",
        "profiles": [
            {
                "name": "Default (WSC)",
                "profile_type": "exclusive",
                "groups": [
                    {
                        "name": "AC",
                        "color": "#E91E63",
                        "entity_ids": ["climate.camera"],
                        "schedules": schedules,
                    }
                ],
            }
        ],
        **extra,
    }


_AC = {
    "name": "AC Camera · Freddo 26°",
    "enabled": True,
    "target_entity_ids": ["climate.camera"],
    "time_slots": [
        {"weekdays": [0, 1, 2, 3, 4, 5, 6], "start": "09:30", "end": "18:00"}
    ],
    "start_action": {
        "domain": "climate",
        "action": "apply_state",
        "data": {"state": "cool", "temperature": 26, "fan_mode": "Auto"},
    },
    "end_action": {
        "domain": "climate",
        "action": "apply_state",
        "data": {"state": "off"},
    },
    "condition": {
        "operator": "numeric_greater",
        "entity_id": "sensor.temperatura_camera",
        "value": 24,
        "lower": None,
        "upper": None,
        "children": [],
        "minimum_duration_seconds": None,
        "hysteresis": 1,
    },
}


async def test_import_requires_admin(hass, hass_ws_client, hass_read_only_access_token):
    """Read-only users cannot import."""
    await _create_entry(hass)
    client = await hass_ws_client(hass, access_token=hass_read_only_access_token)
    response = await _request(client, _import(1, [_AC]))
    assert response["error"]["code"] == "unauthorized"


async def test_import_appends_inactive_profile_in_one_commit(hass, hass_ws_client):
    """Existing data is kept, the imported profile stays off and is recorded."""
    entry = await _create_entry(hass)
    client = await hass_ws_client(hass)
    existing = await _request(
        client,
        {
            "type": "schedule_creator/profile/create",
            "expected_revision": 1,
            "name": "Home",
            "profile_type": "exclusive",
        },
    )
    assert existing["success"], existing

    response = await _request(client, _import(2, [_AC]))
    assert response["success"], response
    assert response["result"]["revision"] == 3
    assert response["result"]["schedules"] == 1
    config = entry.runtime_data.storage.config.data
    assert [p.name for p in config.profiles] == ["Home", "Default (WSC)"]
    imported = config.profiles[1]
    assert response["result"]["profile_ids"] == [imported.id]
    assert imported.active is False and config.active_profile_ids == ()
    assert imported.order == config.profiles[0].order + 1
    schedule = config.schedules[0]
    assert schedule.profile_id == imported.id
    assert schedule.group_id == config.groups[0].id
    assert schedule.condition is not None and schedule.condition.hysteresis == 1
    history = config.migration_metadata["imports"]
    assert history[0]["source"] == "weekly-schedule-card"
    assert list(history[0]["profile_ids"]) == [imported.id]


async def test_invalid_import_changes_nothing(hass, hass_ws_client):
    """One bad schedule rejects the whole import."""
    entry = await _create_entry(hass)
    client = await hass_ws_client(hass)
    outside_group = {**_AC, "target_entity_ids": ["climate.other"]}
    response = await _request(client, _import(1, [_AC, outside_group]))
    assert response["error"]["code"] == "invalid_payload"
    unknown_field = {**_AC, "id": "x"}
    response = await _request(client, _import(1, [unknown_field]))
    assert response["error"]["code"] == "invalid_import"
    config = entry.runtime_data.storage.config.data
    assert config.revision == 1
    assert config.profiles == () and config.schedules == ()
