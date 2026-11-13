"""A Quick Timer owns its entity until it ends, then hands it back by the rules.

Owner's rules (0.6.0): the timer wins until its end even when schedules start
or end meanwhile; at its end the entity takes the schedule running then,
otherwise what the schedules left (e.g. the end action of a slot that ended
during the timer), otherwise its previous state. Cancelling, or resuming the
schedule, is the timer running out now. One timer per entity.

Times are minutes after the start of the test; the comments use the owner's
example (slot 1 10:00–12:00 at 22 °C, slot 2 12:00–18:00 at 20 °C, timer 24 °C
from 11:35).
"""

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
        for revision, (start, end, temperature, end_temp) in enumerate(slots, 4):
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


async def test_timer_wins_over_a_slot_starting_meanwhile(hass, hass_ws_client, freezer):
    """Owner's example: 22, 24, nothing at 12:00, 20 at 12:35."""
    home = _Home(hass, freezer, _start())
    await home.setup(hass_ws_client, [(1, 3, 22, 18), (3, 6, 20, None)])
    await home.move(1)  # 10:00 slot 1
    assert home.calls == [22]
    await home.move(2)  # 11:35 timer 24 °C
    await home.timer(2, 24)
    assert home.calls == [22, 24]
    await home.move(3)  # 12:00 slot 1 ends (18 skipped), slot 2 starts: timer wins
    assert home.calls == [22, 24]
    await home.move(4, seconds=5)  # 12:35 the timer ends: slot 2 takes over
    assert home.calls == [22, 24, 20]
    await home.move(5)  # nothing late: no 22 restore, no 18
    assert home.calls == [22, 24, 20]


async def test_end_action_skipped_by_the_timer_comes_at_its_end(
    hass, hass_ws_client, freezer
):
    """Slot ends during the timer and nothing follows: its end action, not 22."""
    home = _Home(hass, freezer, _start())
    await home.setup(hass_ws_client, [(1, 3, 22, 18)])
    await home.move(1)
    await home.move(2)
    await home.timer(2, 24)
    await home.move(3)  # slot ends under the timer
    assert home.calls == [22, 24]
    await home.move(4, seconds=5)
    assert home.calls == [22, 24, 18]


async def test_no_schedule_at_all_restores_the_previous_state(
    hass, hass_ws_client, freezer
):
    """Without schedules the timer puts back what was there."""
    home = _Home(hass, freezer, _start())
    await home.setup(hass_ws_client, [(10, 12, 22, None)])
    await home.move(1)
    await home.timer(1, 24)
    assert home.calls == [24]
    await home.move(2, seconds=5)
    assert home.calls == [24, 19]


async def test_cancelling_is_the_timer_running_out_now(hass, hass_ws_client, freezer):
    """Cancel inside a slot: the slot's temperature comes back at once."""
    home = _Home(hass, freezer, _start())
    await home.setup(hass_ws_client, [(1, 6, 22, None)])
    await home.move(1)
    await home.move(2)
    await home.timer(30, 24)
    assert home.calls == [22, 24]
    await home.service("cancel_timer")
    assert home.calls == [22, 24, 22]
    await home.move(3)
    assert home.calls == [22, 24, 22]


async def test_resume_ends_the_timer_and_gives_back_the_schedule(
    hass, hass_ws_client, freezer
):
    """schedule_creator.resume during a timer: timer over, the slot applies."""
    home = _Home(hass, freezer, _start())
    await home.setup(hass_ws_client, [(1, 6, 22, None)])
    await home.move(1)
    await home.move(2)
    await home.timer(30, 24)
    await home.service("resume", entity_id=[ENTITY])
    assert home.calls == [22, 24, 22]
    runtime = hass.config_entries.async_entries(DOMAIN)[0].runtime_data
    timers = runtime.storage.runtime.data.quick_timers
    assert [timer.state.value for timer in timers] == ["cancelled"]


async def test_stove_evening(hass, hass_ws_client, freezer):
    """Day 29 then night 32; stove timer 25 across the change: 32 at its end."""
    home = _Home(hass, freezer, _start())
    await home.setup(hass_ws_client, [(1, 3, 29, None), (3, 8, 32, None)])
    await home.move(1)  # day 29
    await home.move(2)  # 20:00 stove: 25 for "5 h"
    await home.timer(3, 25)
    await home.move(3)  # 21:30 night slot starts: the timer keeps 25
    assert home.calls == [29, 25]
    await home.move(5, seconds=5)  # 01:00 timer over: night 32
    assert home.calls == [29, 25, 32]


async def test_slot_inside_the_timer_leaves_its_state(hass, hass_ws_client, freezer):
    """A slot that starts and ends during the timer, without end action: its 21."""
    home = _Home(hass, freezer, _start())
    await home.setup(hass_ws_client, [(2, 3, 21, None)])
    await home.move(1)
    await home.timer(3, 24)
    await home.move(2)
    await home.move(3)
    assert home.calls == [24]
    await home.move(4, seconds=5)
    assert home.calls == [24, 21]


async def test_card_preview_follows_the_schedules(hass, hass_ws_client, freezer):
    """While the timer runs, get_state already says what comes at its end."""
    from custom_components.schedule_creator.websocket_api import _resume

    home = _Home(hass, freezer, _start())
    await home.setup(hass_ws_client, [(1, 3, 29, None), (3, 8, 32, None)])
    await home.move(1)
    await home.move(2)
    await home.timer(3, 25)
    runtime = hass.config_entries.async_entries(DOMAIN)[0].runtime_data
    data = runtime.storage.runtime.data
    resume = _resume(data, data.quick_timers[0])
    assert resume["kind"] == "schedule"
    assert resume["schedule_name"] == "32 °C"
    assert resume["action"]["data"]["temperature"] == 32
