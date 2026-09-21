"""Test idempotent occurrence reconciliation into the runtime Store."""

import asyncio
import json
from copy import deepcopy
from dataclasses import replace
from datetime import UTC, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest

from custom_components.schedule_creator.models import (
    IntegrationConfig,
    OccurrenceState,
)
from custom_components.schedule_creator.planner import plan_occurrences
from custom_components.schedule_creator.reconciliation import (
    async_reconcile_occurrences,
    async_reconcile_window,
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
