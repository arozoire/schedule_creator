# AI development handoff

## Current checkpoint

- Date: 2026-09-22
- Completed phase: **2.6D-F – runtime recovery and completion actions**
- Repository: `arozoire/schedule_creator`
- Exact base: `b23c29928c29b215ce017a31de885270136c3a37`
  (merged PR #22, Phase 2.6C)
- Branch: `codex/phase-2-6d-runtime-recovery`
- Draft PR: https://github.com/arozoire/schedule_creator/pull/23
- Implementation commit: `da1d86815811c662871bcff5455ed439ab7bfd6b`
- CI: https://github.com/arozoire/schedule_creator/actions/runs/35715081807
  passed on the implementation commit with 179 tests
- No Phase 2.6D-F merge, version bump, tag or release. Manifest remains `0.0.1`.

## Implemented state

At config-entry setup, every target action left `sent` is atomically closed as
`failed_final` with `sent_outcome_unknown`. The service may already have succeeded,
so automatic replay would be unsafe. Attempt count and journal evidence are retained;
identical reconciliation is a Store no-op.

The existing nearest-boundary coordinator now also owns active Quick Timer expiry.
At the persisted expiry instant it changes the timer to `completed` before the
normal condition, lease, snapshot and action reconciliation chain continues. Setup
also heals timers that expired while Home Assistant was stopped.

Only a completed/cancelled Quick Timer whose target action succeeded receives a
deterministic restore operation. A current active lease makes that restore terminal
as `superseded`; otherwise `scene.apply` reproduces the immutable snapshot state and
attributes through the same sent/success/retry journal boundaries. Interrupted
restores also fail closed at startup.

Completed occurrences prepare and execute their frozen explicit end action only if
their start action succeeded. Ownership is checked both while preparing and
immediately before sending. A later controller permanently supersedes the end
operation. No configured end action means no operation and no implicit restore.

## Validation

- Ruff passed.
- mypy passed over 24 source files.
- All 179 tests passed in CI run #160; focused tests were run locally.
- Tests cover fail-closed SENT reconciliation, setup wiring, Quick Timer expiry,
  nearest-boundary selection and downstream reconciliation order.

## Deliberately deferred

- conditional fallbacks, notifications and frontend work.

## Next recommended step

Review and merge PR #23 only with explicit owner authorization. The next phase
should add deterministic conditional-fallback intents, reusing the completed
journal and ownership protections across repeated true/false condition cycles.
