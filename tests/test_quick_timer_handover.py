"""A Quick Timer that outlives its slot hands over to the schedule running then.

Owner's example, in minutes: schedule 1 at 22 °C (10:00–12:00, end action
18 °C), schedule 2 at 20 °C (12:00–18:00), Quick Timer 24 °C started at 11:35
for one hour. At 12:35 schedule 2 must send 20 °C; the timer must not put back
22 °C (its snapshot) and schedule 1's end action must never be sent.
"""

from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from homeassistant import config_entries
from homeassistant.core import callback
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from custom_components.schedule_creator.const import DOMAIN

ENTITY = "climate.floor"


def _heat(temperature):
    return {"state": "heat", "temperature": temperature}


async def test_quick_timer_hands_over_to_the_next_schedule(
    hass, hass_ws_client, freezer
):
    """Timer inside slot 1, ending inside slot 2: slot 2 wins, nothing else."""
    zone = ZoneInfo("Europe/Rome")
    now = datetime.now(UTC).replace(second=0, microsecond=0) + timedelta(minutes=1)

    def at(minutes):
        return now + timedelta(minutes=minutes)

    def local(minutes):
        return at(minutes).astimezone(zone)

    freezer.move_to(now)
    await hass.config.async_update(time_zone="Europe/Rome")
    calls = []

    @callback
    def scene_apply(call):
        calls.append(call.data["entities"][ENTITY]["temperature"])
        for entity_id, desired in call.data["entities"].items():
            hass.states.async_set(entity_id, desired["state"], desired)

    hass.services.async_register("scene", "apply", scene_apply)
    hass.states.async_set(
        ENTITY, "heat", {"hvac_modes": ["heat", "off"], "temperature": 19}
    )
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
            "name": "Floor",
            "entity_ids": [ENTITY],
        }
    )

    def schedule(revision, name, start, end, temperature, end_action):
        return {
            "type": "schedule_creator/schedule/create",
            "expected_revision": revision,
            "profile_id": profile_id,
            "group_id": group["group"]["id"],
            "name": name,
            "enabled": True,
            "target_entity_ids": [ENTITY],
            "time_slots": [
                {
                    "weekdays": [local(start).weekday()],
                    "start": local(start).strftime("%H:%M"),
                    "end": local(end).strftime("%H:%M"),
                }
            ],
            "start_action": {
                "domain": "climate",
                "action": "apply_state",
                "data": _heat(temperature),
            },
            "end_action": end_action,
        }

    end_18 = {"domain": "climate", "action": "apply_state", "data": _heat(18)}
    await request(schedule(4, "10-12 at 22", 1, 3, 22, end_18))
    await request(schedule(5, "12-18 at 20", 3, 6, 20, None))
    await client.close()  # the frozen clock would drop the websocket

    async def move(minutes, seconds=1):
        when = at(minutes) + timedelta(seconds=seconds)
        freezer.move_to(when)
        async_fire_time_changed(hass, when)
        await hass.async_block_till_done()

    await move(1)  # 10:00 slot 1 starts
    assert calls == [22]

    await move(2)  # 11:35 Quick Timer 24 °C, as an automation starts it
    await hass.services.async_call(
        DOMAIN,
        "start_timer",
        {
            "entity_id": ENTITY,
            "duration": {"minutes": 2},
            "action": "apply_state",
            "data": _heat(24),
        },
        blocking=True,
    )
    await hass.async_block_till_done()
    assert calls == [22, 24]

    await move(3)  # 12:00 slot 1 ends, slot 2 starts: the timer keeps the device
    assert calls == [22, 24]

    await move(4, seconds=5)  # 12:35 the timer ends: slot 2 takes over
    assert calls == [22, 24, 20]
    assert hass.states.get(ENTITY).attributes["temperature"] == 20

    await move(5)  # nothing late: no 22 restore, no 18 end action of slot 1
    assert calls == [22, 24, 20]
