"""Administrative Quick Timer mutations for Schedule Creator."""

from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

import voluptuous as vol
from homeassistant.components.websocket_api.connection import ActiveConnection
from homeassistant.components.websocket_api.decorators import (
    async_response,
    require_admin,
    websocket_command,
)
from homeassistant.core import HomeAssistant

from .models import ModelValidationError, QuickTimer, QuickTimerState, TargetAction
from .mutation_api import MutationClientError, _loaded_runtime
from .storage import RevisionConflictError, RuntimeStoreData, StorageNotLoadedError

_LOGGER = logging.getLogger(__name__)
_REVISION = vol.All(int, vol.Range(min=0))
_RECORD_ID = vol.All(str, vol.Length(min=1))
_DURATION = vol.All(vol.Any(int, float), vol.Range(min=1, max=604800))
type RuntimeApiMutation = Callable[[RuntimeStoreData, datetime], RuntimeStoreData]
type RuntimeApiResponse = Callable[[RuntimeStoreData], dict[str, Any]]


def _timer(runtime: RuntimeStoreData, timer_id: str) -> QuickTimer:
    try:
        return next(item for item in runtime.quick_timers if item.id == timer_id)
    except StopIteration as err:
        raise MutationClientError("not_found", "Quick Timer was not found.") from err


def _action(value: object) -> TargetAction:
    if not isinstance(value, dict) or set(value) != {"domain", "action", "data"}:
        raise ValueError("invalid action")
    return TargetAction.from_dict({"schema_version": 1, "id": str(uuid4()), **value})


async def _mutate(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
    mutation: RuntimeApiMutation,
    response: RuntimeApiResponse,
) -> None:
    from . import lifecycle_lock

    try:
        async with lifecycle_lock(hass):
            loaded = _loaded_runtime(hass)
            if loaded is None:
                connection.send_error(
                    msg["id"], "not_loaded", "Schedule Creator is not loaded."
                )
                return
            now = datetime.now(UTC)
            await loaded.storage.runtime.async_update_expected(
                msg["expected_revision"], lambda current: mutation(current, now)
            )
            await loaded.conditions.async_refresh(now)
            loaded.occurrence_boundaries.reschedule(now)
            updated = loaded.storage.runtime.data
        connection.send_result(msg["id"], response(updated))
    except RevisionConflictError as err:
        connection.send_error(
            msg["id"],
            "revision_conflict",
            f"Runtime changed; current revision is {err.actual}.",
        )
    except MutationClientError as err:
        connection.send_error(msg["id"], err.code, err.client_message)
    except (ModelValidationError, ValueError):
        connection.send_error(
            msg["id"], "invalid_payload", "Quick Timer data is invalid."
        )
    except (StorageNotLoadedError, OSError):
        _LOGGER.exception("Unable to write Schedule Creator runtime")
        connection.send_error(
            msg["id"], "storage_unavailable", "Schedule Creator storage is unavailable."
        )
    except Exception:
        _LOGGER.exception("Unexpected Quick Timer mutation failure")
        connection.send_error(
            msg["id"], "internal_error", "Unable to update the Quick Timer."
        )


@require_admin
@websocket_command(
    {
        vol.Required("type"): "schedule_creator/quick_timer/create",
        vol.Required("expected_revision"): _REVISION,
        vol.Required("entity_id"): _RECORD_ID,
        vol.Required("duration_seconds"): _DURATION,
        vol.Required("action"): dict,
    }
)
@async_response
async def websocket_create_quick_timer(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    """Create and immediately reconcile a one-shot controller."""

    timer_id = str(uuid4())

    def mutation(current: RuntimeStoreData, now: datetime) -> RuntimeStoreData:
        duration = msg["duration_seconds"]
        if isinstance(duration, bool):
            raise ValueError("invalid duration")
        timer = QuickTimer(
            id=timer_id,
            controller_id=f"quick:{timer_id}",
            entity_id=msg["entity_id"],
            action=_action(msg["action"]),
            snapshot_id=None,
            starts_at=now,
            expires_at=now + timedelta(seconds=duration),
            state=QuickTimerState.ACTIVE,
            created_at=now,
        )
        return replace(
            current,
            revision=current.revision + 1,
            quick_timers=(*current.quick_timers, timer),
            updated_at=max(current.updated_at, now),
        )

    await _mutate(
        hass,
        connection,
        msg,
        mutation,
        lambda runtime: {
            "revision": runtime.revision,
            "quick_timer": _timer(runtime, timer_id).to_dict(),
        },
    )


@require_admin
@websocket_command(
    {
        vol.Required("type"): "schedule_creator/quick_timer/cancel",
        vol.Required("expected_revision"): _REVISION,
        vol.Required("quick_timer_id"): _RECORD_ID,
    }
)
@async_response
async def websocket_cancel_quick_timer(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    """Cancel an active Quick Timer and reconcile its safe restore."""

    def mutation(current: RuntimeStoreData, now: datetime) -> RuntimeStoreData:
        timer = _timer(current, msg["quick_timer_id"])
        if timer.state is not QuickTimerState.ACTIVE:
            raise MutationClientError(
                "invalid_state", "Only an active Quick Timer can be cancelled."
            )
        return replace(
            current,
            revision=current.revision + 1,
            quick_timers=tuple(
                replace(item, state=QuickTimerState.CANCELLED)
                if item.id == timer.id
                else item
                for item in current.quick_timers
            ),
            updated_at=max(current.updated_at, now),
        )

    await _mutate(
        hass,
        connection,
        msg,
        mutation,
        lambda runtime: {
            "revision": runtime.revision,
            "quick_timer": _timer(runtime, msg["quick_timer_id"]).to_dict(),
        },
    )


QUICK_TIMER_COMMANDS = (
    websocket_create_quick_timer,
    websocket_cancel_quick_timer,
)
