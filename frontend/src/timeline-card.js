// Per-entity day timeline across every active profile (mockup direction B).
// Read-only: editing stays in the main card.
import { ScheduleCreatorStateAdapter } from './state-adapter.js';
import { uiEscape } from './forms.js';
import { messageFor } from './editor.js';
import { describeAction, describeState } from './action-editor.js';
import { temperatureColor } from './schedule-creator-card.js';

const tlEsc = uiEscape;
const TL_STYLE = '__SC_TL_CSS__';
const TL_DAYS = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];
const TL_PALETTE = ['#087f8c', '#7057b5', '#b65c21', '#317a45', '#b34269', '#326ab2'];
const tlMinutes = (value) => { const [h, m] = String(value).split(':').map(Number); return h * 60 + (m || 0); };
const tlTime = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

// Short value shown inside a block: temperature, brightness, position or state.
export function shortAction(action) {
  const d = action?.data || {};
  if (!action) return '';
  if (action.action === 'apply_state') return d.state === 'off' ? 'OFF' : d.temperature != null ? `${d.temperature}°` : describeAction(action);
  if (d.brightness_pct != null) return `${d.brightness_pct}%`;
  if (d.position != null) return `${d.position}%`;
  if (d.percentage != null) return `${d.percentage}%`;
  return {turn_on: 'ON', turn_off: 'OFF', open_cover: 'Apri', close_cover: 'Chiudi'}[action.action] || describeAction(action);
}

// Blocks of one weekday for one entity, overnight slots split at midnight.
export function dayBlocks(schedules, entityId, day) {
  const blocks = [];
  for (const schedule of schedules) {
    if (!schedule.enabled || !schedule.target_entity_ids.includes(entityId)) continue;
    for (const slot of schedule.time_slots || []) {
      const start = tlMinutes(slot.start), end = tlMinutes(slot.end);
      if (end > start) { if (slot.weekdays.includes(day)) blocks.push({schedule, start, end}); continue; }
      if (slot.weekdays.includes(day)) blocks.push({schedule, start, end: 1440});
      if (end > 0 && slot.weekdays.includes((day + 6) % 7)) blocks.push({schedule, start: 0, end});
    }
  }
  return blocks.sort((a, b) => a.start - b.start);
}

export class ScheduleCreatorTimelineCard extends HTMLElement {
  constructor() {
    super(); this.attachShadow({mode: 'open'});
    this.adapter = new ScheduleCreatorStateAdapter(() => this.render());
    this.day = null;
    this.shadowRoot.innerHTML = `<style>${TL_STYLE}</style><ha-card></ha-card>`;
    this.shadowRoot.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-day]');
      if (b) { this.day = Number(b.dataset.day); this.render(); }
    });
  }
  static getStubConfig() { return {}; }
  getCardSize() { return 6; }
  setConfig(config) { this.config = config || {}; this.render(); }
  set hass(hass) { this._hass = hass; if (this.isConnected) this.adapter.connect(hass); this.render(); }
  connectedCallback() { if (this._hass) this.adapter.connect(this._hass); this.render(); this.clock ??= setInterval(() => this.render(), 60000); }
  disconnectedCallback() { this.adapter.disconnect(); clearInterval(this.clock); this.clock = null; }
  now() {
    const zone = this._hass?.config?.time_zone || undefined;
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone: zone, weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(new Date()).map((x) => [x.type, x.value]));
    return {weekday: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday), date: Number(p.day), minutes: Number(p.hour) * 60 + Number(p.minute), zone};
  }
  render() {
    if (!this.config) return;
    const surface = this.shadowRoot.querySelector('ha-card'), hass = this._hass;
    const {state, error} = this.adapter;
    if (!hass || (!state && !error)) { surface.innerHTML = '<div class="tl-body"><p class="tl-muted">Caricamento…</p></div>'; return; }
    if (!state) { surface.innerHTML = `<div class="tl-body"><p class="tl-error">${tlEsc(messageFor(error))}</p></div>`; return; }
    const config = state.config || {}, now = this.now();
    const day = this.day ?? now.weekday, today = day === now.weekday;
    const active = (config.profiles || []).filter((p) => p.active);
    const activeIds = new Set(active.map((p) => p.id));
    const schedules = (config.schedules || []).filter((s) => activeIds.has(s.profile_id));
    const timers = state.quick_timers || [];
    const occurrences = state.operational?.occurrences || [];
    const wanted = Array.isArray(this.config.entities) && this.config.entities.length ? this.config.entities : null;
    const entities = [...new Set([...schedules.flatMap((s) => s.target_entity_ids), ...timers.map((t) => t.entity_id)])].filter((id) => !wanted || wanted.includes(id));
    if (wanted) entities.sort((a, b) => wanted.indexOf(a) - wanted.indexOf(b)); else entities.sort((a, b) => (hass.states[a]?.attributes?.friendly_name || a).localeCompare(hass.states[b]?.attributes?.friendly_name || b));
    const colorOf = (schedule) => { const d = schedule.start_action?.data || {}; return schedule.start_action?.domain === 'climate' && d.temperature != null && d.state !== 'off' ? temperatureColor(d.temperature) : TL_PALETTE[(config.schedules || []).indexOf(schedule) % TL_PALETTE.length]; };
    const clock = (iso) => new Intl.DateTimeFormat('it-IT', {timeZone: now.zone, hour: '2-digit', minute: '2-digit'}).format(new Date(iso));
    const dates = TL_DAYS.map((label, i) => {
      const d = new Date(Date.now() + (i - now.weekday) * 86400000);
      return `<button type="button" class="tl-day${i === day ? ' is-selected' : ''}" data-day="${i}" aria-pressed="${i === day}"><span>${label}</span><strong>${new Intl.DateTimeFormat('it-IT', {timeZone: now.zone, day: 'numeric'}).format(d)}</strong></button>`;
    }).join('');
    const rows = entities.map((entityId) => {
      const st = hass.states[entityId], domain = entityId.split('.')[0];
      const blocks = dayBlocks(schedules, entityId, day);
      const running = today ? occurrences.find((o) => o.state !== 'pending' && schedules.find((s) => s.id === o.schedule_id)?.target_entity_ids.includes(entityId)) : null;
      const timer = timers.find((t) => t.entity_id === entityId);
      const next = today ? blocks.find((b) => b.start > now.minutes) : blocks[0];
      let status = '', kind = '';
      if (timer) { status = `Timer · fino alle ${clock(timer.expires_at)}`; kind = 'is-timer'; }
      else if (running) { const paused = running.condition_branch === 'false' || running.state === 'suspended'; status = paused ? 'In pausa · condizione' : `${shortAction(schedules.find((s) => s.id === running.schedule_id)?.start_action)} · fino alle ${clock(running.end_utc)}`; kind = paused ? 'is-paused' : 'is-running'; }
      else if (next) status = `${today ? 'Prossima' : 'Dalle'} ${tlTime(next.start)}`;
      else status = st ? describeState(st, domain) : 'Non disponibile';
      const bars = blocks.map((b) => {
        const live = today && b.start <= now.minutes && now.minutes < b.end && running?.schedule_id === b.schedule.id ? (kind === 'is-paused' ? ' is-paused' : ' is-running') : '';
        const label = `${b.schedule.name} · ${tlTime(b.start)}–${tlTime(b.end)}`;
        return `<span class="tl-block${live}" title="${tlEsc(label)}" style="left:${b.start / 14.4}%;width:${(b.end - b.start) / 14.4}%;--block:${colorOf(b.schedule)}">${b.end - b.start >= 90 ? tlEsc(shortAction(b.schedule.start_action)) : ''}</span>`;
      }).join('');
      const timerBar = timer && today ? (() => { const left = now.minutes, width = Math.max(1, Math.min(1440 - left, (new Date(timer.expires_at) - Date.now()) / 60000)); return `<span class="tl-block tl-timer" style="left:${left / 14.4}%;width:${width / 14.4}%" title="Quick Timer"></span>`; })() : '';
      return `<div class="tl-row"><div class="tl-name"><strong>${tlEsc(st?.attributes?.friendly_name || entityId)}</strong><span class="${kind}">${tlEsc(status)}</span></div><div class="tl-track" aria-label="${tlEsc(st?.attributes?.friendly_name || entityId)}">${bars}${timerBar}${today ? `<span class="tl-now" style="left:${now.minutes / 14.4}%"></span>` : ''}</div></div>`;
    }).join('');
    surface.innerHTML = `<div class="tl-body"><div class="tl-head"><div><span class="tl-eyebrow">${active.length ? `Profili attivi · ${tlEsc(active.map((p) => p.name).join(', '))}` : 'Nessun profilo attivo'}</span><strong class="tl-title">${tlEsc(this.config.title || (today ? 'Oggi' : ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'][day]))}</strong></div></div>
      <div class="tl-days" role="group" aria-label="Giorno">${dates}</div>
      ${entities.length ? `<div class="tl-grid"><div class="tl-row tl-axis"><span></span><div class="tl-ticks"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div></div>${rows}</div>` : '<p class="tl-muted">Nessuna entità programmata nei profili attivi.</p>'}</div>`;
  }
}

if (!customElements.get('schedule-creator-timeline-card')) customElements.define('schedule-creator-timeline-card', ScheduleCreatorTimelineCard);
window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === 'schedule-creator-timeline-card')) window.customCards.push({type: 'schedule-creator-timeline-card', name: 'Schedule Creator · Timeline', description: 'Giornata per dispositivo con tutti i profili attivi'});
