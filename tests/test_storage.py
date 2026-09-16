"""Test native Store envelopes and authority boundaries."""

import asyncio
import json
from copy import deepcopy
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from homeassistant.core import HomeAssistant

from custom_components.schedule_creator.journal import (
    InvalidOperationTransitionError,
    JournalCoordinator,
    RecoveryDecision,
    build_recovery_plan,
)
from custom_components.schedule_creator.models import (
    AuditRecord,
    ControllerType,
    EntityLease,
    IntegrationConfig,
    LeaseState,
    Occurrence,
    OperationKind,
    OperationState,
    PendingOperation,
    QuickTimer,
    Snapshot,
)
from custom_components.schedule_creator.storage import (
    AuditRepository,
    ConfigRepository,
    RevisionConflictError,
    RuntimeRepository,
    RuntimeStoreData,
    StorageValidationError,
    empty_audit,
    empty_config,
    empty_runtime,
    migrate_store_payload,
)

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "models_v1.json"
NOW = datetime(2026, 9, 15, 16, 30, tzinfo=UTC)


class MemoryJsonStore:
    """Minimal deterministic replacement for Home Assistant Store."""

    def __init__(self, data: dict | None = None) -> None:
        self.data = deepcopy(data)
        self.saves: list[dict] = []
        self.delayed_saves: list[tuple[dict, float]] = []
        self.fail_load = False
        self.fail_save = False
        self.fail_delay = False

    async def async_load(self) -> dict | None:
        if self.fail_load:
            raise OSError("simulated audit read failure")
        return deepcopy(self.data)

    async def async_save(self, data: dict) -> None:
        if self.fail_save:
            raise OSError("simulated Store write failure")
        self.data = deepcopy(data)
        self.saves.append(deepcopy(data))

    def async_delay_save(self, data_func, delay: float = 0) -> None:
        if self.fail_delay:
            raise OSError("simulated delayed write failure")
        data = data_func()
        self.data = deepcopy(data)
        self.delayed_saves.append((deepcopy(data), delay))


@pytest.fixture
def model_data() -> dict:
    """Return a fresh canonical model bundle."""

    return json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))


def _runtime_bundle(model_data: dict) -> RuntimeStoreData:
    return RuntimeStoreData(
        schema_version=1,
        revision=1,
        operation_counter=1,
        occurrences=(Occurrence.from_dict(model_data["occurrence"]),),
        snapshots=(Snapshot.from_dict(model_data["snapshot"]),),
        leases=(),
        pending_operations=(
            PendingOperation.from_dict(model_data["pending_operation"]),
        ),
        quick_timers=(),
        notification_deduplication_keys=("confirmed:start:fixture",),
        updated_at=NOW,
    )


def test_runtime_store_envelope_round_trips(model_data: dict) -> None:
    """The authoritative runtime payload is deterministic and cross-validated."""

    runtime = _runtime_bundle(model_data)

    assert RuntimeStoreData.from_dict(runtime.to_dict()) == runtime
    json.dumps(runtime.to_dict())


def test_runtime_store_rejects_orphan_snapshot(model_data: dict) -> None:
    """A persisted snapshot cannot silently outlive its controller."""

    snapshot = Snapshot.from_dict(model_data["snapshot"])

    with pytest.raises(ValueError, match="unknown controller"):
        RuntimeStoreData(
            schema_version=1,
            revision=1,
            operation_counter=0,
            occurrences=(),
            snapshots=(snapshot,),
            leases=(),
            pending_operations=(),
            quick_timers=(),
            notification_deduplication_keys=(),
            updated_at=NOW,
        )


def test_runtime_allows_suspended_controller_below_active_timer(
    model_data: dict,
) -> None:
    """A Quick Timer lease can coexist with the controller it suspends."""

    suspended = replace(
        EntityLease.from_dict(model_data["lease"]),
        state=LeaseState.SUSPENDED,
    )
    timer = replace(
        suspended,
        id="14141414-1414-4414-8414-141414141414",
        controller_id="quick:dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        controller_type=ControllerType.QUICK_TIMER,
        occurrence_id=None,
        generation=2,
        state=LeaseState.ACTIVE,
    )
    base = _runtime_bundle(model_data)
    quick_timer = replace(
        QuickTimer.from_dict(model_data["quick_timer"]),
        snapshot_id=None,
    )

    runtime = replace(
        base,
        leases=(suspended, timer),
        quick_timers=(quick_timer,),
    )

    assert runtime.leases == (suspended, timer)


def test_runtime_rejects_operation_outside_controller_targets(
    model_data: dict,
) -> None:
    """Recovery cannot target an entity outside the frozen controller scope."""

    base = _runtime_bundle(model_data)
    operation = replace(
        base.pending_operations[0],
        entity_id="light.unrelated",
    )

    with pytest.raises(ValueError, match="outside its controller"):
        replace(base, pending_operations=(operation,))


async def test_journal_rejects_operation_outside_controller_targets(
    hass: HomeAssistant, model_data: dict
) -> None:
    """Journal validation fails before an out-of-scope intent is persisted."""

    base = _runtime_bundle(model_data)
    store = MemoryJsonStore(base.to_dict())
    repository = RuntimeRepository(hass, store)
    assert await repository.async_load() == base
    journal = JournalCoordinator(repository)

    with pytest.raises(ValueError, match="outside its controller"):
        await journal.async_prepare(
            kind=OperationKind.TARGET_ACTION,
            payload={"domain": "light", "action": "on", "data": {}},
            now=NOW,
            occurrence_id=base.occurrences[0].id,
            entity_id="light.unrelated",
        )

    assert store.saves == []
    assert repository.data == base


def test_runtime_rejects_orphan_quick_timer_lease(model_data: dict) -> None:
    """A timer lease cannot retain ownership after its controller disappeared."""

    base = _runtime_bundle(model_data)
    lease = replace(
        EntityLease.from_dict(model_data["lease"]),
        controller_id="quick:dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        controller_type=ControllerType.QUICK_TIMER,
        occurrence_id=None,
    )

    with pytest.raises(ValueError, match="invalid Quick Timer controller"):
        replace(base, leases=(lease,))


def test_runtime_rejects_schedule_lease_with_wrong_controller(
    model_data: dict,
) -> None:
    """A schedule lease must match its occurrence and controller type."""

    base = _runtime_bundle(model_data)
    lease = replace(
        EntityLease.from_dict(model_data["lease"]),
        controller_id="quick:dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    )

    with pytest.raises(ValueError, match="invalid schedule controller"):
        replace(base, leases=(lease,))


def test_runtime_rejects_timer_operation_for_another_entity(
    model_data: dict,
) -> None:
    """A Quick Timer operation cannot escape its single-entity scope."""

    base = _runtime_bundle(model_data)
    timer = replace(
        QuickTimer.from_dict(model_data["quick_timer"]),
        snapshot_id=None,
    )
    operation = replace(
        base.pending_operations[0],
        occurrence_id=timer.controller_id,
        entity_id="light.unrelated",
    )
    occurrence = replace(
        base.occurrences[0],
        pending_operation_ids=(),
        last_operation_id=None,
    )

    with pytest.raises(ValueError, match="outside its controller"):
        replace(
            base,
            occurrences=(occurrence,),
            pending_operations=(operation,),
            quick_timers=(timer,),
        )


def test_runtime_rejects_timer_snapshot_from_another_controller(
    model_data: dict,
) -> None:
    """A Quick Timer cannot restore a schedule occurrence's snapshot."""

    base = _runtime_bundle(model_data)
    timer = QuickTimer.from_dict(model_data["quick_timer"])

    with pytest.raises(ValueError, match="invalid snapshot reference"):
        replace(base, quick_timers=(timer,))


async def test_config_mutation_is_locked_and_optimistic(
    hass: HomeAssistant,
) -> None:
    """Two clients cannot both commit the same expected revision."""

    store = MemoryJsonStore()
    repository = ConfigRepository(hass, store)
    assert await repository.async_load() is None
    initial = await repository.async_update(0, lambda _current: empty_config(NOW))

    async def write(name: str) -> IntegrationConfig:
        def mutate(current: IntegrationConfig | None) -> IntegrationConfig:
            assert current is not None
            return replace(
                current,
                revision=current.revision + 1,
                settings={"writer": name},
                updated_at=current.updated_at + timedelta(seconds=1),
            )

        return await repository.async_update(initial.revision, mutate)

    results = await asyncio.gather(write("one"), write("two"), return_exceptions=True)

    assert sum(isinstance(result, IntegrationConfig) for result in results) == 1
    assert sum(isinstance(result, RevisionConflictError) for result in results) == 1
    assert repository.data is not None
    assert repository.data.revision == 2
    assert len(store.saves) == 2


async def test_journal_persists_every_crash_boundary(
    hass: HomeAssistant, model_data: dict
) -> None:
    """PREPARED, SENT and confirmed results are separate immediate commits."""

    store = MemoryJsonStore()
    repository = RuntimeRepository(hass, store)
    assert await repository.async_load() is None
    await repository.async_initialize(empty_runtime(NOW))
    journal = JournalCoordinator(repository)
    occurrence = replace(
        Occurrence.from_dict(model_data["occurrence"]),
        snapshot_ids=(),
        pending_operation_ids=(),
        last_operation_id=None,
    )
    snapshot = Snapshot.from_dict(model_data["snapshot"])
    operation_id = model_data["pending_operation"]["id"]

    prepared = await journal.async_prepare(
        kind=OperationKind.TARGET_ACTION,
        payload={"domain": "light", "action": "on", "data": {}},
        now=NOW,
        occurrence_id=occurrence.id,
        entity_id="light.living_room",
        snapshots=(snapshot,),
        occurrence=occurrence,
        operation_id=operation_id,
    )
    after_prepare = RuntimeStoreData.from_dict(store.data)
    assert prepared.sequence == 1
    assert build_recovery_plan(after_prepare, NOW)[0].decision is (
        RecoveryDecision.RETRY_PREPARED
    )

    sent = await journal.async_mark_sent(operation_id, NOW + timedelta(seconds=1))
    after_sent = RuntimeStoreData.from_dict(store.data)
    assert sent.attempt_count == 1
    assert build_recovery_plan(after_sent, NOW)[0].decision is (
        RecoveryDecision.RECONCILE_SENT
    )

    await journal.async_mark_succeeded(operation_id, NOW + timedelta(seconds=2))
    after_success = RuntimeStoreData.from_dict(store.data)
    assert build_recovery_plan(after_success, NOW) == ()
    assert len(store.saves) == 4


async def test_retry_keeps_snapshot_and_operation_evidence(
    hass: HomeAssistant, model_data: dict
) -> None:
    """A temporary failure preserves immutable state required by the retry."""

    store = MemoryJsonStore()
    repository = RuntimeRepository(hass, store)
    await repository.async_load()
    await repository.async_initialize(empty_runtime(NOW))
    journal = JournalCoordinator(repository)
    occurrence = replace(
        Occurrence.from_dict(model_data["occurrence"]),
        snapshot_ids=(),
        pending_operation_ids=(),
        last_operation_id=None,
    )
    snapshot = Snapshot.from_dict(model_data["snapshot"])
    operation_id = model_data["pending_operation"]["id"]
    await journal.async_prepare(
        kind=OperationKind.TARGET_ACTION,
        payload={"domain": "light", "action": "on", "data": {}},
        now=NOW,
        occurrence_id=occurrence.id,
        entity_id="light.living_room",
        snapshots=(snapshot,),
        occurrence=occurrence,
        operation_id=operation_id,
    )
    await journal.async_mark_sent(operation_id, NOW + timedelta(seconds=1))

    operation = await journal.async_schedule_retry(
        operation_id,
        now=NOW + timedelta(seconds=2),
        retry_at=NOW + timedelta(seconds=30),
        error_code="target_unavailable",
    )

    assert operation.state is OperationState.RETRY_WAIT
    assert repository.data.snapshots == (snapshot,)
    assert repository.data.occurrences[0].snapshot_ids == (snapshot.id,)
    assert repository.data.occurrences[0].pending_operation_ids == (operation_id,)
    assert build_recovery_plan(repository.data, NOW)[0].decision is (
        RecoveryDecision.WAIT_FOR_RETRY
    )

    saves_before_early_retry = len(store.saves)
    with pytest.raises(InvalidOperationTransitionError, match="not due for retry"):
        await journal.async_mark_sent(operation_id, NOW + timedelta(seconds=10))
    assert len(store.saves) == saves_before_early_retry

    replacement_snapshot = replace(
        snapshot,
        id="12121212-1212-4212-8212-121212121212",
        state="on",
        checksum="sha256:replacement",
        captured_at=NOW + timedelta(seconds=5),
    )
    saves_before = len(store.saves)
    with pytest.raises(StorageValidationError, match="must not contain duplicates"):
        await journal.async_prepare(
            kind=OperationKind.RESTORE,
            payload={"domain": "light", "action": "off", "data": {}},
            now=NOW + timedelta(seconds=5),
            occurrence_id=occurrence.id,
            entity_id="light.living_room",
            snapshots=(replacement_snapshot,),
            operation_id="13131313-1313-4313-8313-131313131313",
        )
    assert repository.data.snapshots == (snapshot,)
    assert len(store.saves) == saves_before


@pytest.mark.parametrize(
    ("state", "retry_offset", "decision"),
    [
        (OperationState.PREPARED, None, RecoveryDecision.RETRY_PREPARED),
        (OperationState.SENT, None, RecoveryDecision.RECONCILE_SENT),
        (OperationState.RETRY_WAIT, 30, RecoveryDecision.RETRY_DUE),
        (OperationState.RETRY_WAIT, 120, RecoveryDecision.WAIT_FOR_RETRY),
    ],
)
def test_unfinished_operation_recovery_is_deterministic(
    model_data: dict,
    state: OperationState,
    retry_offset: int | None,
    decision: RecoveryDecision,
) -> None:
    """Every unfinished persisted state maps to one side-effect-free next step."""

    operation = PendingOperation.from_dict(model_data["pending_operation"])
    retry_at = None if retry_offset is None else NOW + timedelta(seconds=retry_offset)
    updated_at = NOW + timedelta(seconds=5) if retry_at is not None else NOW
    operation = replace(
        operation,
        state=state,
        updated_at=updated_at,
        next_retry_at=retry_at,
    )
    runtime = replace(
        _runtime_bundle(model_data),
        pending_operations=(operation,),
    )

    assert build_recovery_plan(runtime, NOW + timedelta(seconds=60))[0].decision is (
        decision
    )


@pytest.mark.parametrize(
    "state",
    [
        OperationState.SUCCEEDED,
        OperationState.FAILED_FINAL,
        OperationState.SUPERSEDED,
    ],
)
def test_terminal_operations_are_not_replayed(
    model_data: dict, state: OperationState
) -> None:
    """Confirmed or deliberately stopped commands are absent from recovery."""

    operation = replace(
        PendingOperation.from_dict(model_data["pending_operation"]),
        state=state,
        next_retry_at=None,
    )
    runtime = replace(
        _runtime_bundle(model_data),
        pending_operations=(operation,),
    )

    assert build_recovery_plan(runtime, NOW) == ()


async def test_audit_failure_does_not_touch_authoritative_state(
    hass: HomeAssistant, model_data: dict
) -> None:
    """A failed delayed audit write cannot mutate config or runtime Stores."""

    config_store = MemoryJsonStore(empty_config(NOW).to_dict())
    runtime_store = MemoryJsonStore(empty_runtime(NOW).to_dict())
    audit_store = MemoryJsonStore(empty_audit(NOW).to_dict())
    audit_store.fail_delay = True
    config = ConfigRepository(hass, config_store)
    runtime = RuntimeRepository(hass, runtime_store)
    audit = AuditRepository(hass, audit_store)
    await config.async_load()
    await runtime.async_load()
    await audit.async_load(NOW)
    config_before = deepcopy(config_store.data)
    runtime_before = deepcopy(runtime_store.data)

    record = AuditRecord.from_dict(model_data["audit"])
    result = await audit.async_append(record, record.recorded_at)

    assert result.records == (record,)
    assert config_store.data == config_before
    assert runtime_store.data == runtime_before


async def test_audit_load_failure_never_overwrites_unknown_data(
    hass: HomeAssistant, model_data: dict
) -> None:
    """An unreadable or future audit payload stays untouched for this session."""

    audit_store = MemoryJsonStore({"future": "payload"})
    audit_store.fail_load = True
    audit = AuditRepository(hass, audit_store)

    await audit.async_load(NOW)
    await audit.async_append(
        AuditRecord.from_dict(model_data["audit"]),
        NOW + timedelta(seconds=5),
    )
    await audit.async_flush()

    assert audit_store.data == {"future": "payload"}
    assert audit_store.delayed_saves == []
    assert audit_store.saves == []


def test_migration_dispatch_rejects_unknown_major_version() -> None:
    """A future Store schema is never interpreted as version one."""

    assert migrate_store_payload("test", 1, 0, {"schema_version": 1}) == {
        "schema_version": 1
    }
    with pytest.raises(NotImplementedError, match="no migration"):
        migrate_store_payload("test", 2, 0, {})
