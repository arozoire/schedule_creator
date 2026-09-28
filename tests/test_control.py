"""Test services and entities that let automations control Schedule Creator."""

from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from homeassistant import config_entries
from homeassistant.const import EntityCategory
from homeassistant.core import callback
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import entity_registry as er

from custom_components.schedule_creator.const import DOMAIN
from custom_components.schedule_creator.models import QuickTimerState


async def _create_entry(hass):
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    await hass.config_entries.flow.async_configure(result["flow_id"], {})
    await hass.async_block_till_done()
    return hass.config_entries.async_entries(DOMAIN)[0]


async def _request(client, message):
    await client.send_json_auto_id(message)
    response = await client.receive_json(timeout=5)
    assert response["success"], response
    return response["result"]


async def _populate(hass, hass_ws_client):
    """Two exclusive profiles, a group and one schedule in the first profile."""
    hass.states.async_set("switch.control_test", "off")
    entry = await _create_entry(hass)
    client = await hass_ws_client(hass)
    home = await _request(
        client,
        {
            "type": "schedule_creator/profile/create",
            "expected_revision": 1,
            "name": "Home",
            "profile_type": "exclusive",
        },
    )
    away = await _request(
        client,
        {
            "type": "schedule_creator/profile/create",
            "expected_revision": 2,
            "name": "Away",
            "profile_type": "exclusive",
        },
    )
    group = await _request(
        client,
        {
            "type": "schedule_creator/group/create",
            "expected_revision": 3,
            "profile_id": home["profile"]["id"],
            "name": "Room",
            "entity_ids": ["switch.control_test"],
        },
    )
    schedule = await _request(
        client,
        {
            "type": "schedule_creator/schedule/create",
            "expected_revision": 4,
            "profile_id": home["profile"]["id"],
            "group_id": group["group"]["id"],
            "name": "Morning",
            "target_entity_ids": ["switch.control_test"],
            "time_slots": [{"weekdays": [0], "start": "07:00", "end": "08:00"}],
            "start_action": {"domain": "switch", "action": "turn_on", "data": {}},
        },
    )
    await hass.async_block_till_done()
    return entry, client, home["profile"], away["profile"], schedule["schedule"]


def _profiles(entry):
    return {p.name: p.active for p in entry.runtime_data.storage.config.data.profiles}


async def test_profile_switches_and_service(hass, hass_ws_client):
    """Switches mirror profiles; the service accepts names."""
    entry, _client, _home, _away, _schedule = await _populate(hass, hass_ws_client)
    assert hass.states.get("switch.schedule_creator_profile_home").state == "off"
    assert hass.states.get("sensor.schedule_creator_next_slot") is not None

    await hass.services.async_call(
        "switch",
        "turn_on",
        {"entity_id": "switch.schedule_creator_profile_home"},
        blocking=True,
    )
    await hass.async_block_till_done()
    assert _profiles(entry) == {"Home": True, "Away": False}
    assert hass.states.get("switch.schedule_creator_profile_home").state == "on"

    await hass.services.async_call(
        DOMAIN, "set_profile", {"profile": "away"}, blocking=True
    )
    await hass.async_block_till_done()
    assert _profiles(entry) == {"Home": False, "Away": True}
    # Asking for the current state again is not an error.
    await hass.services.async_call(
        DOMAIN, "set_profile", {"profile": "Away", "active": True}, blocking=True
    )
    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN, "set_profile", {"profile": "Nowhere"}, blocking=True
        )


async def test_schedule_switch_and_removal(hass, hass_ws_client):
    """Schedules can be disabled, and deleted records lose their entity."""
    entry, client, _home, _away, schedule = await _populate(hass, hass_ws_client)
    entity_id = "switch.schedule_creator_schedule_morning"
    assert hass.states.get(entity_id).state == "on"

    await hass.services.async_call(
        DOMAIN, "set_schedule", {"schedule": "morning", "enabled": False}, blocking=True
    )
    await hass.async_block_till_done()
    assert entry.runtime_data.storage.config.data.schedules[0].enabled is False
    assert hass.states.get(entity_id).state == "off"

    revision = entry.runtime_data.storage.config.data.revision
    await _request(
        client,
        {
            "type": "schedule_creator/schedule/delete",
            "expected_revision": revision,
            "schedule_id": schedule["id"],
        },
    )
    await hass.async_block_till_done()
    assert er.async_get(hass).async_get(entity_id) is None


async def test_quick_timer_services(hass, hass_ws_client):
    """A timer can be started and cancelled from an automation."""
    entry, _client, _home, _away, _schedule = await _populate(hass, hass_ws_client)

    await hass.services.async_call(
        DOMAIN,
        "start_timer",
        {"entity_id": "switch.control_test", "duration": timedelta(minutes=5)},
        blocking=True,
    )
    timers = entry.runtime_data.storage.runtime.data.quick_timers
    assert [(t.entity_id, t.state) for t in timers] == [
        ("switch.control_test", QuickTimerState.ACTIVE)
    ]
    assert timers[0].action.action == "turn_on"

    await hass.services.async_call(
        DOMAIN, "cancel_timer", {"entity_id": "switch.control_test"}, blocking=True
    )
    timers = entry.runtime_data.storage.runtime.data.quick_timers
    assert timers[0].state is QuickTimerState.CANCELLED
    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN, "cancel_timer", {"entity_id": "switch.control_test"}, blocking=True
        )


async def test_entities_stay_out_of_automatic_dashboards(hass, hass_ws_client):
    """Switches are configuration and the sensor is diagnostic."""
    await _populate(hass, hass_ws_client)
    registry = er.async_get(hass)
    switch = registry.async_get("switch.schedule_creator_profile_home")
    sensor = registry.async_get("sensor.schedule_creator_next_slot")
    assert switch.entity_category is EntityCategory.CONFIG
    assert sensor.entity_category is EntityCategory.DIAGNOSTIC


PLAN = "sensor.schedule_creator_plan_switch_control_test"


async def test_plan_sensor_follows_configuration(hass, hass_ws_client, freezer):
    """One plan per scheduled entity, created and removed with the schedules."""
    # Wednesday 30 September 2026, 12:00 UTC.
    freezer.move_to(datetime(2026, 9, 30, 12, tzinfo=UTC))
    await hass.config.async_update(time_zone="UTC")
    entry, client, home, _away, schedule = await _populate(hass, hass_ws_client)
    registry = er.async_get(hass)
    assert registry.async_get(PLAN).entity_category is EntityCategory.DIAGNOSTIC
    assert hass.states.get(PLAN).state == "none"

    await hass.services.async_call(
        DOMAIN, "set_profile", {"profile": home["id"]}, blocking=True
    )
    await hass.async_block_till_done()
    state = hass.states.get(PLAN)
    assert state.state == "idle"
    assert state.attributes["week"] == "420-480@turn_on#0//////"
    assert state.attributes["week_start"] == "2026-09-28"
    assert state.attributes["schedules"] == "Morning"
    assert state.attributes["next_start"] == "2026-10-05T07:00:00+00:00"

    revision = entry.runtime_data.storage.config.data.revision
    await _request(
        client,
        {
            "type": "schedule_creator/schedule/delete",
            "expected_revision": revision,
            "schedule_id": schedule["id"],
        },
    )
    await hass.async_block_till_done()
    assert registry.async_get(PLAN) is None


async def test_resume_sends_the_running_slot_again(hass, hass_ws_client, freezer):
    """Resume repeats the start action of a running slot; otherwise nothing."""
    now = datetime.now(UTC).replace(second=0, microsecond=0) + timedelta(minutes=1)
    freezer.move_to(now)
    await hass.config.async_update(time_zone="Europe/Rome")
    start = (now - timedelta(minutes=1)).astimezone(ZoneInfo("Europe/Rome"))
    end = (now + timedelta(minutes=30)).astimezone(ZoneInfo("Europe/Rome"))
    calls = []

    @callback
    def switch_service(call):
        calls.append(call.service)
        hass.states.async_set(
            "switch.control_test", "on" if call.service == "turn_on" else "off"
        )

    entry, client, home, _away, _schedule = await _populate(hass, hass_ws_client)
    hass.services.async_register("switch", "turn_on", switch_service)
    hass.services.async_register("switch", "turn_off", switch_service)

    # Nothing is running yet: no command and no error.
    await hass.services.async_call(
        DOMAIN, "resume", {"entity_id": "switch.control_test"}, blocking=True
    )
    assert calls == []

    config = entry.runtime_data.storage.config.data
    await _request(
        client,
        {
            "type": "schedule_creator/schedule/update",
            "expected_revision": config.revision,
            "schedule_id": config.schedules[0].id,
            "time_slots": [
                {
                    "weekdays": [start.weekday()],
                    "start": start.strftime("%H:%M"),
                    "end": end.strftime("%H:%M"),
                }
            ],
        },
    )
    await hass.services.async_call(
        DOMAIN, "set_profile", {"profile": home["id"]}, blocking=True
    )
    await hass.async_block_till_done()
    assert calls == ["turn_on"]
    assert hass.states.get(PLAN).state == "running"

    # Someone switches it off by hand: the engine leaves it, resume restores.
    hass.states.async_set("switch.control_test", "off")
    await hass.async_block_till_done()
    assert hass.states.get(PLAN).attributes["manual"] == "on"
    await hass.services.async_call(
        DOMAIN, "resume", {"entity_id": ["switch.control_test"]}, blocking=True
    )
    await hass.async_block_till_done()
    assert calls == ["turn_on", "turn_on"]
    assert hass.states.get(PLAN).attributes["manual"] == "off"
