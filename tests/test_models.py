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
    TargetAction,
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


def test_occurrence_local_time_must_match_utc(model_data: dict) -> None:
    """Local boundaries cannot describe a different instant than UTC fields."""

    data = deepcopy(model_data["occurrence"])
    data["local_start"] = "2026-09-15T19:30:00+02:00"

    with pytest.raises(ModelValidationError, match="must represent start_utc"):
        Occurrence.from_dict(data)


def test_nested_record_ids_are_globally_unique(model_data: dict) -> None:
    """Imported nested records cannot alias another persisted record."""

    data = deepcopy(model_data["config"])
    data["schedules"][0]["start_action"]["id"] = data["groups"][0]["id"]

    with pytest.raises(ModelValidationError, match="globally unique"):
        IntegrationConfig.from_dict(data)


def test_direct_models_reject_noncanonical_uuid(model_data: dict) -> None:
    """Direct construction cannot retain an uppercase UUID spelling."""

    action = deepcopy(model_data["config"]["schedules"][0]["start_action"])
    action["id"] = action["id"].upper()

    with pytest.raises(ModelValidationError, match="canonical UUID form"):
        TargetAction(
            id=action["id"],
            domain=action["domain"],
            action=action["action"],
            data=action["data"],
        )


@pytest.mark.parametrize(
    "entity_id",
    ["Bad Domain.foo", "light.two.dots", "light.foo bar", "light._hidden"],
)
def test_invalid_home_assistant_entity_ids_are_rejected(
    model_data: dict, entity_id: str
) -> None:
    """Persisted targets use the same slug shape as Home Assistant entity IDs."""

    data = deepcopy(model_data["config"])
    data["groups"][0]["entity_ids"] = [entity_id]
    data["schedules"][0]["target_entity_ids"] = [entity_id]

    with pytest.raises(ModelValidationError, match="Home Assistant entity ID"):
        IntegrationConfig.from_dict(data)


@pytest.mark.parametrize(
    "selector", ["entity_id", "device_id", "area_id", "floor_id", "label_id", "target"]
)
def test_target_action_data_rejects_target_selectors(
    model_data: dict, selector: str
) -> None:
    """Action parameters cannot escape the validated schedule target set."""

    action = deepcopy(model_data["config"]["schedules"][0]["start_action"])
    action["data"][selector] = "light.outside_group"

    with pytest.raises(ModelValidationError, match="target selectors"):
        TargetAction.from_dict(action)


def test_condition_tree_has_total_node_limit(model_data: dict) -> None:
    """A broad tree cannot bypass the condition depth and fan-out limits."""

    data = deepcopy(model_data["config"])
    original = data["schedules"][0]["condition"]
    leaf_template = original["children"][0]
    branches = []
    sequence = 1
    for _ in range(4):
        branch = deepcopy(original)
        branch["id"] = f"{sequence:08x}-0000-4000-8000-{sequence:012x}"
        sequence += 1
        branch["children"] = []
        for _ in range(16):
            leaf = deepcopy(leaf_template)
            leaf["id"] = f"{sequence:08x}-0000-4000-8000-{sequence:012x}"
            sequence += 1
            branch["children"].append(leaf)
        branches.append(branch)
    original["children"] = branches

    with pytest.raises(ModelValidationError, match="64 total nodes"):
        IntegrationConfig.from_dict(data)


def test_condition_breadth_is_rejected_before_decoding_children(
    model_data: dict,
) -> None:
    """Oversized child arrays fail before malformed children are traversed."""

    data = deepcopy(model_data["config"])
    condition = data["schedules"][0]["condition"]
    condition["children"] = [None] * 17

    with pytest.raises(ModelValidationError, match="at most 16 nodes"):
        IntegrationConfig.from_dict(data)
