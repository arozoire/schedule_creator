"""Test persisted Schedule Creator model contracts."""

import json
from copy import deepcopy
from dataclasses import FrozenInstanceError
from pathlib import Path

import pytest

from custom_components.schedule_creator.models import (
    AuditRecord,
    EntityLease,
    IntegrationConfig,
    ModelValidationError,
    Occurrence,
    PendingOperation,
    QuickTimer,
    Snapshot,
)

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "models_v1.json"


@pytest.fixture
def model_data() -> dict:
    """Return a fresh canonical model bundle."""

    return json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))


@pytest.mark.parametrize(
    ("key", "model_type"),
    [
        ("config", IntegrationConfig),
        ("snapshot", Snapshot),
        ("occurrence", Occurrence),
        ("lease", EntityLease),
        ("pending_operation", PendingOperation),
        ("quick_timer", QuickTimer),
        ("audit", AuditRecord),
    ],
)
def test_model_bundle_round_trips(model_data: dict, key: str, model_type: type) -> None:
    """Every persisted record decodes and re-encodes without loss."""

    model = model_type.from_dict(model_data[key])

    assert model.to_dict() == model_data[key]
    json.dumps(model.to_dict())


def test_config_nested_values_are_immutable(model_data: dict) -> None:
    """Frozen records also freeze nested action and settings payloads."""

    config = IntegrationConfig.from_dict(model_data["config"])
    action = config.schedules[0].start_action

    with pytest.raises(TypeError):
        action.data["brightness"] = 1
    with pytest.raises(FrozenInstanceError):
        config.revision = 5


def test_unknown_fields_fail_predictably(model_data: dict) -> None:
    """Unknown persisted fields never pass silently."""

    data = deepcopy(model_data["config"])
    data["unexpected"] = True

    with pytest.raises(ModelValidationError, match="unknown fields: unexpected"):
        IntegrationConfig.from_dict(data)


def test_wrong_schema_version_is_rejected(model_data: dict) -> None:
    """A future schema cannot be interpreted as version one."""

    data = deepcopy(model_data["snapshot"])
    data["schema_version"] = 2

    with pytest.raises(ModelValidationError, match="schema_version: must equal 1"):
        Snapshot.from_dict(data)


def test_non_utc_persisted_timestamp_is_rejected(model_data: dict) -> None:
    """Authoritative timestamps use UTC rather than local offsets."""

    data = deepcopy(model_data["pending_operation"])
    data["created_at"] = "2026-09-15T18:30:00+02:00"

    with pytest.raises(ModelValidationError, match="created_at: must use UTC"):
        PendingOperation.from_dict(data)


def test_broken_configuration_reference_is_rejected(model_data: dict) -> None:
    """Schedules cannot reference a group from another profile."""

    data = deepcopy(model_data["config"])
    data["groups"][0]["profile_id"] = "ffffffff-ffff-4fff-8fff-ffffffffffff"

    with pytest.raises(ModelValidationError, match="references unknown profile"):
        IntegrationConfig.from_dict(data)


def test_snapshot_domain_must_match_entity(model_data: dict) -> None:
    """A snapshot cannot be restored through an unrelated domain adapter."""

    data = deepcopy(model_data["snapshot"])
    data["domain"] = "switch"

    with pytest.raises(ModelValidationError, match="must match entity_id"):
        Snapshot.from_dict(data)


def test_retry_operation_requires_retry_time(model_data: dict) -> None:
    """Retry evidence is incomplete without a persisted next attempt time."""

    data = deepcopy(model_data["pending_operation"])
    data["next_retry_at"] = None

    with pytest.raises(ModelValidationError, match="requires a retry time"):
        PendingOperation.from_dict(data)


def test_occurrence_keeps_frozen_schedule_revision(model_data: dict) -> None:
    """The occurrence owns its schedule revision rather than the live config."""

    occurrence = Occurrence.from_dict(model_data["occurrence"])
    config = IntegrationConfig.from_dict(model_data["config"])

    assert occurrence.frozen_schedule.revision == 3
    assert occurrence.frozen_schedule is not config.schedules[0]
    assert occurrence.frozen_schedule.to_dict() == config.schedules[0].to_dict()
