# Schedule Creator

Schedule Creator is a native Home Assistant scheduling integration. It is being
developed as the independent server-side backend for Weekly Schedule Card and does
not depend on Scheduler Component.

Current status: Phase 2.4A deterministic occurrence planner. The integration lifecycle, strict
version-one models, configuration/runtime/audit Stores and the side-effect-free
journal recovery planner are operational and documented in
[`docs/storage-schema.md`](docs/storage-schema.md). Scheduling and entity control
are not implemented yet. The authenticated
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

## Design requirements

The validated requirements, technical review, architecture decisions and
implementation plan are maintained in the companion `weekly-schedule-card`
repository until this repository is published.
