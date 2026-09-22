# AI development handoff

## Current checkpoint

- Date: 2026-09-22
- Completed phase: **2.6C – controlled target-action execution**
- Repository: `arozoire/schedule_creator`
- Exact base: `12544f22360243ceb175f80804909332dedef676`
  (merged PR #21, Phase 2.6B)
- Branch: `codex/phase-2-6c-action-execution`
- Draft PR: https://github.com/arozoire/schedule_creator/pull/22
- Implementation commit: `98b9b1b31a765960c666824729ff66f5c762e2ba`
- CI: https://github.com/arozoire/schedule_creator/actions/runs/35709528202
  passed on the implementation commit with 170 tests
- No Phase 2.6C merge, version bump, tag or release. Manifest remains `0.0.1`.

## Implemented state

Phase 2.6C executes due `TARGET_ACTION` records from `prepared` or due `retry_wait`.
Immediately before sending, it revalidates the active lease ID, generation,
controller and entity. Stale or legacy records without that evidence fail closed as
`superseded`; malformed payloads become final failures without a service call.

The executor persists `sent` before making a blocking Home Assistant service call.
Success is then persisted as `succeeded`. Home Assistant and timeout failures use a
persisted 30-second retry, capped at three attempts before `failed_final`. A
lifecycle-owned callback schedules the nearest retry and is cancelled on unload.
Unexpected exceptions deliberately leave durable `sent` evidence for later recovery
instead of risking a blind duplicate call.

## Validation

- Ruff passed.
- mypy passed over 24 source files.
- All 170 tests passed locally and in CI run #146.
- Tests cover the durable pre-send boundary, success, stale-lease rejection,
  persisted retry, terminal third failure and lifecycle retry scheduling.

## Deliberately deferred

- reconciliation of indeterminate `sent` operations after restart;
- restore/end actions, notifications and frontend work.

## Next recommended step

Review and merge PR #22 only with explicit owner authorization. The next phase
should reconcile indeterminate `sent` operations after restart without blindly
replaying a possibly completed service call. Define and test that policy before
adding restore/end actions or notifications.
