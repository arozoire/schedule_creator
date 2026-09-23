"""Regression for the UI's switch payload through transport and real HA services."""

from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from homeassistant import config_entries
from homeassistant.core import callback
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from custom_components.schedule_creator.const import DOMAIN


async def test_switch_schedule_from_websocket_runs_at_both_boundaries(
    hass, hass_ws_client, freezer
):
    """UI ON/OFF actions execute at scheduled times without an open frontend."""
    now = datetime.now(UTC).replace(second=0, microsecond=0) + timedelta(minutes=1)
    start = (now + timedelta(minutes=1)).astimezone(ZoneInfo("Europe/Rome"))
    end = (now + timedelta(minutes=2)).astimezone(ZoneInfo("Europe/Rome"))
    freezer.move_to(now)
    await hass.config.async_update(time_zone="Europe/Rome")
    calls = []

    @callback
    def switch_service(call):
        calls.append(call.service)
        hass.states.async_set(
            "switch.ui_test", "on" if call.service == "turn_on" else "off"
        )

    hass.services.async_register("switch", "turn_on", switch_service)
    hass.services.async_register("switch", "turn_off", switch_service)
    hass.states.async_set("switch.ui_test", "off")
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

    p = await request(
        {
            "type": "schedule_creator/profile/create",
            "expected_revision": 1,
            "name": "Home",
            "profile_type": "shared",
        }
    )
    pid = p["profile"]["id"]
    await request(
        {
            "type": "schedule_creator/profile/set_active",
            "expected_revision": 2,
            "profile_id": pid,
            "active": True,
        }
    )
    g = await request(
        {
            "type": "schedule_creator/group/create",
            "expected_revision": 3,
            "profile_id": pid,
            "name": "Room",
            "entity_ids": ["switch.ui_test"],
        }
    )
    await request(
        {
            "type": "schedule_creator/schedule/create",
            "expected_revision": 4,
            "profile_id": pid,
            "group_id": g["group"]["id"],
            "name": "Test",
            "enabled": True,
            "target_entity_ids": ["switch.ui_test"],
            "time_slots": [
                {
                    "weekdays": [start.weekday()],
                    "start": start.strftime("%H:%M"),
                    "end": end.strftime("%H:%M"),
                }
            ],
            "start_action": {"domain": "switch", "action": "turn_on", "data": {}},
            "end_action": {"domain": "switch", "action": "turn_off", "data": {}},
        }
    )
    assert calls == []
    # Close the transport: the backend clock must execute without a dashboard.
    await client.close()
    for minute, expected in ((1, ["turn_on"]), (2, ["turn_on", "turn_off"])):
        when = now + timedelta(minutes=minute, seconds=1)
        freezer.move_to(when)
        async_fire_time_changed(hass, when)
        await hass.async_block_till_done()
        assert calls == expected
    assert hass.states.get("switch.ui_test").state == "off"
