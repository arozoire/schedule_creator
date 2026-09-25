// Whole-week views of every active profile: serpentine (mockup D) and ring (mockup E).
// Read-only: tapping a block shows its details and hands editing to the main card.
import { ScheduleCreatorStateAdapter } from './state-adapter.js';
import { uiEscape } from './forms.js';
import { messageFor } from './editor.js';
import { describeAction } from './action-editor.js';
import { temperatureColor } from './schedule-creator-card.js';
import { shortAction } from './timeline-card.js';

const wkEsc = uiEscape;
const WK_STYLE = '__SC_WK_CSS__';
const WK_DAYS = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];
const WK_FULL = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const WK_PALETTE = ['#3aa17e', '#9b7fd1', '#d9822b', '#326ab2', '#b34269', '#087f8c'];
const WEEK = 10080;
const WK_TURN = 120; // minutes drawn on each half U-turn: midnight sits at the apex
const wkMinutes = (value) => { const [h, m] = String(value).split(':').map(Number); return h * 60 + (m || 0); };
const wkTime = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const wkNum = (n) => n.toFixed(1);

// Blocks of one entity in week minutes (Monday 00:00 = 0). Overnight slots stay
// in one piece across midnight; only the Sunday → Monday wrap is split.
export function weekBlocks(schedules, entityId) {
  const blocks = [];
  for (const schedule of schedules) {
    if (!schedule.enabled || !schedule.target_entity_ids.includes(entityId)) continue;
    for (const slot of schedule.time_slots || []) {
      const s = wkMinutes(slot.start), e = wkMinutes(slot.end);
      for (const day of slot.weekdays || []) {
        const start = day * 1440 + s, end = day * 1440 + (e > s ? e : 1440 + e);
        if (end <= WEEK) blocks.push({schedule, start, end});
        else blocks.push({schedule, start, end: WEEK}, {schedule, start: 0, end: end - WEEK});
      }
    }
  }
  return blocks.sort((a, b) => a.start - b.start);
}

// Pieces of a block inside each day, for layouts with a gap at midnight.
export function splitByDay(block) {
  const parts = [];
  for (let at = block.start; at < block.end;) {
    const next = Math.min(block.end, (Math.floor(at / 1440) + 1) * 1440);
    parts.push({...block, start: at, end: next});
    at = next;
  }
  return parts;
}

// Serpentine geometry in real pixels. Lane offsets are measured to the left of
// the direction of travel, so lanes stay parallel through every U-turn.
export function serpentineLayout(width, lanes) {
  const gap = 13, half = Math.max(1, lanes) * gap / 2 + 6, r = Math.max(half + 12, 30);
  const arc = Math.PI * r / 2, label = 32;
  const xl = label + Math.max(r + half, arc), xr = Math.max(xl + 120, width - xl);
  const top = half + 22;
  const point = (m, s) => {
    const d = Math.min(6, Math.floor(m / 1440)), dm = m - d * 1440, dir = d % 2 ? -1 : 1, y = top + d * 2 * r;
    if (dm >= WK_TURN && dm <= 1440 - WK_TURN) {
      const f = (dm - WK_TURN) / (1440 - 2 * WK_TURN);
      return [dir > 0 ? xl + f * (xr - xl) : xr - f * (xr - xl), y - dir * s];
    }
    const entry = dm < WK_TURN, f = entry ? dm / WK_TURN : (dm - 1440 + WK_TURN) / WK_TURN;
    if (entry && d === 0) return [xl - (1 - f) * arc, y - s];
    if (!entry && d === 6) return [xr + f * arc, y - s];
    const k = entry ? d - 1 : d, cx = k % 2 ? xl : xr, cy = top + k * 2 * r + r;
    const right = k % 2 === 0, R = right ? r + s : r - s;
    const deg = right ? (entry ? 90 * f : -90 + 90 * f) : (entry ? -180 - 90 * f : -90 - 90 * f);
    const a = deg * Math.PI / 180;
    return [cx + R * Math.cos(a), cy + R * Math.sin(a)];
  };
  const path = (a, b, s) => {
    const out = [];
    for (let m = a; ; ) {
      out.push(point(m, s));
      if (m >= b) break;
      const dm = m % 1440;
      const next = dm >= WK_TURN && dm < 1440 - WK_TURN ? m - dm + 1440 - WK_TURN : Math.min(m + 4, dm < WK_TURN ? m - dm + WK_TURN : m - dm + 1440);
      m = Math.min(b, next);
    }
    return `M${out.map(([x, y]) => `${wkNum(x)} ${wkNum(y)}`).join(' L')}`;
  };
  const lane = (i) => ((lanes - 1) / 2 - i) * gap;
  return {width: xr + xl, height: top + 12 * r + half + 10, top, r, half, xl, xr, arc, point, path, lane};
}

// Ring geometry: seven sectors clockwise from the top, one ring per lane.
export function ringLayout(lanes) {
  const size = 600, c = size / 2, outer = 262, pitch = Math.min(25, 150 / Math.max(1, lanes)), band = pitch - 5;
  const span = 360 / 7, gapDeg = 1.6;
  const angle = (m) => { const d = Math.min(6, Math.floor(m / 1440)); return -90 + d * span + gapDeg / 2 + (span - gapDeg) * (m - d * 1440) / 1440; };
  const at = (deg, radius) => [c + radius * Math.cos(deg * Math.PI / 180), c + radius * Math.sin(deg * Math.PI / 180)];
  const sector = (a0, a1, ro, ri) => {
    const large = a1 - a0 > 180 ? 1 : 0, [x0, y0] = at(a0, ro), [x1, y1] = at(a1, ro), [x2, y2] = at(a1, ri), [x3, y3] = at(a0, ri);
    return `M${wkNum(x0)} ${wkNum(y0)} A${ro} ${ro} 0 ${large} 1 ${wkNum(x1)} ${wkNum(y1)} L${wkNum(x2)} ${wkNum(y2)} A${ri} ${ri} 0 ${large} 0 ${wkNum(x3)} ${wkNum(y3)}Z`;
  };
  const radii = (i) => [outer - i * pitch, outer - i * pitch - band];
  return {size, c, outer, inner: outer - Math.max(1, lanes) * pitch + 5, span, gapDeg, angle, at, sector, radii};
}

class ScheduleCreatorWeekCard extends HTMLElement {
  constructor() {
    super(); this.attachShadow({mode: 'open'});
    this.adapter = new ScheduleCreatorStateAdapter(() => this.render());
    this.selected = null;
    this.shadowRoot.innerHTML = `<style>${WK_STYLE}</style><ha-card></ha-card>`;
    const pick = (e) => {
      const block = e.target.closest?.('[data-block]');
      if (block) { this.selected = this.selected === block.dataset.block ? null : block.dataset.block; this.render(); this.shadowRoot.querySelector(`[data-block="${this.selected}"]`)?.focus?.({preventScroll: true}); return; }
      if (e.target.closest?.('[data-close]')) { this.selected = null; this.render(); return; }
      const edit = e.target.closest?.('[data-edit]');
      if (edit) this.edit(edit.dataset.edit);
    };
    this.shadowRoot.addEventListener('click', pick);
    this.shadowRoot.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest?.('[data-block]')) { e.preventDefault(); pick(e); } });
  }
  static getStubConfig() { return {}; }
  getCardSize() { return 8; }
  setConfig(config) { this.config = config || {}; this.render(); }
  set hass(hass) { this._hass = hass; if (this.isConnected) this.adapter.connect(hass); this.render(); }
  connectedCallback() {
    if (this._hass) this.adapter.connect(this._hass);
    this.clock ??= setInterval(() => this.render(), 60000);
    if (!this.resize && window.ResizeObserver) { this.resize = new ResizeObserver(() => { const w = Math.round(this.clientWidth); if (w && w !== this.measured) { this.measured = w; this.render(); } }); this.resize.observe(this); }
    this.render();
  }
  disconnectedCallback() { this.adapter.disconnect(); clearInterval(this.clock); this.clock = null; this.resize?.disconnect(); this.resize = null; }
  // The main card on this view opens its editor; otherwise go to edit_path.
  edit(id) {
    const request = new CustomEvent('schedule-creator-edit', {detail: {schedule_id: id}, cancelable: true});
    window.dispatchEvent(request);
    if (request.defaultPrevented || !this.config.edit_path) return;
    history.pushState(null, '', `${this.config.edit_path}?sc_edit=${encodeURIComponent(id)}`);
    window.dispatchEvent(new CustomEvent('location-changed', {detail: {replace: false}}));
  }
  now() {
    const zone = this._hass?.config?.time_zone || undefined;
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone: zone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(new Date()).map((x) => [x.type, x.value]));
    const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday), minutes = Number(p.hour) * 60 + Number(p.minute);
    return {weekday, minutes, week: weekday * 1440 + minutes, label: `${p.hour}:${p.minute}`, zone};
  }
  // Everything both layouts draw: lanes, blocks, live status and the selection.
  model(state) {
    const hass = this._hass, config = state.config || {}, now = this.now();
    const active = (config.profiles || []).filter((p) => p.active), activeIds = new Set(active.map((p) => p.id));
    const schedules = (config.schedules || []).filter((s) => activeIds.has(s.profile_id));
    const timers = state.quick_timers || [], occurrences = state.operational?.occurrences || [];
    const wanted = Array.isArray(this.config.entities) && this.config.entities.length ? this.config.entities : null;
    const name = (id) => hass.states[id]?.attributes?.friendly_name || id;
    let entities = [...new Set([...schedules.flatMap((s) => s.target_entity_ids), ...timers.map((t) => t.entity_id)])].filter((id) => !wanted || wanted.includes(id));
    if (wanted) entities.sort((a, b) => wanted.indexOf(a) - wanted.indexOf(b)); else entities.sort((a, b) => name(a).localeCompare(name(b)));
    entities = entities.slice(0, Math.max(1, Math.min(8, Number(this.config.max_lanes) || 6)));
    const clock = (iso) => new Intl.DateTimeFormat('it-IT', {timeZone: now.zone, hour: '2-digit', minute: '2-digit'}).format(new Date(iso));
    const lanes = entities.map((entityId, index) => {
      const base = WK_PALETTE[index % WK_PALETTE.length];
      const colorOf = (schedule) => { const d = schedule.start_action?.data || {}; if (schedule.start_action?.domain !== 'climate') return base; return d.state === 'off' ? '#9aa5ad' : d.temperature != null ? temperatureColor(d.temperature) : base; };
      const running = occurrences.find((o) => o.state !== 'pending' && schedules.find((s) => s.id === o.schedule_id)?.target_entity_ids.includes(entityId));
      const paused = running && (running.condition_branch === 'false' || running.state === 'suspended');
      const timer = timers.find((t) => t.entity_id === entityId);
      const blocks = weekBlocks(schedules, entityId).map((b, i) => {
        const live = running?.schedule_id === b.schedule.id && ((b.start <= now.week && now.week < b.end) || (b.start <= now.week + WEEK && now.week + WEEK < b.end));
        return {...b, key: `${index}-${i}`, color: colorOf(b.schedule), live: live ? (paused ? 'paused' : 'running') : ''};
      });
      let status = '';
      if (timer) status = `Timer fino alle ${clock(timer.expires_at)}`;
      else if (running) status = paused ? 'In pausa · condizione' : `${shortAction(schedules.find((s) => s.id === running.schedule_id)?.start_action)} fino alle ${clock(running.end_utc)}`;
      const climate = entityId.startsWith('climate.');
      return {entityId, name: name(entityId), color: base, climate, blocks, status, statusKind: timer ? 'timer' : running ? (paused ? 'paused' : 'running') : '',
        timer: timer ? {start: now.week, end: Math.min(now.week + Math.max(1, (new Date(timer.expires_at) - Date.now()) / 60000), now.week + WEEK)} : null};
    });
    const pick = lanes.flatMap((l) => l.blocks.map((b) => ({lane: l, block: b}))).find((x) => x.block.key === this.selected);
    if (!pick) this.selected = null;
    const next = lanes.flatMap((l) => l.blocks.filter((b) => b.start > now.week).map((b) => ({lane: l, block: b}))).sort((a, b) => a.block.start - b.block.start)[0];
    return {active, lanes, now, pick, next, profiles: config.profiles || []};
  }
  header(m, fallback) {
    const chips = m.lanes.map((l) => `<span class="wk-chip"><i style="background:${l.climate ? 'linear-gradient(90deg,#4a90d9,#96c4e8,#f08a4b)' : l.color}"></i>${wkEsc(l.name)}</span>`).join('');
    return `<div class="wk-head"><div><span class="wk-eyebrow">${m.active.length ? `Profili attivi · ${wkEsc(m.active.map((p) => p.name).join(', '))}` : 'Nessun profilo attivo'}</span><strong class="wk-title">${wkEsc(this.config.title || fallback)}</strong></div><span class="wk-clock">${WK_DAYS[m.now.weekday].toLowerCase()} ${m.now.label}</span></div>
      ${chips ? `<div class="wk-chips">${chips}</div>` : ''}`;
  }
  detail(m) {
    if (!m.pick) return '';
    const {lane, block} = m.pick, s = block.schedule;
    const from = Math.floor(block.start / 1440) % 7;
    const when = `${WK_DAYS[from].charAt(0)}${WK_DAYS[from].slice(1).toLowerCase()} ${wkTime(block.start % 1440)}–${wkTime(block.end % 1440)}`;
    const profile = m.profiles.find((p) => p.id === s.profile_id)?.name;
    const live = block.live === 'running' ? ' · in corso' : block.live === 'paused' ? ' · in pausa' : '';
    const canEdit = this._hass?.user?.is_admin === true && (window.__scheduleCreatorEditors > 0 || this.config.edit_path);
    return `<div class="wk-detail" style="--block:${block.color}" role="status"><span class="wk-swatch"></span><div class="wk-detail-copy"><strong>${wkEsc(s.name)}</strong><span>${wkEsc([lane.name, when + live, describeAction(s.start_action), profile && `profilo ${profile}`].filter(Boolean).join(' · '))}</span></div>${canEdit ? `<button type="button" class="wk-edit" data-edit="${wkEsc(s.id)}">Modifica</button>` : ''}<button type="button" class="wk-close" data-close aria-label="Chiudi">×</button></div>`;
  }
  blockLabel(lane, block) {
    const d = Math.floor(block.start / 1440) % 7;
    return `${lane.name} · ${block.schedule.name} · ${WK_FULL[d]} ${wkTime(block.start % 1440)}–${wkTime(block.end % 1440)} · ${shortAction(block.schedule.start_action)}`;
  }
  render() {
    if (!this.config) return;
    const surface = this.shadowRoot.querySelector('ha-card');
    const {state, error} = this.adapter;
    if (!this._hass || (!state && !error)) { surface.innerHTML = '<div class="wk-body"><p class="wk-muted">Caricamento…</p></div>'; return; }
    if (!state) { surface.innerHTML = `<div class="wk-body"><p class="wk-error">${wkEsc(messageFor(error))}</p></div>`; return; }
    const m = this.model(state);
    const body = m.lanes.length ? this.drawing(m) : '<p class="wk-muted">Nessuna entità programmata nei profili attivi.</p>';
    surface.innerHTML = `<div class="wk-body">${this.header(m, this.defaultTitle)}${body}${this.detail(m)}${m.lanes.length ? `<div class="wk-legend"><span>${wkEsc(this.hint)}</span><span class="wk-key"><i class="is-paused"></i>in pausa</span><span class="wk-key"><i class="is-running"></i>in corso</span><span class="wk-key"><i class="is-now"></i>ora</span></div>` : ''}</div>`;
  }
}

export class ScheduleCreatorSerpentineCard extends ScheduleCreatorWeekCard {
  get defaultTitle() { return 'La settimana'; }
  get hint() { return 'Lun → · Mar ← · la mezzanotte è nella curva'; }
  drawing(m) {
    const width = Math.max(320, (this.measured || 728) - 40);
    const L = serpentineLayout(width, m.lanes.length);
    const track = L.path(0, WEEK, 0);
    const ticks = [];
    for (let d = 0; d < 7; d++) for (const h of [6, 12, 18]) {
      const [x1, y1] = L.point(d * 1440 + h * 60, L.half), [x2, y2] = L.point(d * 1440 + h * 60, -L.half);
      ticks.push(`<line class="wk-tick" x1="${wkNum(x1)}" y1="${wkNum(y1)}" x2="${wkNum(x2)}" y2="${wkNum(y2)}"/>`);
    }
    const hours = [6, 12, 18].map((h) => { const [x, y] = L.point(h * 60, L.half + 8); return `<text class="wk-hour" x="${wkNum(x)}" y="${wkNum(y)}">${String(h).padStart(2, '0')}</text>`; }).join('');
    const labels = WK_DAYS.map((day, d) => `<text class="wk-day${d === m.now.weekday ? ' is-today' : ''}" x="${d % 2 ? L.width - 4 : 4}" y="${wkNum(L.top + d * 2 * L.r + 4)}" text-anchor="${d % 2 ? 'end' : 'start'}">${day}</text>`).join('');
    const blocks = m.lanes.map((lane, i) => {
      const s = L.lane(i);
      const drawn = lane.blocks.map((b) => {
        const d = L.path(b.start, b.end, s), sel = b.key === this.selected ? ' is-selected' : '';
        const halo = b.live === 'running' ? `<path class="wk-halo" d="${d}"/>` : '';
        const dash = b.live === 'paused' ? `<path class="wk-paused-line" d="${d}"/>` : '';
        return `${halo}<path class="wk-block${b.live === 'paused' ? ' is-paused' : ''}${sel}" d="${d}" style="stroke:${b.color}"/>${dash}<path class="wk-hit" d="${d}" data-block="${b.key}" tabindex="0" role="button" aria-label="${wkEsc(this.blockLabel(lane, b))}"><title>${wkEsc(this.blockLabel(lane, b))}</title></path>`;
      }).join('');
      const timer = lane.timer ? `<path class="wk-timer" d="${L.path(lane.timer.start, Math.min(WEEK, lane.timer.end), s)}"/>` : '';
      return drawn + timer;
    }).join('');
    const [ax, ay] = L.point(m.now.week, L.half + 2), [bx, by] = L.point(m.now.week, -L.half - 2);
    const now = `<line class="wk-now" x1="${wkNum(ax)}" y1="${wkNum(ay)}" x2="${wkNum(bx)}" y2="${wkNum(by)}"/><circle class="wk-now-dot" cx="${wkNum(ax)}" cy="${wkNum(ay)}" r="3"/>`;
    return `<svg class="wk-svg" viewBox="0 0 ${wkNum(L.width)} ${wkNum(L.height)}" role="group" aria-label="Settimana a serpentina"><path class="wk-track" d="${track}" style="stroke-width:${L.half * 2}"/>${ticks.join('')}${hours}${labels}${blocks}${now}</svg>`;
  }
}

export class ScheduleCreatorRingCard extends ScheduleCreatorWeekCard {
  get defaultTitle() { return 'La settimana ad anello'; }
  get hint() { return 'Ogni anello è un dispositivo · lo spazio tra i settori è la mezzanotte'; }
  drawing(m) {
    const L = ringLayout(m.lanes.length), n = m.lanes.length;
    const bands = [], labels = [];
    for (let d = 0; d < 7; d++) {
      const a0 = -90 + d * L.span + L.gapDeg / 2, a1 = a0 + L.span - L.gapDeg;
      for (let i = 0; i < n; i++) { const [ro, ri] = L.radii(i); bands.push(`<path class="wk-band" d="${L.sector(a0, a1, ro, ri)}"/>`); }
      const [x, y] = L.at((a0 + a1) / 2, L.outer + 18);
      labels.push(`<text class="wk-day${d === m.now.weekday ? ' is-today' : ''}" x="${wkNum(x)}" y="${wkNum(y + 4)}" text-anchor="middle">${WK_DAYS[d]}</text>`);
    }
    const blocks = m.lanes.map((lane, i) => {
      const [ro, ri] = L.radii(i);
      const drawn = lane.blocks.map((b) => splitByDay(b).map((part) => {
        const d = L.sector(L.angle(part.start), L.angle(part.end === Math.ceil(part.end / 1440) * 1440 ? part.end - 0.001 : part.end), ro - 2, ri + 2);
        const cls = `wk-arc${b.live ? ` is-${b.live}` : ''}${b.key === this.selected ? ' is-selected' : ''}`;
        return `<path class="${cls}" d="${d}" style="fill:${b.color}" data-block="${b.key}" tabindex="0" role="button" aria-label="${wkEsc(this.blockLabel(lane, b))}"><title>${wkEsc(this.blockLabel(lane, b))}</title></path>`;
      }).join('')).join('');
      const timer = lane.timer ? splitByDay({start: lane.timer.start, end: Math.min(WEEK, lane.timer.end)}).map((p) => `<path class="wk-arc-timer" d="${L.sector(L.angle(p.start), L.angle(p.end % 1440 ? p.end : p.end - 0.001), ro - 2, ri + 2)}"/>`).join('') : '';
      return drawn + timer;
    }).join('');
    const deg = L.angle(m.now.week), [x1, y1] = L.at(deg, L.inner - 4), [x2, y2] = L.at(deg, L.outer + 4), [dx, dy] = L.at(deg, L.outer + 8);
    const now = `<line class="wk-now" x1="${wkNum(x1)}" y1="${wkNum(y1)}" x2="${wkNum(x2)}" y2="${wkNum(y2)}"/><circle class="wk-now-dot" cx="${wkNum(dx)}" cy="${wkNum(dy)}" r="3.5"/>`;
    // Centre: what is happening now, or the next block when nothing runs.
    const live = m.lanes.filter((l) => l.status).slice(0, 3);
    const lines = live.length ? live.map((l) => [`${l.name}`, l.status, l.statusKind]) : m.next ? [['Nessuna attività in corso', '', ''], [`Prossima: ${m.next.lane.name}`, `${WK_DAYS[Math.floor(m.next.block.start / 1440)].toLowerCase()} ${wkTime(m.next.block.start % 1440)}`, '']] : [['Nessuna attività in corso', '', '']];
    const hub = L.inner - 12, cut = (text, max) => text.length > max ? `${text.slice(0, max - 1)}…` : text, max = Math.floor(hub / 5);
    let y = L.c - (lines.length * 36) / 2 + 4;
    const text = lines.map(([title, sub, kind]) => { const out = `<text class="wk-hub-title" x="${L.c}" y="${wkNum(y)}">${wkEsc(cut(title, max))}</text>${sub ? `<text class="wk-hub-sub${kind ? ` is-${kind}` : ''}" x="${L.c}" y="${wkNum(y + 17)}">${wkEsc(cut(sub, max))}</text>` : ''}`; y += 36; return out; }).join('');
    const center = `<circle class="wk-hub" cx="${L.c}" cy="${L.c}" r="${hub}"/><text class="wk-hub-eyebrow" x="${L.c}" y="${wkNum(L.c - (lines.length * 36) / 2 - 20)}">${WK_FULL[m.now.weekday].toUpperCase()} ${m.now.label}</text>${text}`;
    return `<svg class="wk-svg wk-ring" viewBox="0 0 ${L.size} ${L.size}" role="group" aria-label="Settimana ad anello">${bands.join('')}${labels.join('')}${blocks}${center}${now}</svg>`;
  }
}

for (const [tag, cls, name, description] of [
  ['schedule-creator-serpentine-card', ScheduleCreatorSerpentineCard, 'Schedule Creator · Serpentina', 'La settimana di più dispositivi su un percorso a serpentina'],
  ['schedule-creator-ring-card', ScheduleCreatorRingCard, 'Schedule Creator · Anello', 'La settimana ad anello: un settore per giorno, un anello per dispositivo'],
]) {
  if (!customElements.get(tag)) customElements.define(tag, cls);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((card) => card.type === tag)) window.customCards.push({type: tag, name, description});
}
