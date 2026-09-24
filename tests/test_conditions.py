"""Test pure structured condition evaluation."""

from dataclasses import replace
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from custom_components.schedule_creator.conditions import evaluate_condition
from custom_components.schedule_creator.models import ConditionNode, ConditionOperator

NOW = datetime(2026, 9, 22, 12, tzinfo=UTC)


def _node(
    operator: ConditionOperator,
    *,
    entity_id: str | None = "sensor.temperature",
    value: str | float | None = None,
    lower: float | None = None,
    upper: float | None = None,
    children: tuple[ConditionNode, ...] = (),
    duration: float | None = None,
    hysteresis: float | None = None,
) -> ConditionNode:
    return ConditionNode(
        id=str(uuid4()),
        operator=operator,
        entity_id=entity_id,
        value=value,
        lower=lower,
        upper=upper,
        children=children,
        minimum_duration_seconds=duration,
        hysteresis=hysteresis,
    )


@pytest.mark.parametrize(
    ("operator", "state", "expected"),
    [
        (ConditionOperator.STATE_EQUALS, "on", True),
        (ConditionOperator.STATE_EQUALS, "off", False),
        (ConditionOperator.STATE_NOT_EQUALS, "off", True),
        (ConditionOperator.STATE_NOT_EQUALS, None, False),
        (ConditionOperator.AVAILABLE, "unknown", True),
        (ConditionOperator.AVAILABLE, None, False),
    ],
)
def test_state_and_availability_operators(
    operator: ConditionOperator, state: str | None, expected: bool
) -> None:
    """State comparisons fail closed when an entity is unavailable."""
    value = "on" if operator is not ConditionOperator.AVAILABLE else None
    condition = _node(operator, value=value)

    result = evaluate_condition(condition, {"sensor.temperature": state}, NOW)

    assert result.result is expected


@pytest.mark.parametrize(
    ("operator", "value", "expected"),
    [
        (ConditionOperator.NUMERIC_GREATER, "10.1", True),
        (ConditionOperator.NUMERIC_GREATER, "10", False),
        (ConditionOperator.NUMERIC_GREATER_OR_EQUAL, "10", True),
        (ConditionOperator.NUMERIC_LESS, "9.9", True),
        (ConditionOperator.NUMERIC_LESS, "10", False),
        (ConditionOperator.NUMERIC_LESS_OR_EQUAL, "10", True),
        (ConditionOperator.NUMERIC_LESS, "not-a-number", False),
        (ConditionOperator.NUMERIC_LESS, "nan", False),
    ],
)
def test_numeric_threshold_operators(
    operator: ConditionOperator, value: str, expected: bool
) -> None:
    """Numeric comparisons preserve strict and inclusive boundaries."""
    condition = _node(operator, value=10.0)

    assert evaluate_condition(
        condition, {"sensor.temperature": value}, NOW
    ).result is expected


def test_numeric_range_is_inclusive() -> None:
    """Both declared range endpoints satisfy the condition."""
    condition = _node(ConditionOperator.NUMERIC_RANGE, lower=10, upper=20)

    assert evaluate_condition(condition, {"sensor.temperature": "10"}, NOW).result
    assert evaluate_condition(condition, {"sensor.temperature": "20"}, NOW).result
    assert not evaluate_condition(
        condition, {"sensor.temperature": "20.1"}, NOW
    ).result


def test_boolean_tree_evaluates_and_or_nodes() -> None:
    """Logical nodes compose child results without short-circuiting memory."""
    equals = _node(ConditionOperator.STATE_EQUALS, value="on")
    available = _node(
        ConditionOperator.AVAILABLE, entity_id="binary_sensor.window"
    )
    either = _node(
        ConditionOperator.OR,
        entity_id=None,
        children=(equals, available),
    )
    root = _node(
        ConditionOperator.AND,
        entity_id=None,
        children=(either, replace(equals, id=str(uuid4()))),
    )

    evaluation = evaluate_condition(
        root,
        {"sensor.temperature": "on", "binary_sensor.window": None},
        NOW,
    )

    assert evaluation.result
    assert len(evaluation.nodes) == 5


def test_minimum_duration_uses_explicit_previous_evaluation() -> None:
    """A continuous match becomes true only after its configured duration."""
    condition = _node(
        ConditionOperator.STATE_EQUALS, value="on", duration=30
    )
    first = evaluate_condition(condition, {"sensor.temperature": "on"}, NOW)
    early = evaluate_condition(
        condition,
        {"sensor.temperature": "on"},
        NOW + timedelta(seconds=29),
        first,
    )
    mature = evaluate_condition(
        condition,
        {"sensor.temperature": "on"},
        NOW + timedelta(seconds=30),
        early,
    )

    assert not first.result
    assert not early.result
    assert mature.result
    assert mature.nodes[0].matching_since == NOW


def test_minimum_duration_resets_after_a_mismatch() -> None:
    """An interruption starts a new duration window."""
    condition = _node(
        ConditionOperator.STATE_EQUALS, value="on", duration=10
    )
    first = evaluate_condition(condition, {"sensor.temperature": "on"}, NOW)
    broken = evaluate_condition(
        condition,
        {"sensor.temperature": "off"},
        NOW + timedelta(seconds=5),
        first,
    )
    restarted = evaluate_condition(
        condition,
        {"sensor.temperature": "on"},
        NOW + timedelta(seconds=10),
        broken,
    )

    assert not restarted.result
    assert restarted.nodes[0].matching_since == NOW + timedelta(seconds=10)


def test_hysteresis_retains_numeric_match_until_exit_threshold() -> None:
    """A prior greater-than match remains inside its hysteresis band."""
    condition = _node(
        ConditionOperator.NUMERIC_GREATER,
        value=10,
        hysteresis=2,
    )
    entered = evaluate_condition(condition, {"sensor.temperature": "11"}, NOW)
    retained = evaluate_condition(
        condition,
        {"sensor.temperature": "9"},
        NOW + timedelta(seconds=1),
        entered,
    )
    exited = evaluate_condition(
        condition,
        {"sensor.temperature": "8"},
        NOW + timedelta(seconds=2),
        retained,
    )

    assert entered.result
    assert retained.result
    assert not exited.result


def test_range_hysteresis_expands_both_exit_boundaries() -> None:
    """An active range retains values within the configured outer band."""
    condition = _node(
        ConditionOperator.NUMERIC_RANGE,
        lower=10,
        upper=20,
        hysteresis=2,
    )
    entered = evaluate_condition(condition, {"sensor.temperature": "15"}, NOW)

    assert evaluate_condition(
        condition,
        {"sensor.temperature": "9"},
        NOW + timedelta(seconds=1),
        entered,
    ).result
    assert not evaluate_condition(
        condition,
        {"sensor.temperature": "7.9"},
        NOW + timedelta(seconds=1),
        entered,
    ).result


def test_now_must_be_utc() -> None:
    """Time-dependent results reject ambiguous wall-clock inputs."""
    condition = _node(ConditionOperator.AVAILABLE)

    with pytest.raises(ValueError, match="UTC"):
        evaluate_condition(condition, {}, datetime(2026, 9, 22, 12))


def test_release_delay_holds_a_true_condition_through_short_dips() -> None:
    """Lux > 500 (hysteresis 100): close after 10 min, reopen after 15 min."""
    condition = replace(
        _node(
            ConditionOperator.NUMERIC_GREATER,
            entity_id="sensor.lux",
            value=500,
            duration=600,
            hysteresis=100,
        ),
        release_delay_seconds=900,
    )

    def at(minutes: float, lux: str, previous=None):
        return evaluate_condition(
            condition, {"sensor.lux": lux}, NOW + timedelta(minutes=minutes), previous
        )

    state = at(0, "700")
    assert state.result is False
    state = at(10, "700", state)
    assert state.result is True
    # A cloud: below the hysteresis band, but for less than the release delay.
    state = at(12, "300", state)
    assert state.result is True
    assert state.nodes[0].ready_at == NOW + timedelta(minutes=27)
    # Back above 400 (hysteresis kept while held): stays true, delay resets.
    state = at(20, "450", state)
    assert state.result is True
    state = at(21, "300", state)
    assert state.result is True
    state = at(36, "300", state)
    assert state.result is False


def test_release_delay_round_trips_and_is_omitted_when_unset() -> None:
    """Stored 0.3.6 conditions keep their JSON shape."""
    plain = _node(ConditionOperator.NUMERIC_GREATER, value=20)
    assert "release_delay_seconds" not in plain.to_dict()
    assert ConditionNode.from_dict(plain.to_dict()) == plain
    delayed = replace(plain, release_delay_seconds=60)
    assert delayed.to_dict()["release_delay_seconds"] == 60
    assert ConditionNode.from_dict(delayed.to_dict()) == delayed
