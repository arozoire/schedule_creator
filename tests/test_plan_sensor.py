"""The compact weekly plan read by ESPHome displays."""

import json
from dataclasses import replace
from datetime import UTC, date, datetime, time
from pathlib import Path
from uuid import uuid4
from zoneinfo import ZoneInfo

import pytest

from custom_components.schedule_creator.models import (
    APPLY_STATE_ACTION,
    RESTORE_PREVIOUS_ACTION,
    ConditionBranch,
    IntegrationConfig,
    OccurrenceState,
    TargetAction,
    TimeSlot,
)
from custom_components.schedule_creator.plan import (
    action_code,
    compute_plan,
    plan_entity_ids,
    project_weeks,
    week_start,
)

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "models_v1.json"
ROME = ZoneInfo("Europe/Rome")
BIO = "climate.bio"
# Wednesday 30 September 2026, 07:00 in Rome.
NOW = datetime(2026, 9, 30, 5, 0, tzinfo=UTC)


def _action(domain: str, action: str, **data: object) -> TargetAction:
    return TargetAction(id=str(uuid4()), domain=domain, action=action, data=data)


HEAT_21 = _action("climate", APPLY_STATE_ACTION, state="heat", temperature=21)
OFF = _action("climate", APPLY_STATE_ACTION, state="off")


def _slot(weekdays: list[int], start: time, end: time, **sun: object) -> TimeSlot:
    return TimeSlot(
        id=str(uuid4()), weekdays=tuple(weekdays), start=start, end=end, **sun
    )


@pytest.fixture
def base() -> IntegrationConfig:
    bundle = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    return IntegrationConfig.from_dict(bundle["config"])


def _config(base: IntegrationConfig, *slots: TimeSlot, **changes) -> IntegrationConfig:
    schedule = replace(
        base.schedules[0],
        name="Bio",
        target_entity_ids=(BIO,),
        time_slots=slots,
        start_action=changes.pop("start_action", HEAT_21),
        end_action=changes.pop("end_action", OFF),
        condition=None,
        inclusion_dates=(),
        exclusion_dates=(),
        **changes,
    )
    return replace(base, schedules=(schedule,))


def _plan(config, *, now=NOW, runtime=(), state=None, attributes=None, sun=None):
    projected = project_weeks(config, week_start(now, ROME), ROME, sun)
    return compute_plan(
        config, projected, runtime, (), BIO, now, ROME, state, attributes
    )


def _sun(event: str, day: date) -> datetime:
    """Sunrise 05:00 UTC (07:00 in Rome), sunset 17:00 UTC."""
    return datetime.combine(day, time(5 if event == "sunrise" else 17), tzinfo=UTC)


def test_action_tokens() -> None:
    """State, then the main value with at most one decimal."""
    assert action_code(HEAT_21) == "heat:21"
    assert action_code(_action("climate", "set_temperature", temperature=21.5)) == (
        "set:21.5"
    )
    assert (
        action_code(
            _action("climate", "set_temperature", hvac_mode="cool", temperature=23.25)
        )
        == "cool:23.2"
    )
    assert (
        action_code(
            _action(
                "climate", "set_temperature", target_temp_low=19, target_temp_high=24
            )
        )
        == "set:19"
    )
    assert action_code(_action("switch", "turn_on")) == "turn_on"
    assert action_code(_action("cover", "set_cover_position", position=40)) == (
        "set_cover_position:40"
    )
    assert action_code(_action("valve", APPLY_STATE_ACTION, state="open")) == "open"
    assert action_code(_action("light", "turn_on", brightness=128)) == "turn_on:50"
    assert action_code(_action("fan", "turn_on", percentage=33)) == "turn_on:33"
    assert action_code(_action("climate", RESTORE_PREVIOUS_ACTION)) == "restore"
    assert action_code(None) == "none"


def test_week_starts_on_monday_and_splits_overnight_slots(base) -> None:
    """A slot over midnight shows on both days; empty days stay empty."""
    config = _config(
        base,
        _slot([0], time(22), time(2)),
        _slot([2], time(6, 30), time(8, 30)),
    )
    state, attrs = _plan(config)
    assert state == "idle"
    assert attrs["week_start"] == "2026-09-28"
    assert attrs["week"].split("/") == [
        "1320-1440@heat:21#0",
        "0-120@heat:21#0",
        "390-510@heat:21#0",
        "",
        "",
        "",
        "",
    ]
    assert attrs["today"] == "390-510@heat:21#0"
    assert attrs["schedules"] == "Bio"
    assert attrs["profile"] == "Home"
    assert attrs["truncated"] == "off"
    assert all(isinstance(value, str) for value in attrs.values())


def test_dates_and_sun_times_are_resolved(base) -> None:
    """Exclusions remove a day, inclusions add one, sunrise becomes minutes."""
    config = _config(
        base,
        _slot([2], time(6), time(9), start_sun="sunrise", start_offset_minutes=15),
        exclusion_dates=(date(2026, 9, 30),),
        inclusion_dates=(date(2026, 10, 3),),
    )
    _state, attrs = _plan(config, sun=_sun)
    week = attrs["week"].split("/")
    assert week[2] == ""
    assert week[5] == "435-540@heat:21#0"


def test_inactive_profile_has_no_plan(base) -> None:
    config = _config(base, _slot([2], time(6), time(9)))
    inactive = replace(
        config,
        profiles=(replace(config.profiles[0], active=False),),
        active_profile_ids=(),
    )
    state, attrs = _plan(inactive)
    assert state == "none"
    assert attrs["week"] == "//////"
    assert attrs["next"] == ""
    assert plan_entity_ids(inactive) == (BIO,)


def test_running_slot_reports_current_after_next_and_manual(base) -> None:
    """The running slot, what follows it and whether someone changed the device."""
    config = _config(
        base,
        _slot([2], time(6, 30), time(8, 30)),
        _slot([3], time(18), time(20)),
        end_action=_action("climate", RESTORE_PREVIOUS_ACTION),
    )
    projected = project_weeks(config, week_start(NOW, ROME), ROME, None)
    running = replace(
        projected[0],
        state=OccurrenceState.ACTIVE,
        condition_branch=ConditionBranch.TRUE,
    )
    state, attrs = _plan(
        config, runtime=(running,), state="heat", attributes={"temperature": 21.0}
    )
    assert state == "running"
    assert attrs["current"] == "390-510@heat:21#0"
    assert attrs["current_blocked"] == "off"
    assert attrs["after"] == "restore"
    assert attrs["next"] == "1080-1200@heat:21#0"
    assert attrs["next_start"] == "2026-10-01T18:00:00+02:00"
    assert attrs["manual"] == "off"

    _state, attrs = _plan(
        config, runtime=(running,), state="heat", attributes={"temperature": 22.5}
    )
    assert attrs["manual"] == "on"
    _state, attrs = _plan(config, runtime=(running,), state="off", attributes={})
    assert attrs["manual"] == "on"

    blocked = replace(running, condition_branch=ConditionBranch.FALSE)
    _state, attrs = _plan(config, runtime=(blocked,), state="off", attributes={})
    assert attrs["current_blocked"] == "on"
    assert attrs["manual"] == "off"


def test_more_than_twelve_slots_are_truncated(base) -> None:
    slots = [_slot([0], time(h), time(h, 30)) for h in range(13)]
    _state, attrs = _plan(_config(base, *slots))
    assert attrs["truncated"] == "on"
    assert len(attrs["week"].split("/")[0].split("|")) == 12
