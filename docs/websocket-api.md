# Read-only WebSocket API

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

No runtime records, snapshots, operation payloads or audit log are returned.
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
subscription, task, timer or listener is created by the endpoint.

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

There are no mutating commands, subscriptions, scheduler engine, condition
execution, operational snapshots/restores, Quick Timer execution or frontend.
Five focused tests cover empty/non-admin/read-only access, populated state and
journal semantics, unloaded state, reload/idempotent registration, and sanitized
storage/internal errors. Validation uses HA's test harness, not a physical HA
installation.
