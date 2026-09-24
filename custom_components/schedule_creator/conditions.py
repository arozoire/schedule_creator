"""Pure deterministic evaluation of structured schedule conditions."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from math import isfinite

from .models import ConditionNode, ConditionOperator


@dataclass(frozen=True, slots=True, kw_only=True)
class ConditionNodeEvaluation:
    """Evaluation memory for one condition node."""

    node_id: str
    matches: bool
    result: bool
    matching_since: datetime | None
    ready_at: datetime | None
    unmatching_since: datetime | None = None


@dataclass(frozen=True, slots=True, kw_only=True)
class ConditionEvaluation:
    """Immutable result and memory for one complete condition tree."""

    result: bool
    nodes: tuple[ConditionNodeEvaluation, ...]


def _utc(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() != timedelta(0):
        raise ValueError("now must be UTC")
    return value.astimezone(UTC)


def _number(value: str) -> float | None:
    try:
        parsed = float(value)
    except ValueError:
        return None
    return parsed if isfinite(parsed) else None


def _numeric_match(
    node: ConditionNode, value: float, was_matching: bool
) -> bool:
    hysteresis = node.hysteresis or 0.0
    operator = node.operator
    if operator is ConditionOperator.NUMERIC_RANGE:
        assert node.lower is not None
        assert node.upper is not None
        margin = hysteresis if was_matching else 0.0
        return node.lower - margin <= value <= node.upper + margin

    assert isinstance(node.value, int | float) and not isinstance(node.value, bool)
    threshold = float(node.value)
    if operator is ConditionOperator.NUMERIC_GREATER:
        return value > threshold - (hysteresis if was_matching else 0.0)
    if operator is ConditionOperator.NUMERIC_GREATER_OR_EQUAL:
        return value >= threshold - (hysteresis if was_matching else 0.0)
    if operator is ConditionOperator.NUMERIC_LESS:
        return value < threshold + (hysteresis if was_matching else 0.0)
    if operator is ConditionOperator.NUMERIC_LESS_OR_EQUAL:
        return value <= threshold + (hysteresis if was_matching else 0.0)
    raise AssertionError(f"unsupported numeric operator: {operator}")


def evaluate_condition(
    condition: ConditionNode,
    states: Mapping[str, str | None],
    now: datetime,
    previous: ConditionEvaluation | None = None,
) -> ConditionEvaluation:
    """Evaluate a condition tree from an explicit state-value snapshot.

    ``None`` and missing entity IDs are unavailable. The returned node records are
    the only history needed for minimum-duration and hysteresis semantics.
    """

    evaluated_at = _utc(now)
    history = (
        {}
        if previous is None
        else {evaluation.node_id: evaluation for evaluation in previous.nodes}
    )
    evaluations: list[ConditionNodeEvaluation] = []

    def evaluate(node: ConditionNode) -> bool:
        prior = history.get(node.id)
        operator = node.operator
        if operator in {ConditionOperator.AND, ConditionOperator.OR}:
            child_results = tuple(evaluate(child) for child in node.children)
            matches = (
                all(child_results)
                if operator is ConditionOperator.AND
                else any(child_results)
            )
        else:
            assert node.entity_id is not None
            state = states.get(node.entity_id)
            available = state is not None
            if operator is ConditionOperator.AVAILABLE:
                matches = available
            elif not available:
                matches = False
            elif operator is ConditionOperator.STATE_EQUALS:
                matches = state == node.value
            elif operator is ConditionOperator.STATE_NOT_EQUALS:
                matches = state != node.value
            else:
                assert state is not None
                numeric = _number(state)
                matches = numeric is not None and _numeric_match(
                    node,
                    numeric,
                    # A result held by the release delay keeps its hysteresis.
                    prior is not None and (prior.matches or prior.result),
                )

        was_result = prior is not None and prior.result
        duration = node.minimum_duration_seconds or 0.0
        release = node.release_delay_seconds or 0.0
        unmatching_since: datetime | None = None
        ready_at: datetime | None = None
        matching_since: datetime | None = None
        if matches:
            matching_since = (
                prior.matching_since
                if prior is not None and prior.matches and prior.matching_since
                else evaluated_at
            )
            # Matching again while a release delay holds the result keeps it true.
            result = was_result or (
                (evaluated_at - matching_since).total_seconds() >= duration
            )
            if not result:
                ready_at = matching_since + timedelta(seconds=duration)
        else:
            result = False
            if was_result and release > 0 and prior is not None:
                unmatching_since = (
                    prior.unmatching_since
                    if not prior.matches and prior.unmatching_since is not None
                    else evaluated_at
                )
                release_at = unmatching_since + timedelta(seconds=release)
                if evaluated_at < release_at:
                    result = True
                    ready_at = release_at
        evaluations.append(
            ConditionNodeEvaluation(
                node_id=node.id,
                matches=matches,
                result=result,
                matching_since=matching_since,
                ready_at=ready_at,
                unmatching_since=unmatching_since,
            )
        )
        return result

    result = evaluate(condition)
    return ConditionEvaluation(result=result, nodes=tuple(evaluations))
