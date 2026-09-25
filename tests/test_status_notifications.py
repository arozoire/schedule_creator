"""Live status notifications, tap links and their settings."""

from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from homeassistant import config_entries
from homeassistant.components import persistent_notification
from homeassistant.core import callback
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from custom_components.schedule_creator.const import DOMAIN
from custom_components.schedule_creator.status_notifications import notification_id


async def _setup(hass, hass_ws_client):
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    await hass.config_entries.flow.async_configure(result["flow_id"], {})
    await hass.async_block_till_done()
    client = await hass_ws_client(hass)

    async def request(payload):
        await client.send_json_auto_id(payload)
        response = await client.receive_json(timeout=5)
        assert response["success"], response
        return response["result"]

    return hass.config_entries.async_entries(DOMAIN)[0], request


async def _profile_group(request, entity_id):
    profile = await request(
        {
            "type": "schedule_creator/profile/create",
            "expected_revision": 1,
            "name": "Home",
            "profile_type": "shared",
        }
    )
    profile_id = profile["profile"]["id"]
    await request(
        {
            "type": "schedule_creator/profile/set_active",
            "expected_revision": 2,
            "profile_id": profile_id,
            "active": True,
        }
    )
    group = await request(
        {
            "type": "schedule_creator/group/create",
            "expected_revision": 3,
            "profile_id": profile_id,
            "name": "Room",
            "entity_ids": [entity_id],
        }
    )
    return profile_id, group["group"]["id"]


async def test_status_flag_and_url_are_stored_in_settings(hass, hass_ws_client):
    """The opt-in follows create, update and delete; the URL must be a path."""
    entry, request = await _setup(hass, hass_ws_client)
    profile_id, group_id = await _profile_group(request, "switch.status_test")
    created = await request(
        {
            "type": "schedule_creator/schedule/create",
            "expected_revision": 4,
            "profile_id": profile_id,
            "group_id": group_id,
            "name": "S",
            "target_entity_ids": ["switch.status_test"],
            "time_slots": [{"weekdays": [0], "start": "08:00", "end": "09:00"}],
            "start_action": {"domain": "switch", "action": "turn_on", "data": {}},
            "status_notification": True,
        }
    )
    schedule_id = created["schedule"]["id"]
    settings = entry.runtime_data.storage.config.data.settings
    assert list(settings["status_notification_schedule_ids"]) == [schedule_id]

    await request(
        {
            "type": "schedule_creator/schedule/update",
            "expected_revision": 5,
            "schedule_id": schedule_id,
            "status_notification": False,
        }
    )
    settings = entry.runtime_data.storage.config.data.settings
    assert list(settings["status_notification_schedule_ids"]) == []

    result = await request(
        {
            "type": "schedule_creator/settings/update",
            "expected_revision": 6,
            "notification_url": "/lovelace/casa",
        }
    )
    assert result["settings"]["notification_url"] == "/lovelace/casa"
    assert result["settings"]["timezone_source"] == "home_assistant"


async def test_notification_url_rejects_external_links(hass, hass_ws_client):
    """Only dashboard paths are accepted, never arbitrary URLs."""
    await _setup(hass, hass_ws_client)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "schedule_creator/settings/update",
            "expected_revision": 1,
            "notification_url": "https://example.com",
        }
    )
    response = await client.receive_json(timeout=5)
    assert response["success"] is False


async def test_status_notification_follows_the_slot_and_links_dashboard(
    hass, hass_ws_client, freezer
):
    """A persistent notification appears in the slot and is dismissed after it."""
    now = datetime.now(UTC).replace(second=0, microsecond=0) + timedelta(minutes=1)
    start = (now + timedelta(minutes=1)).astimezone(ZoneInfo("Europe/Rome"))
    end = (now + timedelta(minutes=2)).astimezone(ZoneInfo("Europe/Rome"))
    freezer.move_to(now)
    await hass.config.async_update(time_zone="Europe/Rome")
    sent = []

    @callback
    def switch_service(call):
        hass.states.async_set(
            "switch.status_test", "on" if call.service == "turn_on" else "off"
        )

    @callback
    def notify_service(call):
        sent.append(dict(call.data))

    hass.services.async_register("switch", "turn_on", switch_service)
    hass.services.async_register("switch", "turn_off", switch_service)
    hass.services.async_register("notify", "phone", notify_service)
    hass.states.async_set("switch.status_test", "off")
    _entry, request = await _setup(hass, hass_ws_client)
    profile_id, group_id = await _profile_group(request, "switch.status_test")
    await request(
        {
            "type": "schedule_creator/settings/update",
            "expected_revision": 4,
            "notification_url": "/lovelace/casa",
        }
    )
    created = await request(
        {
            "type": "schedule_creator/schedule/create",
            "expected_revision": 5,
            "profile_id": profile_id,
            "group_id": group_id,
            "name": "Presa",
            "target_entity_ids": ["switch.status_test"],
            "time_slots": [
                {
                    "weekdays": [start.weekday()],
                    "start": start.strftime("%H:%M"),
                    "end": end.strftime("%H:%M"),
                }
            ],
            "start_action": {"domain": "switch", "action": "turn_on", "data": {}},
            "start_notification": {
                "action": "notify.phone",
                "title": "Presa",
                "message": "Accesa",
            },
            "status_notification": True,
        }
    )
    status_id = notification_id(created["schedule"]["id"])

    when = now + timedelta(minutes=1, seconds=1)
    freezer.move_to(when)
    async_fire_time_changed(hass, when)
    await hass.async_block_till_done()
    notifications = persistent_notification._async_get_or_create_notifications(hass)
    assert status_id in notifications
    assert notifications[status_id]["message"].startswith("▶")
    assert "/lovelace/casa" in notifications[status_id]["message"]
    assert sent == [
        {
            "title": "Presa",
            "message": "Accesa",
            "data": {"clickAction": "/lovelace/casa", "url": "/lovelace/casa"},
        }
    ]

    when = now + timedelta(minutes=2, seconds=1)
    freezer.move_to(when)
    async_fire_time_changed(hass, when)
    await hass.async_block_till_done()
    assert status_id not in persistent_notification._async_get_or_create_notifications(
        hass
    )
