"""Test simple import files (schedule_creator.import): completed, previewed, added."""

import copy
import json
from datetime import UTC, datetime
from pathlib import Path

import pytest
from homeassistant import config_entries

from custom_components.schedule_creator.const import DOMAIN
from custom_components.schedule_creator.file_import import (
    import_file_profiles,
    imported_file_config,
)
from custom_components.schedule_creator.models import IntegrationConfig
from custom_components.schedule_creator.mutation_api import MutationClientError

EXAMPLE = json.loads(
    (
        Path(__file__).parents[1] / "docs/examples/heating-workdays.import.json"
    ).read_text(encoding="utf-8")
)
EMPTY = {
    "schema_version": 1,
    "revision": 1,
    "profiles": [],
    "active_profile_ids": [],
    "groups": [],
    "schedules": [],
    "settings": {"timezone_source": "home_assistant"},
    "migration_metadata": {"source": None},
    "updated_at": "2026-01-01T00:00:00Z",
}
NOW = datetime(2026, 11, 12, tzinfo=UTC)


def _file(**schedule):
    """One profile, one group, one schedule; overrides on the schedule."""
    document = copy.deepcopy(EXAMPLE)
    document["profiles"][0]["groups"][0]["schedules"][0].update(schedule)
    return document


def _error(document) -> str:
    with pytest.raises(MutationClientError) as err:
        imported_file_config(IntegrationConfig.from_dict(EMPTY), document, NOW)
    assert err.value.code == "invalid_import"
    return err.value.client_message


def test_example_is_completed_with_defaults() -> None:
    """Profile type, domain, data and group devices are filled in."""
    profiles = import_file_profiles(EXAMPLE, [])
    profile = profiles[0]
    assert profile["profile_type"] == "exclusive"
    schedule = profile["groups"][0]["schedules"][0]
    assert schedule["target_entity_ids"] == ["climate.office"]
    assert schedule["start_action"]["domain"] == "climate"
    config, _ = imported_file_config(IntegrationConfig.from_dict(EMPTY), EXAMPLE, NOW)
    assert [p.active for p in config.profiles] == [False]
    assert config.active_profile_ids == ()
    assert config.schedules[0].time_slots[0].weekdays == (0, 1, 2, 3, 4)
    assert (
        config.migration_metadata["imports"][0]["source"] == "schedule_creator.import"
    )


def test_lenient_fields() -> None:
    """Day names, sun boundaries without a clock time, leftover backup fields."""
    document = _file(
        id="not-a-uuid",
        revision=3,
        target_entity_ids="climate.office",
        time_slots=[
            {
                "weekdays": ["Monday", "weekend"],
                "start_sun": "sunrise",
                "start_offset_minutes": 30,
                "end": "10:00",
            }
        ],
    )
    document["profiles"][0]["groups"][0]["entity_ids"] = []
    schedule = import_file_profiles(document, [])[0]["groups"][0]["schedules"][0]
    slot = schedule["time_slots"][0]
    assert slot["weekdays"] == [0, 5, 6]
    assert slot["start"] == "07:30"
    assert "id" not in schedule and "revision" not in schedule
    group = import_file_profiles(document, [])[0]["groups"][0]
    assert group["entity_ids"] == ["climate.office"]


def test_name_in_use_gets_a_number() -> None:
    """A profile name already present is not reused."""
    profiles = import_file_profiles(EXAMPLE, ["home", "Home (2)"])
    assert profiles[0]["name"] == "Home (3)"


def test_errors_name_the_field() -> None:
    """Every refusal says where the file is wrong."""
    assert _error({"format": "schedule_creator.backup"}).startswith("file:")
    assert "time_slots[0].start" in _error(
        _file(time_slots=[{"weekdays": [0], "end": "10:00"}])
    )
    assert "unknown field(s) colour" in _error(_file(colour="red"))
    assert "weekdays[0]" in _error(
        _file(time_slots=[{"weekdays": [7], "start": "08:00", "end": "09:00"}])
    )
    assert "start_action" in _error(_file(start_action=None))
    message = _error(
        _file(time_slots=[{"weekdays": [0], "start": "8h", "end": "09:00"}])
    )
    assert message.startswith("profiles[0].groups[0].schedules[0]:")
    assert "time_slot.start" in message


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


async def test_preview_then_import(hass, hass_ws_client):
    """The preview saves nothing; the import appends an inactive profile."""
    entry = await _create_entry(hass)
    client = await hass_ws_client(hass)
    preview = await _request(
        client, {"type": "schedule_creator/import/file/preview", "file": EXAMPLE}
    )
    assert preview["success"], preview
    assert (
        preview["result"]["profiles"][0]["groups"][0]["schedules"][0]["name"]
        == "Office · workdays"
    )
    assert entry.runtime_data.storage.config.data.revision == 1

    bad = await _request(
        client,
        {"type": "schedule_creator/import/file/preview", "file": _file(colour="red")},
    )
    assert bad["error"]["code"] == "invalid_import"
    assert "colour" in bad["error"]["message"]

    response = await _request(
        client,
        {
            "type": "schedule_creator/import/file",
            "expected_revision": 1,
            "file": EXAMPLE,
        },
    )
    assert response["success"], response
    config = entry.runtime_data.storage.config.data
    assert response["result"]["profile_ids"] == [config.profiles[0].id]
    assert config.revision == 2
    assert config.profiles[0].active is False
    assert [s.name for s in config.schedules] == ["Office · workdays"]


async def test_file_import_requires_admin(
    hass, hass_ws_client, hass_read_only_access_token
):
    """Read-only users cannot preview or import."""
    await _create_entry(hass)
    client = await hass_ws_client(hass, access_token=hass_read_only_access_token)
    response = await _request(
        client, {"type": "schedule_creator/import/file/preview", "file": EXAMPLE}
    )
    assert response["error"]["code"] == "unauthorized"
