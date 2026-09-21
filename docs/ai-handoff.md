# AI development handoff

## Current checkpoint

- Date: 2026-09-21
- Completed phase: **2.3D – administrative schedule mutation API**
- Repository: `arozoire/schedule_creator`
- Exact base: `c6ee7699e06acdf24f779c24ee26370b4bed4e30`
  (merged PR #7, Phase 2.3C)
- Branch: `codex/phase-2-3d-schedule-api`
- Pull request and remote CI: pending publication
- No Phase 2.3D merge, version bump, tag or release. Manifest remains `0.0.1`.

## Implemented state

Phase 2.3A added read-only `get_state`; 2.3B added profile mutations; 2.3C
added group mutations and the shared mutation boundary. Phase 2.3D adds the
admin-only commands:

- `schedule_creator/schedule/create`
- `schedule_creator/schedule/update`
- `schedule_creator/schedule/delete`

Create requires an existing group owned by the supplied profile. Update permits
all behavioral fields but not profile/group ownership. Delete removes only live
configuration; immutable schedules frozen into runtime occurrences are untouched.
Every successful command advances the configuration revision once; create starts
the schedule revision at 1 and update advances it once.

The server generates IDs and metadata for schedules and all nested time slots,
actions, condition nodes and notifications. Nested client payloads omit model
metadata. Complete existing model validation enforces target membership, action
domains, condition bounds and inclusion/exclusion date consistency. The API does
not add another serializer or persistent schema.

## Focused tests

Five new schedule tests cover authorization; CRUD revision progression; stable
ownership, missing-resource, conflict and empty-update errors; invalid targets
and client-owned nested metadata; and recursive server-generated IDs. Profile and
group API regression tests also pass against the same shared mutation path.
Final complete-suite and remote-CI evidence belong here after publication.

## Deliberately deferred

- moving groups or schedules between owners;
- schedule callback generation and recurrence;
- condition evaluation and entity service calls;
- leases, snapshots, restore and Quick Timer execution;
- audit events for API mutations;
- maintenance/reset/import/migration and frontend work.

## Next recommended step

Review the Phase 2.3D draft PR and its CI. Merge only with explicit owner
authorization. The next phase should begin scheduler-engine design around frozen
occurrences and deterministic recurrence, without combining entity execution in
the same slice.
