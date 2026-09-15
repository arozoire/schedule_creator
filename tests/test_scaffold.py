"""Tests for the inert Schedule Creator scaffold."""

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).parents[1]
COMPONENT = ROOT / "custom_components" / "schedule_creator"


class ScaffoldTest(unittest.TestCase):
    """Validate the inert Phase 1 repository."""

    def test_manifest_identity(self) -> None:
        """The HACS integration must expose its stable identity."""

        manifest = json.loads((COMPONENT / "manifest.json").read_text())
        self.assertEqual(manifest["domain"], "schedule_creator")
        self.assertEqual(manifest["name"], "Schedule Creator")
        self.assertIs(manifest["config_flow"], True)
        self.assertEqual(manifest["integration_type"], "service")

    def test_required_translations_are_valid(self) -> None:
        """Every initial locale must contain setup and duplicate-entry text."""

        for language in ("en", "it", "fr"):
            payload = json.loads(
                (COMPONENT / "translations" / f"{language}.json").read_text()
            )
            self.assertTrue(payload["config"]["step"]["user"]["title"])
            self.assertTrue(payload["config"]["abort"]["already_configured"])

    def test_scaffold_defines_no_entity_platform(self) -> None:
        """Phase 1 must not add schedule/helper entities to the state machine."""

        forbidden = {"switch.py", "sensor.py", "button.py", "select.py"}
        names = {path.name for path in COMPONENT.iterdir()}
        self.assertTrue(forbidden.isdisjoint(names))
