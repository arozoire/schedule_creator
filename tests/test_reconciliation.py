"""Test idempotent occurrence reconciliation into the runtime Store."""

import asyncio
import json
from copy import deepcopy
from dataclasses import replace
from datetime import UTC, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest

from custom_components.schedule_creator.models import (
    ConditionBranch,
    IntegrationConfig,
    OccurrenceState,
    Snapshot,
)
from custom_components.schedule_creator.planner import plan_occurrences
from custom_components.schedule_creator.reconciliation import (
    async_reconcile_occurrences,
    async_reconcile_window,
    async_replan_window,
)
from custom_components.schedule_creator.storage import (
    RuntimeRepository,
    empty_runtime,
)

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "models_v1.json"
ROME = ZoneInfo("Europe/Rome")
NOW = datetime(2026, 9, 14, tzinfo=UTC)


class MemoryJsonStore:
    """Minimal Store double retaining every authoritative save."""

    def __init__(self) -> None:
        self.data = None
        self.saves: list[dict] = []

    async def async_load(self):
        return deepcopy(self.data)

    async def async_save(self, data):
        self.data = deepcopy(data)
        self.saves.append(deepcopy(data))


@pytest.fixture
def config() -> IntegrationConfig:
    bundle = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    return IntegrationConfig.from_dict(bundle["config"])


async def _repository(hass) -> tuple[RuntimeRepository, MemoryJsonStore]:
    store = MemoryJsonStore()
    repository = RuntimeRepository(hass, store)
    assert await repository.async_load() is None
    await repository.async_initialize(empty_runtime(NOW))
    return repository, store


def _project(config: IntegrationConfig, start_day: int, end_day: int):
    return plan_occurrences(
        config,
        datetime(2026, 9, start_day, tzinfo=UTC),
        datetime(2026, 9, end_day, tzinfo=UTC),
        ROME,
    )


async def test_reconciliation_persists_missing_occurrences_once(hass, config):
    """One non-empty reconciliation advances runtime revision once."""
    repository, store = await _repository(hass)
    projected = _project(config, 14, 17)

    updated = await async_reconcile_occurrences(repository, projected, NOW)

    assert updated.revision == 1
    assert updated.occurrences == projected
    assert len(store.saves) == 2


async def test_identical_reconciliation_is_a_store_no_op(hass, config):
    """Repeating a projection does not save or advance runtime revision."""
    repository, store = await _repository(hass)
    projected = _project(config, 14, 17)
    first = await async_reconcile_occurrences(repository, projected, NOW)

    second = await async_reconcile_occurrences(repository, projected, NOW)

    assert second is first
    assert second.revision == 1
    assert len(store.saves) == 2


async def test_existing_occurrence_wins_on_stable_id_collision(hass, config):
    """Reconciliation never replaces frozen or operational occurrence state."""
    repository, store = await _repository(hass)
    projected = _project(config, 14, 15)
    await async_reconcile_occurrences(repository, projected, NOW)
    existing = replace(projected[0], state=OccurrenceState.ACTIVE)
    await repository.async_update(
        lambda current: replace(
            current,
            revision=current.revision + 1,
            occurrences=(existing,),
            updated_at=current.updated_at,
        )
    )
    saves_before = len(store.saves)

    result = await async_reconcile_occurrences(repository, projected, NOW)

    assert result.occurrences == (existing,)
    assert result.occurrences[0].state is OccurrenceState.ACTIVE
    assert len(store.saves) == saves_before


async def test_adjacent_windows_are_additive_and_keep_history(hass, config):
    """Later bounded windows add new IDs without removing earlier records."""
    repository, _store = await _repository(hass)
    first = _project(config, 14, 16)
    second = _project(config, 16, 18)

    await async_reconcile_occurrences(repository, first, NOW)
    result = await async_reconcile_occurrences(repository, second, NOW)

    expected = tuple(
        sorted(
            {item.id: item for item in (*first, *second)}.values(),
            key=lambda item: (item.start_utc, item.end_utc, item.id),
        )
    )
    assert result.occurrences == expected
    assert result.revision == 2


async def test_concurrent_window_reconciliation_remains_idempotent(hass, config):
    """The repository lock prevents duplicate records and duplicate commits."""
    repository, store = await _repository(hass)
    start = datetime(2026, 9, 14, tzinfo=UTC)
    end = datetime(2026, 9, 17, tzinfo=UTC)

    results = await asyncio.gather(
        async_reconcile_window(repository, config, start, end, ROME, NOW),
        async_reconcile_window(repository, config, start, end, ROME, NOW),
    )

    assert results[0].occurrences == results[1].occurrences
    assert repository.data.revision == 1
    assert len({item.id for item in repository.data.occurrences}) == 3
    assert len(store.saves) == 2


async def test_replan_replaces_safe_future_frozen_revision(hass, config):
    """A configuration edit replaces future pending materialization."""
    repository, _store = await _repository(hass)
    start = datetime(2026, 9, 14, tzinfo=UTC)
    end = datetime(2026, 9, 17, tzinfo=UTC)
    original = _project(config, 14, 17)
    await async_reconcile_occurrences(repository, original, start)
    changed_schedule = replace(
        config.schedules[0], revision=4, name="Changed"
    )
    changed = replace(config, schedules=(changed_schedule,))

    result = await async_replan_window(
        repository, changed, start, end, ROME, start
    )

    assert {item.id for item in result.occurrences} == {
        item.id for item in original
    }
    assert {item.frozen_schedule.revision for item in result.occurrences} == {4}
    assert {item.frozen_schedule.name for item in result.occurrences} == {"Changed"}


async def test_replan_preserves_persisted_condition_branch(hass, config):
    """An unchanged future occurrence keeps its evaluated runtime branch."""
    repository, store = await _repository(hass)
    start = datetime(2026, 9, 14, tzinfo=UTC)
    end = datetime(2026, 9, 17, tzinfo=UTC)
    original = _project(config, 14, 17)
    evaluated = tuple(
        replace(item, condition_branch=ConditionBranch.FALSE) for item in original
    )
    await repository.async_update(
        lambda current: replace(
            current,
            revision=current.revision + 1,
            occurrences=evaluated,
        )
    )
    saves_before = len(store.saves)

    result = await async_replan_window(
        repository, config, start, end, ROME, start
    )

    assert result.occurrences == evaluated
    assert len(store.saves) == saves_before


async def test_replan_removes_disabled_future_occurrences(hass, config):
    """Disabled schedules no longer retain safe future pending records."""
    repository, _store = await _repository(hass)
    start = datetime(2026, 9, 14, tzinfo=UTC)
    end = datetime(2026, 9, 17, tzinfo=UTC)
    await async_reconcile_occurrences(repository, _project(config, 14, 17), start)
    disabled = replace(
        config, schedules=(replace(config.schedules[0], enabled=False),)
    )

    result = await async_replan_window(
        repository, disabled, start, end, ROME, start
    )

    assert result.occurrences == ()


async def test_replan_preserves_history_outside_future_scope(hass, config):
    """Past materialization is retained while later pending records are removed."""
    repository, _store = await _repository(hass)
    original = _project(config, 14, 18)
    await async_reconcile_occurrences(repository, original, NOW)
    disabled = replace(
        config, schedules=(replace(config.schedules[0], enabled=False),)
    )
    start = datetime(2026, 9, 15, tzinfo=UTC)
    end = datetime(2026, 9, 18, tzinfo=UTC)

    result = await async_replan_window(
        repository, disabled, start, end, ROME, start
    )

    assert result.occurrences == (original[0],)


async def test_replan_preserves_started_occurrence_on_collision(hass, config):
    """A started record wins even when its frozen configuration is stale."""
    repository, store = await _repository(hass)
    start = datetime(2026, 9, 14, tzinfo=UTC)
    end = datetime(2026, 9, 15, tzinfo=UTC)
    projected = _project(config, 14, 15)
    await async_reconcile_occurrences(repository, projected, start)
    active = replace(projected[0], state=OccurrenceState.ACTIVE)
    await repository.async_update(
        lambda current: replace(
            current,
            revision=current.revision + 1,
            occurrences=(active,),
            updated_at=current.updated_at,
        )
    )
    changed = replace(
        config,
        schedules=(replace(config.schedules[0], revision=4, name="Changed"),),
    )
    saves_before = len(store.saves)

    result = await async_replan_window(
        repository, changed, start, end, ROME, start
    )

    assert result.occurrences == (active,)
    assert len(store.saves) == saves_before


async def test_replan_temporal_edit_replaces_occurrence_ids(hass, config):
    """Changing slot time drops old safe IDs and materializes new ones."""
    repository, _store = await _repository(hass)
    start = datetime(2026, 9, 14, tzinfo=UTC)
    end = datetime(2026, 9, 17, tzinfo=UTC)
    original = _project(config, 14, 17)
    await async_reconcile_occurrences(repository, original, start)
    moved_slot = replace(config.schedules[0].time_slots[0], start=time(19))
    changed = replace(
        config,
        schedules=(replace(config.schedules[0], time_slots=(moved_slot,)),),
    )

    result = await async_replan_window(
        repository, changed, start, end, ROME, start
    )

    assert {item.id for item in result.occurrences}.isdisjoint(
        item.id for item in original
    )
    assert {item.local_start[11:19] for item in result.occurrences} == {"19:00:00"}


_IN_SLOT = datetime(2026, 9, 14, 17, tzinfo=UTC)  # Monday 19:00 in Rome


async def _running(hass, config, *, snapshot=False):
    """A slot of the fixture schedule started at 18:30 and still running."""
    repository, _store = await _repository(hass)
    first = _project(config, 14, 15)[0]
    active = replace(first, state=OccurrenceState.ACTIVE)
    snapshots = ()
    if snapshot:
        bundle = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
        snapshots = (
            replace(Snapshot.from_dict(bundle["snapshot"]), occurrence_id=first.id),
        )
        active = replace(active, snapshot_ids=(snapshots[0].id,))
    await repository.async_update(
        lambda current: replace(
            current,
            revision=current.revision + 1,
            occurrences=(active,),
            snapshots=snapshots,
        )
    )
    return repository, active


async def _replan(repository, config):
    return await async_replan_window(
        repository, config, _IN_SLOT, _IN_SLOT + timedelta(days=1), ROME, _IN_SLOT
    )


async def test_running_slot_is_cancelled_when_its_schedule_stops(hass, config):
    """Disabling the schedule (or its profile) ends the slot in progress."""
    repository, active = await _running(hass, config)
    disabled = replace(
        config, schedules=(replace(config.schedules[0], enabled=False),)
    )

    result = await _replan(repository, disabled)

    assert [(item.id, item.state) for item in result.occurrences] == [
        (active.id, OccurrenceState.CANCELLED)
    ]


async def test_running_slot_keeps_going_after_a_rename(hass, config):
    """Names and notifications do not interrupt a running slot."""
    repository, active = await _running(hass, config)
    renamed = replace(
        config,
        schedules=(replace(config.schedules[0], revision=5, name="Renamed"),),
    )

    result = await _replan(repository, renamed)

    running = [item for item in result.occurrences if item.start_utc <= _IN_SLOT]
    assert running == [active]


async def test_running_slot_is_replaced_when_its_action_changes(hass, config):
    """The new version takes over now and keeps the pre-slot snapshot."""
    repository, active = await _running(hass, config, snapshot=True)
    schedule = config.schedules[0]
    changed = replace(
        config,
        schedules=(
            replace(
                schedule,
                revision=5,
                start_action=replace(
                    schedule.start_action, data={"brightness": 10}
                ),
            ),
        ),
    )

    result = await _replan(repository, changed)

    old = next(item for item in result.occurrences if item.id == active.id)
    new = next(
        item
        for item in result.occurrences
        if item.id != active.id and item.start_utc == active.start_utc
    )
    assert old.state is OccurrenceState.CANCELLED
    assert new.id == f"{active.id}#r5"
    assert new.state is OccurrenceState.PENDING
    assert new.condition_branch is active.condition_branch
    assert new.frozen_schedule.start_action.data == {"brightness": 10}
    copied = next(item for item in result.snapshots if item.occurrence_id == new.id)
    assert new.snapshot_ids == (copied.id,)
    assert copied.state == result.snapshots[0].state
