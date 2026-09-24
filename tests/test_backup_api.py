"""Test configuration backup, restore and the full RESET command."""

from homeassistant import config_entries
from homeassistant.config_entries import ConfigEntryState

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


async def _populate(client) -> int:
    """Create an active profile with one group and one schedule."""
    profile = await _request(
        client,
        {
            "type": "schedule_creator/profile/create",
            "expected_revision": 1,
            "name": "Home",
            "profile_type": "exclusive",
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
            "name": "Room",
            "entity_ids": ["switch.backup_test"],
        },
    )
    schedule = await _request(
        client,
        {
            "type": "schedule_creator/schedule/create",
            "expected_revision": 4,
            "profile_id": profile_id,
            "group_id": group["result"]["group"]["id"],
            "name": "Morning",
            "enabled": True,
            "target_entity_ids": ["switch.backup_test"],
            "time_slots": [{"weekdays": [0, 1], "start": "07:00", "end": "08:00"}],
            "start_action": {"domain": "switch", "action": "turn_on", "data": {}},
            "end_action": None,
        },
    )
    assert schedule["success"], schedule
    return int(schedule["result"]["revision"])


async def test_backup_commands_require_admin(
    hass, hass_ws_client, hass_read_only_access_token
):
    """Read-only users can neither export, import nor reset."""
    await _create_entry(hass)
    client = await hass_ws_client(hass, access_token=hass_read_only_access_token)
    for message in (
        {"type": "schedule_creator/backup/export"},
        {
            "type": "schedule_creator/backup/import",
            "expected_revision": 1,
            "backup": {},
        },
        {"type": "schedule_creator/reset", "expected_revision": 1, "confirm": "RESET"},
    ):
        response = await _request(client, message)
        assert response["error"]["code"] == "unauthorized"


async def test_export_and_restore_round_trip_with_inactive_profiles(
    hass, hass_ws_client
):
    """A restore replaces the configuration and never activates profiles."""
    entry = await _create_entry(hass)
    client = await hass_ws_client(hass)
    revision = await _populate(client)

    exported = await _request(client, {"type": "schedule_creator/backup/export"})
    backup = exported["result"]
    assert backup["format"] == "schedule_creator.backup"
    assert backup["format_version"] == 1
    assert set(backup["config"]) == {
        "schema_version",
        "profiles",
        "groups",
        "schedules",
    }
    assert backup["config"]["profiles"][0]["active"] is True

    schedule_id = backup["config"]["schedules"][0]["id"]
    deleted = await _request(
        client,
        {
            "type": "schedule_creator/schedule/delete",
            "expected_revision": revision,
            "schedule_id": schedule_id,
        },
    )
    assert deleted["success"], deleted

    restored = await _request(
        client,
        {
            "type": "schedule_creator/backup/import",
            "expected_revision": revision + 1,
            "backup": backup,
        },
    )
    assert restored["success"], restored
    assert restored["result"] == {
        "revision": revision + 2,
        "profiles": 1,
        "groups": 1,
        "schedules": 1,
    }
    config = entry.runtime_data.storage.config.data
    assert config.schedules[0].id == schedule_id
    assert config.profiles[0].active is False
    assert config.active_profile_ids == ()


async def test_invalid_backup_changes_nothing(hass, hass_ws_client):
    """Wrong format, schema or content is rejected before any write."""
    entry = await _create_entry(hass)
    client = await hass_ws_client(hass)
    revision = await _populate(client)
    before = entry.runtime_data.storage.config.data
    exported = (await _request(client, {"type": "schedule_creator/backup/export"}))[
        "result"
    ]
    broken = {**exported, "config": {**exported["config"], "groups": [{"id": "x"}]}}
    for backup, code in (
        ({"format": "other"}, "invalid_format"),
        (
            {**exported, "config": {**exported["config"], "schema_version": 99}},
            "incompatible_backup",
        ),
        (broken, "invalid_payload"),
    ):
        response = await _request(
            client,
            {
                "type": "schedule_creator/backup/import",
                "expected_revision": revision,
                "backup": backup,
            },
        )
        assert response["error"]["code"] == code
    assert entry.runtime_data.storage.config.data is before


async def test_reset_requires_confirmation_and_current_revision(hass, hass_ws_client):
    """A wrong word or a stale draft leaves the loaded data untouched."""
    entry = await _create_entry(hass)
    client = await hass_ws_client(hass)
    revision = await _populate(client)

    wrong_word = await _request(
        client,
        {
            "type": "schedule_creator/reset",
            "expected_revision": revision,
            "confirm": "x",
        },
    )
    assert wrong_word["success"] is False
    stale = await _request(
        client,
        {
            "type": "schedule_creator/reset",
            "expected_revision": revision - 1,
            "confirm": "RESET",
        },
    )
    assert stale["error"]["code"] == "revision_conflict"
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.LOADED
    assert len(entry.runtime_data.storage.config.data.schedules) == 1


async def test_reset_empties_native_data_and_restarts_runtime(hass, hass_ws_client):
    """RESET deletes profiles, groups, schedules and runtime, keeping revisions."""
    entry = await _create_entry(hass)
    client = await hass_ws_client(hass)
    revision = await _populate(client)
    runtime_revision = entry.runtime_data.storage.runtime.data.revision

    response = await _request(
        client,
        {
            "type": "schedule_creator/reset",
            "expected_revision": revision,
            "confirm": "RESET",
        },
    )
    assert response["success"], response
    assert response["result"] == {"revision": revision + 1}
    await hass.async_block_till_done()

    assert entry.state is ConfigEntryState.LOADED
    config = entry.runtime_data.storage.config.data
    runtime = entry.runtime_data.storage.runtime.data
    assert (config.profiles, config.groups, config.schedules) == ((), (), ())
    assert config.revision == revision + 1
    assert runtime.revision > runtime_revision
    assert runtime.occurrences == ()
    assert runtime.leases == ()
    assert runtime.pending_operations == ()
    assert runtime.quick_timers == ()

    # A draft opened before the RESET is refused.
    stale = await _request(
        client,
        {
            "type": "schedule_creator/profile/create",
            "expected_revision": revision,
            "name": "Old draft",
            "profile_type": "shared",
        },
    )
    assert stale["error"]["code"] == "revision_conflict"
    state = await _request(client, {"type": "schedule_creator/get_state"})
    assert state["result"]["config"]["profiles"] == []
