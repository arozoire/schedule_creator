"""Test administrative group mutations through Home Assistant WebSocket."""

import json
from copy import deepcopy
from pathlib import Path

from homeassistant import config_entries

from custom_components.schedule_creator.const import DOMAIN
from custom_components.schedule_creator.storage import CONFIG_STORE_KEY

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


async def _create_profile(client, revision=1):
    response = await _request(
        client,
        {
            "type": "schedule_creator/profile/create",
            "expected_revision": revision,
            "name": "Home",
            "profile_type": "shared",
        },
    )
    return response["result"]["profile"]["id"]


async def _create_group(client, revision, profile_id, name="Living"):
    return await _request(
        client,
        {
            "type": "schedule_creator/group/create",
            "expected_revision": revision,
            "profile_id": profile_id,
            "name": name,
            "entity_ids": ["light.living_room"],
        },
    )


def _store_fixture(hass_storage, config):
    hass_storage[CONFIG_STORE_KEY] = {
        "version": 1,
        "minor_version": 1,
        "key": CONFIG_STORE_KEY,
        "data": deepcopy(config),
    }


async def test_group_mutations_require_admin(
    hass, hass_ws_client, hass_read_only_access_token
):
    """A read-only user cannot create groups."""
    entry = await _create_entry(hass)
    before = entry.runtime_data.storage.config.data
    client = await hass_ws_client(hass, access_token=hass_read_only_access_token)

    response = await _create_group(
        client, 1, "ffffffff-ffff-4fff-8fff-ffffffffffff"
    )

    assert response["error"]["code"] == "unauthorized"
    assert entry.runtime_data.storage.config.data is before


async def test_group_create_update_delete(hass, hass_ws_client):
    """Group CRUD advances configuration and record revisions exactly once."""
    entry = await _create_entry(hass)
    client = await hass_ws_client(hass)
    profile_id = await _create_profile(client)

    created = await _create_group(client, 2, profile_id)
    group = created["result"]["group"]
    group_id = group["id"]
    assert created["result"]["revision"] == 3
    assert group["revision"] == 1
    assert group["profile_id"] == profile_id

    updated = await _request(
        client,
        {
            "type": "schedule_creator/group/update",
            "expected_revision": 3,
            "group_id": group_id,
            "name": "Main room",
            "entity_ids": ["light.living_room", "switch.floor_lamp"],
            "order": 2,
        },
    )
    assert updated["result"]["revision"] == 4
    assert updated["result"]["group"]["revision"] == 2
    assert updated["result"]["group"]["name"] == "Main room"

    deleted = await _request(
        client,
        {
            "type": "schedule_creator/group/delete",
            "expected_revision": 4,
            "group_id": group_id,
        },
    )
    assert deleted["result"] == {
        "revision": 5,
        "deleted_group_id": group_id,
    }
    config = entry.runtime_data.storage.config.data
    assert config is not None
    assert config.groups == ()


async def test_group_mutation_errors_are_stable(hass, hass_ws_client):
    """Missing parents, stale revisions, absent groups and empty updates are stable."""
    await _create_entry(hass)
    client = await hass_ws_client(hass)

    missing_profile = await _create_group(
        client, 1, "ffffffff-ffff-4fff-8fff-ffffffffffff"
    )
    assert missing_profile["error"] == {
        "code": "not_found",
        "message": "Profile was not found.",
    }

    profile_id = await _create_profile(client)
    created = await _create_group(client, 2, profile_id)
    group_id = created["result"]["group"]["id"]

    stale = await _request(
        client,
        {
            "type": "schedule_creator/group/update",
            "expected_revision": 2,
            "group_id": group_id,
            "name": "Stale",
        },
    )
    assert stale["error"]["code"] == "revision_conflict"

    missing = await _request(
        client,
        {
            "type": "schedule_creator/group/update",
            "expected_revision": 3,
            "group_id": "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
            "name": "Missing",
        },
    )
    assert missing["error"] == {
        "code": "not_found",
        "message": "Group was not found.",
    }

    empty = await _request(
        client,
        {
            "type": "schedule_creator/group/update",
            "expected_revision": 3,
            "group_id": group_id,
        },
    )
    assert empty["error"] == {
        "code": "invalid_payload",
        "message": "Group data is invalid.",
    }


async def test_group_delete_rejects_owned_schedules(
    hass, hass_ws_client, hass_storage
):
    """A group cannot be deleted while a schedule references it."""
    bundle = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    _store_fixture(hass_storage, bundle["config"])
    entry = await _create_entry(hass)
    client = await hass_ws_client(hass)
    before = entry.runtime_data.storage.config.data

    response = await _request(
        client,
        {
            "type": "schedule_creator/group/delete",
            "expected_revision": 4,
            "group_id": bundle["config"]["groups"][0]["id"],
        },
    )

    assert response["error"] == {
        "code": "group_in_use",
        "message": "Group still owns one or more schedules.",
    }
    assert entry.runtime_data.storage.config.data is before


async def test_group_update_cannot_orphan_schedule_targets(
    hass, hass_ws_client, hass_storage
):
    """Entity membership cannot be reduced below existing schedule targets."""
    bundle = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    _store_fixture(hass_storage, bundle["config"])
    entry = await _create_entry(hass)
    client = await hass_ws_client(hass)
    before = entry.runtime_data.storage.config.data

    response = await _request(
        client,
        {
            "type": "schedule_creator/group/update",
            "expected_revision": 4,
            "group_id": bundle["config"]["groups"][0]["id"],
            "entity_ids": [],
        },
    )

    assert response["error"] == {
        "code": "invalid_payload",
        "message": "Group data is invalid.",
    }
    assert entry.runtime_data.storage.config.data is before
