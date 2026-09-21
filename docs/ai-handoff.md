# AI development handoff

## Current checkpoint

- Date: 2026-09-21
- Phase implemented: **2.3A – read-only get_state WebSocket API**
- Repository: `arozoire/schedule_creator`
- Exact base: `4c23ae23452ae4a7966027d927cf4cca6f1d5c89` (merged PR #4, Phase 2.2)
- Branch: `codex/phase-2-3-read-api`
- Pull request: https://github.com/arozoire/schedule_creator/pull/5 — **DRAFT**
- Implementation commit: `8e22a4587181f21fec05057f7b327874974de539`
- Verified CI: [run #48](https://github.com/arozoire/schedule_creator/actions/runs/35569226265)
  **success** on head `8e22a4587181f21fec05057f7b327874974de539`.
- Exact PR merge ref tested by that run:
  `5339529f643c5b553b55229827c222f49f8663fd` (GitHub's temporary test merge,
  not a merge into main). HACS, compile/JSON, Ruff, strict mypy and **71 pytest**
  all passed.
- Subsequent handoff/README/API documentation commits contain no code changes.
  The PR description records the final documentation head and its CI result,
  avoiding a self-referential commit hash in this file.
- No merge, version bump, tag or release. Manifest remains `0.0.1`.

## What works and what changed

The existing Phase 2.2 lifecycle, immutable version-one models, three native
Stores, journal, cross-record validation, clock-rollback handling and deterministic
recovery planning remain intact. No persistent schema or serialization changed.
No abandoned Phase 2.3 attempt was reused.

This phase adds only:

- `custom_components/schedule_creator/websocket_api.py`: authenticated read-only
  command, error mapping and once-per-instance registration guard.
- Integration-wide `async_setup`: registers the command independently of entries.
- Manifest dependency on `websocket_api`, ensuring setup order.
- Five focused authenticated WebSocket tests using the actual HA harness.
- CI type-check scope expanded to `mypy custom_components`, covering the new API
  and all nine integration source files.
- [websocket-api.md](websocket-api.md) and README API/status documentation.

## Definitive contract

Request on HA's authenticated WebSocket connection:

```json
{"id": 1, "type": "schedule_creator/get_state"}
```

HA wraps success in `{id, type: "result", success: true, result}`. `result` has:

- `schema_version`: the existing configuration model schema version (1).
- `revision`: the configuration revision.
- `config`: `IntegrationConfig.to_dict()` with only those two envelope keys moved
  to the result top level; all other model/nested fields remain unchanged.
- `runtime_summary`: independent runtime `revision`, `occurrences`,
  `active_leases`, `suspended_leases`, `pending_operations`, `quick_timers`,
  `recovery_instructions`.

`pending_operations` is the number of **all persisted journal records**, including
terminal results. Occurrences/timers are also total persisted record counts.
Leases are counted by their actual `LeaseState`. Recovery count uses the loaded
entry's startup recovery plan, without rebuilding or executing it on read.
The initial runtime revision is 0; config revision is 1. Empty config is valid,
with existing timezone/migration defaults and a stored UTC `updated_at`, not null.

Stable sanitized errors: `not_loaded`, `storage_unavailable`, `internal_error`.
No admin requirement. No entry or an unloaded entry produces `not_loaded` once
the command is registered. Before the first global setup, HA may return
`unknown_command`. See the API document for exact payloads and error messages.

## Actual HA API and lifecycle decision

Inspected the **installed Home Assistant 2026.9.2** source before implementation:

- `components/websocket_api/decorators.py`: `websocket_command(schema)` tags a
  synchronous handler; `async_response(async_handler)` returns a synchronous
  callback that schedules the coroutine as a HA background task.
- `components/websocket_api/__init__.py`: `async_register_command(hass,
  command_or_handler, handler=None, schema=None)` updates a global registry and
  returns `None`; no supported JSON-command unregister exists.
- `components/websocket_api/connection.py`: `send_result(msg_id, result=None)`
  and `send_error(msg_id, code, message, ...)` are synchronous callbacks.
- `components/config/auth.py`: core async `websocket_list` demonstrates the
  supported `websocket_command` / `async_response` decorator order.

Decision: `@websocket_command` + `@callback` on a plain function. No
`async_response` is needed for synchronous repository reads. A minimal transport
probe proved registration/dispatch/response before implementing the endpoint.
The decorator and `ActiveConnection` are imported from their defining public
modules because HA's package re-exports are not explicit under mypy strict.

Global `async_setup` registers once, using an integration-owned `HassKey[bool]`
guard. Unload deliberately retains the command. Each request resolves the live
entry/runtime and checks HA's `LOADED` state plus runtime `loaded`; no stale
runtime is captured. Repeated setup is harmless, including without an entry.
The handler has no await points: config/runtime immutable values are read in one
event-loop turn. It accesses only public internal repository `.data` properties,
model `to_dict()` and the current startup recovery plan.

## Validation evidence

Environment: Python **3.14.7**, Home Assistant **2026.9.2**,
`pytest-homeassistant-custom-component==0.13.365` (same harness as CI).

| Check | Result |
|---|---|
| Minimal real authenticated WebSocket transport probe | 1 passed, before endpoint implementation |
| One full local `ruff check .` / `mypy custom_components` / `pytest -q` run | Ruff passed; mypy found 2 package re-export typing errors; pytest 70 passed, 1 failed because the test patched a slotted service-registry instance |
| Concrete fixes | Import decorator/type from defining modules; patch service-registry class in test |
| Targeted recheck after fixes | Ruff passed; strict mypy passed for all 9 source files; 5 WebSocket tests passed |
| Existing regression coverage | All existing 66 tests passed during the full local run |
| GitHub Actions #48 on the implementation head above | HACS, compile/JSON, Ruff, strict mypy (9 files), full pytest: **71 passed** |

The full local suite was not rerun unnecessarily after the targeted fixes.
Final complete-suite confirmation is provided by CI. No physical HA installation
was tested.

Exactly five new tests in `tests/test_websocket_api.py`:

1. Empty response through a non-admin/read-only authenticated client; no Store
   load/save/delayed-save or service calls, no model/revision/audit changes.
2. Populated native Stores: canonical config, different config/runtime revisions,
   active/suspended leases, terminal journal record included, recovery count,
   unchanged persisted/model contents.
3. Stable `not_loaded` for no entry and an unloaded entry.
4. Reload replaces the runtime; new revisions/settings are visible through the
   same socket; unload/setup preserves data; repeated global setup registers once.
5. Unavailable config/runtime, missing config and unexpected exceptions return
   stable error codes/messages without raw exceptions or local paths.

## Preserved invariants and remaining limits

- Reads never initialize, reload, write, migrate or increment repository state.
- Reads never append audit records, access live entity state or call services.
- Storage startup initialization/unload audit flushing remain existing lifecycle
  behavior, separate from this read-only API.
- Recovery remains a plan only: no service replay or lease execution.
- No mutable API, CRUD, subscriptions, scheduling engine, conditions execution,
  operational snapshots/restore, Quick Timer execution, maintenance/reset/import,
  migration or frontend was added.
- All authenticated users can read the requested configuration; it is not a
  credential store. Future configuration fields must preserve that boundary.
- No unsupported unregister, private registry cleanup, alternative serialization
  model or compatibility shim was introduced.

## Next exact task and authorization

1. Review draft PR #5 and its final CI evidence. Do **not** merge without a new
   explicit instruction; the earlier Phase 2.2 merge authorization is obsolete.
2. Next suggested development slice: Phase 2.3B, a separately scoped profile CRUD
   API using existing optimistic config revisions, validation and an explicit
   authorization contract. Do not add the scheduling engine to that slice.
3. Keep subsequent changes based on the reviewed checkpoint and maintain this
   handoff plus the API document. Version bumps/releases are not authorized here.

## Historical checkpoint

Phase 2.2 was merged in PR #4 at the exact base above. Its last documented
implementation verification was commit `232b2db8fe72b3be13198ba9ff81c081d4f5f12f`
with 66 tests and green CI. The former instruction to merge PR #4 is completed,
and the former statement that no WebSocket API exists has been superseded.
