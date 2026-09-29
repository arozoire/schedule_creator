"""Climate temperature limits are learned per HVAC mode."""

from homeassistant.core import State

from custom_components.schedule_creator.climate_limits import (
    ClimateLimitsCoordinator,
    learn_limits,
)


def _state(mode: str, low: float, high: float, **extra: object) -> State:
    return State("climate.altherma", mode, {"min_temp": low, "max_temp": high, **extra})


def test_limits_are_kept_per_mode() -> None:
    """Heat and cool keep their own limits; off and odd values teach nothing."""
    data: dict = {}
    assert learn_limits(data, _state("heat", 25, 55, target_temp_step=1))
    assert learn_limits(data, _state("cool", 5, 22))
    assert not learn_limits(data, _state("heat", 25, 55, target_temp_step=1))
    assert not learn_limits(data, _state("off", 7, 35))
    assert not learn_limits(data, _state("heat", 60, 20))
    assert not learn_limits(data, State("climate.altherma", "heat", {}))
    assert not learn_limits(data, State("sensor.t", "heat", {"min_temp": 1}))
    assert data == {
        "climate.altherma": {
            "heat": {"min": 25.0, "max": 55.0, "step": 1.0},
            "cool": {"min": 5.0, "max": 22.0},
        }
    }


async def test_coordinator_learns_current_and_changed_states(hass) -> None:
    """Existing climate states are read at start, later changes are followed."""
    hass.states.async_set("climate.altherma", "cool", {"min_temp": 5, "max_temp": 22})
    coordinator = ClimateLimitsCoordinator(hass)
    await coordinator.async_load()
    coordinator.start()
    hass.states.async_set("climate.altherma", "heat", {"min_temp": 25, "max_temp": 55})
    hass.states.async_set("light.lamp", "on", {"min_temp": 1, "max_temp": 2})
    await hass.async_block_till_done()
    assert coordinator.data == {
        "climate.altherma": {
            "cool": {"min": 5.0, "max": 22.0},
            "heat": {"min": 25.0, "max": 55.0},
        }
    }
    await coordinator.async_shutdown()
    again = ClimateLimitsCoordinator(hass)
    await again.async_load()
    assert again.data == coordinator.data
