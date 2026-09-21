# AI development handoff

## Current checkpoint

- Date: 2026-09-21
- Completed phase: **2.4B – idempotent runtime occurrence reconciliation**
- Repository: `arozoire/schedule_creator`
- Exact base: `f1e12835a484af164ea1285ea5c3c89c68796c1f`
  (merged PR #9, Phase 2.4A)
- Branch: `codex/phase-2-4b-runtime-reconciliation`
- Pull request and remote CI: pending publication
- No Phase 2.4B merge, version bump, tag or release. Manifest remains `0.0.1`.

## Implemented state

Phase 2.4A introduced pure deterministic occurrence projection. Phase 2.4B adds
`async_reconcile_occurrences()` and `async_reconcile_window()` to atomically add
projected occurrences to the authoritative Runtime Store.

The reconciliation boundary:

- adds only stable occurrence IDs missing from the Store;
- preserves all existing occurrence objects on ID collision, including their
  frozen schedule revision, lifecycle state and operational references;
- keeps historical occurrences and every unrelated runtime collection;
- canonicalizes combined occurrence ordering;
- advances the runtime revision once for a non-empty addition;
- performs no write, timestamp update or revision increment on a true no-op;
- serializes concurrent calls with the existing Runtime repository lock.

`RuntimeRepository.async_update_if_changed()` supplies the explicit no-op contract.
No setup wiring, recurring callback, state read, service call, condition evaluation,
lease or retention policy is introduced.

## Focused tests

Five reconciliation tests cover first persistence; identical replay without a
Store write; preservation of an existing operational record on stable-ID collision;
additive adjacent windows; and concurrent identical reconciliation. Planner and
Runtime Store regression tests pass with the new repository boundary. Final
complete-suite and remote-CI evidence belong here after publication.

## Deliberately deferred

- config-entry startup projection and rolling-horizon refresh;
- Home Assistant callback registration and cancellation;
- occurrence retention/compaction policy;
- overlap arbitration and entity leases;
- condition evaluation, snapshots, target actions and restores;
- notifications, Quick Timer execution and frontend work.

## Next recommended step

Review the Phase 2.4B draft PR and CI. Merge only with explicit owner authorization.
Phase 2.4C should wire a bounded rolling horizon into setup and configuration
mutations, still without time callbacks or entity execution.
