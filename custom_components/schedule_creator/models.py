"""Immutable persisted models for Schedule Creator."""

from __future__ import annotations

import re
from collections.abc import Mapping
from dataclasses import dataclass, fields
from datetime import UTC, date, datetime, time
from enum import StrEnum
from math import isfinite
from types import MappingProxyType
from typing import Any, Never, Self
from uuid import UUID

MODEL_SCHEMA_VERSION = 1
MAX_CONDITION_DEPTH = 8
MAX_CONDITION_CHILDREN = 16
MAX_CONDITION_NODES = 64
TARGET_SELECTOR_KEYS = frozenset(
    {"area_id", "device_id", "entity_id", "floor_id", "label_id", "target"}
)
# Pseudo-action: data is a desired entity state reproduced through scene.apply.
APPLY_STATE_ACTION = "apply_state"

_OBJECT_ID_PATTERN = r"(?!_)[\da-z_]+(?<!_)"
_DOMAIN_PATTERN = r"(?!.+__)" + _OBJECT_ID_PATTERN
_ENTITY_ID_PATTERN = re.compile(
    r"^" + _DOMAIN_PATTERN + r"\." + _OBJECT_ID_PATTERN + r"$"
)

type FrozenJsonValue = (
    None
    | bool
    | int
    | float
    | str
    | tuple["FrozenJsonValue", ...]
    | Mapping[str, "FrozenJsonValue"]
)


class ModelValidationError(ValueError):
    """A persisted model failed deterministic validation."""

    def __init__(self, path: str, message: str) -> None:
        super().__init__(f"{path}: {message}")
        self.path = path
        self.message = message


class ProfileType(StrEnum):
    """Profile activation behaviour."""

    EXCLUSIVE = "exclusive"
    SHARED = "shared"


class OverridePolicy(StrEnum):
    """External command handling policy."""

    COOPERATIVE = "cooperative"
    MANUAL_OVERRIDE = "manual_override"


class ConditionOperator(StrEnum):
    """Supported nodes in the structured condition language."""

    STATE_EQUALS = "state_equals"
    STATE_NOT_EQUALS = "state_not_equals"
    NUMERIC_GREATER = "numeric_greater"
    NUMERIC_GREATER_OR_EQUAL = "numeric_greater_or_equal"
    NUMERIC_LESS = "numeric_less"
    NUMERIC_LESS_OR_EQUAL = "numeric_less_or_equal"
    NUMERIC_RANGE = "numeric_range"
    AVAILABLE = "available"
    AND = "and"
    OR = "or"


class OccurrenceState(StrEnum):
    """Lifecycle state of a concrete schedule occurrence."""

    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FAILED = "failed"


class ConditionBranch(StrEnum):
    """Last branch retained by a conditional occurrence."""

    UNKNOWN = "unknown"
    TRUE = "true"
    FALSE = "false"
    SUPPRESSED = "suppressed"


class RecoveryState(StrEnum):
    """How an occurrence was established after startup."""

    NORMAL = "normal"
    RESUMED = "resumed"
    RECOVERED_SAFE_END = "recovered_safe_end"
    RECOVERED_SKIPPED = "recovered_skipped"


class ControllerType(StrEnum):
    """Controller classes participating in entity arbitration."""

    NORMAL_SCHEDULE = "normal_schedule"
    QUICK_TIMER = "quick_timer"
    CONDITIONAL_SCHEDULE = "conditional_schedule"


class LeaseState(StrEnum):
    """Whether a controller currently owns target rights."""

    ACTIVE = "active"
    SUSPENDED = "suspended"


class OperationKind(StrEnum):
    """Journal operation category."""

    TARGET_ACTION = "target_action"
    RESTORE = "restore"
    NOTIFICATION = "notification"


class OperationState(StrEnum):
    """Write-ahead journal state."""

    PREPARED = "prepared"
    SENT = "sent"
    SUCCEEDED = "succeeded"
    RETRY_WAIT = "retry_wait"
    FAILED_FINAL = "failed_final"
    SUPERSEDED = "superseded"


class QuickTimerState(StrEnum):
    """Quick Timer lifecycle state."""

    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    SUPERSEDED = "superseded"


class AuditLevel(StrEnum):
    """Audit event severity."""

    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


def _fail(path: str, message: str) -> Never:
    raise ModelValidationError(path, message)


def _strict_record(
    data: object,
    model: type[VersionedModel],
    path: str,
    optional: frozenset[str] = frozenset(),
) -> dict[str, Any]:
    if not isinstance(data, dict):
        _fail(path, "must be an object")
    if not all(isinstance(key, str) for key in data):
        _fail(path, "all keys must be strings")

    expected = {field.name for field in fields(model)}
    actual = set(data)
    unknown = sorted(actual - expected)
    missing = sorted(expected - actual - optional)
    if unknown:
        _fail(path, f"unknown fields: {', '.join(unknown)}")
    if missing:
        _fail(path, f"missing fields: {', '.join(missing)}")
    return data


def _string(value: object, path: str, *, allow_empty: bool = False) -> str:
    if not isinstance(value, str):
        _fail(path, "must be a string")
    if not allow_empty and not value.strip():
        _fail(path, "must not be empty")
    return value


def _optional_string(value: object, path: str) -> str | None:
    if value is None:
        return None
    return _string(value, path)


def _integer(value: object, path: str, *, minimum: int | None = None) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        _fail(path, "must be an integer")
    if minimum is not None and value < minimum:
        _fail(path, f"must be at least {minimum}")
    return value


def _number(value: object, path: str) -> float:
    if isinstance(value, bool) or not isinstance(value, int | float):
        _fail(path, "must be a number")
    number = float(value)
    if not isfinite(number):
        _fail(path, "must be finite")
    return number


def _optional_number(value: object, path: str) -> float | None:
    if value is None:
        return None
    return _number(value, path)


def _boolean(value: object, path: str) -> bool:
    if not isinstance(value, bool):
        _fail(path, "must be a boolean")
    return value


def _uuid(value: object, path: str) -> str:
    text = _string(value, path)
    try:
        parsed = UUID(text)
    except ValueError as err:
        raise ModelValidationError(path, "must be a UUID") from err
    if str(parsed) != text:
        _fail(path, "must use canonical UUID form")
    return str(parsed)


def _entity_id(value: object, path: str) -> str:
    text = _string(value, path)
    if _ENTITY_ID_PATTERN.fullmatch(text) is None:
        _fail(path, "must be a Home Assistant entity ID")
    return text


def _enum[EnumType: StrEnum](
    enum_type: type[EnumType], value: object, path: str
) -> EnumType:
    text = _string(value, path)
    try:
        return enum_type(text)
    except ValueError as err:
        allowed = ", ".join(item.value for item in enum_type)
        raise ModelValidationError(path, f"must be one of: {allowed}") from err


def _utc_datetime(value: object, path: str) -> datetime:
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as err:
            raise ModelValidationError(path, "must be an ISO 8601 timestamp") from err
    if not isinstance(value, datetime):
        _fail(path, "must be a datetime")
    if value.tzinfo is None or value.utcoffset() != UTC.utcoffset(value):
        _fail(path, "must use UTC")
    return value.astimezone(UTC)


def _optional_utc_datetime(value: object, path: str) -> datetime | None:
    if value is None:
        return None
    return _utc_datetime(value, path)


def _local_datetime_text(value: object, path: str) -> str:
    text = _string(value, path)
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError as err:
        raise ModelValidationError(path, "must be an ISO 8601 timestamp") from err
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        _fail(path, "must include a UTC offset")
    return text


def _date(value: object, path: str) -> date:
    if isinstance(value, str):
        try:
            value = date.fromisoformat(value)
        except ValueError as err:
            raise ModelValidationError(path, "must be an ISO date") from err
    if not isinstance(value, date) or isinstance(value, datetime):
        _fail(path, "must be a date")
    return value


def _time(value: object, path: str) -> time:
    if isinstance(value, str):
        try:
            value = time.fromisoformat(value)
        except ValueError as err:
            raise ModelValidationError(path, "must be an ISO local time") from err
    if not isinstance(value, time) or value.tzinfo is not None:
        _fail(path, "must be a local time without timezone")
    return value


def _tuple(value: object, path: str) -> tuple[Any, ...]:
    if not isinstance(value, list | tuple):
        _fail(path, "must be an array")
    return tuple(value)


def _freeze_json(value: object, path: str) -> FrozenJsonValue:
    if value is None or isinstance(value, bool | str):
        return value
    if isinstance(value, int) and not isinstance(value, bool):
        return value
    if isinstance(value, float):
        if not isfinite(value):
            _fail(path, "contains a non-finite number")
        return value
    if isinstance(value, list | tuple):
        return tuple(
            _freeze_json(item, f"{path}[{index}]") for index, item in enumerate(value)
        )
    if isinstance(value, Mapping):
        if not all(isinstance(key, str) for key in value):
            _fail(path, "contains a non-string object key")
        return MappingProxyType(
            {
                key: _freeze_json(value[key], f"{path}.{key}")
                for key in sorted(value)
            }
        )
    _fail(path, "contains a non-JSON value")


def _json_object(value: object, path: str) -> Mapping[str, FrozenJsonValue]:
    frozen = _freeze_json(value, path)
    if not isinstance(frozen, Mapping):
        _fail(path, "must be an object")
    return frozen


def _encode(value: object) -> Any:
    if isinstance(value, VersionedModel):
        return value.to_dict()
    if isinstance(value, StrEnum):
        return value.value
    if isinstance(value, datetime):
        return value.astimezone(UTC).isoformat().replace("+00:00", "Z")
    if isinstance(value, date | time):
        return value.isoformat()
    if isinstance(value, Mapping):
        return {key: _encode(item) for key, item in sorted(value.items())}
    if isinstance(value, tuple):
        return [_encode(item) for item in value]
    return value


@dataclass(frozen=True, slots=True, kw_only=True)
class VersionedModel:
    """Base for records with deterministic JSON encoding."""

    schema_version: int = MODEL_SCHEMA_VERSION

    def __post_init__(self) -> None:
        _integer(self.schema_version, "schema_version", minimum=1)
        if self.schema_version != MODEL_SCHEMA_VERSION:
            _fail("schema_version", f"must equal {MODEL_SCHEMA_VERSION}")

    def to_dict(self) -> dict[str, Any]:
        """Encode the record as deterministic JSON-compatible data."""

        return {
            field.name: _encode(getattr(self, field.name)) for field in fields(self)
        }


@dataclass(frozen=True, slots=True, kw_only=True)
class Profile(VersionedModel):
    """A named activation scope for schedules."""

    id: str
    revision: int
    name: str
    profile_type: ProfileType
    active: bool
    icon: str | None
    color: str | None
    order: int
    created_at: datetime
    updated_at: datetime

    def __post_init__(self) -> None:
        VersionedModel.__post_init__(self)
        _uuid(self.id, "profile.id")
        _integer(self.revision, "profile.revision", minimum=1)
        _string(self.name, "profile.name")
        profile_type = _enum(
            ProfileType, self.profile_type, "profile.profile_type"
        )
        _boolean(self.active, "profile.active")
        _optional_string(self.icon, "profile.icon")
        _optional_string(self.color, "profile.color")
        _integer(self.order, "profile.order", minimum=0)
        created_at = _utc_datetime(self.created_at, "profile.created_at")
        updated_at = _utc_datetime(self.updated_at, "profile.updated_at")
        if updated_at < created_at:
            _fail("profile.updated_at", "must not precede created_at")
        object.__setattr__(self, "profile_type", profile_type)
        object.__setattr__(self, "created_at", created_at)
        object.__setattr__(self, "updated_at", updated_at)

    @classmethod
    def from_dict(cls, data: object) -> Self:
        """Decode and validate a profile."""

        item = _strict_record(data, cls, "profile")
        return cls(
            schema_version=_integer(item["schema_version"], "profile.schema_version"),
            id=_uuid(item["id"], "profile.id"),
            revision=_integer(item["revision"], "profile.revision", minimum=1),
            name=_string(item["name"], "profile.name"),
            profile_type=_enum(
                ProfileType, item["profile_type"], "profile.profile_type"
            ),
            active=_boolean(item["active"], "profile.active"),
            icon=_optional_string(item["icon"], "profile.icon"),
            color=_optional_string(item["color"], "profile.color"),
            order=_integer(item["order"], "profile.order", minimum=0),
            created_at=_utc_datetime(item["created_at"], "profile.created_at"),
            updated_at=_utc_datetime(item["updated_at"], "profile.updated_at"),
        )


@dataclass(frozen=True, slots=True, kw_only=True)
class Group(VersionedModel):
    """A visual and organisational entity group."""

    id: str
    revision: int
    profile_id: str
    name: str
    entity_ids: tuple[str, ...]
    icon: str | None
    color: str | None
    order: int
    created_at: datetime
    updated_at: datetime

    def __post_init__(self) -> None:
        VersionedModel.__post_init__(self)
        _uuid(self.id, "group.id")
        _integer(self.revision, "group.revision", minimum=1)
        _uuid(self.profile_id, "group.profile_id")
        _string(self.name, "group.name")
        entities = tuple(
            _entity_id(entity_id, f"group.entity_ids[{index}]")
            for index, entity_id in enumerate(self.entity_ids)
        )
        if len(set(entities)) != len(entities):
            _fail("group.entity_ids", "must not contain duplicates")
        object.__setattr__(self, "entity_ids", entities)
        _optional_string(self.icon, "group.icon")
        _optional_string(self.color, "group.color")
        _integer(self.order, "group.order", minimum=0)
        created_at = _utc_datetime(self.created_at, "group.created_at")
        updated_at = _utc_datetime(self.updated_at, "group.updated_at")
        if updated_at < created_at:
            _fail("group.updated_at", "must not precede created_at")
        object.__setattr__(self, "created_at", created_at)
        object.__setattr__(self, "updated_at", updated_at)

    @classmethod
    def from_dict(cls, data: object) -> Self:
        """Decode and validate a group."""

        item = _strict_record(data, cls, "group")
        return cls(
            schema_version=_integer(item["schema_version"], "group.schema_version"),
            id=_uuid(item["id"], "group.id"),
            revision=_integer(item["revision"], "group.revision", minimum=1),
            profile_id=_uuid(item["profile_id"], "group.profile_id"),
            name=_string(item["name"], "group.name"),
            entity_ids=tuple(
                _entity_id(value, f"group.entity_ids[{index}]")
                for index, value in enumerate(
                    _tuple(item["entity_ids"], "group.entity_ids")
                )
            ),
            icon=_optional_string(item["icon"], "group.icon"),
            color=_optional_string(item["color"], "group.color"),
            order=_integer(item["order"], "group.order", minimum=0),
            created_at=_utc_datetime(item["created_at"], "group.created_at"),
            updated_at=_utc_datetime(item["updated_at"], "group.updated_at"),
        )


@dataclass(frozen=True, slots=True, kw_only=True)
class TimeSlot(VersionedModel):
    """A weekly half-open local-time interval."""

    id: str
    weekdays: tuple[int, ...]
    start: time
    end: time

    def __post_init__(self) -> None:
        VersionedModel.__post_init__(self)
        _uuid(self.id, "time_slot.id")
        weekdays = tuple(
            _integer(day, f"time_slot.weekdays[{index}]")
            for index, day in enumerate(self.weekdays)
        )
        if not weekdays:
            _fail("time_slot.weekdays", "must not be empty")
        if any(day < 0 or day > 6 for day in weekdays):
            _fail("time_slot.weekdays", "values must be between 0 and 6")
        if tuple(sorted(set(weekdays))) != weekdays:
            _fail("time_slot.weekdays", "must be sorted and unique")
        object.__setattr__(self, "weekdays", weekdays)
        object.__setattr__(self, "start", _time(self.start, "time_slot.start"))
        object.__setattr__(self, "end", _time(self.end, "time_slot.end"))

    @classmethod
    def from_dict(cls, data: object) -> Self:
        """Decode and validate a time slot."""

        item = _strict_record(data, cls, "time_slot")
        return cls(
            schema_version=_integer(item["schema_version"], "time_slot.schema_version"),
            id=_uuid(item["id"], "time_slot.id"),
            weekdays=tuple(
                _integer(value, f"time_slot.weekdays[{index}]")
                for index, value in enumerate(
                    _tuple(item["weekdays"], "time_slot.weekdays")
                )
            ),
            start=_time(item["start"], "time_slot.start"),
            end=_time(item["end"], "time_slot.end"),
        )


@dataclass(frozen=True, slots=True, kw_only=True)
class TargetAction(VersionedModel):
    """A validated-domain action without a target entity."""

    id: str
    domain: str
    action: str
    data: Mapping[str, FrozenJsonValue]

    def __post_init__(self) -> None:
        VersionedModel.__post_init__(self)
        _uuid(self.id, "target_action.id")
        domain = _string(self.domain, "target_action.domain")
        if re.fullmatch(_DOMAIN_PATTERN, domain) is None:
            _fail("target_action.domain", "must be a Home Assistant domain")
        action = _string(self.action, "target_action.action")
        if re.fullmatch(_OBJECT_ID_PATTERN, action) is None:
            _fail("target_action.action", "must be a Home Assistant action name")
        data = _json_object(self.data, "target_action.data")
        forbidden = sorted(TARGET_SELECTOR_KEYS.intersection(data))
        if forbidden:
            _fail(
                "target_action.data",
                f"must not contain target selectors: {', '.join(forbidden)}",
            )
        if action == APPLY_STATE_ACTION and (
            not isinstance(data.get("state"), str) or not data["state"]
        ):
            _fail("target_action.data.state", "is required for apply_state")
        object.__setattr__(self, "data", data)

    @classmethod
    def from_dict(cls, data: object) -> Self:
        """Decode and validate a target action."""

        item = _strict_record(data, cls, "target_action")
        return cls(
            schema_version=_integer(
                item["schema_version"], "target_action.schema_version"
            ),
            id=_uuid(item["id"], "target_action.id"),
            domain=_string(item["domain"], "target_action.domain"),
            action=_string(item["action"], "target_action.action"),
            data=_json_object(item["data"], "target_action.data"),
        )


@dataclass(frozen=True, slots=True, kw_only=True)
class ConditionNode(VersionedModel):
    """A node in the bounded condition abstract syntax tree."""

    id: str
    operator: ConditionOperator
    entity_id: str | None
    value: FrozenJsonValue
    lower: float | None
    upper: float | None
    children: tuple[ConditionNode, ...]
    minimum_duration_seconds: float | None
    hysteresis: float | None
    # Added in 0.3.7: optional in storage and omitted from JSON when unset.
    release_delay_seconds: float | None = None

    def __post_init__(self) -> None:
        VersionedModel.__post_init__(self)
        _uuid(self.id, "condition.id")
        operator = _enum(ConditionOperator, self.operator, "condition.operator")
        entity_id = (
            None
            if self.entity_id is None
            else _entity_id(self.entity_id, "condition.entity_id")
        )
        frozen_value = _freeze_json(self.value, "condition.value")
        lower = _optional_number(self.lower, "condition.lower")
        upper = _optional_number(self.upper, "condition.upper")
        children = tuple(self.children)
        if not all(isinstance(child, ConditionNode) for child in children):
            _fail("condition.children", "must contain condition nodes")
        if len(children) > MAX_CONDITION_CHILDREN:
            _fail(
                "condition.children",
                f"must contain at most {MAX_CONDITION_CHILDREN} nodes",
            )
        duration = _optional_number(
            self.minimum_duration_seconds, "condition.minimum_duration_seconds"
        )
        hysteresis = _optional_number(self.hysteresis, "condition.hysteresis")
        release = _optional_number(
            self.release_delay_seconds, "condition.release_delay_seconds"
        )
        if release is not None and release < 0:
            _fail("condition.release_delay_seconds", "must not be negative")
        if duration is not None and duration < 0:
            _fail("condition.minimum_duration_seconds", "must not be negative")
        if hysteresis is not None and hysteresis < 0:
            _fail("condition.hysteresis", "must not be negative")

        logical = operator in {ConditionOperator.AND, ConditionOperator.OR}
        state = operator in {
            ConditionOperator.STATE_EQUALS,
            ConditionOperator.STATE_NOT_EQUALS,
        }
        numeric = operator in {
            ConditionOperator.NUMERIC_GREATER,
            ConditionOperator.NUMERIC_GREATER_OR_EQUAL,
            ConditionOperator.NUMERIC_LESS,
            ConditionOperator.NUMERIC_LESS_OR_EQUAL,
        }
        if logical:
            if len(children) < 2:
                _fail(
                    "condition.children",
                    "logical nodes require at least two children",
                )
            if any(
                value is not None
                for value in (entity_id, frozen_value, lower, upper, hysteresis)
            ):
                _fail(
                    "condition",
                    "logical nodes may only define children and duration",
                )
        elif children:
            _fail("condition.children", "leaf nodes cannot contain children")
        elif entity_id is None:
            _fail("condition.entity_id", "leaf nodes require an entity")

        if state and not isinstance(frozen_value, str):
            _fail("condition.value", "state comparisons require a string")
        if numeric:
            _number(frozen_value, "condition.value")
        if operator is ConditionOperator.NUMERIC_RANGE:
            if lower is None or upper is None:
                _fail("condition", "numeric_range requires lower and upper")
            if lower > upper:
                _fail("condition.lower", "must not exceed upper")
            if frozen_value is not None:
                _fail("condition.value", "numeric_range does not accept a value")
        elif lower is not None or upper is not None:
            _fail("condition", "lower and upper are only valid for numeric_range")
        if operator is ConditionOperator.AVAILABLE and frozen_value is not None:
            _fail("condition.value", "available does not accept a value")
        if hysteresis is not None and not (
            numeric or operator is ConditionOperator.NUMERIC_RANGE
        ):
            _fail("condition.hysteresis", "is only valid for numeric conditions")
        if _condition_depth(self) > MAX_CONDITION_DEPTH:
            _fail("condition", f"depth must not exceed {MAX_CONDITION_DEPTH}")
        if _condition_node_count(self) > MAX_CONDITION_NODES:
            _fail("condition", f"must not exceed {MAX_CONDITION_NODES} total nodes")

        object.__setattr__(self, "operator", operator)
        object.__setattr__(self, "entity_id", entity_id)
        object.__setattr__(self, "value", frozen_value)
        object.__setattr__(self, "lower", lower)
        object.__setattr__(self, "upper", upper)
        object.__setattr__(self, "children", children)
        object.__setattr__(self, "minimum_duration_seconds", duration)
        object.__setattr__(self, "hysteresis", hysteresis)
        object.__setattr__(self, "release_delay_seconds", release)

    def to_dict(self) -> dict[str, Any]:
        """Encode the tree; an unset release delay keeps the 0.3.6 shape."""

        payload = VersionedModel.to_dict(self)
        if self.release_delay_seconds is None:
            payload.pop("release_delay_seconds")
        payload["children"] = [child.to_dict() for child in self.children]
        return payload

    @classmethod
    def from_dict(cls, data: object) -> Self:
        """Decode and validate a bounded condition tree."""

        return cls._from_dict(data, "condition", 1, [MAX_CONDITION_NODES])

    @classmethod
    def _from_dict(
        cls, data: object, path: str, depth: int, remaining_nodes: list[int]
    ) -> Self:
        if depth > MAX_CONDITION_DEPTH:
            _fail(path, f"depth must not exceed {MAX_CONDITION_DEPTH}")
        if remaining_nodes[0] == 0:
            _fail("condition", f"must not exceed {MAX_CONDITION_NODES} total nodes")
        remaining_nodes[0] -= 1
        item = _strict_record(
            data, cls, path, optional=frozenset({"release_delay_seconds"})
        )
        raw_children = item["children"]
        if not isinstance(raw_children, list | tuple):
            _fail(f"{path}.children", "must be an array")
        if len(raw_children) > MAX_CONDITION_CHILDREN:
            _fail(
                f"{path}.children",
                f"must contain at most {MAX_CONDITION_CHILDREN} nodes",
            )
        children_data = tuple(raw_children)
        return cls(
            schema_version=_integer(item["schema_version"], f"{path}.schema_version"),
            id=_uuid(item["id"], f"{path}.id"),
            operator=_enum(ConditionOperator, item["operator"], f"{path}.operator"),
            entity_id=(
                None
                if item["entity_id"] is None
                else _entity_id(item["entity_id"], f"{path}.entity_id")
            ),
            value=_freeze_json(item["value"], f"{path}.value"),
            lower=_optional_number(item["lower"], f"{path}.lower"),
            upper=_optional_number(item["upper"], f"{path}.upper"),
            children=tuple(
                cls._from_dict(
                    child,
                    f"{path}.children[{index}]",
                    depth + 1,
                    remaining_nodes,
                )
                for index, child in enumerate(children_data)
            ),
            minimum_duration_seconds=_optional_number(
                item["minimum_duration_seconds"],
                f"{path}.minimum_duration_seconds",
            ),
            hysteresis=_optional_number(item["hysteresis"], f"{path}.hysteresis"),
            release_delay_seconds=_optional_number(
                item.get("release_delay_seconds"), f"{path}.release_delay_seconds"
            ),
        )


def _condition_depth(node: ConditionNode) -> int:
    if not node.children:
        return 1
    return 1 + max(_condition_depth(child) for child in node.children)


def _condition_node_count(node: ConditionNode) -> int:
    return 1 + sum(_condition_node_count(child) for child in node.children)


def _condition_ids(node: ConditionNode) -> tuple[str, ...]:
    return (
        node.id,
        *(item for child in node.children for item in _condition_ids(child)),
    )


@dataclass(frozen=True, slots=True, kw_only=True)
class NotificationRule(VersionedModel):
    """A non-templated notification request."""

    id: str
    action: str
    title: str
    message: str

    def __post_init__(self) -> None:
        VersionedModel.__post_init__(self)
        _uuid(self.id, "notification.id")
        _string(self.action, "notification.action")
        _string(self.title, "notification.title", allow_empty=True)
        _string(self.message, "notification.message")

    @classmethod
    def from_dict(cls, data: object) -> Self:
        """Decode and validate a notification rule."""

        item = _strict_record(data, cls, "notification")
        return cls(
            schema_version=_integer(
                item["schema_version"], "notification.schema_version"
            ),
            id=_uuid(item["id"], "notification.id"),
            action=_string(item["action"], "notification.action"),
            title=_string(item["title"], "notification.title", allow_empty=True),
            message=_string(item["message"], "notification.message"),
        )


@dataclass(frozen=True, slots=True, kw_only=True)
class Schedule(VersionedModel):
    """A versioned schedule configuration without runtime state."""

    id: str
    revision: int
    profile_id: str
    group_id: str
    name: str
    enabled: bool
    target_entity_ids: tuple[str, ...]
    time_slots: tuple[TimeSlot, ...]
    start_action: TargetAction
    end_action: TargetAction | None
    condition: ConditionNode | None
    override_policy: OverridePolicy
    start_notification: NotificationRule | None
    end_notification: NotificationRule | None
    inclusion_dates: tuple[date, ...]
    exclusion_dates: tuple[date, ...]
    created_at: datetime
    updated_at: datetime

    def __post_init__(self) -> None:
        VersionedModel.__post_init__(self)
        _uuid(self.id, "schedule.id")
        _integer(self.revision, "schedule.revision", minimum=1)
        _uuid(self.profile_id, "schedule.profile_id")
        _uuid(self.group_id, "schedule.group_id")
        _string(self.name, "schedule.name")
        _boolean(self.enabled, "schedule.enabled")
        targets = tuple(
            _entity_id(entity_id, f"schedule.target_entity_ids[{index}]")
            for index, entity_id in enumerate(self.target_entity_ids)
        )
        if not targets:
            _fail("schedule.target_entity_ids", "must not be empty")
        if len(set(targets)) != len(targets):
            _fail("schedule.target_entity_ids", "must not contain duplicates")
        if not self.time_slots or not all(
            isinstance(slot, TimeSlot) for slot in self.time_slots
        ):
            _fail("schedule.time_slots", "must contain at least one time slot")
        slot_ids = [slot.id for slot in self.time_slots]
        if len(set(slot_ids)) != len(slot_ids):
            _fail("schedule.time_slots", "slot IDs must be unique")
        if not isinstance(self.start_action, TargetAction):
            _fail("schedule.start_action", "must be a target action")
        if self.end_action is not None and not isinstance(
            self.end_action, TargetAction
        ):
            _fail("schedule.end_action", "must be a target action or null")
        if self.condition is not None and not isinstance(self.condition, ConditionNode):
            _fail("schedule.condition", "must be a condition or null")
        if self.condition is not None:
            condition_ids = _condition_ids(self.condition)
            if len(set(condition_ids)) != len(condition_ids):
                _fail("schedule.condition", "condition IDs must be unique")
        policy = _enum(
            OverridePolicy, self.override_policy, "schedule.override_policy"
        )
        if self.start_notification is not None and not isinstance(
            self.start_notification, NotificationRule
        ):
            _fail("schedule.start_notification", "must be a notification or null")
        if self.end_notification is not None and not isinstance(
            self.end_notification, NotificationRule
        ):
            _fail("schedule.end_notification", "must be a notification or null")
        inclusions = tuple(self.inclusion_dates)
        exclusions = tuple(self.exclusion_dates)
        if any(
            not isinstance(value, date) or isinstance(value, datetime)
            for value in inclusions + exclusions
        ):
            _fail("schedule", "inclusion and exclusion values must be dates")
        if tuple(sorted(set(inclusions))) != inclusions:
            _fail("schedule.inclusion_dates", "must be sorted and unique")
        if tuple(sorted(set(exclusions))) != exclusions:
            _fail("schedule.exclusion_dates", "must be sorted and unique")
        if set(inclusions) & set(exclusions):
            _fail("schedule", "a date cannot be both included and excluded")
        target_domains = {entity_id.split(".", 1)[0] for entity_id in targets}
        if target_domains != {self.start_action.domain}:
            _fail(
                "schedule.start_action.domain",
                "must match every target entity domain",
            )
        if self.end_action is not None and self.end_action.domain not in target_domains:
            _fail("schedule.end_action.domain", "must match target entity domain")
        created_at = _utc_datetime(self.created_at, "schedule.created_at")
        updated_at = _utc_datetime(self.updated_at, "schedule.updated_at")
        if updated_at < created_at:
            _fail("schedule.updated_at", "must not precede created_at")
        object.__setattr__(self, "target_entity_ids", targets)
        object.__setattr__(self, "time_slots", tuple(self.time_slots))
        object.__setattr__(self, "override_policy", policy)
        object.__setattr__(self, "inclusion_dates", inclusions)
        object.__setattr__(self, "exclusion_dates", exclusions)
        object.__setattr__(self, "created_at", created_at)
        object.__setattr__(self, "updated_at", updated_at)

    @classmethod
    def from_dict(cls, data: object) -> Self:
        """Decode and validate a schedule."""

        item = _strict_record(data, cls, "schedule")
        end_action = item["end_action"]
        condition = item["condition"]
        start_notification = item["start_notification"]
        end_notification = item["end_notification"]
        return cls(
            schema_version=_integer(item["schema_version"], "schedule.schema_version"),
            id=_uuid(item["id"], "schedule.id"),
            revision=_integer(item["revision"], "schedule.revision", minimum=1),
            profile_id=_uuid(item["profile_id"], "schedule.profile_id"),
            group_id=_uuid(item["group_id"], "schedule.group_id"),
            name=_string(item["name"], "schedule.name"),
            enabled=_boolean(item["enabled"], "schedule.enabled"),
            target_entity_ids=tuple(
                _entity_id(value, f"schedule.target_entity_ids[{index}]")
                for index, value in enumerate(
                    _tuple(item["target_entity_ids"], "schedule.target_entity_ids")
                )
            ),
            time_slots=tuple(
                TimeSlot.from_dict(value)
                for value in _tuple(item["time_slots"], "schedule.time_slots")
            ),
            start_action=TargetAction.from_dict(item["start_action"]),
            end_action=(
                None if end_action is None else TargetAction.from_dict(end_action)
            ),
            condition=(
                None if condition is None else ConditionNode.from_dict(condition)
            ),
            override_policy=_enum(
                OverridePolicy, item["override_policy"], "schedule.override_policy"
            ),
            start_notification=(
                None
                if start_notification is None
                else NotificationRule.from_dict(start_notification)
            ),
            end_notification=(
                None
                if end_notification is None
                else NotificationRule.from_dict(end_notification)
            ),
            inclusion_dates=tuple(
                _date(value, f"schedule.inclusion_dates[{index}]")
                for index, value in enumerate(
                    _tuple(item["inclusion_dates"], "schedule.inclusion_dates")
                )
            ),
            exclusion_dates=tuple(
                _date(value, f"schedule.exclusion_dates[{index}]")
                for index, value in enumerate(
                    _tuple(item["exclusion_dates"], "schedule.exclusion_dates")
                )
            ),
            created_at=_utc_datetime(item["created_at"], "schedule.created_at"),
            updated_at=_utc_datetime(item["updated_at"], "schedule.updated_at"),
        )


@dataclass(frozen=True, slots=True, kw_only=True)
class IntegrationConfig(VersionedModel):
    """Complete authoritative configuration payload."""

    revision: int
    profiles: tuple[Profile, ...]
    active_profile_ids: tuple[str, ...]
    groups: tuple[Group, ...]
    schedules: tuple[Schedule, ...]
    settings: Mapping[str, FrozenJsonValue]
    migration_metadata: Mapping[str, FrozenJsonValue]
    updated_at: datetime

    def __post_init__(self) -> None:
        VersionedModel.__post_init__(self)
        _integer(self.revision, "config.revision", minimum=0)
        profiles = tuple(self.profiles)
        groups = tuple(self.groups)
        schedules = tuple(self.schedules)
        if not all(isinstance(value, Profile) for value in profiles):
            _fail("config.profiles", "must contain profiles")
        if not all(isinstance(value, Group) for value in groups):
            _fail("config.groups", "must contain groups")
        if not all(isinstance(value, Schedule) for value in schedules):
            _fail("config.schedules", "must contain schedules")
        profile_ids = {profile.id for profile in profiles}
        group_by_id = {group.id: group for group in groups}
        if len(profile_ids) != len(profiles):
            _fail("config.profiles", "profile IDs must be unique")
        if len(group_by_id) != len(groups):
            _fail("config.groups", "group IDs must be unique")
        if len({schedule.id for schedule in schedules}) != len(schedules):
            _fail("config.schedules", "schedule IDs must be unique")
        nested_ids = [
            nested_id
            for schedule in schedules
            for nested_id in (
                *(slot.id for slot in schedule.time_slots),
                schedule.start_action.id,
                *(() if schedule.end_action is None else (schedule.end_action.id,)),
                *(
                    ()
                    if schedule.condition is None
                    else _condition_ids(schedule.condition)
                ),
                *(
                    ()
                    if schedule.start_notification is None
                    else (schedule.start_notification.id,)
                ),
                *(
                    ()
                    if schedule.end_notification is None
                    else (schedule.end_notification.id,)
                ),
            )
        ]
        all_record_ids = [
            *(profile.id for profile in profiles),
            *(group.id for group in groups),
            *(schedule.id for schedule in schedules),
            *nested_ids,
        ]
        if len(set(all_record_ids)) != len(all_record_ids):
            _fail("config", "all persisted record IDs must be globally unique")
        active_profile_ids = tuple(
            _uuid(value, f"config.active_profile_ids[{index}]")
            for index, value in enumerate(self.active_profile_ids)
        )
        if len(set(active_profile_ids)) != len(active_profile_ids):
            _fail("config.active_profile_ids", "must not contain duplicates")
        if not set(active_profile_ids) <= profile_ids:
            _fail("config.active_profile_ids", "references an unknown profile")
        if {profile.id for profile in profiles if profile.active} != set(
            active_profile_ids
        ):
            _fail("config.active_profile_ids", "must match profile active flags")
        for index, candidate_group in enumerate(groups):
            if candidate_group.profile_id not in profile_ids:
                _fail(
                    f"config.groups[{index}].profile_id",
                    "references unknown profile",
                )
        for index, schedule in enumerate(schedules):
            owning_group = group_by_id.get(schedule.group_id)
            if schedule.profile_id not in profile_ids:
                _fail(
                    f"config.schedules[{index}].profile_id",
                    "references unknown profile",
                )
            if owning_group is None:
                _fail(
                    f"config.schedules[{index}].group_id", "references unknown group"
                )
            if owning_group.profile_id != schedule.profile_id:
                _fail(
                    f"config.schedules[{index}]",
                    "profile and group ownership do not match",
                )
            if not set(schedule.target_entity_ids) <= set(
                owning_group.entity_ids
            ):
                _fail(
                    f"config.schedules[{index}].target_entity_ids",
                    "contains an entity outside its group",
                )
        settings = _json_object(self.settings, "config.settings")
        migration = _json_object(
            self.migration_metadata, "config.migration_metadata"
        )
        updated_at = _utc_datetime(self.updated_at, "config.updated_at")
        object.__setattr__(self, "profiles", profiles)
        object.__setattr__(self, "active_profile_ids", active_profile_ids)
        object.__setattr__(self, "groups", groups)
        object.__setattr__(self, "schedules", schedules)
        object.__setattr__(self, "settings", settings)
        object.__setattr__(self, "migration_metadata", migration)
        object.__setattr__(self, "updated_at", updated_at)

    @classmethod
    def from_dict(cls, data: object) -> Self:
        """Decode and cross-validate the complete configuration."""

        item = _strict_record(data, cls, "config")
        return cls(
            schema_version=_integer(item["schema_version"], "config.schema_version"),
            revision=_integer(item["revision"], "config.revision", minimum=0),
            profiles=tuple(
                Profile.from_dict(value)
                for value in _tuple(item["profiles"], "config.profiles")
            ),
            active_profile_ids=tuple(
                _uuid(value, f"config.active_profile_ids[{index}]")
                for index, value in enumerate(
                    _tuple(item["active_profile_ids"], "config.active_profile_ids")
                )
            ),
            groups=tuple(
                Group.from_dict(value)
                for value in _tuple(item["groups"], "config.groups")
            ),
            schedules=tuple(
                Schedule.from_dict(value)
                for value in _tuple(item["schedules"], "config.schedules")
            ),
            settings=_json_object(item["settings"], "config.settings"),
            migration_metadata=_json_object(
                item["migration_metadata"], "config.migration_metadata"
            ),
            updated_at=_utc_datetime(item["updated_at"], "config.updated_at"),
        )


@dataclass(frozen=True, slots=True, kw_only=True)
class Snapshot(VersionedModel):
    """Immutable entity state captured for one occurrence."""

    id: str
    occurrence_id: str
    entity_id: str
    domain: str
    state: str
    attributes: Mapping[str, FrozenJsonValue]
    checksum: str
    captured_at: datetime

    def __post_init__(self) -> None:
        VersionedModel.__post_init__(self)
        _uuid(self.id, "snapshot.id")
        _string(self.occurrence_id, "snapshot.occurrence_id")
        _entity_id(self.entity_id, "snapshot.entity_id")
        domain = _string(self.domain, "snapshot.domain")
        if self.entity_id.split(".", 1)[0] != domain:
            _fail("snapshot.domain", "must match entity_id")
        _string(self.state, "snapshot.state")
        object.__setattr__(
            self, "attributes", _json_object(self.attributes, "snapshot.attributes")
        )
        _string(self.checksum, "snapshot.checksum")
        object.__setattr__(
            self, "captured_at", _utc_datetime(self.captured_at, "snapshot.captured_at")
        )

    @classmethod
    def from_dict(cls, data: object) -> Self:
        """Decode and validate a snapshot."""

        item = _strict_record(data, cls, "snapshot")
        return cls(
            schema_version=_integer(item["schema_version"], "snapshot.schema_version"),
            id=_uuid(item["id"], "snapshot.id"),
            occurrence_id=_string(item["occurrence_id"], "snapshot.occurrence_id"),
            entity_id=_entity_id(item["entity_id"], "snapshot.entity_id"),
            domain=_string(item["domain"], "snapshot.domain"),
            state=_string(item["state"], "snapshot.state"),
            attributes=_json_object(item["attributes"], "snapshot.attributes"),
            checksum=_string(item["checksum"], "snapshot.checksum"),
            captured_at=_utc_datetime(item["captured_at"], "snapshot.captured_at"),
        )


@dataclass(frozen=True, slots=True, kw_only=True)
class Occurrence(VersionedModel):
    """Concrete execution retaining a frozen schedule revision."""

    id: str
    frozen_schedule: Schedule
    slot_id: str
    start_utc: datetime
    end_utc: datetime
    local_start: str
    local_end: str
    state: OccurrenceState
    condition_branch: ConditionBranch
    recovery_state: RecoveryState
    snapshot_ids: tuple[str, ...]
    pending_operation_ids: tuple[str, ...]
    last_operation_id: str | None

    def __post_init__(self) -> None:
        VersionedModel.__post_init__(self)
        _string(self.id, "occurrence.id")
        if not isinstance(self.frozen_schedule, Schedule):
            _fail("occurrence.frozen_schedule", "must be a schedule")
        _uuid(self.slot_id, "occurrence.slot_id")
        if self.slot_id not in {slot.id for slot in self.frozen_schedule.time_slots}:
            _fail("occurrence.slot_id", "is not present in the frozen schedule")
        start = _utc_datetime(self.start_utc, "occurrence.start_utc")
        end = _utc_datetime(self.end_utc, "occurrence.end_utc")
        if end <= start:
            _fail("occurrence.end_utc", "must follow start_utc")
        local_start = _local_datetime_text(
            self.local_start, "occurrence.local_start"
        )
        local_end = _local_datetime_text(self.local_end, "occurrence.local_end")
        if datetime.fromisoformat(local_start).astimezone(UTC) != start:
            _fail("occurrence.local_start", "must represent start_utc")
        if datetime.fromisoformat(local_end).astimezone(UTC) != end:
            _fail("occurrence.local_end", "must represent end_utc")
        state = _enum(OccurrenceState, self.state, "occurrence.state")
        branch = _enum(
            ConditionBranch, self.condition_branch, "occurrence.condition_branch"
        )
        recovery = _enum(
            RecoveryState, self.recovery_state, "occurrence.recovery_state"
        )
        snapshots = tuple(
            _uuid(value, f"occurrence.snapshot_ids[{index}]")
            for index, value in enumerate(self.snapshot_ids)
        )
        operations = tuple(
            _uuid(value, f"occurrence.pending_operation_ids[{index}]")
            for index, value in enumerate(self.pending_operation_ids)
        )
        if len(set(snapshots)) != len(snapshots):
            _fail("occurrence.snapshot_ids", "must not contain duplicates")
        if len(set(operations)) != len(operations):
            _fail("occurrence.pending_operation_ids", "must not contain duplicates")
        last_operation = (
            None
            if self.last_operation_id is None
            else _uuid(self.last_operation_id, "occurrence.last_operation_id")
        )
        object.__setattr__(self, "start_utc", start)
        object.__setattr__(self, "end_utc", end)
        object.__setattr__(self, "local_start", local_start)
        object.__setattr__(self, "local_end", local_end)
        object.__setattr__(self, "state", state)
        object.__setattr__(self, "condition_branch", branch)
        object.__setattr__(self, "recovery_state", recovery)
        object.__setattr__(self, "snapshot_ids", snapshots)
        object.__setattr__(self, "pending_operation_ids", operations)
        object.__setattr__(self, "last_operation_id", last_operation)

    @classmethod
    def from_dict(cls, data: object) -> Self:
        """Decode and validate an occurrence."""

        item = _strict_record(data, cls, "occurrence")
        return cls(
            schema_version=_integer(
                item["schema_version"], "occurrence.schema_version"
            ),
            id=_string(item["id"], "occurrence.id"),
            frozen_schedule=Schedule.from_dict(item["frozen_schedule"]),
            slot_id=_uuid(item["slot_id"], "occurrence.slot_id"),
            start_utc=_utc_datetime(item["start_utc"], "occurrence.start_utc"),
            end_utc=_utc_datetime(item["end_utc"], "occurrence.end_utc"),
            local_start=_local_datetime_text(
                item["local_start"], "occurrence.local_start"
            ),
            local_end=_local_datetime_text(item["local_end"], "occurrence.local_end"),
            state=_enum(OccurrenceState, item["state"], "occurrence.state"),
            condition_branch=_enum(
                ConditionBranch,
                item["condition_branch"],
                "occurrence.condition_branch",
            ),
            recovery_state=_enum(
                RecoveryState, item["recovery_state"], "occurrence.recovery_state"
            ),
            snapshot_ids=tuple(
                _uuid(value, f"occurrence.snapshot_ids[{index}]")
                for index, value in enumerate(
                    _tuple(item["snapshot_ids"], "occurrence.snapshot_ids")
                )
            ),
            pending_operation_ids=tuple(
                _uuid(value, f"occurrence.pending_operation_ids[{index}]")
                for index, value in enumerate(
                    _tuple(
                        item["pending_operation_ids"],
                        "occurrence.pending_operation_ids",
                    )
                )
            ),
            last_operation_id=(
                None
                if item["last_operation_id"] is None
                else _uuid(
                    item["last_operation_id"], "occurrence.last_operation_id"
                )
            ),
        )


@dataclass(frozen=True, slots=True, kw_only=True)
class EntityLease(VersionedModel):
    """Persisted arbitration ownership for one entity."""

    id: str
    entity_id: str
    controller_id: str
    controller_type: ControllerType
    occurrence_id: str | None
    effective_start: datetime
    comparison_key: tuple[str, ...]
    acquired_at: datetime
    generation: int
    state: LeaseState

    def __post_init__(self) -> None:
        VersionedModel.__post_init__(self)
        _uuid(self.id, "lease.id")
        _entity_id(self.entity_id, "lease.entity_id")
        _string(self.controller_id, "lease.controller_id")
        controller_type = _enum(
            ControllerType, self.controller_type, "lease.controller_type"
        )
        occurrence_id = _optional_string(self.occurrence_id, "lease.occurrence_id")
        effective_start = _utc_datetime(
            self.effective_start, "lease.effective_start"
        )
        comparison_key = tuple(
            _string(value, f"lease.comparison_key[{index}]")
            for index, value in enumerate(self.comparison_key)
        )
        if not comparison_key:
            _fail("lease.comparison_key", "must not be empty")
        acquired_at = _utc_datetime(self.acquired_at, "lease.acquired_at")
        generation = _integer(self.generation, "lease.generation", minimum=1)
        state = _enum(LeaseState, self.state, "lease.state")
        object.__setattr__(self, "controller_type", controller_type)
        object.__setattr__(self, "occurrence_id", occurrence_id)
        object.__setattr__(self, "effective_start", effective_start)
        object.__setattr__(self, "comparison_key", comparison_key)
        object.__setattr__(self, "acquired_at", acquired_at)
        object.__setattr__(self, "generation", generation)
        object.__setattr__(self, "state", state)

    @classmethod
    def from_dict(cls, data: object) -> Self:
        """Decode and validate an entity lease."""

        item = _strict_record(data, cls, "lease")
        return cls(
            schema_version=_integer(item["schema_version"], "lease.schema_version"),
            id=_uuid(item["id"], "lease.id"),
            entity_id=_entity_id(item["entity_id"], "lease.entity_id"),
            controller_id=_string(item["controller_id"], "lease.controller_id"),
            controller_type=_enum(
                ControllerType, item["controller_type"], "lease.controller_type"
            ),
            occurrence_id=_optional_string(
                item["occurrence_id"], "lease.occurrence_id"
            ),
            effective_start=_utc_datetime(
                item["effective_start"], "lease.effective_start"
            ),
            comparison_key=tuple(
                _string(value, f"lease.comparison_key[{index}]")
                for index, value in enumerate(
                    _tuple(item["comparison_key"], "lease.comparison_key")
                )
            ),
            acquired_at=_utc_datetime(item["acquired_at"], "lease.acquired_at"),
            generation=_integer(item["generation"], "lease.generation", minimum=1),
            state=_enum(LeaseState, item["state"], "lease.state"),
        )


@dataclass(frozen=True, slots=True, kw_only=True)
class PendingOperation(VersionedModel):
    """A durable idempotent operation in the runtime journal."""

    id: str
    sequence: int
    occurrence_id: str | None
    entity_id: str | None
    kind: OperationKind
    state: OperationState
    payload: Mapping[str, FrozenJsonValue]
    attempt_count: int
    created_at: datetime
    updated_at: datetime
    next_retry_at: datetime | None
    error_code: str | None

    def __post_init__(self) -> None:
        VersionedModel.__post_init__(self)
        _uuid(self.id, "operation.id")
        sequence = _integer(self.sequence, "operation.sequence", minimum=1)
        occurrence_id = _optional_string(
            self.occurrence_id, "operation.occurrence_id"
        )
        entity_id = (
            None
            if self.entity_id is None
            else _entity_id(self.entity_id, "operation.entity_id")
        )
        kind = _enum(OperationKind, self.kind, "operation.kind")
        state = _enum(OperationState, self.state, "operation.state")
        if kind in {OperationKind.TARGET_ACTION, OperationKind.RESTORE}:
            if entity_id is None:
                _fail("operation.entity_id", f"{kind} requires an entity ID")
        payload = _json_object(self.payload, "operation.payload")
        attempt_count = _integer(
            self.attempt_count, "operation.attempt_count", minimum=0
        )
        created_at = _utc_datetime(self.created_at, "operation.created_at")
        updated_at = _utc_datetime(self.updated_at, "operation.updated_at")
        if updated_at < created_at:
            _fail("operation.updated_at", "must not precede created_at")
        next_retry_at = _optional_utc_datetime(
            self.next_retry_at, "operation.next_retry_at"
        )
        error_code = _optional_string(self.error_code, "operation.error_code")
        if state is OperationState.RETRY_WAIT and next_retry_at is None:
            _fail("operation.next_retry_at", "retry_wait requires a retry time")
        if state is not OperationState.RETRY_WAIT and next_retry_at is not None:
            _fail("operation.next_retry_at", "is only valid for retry_wait")
        object.__setattr__(self, "occurrence_id", occurrence_id)
        object.__setattr__(self, "sequence", sequence)
        object.__setattr__(self, "entity_id", entity_id)
        object.__setattr__(self, "kind", kind)
        object.__setattr__(self, "state", state)
        object.__setattr__(self, "payload", payload)
        object.__setattr__(self, "attempt_count", attempt_count)
        object.__setattr__(self, "created_at", created_at)
        object.__setattr__(self, "updated_at", updated_at)
        object.__setattr__(self, "next_retry_at", next_retry_at)
        object.__setattr__(self, "error_code", error_code)

    @classmethod
    def from_dict(cls, data: object) -> Self:
        """Decode and validate a pending operation."""

        item = _strict_record(data, cls, "operation")
        return cls(
            schema_version=_integer(
                item["schema_version"], "operation.schema_version"
            ),
            id=_uuid(item["id"], "operation.id"),
            sequence=_integer(item["sequence"], "operation.sequence", minimum=1),
            occurrence_id=_optional_string(
                item["occurrence_id"], "operation.occurrence_id"
            ),
            entity_id=(
                None
                if item["entity_id"] is None
                else _entity_id(item["entity_id"], "operation.entity_id")
            ),
            kind=_enum(OperationKind, item["kind"], "operation.kind"),
            state=_enum(OperationState, item["state"], "operation.state"),
            payload=_json_object(item["payload"], "operation.payload"),
            attempt_count=_integer(
                item["attempt_count"], "operation.attempt_count", minimum=0
            ),
            created_at=_utc_datetime(item["created_at"], "operation.created_at"),
            updated_at=_utc_datetime(item["updated_at"], "operation.updated_at"),
            next_retry_at=_optional_utc_datetime(
                item["next_retry_at"], "operation.next_retry_at"
            ),
            error_code=_optional_string(item["error_code"], "operation.error_code"),
        )


@dataclass(frozen=True, slots=True, kw_only=True)
class QuickTimer(VersionedModel):
    """Persistent one-shot controller configuration and state."""

    id: str
    controller_id: str
    entity_id: str
    action: TargetAction
    snapshot_id: str | None
    starts_at: datetime
    expires_at: datetime
    state: QuickTimerState
    created_at: datetime

    def __post_init__(self) -> None:
        VersionedModel.__post_init__(self)
        _uuid(self.id, "quick_timer.id")
        _string(self.controller_id, "quick_timer.controller_id")
        _entity_id(self.entity_id, "quick_timer.entity_id")
        if not isinstance(self.action, TargetAction):
            _fail("quick_timer.action", "must be a target action")
        if self.action.domain != self.entity_id.split(".", 1)[0]:
            _fail("quick_timer.action.domain", "must match entity_id")
        snapshot_id = (
            None
            if self.snapshot_id is None
            else _uuid(self.snapshot_id, "quick_timer.snapshot_id")
        )
        starts_at = _utc_datetime(self.starts_at, "quick_timer.starts_at")
        expires_at = _utc_datetime(self.expires_at, "quick_timer.expires_at")
        if expires_at <= starts_at:
            _fail("quick_timer.expires_at", "must follow starts_at")
        state = _enum(QuickTimerState, self.state, "quick_timer.state")
        created_at = _utc_datetime(self.created_at, "quick_timer.created_at")
        if created_at > starts_at:
            _fail("quick_timer.created_at", "must not follow starts_at")
        object.__setattr__(self, "snapshot_id", snapshot_id)
        object.__setattr__(self, "starts_at", starts_at)
        object.__setattr__(self, "expires_at", expires_at)
        object.__setattr__(self, "state", state)
        object.__setattr__(self, "created_at", created_at)

    @classmethod
    def from_dict(cls, data: object) -> Self:
        """Decode and validate a Quick Timer."""

        item = _strict_record(data, cls, "quick_timer")
        return cls(
            schema_version=_integer(
                item["schema_version"], "quick_timer.schema_version"
            ),
            id=_uuid(item["id"], "quick_timer.id"),
            controller_id=_string(item["controller_id"], "quick_timer.controller_id"),
            entity_id=_entity_id(item["entity_id"], "quick_timer.entity_id"),
            action=TargetAction.from_dict(item["action"]),
            snapshot_id=(
                None
                if item["snapshot_id"] is None
                else _uuid(item["snapshot_id"], "quick_timer.snapshot_id")
            ),
            starts_at=_utc_datetime(item["starts_at"], "quick_timer.starts_at"),
            expires_at=_utc_datetime(item["expires_at"], "quick_timer.expires_at"),
            state=_enum(QuickTimerState, item["state"], "quick_timer.state"),
            created_at=_utc_datetime(item["created_at"], "quick_timer.created_at"),
        )


@dataclass(frozen=True, slots=True, kw_only=True)
class AuditRecord(VersionedModel):
    """Non-authoritative redacted audit event."""

    id: str
    event_type: str
    level: AuditLevel
    recorded_at: datetime
    correlation_id: str | None
    entity_id: str | None
    details: Mapping[str, FrozenJsonValue]

    def __post_init__(self) -> None:
        VersionedModel.__post_init__(self)
        _uuid(self.id, "audit.id")
        _string(self.event_type, "audit.event_type")
        level = _enum(AuditLevel, self.level, "audit.level")
        recorded_at = _utc_datetime(self.recorded_at, "audit.recorded_at")
        correlation_id = _optional_string(
            self.correlation_id, "audit.correlation_id"
        )
        entity_id = (
            None
            if self.entity_id is None
            else _entity_id(self.entity_id, "audit.entity_id")
        )
        details = _json_object(self.details, "audit.details")
        object.__setattr__(self, "level", level)
        object.__setattr__(self, "recorded_at", recorded_at)
        object.__setattr__(self, "correlation_id", correlation_id)
        object.__setattr__(self, "entity_id", entity_id)
        object.__setattr__(self, "details", details)

    @classmethod
    def from_dict(cls, data: object) -> Self:
        """Decode and validate an audit record."""

        item = _strict_record(data, cls, "audit")
        return cls(
            schema_version=_integer(item["schema_version"], "audit.schema_version"),
            id=_uuid(item["id"], "audit.id"),
            event_type=_string(item["event_type"], "audit.event_type"),
            level=_enum(AuditLevel, item["level"], "audit.level"),
            recorded_at=_utc_datetime(item["recorded_at"], "audit.recorded_at"),
            correlation_id=_optional_string(
                item["correlation_id"], "audit.correlation_id"
            ),
            entity_id=(
                None
                if item["entity_id"] is None
                else _entity_id(item["entity_id"], "audit.entity_id")
            ),
            details=_json_object(item["details"], "audit.details"),
        )
