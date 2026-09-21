"""Test clock-only occurrence lifecycle boundaries."""

import json
from copy import deepcopy
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch
from zoneinfo import ZoneInfo

from custom_components.schedule_creator.boundaries import (
    BOUNDARY_RETRY_INTERVAL,
    OccurrenceBoundaryCoordinator,
    async_advance_occurrence_states,
    next_occurrence_boundary,
)
from custom_components.schedule_creator.models import (
    IntegrationConfig,
    OccurrenceState,
)
from custom_components.schedule_creator.planner import plan_occurrences
from custom_components.schedule_creator.storage import (
    RuntimeRepository,
    empty_runtime,
)

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "models_v1.json"
NOW = datetime(2026, 9, 14, tzinfo=UTC)


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


def _projected():
    bundle = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    config = IntegrationConfig.from_dict(bundle["config"])
    return plan_occurrences(
        config,
        datetime(2026, 9, 15, tzinfo=UTC),
        datetime(2026, 9, 17, tzinfo=UTC),
        ZoneInfo("Europe/Rome"),
    )


async def _repository(hass, occurrences):
    store = MemoryJsonStore()
    repository = RuntimeRepository(hass, store)
    assert await repository.async_load() is None
    await repository.async_initialize(
        replace(empty_runtime(NOW), occurrences=occurrences)
    )
    return repository, store


async def test_boundaries_atomically_activate_and_complete(hass):
    """Start and end instants persist one transition each."""
    occurrence = _projected()[0]
    repository, store = await _repository(hass, (occurrence,))

    active = await async_advance_occurrence_states(repository, occurrence.start_utc)
    completed = await async_advance_occurrence_states(repository, occurrence.end_utc)

    assert active.occurrences[0].state is OccurrenceState.ACTIVE
    assert completed.occurrences[0].state is OccurrenceState.COMPLETED
    assert completed.revision == 2
    assert len(store.saves) == 3


async def test_overdue_pending_occurrence_completes_without_false_activation(hass):
    """Startup recovery skips active when the complete window was missed."""
    occurrence = _projected()[0]
    repository, _store = await _repository(hass, (occurrence,))

    result = await async_advance_occurrence_states(
        repository, occurrence.end_utc + timedelta(seconds=1)
    )

    assert result.occurrences[0].state is OccurrenceState.COMPLETED


async def test_next_boundary_selects_one_nearest_clock_instant(hass):
    """The coordinator needs only one callback regardless of occurrence count."""
    occurrences = _projected()
    repository, _store = await _repository(hass, occurrences)

    boundary = next_occurrence_boundary(repository.data, NOW)

    assert boundary == min(item.start_utc for item in occurrences)


async def test_coordinator_cancels_owned_callback_and_rejects_late_work(hass):
    """Shutdown cancels registration and makes a queued callback a no-op."""
    occurrence = _projected()[0]
    repository, _store = await _repository(hass, (occurrence,))
    cancel = Mock()
    with patch(
        "custom_components.schedule_creator.boundaries.async_track_point_in_utc_time",
        return_value=cancel,
    ) as track:
        coordinator = OccurrenceBoundaryCoordinator(hass, repository)
        coordinator.start(NOW)
        callback = track.call_args.args[1]
        coordinator.shutdown()
        await callback(occurrence.start_utc)

    cancel.assert_called_once_with()
    assert repository.data.occurrences[0].state is OccurrenceState.PENDING
    assert not coordinator.active


async def test_boundary_failure_registers_a_bounded_retry(hass):
    """A transient Store failure is contained and retried after one minute."""
    occurrence = _projected()[0]
    repository, _store = await _repository(hass, (occurrence,))
    cancel = Mock()
    tracker = Mock(return_value=cancel)
    with (
        patch(
            "custom_components.schedule_creator.boundaries."
            "async_track_point_in_utc_time",
            tracker,
        ),
        patch(
            "custom_components.schedule_creator.boundaries."
            "async_advance_occurrence_states",
            AsyncMock(side_effect=OSError("simulated Store failure")),
        ),
    ):
        coordinator = OccurrenceBoundaryCoordinator(hass, repository)
        coordinator.start(NOW)
        await coordinator._async_boundary(occurrence.start_utc)

    assert tracker.call_args.args[2] == occurrence.start_utc + BOUNDARY_RETRY_INTERVAL
    assert coordinator.active
