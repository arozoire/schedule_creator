"""Durable, deduplicated schedule notification dispatch."""

from __future__ import annotations

from dataclasses import replace
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Any
from uuid import UUID, uuid5

from homeassistant.exceptions import HomeAssistantError

from .actions import ACTION_RETRY_INTERVAL, MAX_ACTION_ATTEMPTS, async_call_service
from .journal import JournalCoordinator
from .models import OccurrenceState, OperationKind, OperationState, PendingOperation
from .storage import RuntimeRepository, RuntimeStoreData

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

_NOTIFICATION_NAMESPACE = UUID("52f5f849-6cb4-4828-bc7c-4f05bc3cc1f8")


def _utc(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() != timedelta(0):
        raise ValueError("now must be UTC")
    return value.astimezone(UTC)


def _deduplication_key(occurrence_id: str, phase: str, rule_id: str) -> str:
    return f"{occurrence_id}:{phase}:{rule_id}"


def _operation_id(deduplication_key: str) -> str:
    return str(uuid5(_NOTIFICATION_NAMESPACE, deduplication_key))


async def async_prepare_notifications(
    repository: RuntimeRepository, now: datetime
) -> RuntimeStoreData:
    """Prepare missing start and end notifications exactly once."""

    prepared_at = _utc(now)

    def mutation(runtime: RuntimeStoreData) -> RuntimeStoreData | None:
        existing_ids = {operation.id for operation in runtime.pending_operations}
        successful_starts = {
            operation.occurrence_id
            for operation in runtime.pending_operations
            if operation.kind is OperationKind.TARGET_ACTION
            and operation.state is OperationState.SUCCEEDED
            and "lease_id" in operation.payload
        }
        candidates: list[tuple[str, str, str, str, str]] = []
        for occurrence in runtime.occurrences:
            rules = (
                ("start", occurrence.frozen_schedule.start_notification),
                ("end", occurrence.frozen_schedule.end_notification),
            )
            for phase, rule in rules:
                if rule is None:
                    continue
                # An end notice only follows a slot that actually acted.
                eligible = occurrence.id in successful_starts and (
                    phase == "start"
                    or occurrence.state is OccurrenceState.COMPLETED
                )
                key = _deduplication_key(occurrence.id, phase, rule.id)
                if (
                    not eligible
                    or key in runtime.notification_deduplication_keys
                    or _operation_id(key) in existing_ids
                ):
                    continue
                candidates.append(
                    (occurrence.id, phase, rule.action, rule.title, rule.message)
                )
        if not candidates:
            return None

        persisted_at = max(runtime.updated_at, prepared_at)
        operations: list[PendingOperation] = []
        for offset, candidate in enumerate(candidates, start=1):
            occurrence_id, phase, action, title, message = candidate
            occurrence = next(
                item for item in runtime.occurrences if item.id == occurrence_id
            )
            rule = (
                occurrence.frozen_schedule.start_notification
                if phase == "start"
                else occurrence.frozen_schedule.end_notification
            )
            assert rule is not None
            key = _deduplication_key(occurrence_id, phase, rule.id)
            operations.append(
                PendingOperation(
                    id=_operation_id(key),
                    sequence=runtime.operation_counter + offset,
                    occurrence_id=occurrence_id,
                    entity_id=None,
                    kind=OperationKind.NOTIFICATION,
                    state=OperationState.PREPARED,
                    payload={
                        "phase": phase,
                        "action": action,
                        "title": title,
                        "message": message,
                        "deduplication_key": key,
                    },
                    attempt_count=0,
                    created_at=persisted_at,
                    updated_at=persisted_at,
                    next_retry_at=None,
                    error_code=None,
                )
            )

        by_occurrence: dict[str, list[PendingOperation]] = {}
        for operation in operations:
            assert operation.occurrence_id is not None
            by_occurrence.setdefault(operation.occurrence_id, []).append(operation)
        occurrences = tuple(
            replace(
                occurrence,
                pending_operation_ids=(
                    *occurrence.pending_operation_ids,
                    *(item.id for item in by_occurrence[occurrence.id]),
                ),
                last_operation_id=by_occurrence[occurrence.id][-1].id,
            )
            if occurrence.id in by_occurrence
            else occurrence
            for occurrence in runtime.occurrences
        )
        return replace(
            runtime,
            revision=runtime.revision + 1,
            operation_counter=runtime.operation_counter + len(operations),
            occurrences=occurrences,
            pending_operations=(*runtime.pending_operations, *operations),
            updated_at=persisted_at,
        )

    return await repository.async_update_if_changed(mutation)


def _due_notifications(
    runtime: RuntimeStoreData, now: datetime
) -> tuple[PendingOperation, ...]:
    return tuple(
        operation
        for operation in runtime.pending_operations
        if operation.kind is OperationKind.NOTIFICATION
        and (
            operation.state is OperationState.PREPARED
            or (
                operation.state is OperationState.RETRY_WAIT
                and operation.next_retry_at is not None
                and operation.next_retry_at <= now
            )
        )
    )


def _service_request(
    operation: PendingOperation,
) -> tuple[str, str, dict[str, Any], str]:
    action = operation.payload.get("action")
    title = operation.payload.get("title")
    message = operation.payload.get("message")
    deduplication_key = operation.payload.get("deduplication_key")
    if (
        not isinstance(action, str)
        or action.count(".") != 1
        or not isinstance(title, str)
        or not isinstance(message, str)
        or not isinstance(deduplication_key, str)
    ):
        raise ValueError("invalid notification payload")
    domain, service = action.split(".", 1)
    return domain, service, {"title": title, "message": message}, deduplication_key


def _with_link(
    hass: HomeAssistant, domain: str, data: dict[str, Any]
) -> dict[str, Any]:
    """Open the configured dashboard when the notification is tapped."""

    from .mutation_api import _loaded_runtime
    from .status_notifications import notification_url

    runtime = _loaded_runtime(hass)
    config = None if runtime is None else runtime.storage.config.data
    url = None if config is None else notification_url(config.settings)
    if url is None:
        return data
    if domain == "notify":
        # Companion apps: clickAction (Android) and url (iOS).
        return {**data, "data": {"clickAction": url, "url": url}}
    if domain == "persistent_notification":
        link = f"[Apri Schedule Creator]({url})"
        return {**data, "message": f"{data['message']}\n\n{link}"}
    return data


async def async_execute_notifications(
    hass: HomeAssistant, repository: RuntimeRepository, now: datetime
) -> RuntimeStoreData:
    """Dispatch due notifications through durable journal boundaries."""

    wall_clock = _utc(now)
    journal = JournalCoordinator(repository)
    operation_ids = tuple(
        operation.id for operation in _due_notifications(repository.data, wall_clock)
    )
    for operation_id in operation_ids:
        operation = next(
            (
                item
                for item in repository.data.pending_operations
                if item.id == operation_id
            ),
            None,
        )
        if operation is None or operation not in _due_notifications(
            repository.data, wall_clock
        ):
            continue
        try:
            domain, service, data, deduplication_key = _service_request(operation)
            data = _with_link(hass, domain, data)
        except ValueError:
            await journal.async_fail_final(
                operation.id, now=wall_clock, error_code="invalid_payload"
            )
            continue
        sent = await journal.async_mark_sent(operation.id, wall_clock)
        try:
            await async_call_service(
                hass,
                domain,
                service,
                service_data=data,
                blocking=True,
            )
        except (HomeAssistantError, TimeoutError):
            if sent.attempt_count >= MAX_ACTION_ATTEMPTS:
                await journal.async_fail_final(
                    operation.id,
                    now=wall_clock,
                    error_code="notification_failed",
                )
            else:
                await journal.async_schedule_retry(
                    operation.id,
                    now=wall_clock,
                    retry_at=wall_clock + ACTION_RETRY_INTERVAL,
                    error_code="notification_error",
                )
            continue
        await journal.async_confirm_notification(
            operation.id,
            now=wall_clock,
            deduplication_key=deduplication_key,
        )
    return repository.data
