# AI development handoff

## Current checkpoint

- Date: 2026-09-21
- Completed phase: **2.3C – administrative group mutation API**
- Repository: `arozoire/schedule_creator`
- Exact base: `4755d4b50aabe2d293637cb405b39a0f06e5aaf5`
  (merged PR #6, Phase 2.3B)
- Branch: `codex/phase-2-3c-group-api`
- Draft PR: https://github.com/arozoire/schedule_creator/pull/7
- Implementation commit: `2649f4709f52c44f873c5cdf3a175086afe2a500`
- CI: https://github.com/arozoire/schedule_creator/actions/runs/35596799301
  passed against temporary merge commit
  `7f12c434e9aa333f3b4c64fb3b94687246002d47`
- No Phase 2.3C merge, version bump, tag or release. Manifest remains `0.0.1`.

## Implemented state

The integration has immutable version-one models; native configuration, runtime
and audit Stores; optimistic configuration revisions; an operation journal and a
deterministic recovery plan. Phase 2.3A added read-only `get_state`. Phase 2.3B
added admin-only profile CRUD/activation and was merged through PR #6.

Phase 2.3C adds three admin-only commands:

- `schedule_creator/group/create`
- `schedule_creator/group/update`
- `schedule_creator/group/delete`

Create requires an existing profile and generates group ID/timestamps server-side.
Update permits `name`, `entity_ids`, `icon`, `color` and `order`; group identity
and profile ownership remain fixed. Delete is rejected while a schedule references
the group. Existing full-config validation prevents entity removal from orphaning
a schedule target. Every successful mutation advances both configuration revision
and the affected group record revision as applicable.

## Shared mutation boundary

Phase 2.3C extracts the lifecycle and error mechanics from the profile module into
`mutation_api.py`. Both APIs call `async_mutate_config()` and therefore share:

- the integration-wide lifecycle lock used by setup and unload;
- lookup of the currently loaded runtime after lock acquisition;
- `ConfigRepository.async_update()` with `expected_revision`;
- stable `revision_conflict`, `not_loaded`, `storage_unavailable` and
  `internal_error` mapping;
- model-validation mapping to resource-specific `invalid_payload` messages;
- `MutationClientError` for stable resource errors such as `not_found`,
  `profile_in_use` and `group_in_use`.

The supported Home Assistant 2026.9.2 decorator chain remains `require_admin`,
`websocket_command`, `async_response`. No private command registry or unsupported
unregister is used. The synchronous read endpoint is unchanged.

## Focused tests

Exactly five new group tests cover:

1. non-admin rejection without configuration changes;
2. create, partial update and delete with exact revision progression;
3. missing parent/group, stale revision and empty update errors;
4. deletion rejection while a schedule owns the group;
5. entity-membership validation preserving existing schedule targets.

All five existing profile tests pass against the extracted shared mutation code.
CI run #58 passed Ruff, mypy over 12 source files and the full suite of 81 tests.
No physical Home Assistant installation is claimed.

## Deliberately deferred

- moving an existing group between profiles;
- schedule CRUD;
- scheduling callbacks, recurrence and engine execution;
- condition evaluation and entity service calls;
- operational leases, snapshots and restore;
- Quick Timer execution;
- audit events for API mutations;
- maintenance/reset/import/migration and frontend work.

## Next recommended step

Review the Phase 2.3C draft PR and its CI. Merge only with explicit owner
authorization. The next slice should define Phase 2.3D schedule CRUD as a contract
before implementation because schedules contain nested slots, actions, conditions
and notifications. Keep engine execution outside that API phase.
