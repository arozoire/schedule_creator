# AI development handoff

## Current checkpoint

- Date: 2026-09-21
- Completed phase: **2.3B – administrative profile mutation API**
- Repository: `arozoire/schedule_creator`
- Exact base: `2543a2d633c0dbd77629b062d6ed7c0d958cfed5`
  (merged PR #5, Phase 2.3A)
- Branch: `codex/phase-2-3b-profile-api`
- Pull request and final CI: pending publication
- No Phase 2.3B merge, version bump, tag or release. Manifest remains `0.0.1`.

## Implemented state

Phases 2.1 and 2.2 provide immutable version-one models, native configuration,
runtime and audit Stores, optimistic configuration revisions, the operation
journal and deterministic recovery planning. Phase 2.3A added the authenticated,
read-only `schedule_creator/get_state` command and was merged through PR #5.

Phase 2.3B adds four admin-only WebSocket commands:

- `schedule_creator/profile/create`
- `schedule_creator/profile/update`
- `schedule_creator/profile/delete`
- `schedule_creator/profile/set_active`

All mutations require `expected_revision`, call the existing
`ConfigRepository.async_update()` and rely on existing immutable model validation.
No persistent schema or serializer was added. Profile IDs and timestamps are
created server-side. The API returns the new configuration revision and the
affected profile data.

## Mutation rules

- Create accepts name, profile type, optional icon/color/order and creates an
  inactive profile at record revision 1.
- Update accepts at least one editable field: name, profile type, icon, color or
  order. It advances the affected profile revision once.
- Delete succeeds only when no group or schedule references the profile.
- Shared profiles may be active together.
- Activating an exclusive profile atomically deactivates other active exclusive
  profiles while preserving active shared profiles.
- Changing an active shared profile to exclusive applies the same exclusivity rule.
- Deactivation does not change other profiles.
- Every successful command advances the configuration revision exactly once.
- A stale `expected_revision` fails without writing.

Stable mutation errors are `revision_conflict`, `not_found`, `profile_in_use` and
`invalid_payload`. Existing errors remain `not_loaded`, `storage_unavailable` and
`internal_error`; Home Assistant returns `unauthorized` for non-admin clients.
Client errors contain no raw exceptions or filesystem paths.

## Lifecycle decision

Profile handlers are asynchronous because native Store persistence is awaited, so
they use Home Assistant 2026.9.2's supported decorator chain:
`require_admin`, `websocket_command`, `async_response`.

An integration-wide `asyncio.Lock` is stored under an integration-owned `HassKey`.
Config-entry setup, unload and every profile mutation acquire it. Handlers resolve
the currently loaded entry only after acquiring the lock. A reload therefore
cannot replace the runtime while a mutation is writing, and a waiting mutation
cannot retain an obsolete runtime reference.

Read-only `get_state` remains synchronous and unchanged. It has no await point and
does not need the lifecycle lock.

## Focused tests

Exactly five profile API tests cover:

1. non-admin rejection without configuration changes;
2. create, partial update and delete with exact revision progression;
3. stable stale-revision, missing-profile and empty-update errors;
4. deletion rejection when groups/schedules own the profile;
5. shared/exclusive activation plus active profile-type conversion.

Targeted lifecycle/read API reload tests are also run because setup and unload now
share the integration lock. Final full-suite evidence belongs in the PR description
after CI. No physical Home Assistant installation is claimed.

## Deliberately deferred

- group and schedule CRUD;
- scheduling callbacks, recurrence and engine execution;
- condition evaluation and entity service calls;
- operational leases, snapshots and restore;
- Quick Timer execution;
- audit events for API mutations;
- maintenance/reset/import/migration and frontend work.

## Next recommended step

Review the Phase 2.3B draft PR and its CI. Merge only with explicit owner
authorization. The next small slice should be Phase 2.3C group CRUD, preserving
admin authorization, optimistic revisions, ownership validation and the lifecycle
lock. Do not combine it with schedule CRUD or engine execution.
