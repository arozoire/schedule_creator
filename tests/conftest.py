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


@pytest.fixture(autouse=True)
def fail_on_deprecated_usage(caplog):
    """Fail when Home Assistant reports a deprecated or blocking call from here.

    Home Assistant warns ("Detected that custom integration …") long before an
    API is removed; turning the warning into a failure gives months of notice.
    """

    yield
    reports = [
        record.getMessage()
        for phase in ("setup", "call")
        for record in caplog.get_records(phase)
        if "custom integration 'schedule_creator'" in record.getMessage()
        and record.getMessage().startswith("Detected")
    ]
    assert not reports, "\n".join(reports)
