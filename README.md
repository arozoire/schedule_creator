# Schedule Creator

Schedule Creator is a native Home Assistant scheduling integration. It is being
developed as the independent server-side backend for Weekly Schedule Card and does
not depend on Scheduler Component.

Current status: Phase 2.6D runtime recovery boundaries. The integration lifecycle, strict
version-one models, configuration/runtime/audit Stores and the side-effect-free
journal recovery planner are operational and documented in
[`docs/storage-schema.md`](docs/storage-schema.md). The authenticated
[`schedule_creator/get_state` WebSocket API](docs/websocket-api.md) exposes
configuration and runtime counts without modifying stores or controlling entities.
Administrative profile create, update, delete and activation commands use
optimistic configuration revisions and the same native Store.
Administrative group create, update and delete commands preserve profile ownership
and schedule target references.
Administrative schedule create, update and delete commands validate the complete
nested schedule model without executing schedules or calling entity services.
The pure planner projects frozen occurrences across local-time, overnight and DST
boundaries without writing runtime state or scheduling callbacks.
Bounded projections can now be reconciled atomically into the Runtime Store;
repeated projections are true no-ops and historical records are preserved.
Setup, successful configuration mutations and one lifecycle-owned daily callback
reconcile a rolling 14-day horizon without entity execution. Unload cancels the
callback before releasing storage.
Schedule edits and deactivation now replace or remove only future pending
occurrences that have no operational references.
One lifecycle-owned callback advances the nearest occurrence boundary and persists
clock-only `active` and `completed` states without controlling entities.
Terminal occurrence history is retained for 30 days and pruned only when no
snapshot, operation or lease references it.
Effective schedule and Quick Timer controllers can now be ranked into immutable,
deterministic winner plans without persisting ownership or touching entities.
Those plans are now reconciled atomically into deterministic active and suspended
entity leases. Structured conditions are evaluated from referenced Home Assistant
states on setup, lifecycle changes, state-change events and duration deadlines.
Their branches are persisted before arbitration. Active lease winners now capture
one immutable starting snapshot per target entity before any future action. It then
prepares deterministic journal intents for the winning lease generation. Due intents
revalidate that lease immediately before a blocking Home Assistant service call,
persist `sent` first, and then persist success or a bounded retry/final failure.
Target actions left `sent` by an interrupted process now fail closed at startup as
unknown outcomes and are never blindly replayed. The shared boundary coordinator
also persists Quick Timer expiry as `completed`. Restore/end actions and
notifications remain deferred.

## Design requirements

The validated requirements, technical review, architecture decisions and
implementation plan are maintained in the companion `weekly-schedule-card`
repository until this repository is published.
