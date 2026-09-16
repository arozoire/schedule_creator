"""Native Home Assistant persistence for Schedule Creator."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable
from dataclasses import dataclass, fields
from datetime import UTC, datetime, timedelta
from typing import Any, Never, Protocol, Self, cast, override

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DOMAIN
from .models import (
    MODEL_SCHEMA_VERSION,
    AuditRecord,
    EntityLease,
    IntegrationConfig,
    LeaseState,
    ModelValidationError,
    Occurrence,
    PendingOperation,
    QuickTimer,
    Snapshot,
)

_LOGGER = logging.getLogger(__name__)

STORAGE_VERSION = 1
STORAGE_MINOR_VERSION = 1
CONFIG_STORE_KEY = f"{DOMAIN}.config"
RUNTIME_STORE_KEY = f"{DOMAIN}.runtime"
AUDIT_STORE_KEY = f"{DOMAIN}.audit"

AUDIT_RETENTION = timedelta(days=30)
AUDIT_MAX_RECORDS = 10_000
AUDIT_SAVE_DELAY = 5.0

type JsonObject = dict[str, Any]
type ConfigMutation = Callable[[IntegrationConfig | None], IntegrationConfig]
type RuntimeMutation = Callable[[RuntimeStoreData], RuntimeStoreData]


class StorageValidationError(ModelValidationError):
    """A Store envelope failed validation."""


class StorageNotLoadedError(RuntimeError):
    """A repository was accessed before its initial load completed."""


class RevisionConflictError(RuntimeError):
    """A configuration write used an outdated expected revision."""

    def __init__(self, expected: int, actual: int) -> None:
        super().__init__(f"expected revision {expected}, current revision is {actual}")
        self.expected = expected
        self.actual = actual


class InvalidRevisionError(ValueError):
    """A mutation did not advance its Store revision exactly once."""


class JsonStore(Protocol):
    """Subset of Home Assistant Store used by the repositories."""

    async def async_load(self) -> JsonObject | None:
        """Load a JSON object."""

        ...

    async def async_save(self, data: JsonObject) -> None:
        """Persist a JSON object immediately."""

        ...

    def async_delay_save(
        self, data_func: Callable[[], JsonObject], delay: float = 0
    ) -> None:
        """Schedule a buffered save."""

        ...


class ScheduleCreatorStore(Store[JsonObject]):
    """Versioned native Store with an explicit migration dispatch point."""

    @override
    async def _async_migrate_func(
        self, old_major_version: int, old_minor_version: int, old_data: JsonObject
    ) -> JsonObject:
        return migrate_store_payload(
            self.key, old_major_version, old_minor_version, old_data
        )


def migrate_store_payload(
    store_key: str, old_major_version: int, old_minor_version: int, data: object
) -> JsonObject:
    """Dispatch Store migrations without interpreting unknown future schemas."""

    if not isinstance(data, dict) or not all(isinstance(key, str) for key in data):
        raise StorageValidationError(store_key, "stored payload must be an object")
    if (
        old_major_version == STORAGE_VERSION
        and old_minor_version <= STORAGE_MINOR_VERSION
    ):
        return cast(JsonObject, data)
    raise NotImplementedError(
        f"no migration for {store_key} from {old_major_version}.{old_minor_version}"
    )


def _native_store(hass: HomeAssistant, key: str) -> ScheduleCreatorStore:
    return ScheduleCreatorStore(
        hass,
        STORAGE_VERSION,
        key,
        private=True,
        atomic_writes=True,
        minor_version=STORAGE_MINOR_VERSION,
        serialize_in_event_loop=False,
    )


def _fail(path: str, message: str) -> Never:
    raise StorageValidationError(path, message)


def _strict_envelope(
    data: object, envelope: type[Any], path: str
) -> dict[str, Any]:
    if not isinstance(data, dict):
        _fail(path, "must be an object")
    if not all(isinstance(key, str) for key in data):
        _fail(path, "all keys must be strings")
    expected = {field.name for field in fields(envelope)}
    actual = set(data)
    unknown = sorted(actual - expected)
    missing = sorted(expected - actual)
    if unknown:
        _fail(path, f"unknown fields: {', '.join(unknown)}")
    if missing:
        _fail(path, f"missing fields: {', '.join(missing)}")
    return data


def _integer(value: object, path: str, *, minimum: int = 0) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        _fail(path, "must be an integer")
    if value < minimum:
        _fail(path, f"must be at least {minimum}")
    return value


def _utc_datetime(value: object, path: str) -> datetime:
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as err:
            raise StorageValidationError(path, "must be an ISO 8601 timestamp") from err
    if not isinstance(value, datetime):
        _fail(path, "must be a datetime")
    if value.tzinfo is None or value.utcoffset() != UTC.utcoffset(value):
        _fail(path, "must use UTC")
    return value.astimezone(UTC)


def _encode_utc(value: datetime) -> str:
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _array(value: object, path: str) -> tuple[Any, ...]:
    if not isinstance(value, list | tuple):
        _fail(path, "must be an array")
    return tuple(value)


def _typed_records[RecordT](
    values: tuple[Any, ...], record_type: type[RecordT], path: str
) -> tuple[RecordT, ...]:
    if not all(isinstance(value, record_type) for value in values):
        _fail(path, f"must contain only {record_type.__name__} records")
    return cast(tuple[RecordT, ...], values)


def _unique(values: tuple[str, ...], path: str) -> None:
    if len(set(values)) != len(values):
        _fail(path, "must not contain duplicates")


@dataclass(frozen=True, slots=True, kw_only=True)
class RuntimeStoreData:
    """Authoritative runtime envelope committed as one Store payload."""

    schema_version: int
    revision: int
    operation_counter: int
    occurrences: tuple[Occurrence, ...]
    snapshots: tuple[Snapshot, ...]
    leases: tuple[EntityLease, ...]
    pending_operations: tuple[PendingOperation, ...]
    quick_timers: tuple[QuickTimer, ...]
    notification_deduplication_keys: tuple[str, ...]
    updated_at: datetime

    def __post_init__(self) -> None:
        _integer(self.schema_version, "runtime.schema_version", minimum=1)
        if self.schema_version != MODEL_SCHEMA_VERSION:
            _fail(
                "runtime.schema_version",
                f"must equal {MODEL_SCHEMA_VERSION}",
            )
        _integer(self.revision, "runtime.revision")
        operation_counter = _integer(
            self.operation_counter, "runtime.operation_counter"
        )
        occurrences = _typed_records(
            tuple(self.occurrences), Occurrence, "runtime.occurrences"
        )
        snapshots = _typed_records(
            tuple(self.snapshots), Snapshot, "runtime.snapshots"
        )
        leases = _typed_records(tuple(self.leases), EntityLease, "runtime.leases")
        operations = _typed_records(
            tuple(self.pending_operations),
            PendingOperation,
            "runtime.pending_operations",
        )
        timers = _typed_records(
            tuple(self.quick_timers), QuickTimer, "runtime.quick_timers"
        )
        deduplication_keys = tuple(self.notification_deduplication_keys)
        if not all(isinstance(key, str) and key for key in deduplication_keys):
            _fail(
                "runtime.notification_deduplication_keys",
                "must contain non-empty strings",
            )
        if deduplication_keys != tuple(sorted(set(deduplication_keys))):
            _fail(
                "runtime.notification_deduplication_keys",
                "must be sorted and unique",
            )
        updated_at = _utc_datetime(self.updated_at, "runtime.updated_at")

        occurrence_ids = tuple(record.id for record in occurrences)
        snapshot_ids = tuple(record.id for record in snapshots)
        lease_ids = tuple(record.id for record in leases)
        operation_ids = tuple(record.id for record in operations)
        timer_ids = tuple(record.id for record in timers)
        action_ids = tuple(record.action.id for record in timers)
        for values, path in (
            (occurrence_ids, "runtime.occurrences"),
            (snapshot_ids, "runtime.snapshots"),
            (lease_ids, "runtime.leases"),
            (operation_ids, "runtime.pending_operations"),
            (timer_ids, "runtime.quick_timers"),
        ):
            _unique(values, path)
        _unique(
            (*snapshot_ids, *lease_ids, *operation_ids, *timer_ids, *action_ids),
            "runtime.record_ids",
        )

        sequences = tuple(record.sequence for record in operations)
        if len(set(sequences)) != len(sequences):
            _fail("runtime.pending_operations", "sequences must be unique")
        if sequences and max(sequences) > operation_counter:
            _fail(
                "runtime.operation_counter",
                "must not precede a pending operation sequence",
            )
        if sequences != tuple(sorted(sequences)):
            _fail(
                "runtime.pending_operations",
                "must be ordered by sequence",
            )

        occurrence_id_set = set(occurrence_ids)
        controller_ids = occurrence_id_set | {timer.controller_id for timer in timers}
        snapshot_by_id = {snapshot.id: snapshot for snapshot in snapshots}
        operation_by_id = {operation.id: operation for operation in operations}
        for snapshot in snapshots:
            if snapshot.occurrence_id not in controller_ids:
                _fail(
                    "runtime.snapshots",
                    f"snapshot {snapshot.id} references an unknown controller",
                )
        snapshot_owners = tuple(
            (snapshot.occurrence_id, snapshot.entity_id) for snapshot in snapshots
        )
        _unique(
            tuple(f"{owner}\0{entity_id}" for owner, entity_id in snapshot_owners),
            "runtime.snapshots.controller_entity",
        )
        for operation in operations:
            if (
                operation.occurrence_id is not None
                and operation.occurrence_id not in controller_ids
            ):
                _fail(
                    "runtime.pending_operations",
                    f"operation {operation.id} references an unknown controller",
                )
        for occurrence in occurrences:
            for snapshot_id in occurrence.snapshot_ids:
                referenced_snapshot = snapshot_by_id.get(snapshot_id)
                if (
                    referenced_snapshot is None
                    or referenced_snapshot.occurrence_id != occurrence.id
                ):
                    _fail(
                        "runtime.occurrences",
                        f"occurrence {occurrence.id} has an invalid snapshot reference",
                    )
            for operation_id in occurrence.pending_operation_ids:
                referenced_operation = operation_by_id.get(operation_id)
                if (
                    referenced_operation is None
                    or referenced_operation.occurrence_id != occurrence.id
                ):
                    _fail(
                        "runtime.occurrences",
                        (
                            f"occurrence {occurrence.id} has an invalid "
                            "operation reference"
                        ),
                    )
            if (
                occurrence.last_operation_id is not None
                and (
                    occurrence.last_operation_id not in operation_by_id
                    or operation_by_id[
                        occurrence.last_operation_id
                    ].occurrence_id
                    != occurrence.id
                )
            ):
                _fail(
                    "runtime.occurrences",
                    f"occurrence {occurrence.id} has an invalid last operation",
                )
        lease_controllers = tuple(
            f"{lease.entity_id}\0{lease.controller_id}" for lease in leases
        )
        _unique(lease_controllers, "runtime.leases.controller")
        active_lease_entities = tuple(
            lease.entity_id for lease in leases if lease.state is LeaseState.ACTIVE
        )
        _unique(active_lease_entities, "runtime.leases.active_entity_id")
        for lease in leases:
            if (
                lease.occurrence_id is not None
                and lease.occurrence_id not in occurrence_id_set
            ):
                _fail(
                    "runtime.leases",
                    f"lease {lease.id} references an unknown occurrence",
                )
        for timer in timers:
            if timer.snapshot_id is not None:
                timer_snapshot = snapshot_by_id.get(timer.snapshot_id)
                if timer_snapshot is None:
                    _fail(
                        "runtime.quick_timers",
                        f"timer {timer.id} has an invalid snapshot reference",
                    )

        referenced_snapshot_ids = {
            snapshot_id
            for occurrence in occurrences
            for snapshot_id in occurrence.snapshot_ids
        } | {
            timer.snapshot_id for timer in timers if timer.snapshot_id is not None
        }
        if referenced_snapshot_ids != set(snapshot_ids):
            _fail("runtime.snapshots", "contains an unreferenced snapshot")
        referenced_operation_ids = {
            operation_id
            for occurrence in occurrences
            for operation_id in occurrence.pending_operation_ids
        }
        owned_operation_ids = {
            operation.id
            for operation in operations
            if operation.occurrence_id in occurrence_id_set
        }
        if referenced_operation_ids != owned_operation_ids:
            _fail(
                "runtime.pending_operations",
                "occurrence operation references are incomplete",
            )

        object.__setattr__(self, "operation_counter", operation_counter)
        object.__setattr__(self, "occurrences", occurrences)
        object.__setattr__(self, "snapshots", snapshots)
        object.__setattr__(self, "leases", leases)
        object.__setattr__(self, "pending_operations", operations)
        object.__setattr__(self, "quick_timers", timers)
        object.__setattr__(
            self, "notification_deduplication_keys", deduplication_keys
        )
        object.__setattr__(self, "updated_at", updated_at)

    def to_dict(self) -> JsonObject:
        """Encode a deterministic native Store payload."""

        return {
            "schema_version": self.schema_version,
            "revision": self.revision,
            "operation_counter": self.operation_counter,
            "occurrences": [record.to_dict() for record in self.occurrences],
            "snapshots": [record.to_dict() for record in self.snapshots],
            "leases": [record.to_dict() for record in self.leases],
            "pending_operations": [
                record.to_dict() for record in self.pending_operations
            ],
            "quick_timers": [record.to_dict() for record in self.quick_timers],
            "notification_deduplication_keys": list(
                self.notification_deduplication_keys
            ),
            "updated_at": _encode_utc(self.updated_at),
        }

    @classmethod
    def from_dict(cls, data: object) -> Self:
        """Decode and cross-validate a runtime Store payload."""

        item = _strict_envelope(data, cls, "runtime")
        return cls(
            schema_version=_integer(
                item["schema_version"], "runtime.schema_version", minimum=1
            ),
            revision=_integer(item["revision"], "runtime.revision"),
            operation_counter=_integer(
                item["operation_counter"], "runtime.operation_counter"
            ),
            occurrences=tuple(
                Occurrence.from_dict(record)
                for record in _array(item["occurrences"], "runtime.occurrences")
            ),
            snapshots=tuple(
                Snapshot.from_dict(record)
                for record in _array(item["snapshots"], "runtime.snapshots")
            ),
            leases=tuple(
                EntityLease.from_dict(record)
                for record in _array(item["leases"], "runtime.leases")
            ),
            pending_operations=tuple(
                PendingOperation.from_dict(record)
                for record in _array(
                    item["pending_operations"], "runtime.pending_operations"
                )
            ),
            quick_timers=tuple(
                QuickTimer.from_dict(record)
                for record in _array(item["quick_timers"], "runtime.quick_timers")
            ),
            notification_deduplication_keys=tuple(
                _string_value(
                    record,
                    f"runtime.notification_deduplication_keys[{index}]",
                )
                for index, record in enumerate(
                    _array(
                        item["notification_deduplication_keys"],
                        "runtime.notification_deduplication_keys",
                    )
                )
            ),
            updated_at=_utc_datetime(item["updated_at"], "runtime.updated_at"),
        )


def _string_value(value: object, path: str) -> str:
    if not isinstance(value, str) or not value:
        _fail(path, "must be a non-empty string")
    return value


@dataclass(frozen=True, slots=True, kw_only=True)
class AuditStoreData:
    """Non-authoritative, bounded audit envelope."""

    schema_version: int
    records: tuple[AuditRecord, ...]
    updated_at: datetime

    def __post_init__(self) -> None:
        _integer(self.schema_version, "audit_store.schema_version", minimum=1)
        if self.schema_version != MODEL_SCHEMA_VERSION:
            _fail("audit_store.schema_version", f"must equal {MODEL_SCHEMA_VERSION}")
        records = _typed_records(
            tuple(self.records), AuditRecord, "audit_store.records"
        )
        ids = tuple(record.id for record in records)
        _unique(ids, "audit_store.records")
        records = tuple(sorted(records, key=lambda item: (item.recorded_at, item.id)))
        updated_at = _utc_datetime(self.updated_at, "audit_store.updated_at")
        if records and updated_at < records[-1].recorded_at:
            _fail(
                "audit_store.updated_at",
                "must not precede the newest audit record",
            )
        object.__setattr__(self, "records", records)
        object.__setattr__(self, "updated_at", updated_at)

    def to_dict(self) -> JsonObject:
        """Encode a deterministic audit Store payload."""

        return {
            "schema_version": self.schema_version,
            "records": [record.to_dict() for record in self.records],
            "updated_at": _encode_utc(self.updated_at),
        }

    @classmethod
    def from_dict(cls, data: object) -> Self:
        """Decode an audit Store payload."""

        item = _strict_envelope(data, cls, "audit_store")
        return cls(
            schema_version=_integer(
                item["schema_version"], "audit_store.schema_version", minimum=1
            ),
            records=tuple(
                AuditRecord.from_dict(record)
                for record in _array(item["records"], "audit_store.records")
            ),
            updated_at=_utc_datetime(item["updated_at"], "audit_store.updated_at"),
        )


def empty_config(now: datetime) -> IntegrationConfig:
    """Create the first valid, action-free configuration revision."""

    return IntegrationConfig(
        revision=1,
        profiles=(),
        active_profile_ids=(),
        groups=(),
        schedules=(),
        settings={"timezone_source": "home_assistant"},
        migration_metadata={"source": None},
        updated_at=_utc_datetime(now, "config.updated_at"),
    )


def empty_runtime(now: datetime) -> RuntimeStoreData:
    """Create an empty authoritative runtime envelope."""

    return RuntimeStoreData(
        schema_version=MODEL_SCHEMA_VERSION,
        revision=0,
        operation_counter=0,
        occurrences=(),
        snapshots=(),
        leases=(),
        pending_operations=(),
        quick_timers=(),
        notification_deduplication_keys=(),
        updated_at=_utc_datetime(now, "runtime.updated_at"),
    )


def empty_audit(now: datetime) -> AuditStoreData:
    """Create an empty derived audit envelope."""

    return AuditStoreData(
        schema_version=MODEL_SCHEMA_VERSION,
        records=(),
        updated_at=_utc_datetime(now, "audit_store.updated_at"),
    )


class ConfigRepository:
    """Serialize complete configuration commits under one async lock."""

    def __init__(self, hass: HomeAssistant, store: JsonStore | None = None) -> None:
        self._store = store or _native_store(hass, CONFIG_STORE_KEY)
        self._lock = asyncio.Lock()
        self._loaded = False
        self._data: IntegrationConfig | None = None

    @property
    def data(self) -> IntegrationConfig | None:
        """Return the loaded immutable configuration."""

        if not self._loaded:
            raise StorageNotLoadedError("configuration Store has not been loaded")
        return self._data

    async def async_load(self) -> IntegrationConfig | None:
        """Load and validate the complete configuration once."""

        async with self._lock:
            raw = await self._store.async_load()
            self._data = None if raw is None else IntegrationConfig.from_dict(raw)
            self._loaded = True
            return self._data

    async def async_update(
        self, expected_revision: int, mutation: ConfigMutation
    ) -> IntegrationConfig:
        """Commit one optimistic configuration mutation atomically."""

        async with self._lock:
            if not self._loaded:
                raise StorageNotLoadedError("configuration Store has not been loaded")
            actual_revision = 0 if self._data is None else self._data.revision
            if expected_revision != actual_revision:
                raise RevisionConflictError(expected_revision, actual_revision)
            updated = mutation(self._data)
            if not isinstance(updated, IntegrationConfig):
                raise TypeError("configuration mutation must return IntegrationConfig")
            if updated.revision != actual_revision + 1:
                raise InvalidRevisionError(
                    "configuration revision must advance exactly once"
                )
            if self._data is not None and updated.updated_at < self._data.updated_at:
                raise InvalidRevisionError(
                    "configuration timestamp cannot move backwards"
                )
            await self._store.async_save(updated.to_dict())
            self._data = updated
            return updated


class RuntimeRepository:
    """Persist every critical runtime transition immediately under one lock."""

    def __init__(self, hass: HomeAssistant, store: JsonStore | None = None) -> None:
        self._store = store or _native_store(hass, RUNTIME_STORE_KEY)
        self._lock = asyncio.Lock()
        self._loaded = False
        self._data: RuntimeStoreData | None = None

    @property
    def data(self) -> RuntimeStoreData:
        """Return the loaded immutable runtime envelope."""

        if not self._loaded or self._data is None:
            raise StorageNotLoadedError("runtime Store has not been loaded")
        return self._data

    async def async_load(self) -> RuntimeStoreData | None:
        """Load and cross-validate runtime state."""

        async with self._lock:
            raw = await self._store.async_load()
            self._data = None if raw is None else RuntimeStoreData.from_dict(raw)
            self._loaded = True
            return self._data

    async def async_initialize(self, initial: RuntimeStoreData) -> RuntimeStoreData:
        """Persist the first empty runtime envelope if none exists."""

        async with self._lock:
            if not self._loaded:
                raise StorageNotLoadedError("runtime Store has not been loaded")
            if self._data is not None:
                return self._data
            if initial.revision != 0:
                raise InvalidRevisionError("initial runtime revision must be zero")
            await self._store.async_save(initial.to_dict())
            self._data = initial
            return initial

    async def async_update(self, mutation: RuntimeMutation) -> RuntimeStoreData:
        """Commit one authoritative runtime transition immediately."""

        async with self._lock:
            if not self._loaded or self._data is None:
                raise StorageNotLoadedError("runtime Store has not been loaded")
            current = self._data
            updated = mutation(current)
            if not isinstance(updated, RuntimeStoreData):
                raise TypeError("runtime mutation must return RuntimeStoreData")
            if updated.revision != current.revision + 1:
                raise InvalidRevisionError("runtime revision must advance exactly once")
            if updated.updated_at < current.updated_at:
                raise InvalidRevisionError("runtime timestamp cannot move backwards")
            await self._store.async_save(updated.to_dict())
            self._data = updated
            return updated


class AuditRepository:
    """Buffer bounded audit writes without affecting authoritative Stores."""

    def __init__(self, hass: HomeAssistant, store: JsonStore | None = None) -> None:
        self._store = store or _native_store(hass, AUDIT_STORE_KEY)
        self._lock = asyncio.Lock()
        self._loaded = False
        self._data: AuditStoreData | None = None
        self._write_enabled = True

    @property
    def data(self) -> AuditStoreData:
        """Return the in-memory audit envelope."""

        if not self._loaded or self._data is None:
            raise StorageNotLoadedError("audit Store has not been loaded")
        return self._data

    async def async_load(self, now: datetime) -> AuditStoreData:
        """Load audit best-effort; audit corruption never blocks runtime startup."""

        async with self._lock:
            try:
                raw = await self._store.async_load()
                loaded = (
                    empty_audit(now)
                    if raw is None
                    else AuditStoreData.from_dict(raw)
                )
                self._data = _prune_audit(loaded, now)
                self._write_enabled = True
            except Exception:  # noqa: BLE001 - audit is deliberately non-authoritative
                _LOGGER.exception("Unable to load Schedule Creator audit Store")
                self._data = empty_audit(now)
                self._write_enabled = False
            self._loaded = True
            result = self._data
            assert result is not None
            return result

    async def async_append(
        self, record: AuditRecord, now: datetime
    ) -> AuditStoreData:
        """Append one record and schedule a delayed, best-effort write."""

        async with self._lock:
            current = self.data
            try:
                timestamp = max(
                    _utc_datetime(now, "audit_store.updated_at"),
                    current.updated_at,
                    record.recorded_at,
                )
                updated = _prune_audit(
                    AuditStoreData(
                        schema_version=MODEL_SCHEMA_VERSION,
                        records=(*current.records, record),
                        updated_at=timestamp,
                    ),
                    timestamp,
                )
            except Exception:  # noqa: BLE001 - runtime must continue without audit
                _LOGGER.exception("Unable to append Schedule Creator audit record")
                return current
            self._data = updated
            if not self._write_enabled:
                return updated
            try:
                def data_to_save() -> JsonObject:
                    return updated.to_dict()

                self._store.async_delay_save(data_to_save, AUDIT_SAVE_DELAY)
            except Exception:  # noqa: BLE001 - runtime must continue without audit
                _LOGGER.exception("Unable to schedule Schedule Creator audit save")
            return updated

    async def async_flush(self) -> None:
        """Attempt an immediate audit write without propagating failure."""

        async with self._lock:
            if not self._loaded or self._data is None or not self._write_enabled:
                return
            try:
                await self._store.async_save(self._data.to_dict())
            except Exception:  # noqa: BLE001 - runtime must continue without audit
                _LOGGER.exception("Unable to flush Schedule Creator audit Store")


def _prune_audit(data: AuditStoreData, now: datetime) -> AuditStoreData:
    timestamp = _utc_datetime(now, "audit_store.updated_at")
    cutoff = timestamp - AUDIT_RETENTION
    retained = tuple(record for record in data.records if record.recorded_at >= cutoff)
    if len(retained) > AUDIT_MAX_RECORDS:
        retained = retained[-AUDIT_MAX_RECORDS:]
    return AuditStoreData(
        schema_version=MODEL_SCHEMA_VERSION,
        records=retained,
        updated_at=timestamp,
    )


class ScheduleCreatorStorage:
    """Own the three Stores while preserving their authority boundaries."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.config = ConfigRepository(hass)
        self.runtime = RuntimeRepository(hass)
        self.audit = AuditRepository(hass)

    async def async_load(self, now: datetime) -> None:
        """Load authoritative Stores first and initialize missing native data."""

        config = await self.config.async_load()
        if config is None:
            await self.config.async_update(0, lambda _current: empty_config(now))
        runtime = await self.runtime.async_load()
        if runtime is None:
            await self.runtime.async_initialize(empty_runtime(now))
        await self.audit.async_load(now)

    async def async_shutdown(self) -> None:
        """Flush only the derived buffered Store."""

        await self.audit.async_flush()
