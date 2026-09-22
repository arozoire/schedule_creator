# AI development handoff

## Current checkpoint

- Date: 2026-09-22
- Completed phase: **2.6B – idempotent target-action preparation**
- Repository: `arozoire/schedule_creator`
- Exact base: `957e1d5ec1f48a7dab095dfbcb5196cfd660addf`
  (merged PR #20, Phase 2.6A)
- Branch: `codex/phase-2-6b-action-preparation`
- Draft PR: https://github.com/arozoire/schedule_creator/pull/21
- Implementation commit: `2e37d3798df8d9657e9118ae7f7a40ece136012d`
- CI: https://github.com/arozoire/schedule_creator/actions/runs/35698212032
  passed on the implementation commit with 165 tests
- No Phase 2.6B merge, version bump, tag or release. Manifest remains `0.0.1`.

## Implemented state

Phase 2.6B prepares one deterministic `TARGET_ACTION` journal record for each
active lease generation, but only after its immutable initial snapshot is durable.
The payload freezes lease ID/generation plus action ID, domain, action and data from
the frozen schedule or Quick Timer.

Operation IDs are UUID5 identities derived from lease ID and generation. Sequences
are allocated monotonically and all newly eligible winners commit atomically.
Schedule operations are attached to occurrence evidence; Quick Timer operations
retain their controller identity directly. Identical replay is a no-op, while a
later active generation creates a new operation.

If an unsent `prepared` operation loses its lease or generation, it becomes
`superseded` in the same reconciliation commit and can never be executed later.
No operation is marked `sent`; no service call, retry, restore or notification occurs.

## Validation

- Ruff passed.
- mypy passed over 23 source files.
- All 165 tests passed locally and in CI run #140.
- Tests cover snapshot prerequisites, Quick Timer and schedule payloads, monotonic
  sequences, replay idempotence, active-generation changes and stale supersession.

## Deliberately deferred

- action service execution, retries, restores and notifications;
- Quick Timer service execution and frontend work.

## Next recommended step

Review and merge PR #21 only with explicit owner authorization. The next phase
should define the Home Assistant service adapter and execute prepared actions using
the existing `prepared -> sent -> succeeded/retry/failed` journal boundaries, with
lease revalidation immediately before sending.
