"""Best-effort persistent notifications showing live schedule status.

They mirror committed runtime state for the schedules opted in through
``settings.status_notification_schedule_ids``; they never control entities and
are not journaled: a missed update is repaired by the next runtime change.
"""

from __future__ import annotations

from collections.abc import Mapping
from datetime import UTC, datetime

from homeassistant.components import persistent_notification
from homeassistant.core import CALLBACK_TYPE, Event, HomeAssistant, callback
from homeassistant.util import dt as dt_util

from .const import DOMAIN, EVENT_CONFIG_UPDATED, EVENT_RUNTIME_UPDATED
from .models import (
    ConditionBranch,
    FrozenJsonValue,
    IntegrationConfig,
    LeaseState,
    OccurrenceState,
)
from .storage import ConfigRepository, RuntimeRepository, RuntimeStoreData

STATUS_SETTING = "status_notification_schedule_ids"
URL_SETTING = "notification_url"


def notification_id(schedule_id: str) -> str:
    """Stable persistent notification ID, one per schedule."""

    return f"{DOMAIN}_status_{schedule_id}"


def opted_in(settings: Mapping[str, FrozenJsonValue]) -> frozenset[str]:
    """Schedule IDs with a live status notification."""

    value = settings.get(STATUS_SETTING)
    if not isinstance(value, (list, tuple)):
        return frozenset()
    return frozenset(item for item in value if isinstance(item, str))


def notification_url(settings: Mapping[str, FrozenJsonValue]) -> str | None:
    """Dashboard path opened when a notification is tapped, if configured."""

    value = settings.get(URL_SETTING)
    return value if isinstance(value, str) and value.startswith("/") else None


# Texts follow the Home Assistant language; unknown languages use English.
_TEXTS: dict[str, dict[str, str]] = {
    "it": {
        "paused": "⏸ In pausa: la condizione non è soddisfatta.",
        "waiting": "⏸ In attesa: un altro schedule o timer ha la priorità.",
        "active": "▶ Attivo.",
        "end": "Fine fascia alle {end}.",
        "open": "Apri Schedule Creator",
    },
    "en": {
        "paused": "⏸ Paused: the condition is not met.",
        "waiting": "⏸ Waiting: another schedule or timer has priority.",
        "active": "▶ Active.",
        "end": "Slot ends at {end}.",
        "open": "Open Schedule Creator",
    },
    "fr": {
        "paused": "⏸ En pause : la condition n’est pas remplie.",
        "waiting": "⏸ En attente : un autre planning ou minuteur est prioritaire.",
        "active": "▶ Actif.",
        "end": "Fin de la plage à {end}.",
        "open": "Ouvrir Schedule Creator",
    },
    "de": {
        "paused": "⏸ Pausiert: die Bedingung ist nicht erfüllt.",
        "waiting": "⏸ Wartet: ein anderer Zeitplan oder Timer hat Vorrang.",
        "active": "▶ Aktiv.",
        "end": "Zeitfenster endet um {end}.",
        "open": "Schedule Creator öffnen",
    },
    "es": {
        "paused": "⏸ En pausa: la condición no se cumple.",
        "waiting": "⏸ En espera: otra programación o temporizador tiene prioridad.",
        "active": "▶ Activo.",
        "end": "La franja termina a las {end}.",
        "open": "Abrir Schedule Creator",
    },
}


def status_texts(language: str | None) -> dict[str, str]:
    """Notification texts for a Home Assistant language code such as "de-CH"."""

    return _TEXTS.get(str(language or "en")[:2].lower(), _TEXTS["en"])


def desired_status(
    config: IntegrationConfig,
    runtime: RuntimeStoreData,
    now: datetime,
    language: str | None = "it",
) -> dict[str, tuple[str, str]]:
    """Map schedule ID to (title, message) for schedules currently in a slot."""

    texts = status_texts(language)

    wanted = opted_in(config.settings)
    names = {schedule.id: schedule.name for schedule in config.schedules}
    url = notification_url(config.settings)
    result: dict[str, tuple[str, str]] = {}
    for occurrence in runtime.occurrences:
        schedule_id = occurrence.frozen_schedule.id
        if (
            schedule_id not in wanted
            or schedule_id not in names
            or occurrence.state
            not in {OccurrenceState.ACTIVE, OccurrenceState.SUSPENDED}
            or not occurrence.start_utc <= now < occurrence.end_utc
        ):
            continue
        suspended = occurrence.state is OccurrenceState.SUSPENDED or any(
            lease.occurrence_id == occurrence.id and lease.state is LeaseState.SUSPENDED
            for lease in runtime.leases
        )
        if occurrence.condition_branch is ConditionBranch.FALSE:
            status = texts["paused"]
        elif suspended:
            status = texts["waiting"]
        else:
            status = texts["active"]
        end = dt_util.as_local(occurrence.end_utc).strftime("%H:%M")
        message = f"{status}\n{texts['end'].format(end=end)}"
        if url:
            message += f"\n\n[{texts['open']}]({url})"
        result[schedule_id] = (f"Schedule Creator · {names[schedule_id]}", message)
    return result


class StatusNotificationCoordinator:
    """Publish only changes, and dismiss notifications of ended slots."""

    def __init__(
        self, hass: HomeAssistant, config: ConfigRepository, runtime: RuntimeRepository
    ) -> None:
        self._hass = hass
        self._config = config
        self._runtime = runtime
        self._published: dict[str, tuple[str, str]] = {}
        self._unsubscribers: list[CALLBACK_TYPE] = []

    @callback
    def start(self) -> None:
        """Listen to committed config/runtime changes and publish once."""

        for event_type in (EVENT_RUNTIME_UPDATED, EVENT_CONFIG_UPDATED):
            self._unsubscribers.append(
                self._hass.bus.async_listen(event_type, self._async_changed)
            )
        self.refresh(datetime.now(UTC))

    @callback
    def _async_changed(self, _event: Event) -> None:
        self.refresh(datetime.now(UTC))

    @callback
    def refresh(self, now: datetime) -> None:
        """Create, update or dismiss notifications to match runtime state."""

        config = self._config.data
        if config is None:
            return
        desired = desired_status(
            config, self._runtime.data, now, self._hass.config.language
        )
        for schedule_id in set(self._published) - set(desired):
            persistent_notification.async_dismiss(
                self._hass, notification_id(schedule_id)
            )
            del self._published[schedule_id]
        for schedule_id, (title, message) in desired.items():
            if self._published.get(schedule_id) == (title, message):
                continue
            persistent_notification.async_create(
                self._hass, message, title, notification_id(schedule_id)
            )
            self._published[schedule_id] = (title, message)

    @callback
    def shutdown(self) -> None:
        """Stop listening; published notifications are dismissed on unload."""

        for unsubscribe in self._unsubscribers:
            unsubscribe()
        self._unsubscribers.clear()
        for schedule_id in self._published:
            persistent_notification.async_dismiss(
                self._hass, notification_id(schedule_id)
            )
        self._published.clear()
