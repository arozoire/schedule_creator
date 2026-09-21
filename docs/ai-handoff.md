# AI development handoff

## Current checkpoint

- Date: 2026-09-21
- Completed phase: **2.4C – bounded occurrence-horizon wiring**
- Repository: `arozoire/schedule_creator`
- Exact base: `7955ce2ed989baec726013eec5aa7f766097ed15`
  (merged PR #10, Phase 2.4B)
- Branch: `codex/phase-2-4c-horizon-wiring`
- Draft PR: https://github.com/arozoire/schedule_creator/pull/11
- Implementation commit: `e83d11ad82ff407e06ce02b3c9aca392ba131a4f`
- CI: https://github.com/arozoire/schedule_creator/actions/runs/35630666443
  passed against temporary merge commit
  `cff5a9dcd38243630ad1bfa160cc5ab714bc9d01`
- No Phase 2.4C merge, version bump, tag or release. Manifest remains `0.0.1`.

## Implemented state

Phase 2.4A introduced deterministic projection and 2.4B added atomic idempotent
Runtime Store reconciliation. Phase 2.4C adds `async_reconcile_horizon()` with a
fixed 14-day forward window and wires it into:

- config-entry setup, before recovery planning and loaded runtime exposure;
- every successful profile, group or schedule configuration mutation, while the
  integration lifecycle lock is held.

Reloading or replaying an unchanged projection is a true Runtime Store no-op.
Already materialized stable IDs retain their frozen schedule revision and state.
There is no periodic refresh yet, so the horizon advances only on setup/reload or
a configuration mutation.

Configuration commits remain authoritative. Reconciliation occurs afterward
because the two Stores have no cross-file transaction. A Runtime Store failure is
logged without returning a false failure for configuration already persisted;
the next setup retries reconciliation idempotently.

## Focused tests

Four wiring tests cover startup materialization plus idempotent reload, immediate
projection after active-schedule creation, Runtime no-op after a non-temporal
schedule edit, and truthful success after a simulated post-commit Runtime Store
failure. Existing lifecycle and reconciliation tests pass. CI run #82 passed
HACS, Ruff, mypy over 15 source files and all 100 tests.

## Deliberately deferred

- periodic rolling-horizon refresh and clock callbacks;
- cancellation/replanning of future materialized occurrences after temporal edits;
- occurrence retention/compaction policy;
- overlap arbitration and entity leases;
- condition evaluation, snapshots, actions, restores and notifications;
- Quick Timer execution and frontend work.

## Next recommended step

Review the Phase 2.4C draft PR and CI. Merge only with explicit owner authorization.
Before registering time callbacks, Phase 2.4D should define safe invalidation and
replanning of pending future occurrences after schedule edits or deactivation.
