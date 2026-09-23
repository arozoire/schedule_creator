import { ScheduleCreatorStateAdapter } from './state-adapter.js';
import { clean, messageFor, parseJson, actionFromFields } from './editor.js';

const STYLE = '__SC_CSS__';
const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[char]);
const tint = (value) => /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(value || '') ? value : '#03a9f4';
const field = (name, title, value = '', type = 'text') => `<label>${title}<input name="${name}" type="${type}" value="${esc(value)}"></label>`;
const area = (name, title, value, rows = 4) => `<label>${title}<textarea name="${name}" rows="${rows}">${esc(value)}</textarea></label>`;
const select = (name, title, options, current) => `<label>${title}<select name="${name}">${options.map(([value, label]) => `<option value="${esc(value)}" ${value === current ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label>`;
const button = (name, label, id = '') => `<button type="button" data-command="${name}" data-id="${esc(id)}">${esc(label)}</button>`;
const json = (value) => JSON.stringify(clean(value), null, 2);
const defaultAction = (domain) => ({ domain, action: 'turn_on', data: {} });
const defaultCondition = { operator: 'state_equals', entity_id: 'binary_sensor.example', value: 'on', lower: null, upper: null, children: [], minimum_duration_seconds: null, hysteresis: null };
const optionsFor = (domain) => domain === 'climate' ? ['set_temperature', 'set_hvac_mode', 'turn_on', 'turn_off'] : domain === 'fan' ? ['turn_on', 'turn_off', 'set_percentage', 'set_preset_mode'] : ['turn_on', 'turn_off'];
function actionEditor(prefix, domain, value, optional = false) {
  const action = value || defaultAction(domain);
  const supported = action.domain === domain && optionsFor(domain).includes(action.action) &&
    Object.keys(action.data || {}).every((key) => ({ climate: ['temperature', 'hvac_mode'], fan: ['percentage', 'preset_mode'] }[domain] || []).includes(key));
  const mode = optional && !value ? 'none' : supported ? 'simple' : 'advanced';
  return `<fieldset><legend>${prefix === 'start' ? 'Azione iniziale' : prefix === 'end' ? 'Azione finale' : 'Azione timer'}</legend>
    ${select(`${prefix}_mode`, 'Modalità', [...(optional ? [['none', 'Nessuna']] : []), ['simple', 'Comandi comuni'], ['advanced', 'JSON avanzato']], mode)}
    ${select(`${prefix}_action`, 'Comando', optionsFor(domain).map((x) => [x, x]), supported ? action.action : 'turn_on')}
    ${field(`${prefix}_number`, domain === 'fan' ? 'Percentuale (0–100)' : 'Temperatura °C', action.data?.temperature ?? action.data?.percentage ?? (domain === 'fan' ? 50 : 20), 'number')}
    ${field(`${prefix}_text`, 'Modalità HVAC / preset', action.data?.hvac_mode ?? action.data?.preset_mode ?? '')}
    ${area(`${prefix}_json`, 'Azione completa (JSON; target escluso)', json(action))}</fieldset>`;
}

class ScheduleCreatorCard extends HTMLElement {
  constructor() {
    super(); this.attachShadow({ mode: 'open' });
    this.adapter = new ScheduleCreatorStateAdapter(() => this.render());
    this.selectedProfile = null; this.selectedGroup = null;
    this.edit = null; this.draft = null; this.localError = null;
    this.shadowRoot.addEventListener('click', (e) => this.click(e));
    this.shadowRoot.addEventListener('submit', (e) => this.submit(e));
    this.shadowRoot.addEventListener('input', (e) => {
      if (!e.target.closest('form')) return;
      this.capture();
      if (e.target.name === 'entity_search') {
        const query = e.target.value.toLowerCase();
        this.shadowRoot.querySelectorAll('[data-entity-label]').forEach((node) => { node.hidden = !node.dataset.entityLabel.includes(query); });
      }
    });
    this.shadowRoot.addEventListener('change', (e) => { if (e.target.closest('form')) { this.capture(); if (e.target.name === 'entity_id') this.render(); } });
  }
  static getStubConfig() { return { type: 'custom:schedule-creator-card' }; }
  static getConfigElement() { return document.createElement('schedule-creator-card-editor'); }
  getCardSize() { return 8; }
  setConfig(config) { this.config = config; this.render(); }
  set hass(hass) { this._hass = hass; if (this.isConnected) this.adapter.connect(hass); if (hass?.connection !== this.adapter.connection || !this.edit) this.render(); }
  connectedCallback() { if (this._hass) this.adapter.connect(this._hass); this.render(); }
  disconnectedCallback() { this.adapter.disconnect(); clearInterval(this.clock); this.clock = null; }
  capture() {
    const form = this.shadowRoot.querySelector('form[data-editor]');
    if (!form) return;
    this.draft = Object.fromEntries(new FormData(form));
    this.draft.selectedEntities = [...form.querySelectorAll('[name="entities"]:checked')].map((x) => x.value);
    this.draft.days = [...form.querySelectorAll('[name="days"]:checked')].map((x) => Number(x.value));
    this.draft.enabled = !!form.elements.enabled?.checked;
  }
  restoreDraft() {
    const form = this.shadowRoot.querySelector('form[data-editor]');
    if (!form || !this.draft) return;
    for (const [name, value] of Object.entries(this.draft)) {
      if (['selectedEntities', 'days', 'enabled'].includes(name)) continue;
      if (form.elements[name] && !['entities', 'days'].includes(name)) form.elements[name].value = value;
    }
    form.querySelectorAll('[name="entities"]').forEach((x) => { x.checked = this.draft.selectedEntities.includes(x.value); });
    form.querySelectorAll('[name="days"]').forEach((x) => { x.checked = this.draft.days.includes(Number(x.value)); });
    if (form.elements.enabled) form.elements.enabled.checked = this.draft.enabled;
    const query = form.elements.entity_search?.value?.toLowerCase() || '';
    form.querySelectorAll('[data-entity-label]').forEach((node) => { node.hidden = !node.dataset.entityLabel.includes(query); });
  }
  render() {
    if (!this.config) return;
    const { state, error, loading, busy, writeError } = this.adapter;
    const config = state?.config || {};
    const profiles = config.profiles || [];
    const profile = profiles.find((p) => p.id === this.selectedProfile) || profiles[0];
    const groups = (config.groups || []).filter((g) => g.profile_id === profile?.id);
    const group = groups.find((g) => g.id === this.selectedGroup) || groups[0];
    const schedules = (config.schedules || []).filter((s) => s.profile_id === profile?.id && (!group || s.group_id === group.id));
    const chips = profiles.map((p) => `<button type="button" class="profile-chip ${p.id === profile?.id ? 'viewed' : ''} ${p.active ? 'active-op' : ''}" style="--pchip-color:${tint(p.color)}" data-profile="${esc(p.id)}">${esc(p.name)}${p.active ? ' ●' : ''}</button>`).join('');
    const tabs = groups.map((g) => `<button type="button" class="tab ${g.id === group?.id ? 'active' : ''}" data-group="${esc(g.id)}">${esc(g.name)}</button>`).join('');
    const slots = DAYS.map((day, index) => `<div class="sc-day"><strong>${day}</strong>${schedules.flatMap((s) => (s.time_slots || []).filter((slot) => slot.weekdays.includes(index)).map((slot) => `<div class="sc-slot" style="--pchip-color:${tint(profile?.color)}">${esc(slot.start)}–${esc(slot.end)}<br>${esc(s.name)}${s.enabled ? '' : ' · off'}</div>`)).join('')}</div>`).join('');
    const status = error ? `<div class="status error" role="alert">${esc(messageFor(error))}</div>` : loading ? '<div class="status">Caricamento…</div>' : '';
    const info = this.localError || writeError;
    const editable = this._hass?.user?.is_admin !== false;
    const view = state ? `<div class="profile-status-bar">${profile ? `${esc(profile.name)} · ${profile.active ? 'attivo' : 'inattivo'} · ${esc(profile.profile_type)}` : 'Nessun profilo'} · ${state.runtime_summary?.active_leases ?? 0} lease attive · ${state.quick_timers?.length ?? 0} timer attivi</div>
      <div class="tab-bar">${tabs}</div>${schedules.length ? `<div class="sc-week">${slots}</div><div class="sc-heading">Schedule</div><ul class="sc-list">${schedules.map((s) => `<li class="sc-entry">${esc(s.name)} · ${esc(s.target_entity_ids.join(', '))}${s.enabled ? '' : ' · spento'} ${editable ? button('editSchedule', 'Modifica', s.id) + button('deleteSchedule', 'Elimina', s.id) : ''}</li>`).join('')}</ul>` : '<div class="sc-empty">Nessuno schedule in questa vista</div>'}
      ${editable ? `<div class="sc-controls">${button('newProfile', '＋ Profilo')}${profile ? `${button('editProfile', 'Modifica profilo', profile.id)}${button('toggleProfile', profile.active ? 'Disattiva' : 'Attiva', profile.id)}${button('deleteProfile', 'Elimina profilo', profile.id)}${button('newGroup', '＋ Gruppo')}` : ''}${group ? `${button('editGroup', 'Modifica gruppo', group.id)}${button('deleteGroup', 'Elimina gruppo', group.id)}${button('newSchedule', '＋ Schedule')}` : ''}${button('newTimer', '＋ Quick Timer')}</div>` : '<p>Vista in sola lettura: serve un amministratore per modificare.</p>'}
      ${this.edit && editable ? this.editor(config, profile, group) : ''}
      <section class="sc-operational"><h3>Stato operativo</h3>${(state.operational?.occurrences || []).map((x) => `<p>${esc(config.schedules?.find((s) => s.id === x.schedule_id)?.name || x.schedule_id)}: ${esc(x.state)}, condizione ${esc(x.condition_branch)}, termine ${esc(x.end_utc)}</p>`).join('') || '<p>Nessuna fascia attiva.</p>'}${(state.operational?.leases || []).map((x) => `<p>${esc(x.entity_id)}: ${esc(x.state)} (${esc(x.controller_type)})</p>`).join('')}${(state.quick_timers || []).map((x) => `<p>Timer ${esc(x.entity_id)}: <span data-expiry="${esc(x.expires_at)}"></span> (${esc(x.state)}) ${editable ? button('cancelTimer', 'Annulla', x.id) : ''}</p>`).join('')}<p>Motivo di eventuali rifiuti: stato non disponibile.</p></section>` : '';
    this.shadowRoot.innerHTML = `<style>${STYLE}</style><style>.sc-week{overflow-x:auto;grid-template-columns:repeat(7,minmax(90px,1fr))}.sc-controls,.sc-actions{display:flex;flex-wrap:wrap;gap:6px;margin:12px}.sc-controls button,.sc-actions button,.sc-entry button{border:1px solid var(--divider-color,#aaa);border-radius:7px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#222);padding:7px;cursor:pointer}.sc-editor{padding:14px;border-top:1px solid var(--divider-color,#aaa);display:grid;gap:10px}.sc-editor label{display:grid;gap:4px}.sc-editor input,.sc-editor select,.sc-editor textarea{box-sizing:border-box;width:100%;max-width:100%;padding:7px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#222);border:1px solid var(--divider-color,#aaa);border-radius:5px}.sc-editor fieldset{min-width:0}.sc-entities{max-height:160px;overflow:auto;display:grid;gap:4px}.sc-entities label,.sc-days label{display:inline-flex;align-items:center;gap:5px}.sc-entities input,.sc-days input{width:auto}.sc-days{display:flex;flex-wrap:wrap;gap:9px}.sc-operational{padding:12px}.sc-error{color:var(--error-color,#b33);padding:10px}</style><ha-card style="--pchip-color:${tint(profile?.color)}"><div class="card-header"><div class="hdr-row1"><span class="card-title">${esc(this.config.title || 'Schedule Creator')}</span></div><div class="hdr-row2">${chips}</div><div class="hdr-sep"></div></div>${status}${info ? `<p class="sc-error" role="alert">${esc(typeof info === 'string' ? info : messageFor(info))}</p>` : ''}${view}</ha-card>`;
    this.restoreDraft(); this.updateClock();
    if (!this.clock && this.isConnected) this.clock = setInterval(() => this.updateClock(), 1000);
    this.shadowRoot.querySelectorAll('button').forEach((b) => { b.disabled = busy; });
  }
  updateClock() {
    this.shadowRoot.querySelectorAll('[data-expiry]').forEach((node) => {
      const seconds = Math.max(0, Math.ceil((new Date(node.dataset.expiry) - Date.now()) / 1000));
      node.textContent = `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m ${seconds % 60}s`;
    });
  }
  entities(selected = [], domain = '') {
    const states = Object.values(this._hass?.states || {}).filter((s) => !domain || s.entity_id.startsWith(`${domain}.`));
    const ids = new Set(states.map((s) => s.entity_id));
    for (const id of selected) if (!ids.has(id)) states.push({ entity_id: id, attributes: { friendly_name: 'Non disponibile' } });
    return `<label>Ricerca entità<input type="search" name="entity_search" placeholder="Nome, dominio o ID"></label><div class="sc-entities">${states.sort((a,b) => a.entity_id.localeCompare(b.entity_id)).map((s) => `<label data-entity-label="${esc(`${s.entity_id} ${s.attributes?.friendly_name || ''}`.toLowerCase())}"><input type="checkbox" name="entities" value="${esc(s.entity_id)}" ${selected.includes(s.entity_id) ? 'checked' : ''}>${esc(s.attributes?.friendly_name || s.entity_id)} · ${esc(s.entity_id)}</label>`).join('')}</div>`;
  }
  editor(config, profile, group) {
    const [kind, id] = this.edit;
    const item = id ? (config[`${kind}s`] || []).find((x) => x.id === id) : null;
    if (id && !item) return '<p>Record eliminato su un altro client. La bozza rimane disponibile finché non chiudi l’editor.</p>';
    let content = '';
    if (kind === 'profile') content = `${field('name', 'Nome', item?.name)}${select('profile_type', 'Tipo', [['exclusive','Esclusivo'],['shared','Condiviso']], item?.profile_type || 'exclusive')}${field('icon','Icona',item?.icon)}${field('color','Colore HEX',item?.color)}${field('order','Ordine',item?.order ?? 0,'number')}`;
    if (kind === 'group') content = `${field('name','Nome',item?.name)}${field('icon','Icona',item?.icon)}${field('color','Colore HEX',item?.color)}${field('order','Ordine',item?.order ?? 0,'number')}${this.entities(item?.entity_ids || [])}`;
    if (kind === 'schedule') {
      const owner = config.groups.find((g) => g.id === (item?.group_id || group?.id));
      const first = item?.time_slots?.[0] || { weekdays: [0,1,2,3,4], start: '08:00', end: '09:00' };
      const domain = (item?.target_entity_ids?.[0] || owner?.entity_ids?.[0] || 'switch.example').split('.')[0];
      content = `${field('name','Nome',item?.name)}<label><input name="enabled" type="checkbox" ${item?.enabled !== false ? 'checked' : ''}>Abilitato</label>${this.entities(item?.target_entity_ids || [],domain)}
        <div class="sc-days">${DAYS.map((day, i) => `<label><input type="checkbox" name="days" value="${i}" ${first.weekdays.includes(i) ? 'checked' : ''}>${day}</label>`).join('')}</div>
        ${field('start','Dalle',first.start,'time')}${field('end','Alle',first.end,'time')}
        ${area('extra_slots','Altre fasce (JSON array, se presenti)',json((item?.time_slots || []).slice(1)),2)}
        ${actionEditor('start',domain,item?.start_action)}${actionEditor('end',domain,item?.end_action,true)}
        <p>Condizione falsa: azione finale se presente, altrimenti ripristino deciso dal motore. La fine fascia senza azione finale non invia comandi.</p>
        ${area('condition','Albero condizioni (JSON o null). Operatori: state_equals, state_not_equals, numeric_greater, numeric_greater_or_equal, numeric_less, numeric_less_or_equal, numeric_range, available, and, or.',item?.condition ? json(item.condition) : 'null',7)}
        ${button('conditionExample','Inserisci esempio di condizione')}
        ${select('override_policy','Policy', [['cooperative','Cooperative'],['manual_override','Manual override']],item?.override_policy || 'cooperative')}
        ${field('inclusion_dates','Date incluse, separate da virgola (AAAA-MM-GG)',(item?.inclusion_dates || []).join(', '))}
        ${field('exclusion_dates','Date escluse, separate da virgola (AAAA-MM-GG)',(item?.exclusion_dates || []).join(', '))}
        ${area('start_notification','Notifica iniziale (JSON o null)',item?.start_notification ? json(item.start_notification) : 'null',3)}
        ${area('end_notification','Notifica finale (JSON o null)',item?.end_notification ? json(item.end_notification) : 'null',3)}
        <p>Notifica JSON: {"action":"notify.mobile_app_example","title":"Titolo","message":"Testo"}.</p>`;
    }
    if (kind === 'timer') {
      const entities = Object.values(this._hass?.states || {});
      const domain = (this.draft?.entity_id || entities.find((x) => ['switch','climate','fan'].includes(x.entity_id.split('.')[0]))?.entity_id || 'switch.example').split('.')[0];
      content = `${select('entity_id','Entità',entities.map((s) => [s.entity_id, `${s.attributes?.friendly_name || s.entity_id} · ${s.entity_id}`]),this.draft?.entity_id)}${field('duration_seconds','Durata in secondi (1–604800)',300,'number')}${actionEditor('timer',domain,null)}`;
    }
    return `<form data-editor="${esc(kind)}" class="sc-editor"><h3>${id ? 'Modifica' : 'Nuovo'} ${esc(kind)}</h3>${content}<div class="sc-actions"><button type="submit">Salva</button>${button('close','Chiudi')}</div></form>`;
  }
  async click(event) {
    const buttonEl = event.target.closest('button'); if (!buttonEl || this.adapter.busy) return;
    if (buttonEl.dataset.profile) { this.selectedProfile = buttonEl.dataset.profile; this.selectedGroup = null; this.edit = null; this.draft = null; this.render(); return; }
    if (buttonEl.dataset.group) { this.selectedGroup = buttonEl.dataset.group; this.edit = null; this.draft = null; this.render(); return; }
    const command = buttonEl.dataset.command, id = buttonEl.dataset.id;
    if (!command) return;
    if (command === 'conditionExample') { const input = this.shadowRoot.querySelector('[name="condition"]'); input.value = JSON.stringify(defaultCondition, null, 2); this.capture(); return; }
    if (command === 'close') { this.edit = null; this.draft = null; this.localError = null; this.render(); return; }
    if (/^(new|edit)/.test(command)) { this.edit = [command.replace(/^(new|edit)/,'').toLowerCase(), id || null]; this.draft = null; this.localError = null; this.render(); return; }
    const types = { toggleProfile: 'profile/set_active', deleteProfile: 'profile/delete', deleteGroup: 'group/delete', deleteSchedule: 'schedule/delete', cancelTimer: 'quick_timer/cancel' };
    if (!types[command]) return;
    if (command.startsWith('delete') && !confirm('Eliminare questo elemento?')) return;
    const payload = command === 'toggleProfile' ? { profile_id: id, active: !this.adapter.state.config.profiles.find((p) => p.id === id)?.active } :
      { [command === 'cancelTimer' ? 'quick_timer_id' : `${command.slice(6).toLowerCase()}_id`]: id };
    if (this.adapter.conflicted && !confirm('I dati sono cambiati su un altro client. Hai verificato le modifiche prima di procedere?')) return;
    await this.adapter.mutate(types[command], payload, { runtime: command === 'cancelTimer' });
  }
  async submit(event) {
    const form = event.target.closest('form[data-editor]'); if (!form) return;
    event.preventDefault(); if (this.adapter.busy) return;
    this.capture(); this.localError = null;
    const [kind,id] = this.edit;
    const data = Object.fromEntries(new FormData(form));
    const config = this.adapter.state.config;
    const profile = config.profiles.find((p) => p.id === this.selectedProfile) || config.profiles[0];
    const group = config.groups.find((g) => g.id === this.selectedGroup) || config.groups.find((g) => g.profile_id === profile?.id);
    let payload;
    try {
      if (kind === 'profile') payload = { name: data.name.trim(), profile_type: data.profile_type, icon: data.icon || null, color: data.color || null, order: Number(data.order) };
      if (kind === 'group') payload = { name: data.name.trim(), entity_ids: this.draft.selectedEntities, icon: data.icon || null, color: data.color || null, order: Number(data.order) };
      if (kind === 'schedule') {
        const owner = config.groups.find((g) => g.id === (id ? config.schedules.find((s) => s.id === id)?.group_id : group?.id));
        const domain = this.draft.selectedEntities[0]?.split('.')[0];
        if (!domain || !this.draft.selectedEntities.every((x) => x.startsWith(`${domain}.`) && owner.entity_ids.includes(x))) throw new Error('Scegli entità dello stesso dominio appartenenti al gruppo.');
        const extras = parseJson(data.extra_slots, 'Altre fasce');
        if (!Array.isArray(extras) || !this.draft.days.length) throw new Error('Seleziona almeno un giorno e verifica le altre fasce.');
        const dates = (str) => [...new Set(str.split(',').map((x) => x.trim()).filter(Boolean))].sort();
        payload = { name: data.name.trim(), enabled: this.draft.enabled, target_entity_ids: this.draft.selectedEntities,
          time_slots: [{ weekdays: this.draft.days.sort(), start: data.start, end: data.end }, ...clean(extras)],
          start_action: actionFromFields(form,'start',domain), end_action: actionFromFields(form,'end',domain),
          condition: parseJson(data.condition,'Condizione'), override_policy: data.override_policy,
          inclusion_dates: dates(data.inclusion_dates), exclusion_dates: dates(data.exclusion_dates),
          start_notification: parseJson(data.start_notification,'Notifica iniziale'), end_notification: parseJson(data.end_notification,'Notifica finale') };
      }
      if (kind === 'timer') { const domain = data.entity_id.split('.')[0]; payload = { entity_id: data.entity_id, duration_seconds: Number(data.duration_seconds), action: actionFromFields(form,'timer',domain) }; }
      if (!payload) throw new Error('Editor non disponibile.');
      if (this.adapter.conflicted && !confirm('I dati sono cambiati su un altro client. Hai confrontato la bozza con i nuovi dati prima di salvare?')) return;
      if (id) payload[`${kind}_id`] = id;
      if (!id && kind === 'group') payload.profile_id = profile.id;
      if (!id && kind === 'schedule') { payload.profile_id = profile.id; payload.group_id = group.id; }
      const type = kind === 'timer' ? 'quick_timer/create' : `${kind}/${id ? 'update' : 'create'}`;
      const ok = await this.adapter.mutate(type,payload,{ runtime: kind === 'timer' });
      if (ok) { this.edit = null; this.draft = null; this.render(); }
    } catch (error) { this.localError = error.message; this.render(); }
  }
}
class ScheduleCreatorCardEditor extends HTMLElement {
  setConfig(config) { this.config = config; if (this.querySelector('input')?.value !== (config.title || '')) this.render(); }
  set hass(hass) { this._hass = hass; }
  render() {
    if (!this.config) return;
    this.innerHTML = `<div style="padding:12px"><label>Titolo della card <input type="text" value="${esc(this.config.title || '')}"></label></div>`;
    this.querySelector('input').addEventListener('input', (event) => {
      this.config = { ...this.config, title: event.target.value };
      this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this.config }, bubbles: true, composed: true }));
    });
  }
}
if (!customElements.get('schedule-creator-card')) customElements.define('schedule-creator-card', ScheduleCreatorCard);
if (!customElements.get('schedule-creator-card-editor')) customElements.define('schedule-creator-card-editor', ScheduleCreatorCardEditor);
window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === 'schedule-creator-card')) window.customCards.push({ type: 'schedule-creator-card', name: 'Schedule Creator', description: 'Schedule Creator profiles, schedules and timers' });
