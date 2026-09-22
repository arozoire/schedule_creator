"""Test administrative Quick Timer WebSocket mutations."""

from unittest.mock import AsyncMock, patch

from homeassistant import config_entries

from custom_components.schedule_creator.const import DOMAIN
from custom_components.schedule_creator.models import OperationKind, OperationState


async def _create_entry(hass):
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    await hass.config_entries.flow.async_configure(result["flow_id"], {})
    await hass.async_block_till_done()
    return hass.config_entries.async_entries(DOMAIN)[0]


async def _request(client, message):
    await client.send_json_auto_id(message)
    return await client.receive_json(timeout=5)


async def test_quick_timer_create_and_cancel_restore(hass, hass_ws_client) -> None:
    """Creating applies a timer and cancelling safely restores its snapshot."""
    entry = await _create_entry(hass)
    hass.states.async_set("light.desk", "off", {"brightness": None})
    client = await hass_ws_client(hass)

    with patch.object(type(hass.services), "async_call", AsyncMock()) as service_call:
        created = await _request(
            client,
            {
                "type": "schedule_creator/quick_timer/create",
                "expected_revision": 0,
                "entity_id": "light.desk",
                "duration_seconds": 300,
                "action": {
                    "domain": "light",
                    "action": "turn_on",
                    "data": {"brightness": 200},
                },
            },
        )
        assert created["success"] is True
        timer = created["result"]["quick_timer"]
        assert timer["state"] == "active"

        cancelled = await _request(
            client,
            {
                "type": "schedule_creator/quick_timer/cancel",
                "expected_revision": created["result"]["revision"],
                "quick_timer_id": timer["id"],
            },
        )

    assert cancelled["success"] is True
    assert cancelled["result"]["quick_timer"]["state"] == "cancelled"
    restores = tuple(
        operation
        for operation in entry.runtime_data.storage.runtime.data.pending_operations
        if operation.kind is OperationKind.RESTORE
    )
    assert len(restores) == 1
    assert restores[0].state is OperationState.SUCCEEDED
    assert service_call.await_count == 2


async def test_quick_timer_revision_conflict(hass, hass_ws_client) -> None:
    """Runtime mutations reject a stale client revision."""
    await _create_entry(hass)
    client = await hass_ws_client(hass)

    response = await _request(
        client,
        {
            "type": "schedule_creator/quick_timer/create",
            "expected_revision": 99,
            "entity_id": "light.desk",
            "duration_seconds": 300,
            "action": {"domain": "light", "action": "turn_on", "data": {}},
        },
    )

    assert response["error"]["code"] == "revision_conflict"
