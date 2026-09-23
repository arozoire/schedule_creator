// Read-only HA WebSocket adapter; no legacy helpers, services or automations.
class ScheduleCreatorStateAdapter {
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
    // Subscribe first, then read; the first notification is a revision only.
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
    if (this.running) return;
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
    void drain();
  }

  disconnect() {
    this.closed = true;
    this.generation += 1;
    this.dirty = false;
    this.running = false;
    this.connection = null;
    if (this.unsubscribe) this.unsubscribe();
    this.unsubscribe = null;
  }
}


// Replaced with the copied weekly-schedule-card CSS by build.mjs.
const STYLE = "        [role=\"button\"]:focus-visible{outline:2px solid var(--primary-color,#03a9f4);outline-offset:2px;border-radius:6px}\n        :host{display:block;font-family:var(--primary-font-family,sans-serif)}\n        ha-card{padding:14px 16px 8px}\n        .card-header{display:flex;flex-direction:column;gap:0;margin-bottom:0}\n        .hdr-row1{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}\n        .hdr-row2{display:flex;flex-wrap:nowrap;gap:6px;align-items:center;margin-bottom:6px;padding-bottom:6px;overflow-x:auto;scrollbar-width:none}\n        .hdr-row2::-webkit-scrollbar{display:none}\n        .hdr-sep{height:1px;background:var(--divider-color,#e0e0e0);margin-bottom:10px}\n        .card-title{font-size:.95em;font-weight:500;color:var(--primary-text-color)}\n        .hdr-icons{display:flex;gap:8px;align-items:center}\n        .btn-icon,.btn-groups,.btn-layout-toggle{width:32px;height:32px;border-radius:50%;background:var(--secondary-background-color,#f5f5f5);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--secondary-text-color);padding:0;flex-shrink:0;transition:all .15s}\n        .btn-icon:hover,.btn-groups:hover,.btn-layout-toggle:hover{background:color-mix(in srgb,var(--primary-color,#03a9f4) 10%,transparent);color:var(--primary-color,#03a9f4)}\n        .btn-hdr{padding:4px 12px;border-radius:8px;border:1px solid var(--divider-color,#ccc);background:none;cursor:pointer;font-size:.78em;color:var(--primary-text-color)}\n        .btn-hdr:hover{background:var(--divider-color,#e0e0e0)}\n        .profile-status-bar{font-size:.68em;color:var(--secondary-text-color);display:flex;align-items:center;gap:4px;flex-wrap:wrap;padding:2px 0 4px}\n        .psb-active{color:#4CAF50;font-weight:600}\n        .psb-activate-btn{background:none;border:none;cursor:pointer;font-size:1em;color:var(--primary-color,#03a9f4);padding:0;text-decoration:underline;font-family:inherit}\n        .ent-legend{display:flex;flex-wrap:wrap;gap:8px 16px;padding:8px 0 4px;border-top:1px solid var(--divider-color,#e0e0e0);margin-top:8px}\n        .ent-legend-item{display:flex;align-items:center;gap:4px;font-size:.72em;color:var(--secondary-text-color)}\n        .ent-legend-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}\n        .tab-bar{display:flex;margin-bottom:12px;border-bottom:2px solid var(--divider-color,#e0e0e0);overflow-x:auto}\n        .tab{padding:6px 16px;font-size:.82em;font-weight:600;cursor:pointer;color:var(--secondary-text-color);border-bottom:2px solid transparent;margin-bottom:-2px;white-space:nowrap;user-select:none}\n        .tab.active{color:var(--primary-color,#03a9f4);border-bottom-color:var(--primary-color,#03a9f4)}\n        .tab-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;vertical-align:middle}\n        .grid{display:grid;grid-template-columns:36px repeat(7,1fr);gap:6px}\n        .hdr-cell{text-align:center;font-size:.68em;font-weight:700;color:var(--secondary-text-color);padding:4px 0;text-transform:uppercase;letter-spacing:.05em}\n        .time-axis{position:relative;height:480px}\n        .time-lbl{position:absolute;right:4px;font-size:.6em;color:var(--secondary-text-color);transform:translateY(-50%);white-space:nowrap}\n        .day-column{position:relative;height:480px;background:color-mix(in srgb,var(--divider-color,#e0e0e0) 78%,var(--secondary-text-color,#9e9e9e) 22%);border-radius:6px;overflow:hidden;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.06)}\n        .day-column:hover{background:color-mix(in srgb,var(--primary-color,#03a9f4) 8%,var(--divider-color,#e0e0e0))}\n        .sub-col{position:absolute;top:0;bottom:0}\n        .sub-col:hover{background:rgba(255,255,255,.08)}\n        .sub-divider{position:absolute;top:0;left:0;width:1px;height:100%;background:rgba(255,255,255,.35);z-index:1;pointer-events:none}\n        @keyframes block-pulse{0%,100%{box-shadow:inset 0 0 0 1px var(--blk-glow-soft)}50%{box-shadow:inset 0 0 0 2px var(--blk-glow-soft),0 0 6px var(--blk-glow-soft)}}\n        .block{position:absolute;left:0;right:0;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:filter .15s;overflow:hidden;border-radius:4px;border-left:3px solid rgba(255,255,255,.35);box-sizing:border-box;opacity:.72}\n        .block:hover{filter:brightness(.84);opacity:1}\n        .block.active{animation:block-pulse 2s infinite ease-in-out;opacity:.9!important;z-index:2}\n        .block.off{opacity:.5;background-image:repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(255,255,255,.15) 4px,rgba(255,255,255,.15) 6px)}\n        .block.muted,.gantt-block.muted{background-image:repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(255,152,0,.5) 4px,rgba(255,152,0,.5) 8px)!important;outline:2px dashed #FF9800;outline-offset:-2px;animation:none!important;opacity:.85!important}\n        .blk-muted-ico{position:absolute;top:1px;left:2px;--mdi-icon-size:13px;color:#FF9800;z-index:3;pointer-events:none;filter:drop-shadow(0 1px 1px rgba(0,0,0,.5))}\n        .blk-stop{position:absolute;bottom:2px;right:2px;--mdi-icon-size:12px;color:inherit;opacity:.85;pointer-events:none;line-height:1}\n        .add-hint{position:absolute;bottom:6px;right:0;left:0;text-align:center;font-size:1.1em;color:var(--secondary-text-color);opacity:0;pointer-events:none;transition:opacity .15s}\n        .day-column:hover .add-hint,.sub-col:hover .add-hint{opacity:.5}\n        .gantt{display:flex;flex-direction:column}\n        .gantt-hdr{display:flex;margin-bottom:4px}\n        .gantt-day-col{width:46px;flex-shrink:0}\n        .gantt-axis{position:relative;flex:1;height:18px}\n        .gantt-tick{position:absolute;font-size:.58em;color:var(--secondary-text-color);transform:translateX(-50%);white-space:nowrap;top:0}\n        .gantt-vline{position:absolute;top:0;bottom:0;width:1px;background:var(--divider-color,#e0e0e0);pointer-events:none}\n        .gantt-day{display:flex;border-bottom:1px solid var(--divider-color,#e0e0e0)}\n        .gantt-day:last-child{border-bottom:none}\n        .gantt-day-lbl{width:46px;flex-shrink:0;font-size:.72em;font-weight:600;color:var(--secondary-text-color);display:flex;align-items:center;padding:4px 0}\n        .gantt-rows{flex:1;display:flex;flex-direction:column;gap:2px;padding:4px 0}\n        .gantt-row{display:flex;align-items:center;height:32px;border-radius:4px;overflow:hidden;padding-left:4px;cursor:pointer;background:var(--divider-color,#f5f5f5);position:relative}\n        .gantt-row:hover{background:color-mix(in srgb,var(--primary-color,#03a9f4) 6%,var(--divider-color,#f5f5f5))}\n        .gantt-ent-spacer{width:64px;flex-shrink:0}\n        .gantt-ent-lbl{font-size:.62em;font-weight:600;color:var(--secondary-text-color);width:64px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n        .gantt-area{flex:1;position:relative;height:100%}\n        .gantt-block{position:absolute;top:3px;bottom:3px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:.65em;font-variant-numeric:tabular-nums;font-weight:600;color:white;text-shadow:0 1px 2px rgba(0,0,0,.4);cursor:pointer;overflow:hidden;min-width:4px;border-left:3px solid rgba(255,255,255,.4);box-sizing:border-box;opacity:.88}\n        .gantt-block:hover{filter:brightness(.84);opacity:1}\n        .gantt-block.active{animation:block-pulse 2s infinite ease-in-out;opacity:1!important;z-index:2}\n        @media (prefers-reduced-motion: reduce){\n          .block.active,.gantt-block.active{animation:none!important;box-shadow:0 0 0 2px var(--blk-glow,var(--primary-color,#03a9f4)),0 0 6px var(--blk-glow-soft,transparent)}\n        }\n        .gantt-block.off{opacity:.5;background-image:repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(255,255,255,.15) 4px,rgba(255,255,255,.15) 6px)}\n        .gantt-add{position:absolute;right:4px;top:50%;transform:translateY(-50%);font-size:.9em;color:var(--secondary-text-color);opacity:0;pointer-events:none}\n        .gantt-row:hover .gantt-add{opacity:.5}\n        .legend{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}\n        .legend-item{display:flex;align-items:center;gap:4px;font-size:.75em;color:var(--primary-text-color);cursor:pointer}\n        .legend-dot{width:12px;height:12px;border-radius:50%;flex-shrink:0}\n        .chip-wrap{position:relative;flex-shrink:0}\n        .profile-chip{display:flex;position:relative;align-items:center;gap:5px;padding:2px 8px 2px 9px;height:24px;border-radius:13px;border:1.5px solid color-mix(in srgb,var(--pchip-color,#03a9f4) 30%,var(--divider-color,#ccc));border-left:3px solid var(--pchip-color,#03a9f4);background:linear-gradient(90deg,color-mix(in srgb,var(--pchip-color,#03a9f4) 22%,transparent) 0%,transparent 60%);cursor:pointer;font-size:.68em;color:var(--primary-text-color);user-select:none;transition:all .15s;box-sizing:border-box;flex-shrink:0}\n        .profile-chip:hover{border-color:color-mix(in srgb,var(--pchip-color,#03a9f4) 55%,var(--divider-color,#ccc));border-left-color:var(--pchip-color,#03a9f4);background:linear-gradient(90deg,color-mix(in srgb,var(--pchip-color,#03a9f4) 32%,transparent) 0%,transparent 65%)}\n        .profile-chip.viewed{background:linear-gradient(90deg,color-mix(in srgb,var(--pchip-color,#03a9f4) 30%,transparent) 0%,color-mix(in srgb,var(--pchip-color,#03a9f4) 5%,transparent) 70%);border-color:color-mix(in srgb,var(--pchip-color,#03a9f4) 45%,var(--divider-color,#ccc));font-weight:600}\n        .profile-chip.active-op{border-left-width:4px;box-shadow:0 1px 6px color-mix(in srgb,var(--pchip-color,#03a9f4) 30%,transparent)}\n        .profile-chip.active-op::after{content:'';position:absolute;left:5px;right:5px;bottom:-5px;height:4px;border-radius:50%;background:var(--success-color,#4CAF50)}\n        .profile-chip.viewed.active-op{background:linear-gradient(90deg,color-mix(in srgb,var(--pchip-color,#03a9f4) 42%,transparent) 0%,color-mix(in srgb,var(--pchip-color,#03a9f4) 8%,transparent) 75%);border-color:var(--pchip-color,#03a9f4);font-weight:600;box-shadow:0 1px 8px color-mix(in srgb,var(--pchip-color,#03a9f4) 34%,transparent)}\n        .chip-act-dot{width:7px;height:7px;border-radius:50%;background:#4CAF50;flex-shrink:0;box-shadow:0 0 4px color-mix(in srgb,#4CAF50 60%,transparent)}\n        .chip-lock{opacity:.55;flex-shrink:0;color:currentColor}\n        .chip-activate{display:flex;align-items:center;justify-content:center;width:17px;height:17px;border-radius:50%;background:none;border:none;cursor:pointer;padding:0;margin-left:1px;color:#4CAF50;transition:background .12s,color .12s}\n        .chip-activate.on{color:var(--secondary-text-color)}\n        .chip-activate:hover{background:color-mix(in srgb,currentColor 16%,transparent)}\n        .chip-menu{display:flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;background:none;border:none;cursor:pointer;padding:0;color:inherit;opacity:.55;transition:background .12s,opacity .12s}\n        .chip-menu:hover{opacity:1;background:color-mix(in srgb,currentColor 14%,transparent)}\n        .chip-dropdown{display:none;position:fixed;z-index:100;background:var(--card-background-color,#fff);border:1px solid var(--divider-color,#ccc);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.15);min-width:130px;overflow:hidden}\n        .chip-dropdown.open{display:block}\n        .chip-dd-item{padding:8px 14px;font-size:.8em;cursor:pointer;color:var(--primary-text-color);white-space:nowrap}\n        .chip-dd-item:hover{background:var(--divider-color,#e0e0e0)}\n        .chip-dd-item.disabled{opacity:.38;pointer-events:none}\n        .chip-add{height:24px;padding:0 9px;border-radius:13px;border:1.5px dashed var(--divider-color,#ccc);background:none;cursor:pointer;font-size:.8em;color:var(--secondary-text-color);line-height:1;display:flex;align-items:center;flex-shrink:0;transition:all .12s}\n        .chip-add:hover{border-color:var(--primary-color,#03a9f4);color:var(--primary-color,#03a9f4)}\n        .empty-title{font-size:1em;font-weight:600;color:var(--primary-text-color)}\n        .empty-sub{font-size:.85em;color:var(--secondary-text-color);max-width:320px;line-height:1.5}\n        .btn-setup{padding:10px 24px;border-radius:10px;background:var(--primary-color,#03a9f4);color:white;border:none;cursor:pointer;font-size:.88em;font-weight:600}\n        .ha-card-empty{padding:28px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px}\n.day-column,.block,.gantt-row,.gantt-block,.profile-chip{cursor:default}\n.status{font-size:.78em;color:var(--secondary-text-color);margin:8px 0}.error{color:var(--error-color,#f44336)}\n.read-only{font-size:.72em;color:var(--secondary-text-color);padding:4px 8px;border:1px solid var(--divider-color,#ccc);border-radius:8px}\n.sc-entry{border-left:3px solid var(--pchip-color,#03a9f4);margin:4px 0;padding:7px 10px;border-radius:5px;background:var(--secondary-background-color,#f5f5f5);font-size:.8em}\n.sc-meta{font-size:.85em;color:var(--secondary-text-color)}.sc-list{padding:0;margin:10px 0;list-style:none}\n.sc-heading{font-size:.8em;font-weight:600;margin:12px 0 5px}\n.sc-week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px;margin-top:12px}\n.sc-day{min-width:0;background:var(--secondary-background-color,#f5f5f5);border-radius:6px;padding:6px}\n.sc-day strong{font-size:.68em;color:var(--secondary-text-color)}\n.sc-slot{margin-top:5px;padding:5px;border-radius:4px;background:color-mix(in srgb,var(--pchip-color,#03a9f4) 20%,var(--card-background-color,#fff));border-left:3px solid var(--pchip-color,#03a9f4);font-size:.68em;overflow-wrap:anywhere}\n.sc-empty{padding:20px 0;color:var(--secondary-text-color);font-size:.83em;text-align:center}\n";
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
const color = (value) => /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(value || '') ? value : '#03a9f4';

class ScheduleCreatorCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.adapter = new ScheduleCreatorStateAdapter(() => this.render());
    this.selectedProfile = null;
    this.selectedGroup = null;
  }

  static getStubConfig() { return { type: 'custom:schedule-creator-card' }; }
  static getConfigElement() { return document.createElement('schedule-creator-card-editor'); }
  getCardSize() { return 7; }

  setConfig(config) {
    this.config = config;
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this.isConnected) this.adapter.connect(hass);
    this.render();
  }

  connectedCallback() {
    if (this._hass) this.adapter.connect(this._hass);
    this.render();
  }

  disconnectedCallback() { this.adapter.disconnect(); }

  render() {
    if (!this.config) return;
    const { state, error, loading } = this.adapter;
    const config = state?.config || {};
    const profiles = config.profiles || [];
    const profile = profiles.find((p) => p.id === this.selectedProfile) || profiles[0];
    const groups = (config.groups || []).filter((g) => g.profile_id === profile?.id);
    const group = groups.find((g) => g.id === this.selectedGroup) || groups[0];
    const schedules = (config.schedules || []).filter((s) => s.profile_id === profile?.id && (!group || s.group_id === group.id));
    const tint = color(profile?.color);
    const chips = profiles.map((p) => `<button type="button" class="profile-chip ${p.id === profile?.id ? 'viewed' : ''} ${p.active ? 'active-op' : ''}" style="--pchip-color:${color(p.color)}" data-profile="${escapeHtml(p.id)}" aria-pressed="${p.id === profile?.id}">${escapeHtml(p.name)}</button>`).join('');
    const tabs = groups.map((g) => `<button type="button" class="tab ${g.id === group?.id ? 'active' : ''}" data-group="${escapeHtml(g.id)}" aria-pressed="${g.id === group?.id}">${escapeHtml(g.name)}</button>`).join('');
    const slots = DAYS.map((day, index) => {
      const items = schedules.flatMap((schedule) => (schedule.time_slots || [])
        .filter((slot) => slot.weekdays.includes(index))
        .map((slot) => ({ schedule, slot })))
        .sort((a, b) => a.slot.start.localeCompare(b.slot.start));
      return `<div class="sc-day"><strong>${day}</strong>${items.map(({ schedule, slot }) => `<div class="sc-slot" style="--pchip-color:${tint}" title="${escapeHtml(schedule.name)}">${escapeHtml(slot.start)}–${escapeHtml(slot.end)}<br>${escapeHtml(schedule.name)}${schedule.enabled ? '' : ' · off'}</div>`).join('')}</div>`;
    }).join('');
    const entries = schedules.map((schedule) => `<li class="sc-entry" style="--pchip-color:${tint}">${escapeHtml(schedule.name)}<span class="sc-meta"> · ${escapeHtml(schedule.target_entity_ids.join(', '))}${schedule.enabled ? '' : ' · off'}</span></li>`).join('');
    const status = error ? `<div class="status error" role="alert">${escapeHtml(error.message || error.code || error)}</div>` : loading ? '<div class="status" role="status">Loading Schedule Creator…</div>' : '';
    const runtime = state?.runtime_summary;
    this.shadowRoot.innerHTML = `<style>${STYLE}</style><ha-card style="--pchip-color:${tint}"><div class="card-header"><div class="hdr-row1"><span class="card-title">${escapeHtml(this.config.title || 'Schedule Creator')}</span><span class="read-only">Read only</span></div><div class="hdr-row2">${chips}</div><div class="hdr-sep"></div></div>${status}${state ? `<div class="profile-status-bar">${profile ? `${escapeHtml(profile.name)} · ${profile.active ? 'active' : 'inactive'} · ${escapeHtml(profile.profile_type)}` : 'No profiles'}${runtime ? ` · ${runtime.occurrences} occurrences · ${runtime.active_leases} active leases · ${runtime.quick_timers} timers` : ''}</div><div class="tab-bar">${tabs}</div>${schedules.length ? `<div class="sc-week">${slots}</div><div class="sc-heading">Schedules</div><ul class="sc-list">${entries}</ul>` : '<div class="sc-empty">No schedules in this view</div>'}` : ''}</ha-card>`;
    this.shadowRoot.querySelectorAll('[data-profile]').forEach((button) => button.addEventListener('click', () => {
      this.selectedProfile = button.dataset.profile;
      this.selectedGroup = null;
      this.render();
    }));
    this.shadowRoot.querySelectorAll('[data-group]').forEach((button) => button.addEventListener('click', () => {
      this.selectedGroup = button.dataset.group;
      this.render();
    }));
  }
}

class ScheduleCreatorCardEditor extends HTMLElement {
  setConfig(config) {
    this.config = config;
    if (this.querySelector('input')?.value !== (config.title || '')) this.render();
  }
  set hass(hass) { this._hass = hass; }
  render() {
    if (!this.config) return;
    this.innerHTML = `<div style="padding:12px"><label>Card title <input type="text" value="${escapeHtml(this.config.title || '')}"></label><p>Schedules are read-only in this phase.</p></div>`;
    this.querySelector('input').addEventListener('input', (event) => {
      this.config = { ...this.config, title: event.target.value };
      this.dispatchEvent(new CustomEvent('config-changed', {
        detail: { config: this.config },
        bubbles: true, composed: true,
      }));
    });
  }
}

if (!customElements.get('schedule-creator-card')) customElements.define('schedule-creator-card', ScheduleCreatorCard);
if (!customElements.get('schedule-creator-card-editor')) customElements.define('schedule-creator-card-editor', ScheduleCreatorCardEditor);
window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === 'schedule-creator-card')) {
  window.customCards.push({ type: 'schedule-creator-card', name: 'Schedule Creator', description: 'Schedule Creator read-only weekly view' });
}
