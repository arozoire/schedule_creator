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

from .const import DOMAIN
from .models import IntegrationConfig, ModelValidationError
from .reconciliation import async_reconcile_horizon
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

    from . import lifecycle_lock

    try:
        async with lifecycle_lock(hass):
            runtime = _loaded_runtime(hass)
            if runtime is None:
                connection.send_error(
                    msg["id"], "not_loaded", "Schedule Creator is not loaded."
                )
                return
            now = datetime.now(UTC)
            updated = await runtime.storage.config.async_update(
                msg["expected_revision"],
                lambda config: mutation(_require_config(config), now),
            )
            try:
                await async_reconcile_horizon(
                    runtime.storage.runtime,
                    updated,
                    ZoneInfo(hass.config.time_zone),
                    now,
                )
            except Exception:
                # Configuration is already authoritative and cannot be rolled back
                # safely after a second Store fails. Startup reconciliation heals it.
                _LOGGER.exception(
                    "Unable to reconcile occurrences after configuration commit"
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
