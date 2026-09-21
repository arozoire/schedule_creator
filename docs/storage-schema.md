# Schedule Creator persisted model schema

**Status:** Phase 2.4C schema version 1. Native Store containers, restart recovery,
occurrence projection, reconciliation and bounded-horizon wiring are implemented;
runtime callbacks and entity actions remain deferred.

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
| `PendingOperation` | Monotonic sequence, write-ahead intent, state, retry evidence and immutable payload |
| `QuickTimer` | Persistent one-shot action, expiry and optional snapshot link |
| `AuditRecord` | Redacted, non-authoritative diagnostic event |

The pending-operation state values are `prepared`, `sent`, `succeeded`,
`retry_wait`, `failed_final` and `superseded`. A `retry_wait` record is invalid
without `next_retry_at`; other states cannot retain a retry timestamp.
Every operation also has a unique monotonically increasing `sequence` allocated
inside the runtime Store lock. Persisted journal metadata never moves backwards if
the host clock is corrected, while retry deadlines retain actual wall-clock time.

An occurrence embeds a full frozen `Schedule`. A later configuration revision
therefore cannot replace its action, condition, fallback or notification rules.
No model method reads Home Assistant state, writes a Store or calls a service.

## Occurrence projection

`plan_occurrences()` is a pure function over immutable configuration, an increasing
half-open UTC window and a `ZoneInfo` timezone. It returns pending occurrences
which overlap the window, sorted by instant and stable record identity. Only
enabled schedules in active profiles participate. Exclusion dates suppress a
local start date; inclusion dates add one even when its weekday is absent.

Slot end times equal to or earlier than their start end on the next local day.
During an autumn overlap, starts select the earliest instant and ends the latest,
so a wall-clock interval is not shortened silently. A boundary inside a spring
gap advances to the first valid wall time. IDs combine schedule ID, slot ID and
the resolved offset-bearing local start. Projection freezes the current schedule
revision but does not persist it, register callbacks or resolve overlaps between
controllers.

## Runtime occurrence reconciliation

`async_reconcile_window()` projects one bounded window and atomically adds only
occurrence IDs absent from the Runtime Store. The repository lock serializes
concurrent reconciliation. Existing records always win an ID collision, preserving
their frozen schedule revision, lifecycle state and operational references.

The Runtime Store revision advances exactly once when at least one record is added.
An identical or overlapping replay with no missing IDs returns the current immutable
envelope without a write, timestamp change or revision increment. Reconciliation
never prunes history and does not change snapshots, leases, operations, timers or
notification deduplication keys. Callback registration and retention policy remain
separate later phases.

## Bounded horizon wiring

Config-entry setup reconciles from the current UTC instant through a fixed 14-day
horizon before building the recovery plan or exposing loaded runtime data. Reload
is idempotent because stable IDs already present in the Runtime Store are no-ops.
Every successful profile, group or schedule configuration mutation performs the
same bounded reconciliation while holding the integration lifecycle lock.

Configuration is authoritative once its Store commit succeeds. If the subsequent
Runtime Store reconciliation fails, the mutation still returns its successful
configuration result and logs the runtime failure; reporting the already-committed
configuration as failed would cause unsafe client retries. The next setup heals
missing occurrences. There is not yet a periodic refresh, so a continuously loaded
instance does not extend the horizon until a later mutation or reload.

## Native Store envelopes

All three files use Home Assistant `Store` version 1 with private, atomic file
writes. Unknown envelope fields and future unsupported schema versions fail rather
than being interpreted as version 1.

| Store | Authority | Save path |
|---|---|---|
| `schedule_creator.config` | Authoritative profiles, groups, schedules and settings | Immediate complete commit under one config lock |
| `schedule_creator.runtime` | Authoritative occurrences, snapshots, leases, operations, timers and notification deduplication keys | Immediate complete commit under one runtime lock |
| `schedule_creator.audit` | Derived diagnostic records only | Buffered by 5 seconds, immediate best-effort flush on unload |

Configuration writes compare `expected_revision` while holding the same lock used
for the write. A successful mutation advances the revision exactly once. Runtime
mutations follow the same single-write rule and never depend on the audit Store.
Runtime validation permits one active lease per entity plus suspended controller
leases, which is required to resume a conditional controller after a Quick Timer.
Every lease must also match an existing controller, the controller's expected type
and one of its frozen target entities. Target and restore operations are rejected
unless their entity belongs to the referenced schedule occurrence or Quick Timer.
A Quick Timer snapshot must belong to the same timer controller and entity; it can
never reuse another occurrence's starting state.

The audit Store retains at most 30 days and 10,000 records. Load, validation,
buffering or flush failure is logged and cannot prevent authoritative Stores from
loading or changing. If audit loading fails, audit remains in-memory and read-only
for that session so an unreadable or future-version payload is never overwritten.

## Journal ordering and recovery

The journal API persists these boundaries separately:

1. `prepared`: intent plus any immutable snapshot is durable;
2. `sent`: durable before a future caller may invoke a Home Assistant service;
3. `succeeded`, `retry_wait`, `failed_final` or `superseded`: durable result.

Phase 2.2 does not invoke a service. On startup it creates a deterministic recovery
plan, ordered by operation sequence:

| Persisted state | Recovery instruction |
|---|---|
| `prepared` | retry the prepared operation |
| `sent` | reconcile the possibly-applied command before retry |
| due `retry_wait` | retry now |
| future `retry_wait` | wait until the persisted instant |
| terminal state | no recovery instruction |

The integration builds this plan before it marks its runtime loaded. Later engine
phases will consume the plan only after lease validation; this PR cannot command an
entity.

## Removal and migration behaviour

Removing the config entry preserves all native Store files. Data deletion will be
available only through the future explicit **RESET** flow with strong confirmation.
This also means uninstalling and reinstalling the integration does not implicitly
erase schedules.

The Store subclass has a migration dispatcher. Version 1 minor revisions are
accepted; unknown major versions are rejected until an explicit migration is
implemented.

## Deferred to later phases

- rolling-horizon refresh, scheduling callbacks and retention policy;
- condition evaluation, leases and target actions;
- notification dispatch and deduplication execution;
- the confirmed RESET/backup/restore maintenance API.
