# AI development handoff

## Current checkpoint

- Date: 2026-09-21
- Completed phase: **2.4A – deterministic occurrence planner**
- Repository: `arozoire/schedule_creator`
- Exact base: `39d7e172c0b41fd8279fd90831c36ab9217c6f88`
  (merged PR #8, Phase 2.3D)
- Branch: `codex/phase-2-4a-occurrence-planner`
- Pull request and remote CI: pending publication
- No Phase 2.4A merge, version bump, tag or release. Manifest remains `0.0.1`.

## Implemented state

The completed 2.3 slices expose revision-safe read and admin mutation APIs for
profiles, groups and schedules. Phase 2.4A adds the pure `plan_occurrences()`
boundary. Given immutable configuration, an increasing UTC window and a `ZoneInfo`
timezone, it returns sorted pending `Occurrence` records without I/O.

The planner:

- includes enabled schedules owned by active profiles;
- applies weekday rules plus local inclusion/exclusion dates;
- includes occurrences overlapping the window, including a previous-day
  overnight interval active at window start;
- freezes the current schedule revision into every occurrence;
- uses stable IDs from schedule, slot and resolved offset-bearing local start;
- treats an end at or before start as next-day;
- shifts nonexistent spring-gap boundaries forward to the first valid wall time;
- chooses earliest ambiguous starts and latest ambiguous ends during autumn folds.

No runtime Store write, callback, entity state read, service call, condition
evaluation, lease or arbitration is performed.

## Focused tests

Five planner tests cover deterministic ordering and immutability; active/enabled
filters and date exceptions; overnight overlap at the planning boundary; Europe/Rome
spring gap and autumn fold policy; and invalid UTC windows. Final complete-suite
and remote-CI evidence belong here after publication.

## Deliberately deferred

- persisting planned occurrences and idempotent reconciliation;
- Home Assistant callback registration and cancellation;
- overlap arbitration and entity leases;
- condition evaluation, snapshots, target actions and restores;
- notifications and Quick Timer execution;
- maintenance/reset/import/migration and frontend work.

## Next recommended step

Review the Phase 2.4A draft PR and CI. Merge only with explicit owner authorization.
Phase 2.4B should reconcile a bounded projection into the runtime Store idempotently
before any clock callback or entity execution is introduced.
