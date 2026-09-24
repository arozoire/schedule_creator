"""Test the read API through Home Assistant's authenticated WebSocket transport."""

import json
from copy import deepcopy
from dataclasses import replace
from datetime import UTC, datetime
from pathlib import Path
from unittest.mock import PropertyMock, patch

from homeassistant import config_entries
from homeassistant.components import websocket_api
from homeassistant.setup import async_setup_component

from custom_components.schedule_creator import async_setup
from custom_components.schedule_creator.const import DOMAIN
from custom_components.schedule_creator.models import (
    ControllerType,
    EntityLease,
    LeaseState,
    Occurrence,
    OperationKind,
    OperationState,
    PendingOperation,
    QuickTimer,
    Snapshot,
)
from custom_components.schedule_creator.storage import (
    AUDIT_STORE_KEY,
    CONFIG_STORE_KEY,
    RUNTIME_STORE_KEY,
    ConfigRepository,
    RuntimeRepository,
    RuntimeStoreData,
    ScheduleCreatorStore,
    StorageNotLoadedError,
)
from custom_components.schedule_creator.websocket_api import (
    _previous_state,
    websocket_get_state,
    websocket_subscribe_runtime,
)

INTEGRATION_VERSION = json.loads(
    (
        Path(__file__).parents[1]
        / "custom_components"
        / "schedule_creator"
        / "manifest.json"
    ).read_text(encoding="utf-8")
)["version"]


async def _create_entry(hass):
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    await hass.config_entries.flow.async_configure(result["flow_id"], {})
    await hass.async_block_till_done()
    return hass.config_entries.async_entries(DOMAIN)[0]


async def _read(client):
    await client.send_json_auto_id({"type": "schedule_creator/get_state"})
    return await client.receive_json(timeout=5)


async def _subscribe_runtime(client):
    await client.send_json_auto_id({"type": "schedule_creator/subscribe_runtime"})
    return await client.receive_json(timeout=5)


def _stored(hass_storage):
    return deepcopy(
        {
            key: hass_storage.get(key)
            for key in (CONFIG_STORE_KEY, RUNTIME_STORE_KEY, AUDIT_STORE_KEY)
        }
    )


async def test_get_state_empty(
    hass, hass_ws_client, hass_read_only_access_token, hass_storage
):
    """An authenticated non-admin reads an empty config without store I/O."""
    entry = await _create_entry(hass)
    client = await hass_ws_client(hass, access_token=hass_read_only_access_token)
    storage = entry.runtime_data.storage
    before = _stored(hass_storage)
    config_before = storage.config.data
    runtime_before = storage.runtime.data
    audit_before = storage.audit.data
    with (
        patch.object(ScheduleCreatorStore, "async_load") as load,
        patch.object(ScheduleCreatorStore, "async_save") as save,
        patch.object(ScheduleCreatorStore, "async_delay_save") as delay,
        patch.object(type(hass.services), "async_call") as service,
    ):
        response = await _read(client)
        assert response == {
            "id": 1,
            "type": "result",
            "success": True,
            "result": {
                "integration_version": INTEGRATION_VERSION,
                "schema_version": 1,
                "revision": 1,
                "config": {
                    "profiles": [],
                    "active_profile_ids": [],
                    "groups": [],
                    "schedules": [],
                    "settings": {"timezone_source": "home_assistant"},
                    "migration_metadata": {"source": None},
                    "updated_at": config_before.to_dict()["updated_at"],
                },
                "runtime_summary": {
                    "revision": 0,
                    "occurrences": 0,
                    "active_leases": 0,
                    "suspended_leases": 0,
                    "pending_operations": 0,
                    "quick_timers": 0,
                    "recovery_instructions": 0,
                },
                "quick_timers": [],
                "operational": {"occurrences": [], "leases": []},
            },
        }
        for operation in (load, save, delay, service):
            operation.assert_not_called()
    assert storage.config.data is config_before
    assert storage.runtime.data is runtime_before
    assert storage.audit.data is audit_before
    assert _stored(hass_storage) == before


async def test_subscribe_runtime_emits_committed_revision(hass, hass_ws_client):
    """A runtime commit emits its revision without exposing runtime records."""
    entry = await _create_entry(hass)
    client = await hass_ws_client(hass)

    assert await _subscribe_runtime(client) == {
        "id": 1,
        "type": "result",
        "success": True,
        "result": {"revision": 0},
    }
    await entry.runtime_data.storage.runtime.async_update(
        lambda value: replace(value, revision=value.revision + 1)
    )
    assert await client.receive_json(timeout=5) == {
        "id": 1,
        "type": "event",
        "event": {"revision": 1},
    }


async def test_config_commit_notifies_but_stale_write_does_not(hass, hass_ws_client):
    """Config invalidation is emitted only after a durable commit."""
    entry = await _create_entry(hass)
    client = await hass_ws_client(hass)
    await _subscribe_runtime(client)
    config = entry.runtime_data.storage.config
    current = config.data
    await config.async_update(
        current.revision, lambda value: replace(value, revision=value.revision + 1)
    )
    assert await client.receive_json(timeout=5) == {
        "id": 1,
        "type": "event",
        "event": {"config_revision": current.revision + 1},
    }
    await client.send_json_auto_id(
        {
            "type": "schedule_creator/profile/create",
            "expected_revision": current.revision,
            "name": "Stale",
            "profile_type": "shared",
        }
    )
    assert (await client.receive_json(timeout=5))["error"][
        "code"
    ] == "revision_conflict"
    assert config.data.revision == current.revision + 1


async def test_get_state_populated(hass, hass_ws_client, hass_storage):
    """Return canonical config and counts, including completed journal records."""
    bundle = json.loads(
        (Path(__file__).parent / "fixtures" / "models_v1.json").read_text()
    )
    suspended = replace(
        EntityLease.from_dict(bundle["lease"]), state=LeaseState.SUSPENDED
    )
    timer = replace(QuickTimer.from_dict(bundle["quick_timer"]), snapshot_id=None)
    active = replace(
        suspended,
        id="14141414-1414-4414-8414-141414141414",
        controller_id=timer.controller_id,
        controller_type=ControllerType.QUICK_TIMER,
        occurrence_id=None,
        state=LeaseState.ACTIVE,
    )
    pending = PendingOperation.from_dict(bundle["pending_operation"])
    completed = replace(
        pending,
        id="15151515-1515-4515-8515-151515151515",
        sequence=2,
        occurrence_id=None,
        entity_id=None,
        kind=OperationKind.NOTIFICATION,
        state=OperationState.SUCCEEDED,
        next_retry_at=None,
        error_code=None,
    )
    runtime = RuntimeStoreData(
        schema_version=1,
        revision=7,
        operation_counter=2,
        occurrences=(Occurrence.from_dict(bundle["occurrence"]),),
        snapshots=(Snapshot.from_dict(bundle["snapshot"]),),
        leases=(suspended, active),
        pending_operations=(pending, completed),
        quick_timers=(timer,),
        notification_deduplication_keys=(),
        updated_at=datetime(2026, 9, 15, 18, tzinfo=UTC),
    )
    for key, data in (
        (CONFIG_STORE_KEY, bundle["config"]),
        (RUNTIME_STORE_KEY, runtime.to_dict()),
    ):
        hass_storage[key] = {"version": 1, "minor_version": 1, "key": key, "data": data}
    entry = await _create_entry(hass)
    client = await hass_ws_client(hass)
    before = _stored(hass_storage)
    storage = entry.runtime_data.storage
    reconciled_runtime = storage.runtime.data
    reconciled_pending = next(
        operation
        for operation in reconciled_runtime.pending_operations
        if operation.id == pending.id
    )
    assert reconciled_pending.state is OperationState.SUPERSEDED
    models_before = (storage.config.data, storage.runtime.data, storage.audit.data)
    response = await _read(client)
    assert response["success"] is True
    assert response["result"] == {
        "integration_version": INTEGRATION_VERSION,
        "schema_version": 1,
        "revision": 4,
        "config": {
            k: v
            for k, v in bundle["config"].items()
            if k not in {"schema_version", "revision"}
        },
        "runtime_summary": {
            "revision": reconciled_runtime.revision,
            "occurrences": len(reconciled_runtime.occurrences),
            "active_leases": sum(
                lease.state is LeaseState.ACTIVE for lease in reconciled_runtime.leases
            ),
            "suspended_leases": sum(
                lease.state is LeaseState.SUSPENDED
                for lease in reconciled_runtime.leases
            ),
            "pending_operations": len(reconciled_runtime.pending_operations),
            "quick_timers": 1,
            "recovery_instructions": len(entry.runtime_data.recovery_plan),
        },
        "quick_timers": [
            {
                "id": item.id,
                "entity_id": item.entity_id,
                "state": item.state.value,
                "expires_at": item.expires_at.isoformat(),
                "action": {
                    "domain": item.action.domain,
                    "action": item.action.action,
                    "data": dict(item.action.data),
                },
                "previous": _previous_state(reconciled_runtime, item),
            }
            for item in reconciled_runtime.quick_timers
            if item.state.value == "active"
        ],
        "operational": {
            "occurrences": [
                {
                    "id": item.id,
                    "schedule_id": item.frozen_schedule.id,
                    "state": item.state.value,
                    "condition_branch": item.condition_branch.value,
                    "end_utc": item.end_utc.isoformat(),
                }
                for item in reconciled_runtime.occurrences
                if item.state.value in {"active", "suspended"}
            ],
            "leases": [
                {
                    "entity_id": item.entity_id,
                    "controller_type": item.controller_type.value,
                    "state": item.state.value,
                }
                for item in reconciled_runtime.leases
            ],
        },
    }
    assert (
        storage.config.data,
        storage.runtime.data,
        storage.audit.data,
    ) == models_before
    assert _stored(hass_storage) == before


async def test_get_state_not_loaded(hass, hass_ws_client):
    """No entry and an unloaded entry both return a stable, sanitized error."""
    assert await async_setup_component(hass, DOMAIN, {})
    client = await hass_ws_client(hass)
    response = await _read(client)
    assert response["success"] is False
    assert response["error"] == {
        "code": "not_loaded",
        "message": "Schedule Creator is not loaded.",
    }
    entry = await _create_entry(hass)
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert (await _read(client))["error"] == response["error"]


async def test_get_state_reload(hass, hass_ws_client):
    """One registration survives reload, unload and setup without stale state."""
    with patch.object(
        websocket_api,
        "async_register_command",
        wraps=websocket_api.async_register_command,
    ) as register:
        entry = await _create_entry(hass)
        client = await hass_ws_client(hass)
        previous = entry.runtime_data
        assert await hass.config_entries.async_reload(entry.entry_id)
        assert entry.runtime_data is not previous
        assert previous.loaded is False
        current = entry.runtime_data.storage
        await current.config.async_update(
            1, lambda value: replace(value, revision=2, settings={"reloaded": True})
        )
        await current.runtime.async_update(lambda value: replace(value, revision=1))
        response = (await _read(client))["result"]
        assert response["revision"] == 2
        assert response["config"]["settings"] == {"reloaded": True}
        assert response["runtime_summary"]["revision"] == 1
        assert previous.storage.config.data.revision == 1
        assert await hass.config_entries.async_unload(entry.entry_id)
        assert (await _read(client))["error"]["code"] == "not_loaded"
        assert await hass.config_entries.async_setup(entry.entry_id)
        assert (await _read(client))["result"] == response
        assert await async_setup(hass, {})
        assert await async_setup(hass, {})
        registrations = [
            call
            for call in register.call_args_list
            if call.args[1] is websocket_get_state
        ]
        assert len(registrations) == 1
        subscriptions = [
            call
            for call in register.call_args_list
            if call.args[1] is websocket_subscribe_runtime
        ]
        assert len(subscriptions) == 1


async def test_get_state_storage_and_internal_errors(hass, hass_ws_client):
    """Unavailable repositories and unexpected failures never leak exception text."""
    await _create_entry(hass)
    client = await hass_ws_client(hass)
    for repository, error, expected in (
        (
            ConfigRepository,
            StorageNotLoadedError("private /config/secret"),
            "storage_unavailable",
        ),
        (RuntimeRepository, OSError("private /config/secret"), "storage_unavailable"),
        (ConfigRepository, ValueError("private /config/secret"), "internal_error"),
    ):
        with patch.object(repository, "data", new_callable=PropertyMock) as data:
            data.side_effect = error
            response = await _read(client)
        assert response["success"] is False
        assert response["error"] == {
            "code": expected,
            "message": (
                "Schedule Creator storage is unavailable."
                if expected == "storage_unavailable"
                else "Unable to read Schedule Creator state."
            ),
        }
    with patch.object(ConfigRepository, "data", new_callable=PropertyMock) as data:
        data.return_value = None
        assert (await _read(client))["error"]["code"] == "storage_unavailable"
