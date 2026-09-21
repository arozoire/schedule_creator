"""Test administrative profile mutations through Home Assistant WebSocket."""

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


async def _create_profile(
    client, revision, name, profile_type="shared", order=0
):
    return await _request(
        client,
        {
            "type": "schedule_creator/profile/create",
            "expected_revision": revision,
            "name": name,
            "profile_type": profile_type,
            "order": order,
        },
    )


async def test_profile_mutations_require_admin(
    hass, hass_ws_client, hass_read_only_access_token
):
    """An authenticated read-only user cannot change configuration."""
    entry = await _create_entry(hass)
    before = entry.runtime_data.storage.config.data
    client = await hass_ws_client(hass, access_token=hass_read_only_access_token)

    response = await _create_profile(client, 1, "Denied")

    assert response["success"] is False
    assert response["error"]["code"] == "unauthorized"
    assert entry.runtime_data.storage.config.data is before


async def test_profile_create_update_delete(hass, hass_ws_client):
    """CRUD advances config and record revisions exactly once per mutation."""
    entry = await _create_entry(hass)
    client = await hass_ws_client(hass)

    created = await _create_profile(client, 1, "Home", "exclusive", 2)
    assert created["success"] is True
    profile = created["result"]["profile"]
    profile_id = profile["id"]
    assert created["result"]["revision"] == 2
    assert profile["revision"] == 1
    assert profile["active"] is False
    assert profile["name"] == "Home"

    updated = await _request(
        client,
        {
            "type": "schedule_creator/profile/update",
            "expected_revision": 2,
            "profile_id": profile_id,
            "name": "Main home",
            "icon": "mdi:home",
        },
    )
    assert updated["result"]["revision"] == 3
    assert updated["result"]["profile"]["revision"] == 2
    assert updated["result"]["profile"]["name"] == "Main home"

    deleted = await _request(
        client,
        {
            "type": "schedule_creator/profile/delete",
            "expected_revision": 3,
            "profile_id": profile_id,
        },
    )
    assert deleted["result"] == {
        "revision": 4,
        "deleted_profile_id": profile_id,
    }
    config = entry.runtime_data.storage.config.data
    assert config is not None
    assert config.profiles == ()
    assert config.revision == 4


async def test_profile_mutation_errors_are_stable(hass, hass_ws_client):
    """Stale revisions, absent records and empty updates have stable codes."""
    await _create_entry(hass)
    client = await hass_ws_client(hass)
    created = await _create_profile(client, 1, "Home")
    profile_id = created["result"]["profile"]["id"]

    stale = await _request(
        client,
        {
            "type": "schedule_creator/profile/update",
            "expected_revision": 1,
            "profile_id": profile_id,
            "name": "Stale",
        },
    )
    assert stale["error"] == {
        "code": "revision_conflict",
        "message": "Configuration changed; current revision is 2.",
    }

    missing = await _request(
        client,
        {
            "type": "schedule_creator/profile/update",
            "expected_revision": 2,
            "profile_id": "ffffffff-ffff-4fff-8fff-ffffffffffff",
            "name": "Missing",
        },
    )
    assert missing["error"]["code"] == "not_found"

    empty = await _request(
        client,
        {
            "type": "schedule_creator/profile/update",
            "expected_revision": 2,
            "profile_id": profile_id,
        },
    )
    assert empty["error"] == {
        "code": "invalid_payload",
        "message": "Profile data is invalid.",
    }


async def test_profile_delete_rejects_owned_records(
    hass, hass_ws_client, hass_storage
):
    """A profile cannot be deleted while groups or schedules reference it."""
    bundle = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    hass_storage[CONFIG_STORE_KEY] = {
        "version": 1,
        "minor_version": 1,
        "key": CONFIG_STORE_KEY,
        "data": deepcopy(bundle["config"]),
    }
    entry = await _create_entry(hass)
    client = await hass_ws_client(hass)
    before = entry.runtime_data.storage.config.data

    response = await _request(
        client,
        {
            "type": "schedule_creator/profile/delete",
            "expected_revision": 4,
            "profile_id": bundle["config"]["profiles"][0]["id"],
        },
    )

    assert response["error"] == {
        "code": "profile_in_use",
        "message": "Profile still owns groups or schedules.",
    }
    assert entry.runtime_data.storage.config.data is before


async def test_profile_activation_enforces_type_semantics(hass, hass_ws_client):
    """Shared profiles coexist while a newly active exclusive replaces its peer."""
    entry = await _create_entry(hass)
    client = await hass_ws_client(hass)
    first = await _create_profile(client, 1, "First", "exclusive")
    shared = await _create_profile(client, 2, "Shared", "shared")
    second = await _create_profile(client, 3, "Second", "exclusive")
    first_id = first["result"]["profile"]["id"]
    shared_id = shared["result"]["profile"]["id"]
    second_id = second["result"]["profile"]["id"]

    for revision, profile_id in ((4, first_id), (5, shared_id), (6, second_id)):
        response = await _request(
            client,
            {
                "type": "schedule_creator/profile/set_active",
                "expected_revision": revision,
                "profile_id": profile_id,
                "active": True,
            },
        )
        assert response["success"] is True

    config = entry.runtime_data.storage.config.data
    assert config is not None
    states = {profile.id: profile.active for profile in config.profiles}
    assert states == {first_id: False, shared_id: True, second_id: True}
    assert set(config.active_profile_ids) == {shared_id, second_id}
    assert config.revision == 7

    changed_type = await _request(
        client,
        {
            "type": "schedule_creator/profile/update",
            "expected_revision": 7,
            "profile_id": shared_id,
            "profile_type": "exclusive",
        },
    )
    assert changed_type["success"] is True
    config = entry.runtime_data.storage.config.data
    assert config is not None
    assert config.revision == 8
    assert config.active_profile_ids == (shared_id,)
