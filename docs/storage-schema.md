# Schedule Creator persisted model schema

**Status:** Phase 2.1 schema version 1. Store containers and migrations are added
in Phase 2.2.

## Contract rules

- Every persisted record carries `schema_version: 1`.
- Configuration records use canonical UUIDs and positive revisions.
- Authoritative timestamps are ISO 8601 UTC values. Local occurrence boundaries
  are retained separately as offset-bearing strings for recurrence diagnostics.
- Unknown or missing fields fail validation. They are never silently discarded.
- Model instances and nested JSON payloads are immutable after construction.
- `to_dict()` output contains only deterministic JSON-compatible values.
- Configuration and runtime records are separate. A `Schedule` cannot contain a
  lease, snapshot, pending operation or mutable occurrence state.

The executable canonical bundle is
[`tests/fixtures/models_v1.json`](../tests/fixtures/models_v1.json).

## Configuration records

| Record | Identity and revision | Purpose |
|---|---|---|
| `Profile` | UUID, revision | Exclusive/shared activation scope and presentation metadata |
| `Group` | UUID, revision | Ordered entity grouping owned by one profile |
| `Schedule` | UUID, revision | Targets, time slots, actions, conditions and notification rules |
| `TimeSlot` | UUID | Sorted weekdays and a half-open local start/end interval |
| `TargetAction` | Versioned nested record | Domain action plus immutable JSON parameters, without target IDs |
| `ConditionNode` | UUID | Bounded AST node; maximum depth 8, 16 direct children and 64 total nodes |
| `NotificationRule` | UUID | Explicit notification action, title and non-templated message |
| `IntegrationConfig` | Global revision | Complete cross-validated configuration commit |

`IntegrationConfig` rejects duplicate IDs globally, broken profile/group links,
active-ID disagreement and schedule targets outside their owning group.
Exclusive/shared activation transactions and overlap policy remain Phase 2.4
behaviour.

## Runtime records

| Record | Safety role |
|---|---|
| `Occurrence` | Embeds the frozen schedule revision and stable slot occurrence ID |
| `Snapshot` | Immutable per-entity starting state, domain and checksum |
| `EntityLease` | Entity owner, controller type, comparison key and generation |
| `PendingOperation` | Write-ahead intent, state, retry evidence and immutable payload |
| `QuickTimer` | Persistent one-shot action, expiry and optional snapshot link |
| `AuditRecord` | Redacted, non-authoritative diagnostic event |

The pending-operation state values are `prepared`, `sent`, `succeeded`,
`retry_wait`, `failed_final` and `superseded`. A `retry_wait` record is invalid
without `next_retry_at`; other states cannot retain a retry timestamp.

An occurrence embeds a full frozen `Schedule`. A later configuration revision
therefore cannot replace its action, condition, fallback or notification rules.
No model method reads Home Assistant state, writes a Store or calls a service.

## Deferred to Phase 2.2

- `schedule_creator.config`, `schedule_creator.runtime` and
  `schedule_creator.audit` Store envelope schemas;
- atomic config mutation under one lock;
- runtime operation counter and journal recovery ordering;
- audit retention and buffered-save policy;
- explicit config-entry removal retention behaviour;
- schema migration dispatch.
