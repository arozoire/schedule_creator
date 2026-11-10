"""The documented example files must restore: AI assistants copy them."""

import json
from datetime import UTC, datetime
from pathlib import Path

from custom_components.schedule_creator.backup_api import restored_config
from custom_components.schedule_creator.models import IntegrationConfig

ROOT = Path(__file__).parents[1]
EMPTY = {
    "schema_version": 1,
    "revision": 1,
    "profiles": [],
    "active_profile_ids": [],
    "groups": [],
    "schedules": [],
    "settings": {"timezone_source": "home_assistant"},
    "migration_metadata": {"source": None},
    "updated_at": "2026-01-01T00:00:00Z",
}


def test_example_backups_restore() -> None:
    """Every docs/examples/*.backup.json is a valid backup."""
    examples = sorted((ROOT / "docs" / "examples").glob("*.backup.json"))
    assert examples
    for path in examples:
        backup = json.loads(path.read_text(encoding="utf-8"))
        config = restored_config(
            IntegrationConfig.from_dict(EMPTY), backup, datetime.now(UTC)
        )
        assert config.schedules, path.name
        assert not config.active_profile_ids
