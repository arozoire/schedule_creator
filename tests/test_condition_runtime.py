"""Test Home Assistant condition-state reconciliation."""

import json
from copy import deepcopy
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch

from custom_components.schedule_creator.condition_runtime import (
    ConditionCoordinator,
    async_reconcile_condition_branches,
    condition_entity_ids,
)
from custom_components.schedule_creator.models import (
    ConditionBranch,
    Occurrence,
)
from custom_components.schedule_creator.storage import (
    RuntimeRepository,
    empty_runtime,
)

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "models_v1.json"
NOW = datetime(2026, 9, 15, 17, 5, tzinfo=UTC)


class MemoryJsonStore:
    """Minimal native Store double."""

    def __init__(self) -> None:
        self.data = None
        self.saves: list[dict] = []

    async def async_load(self):
        return deepcopy(self.data)

    async def async_save(self, data):
        self.data = deepcopy(data)
        self.saves.append(deepcopy(data))


def _occurrence() -> Occurrence:
    bundle = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    return replace(
        Occurrence.from_dict(bundle["occurrence"]),
        condition_branch=ConditionBranch.UNKNOWN,
        snapshot_ids=(),
        pending_operation_ids=(),
        last_operation_id=None,
    )


async def _repository(hass):
    store = MemoryJsonStore()
    repository = RuntimeRepository(hass, store)
    assert await repository.async_load() is None
    await repository.async_initialize(
        replace(empty_runtime(NOW), occurrences=(_occurrence(),))
    )
    return repository, store


def test_condition_entity_ids_deduplicates_tree_references() -> None:
    """The HA adapter subscribes once to each referenced entity."""
    condition = _occurrence().frozen_schedule.condition

    assert condition is not None
    assert condition_entity_ids(condition) == frozenset({"sensor.outdoor_lux"})


async def test_reconcile_reads_states_and_persists_duration_branch(hass) -> None:
    """Evaluation memory matures a continuously matching HA state."""
    repository, store = await _repository(hass)
    hass.states.async_set("sensor.outdoor_lux", "50")

    first, memory = await async_reconcile_condition_branches(
        hass, repository, NOW, {}
    )
    mature, memory = await async_reconcile_condition_branches(
        hass, repository, NOW + timedelta(seconds=30), memory
    )

    assert first.occurrences[0].condition_branch is ConditionBranch.FALSE
    assert mature.occurrences[0].condition_branch is ConditionBranch.TRUE
    assert len(memory) == 1
    assert len(store.saves) == 3


async def test_unknown_and_unavailable_states_fail_closed(hass) -> None:
    """HA sentinel states are adapted to an unavailable pure value."""
    repository, _store = await _repository(hass)
    hass.states.async_set("sensor.outdoor_lux", "unknown")

    unknown, memory = await async_reconcile_condition_branches(
        hass, repository, NOW, {}
    )
    hass.states.async_set("sensor.outdoor_lux", "unavailable")
    unavailable, _ = await async_reconcile_condition_branches(
        hass, repository, NOW + timedelta(seconds=1), memory
    )

    assert unknown.occurrences[0].condition_branch is ConditionBranch.FALSE
    assert unavailable.occurrences[0].condition_branch is ConditionBranch.FALSE


async def test_coordinator_tracks_entities_and_duration_deadline(hass) -> None:
    """The lifecycle owner promotes a mature condition and reconciles its lease."""
    repository, _store = await _repository(hass)
    hass.states.async_set("sensor.outdoor_lux", "50")
    cancel_states = Mock()
    cancel_deadline = Mock()
    with (
        patch(
            "custom_components.schedule_creator.condition_runtime."
            "async_track_state_change_event",
            return_value=cancel_states,
        ) as track_states,
        patch(
            "custom_components.schedule_creator.condition_runtime."
            "async_track_point_in_utc_time",
            return_value=cancel_deadline,
        ) as track_deadline,
    ):
        coordinator = ConditionCoordinator(hass, repository)
        await coordinator.async_refresh(NOW)
        coordinator.start(NOW)
        deadline_callback = track_deadline.call_args.args[1]

        await deadline_callback(NOW + timedelta(seconds=30))

        assert track_states.call_args.args[1] == {"sensor.outdoor_lux"}
        assert track_deadline.call_args_list[0].args[2] == NOW + timedelta(seconds=30)
        assert repository.data.occurrences[0].condition_branch is ConditionBranch.TRUE
        assert len(repository.data.leases) == 1
        coordinator.shutdown()

    assert cancel_states.called
    assert cancel_deadline.called


async def test_sensor_update_without_branch_change_skips_downstream(hass) -> None:
    """Leases, snapshots and actions are not recomputed for an idle sensor tick."""
    repository, _store = await _repository(hass)
    hass.states.async_set("sensor.outdoor_lux", "50")
    downstream = AsyncMock()
    coordinator = ConditionCoordinator(hass, repository, downstream)
    await coordinator.async_refresh(NOW)
    downstream.reset_mock()
    revision = repository.data.revision

    await coordinator._async_refresh_if_changed(NOW + timedelta(seconds=1))

    downstream.assert_not_awaited()
    assert repository.data.revision == revision
