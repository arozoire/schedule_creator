// Standalone Quick Timer card, like weekly-schedule-card's quick-timer-card.
// Same backend and bundle as the main card: timers live in Schedule Creator.
import { ScheduleCreatorStateAdapter, hassChanged } from './state-adapter.js';
import { uiEscape, targetEntities } from './forms.js';
import { messageFor } from './editor.js';
import { actionForm, readAction, describeAction, describeState } from './action-editor.js';

const qtEsc = uiEscape;
const QT_STYLE = '__SC_QT_CSS__';
const QT_PRESETS = [5, 10, 15, 30, 45, 60];
const qtDuration = (seconds) => {
  const s = Math.max(0, Math.round(seconds)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${m}:${String(s % 60).padStart(2, '0')}`;
};
export const minutesLabel = (minutes) => minutes >= 60 && minutes % 60 === 0 ? `${minutes / 60} ${minutes === 60 ? 'ora' : 'ore'}` : `${minutes} minuti`;

export class ScheduleCreatorQuickTimerCard extends HTMLElement {
  constructor() {
    super(); this.attachShadow({mode: 'open'});
    this.adapter = new ScheduleCreatorStateAdapter(() => this.render());
    this.draft = {}; this.minutes = null; this.mode = 'duration'; this.error = null;
    this.shadowRoot.innerHTML = `<style>${QT_STYLE}</style><ha-card></ha-card>`;
    this.shadowRoot.addEventListener('click', (e) => this.click(e));
    this.shadowRoot.addEventListener('input', (e) => this.input(e));
    this.shadowRoot.addEventListener('change', (e) => {
      this.capture();
      if (e.target.matches('input[type="radio"],select,input[type="checkbox"]')) this.render();
    });
    this.shadowRoot.addEventListener('keydown', (e) => { if (e.target.name === 'qt_search' && e.key === 'Enter') e.preventDefault(); });
  }
  static getStubConfig() { return {entity: ''}; }
  static getConfigElement() { return document.createElement('schedule-creator-quick-timer-card-editor'); }
  getCardSize() { return 5; }
  setConfig(config) {
    this.config = config || {};
    const presets = (Array.isArray(this.config.presets) ? this.config.presets : []).map(Number).filter((m) => Number.isFinite(m) && m >= 1);
    this.presets = presets.length ? [...new Set(presets)] : QT_PRESETS;
    this.minutes ??= Number(this.config.default_minutes) >= 1 ? Number(this.config.default_minutes) : this.presets.includes(30) ? 30 : this.presets[0];
    this.render();
  }
  set hass(hass) {
    const previous = this._hass; this._hass = hass;
    if (this.isConnected) this.adapter.connect(hass);
    // Only the chosen device and running timers matter here.
    const state = this.adapter.state, ids = state ? new Set([this.entity, ...(state.quick_timers || []).map((t) => t.entity_id)].filter(Boolean)) : null;
    if (!this.shadowRoot.activeElement && hassChanged(previous, hass, ids)) this.render();
  }
  connectedCallback() { if (this._hass) this.adapter.connect(this._hass); this.render(); this.clock ??= setInterval(() => this.tick(), 1000); }
  disconnectedCallback() { this.adapter.disconnect(); clearInterval(this.clock); this.clock = null; }
  get entity() { return this.config?.entity || this.draft.qt_entity || null; }
  capture() {
    const form = this.shadowRoot.querySelector('form');
    if (!form) return;
    this.draft = {...this.draft, ...Object.fromEntries([...new FormData(form)].filter(([, v]) => typeof v === 'string'))};
    for (const node of form.querySelectorAll('input[type="checkbox"]')) this.draft[node.getAttribute('name')] = node.checked ? 'on' : '';
  }
  input(e) {
    const t = e.target;
    if (t.getAttribute('name') === 'qt_search') {
      const q = t.value.toLowerCase();
      this.shadowRoot.querySelectorAll('[data-entity-label]').forEach((n) => { n.hidden = !n.dataset.entityLabel.includes(q); });
      return;
    }
    if (t.classList.contains('qt-minutes') || t.classList.contains('qt-range')) {
      const v = Math.max(1, Math.round(Number(t.value) || 1));
      this.minutes = v;
      this.shadowRoot.querySelectorAll('.qt-minutes,.qt-range').forEach((n) => { if (n !== t) n.value = v; });
      const range = this.shadowRoot.querySelector('.qt-range');
      if (range) range.style.setProperty('--sc-fill', `${(Math.min(v, Number(range.max)) - 1) / (Number(range.max) - 1) * 100}%`);
      this.shadowRoot.querySelectorAll('.qt-chip').forEach((n) => n.classList.toggle('is-selected', Number(n.dataset.min) === v));
      this.updateStartLabel();
      return;
    }
    if (t.dataset.mirror || t.type === 'range') {
      const root = t.closest('.sc-range');
      const range = root?.querySelector('input[type="range"]'), mirror = root?.querySelector('[data-mirror]');
      if (range && mirror) { if (t === mirror) range.value = mirror.value; else mirror.value = range.value; }
    }
    this.capture(); this.updateStartLabel();
  }
  timers() { return (this.adapter.state?.quick_timers || []).filter((x) => !this.entity || x.entity_id === this.entity); }
  seconds() {
    if (this.mode === 'until') {
      const [h, m] = String(this.draft.qt_until || '').split(':').map(Number);
      if (!Number.isFinite(h)) return null;
      const now = new Date(), end = new Date(now); end.setHours(h, m || 0, 0, 0);
      if (end <= now) end.setDate(end.getDate() + 1);
      return Math.round((end - now) / 1000);
    }
    return this.minutes * 60;
  }
  pendingAction() {
    const form = this.shadowRoot.querySelector('form');
    try { return form && this.entity ? readAction(form, 'timer', this.entity.split('.')[0]) : null; } catch { return null; }
  }
  updateStartLabel() {
    const node = this.shadowRoot.querySelector('.qt-start');
    if (!node) return;
    const action = describeAction(this.pendingAction()) || 'Avvia';
    node.textContent = this.mode === 'until' ? `${action} fino alle ${this.draft.qt_until || '--:--'}` : `${action} per ${minutesLabel(this.minutes)}`;
  }
  tick() {
    this.shadowRoot.querySelectorAll('[data-expiry]').forEach((n) => { n.textContent = qtDuration((new Date(n.dataset.expiry) - Date.now()) / 1000); });
  }
  render() {
    if (!this.config) return;
    const hass = this._hass, surface = this.shadowRoot.querySelector('ha-card');
    if (!hass) { surface.innerHTML = '<div class="qt-body">Caricamento…</div>'; return; }
    const {state, error, busy, writeError} = this.adapter;
    const admin = hass.user?.is_admin === true;
    const entity = this.entity, st = entity ? hass.states[entity] : null;
    const name = this.config.name || st?.attributes?.friendly_name || entity || 'Quick Timer';
    const active = this.timers();
    const problem = this.error || writeError || error;
    const focusName = this.shadowRoot.activeElement?.getAttribute?.('name');
    let body;
    if (!entity) {
      const ids = targetEntities(hass).sort();
      body = `<label class="qt-label">Scegli l’entità<input type="search" name="qt_search" placeholder="Cerca per nome o ID" autocomplete="off"></label><div class="qt-entities" role="radiogroup">${ids.map((id) => `<label data-entity-label="${qtEsc(`${id} ${hass.states[id]?.attributes?.friendly_name || ''}`.toLowerCase())}"><input type="radio" name="qt_entity" value="${qtEsc(id)}"><span><strong>${qtEsc(hass.states[id]?.attributes?.friendly_name || id)}</strong><small>${qtEsc(id)}</small></span></label>`).join('')}</div>`;
    } else if (active.length) {
      body = active.map((t) => `<div class="qt-active"><div class="qt-active-copy"><span class="qt-countdown" data-expiry="${qtEsc(t.expires_at)}">${qtDuration((new Date(t.expires_at) - Date.now()) / 1000)}</span><span class="qt-muted">${qtEsc(describeAction(t.action))}</span><span class="qt-previous">Alla scadenza torna a <strong>${qtEsc(t.previous ? describeState(t.previous, entity.split('.')[0]) : 'lo stato precedente')}</strong></span></div>${admin ? `<button type="button" class="qt-cancel" data-cancel="${qtEsc(t.id)}">Annulla</button>` : ''}</div>`).join('');
    } else if (!admin) {
      body = '<p class="qt-muted">Nessun timer attivo. Serve un amministratore per avviarne uno.</p>';
    } else {
      const chips = this.presets.map((m) => `<button type="button" class="qt-chip${m === this.minutes ? ' is-selected' : ''}" data-min="${m}">${m >= 60 && m % 60 === 0 ? `${m / 60}h` : `${m}′`}</button>`).join('');
      const max = Math.max(120, ...this.presets, this.minutes);
      body = `<div class="qt-section">Durante il timer</div>${actionForm('timer', 'Azione', hass, [entity], null, false, this.draft)}
        <div class="qt-section">Per quanto</div><div class="qt-tabs" role="group"><button type="button" class="qt-tab${this.mode === 'duration' ? ' is-selected' : ''}" data-mode="duration">Durata</button><button type="button" class="qt-tab${this.mode === 'until' ? ' is-selected' : ''}" data-mode="until">Fino alle</button></div>
        ${this.mode === 'duration' ? `<div class="qt-chips">${chips}</div><div class="qt-duration"><input type="range" class="qt-range" min="1" max="${max}" step="1" value="${this.minutes}" aria-label="Durata in minuti" style="--sc-fill:${(Math.min(this.minutes, max) - 1) / (max - 1) * 100}%"><label class="qt-minutes-box"><input type="number" class="qt-minutes" min="1" max="10080" value="${this.minutes}" aria-label="Minuti">min</label></div>` : `<label class="qt-label">Fino alle<input type="time" name="qt_until" value="${qtEsc(this.draft.qt_until || '')}"></label>`}
        <button type="submit" class="qt-start">Avvia</button>`;
    }
    surface.innerHTML = `<form class="qt-body sc-editor"><div class="qt-head"><span class="qt-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2 2M9 2h6"></path></svg></span><div class="qt-title"><strong>${qtEsc(this.config.title || 'Timer')}</strong><span>${qtEsc(name)}</span></div>${entity && !this.config.entity ? '<button type="button" class="qt-link" data-change="1">Cambia</button>' : ''}</div>
      ${st ? `<div class="qt-live"><span>Stato attuale</span><strong>${qtEsc(describeState(st, entity.split('.')[0]))}</strong></div>` : entity ? '<p class="qt-muted">Entità non disponibile.</p>' : ''}
      ${problem ? `<p class="qt-error" role="alert">${qtEsc(typeof problem === 'string' ? problem : messageFor(problem))}</p>` : ''}
      ${state || error ? body : '<p class="qt-muted">Caricamento…</p>'}</form>`;
    const form = surface.querySelector('form');
    form.addEventListener('submit', (e) => { e.preventDefault(); this.start(); });
    for (const node of form.querySelectorAll('input[name],select[name]')) {
      const key = node.getAttribute('name'), value = this.draft[key];
      if (value === undefined || node.type === 'search') continue;
      if (node.type === 'radio') node.checked = node.value === value;
      else if (node.type === 'checkbox') node.checked = value === 'on';
      else node.value = value;
    }
    if (focusName) form.querySelector(`[name="${focusName}"]`)?.focus({preventScroll: true});
    form.querySelectorAll('button,input,select').forEach((n) => { n.disabled = busy; });
    this.updateStartLabel();
  }
  async click(e) {
    const b = e.target.closest('button');
    if (!b || this.adapter.busy) return;
    this.error = null;
    if (b.dataset.min) { this.minutes = Number(b.dataset.min); this.capture(); this.render(); }
    else if (b.dataset.mode) { this.capture(); this.mode = b.dataset.mode; this.render(); }
    else if (b.dataset.change) { this.draft = {}; this.render(); }
    else if (b.dataset.cancel) await this.adapter.mutate('quick_timer/cancel', {quick_timer_id: b.dataset.cancel}, {runtime: true});
    else if (b.dataset.command === 'stepValue') {
      const [name, dir] = b.dataset.id.split(':');
      const node = this.shadowRoot.querySelector(`input[name="${name}"]`);
      const step = Number(node.step) || 1;
      node.value = String(Math.min(Number(node.max), Math.max(Number(node.min), Number(node.value) + step * Number(dir))));
      this.capture(); this.updateStartLabel();
    }
  }
  async start() {
    this.capture();
    const entity = this.entity;
    try {
      const action = readAction(this.shadowRoot.querySelector('form'), 'timer', entity.split('.')[0]);
      const duration = this.seconds();
      if (!duration || duration < 1 || duration > 604800) throw new Error('Scegli una durata tra 1 minuto e 7 giorni.');
      await this.adapter.mutate('quick_timer/create', {entity_id: entity, duration_seconds: duration, action}, {runtime: true});
    } catch (error) {
      this.error = error.message; this.render();
    }
  }
}

export class ScheduleCreatorQuickTimerCardEditor extends HTMLElement {
  setConfig(config) { this.config = config; if (!this.rendered) this.render(); }
  set hass(hass) { this._hass = hass; if (!this.rendered) this.render(); }
  render() {
    if (!this.config || !this._hass) return;
    this.rendered = true;
    const ids = targetEntities(this._hass).sort();
    this.innerHTML = `<div style="display:grid;gap:12px;padding:12px"><label>Titolo <input name="title" value="${qtEsc(this.config.title || '')}" placeholder="Timer"></label><label>Entità <select name="entity"><option value="">Scegli nella card</option>${ids.map((id) => `<option value="${qtEsc(id)}" ${id === this.config.entity ? 'selected' : ''}>${qtEsc(this._hass.states[id]?.attributes?.friendly_name || id)}</option>`).join('')}</select></label><label>Durate rapide (minuti, separate da virgola) <input name="presets" value="${qtEsc((this.config.presets || []).join(', '))}" placeholder="5, 10, 15, 30, 45, 60"></label></div>`;
    this.querySelectorAll('input,select').forEach((node) => node.addEventListener('change', () => {
      const config = {...this.config};
      const value = node.value.trim();
      if (node.name === 'presets') { const list = value.split(',').map((x) => Number(x.trim())).filter((x) => x >= 1); if (list.length) config.presets = list; else delete config.presets; }
      else if (value) config[node.name] = value; else delete config[node.name];
      this.config = config;
      this.dispatchEvent(new CustomEvent('config-changed', {detail: {config}, bubbles: true, composed: true}));
    }));
  }
}

if (!customElements.get('schedule-creator-quick-timer-card')) customElements.define('schedule-creator-quick-timer-card', ScheduleCreatorQuickTimerCard);
if (!customElements.get('schedule-creator-quick-timer-card-editor')) customElements.define('schedule-creator-quick-timer-card-editor', ScheduleCreatorQuickTimerCardEditor);
window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === 'schedule-creator-quick-timer-card')) window.customCards.push({type: 'schedule-creator-quick-timer-card', name: 'Schedule Creator · Quick Timer', description: 'Timer rapido per un dispositivo, gestito dal backend Schedule Creator'});
