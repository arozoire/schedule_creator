"""A conditional slot whose condition turns true again resends its start (#81)."""

from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from homeassistant import config_entries
from homeassistant.core import callback
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from custom_components.schedule_creator.const import DOMAIN

ENTITY = "climate.floor"


def _heat(temperature):
    return {
        "domain": "climate",
        "action": "apply_state",
        "data": {"state": "heat", "temperature": temperature},
    }


class _Home:
    """One entity, schedules from a list, the clock moved by minutes."""

    def __init__(self, hass, freezer, now):
        self.hass, self.freezer, self.now = hass, freezer, now
        self.calls: list[float] = []

    def at(self, minutes):
        return self.now + timedelta(minutes=minutes)

    async def setup(self, hass_ws_client, slots):
        hass, zone = self.hass, ZoneInfo("Europe/Rome")
        self.freezer.move_to(self.now)
        await hass.config.async_update(time_zone="Europe/Rome")

        @callback
        def scene_apply(call):
            desired = call.data["entities"][ENTITY]
            self.calls.append(desired["temperature"])
            hass.states.async_set(ENTITY, desired["state"], desired)

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
        for revision, (start, end, temperature, end_temp, condition) in enumerate(
            slots, 4
        ):
            first = self.at(start).astimezone(zone)
            last = self.at(end).astimezone(zone)
            await request(
                {
                    "type": "schedule_creator/schedule/create",
                    "expected_revision": revision,
                    "profile_id": profile_id,
                    "group_id": group["group"]["id"],
                    "name": f"{temperature} °C",
                    "enabled": True,
                    "target_entity_ids": [ENTITY],
                    "time_slots": [
                        {
                            "weekdays": [first.weekday()],
                            "start": first.strftime("%H:%M"),
                            "end": last.strftime("%H:%M"),
                        }
                    ],
                    "start_action": _heat(temperature),
                    "end_action": None if end_temp is None else _heat(end_temp),
                    "condition": condition,
                }
            )
        await client.close()  # the frozen clock would drop the websocket

    async def move(self, minutes, seconds=1):
        when = self.at(minutes) + timedelta(seconds=seconds)
        self.freezer.move_to(when)
        async_fire_time_changed(self.hass, when)
        await self.hass.async_block_till_done()

    async def service(self, name, **data):
        await self.hass.services.async_call(
            DOMAIN, name, {"entity_id": ENTITY, **data}, blocking=True
        )
        await self.hass.async_block_till_done()

    async def timer(self, minutes, temperature):
        action = _heat(temperature)
        await self.service(
            "start_timer",
            duration={"minutes": minutes},
            action=action["action"],
            data=action["data"],
        )


def _start():
    return datetime.now(UTC).replace(second=0, microsecond=0) + timedelta(minutes=1)


COND = {"operator": "state_equals", "entity_id": "input_boolean.home", "value": "on"}


async def test_condition_turning_true_inside_its_slot(hass, hass_ws_client, freezer):
    hass.states.async_set("input_boolean.home", "off")
    home = _Home(hass, freezer, _start())
    await home.setup(hass_ws_client, [(1, 10, 18, None, None), (3, 8, 22, None, COND)])
    await home.move(1)
    assert home.calls == [18]
    await home.move(3)
    assert home.calls == [18]
    await home.move(4)
    hass.states.async_set("input_boolean.home", "on")
    await hass.async_block_till_done()
    assert home.calls == [18, 22]


async def test_condition_flapping_inside_its_slot(hass, hass_ws_client, freezer):
    hass.states.async_set("input_boolean.home", "on")
    home = _Home(hass, freezer, _start())
    await home.setup(hass_ws_client, [(1, 10, 18, None, None), (3, 8, 22, None, COND)])
    await home.move(1)
    await home.move(3)
    assert home.calls == [18, 22]
    await home.move(4)
    hass.states.async_set("input_boolean.home", "off")
    await hass.async_block_till_done()
    assert home.calls == [18, 22, 18]
    await home.move(5)
    hass.states.async_set("input_boolean.home", "on")
    await hass.async_block_till_done()
    assert home.calls == [18, 22, 18, 22]
