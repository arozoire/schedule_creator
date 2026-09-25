# WebSocket API

Validated against installed Home Assistant **2026.9.2**, Python **3.14.7** and
`pytest-homeassistant-custom-component==0.13.365`.

## Command and authentication

`schedule_creator/get_state` uses Home Assistant's `/api/websocket` connection.
The client must complete the normal HA authentication handshake. Any authenticated
user, including a non-admin/read-only user, may read this integration's complete
configuration. The integration needs no separate token, helper or manual YAML.
No entity state is read and no per-entity state permissions are consulted.

After authentication, send:

```json
{"id": 1, "type": "schedule_creator/get_state"}
```

`id` is the client's positive, increasing WebSocket request ID. There are no other
parameters; HA rejects additional fields with its standard `invalid_format` error.

## `schedule_creator/subscribe_runtime`

After the same authentication handshake, send:

```json
{"id": 2, "type": "schedule_creator/subscribe_runtime"}
```

The successful initial result is `{ "revision": number }`. Every later committed
runtime transition sends an `event` with that same revision-only payload. Clients
call `schedule_creator/get_state` after an event to read the fresh summary. The
subscription exposes no runtime journal, entity snapshot or lease data, and HA
removes it automatically when the WebSocket connection closes.

## Success response

Example for an empty configuration initialized at the timestamp shown:

```json
{
  "id": 1,
  "type": "result",
  "success": true,
  "result": {
    "schema_version": 1,
    "revision": 1,
    "config": {
      "profiles": [],
      "active_profile_ids": [],
      "groups": [],
      "schedules": [],
      "settings": {"timezone_source": "home_assistant"},
      "migration_metadata": {"source": null},
      "updated_at": "2026-09-21T08:00:00Z"
    },
    "runtime_summary": {
      "revision": 0,
      "occurrences": 0,
      "active_leases": 0,
      "suspended_leases": 0,
      "pending_operations": 0,
      "quick_timers": 0,
      "recovery_instructions": 0
    }
  }
}
```

The response is JSON-safe. Configuration is serialized once with the existing
`IntegrationConfig.to_dict()`: only its `schema_version` and `revision` keys move
to the result's top level, without duplication inside `config`. Nested record
schema versions and revisions remain unchanged. The top-level `schema_version`
is the configuration model schema version, currently 1. The configuration fields
retain their meanings from [storage-schema.md](storage-schema.md).

An empty configuration is valid, with the existing defaults above. `updated_at`
is the stored UTC timestamp, not null and not the request time. The initial
runtime revision is **0**, as defined by the existing model; reading cannot change it.

| Field | Meaning |
|---|---|
| `revision` | Current configuration revision |
| `runtime_summary.revision` | Current runtime revision, independent of configuration |
| `occurrences` | All persisted occurrence records, regardless of lifecycle state |
| `active_leases` | Leases whose state is `active` |
| `suspended_leases` | Leases whose state is `suspended` |
| `pending_operations` | `len(runtime.pending_operations)`: all persisted journal records, including terminal results still retained; not just unfinished operations |
| `quick_timers` | All persisted Quick Timer records, regardless of lifecycle state |
| `recovery_instructions` | Number of instructions in the current loaded entry's startup recovery plan; no plan execution or recomputation on read |

Only the minimal active timer, occurrence and lease projections described below
are returned; snapshots, operation payloads and audit log are excluded.
Configuration names, entity IDs and configured action/notification parameters
are part of the requested configuration, not live entity state. Configuration is
not a credential store; future fields must preserve this read-access boundary.

## Errors

```json
{
  "id": 1,
  "type": "result",
  "success": false,
  "error": {"code": "not_loaded", "message": "Schedule Creator is not loaded."}
}
```

| Code | Meaning | Client message |
|---|---|---|
| `not_loaded` | No entry exists, the entry is not in HA's `LOADED` state, or its runtime is absent/inactive | `Schedule Creator is not loaded.` |
| `storage_unavailable` | Required repository data is unavailable, configuration is absent, or reading raises a storage availability/I/O error | `Schedule Creator storage is unavailable.` |
| `internal_error` | Unexpected failure while building or serializing the response | `Unable to read Schedule Creator state.` |

Exception details are logged server-side; the response contains no raw exception,
traceback or filesystem path. Before the integration has ever been set up in a
HA process, HA may return its standard `unknown_command` because registration has
not occurred yet. An entry startup failure is `not_loaded`, not a failed attempt
to open storage through this endpoint.

## Registration, reload and actual HA API

The manifest declares `websocket_api` as a dependency. The integration's global
`async_setup` registers the command, guarded by an integration-owned `HassKey`
flag so repeated setup calls are harmless. Registration does not occur in
`async_setup_entry`. HA's command registry is global for the HA instance and
exposes no supported unregister for JSON commands. Entry unload leaves the
command registered; this code never edits HA's private registry to remove it.

Each request resolves the current config entry and runtime. No entry, repository
or runtime is captured in a callback closure. Requests between unload and setup
return `not_loaded`; after setup they read the replacement runtime. No
subscription, task, timer or listener is created by `get_state`. Runtime
subscriptions use HA's normal connection lifecycle and do not retain an entry
after the client disconnects.

Source inspection in the installed 2026.9.2 package confirmed:

- `components/websocket_api/decorators.py`:
  `websocket_command(schema)` accepts a synchronous `WebSocketCommandHandler`.
  `async_response(func: AsyncWebSocketCommandHandler) -> WebSocketCommandHandler`
  wraps a coroutine in a synchronous callback which schedules a background task.
- `components/websocket_api/__init__.py`:
  `async_register_command(hass, command_or_handler, handler=None, schema=None)`
  is a synchronous `@callback` function returning `None`; it stores the handler
  and schema in the global registry. It supplies no unsubscribe handle.
- `components/websocket_api/connection.py`:
  `send_result(self, msg_id, result=None)` and
  `send_error(self, msg_id, code, message, translation_key=None,
  translation_domain=None, translation_placeholders=None)` are synchronous
  callbacks returning `None`; the dispatcher invokes handlers without awaiting.
- `components/config/auth.py`: the core `websocket_list` command demonstrates
  `@websocket_command` above `@async_response` for a genuinely asynchronous
  handler that awaits user retrieval.

This endpoint uses `@websocket_command` above `@callback` on a regular `def`,
`async_register_command`, `send_result` and `send_error`. **`async_response` is
not needed**: repository `.data` properties and model serialization are synchronous
in-memory operations. A minimal authenticated transport test first proved this
registration/dispatch/result path, then became the empty-state regression test.
The decorator and connection type are imported from their defining public modules
(`decorators` and `connection`), since HA's package-level re-exports are not
explicit exports under mypy strict. No type-ignore or decorator workaround is used.

## Read-only guarantee and limits

The handler uses only the public internal repository `.data` properties and the
loaded runtime's recovery plan. It performs no file reads, saves, migrations,
audit appends, revision increments, service calls or entity state reads/writes.
The no-await callback sees immutable config/runtime values without yielding to a
reload or another update while constructing its response. Existing startup
initialization and unload audit flushing are separate lifecycle operations.

There is no frontend. Entity state reads, initial snapshots, target actions,
restores and notifications belong to the separate integration lifecycle; these
WebSocket handlers never initiate them.
Five focused tests cover empty/non-admin/read-only access, populated state and
journal semantics, unloaded state, reload/idempotent registration, and sanitized
storage/internal errors. Validation uses HA's test harness, not a physical HA
installation.

## Administrative profile commands

The following commands require an authenticated Home Assistant administrator:

| Command | Required fields | Result |
|---|---|---|
| `schedule_creator/profile/create` | `expected_revision`, `name`, `profile_type`; optional `icon`, `color`, `order` | New configuration `revision` and server-created `profile` |
| `schedule_creator/profile/update` | `expected_revision`, `profile_id`, at least one editable field | New configuration `revision` and updated `profile` |
| `schedule_creator/profile/delete` | `expected_revision`, `profile_id` | New configuration `revision` and `deleted_profile_id` |
| `schedule_creator/profile/set_active` | `expected_revision`, `profile_id`, `active` | New configuration `revision`, all `profiles` and `active_profile_ids` |

`profile_type` is `exclusive` or `shared`. Editable fields are `name`,
`profile_type`, `icon`, `color` and `order`. IDs, record revisions and timestamps
are server-owned. New profiles start inactive. Every successful command advances
the configuration revision once; create starts the profile revision at 1, while
update and active-state changes advance affected profile revisions.

`expected_revision` provides optimistic concurrency. A stale client receives
`revision_conflict` with the current revision and must fetch state before retrying.
Invalid model data is rejected before Store persistence. Deletion returns
`profile_in_use` while any group or schedule references the profile.

Shared profiles may be active together. Activating an exclusive profile deactivates
any other active exclusive profile while leaving active shared profiles unchanged.
Changing an active shared profile to exclusive applies the same rule atomically.
Deactivation leaves every other profile unchanged.

Mutation-specific stable errors are `revision_conflict`, `not_found`,
`profile_in_use` and `invalid_payload`; lifecycle/storage errors retain
`not_loaded`, `storage_unavailable` and `internal_error`. Home Assistant supplies
its standard `unauthorized` error for non-admin users.

Mutations use `ConfigRepository.async_update()` and the existing immutable models.
They do not introduce another serializer or persistent schema. An integration-wide
lock serializes profile writes with config-entry setup and unload, so a reload
cannot move a write onto an obsolete runtime. These commands do not read entity
state, call entity services, modify runtime state or append audit records.

## Administrative group commands

These commands also require a Home Assistant administrator:

| Command | Required fields | Result |
|---|---|---|
| `schedule_creator/group/create` | `expected_revision`, existing `profile_id`, `name`, `entity_ids`; optional `icon`, `color`, `order` | New configuration `revision` and server-created `group` |
| `schedule_creator/group/update` | `expected_revision`, `group_id`, at least one editable field | New configuration `revision` and updated `group` |
| `schedule_creator/group/delete` | `expected_revision`, `group_id` | New configuration `revision` and `deleted_group_id` |

Editable group fields are `name`, `entity_ids`, `icon`, `color` and `order`.
Group identity and profile ownership cannot be changed by update. A move between
profiles can be added later as a dedicated atomic operation if needed.

Create rejects an unknown profile with `not_found`. Delete returns `group_in_use`
while any schedule references the group. Updating `entity_ids` runs the complete
existing `IntegrationConfig` validation, so it cannot remove an entity still
targeted by a schedule; that request returns `invalid_payload` without a Store
write. Stale revisions and other lifecycle/storage errors follow the profile API.

Profile and group commands share `async_mutate_config()`, which owns lifecycle
locking, optimistic revision handling, Store availability mapping and sanitized
unexpected errors. Resource-specific modules retain their schemas, ownership
rules and response contracts.

After a configuration commit, the shared boundary reconciles the current 14-day
occurrence horizon. This second Store is deliberately post-commit: a Runtime Store
failure is logged but cannot convert an already-persisted configuration mutation
into a client error. Config-entry setup retries the idempotent reconciliation.
Within that horizon, only future `pending` occurrences with no snapshot, operation
or lease reference may be removed or replaced. Started and operational records
retain their frozen schedule even after later configuration changes.

## Administrative schedule commands

These commands require a Home Assistant administrator:

| Command | Required fields | Result |
|---|---|---|
| `schedule_creator/schedule/create` | `expected_revision`, existing `profile_id` and `group_id`, `name`, `target_entity_ids`, `time_slots`, `start_action` | New configuration `revision` and server-created `schedule` |
| `schedule_creator/schedule/update` | `expected_revision`, `schedule_id`, at least one editable field | New configuration `revision` and updated `schedule` |
| `schedule_creator/schedule/delete` | `expected_revision`, `schedule_id` | New configuration `revision` and `deleted_schedule_id` |

Create defaults `enabled` to true, `override_policy` to `cooperative`, optional
end action, condition and notifications to null, and inclusion/exclusion dates
to empty arrays. Editable fields are `name`, `enabled`, `target_entity_ids`,
`time_slots`, both actions, `condition`, `override_policy`, both notifications
and both date arrays. Profile/group ownership cannot be changed by update.

Clients omit `schema_version`, IDs, revisions and timestamps. The server owns
those values for the schedule and for nested time slots, actions, condition nodes
and notification rules. Replacing a nested value generates new nested IDs.
Full `Schedule` and `IntegrationConfig` validation enforces group ownership,
target membership, action-domain matching, bounded conditions and date rules.

Unknown resources return `not_found`; a group belonging to another profile
returns `ownership_mismatch`. Other optimistic, validation, lifecycle and storage
errors follow the shared mutation contract. Deleting configuration does not alter
frozen runtime occurrence records. Successful mutations reconcile the occurrence
horizon, condition branches, leases and initial snapshots for readable active
winners. Eligible winners also receive target-action journal records and the
post-commit lifecycle may execute them through durable `sent`, success and bounded
retry/failure transitions. A runtime-side failure remains logged and retryable; it
does not roll back or misreport the already-persisted configuration mutation.

## Administrative Quick Timer commands

These commands require a Home Assistant administrator and use the independent
runtime revision returned by `runtime_summary.revision` or a previous timer result:

| Command | Required fields | Result |
|---|---|---|
| `schedule_creator/quick_timer/create` | `expected_revision`, `entity_id`, `duration_seconds` (1–604800), `action` | Current runtime `revision` and server-created `quick_timer` |
| `schedule_creator/quick_timer/cancel` | `expected_revision`, active `quick_timer_id` | Current runtime `revision` and cancelled `quick_timer` |

The server owns timer, controller and nested action IDs plus all timestamps. Create
commits the active timer before running the normal lease, snapshot and target-action
chain. Cancel commits `cancelled` before that chain releases ownership and prepares
a restore only when the timer action succeeded. A newer controller still supersedes
the restore. Stale runtime revisions return `revision_conflict`; cancelling a
non-active timer returns `invalid_state`.

## Proiezioni UI e invalidazione config

`get_state` include ora `quick_timers` (solo record `active`: `id`, `entity_id`,
`state`, `expires_at`, `action` con dominio/comando/dati) e `operational`:
`occurrences` in stato `active`/`suspended` con `id`, `schedule_id`, `state`,
`condition_branch`, `end_utc`, e `leases` con `entity_id`, `controller_type`,
`state`. Sono letture autenticate; non espongono snapshot, payload del journal,
audit, attributi delle entità o eccezioni. I motivi di rifiuto non persistiti
non sono deducibili dalla proiezione.

`subscribe_runtime` invia anche un evento `{"config_revision": N}` dopo un
commit della configurazione riuscito. Gli eventi precedenti `{"revision": N}`
e la risposta iniziale restano invariati; il client deve rileggere `get_state`
in entrambi i casi. Le revisioni config e runtime sono indipendenti. Le due
subscription sul bus sono rilasciate insieme con l'unsubscribe WebSocket.

## Stato desiderato `apply_state` (0.3.5)

Un'azione può usare `"action": "apply_state"` con `data` = stato desiderato
dell'entità, per esempio
`{"domain":"climate","action":"apply_state","data":{"state":"cool","temperature":23,"fan_mode":"quiet","swing_mode":"off"}}`.
`state` è obbligatorio. Il motore esegue `scene.apply` sulla sola entità di
destinazione: Home Assistant invia modalità, temperatura, ventola, preset e swing
con i servizi del dominio, come per il ripristino degli snapshot. La card lo usa
per climate (inizio, fine e Quick Timer); luci, tende e ventole restano sui
servizi nativi (`turn_on` con `brightness_pct`, `set_cover_position`, ecc.).
Le azioni già salvate con `set_temperature`/`set_hvac_mode` restano valide.

`get_state` include `integration_version`: la versione del codice Python in
esecuzione (letta all'avvio), confrontata dalla card con la propria.

## Backup, ripristino e RESET (0.3.5)

Tutti i comandi richiedono un amministratore.

| Command | Required fields | Result |
|---|---|---|
| `schedule_creator/backup/export` | — | `format` = `schedule_creator.backup`, `format_version` 1, `integration_version`, `exported_at`, `config` con `schema_version`, `profiles`, `groups`, `schedules` |
| `schedule_creator/backup/import` | `expected_revision`, `backup` | Nuova `revision` e conteggi `profiles`, `groups`, `schedules` |
| `schedule_creator/reset` | `expected_revision`, `confirm` = `"RESET"` | Nuova `revision` della configurazione vuota |

Il backup non contiene runtime, lease, snapshot né comandi pendenti. L'import
valida tutto il modello prima di scrivere (`invalid_format`, `incompatible_backup`
o `invalid_payload` senza modifiche parziali), sostituisce profili, gruppi e
schedule in un unico commit e lascia **tutti i profili disattivati**.

RESET scarica il config entry (ferma coordinatori e callback), azzera prima il
runtime (occorrenze, lease, snapshot, journal, timer) e poi la configurazione,
quindi riavvia il config entry vuoto. Le revisioni continuano a crescere, quindi
le bozze aperte prima del RESET ricevono `revision_conflict`. Un'interruzione tra
le due scritture lascia la configurazione precedente, che viene ripianificata al
riavvio: mai comandi vecchi senza il loro schedule. I dispositivi restano nello
stato corrente; un comando già inviato non è revocabile. Dispositivi, entità HA,
automazioni e dati della weekly-schedule-card non vengono toccati. Un secondo
RESET concorrente riceve `reset_running`.

## Notifiche di stato e collegamento (0.3.6)

`schedule/create` e `schedule/update` accettano `status_notification` (bool).
L'elenco degli schedule scelti è in `config.settings.status_notification_schedule_ids`
(la cancellazione di uno schedule lo rimuove). Durante una fascia attiva o sospesa
il backend mantiene una notifica persistente `schedule_creator_status_<id>`:
«Attivo», «In pausa: la condizione non è soddisfatta» o «In attesa: un altro
schedule o timer ha la priorità», con l'ora di fine; viene rimossa a fine fascia
e allo scarico dell'integrazione. È solo informativa e non passa dal journal.

`schedule_creator/settings/update` (admin): `expected_revision`,
`notification_url` = percorso che inizia con `/` oppure `null`. Se impostato,
le notifiche `notify.*` ricevono `data.clickAction` e `data.url` (app Companion
Android/iOS) e quelle `persistent_notification` un link «Apri Schedule Creator».
URL esterni sono rifiutati.

## Ritardo in uscita delle condizioni (0.3.7)

Ogni nodo condizione accetta `release_delay_seconds` (facoltativo, ≥ 0). Una
condizione già vera resta vera finché non è falsa ininterrottamente per quel
tempo; se torna vera prima, il conteggio riparte. Durante l'attesa l'isteresi
resta applicata. `minimum_duration_seconds` resta il ritardo in entrata. Il campo
è omesso dal JSON quando non impostato, quindi i dati 0.3.6 non cambiano forma.
Esempio tende: lux > 500, isteresi 100, entrata 600 s, uscita 900 s.

## Import dalla weekly-schedule-card (0.3.12)

`schedule_creator/import/merge` (solo admin) **aggiunge** profili, gruppi e
schedule in un'unica scrittura; non sostituisce nulla.

```json
{"type": "schedule_creator/import/merge", "expected_revision": 7,
 "source": "weekly-schedule-card", "source_created_at": "2026-09-25T06:26:00.000Z",
 "profiles": [{"name": "Default (WSC)", "profile_type": "exclusive", "color": null,
   "groups": [{"name": "AC", "color": "#E91E63", "entity_ids": ["climate.camera"],
     "schedules": [{"name": "AC Camera · Freddo 26°", "enabled": true,
       "target_entity_ids": ["climate.camera"],
       "time_slots": [{"weekdays": [0,1,2,3,4,5,6], "start": "09:30", "end": "18:00"}],
       "start_action": {"domain": "climate", "action": "apply_state", "data": {"state": "cool", "temperature": 26}},
       "end_action": {"domain": "climate", "action": "apply_state", "data": {"state": "off"}},
       "condition": null}]}]}]}
```

- Gli schedule usano gli stessi campi di `schedule/create` (senza ID, generati dal server).
- I profili importati sono sempre **disattivati**, con `order` dopo quelli esistenti.
- Tutto viene validato come configurazione completa: un solo record non valido
  rifiuta l'intero import (`invalid_import` per campi sconosciuti,
  `invalid_payload` per errori del modello).
- Limiti: 20 profili, 100 gruppi, 500 schedule per import.
- `migration_metadata.imports` conserva gli ultimi 20 import
  (`source`, `source_created_at`, `imported_at`, `profile_ids`); la card lo usa
  per avvisare se lo stesso backup è già stato importato.
- Risposta: `{"revision", "profile_ids", "schedules"}`.

La conversione dal file della WSC avviene nella card (`frontend/src/wsc-import.js`),
che mostra l'anteprima prima di inviare il comando.

## Fasce in corso, pulizia ed errori (0.3.13)

- `get_state.failures`: ultimi 20 comandi `failed_final`
  (`at`, `kind`, `phase`, `entity_id`, `schedule_id`, `schedule_name`,
  `quick_timer`, `error_code`, `attempts`).
- `operational.leases[].occurrence_id`: occorrenza che detiene il lease
  (`null` per un Quick Timer).
- Una modifica di configurazione che ferma o cambia una fascia in corso la porta
  a `cancelled`; la nuova versione, se esiste, parte subito.
- I record conclusi da più di 7 giorni vengono eliminati dal runtime Store.
