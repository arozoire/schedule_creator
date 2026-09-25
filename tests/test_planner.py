"""Test deterministic occurrence projection without runtime side effects."""

import json
from dataclasses import replace
from datetime import UTC, date, datetime, time
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest

from custom_components.schedule_creator.models import IntegrationConfig, TimeSlot
from custom_components.schedule_creator.planner import plan_occurrences

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "models_v1.json"
ROME = ZoneInfo("Europe/Rome")


@pytest.fixture
def config() -> IntegrationConfig:
    """Load the canonical active schedule."""

    bundle = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    return IntegrationConfig.from_dict(bundle["config"])


def _window(start: str, end: str) -> tuple[datetime, datetime]:
    return datetime.fromisoformat(start).astimezone(UTC), datetime.fromisoformat(
        end
    ).astimezone(UTC)


def test_plans_frozen_occurrences_in_stable_order(config: IntegrationConfig) -> None:
    """Projection is stable, frozen and does not mutate configuration."""
    before = config.to_dict()
    start, end = _window("2026-09-14T00:00:00Z", "2026-09-17T00:00:00Z")

    first = plan_occurrences(config, start, end, ROME)
    second = plan_occurrences(config, start, end, ROME)

    assert [item.to_dict() for item in first] == [item.to_dict() for item in second]
    assert [item.local_start for item in first] == [
        "2026-09-14T18:30:00+02:00",
        "2026-09-15T18:30:00+02:00",
        "2026-09-16T18:30:00+02:00",
    ]
    assert first[0].frozen_schedule is config.schedules[0]
    assert first[0].id.endswith(first[0].local_start)
    assert config.to_dict() == before


def test_filters_inactive_disabled_and_exception_dates(
    config: IntegrationConfig,
) -> None:
    """Activation, enabled state and date exceptions gate projection."""
    schedule = replace(
        config.schedules[0],
        inclusion_dates=(date(2026, 9, 19),),
        exclusion_dates=(date(2026, 9, 14),),
    )
    configured = replace(config, schedules=(schedule,))
    start, end = _window("2026-09-14T00:00:00Z", "2026-09-20T00:00:00Z")

    planned = plan_occurrences(configured, start, end, ROME)
    assert date(2026, 9, 14) not in {
        datetime.fromisoformat(item.local_start).date() for item in planned
    }
    assert date(2026, 9, 19) in {
        datetime.fromisoformat(item.local_start).date() for item in planned
    }
    inactive = replace(configured.profiles[0], active=False)
    assert (
        plan_occurrences(
            replace(configured, profiles=(inactive,), active_profile_ids=()),
            start,
            end,
            ROME,
        )
        == ()
    )
    assert plan_occurrences(
        replace(configured, schedules=(replace(schedule, enabled=False),)),
        start,
        end,
        ROME,
    ) == ()


def test_overnight_occurrence_overlaps_window_start(config: IntegrationConfig) -> None:
    """A previous-day slot is retained when still active at window start."""
    slot = replace(config.schedules[0].time_slots[0], start=time(23), end=time(2))
    schedule = replace(config.schedules[0], time_slots=(slot,))
    configured = replace(config, schedules=(schedule,))
    start, end = _window("2026-09-14T23:30:00Z", "2026-09-14T23:45:00Z")

    planned = plan_occurrences(configured, start, end, ROME)

    assert len(planned) == 1
    assert planned[0].local_start == "2026-09-14T23:00:00+02:00"
    assert planned[0].local_end == "2026-09-15T02:00:00+02:00"


def test_dst_gap_and_overlap_have_explicit_policy(config: IntegrationConfig) -> None:
    """Spring gaps shift forward; autumn overlaps span both folds."""
    base_slot = config.schedules[0].time_slots[0]
    spring_slot = TimeSlot(
        id=base_slot.id,
        weekdays=(6,),
        start=time(2, 30),
        end=time(4),
    )
    spring = replace(
        config.schedules[0],
        time_slots=(spring_slot,),
        inclusion_dates=(),
        exclusion_dates=(),
    )
    start, end = _window("2026-03-29T00:00:00Z", "2026-03-29T05:00:00Z")
    planned = plan_occurrences(replace(config, schedules=(spring,)), start, end, ROME)
    assert planned[0].local_start == "2026-03-29T03:00:00+02:00"

    autumn_slot = replace(spring_slot, start=time(2, 30), end=time(2, 45))
    autumn = replace(spring, time_slots=(autumn_slot,))
    start, end = _window("2026-10-25T00:00:00Z", "2026-10-25T04:00:00Z")
    planned = plan_occurrences(replace(config, schedules=(autumn,)), start, end, ROME)
    assert planned[0].local_start == "2026-10-25T02:30:00+02:00"
    assert planned[0].local_end == "2026-10-25T02:45:00+01:00"
    assert (planned[0].end_utc - planned[0].start_utc).total_seconds() == 4500


def test_rejects_invalid_utc_windows(config: IntegrationConfig) -> None:
    """Planning windows must be increasing UTC instants."""
    aware = datetime(2026, 9, 15, tzinfo=UTC)
    with pytest.raises(ValueError, match="must be UTC"):
        plan_occurrences(config, aware.replace(tzinfo=None), aware, ROME)
    with pytest.raises(ValueError, match="must follow"):
        plan_occurrences(config, aware, aware, ROME)


def _with_slot(config: IntegrationConfig, **sun) -> IntegrationConfig:
    schedule = config.schedules[0]
    slot = replace(schedule.time_slots[0], **sun)
    return replace(config, schedules=(replace(schedule, time_slots=(slot,)),))


def _sun(event: str, day: date) -> datetime:
    """Fixed test sun: rises 05:00 UTC, sets 17:00 UTC every day."""
    return datetime.combine(day, time(5 if event == "sunrise" else 17), tzinfo=UTC)


def test_sun_start_follows_sunset_with_offset(config: IntegrationConfig) -> None:
    """Thirty minutes before sunset, until the fixed end time."""
    sunny = _with_slot(config, start_sun="sunset", start_offset_minutes=-30)
    start, end = _window("2026-09-14T00:00:00Z", "2026-09-15T00:00:00Z")

    [occurrence] = plan_occurrences(sunny, start, end, ROME, _sun)

    assert occurrence.start_utc == datetime(2026, 9, 14, 16, 30, tzinfo=UTC)
    assert occurrence.local_end == "2026-09-14T23:00:00+02:00"


def test_sunset_to_sunrise_ends_the_next_morning(config: IntegrationConfig) -> None:
    """A slot whose sun end precedes its start ends on the following day."""
    night = _with_slot(
        config, start_sun="sunset", end_sun="sunrise", end_offset_minutes=15
    )
    start, end = _window("2026-09-14T00:00:00Z", "2026-09-15T00:00:00Z")

    [occurrence] = plan_occurrences(night, start, end, ROME, _sun)

    assert occurrence.start_utc == datetime(2026, 9, 14, 17, tzinfo=UTC)
    assert occurrence.end_utc == datetime(2026, 9, 15, 5, 15, tzinfo=UTC)


def test_missing_sun_event_skips_the_day(config: IntegrationConfig) -> None:
    """Polar days without sunrise or sunset produce no occurrence."""
    sunny = _with_slot(config, start_sun="sunrise")
    start, end = _window("2026-09-14T00:00:00Z", "2026-09-17T00:00:00Z")

    assert plan_occurrences(sunny, start, end, ROME, lambda _event, _day: None) == ()
    assert plan_occurrences(sunny, start, end, ROME) == ()


def test_sun_fields_round_trip_and_stay_optional() -> None:
    """Fixed slots keep their old JSON; invalid sun events are rejected."""
    fixed = TimeSlot(
        id="12121212-1212-4212-8212-121212121212",
        weekdays=(0,),
        start=time(7),
        end=time(8),
    )
    assert "start_sun" not in fixed.to_dict()
    sunny = replace(fixed, start_sun="sunrise", start_offset_minutes=20)
    assert TimeSlot.from_dict(sunny.to_dict()) == sunny
    with pytest.raises(ValueError):
        replace(fixed, start_sun="noon")
    with pytest.raises(ValueError):
        replace(fixed, end_offset_minutes=10)
