# AI development handoff

## Current checkpoint

- Date: 2026-09-21
- Completed phase: **2.4D – safe future occurrence replanning**
- Repository: `arozoire/schedule_creator`
- Exact base: `0086cdecc89d5ea14555904294e0754f8887b079`
  (merged PR #11, Phase 2.4C)
- Branch: `codex/phase-2-4d-safe-replanning`
- Pull request and remote CI: pending publication
- No Phase 2.4D merge, version bump, tag or release. Manifest remains `0.0.1`.

## Implemented state

Phase 2.4C wired a fixed 14-day horizon into setup and configuration mutations.
Phase 2.4D changes that lifecycle path from additive reconciliation to
`async_replan_window()` while retaining the additive 2.4B API.

An existing occurrence is replaceable only when it:

- is `pending`;
- starts inside the future replan window;
- has no snapshot IDs, pending-operation IDs or last operation;
- is not referenced by any snapshot, operation or lease.

A matching projected ID replaces the safe record and refreshes its frozen schedule.
A safe ID absent from projection is removed. This handles edits, time changes,
disablement, deletion, profile deactivation and date exceptions. Occurrences which
already started, changed lifecycle state or gained operational references always
win and remain intact. History and records outside the horizon are retained.

No callback, condition evaluation, entity state read, service call, lease creation
or retention policy is introduced.

## Focused tests

Five new replan tests cover frozen-revision replacement, disabled-schedule pruning,
history preservation, collision with a started occurrence and temporal edits that
change stable IDs. The horizon wiring test now verifies that a schedule rename
updates only future freezes while preserving the current occurrence. Final
complete-suite and remote-CI evidence belong here after publication.

## Deliberately deferred

- periodic rolling-horizon refresh and clock callbacks;
- occurrence state transitions at start/end boundaries;
- occurrence retention/compaction policy;
- overlap arbitration and entity leases;
- condition evaluation, snapshots, actions, restores and notifications;
- Quick Timer execution and frontend work.

## Next recommended step

Review the Phase 2.4D draft PR and CI. Merge only with explicit owner authorization.
Phase 2.4E should introduce a lifecycle-owned periodic horizon refresh and clean
callback cancellation on unload, still without executing occurrences.
