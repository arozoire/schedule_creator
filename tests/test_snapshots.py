"""Test immutable initial snapshot capture for active lease winners."""

import json
from copy import deepcopy
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from pathlib import Path
from unittest.mock import Mock, patch

from custom_components.schedule_creator.leases import async_reconcile_entity_leases
from custom_components.schedule_creator.models import (
    Occurrence,
    QuickTimer,
    QuickTimerState,
)
from custom_components.schedule_creator.snapshots import (
    SnapshotCoordinator,
    async_capture_initial_snapshots,
)
from custom_components.schedule_creator.storage import (
    RuntimeRepository,
    RuntimeStoreData,
)

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "models_v1.json"
NOW = datetime(2026, 9, 15, 17, 5, tzinfo=UTC)


class MemoryJsonStore:
    """Minimal native Store double retaining authoritative saves."""

    def __init__(self) -> None:
        self.data = None
        self.saves: list[dict] = []

    async def async_load(self):
        return deepcopy(self.data)

    async def async_save(self, data):
        self.data = deepcopy(data)
        self.saves.append(deepcopy(data))


def _runtime() -> RuntimeStoreData:
    bundle = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    occurrence = replace(
        Occurrence.from_dict(bundle["occurrence"]),
        snapshot_ids=(),
        pending_operation_ids=(),
        last_operation_id=None,
    )
    timer = replace(QuickTimer.from_dict(bundle["quick_timer"]), snapshot_id=None)
    return RuntimeStoreData(
        schema_version=1,
        revision=0,
        operation_counter=0,
        occurrences=(occurrence,),
        snapshots=(),
        leases=(),
        pending_operations=(),
        quick_timers=(timer,),
        notification_deduplication_keys=(),
        updated_at=NOW,
    )


async def _repository(hass):
    store = MemoryJsonStore()
    repository = RuntimeRepository(hass, store)
    assert await repository.async_load() is None
    await repository.async_initialize(_runtime())
    await async_reconcile_entity_leases(repository, NOW)
    return repository, store


async def test_capture_snapshots_only_active_winner(hass) -> None:
    """A suspended contender cannot capture or overwrite the entity baseline."""
    repository, _store = await _repository(hass)
    hass.states.async_set(
        "light.living_room",
        "off",
        {"brightness": None, "supported_color_modes": {"brightness"}},
    )

    result = await async_capture_initial_snapshots(hass, repository, NOW)

    assert len(result.snapshots) == 1
    snapshot = result.snapshots[0]
    assert snapshot.occurrence_id == result.quick_timers[0].controller_id
    assert snapshot.state == "off"
    assert snapshot.checksum.startswith("sha256:")
    assert result.quick_timers[0].snapshot_id == snapshot.id
    assert result.occurrences[0].snapshot_ids == ()


async def test_resumed_schedule_captures_its_own_initial_state(hass) -> None:
    """A later winner owns a distinct snapshot for the same target entity."""
    repository, _store = await _repository(hass)
    hass.states.async_set("light.living_room", "off", {"brightness": None})
    first = await async_capture_initial_snapshots(hass, repository, NOW)
    await repository.async_update(
        lambda current: replace(
            current,
            revision=current.revision + 1,
            quick_timers=(
                replace(
                    current.quick_timers[0], state=QuickTimerState.COMPLETED
                ),
            ),
            updated_at=NOW + timedelta(minutes=11),
        )
    )
    resumed_at = NOW + timedelta(minutes=11)
    await async_reconcile_entity_leases(repository, resumed_at)
    hass.states.async_set("light.living_room", "on", {"brightness": 120})

    result = await async_capture_initial_snapshots(hass, repository, resumed_at)

    assert len(result.snapshots) == 2
    assert result.snapshots[0] is first.snapshots[0]
    schedule_snapshot = result.snapshots[1]
    assert schedule_snapshot.occurrence_id == result.occurrences[0].id
    assert schedule_snapshot.state == "on"
    assert result.occurrences[0].snapshot_ids == (schedule_snapshot.id,)


async def test_identical_capture_is_store_no_op(hass) -> None:
    """An existing controller/entity snapshot is immutable and idempotent."""
    repository, store = await _repository(hass)
    hass.states.async_set("light.living_room", "off")
    first = await async_capture_initial_snapshots(hass, repository, NOW)
    saves_before = len(store.saves)
    hass.states.async_set("light.living_room", "on")

    second = await async_capture_initial_snapshots(
        hass, repository, NOW + timedelta(seconds=1)
    )

    assert second is first
    assert second.snapshots[0].state == "off"
    assert len(store.saves) == saves_before


async def test_unavailable_state_waits_for_change_before_capture(hass) -> None:
    """Unreadable entity state is never persisted as a restore baseline."""
    repository, _store = await _repository(hass)
    hass.states.async_set("light.living_room", "unavailable")
    cancel = Mock()
    with patch(
        "custom_components.schedule_creator.snapshots."
        "async_track_state_change_event",
        return_value=cancel,
    ) as track:
        coordinator = SnapshotCoordinator(hass, repository)
        await coordinator.async_refresh(NOW)
        coordinator.start()
        callback = track.call_args.args[2]
        hass.states.async_set("light.living_room", "off")

        await callback(Mock(time_fired=NOW + timedelta(seconds=1)))

        assert track.call_args_list[0].args[1] == frozenset(
            {"light.living_room"}
        )
        assert len(repository.data.snapshots) == 1
        assert repository.data.snapshots[0].state == "off"
        coordinator.shutdown()

    cancel.assert_called_once_with()


async def test_now_must_be_utc(hass) -> None:
    """Snapshot timestamps reject ambiguous wall-clock values."""
    repository, _store = await _repository(hass)

    try:
        await async_capture_initial_snapshots(
            hass, repository, datetime(2026, 9, 15, 17, 5)
        )
    except ValueError as err:
        assert "UTC" in str(err)
    else:
        raise AssertionError("naive snapshot time was accepted")
