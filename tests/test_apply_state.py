"""Climate desired states run as one scene.apply per boundary."""

from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from homeassistant import config_entries
from homeassistant.core import callback
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from custom_components.schedule_creator.const import DOMAIN
from custom_components.schedule_creator.models import (
    ModelValidationError,
    TargetAction,
)

ACTION_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301"


def test_apply_state_requires_a_state() -> None:
    """The desired state must name the target state, e.g. an HVAC mode."""
    with pytest.raises(ModelValidationError):
        TargetAction(
            schema_version=1,
            id=ACTION_ID,
            domain="climate",
            action="apply_state",
            data={"temperature": 23},
        )


async def test_climate_schedule_applies_desired_state_at_both_boundaries(
    hass, hass_ws_client, freezer
):
    """Mode, temperature and fan are reproduced by HA through scene.apply."""
    now = datetime.now(UTC).replace(second=0, microsecond=0) + timedelta(minutes=1)
    start = (now + timedelta(minutes=1)).astimezone(ZoneInfo("Europe/Rome"))
    end = (now + timedelta(minutes=2)).astimezone(ZoneInfo("Europe/Rome"))
    freezer.move_to(now)
    await hass.config.async_update(time_zone="Europe/Rome")
    calls = []

    @callback
    def scene_apply(call):
        calls.append(call.data["entities"])
        for entity_id, desired in call.data["entities"].items():
            hass.states.async_set(entity_id, desired["state"])

    hass.services.async_register("scene", "apply", scene_apply)
    hass.states.async_set("climate.ui_test", "off", {"hvac_modes": ["cool", "off"]})
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
            "name": "Camera",
            "entity_ids": ["climate.ui_test"],
        }
    )
    desired = {"state": "cool", "temperature": 23, "fan_mode": "quiet"}
    await request(
        {
            "type": "schedule_creator/schedule/create",
            "expected_revision": 4,
            "profile_id": profile_id,
            "group_id": group["group"]["id"],
            "name": "AC",
            "enabled": True,
            "target_entity_ids": ["climate.ui_test"],
            "time_slots": [
                {
                    "weekdays": [start.weekday()],
                    "start": start.strftime("%H:%M"),
                    "end": end.strftime("%H:%M"),
                }
            ],
            "start_action": {
                "domain": "climate",
                "action": "apply_state",
                "data": desired,
            },
            "end_action": {
                "domain": "climate",
                "action": "apply_state",
                "data": {"state": "off"},
            },
        }
    )
    await client.close()
    expected = [
        [{"climate.ui_test": desired}],
        [{"climate.ui_test": desired}, {"climate.ui_test": {"state": "off"}}],
    ]
    for minute, calls_after in zip((1, 2), expected, strict=True):
        when = now + timedelta(minutes=minute, seconds=1)
        freezer.move_to(when)
        async_fire_time_changed(hass, when)
        await hass.async_block_till_done()
        assert calls == calls_after
    assert hass.states.get("climate.ui_test").state == "off"
