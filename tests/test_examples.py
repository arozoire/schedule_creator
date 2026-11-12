"""The documented example files must import: AI assistants copy them."""

import json
from datetime import UTC, datetime
from pathlib import Path

from custom_components.schedule_creator.file_import import imported_file_config
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


def test_example_files_import() -> None:
    """Every docs/examples/*.import.json is a valid import file."""
    examples = sorted((ROOT / "docs" / "examples").glob("*.import.json"))
    assert examples
    for path in examples:
        document = json.loads(path.read_text(encoding="utf-8"))
        config, _ = imported_file_config(
            IntegrationConfig.from_dict(EMPTY), document, datetime.now(UTC)
        )
        assert config.schedules, path.name
        assert not config.active_profile_ids
