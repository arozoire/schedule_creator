"""Lifecycle-owned rolling occurrence horizon."""

from __future__ import annotations

import logging
from datetime import timedelta
from typing import TYPE_CHECKING
from zoneinfo import ZoneInfo

from homeassistant.helpers.event import async_track_time_interval

from .const import DOMAIN
from .reconciliation import async_reconcile_horizon

if TYPE_CHECKING:
    from datetime import datetime

    from homeassistant.core import CALLBACK_TYPE, HomeAssistant

    from .storage import ScheduleCreatorStorage

_LOGGER = logging.getLogger(__name__)

HORIZON_REFRESH_INTERVAL = timedelta(days=1)


class HorizonRefreshCoordinator:
    """Keep the materialized horizon rolling while the entry is loaded."""

    def __init__(
        self, hass: HomeAssistant, storage: ScheduleCreatorStorage
    ) -> None:
        self._hass = hass
        self._storage = storage
        self._cancel: CALLBACK_TYPE | None = None
        self._active = False

    @property
    def active(self) -> bool:
        """Return whether periodic refresh is registered."""

        return self._active

    def start(self) -> None:
        """Register the periodic refresh callback."""

        if self._active:
            return
        self._active = True
        self._cancel = async_track_time_interval(
            self._hass,
            self._async_refresh,
            HORIZON_REFRESH_INTERVAL,
            name=DOMAIN,
        )

    def shutdown(self) -> None:
        """Cancel future callbacks before the entry releases its storage."""

        self._active = False
        if self._cancel is not None:
            self._cancel()
            self._cancel = None

    async def _async_refresh(self, now: datetime) -> None:
        """Advance the horizon while serialized with lifecycle mutations."""

        from . import lifecycle_lock

        async with lifecycle_lock(self._hass):
            if not self._active:
                return
            config = self._storage.config.data
            if config is None:
                _LOGGER.error("Unable to refresh occurrence horizon: no configuration")
                return
            try:
                await async_reconcile_horizon(
                    self._storage.runtime,
                    config,
                    ZoneInfo(self._hass.config.time_zone),
                    now,
                )
            except Exception:
                _LOGGER.exception("Unable to refresh occurrence horizon")
