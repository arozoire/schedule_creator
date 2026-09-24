"""Administrative backup, restore and full RESET of native Schedule Creator data."""

from __future__ import annotations

import logging
from dataclasses import replace
from datetime import UTC, datetime
from typing import Any, cast

import voluptuous as vol
from homeassistant.components.websocket_api.connection import ActiveConnection
from homeassistant.components.websocket_api.decorators import (
    async_response,
    require_admin,
    websocket_command,
)
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.util.hass_dict import HassKey

from .const import DOMAIN, INTEGRATION_VERSION
from .models import MODEL_SCHEMA_VERSION, IntegrationConfig
from .mutation_api import MutationClientError, _loaded_runtime, async_mutate_config
from .storage import ConfigRepository, RuntimeRepository, RuntimeStoreData

_LOGGER = logging.getLogger(__name__)
_REVISION = vol.All(int, vol.Range(min=0))
BACKUP_FORMAT = "schedule_creator.backup"
BACKUP_FORMAT_VERSION = 1
RESET_CONFIRMATION = "RESET"
_RESET_RUNNING: HassKey[bool] = HassKey(f"{DOMAIN}.reset_running")


def build_backup(config: IntegrationConfig, integration_version: str) -> dict[str, Any]:
    """Export configuration only: runtime, leases and pending commands stay out."""

    payload = config.to_dict()
    return {
        "format": BACKUP_FORMAT,
        "format_version": BACKUP_FORMAT_VERSION,
        "integration_version": integration_version,
        "exported_at": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "config": {
            key: payload[key]
            for key in ("schema_version", "profiles", "groups", "schedules")
        },
    }


def restored_config(
    current: IntegrationConfig, backup: object, now: datetime
) -> IntegrationConfig:
    """Validate a backup completely before replacing the current configuration.

    Profiles are restored inactive so that an import never sends commands.
    """

    if (
        not isinstance(backup, dict)
        or backup.get("format") != BACKUP_FORMAT
        or backup.get("format_version") != BACKUP_FORMAT_VERSION
        or not isinstance(backup.get("config"), dict)
    ):
        raise MutationClientError(
            "invalid_format", "The file is not a Schedule Creator backup."
        )
    source = cast(dict[str, Any], backup["config"])
    if source.get("schema_version") != MODEL_SCHEMA_VERSION:
        raise MutationClientError(
            "incompatible_backup", "The backup uses an unsupported schema version."
        )
    profiles = source.get("profiles")
    if not isinstance(profiles, list) or not all(
        isinstance(item, dict) for item in profiles
    ):
        raise ValueError("invalid profiles")
    current_payload = current.to_dict()
    return IntegrationConfig.from_dict(
        {
            "schema_version": MODEL_SCHEMA_VERSION,
            "revision": current.revision + 1,
            "profiles": [{**item, "active": False} for item in profiles],
            "active_profile_ids": [],
            "groups": source.get("groups"),
            "schedules": source.get("schedules"),
            "settings": current_payload["settings"],
            "migration_metadata": current_payload["migration_metadata"],
            "updated_at": max(current.updated_at, now)
            .isoformat()
            .replace("+00:00", "Z"),
        }
    )


def _config_response(config: IntegrationConfig) -> dict[str, Any]:
    return {
        "revision": config.revision,
        "profiles": len(config.profiles),
        "groups": len(config.groups),
        "schedules": len(config.schedules),
    }


@require_admin
@websocket_command({vol.Required("type"): "schedule_creator/backup/export"})
@async_response
async def websocket_export_backup(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    """Return a JSON backup of profiles, groups and schedules."""

    runtime = _loaded_runtime(hass)
    config = None if runtime is None else runtime.storage.config.data
    if config is None:
        connection.send_error(
            msg["id"], "not_loaded", "Schedule Creator is not loaded."
        )
        return
    connection.send_result(
        msg["id"], build_backup(config, hass.data.get(INTEGRATION_VERSION, ""))
    )


@require_admin
@websocket_command(
    {
        vol.Required("type"): "schedule_creator/backup/import",
        vol.Required("expected_revision"): _REVISION,
        vol.Required("backup"): dict,
    }
)
@async_response
async def websocket_import_backup(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    """Replace the configuration with a validated backup in one commit."""

    await async_mutate_config(
        hass,
        connection,
        msg,
        lambda config, now: restored_config(config, msg["backup"], now),
        _config_response,
        invalid_message="Backup content is invalid.",
        internal_message="Unable to restore the Schedule Creator backup.",
    )


def _empty_runtime(current: RuntimeStoreData, now: datetime) -> RuntimeStoreData:
    # Revisions keep increasing so that drafts opened before RESET are refused.
    return replace(
        current,
        revision=current.revision + 1,
        occurrences=(),
        snapshots=(),
        leases=(),
        pending_operations=(),
        quick_timers=(),
        updated_at=max(current.updated_at, now),
    )


def _empty_config(current: IntegrationConfig, now: datetime) -> IntegrationConfig:
    return replace(
        current,
        revision=current.revision + 1,
        profiles=(),
        active_profile_ids=(),
        groups=(),
        schedules=(),
        updated_at=max(current.updated_at, now),
    )


async def async_reset(hass: HomeAssistant, expected_revision: int) -> int:
    """Stop the runtime, delete native data and start again with an empty setup.

    Runtime is cleared before configuration: an interruption between the two
    writes leaves the old configuration, which is replanned on the next start,
    and never old commands without their schedules. Devices keep their current
    state; commands already sent to HA cannot be revoked.
    """

    entry = next(iter(hass.config_entries.async_entries(DOMAIN)), None)
    if entry is None or entry.state is not ConfigEntryState.LOADED:
        raise MutationClientError("not_loaded", "Schedule Creator is not loaded.")
    if hass.data.get(_RESET_RUNNING):
        raise MutationClientError("reset_running", "A RESET is already running.")
    loaded = _loaded_runtime(hass)
    current = None if loaded is None else loaded.storage.config.data
    if current is not None and current.revision != expected_revision:
        raise MutationClientError(
            "revision_conflict",
            f"Configuration changed; current revision is {current.revision}.",
        )
    hass.data[_RESET_RUNNING] = True
    try:
        if not await hass.config_entries.async_unload(entry.entry_id):
            raise RuntimeError("unable to stop Schedule Creator")
        try:
            config_repository = ConfigRepository(hass)
            runtime_repository = RuntimeRepository(hass)
            config = await config_repository.async_load()
            runtime = await runtime_repository.async_load()
            if config is None or runtime is None:
                raise RuntimeError("native data is unavailable")
            if config.revision != expected_revision:
                raise MutationClientError(
                    "revision_conflict",
                    f"Configuration changed; current revision is {config.revision}.",
                )
            now = datetime.now(UTC)
            await runtime_repository.async_update(
                lambda current: _empty_runtime(current, now)
            )
            updated = await config_repository.async_update(
                expected_revision, lambda current: _empty_config(_require(current), now)
            )
            return updated.revision
        finally:
            await hass.config_entries.async_setup(entry.entry_id)
    finally:
        hass.data.pop(_RESET_RUNNING, None)


def _require(config: IntegrationConfig | None) -> IntegrationConfig:
    if config is None:
        raise RuntimeError("configuration is unavailable")
    return config


@require_admin
@websocket_command(
    {
        vol.Required("type"): "schedule_creator/reset",
        vol.Required("expected_revision"): _REVISION,
        vol.Required("confirm"): RESET_CONFIRMATION,
    }
)
@async_response
async def websocket_reset(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    """Delete profiles, groups, schedules, timers and runtime journal."""

    try:
        revision = await async_reset(hass, msg["expected_revision"])
    except MutationClientError as err:
        connection.send_error(msg["id"], err.code, err.client_message)
        return
    except Exception:
        _LOGGER.exception("Schedule Creator RESET failed")
        connection.send_error(
            msg["id"], "storage_unavailable", "RESET could not be completed."
        )
        return
    connection.send_result(msg["id"], {"revision": revision})


BACKUP_COMMANDS = (websocket_export_backup, websocket_import_backup, websocket_reset)
