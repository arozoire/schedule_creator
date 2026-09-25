"""Shared optimistic WebSocket mutation boundary."""

from __future__ import annotations

import logging
from collections.abc import Callable
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any, cast
from zoneinfo import ZoneInfo

from homeassistant.components.websocket_api.connection import ActiveConnection
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant

from .boundaries import async_advance_occurrence_states
from .const import DOMAIN
from .models import IntegrationConfig, ModelValidationError
from .reconciliation import async_reconcile_horizon, sun_resolver
from .storage import RevisionConflictError, StorageNotLoadedError

if TYPE_CHECKING:
    from . import ScheduleCreatorConfigEntry, ScheduleCreatorRuntimeData

_LOGGER = logging.getLogger(__name__)

type ConfigMutation = Callable[[IntegrationConfig, datetime], IntegrationConfig]
type MutationResponse = Callable[[IntegrationConfig], dict[str, Any]]


class MutationClientError(RuntimeError):
    """Stable expected error suitable for a WebSocket client."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.client_message = message


def _loaded_runtime(hass: HomeAssistant) -> ScheduleCreatorRuntimeData | None:
    entry = next(iter(hass.config_entries.async_entries(DOMAIN)), None)
    if entry is None or entry.state is not ConfigEntryState.LOADED:
        return None
    loaded_entry = cast("ScheduleCreatorConfigEntry", entry)
    if (
        not hasattr(loaded_entry, "runtime_data")
        or not loaded_entry.runtime_data.loaded
    ):
        return None
    return loaded_entry.runtime_data


def _require_config(config: IntegrationConfig | None) -> IntegrationConfig:
    if config is None:
        raise StorageNotLoadedError("configuration is unavailable")
    return config


async def async_commit_config(
    hass: HomeAssistant,
    mutation: ConfigMutation,
    expected_revision: int | None = None,
) -> IntegrationConfig:
    """Commit one configuration change and replan, for any caller.

    ``expected_revision`` protects a client draft; services and entities that
    act on the current state pass None.
    """

    from . import lifecycle_lock

    async with lifecycle_lock(hass):
        runtime = _loaded_runtime(hass)
        if runtime is None:
            raise MutationClientError("not_loaded", "Schedule Creator is not loaded.")
        now = datetime.now(UTC)
        revision = expected_revision
        if revision is None:
            revision = _require_config(runtime.storage.config.data).revision
        updated = await runtime.storage.config.async_update(
            revision,
            lambda config: mutation(_require_config(config), now),
        )
        try:
            await async_reconcile_horizon(
                runtime.storage.runtime,
                updated,
                ZoneInfo(hass.config.time_zone),
                now,
                sun_resolver(hass),
            )
            await async_advance_occurrence_states(runtime.storage.runtime, now)
            await runtime.conditions.async_refresh(now)
            runtime.occurrence_boundaries.reschedule(now)
        except Exception:
            # Configuration is already authoritative and cannot be rolled back
            # safely after a second Store fails. Startup reconciliation heals it.
            _LOGGER.exception(
                "Unable to reconcile occurrences after configuration commit"
            )
    return updated


async def async_mutate_config(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
    mutation: ConfigMutation,
    response: MutationResponse,
    *,
    invalid_message: str,
    internal_message: str,
) -> None:
    """Serialize one validated optimistic mutation with entry lifecycle changes."""

    try:
        updated = await async_commit_config(
            hass, mutation, msg["expected_revision"]
        )
        connection.send_result(msg["id"], response(updated))
    except RevisionConflictError as err:
        connection.send_error(
            msg["id"],
            "revision_conflict",
            f"Configuration changed; current revision is {err.actual}.",
        )
    except MutationClientError as err:
        connection.send_error(msg["id"], err.code, err.client_message)
    except (ModelValidationError, ValueError):
        connection.send_error(msg["id"], "invalid_payload", invalid_message)
    except (StorageNotLoadedError, OSError):
        _LOGGER.exception("Unable to write Schedule Creator configuration")
        connection.send_error(
            msg["id"], "storage_unavailable", "Schedule Creator storage is unavailable."
        )
    except Exception:
        _LOGGER.exception("Unexpected Schedule Creator configuration mutation failure")
        connection.send_error(msg["id"], "internal_error", internal_message)
