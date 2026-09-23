import { ScheduleCreatorStateAdapter } from './state-adapter.js';

// Replaced with the copied weekly-schedule-card CSS by build.mjs.
const STYLE = '__SC_CSS__';
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
  setConfig(config) { this.config = config; this.render(); }
  set hass(hass) { this._hass = hass; this.render(); }
  render() {
    if (!this.config) return;
    this.innerHTML = `<div style="padding:12px"><label>Card title <input type="text" value="${escapeHtml(this.config.title || '')}"></label><p>Schedules are read-only in this phase.</p></div>`;
    this.querySelector('input').addEventListener('change', (event) => {
      this.dispatchEvent(new CustomEvent('config-changed', {
        detail: { config: { ...this.config, title: event.target.value } },
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
