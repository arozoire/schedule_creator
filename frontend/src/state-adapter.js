// HA WebSocket adapter. The server owns all actions, storage and revisions.
export class ScheduleCreatorStateAdapter {
  constructor(onChange) {
    this.onChange = onChange;
    this.state = null;
    this.error = null;
    this.loading = true;
    this.connection = null;
    this.unsubscribe = null;
    this.generation = 0;
    this.dirty = false;
    this.running = false;
    this.closed = true;
    this.busy = false;
    this.writeError = null;
    this.conflicted = false;
  }

  connect(hass) {
    const connection = hass?.connection;
    if (!connection || (connection === this.connection && !this.closed)) return;
    this.disconnect();
    this.connection = connection;
    this.closed = false;
    this.loading = true;
    this.error = null;
    this.state = null;
    this.onChange();
    const generation = this.generation;
    // Subscribe first, then read; config and runtime notifications both invalidate.
    Promise.resolve(connection.subscribeMessage(
      () => this.refresh(), { type: 'schedule_creator/subscribe_runtime' },
    )).then((unsubscribe) => {
      if (this.closed || generation !== this.generation) {
        unsubscribe();
        return;
      }
      this.unsubscribe = unsubscribe;
      this.refresh();
    }).catch((error) => {
      if (this.closed || generation !== this.generation) return;
      this.loading = false;
      this.error = error;
      this.onChange();
    });
  }

  refresh() {
    if (this.closed) return;
    this.dirty = true;
    if (this.running) return this.pending;
    const generation = this.generation;
    this.running = true;
    // A notification during a request schedules a second read. Responses from
    // old connections/removed cards cannot overwrite a later generation.
    const drain = async () => {
      try {
        while (this.dirty && !this.closed && generation === this.generation) {
          this.dirty = false;
          try {
            const state = await this.connection.sendMessagePromise({
              type: 'schedule_creator/get_state',
            });
            if (this.closed || generation !== this.generation) return;
            if (this.dirty) continue;
            this.state = state;
            this.error = null;
          } catch (error) {
            if (this.closed || generation !== this.generation) return;
            if (this.dirty) continue;
            this.error = error;
          }
          this.loading = false;
          this.onChange();
        }
      } finally {
        if (generation !== this.generation) return;
        this.running = false;
        if (this.dirty && !this.closed && generation === this.generation) this.refresh();
      }
    };
    this.pending = drain();
    return this.pending;
  }

  async mutate(type, fields, { runtime = false, expectedRevision } = {}) {
    if (this.busy || this.closed || !this.state) return false;
    const connection = this.connection;
    const generation = this.generation;
    this.busy = true;
    this.writeError = null;
    let phase = 'aggiornamento interfaccia prima dell’invio';
    let acknowledged = false;
    try {
      this.onChange();
      phase = 'invio comando WebSocket';
      await connection.sendMessagePromise({
        type: `schedule_creator/${type}`,
        expected_revision: expectedRevision ?? (runtime ? this.state.runtime_summary.revision : this.state.revision),
        ...fields,
      });
      acknowledged = true;
      if (this.closed || generation !== this.generation) return false;
      phase = 'aggiornamento vista dopo conferma del server';
      await this.refresh();
      this.conflicted = false;
      return true;
    } catch (error) {
      if (this.closed || generation !== this.generation) return false;
      this.writeError = { code: error?.code, message: error?.message || String(error), name: error?.name, stack: error?.stack, operation: `schedule_creator/${type}`, phase, acknowledged };
      if (error?.code === 'revision_conflict') {
        this.conflicted = true;
        await this.refresh();
      }
      return false;
    } finally {
      if (generation === this.generation) {
        this.busy = false;
        this.onChange();
      }
    }
  }

  disconnect() {
    this.closed = true;
    this.busy = false;
    this.generation += 1;
    this.dirty = false;
    this.running = false;
    this.connection = null;
    if (this.unsubscribe) this.unsubscribe();
    this.unsubscribe = null;
  }
}

// Entities a card shows: groups, schedule targets, condition sensors, timers.
// Cached per state snapshot, which the adapter replaces on every change.
const watchedCache = new WeakMap();
export function watchedEntities(state) {
  if (!state?.config) return null;
  if (watchedCache.has(state)) return watchedCache.get(state);
  const ids = new Set();
  const walk = (node) => { if (!node) return; if (node.entity_id) ids.add(node.entity_id); (node.children || []).forEach(walk); };
  for (const group of state.config.groups || []) for (const id of group.entity_ids || []) ids.add(id);
  for (const schedule of state.config.schedules || []) { for (const id of schedule.target_entity_ids || []) ids.add(id); walk(schedule.condition); }
  for (const timer of state.quick_timers || []) ids.add(timer.entity_id);
  watchedCache.set(state, ids);
  return ids;
}

// HA replaces a state object when it changes, so identity is enough. Updates of
// unrelated entities (many per second in a busy home) no longer re-render.
export function hassChanged(previous, next, ids) {
  if (!previous || !ids || previous.connection !== next?.connection || previous.user !== next?.user || previous.config !== next?.config || previous.language !== next?.language) return true;
  for (const id of ids) if (previous.states?.[id] !== next.states?.[id]) return true;
  return false;
}
