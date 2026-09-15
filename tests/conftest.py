"""Shared Home Assistant test fixtures."""

import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    """Allow Home Assistant to load integrations from custom_components."""

    yield
