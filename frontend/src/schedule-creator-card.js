import { ScheduleCreatorStateAdapter } from './state-adapter.js';
import { clean, messageFor, parseJson } from './editor.js';
import { controllable, targetEntities, actionForm, readAction, blankCondition, conditionForm, readCondition, notificationForm, readNotification, slotsForm, readSlots } from './forms.js';

const STYLE = '__SC_CSS__';
const CARD_VERSION = '0.3.0';
const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[char]);
const tint = (value) => /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(value || '') ? value : '#03a9f4';
const field = (name, title, value = '', type = 'text') => `<label>${title}<input name="${name}" type="${type}" value="${esc(value)}"></label>`;
const area = (name, title, value, rows = 4) => `<label>${title}<textarea name="${name}" rows="${rows}">${esc(value)}</textarea></label>`;
const select = (name, title, options, current) => `<label>${title}<select name="${name}">${options.map(([value, label]) => `<option value="${esc(value)}" ${value === current ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label>`;
const button = (name, label, id = '') => `<button type="button" data-command="${name}" data-id="${esc(id)}">${esc(label)}</button>`;
const json = (value) => JSON.stringify(clean(value), null, 2);
class ScheduleCreatorCard extends HTMLElement {
  constructor() {
    super(); this.attachShadow({ mode: 'open' });
    this.adapter = new ScheduleCreatorStateAdapter(() => this.render());
    this.selectedProfile = null; this.selectedGroup = null;
    this.edit = null; this.draft = null; this.localError = null;
    this.shadowRoot.addEventListener('click', (e) => this.click(e));
    this.shadowRoot.addEventListener('submit', (e) => this.submit(e));
    this.shadowRoot.addEventListener('keydown', (e) => {
      if (e.target.name === 'entity_search' && e.key === 'Enter') e.preventDefault();
    });
    this.shadowRoot.addEventListener('input', (e) => {
      if (!e.target.closest('form')) return;
      this.changedFields?.add(e.target.name);
      this.capture();
      if (e.target.name === 'entity_search') {
        const query = e.target.value.toLowerCase();
        this.shadowRoot.querySelectorAll('[data-entity-label]').forEach((node) => {
          const matches = node.dataset.entityLabel.includes(query);
          node.hidden = !matches;
          node.style.setProperty('display', matches ? '' : 'none', matches ? '' : 'important');
        });
      }
    });
    this.shadowRoot.addEventListener('change', (e) => {
      if (!e.target.closest('form')) return;
      this.changedFields?.add(e.target.name);
      const previousDomain = this.actionDomain;
      if (e.target.name === 'entities' && this.edit?.[0] === 'schedule' && e.target.checked) {
        const others = [...this.shadowRoot.querySelectorAll('[name="entities"]:checked')].filter((x)=>x!==e.target);
        if (others.some((x)=>x.value.split('.')[0] !== e.target.value.split('.')[0])) {
          e.target.checked = false;
          this.localError = 'Uno schedule controlla entità dello stesso tipo. Crea uno schedule separato per gli altri dispositivi.';
        }
      }
      this.capture();
      const newDomain = (this.edit?.[0] === 'timer' ? this.draft.entity_id : this.draft.selectedEntities[0])?.split('.')[0];
      if (newDomain && previousDomain && newDomain !== previousDomain) {
        for (const key of Object.keys(this.draft)) if (/^(start|end|timer)_/.test(key) && !key.includes('notification')) delete this.draft[key];
        this.actionReset = true;
        this.localError = 'Tipo di dispositivo cambiato: scegli nuovamente le azioni.';
      }
      this.render();
    });
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
    for (const node of form.querySelectorAll('input[type="checkbox"]')) {
      if (!['entities'].includes(node.name) && !node.name.endsWith('_days')) this.draft[node.name] = node.checked ? 'on' : '';
    }
    this.draft.selectedEntities = [...form.querySelectorAll('[name="entities"]:checked')].map((x) => x.value);
    this.slotDraft = readSlots(form);
    this.conditionDraft = readCondition(form);
  }
  restoreDraft() {
    const form = this.shadowRoot.querySelector('form[data-editor]');
    if (!form || !this.draft) return;
    for (const node of form.elements) {
      if (!node.name || node.name === 'entities' || node.name.startsWith('slot_') || node.name.startsWith('condition')) continue;
      if (this.draft[node.name] === undefined) continue;
      if (node.type === 'checkbox') node.checked = this.draft[node.name] === 'on';
      else node.value = this.draft[node.name];
    }
    form.querySelectorAll('[name="entities"]').forEach((x) => { x.checked = this.draft.selectedEntities.includes(x.value); });
    const query = form.elements.entity_search?.value?.toLowerCase() || '';
    form.querySelectorAll('[data-entity-label]').forEach((node) => {
      const matches = node.dataset.entityLabel.includes(query);
      node.hidden = !matches;
      node.style.setProperty('display', matches ? '' : 'none', matches ? '' : 'important');
    });
  }
  render() {
    if (!this.config) return;
    const focused = this.shadowRoot.activeElement;
    const hadDetails = this.shadowRoot.querySelector('details');
    const openSections = new Set([...this.shadowRoot.querySelectorAll('details[open]')].map((node)=>node.dataset.section || node.querySelector('summary')?.textContent));
    const focusName = focused?.name;
    const selection = focused?.selectionStart;
    const { state, error, loading, busy, writeError } = this.adapter;
    const config = state?.config || {};
    const profiles = config.profiles || [];
    const profile = profiles.find((p) => p.id === this.selectedProfile) || profiles[0];
    const groups = (config.groups || []).filter((g) => g.profile_id === profile?.id);
    const group = groups.find((g) => g.id === this.selectedGroup) || groups[0];
    const schedules = (config.schedules || []).filter((s) => s.profile_id === profile?.id && (!group || s.group_id === group.id));
    const chips = profiles.map((p) => `<button type="button" class="profile-chip ${p.id === profile?.id ? 'viewed' : ''} ${p.active ? 'active-op' : ''}" style="--pchip-color:${tint(p.color)}" aria-pressed="${p.id === profile?.id}" data-profile="${esc(p.id)}">${esc(p.name)}</button>`).join('');
    const tabs = groups.map((g) => `<button type="button" class="tab ${g.id === group?.id ? 'active' : ''}" aria-pressed="${g.id === group?.id}" data-group="${esc(g.id)}">${esc(g.name)}</button>`).join('');
    const slots = DAYS.map((day, index) => {
      const entries = schedules.flatMap((schedule) => (schedule.time_slots || []).filter((slot) => slot.weekdays.includes(index)).map((slot) => `<div class="sc-slot ${schedule.enabled ? '' : 'is-off'}" style="--pchip-color:${tint(profile?.color)}"><time>${esc(slot.start)}–${esc(slot.end)}</time><span>${esc(schedule.name)}${schedule.enabled ? '' : ' · spento'}</span></div>`));
      return `<div class="sc-day"><strong>${day}</strong>${entries.join('') || '<span class="sc-day-empty">Nessuna fascia</span>'}</div>`;
    }).join('');
    const status = error ? `<div class="status error" role="alert">${esc(messageFor(error))}</div>` : loading ? '<div class="status">Caricamento…</div>' : '';
    const info = this.localError || writeError;
    const editable = this._hass?.user?.is_admin === true && writeError?.code !== 'unauthorized';
    const view = state ? `<div class="profile-status-bar">${profile ? `<span class="sc-badge ${profile.active ? 'is-active' : ''}">${profile.active ? 'Profilo attivo' : 'Profilo inattivo'}</span><span>${esc(profile.profile_type === 'exclusive' ? 'Esclusivo' : 'Condiviso')}</span>` : 'Crea un profilo per iniziare'}<span>· ${state.quick_timers?.length ?? 0} timer attivi</span></div>
      ${groups.length ? `<nav class="tab-bar" aria-label="Gruppi">${tabs}</nav>` : ''}
      <div class="sc-toolbar"><div><h2>${esc(group?.name || 'La tua settimana')}</h2><p>${schedules.length} schedule · ${esc(this._hass.config?.time_zone || 'Fuso Home Assistant')}</p></div>${editable ? `<div class="sc-controls">${group ? button('newSchedule','＋ Schedule') : ''}${button('newTimer','Quick Timer')}</div>` : ''}</div>
      ${schedules.length ? `<section class="sc-week" aria-label="Programmazione settimanale">${slots}</section><ul class="sc-list">${schedules.map((schedule) => `<li class="sc-entry"><div class="sc-entry-copy"><strong>${esc(schedule.name)}</strong><p class="sc-meta">${esc(schedule.target_entity_ids.map((id)=>this._hass.states[id]?.attributes?.friendly_name || id).join(', '))}</p><p class="sc-meta">${schedule.enabled ? 'Abilitato' : 'Disabilitato'} · ${schedule.time_slots?.length ?? 0} fasce</p></div>${editable ? `<div class="sc-entry-actions">${button('editSchedule','Modifica',schedule.id)}${button('deleteSchedule','Elimina',schedule.id)}</div>` : ''}</li>`).join('')}</ul>` : `<div class="sc-empty"><strong>${!profile ? 'Inizia dal tuo primo profilo' : !group ? 'Aggiungi un gruppo di dispositivi' : 'La settimana è ancora libera'}</strong>${!profile ? 'Organizza la casa per abitudini, ambienti o stagioni.' : !group ? 'Riunisci i dispositivi che vuoi programmare.' : 'Crea uno schedule e scegli giorni, orari e azioni.'}</div>`}
      ${editable ? `<details class="sc-management" data-section="management" ${!profile || !group ? 'open' : ''}><summary>Gestisci profili e gruppi</summary><div class="sc-controls">${button('newProfile','＋ Profilo')}${profile ? `${button('editProfile','Modifica profilo',profile.id)}${button('toggleProfile',profile.active ? 'Disattiva profilo' : 'Attiva profilo',profile.id)}${button('deleteProfile','Elimina profilo',profile.id)}${button('newGroup','＋ Gruppo')}` : ''}${group ? `${button('editGroup','Modifica gruppo',group.id)}${button('deleteGroup','Elimina gruppo',group.id)}` : ''}</div></details>` : '<p class="sc-meta">Vista in sola lettura: serve un amministratore per modificare.</p>'}
      ${this.edit && editable ? this.editor(config, profile, group) : ''}
      <details class="sc-operational" data-section="operational"><summary>Attività · ${state.operational?.occurrences?.length ?? 0} fasce in corso · ${state.quick_timers?.length ?? 0} timer</summary>${(state.operational?.occurrences || []).map((x) => `<p>${esc(config.schedules?.find((s) => s.id === x.schedule_id)?.name || x.schedule_id)}: ${esc(x.state)}, condizione ${esc(x.condition_branch)}, termine ${esc(x.end_utc)}</p>`).join('') || '<p>Nessuna fascia attiva.</p>'}${(state.operational?.leases || []).map((x) => `<p>${esc(x.entity_id)}: ${esc(x.state)} (${esc(x.controller_type)})</p>`).join('')}${(state.quick_timers || []).map((x) => `<p>Timer ${esc(this._hass.states[x.entity_id]?.attributes?.friendly_name || x.entity_id)}: <span data-expiry="${esc(x.expires_at)}"></span> ${editable ? button('cancelTimer','Annulla timer',x.id) : ''}</p>`).join('')}</details>` : '';
    this.shadowRoot.innerHTML = `<style>${STYLE}</style><ha-card style="--pchip-color:${tint(profile?.color)}"><div class="card-header"><div class="hdr-row1"><span class="card-title">${esc(this.config.title || 'Schedule Creator')}</span><span class="sc-version">v${CARD_VERSION}</span></div><p class="sc-eyebrow">Profili</p><div class="hdr-row2" aria-label="Profili">${chips}</div></div>${status}${info ? `<p class="sc-error" role="alert">${esc(typeof info === 'string' ? info : messageFor(info))}</p>` : ''}${view}</ha-card>`;
    this.restoreDraft(); this.updateClock();
    this.shadowRoot.querySelectorAll('details').forEach((node)=>{if (hadDetails) node.open=openSections.has(node.dataset.section || node.querySelector('summary')?.textContent);});
    const nextFocus = [...this.shadowRoot.querySelectorAll('[name]')].find((x)=>x.name===focusName);
    if (nextFocus) { nextFocus.focus(); if (selection !== null && selection !== undefined && ['text','search','textarea'].includes(nextFocus.type)) nextFocus.setSelectionRange(selection,selection); }
    if (!this.clock && this.isConnected) this.clock = setInterval(() => this.updateClock(), 1000);
    this.shadowRoot.querySelectorAll('button,input,select,textarea').forEach((b) => { b.disabled = busy; });
  }
  updateClock() {
    this.shadowRoot.querySelectorAll('[data-expiry]').forEach((node) => {
      const seconds = Math.max(0, Math.ceil((new Date(node.dataset.expiry) - Date.now()) / 1000));
      node.textContent = `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m ${seconds % 60}s`;
    });
  }
  entities(selected = [], allowed = null) {
    const states = this._hass?.states || {};
    const ids = [...new Set([...targetEntities(this._hass,allowed),...selected.filter((id)=>!allowed || allowed.includes(id))])];
    return `<label>Ricerca entità<input type="search" name="entity_search" placeholder="Nome, dominio o ID"></label><div class="sc-entities">${ids.sort().map((id) => `<label data-entity-label="${esc(`${id} ${states[id]?.attributes?.friendly_name || ''}`.toLowerCase())}"><input type="checkbox" name="entities" value="${esc(id)}" ${selected.includes(id) ? 'checked' : ''}><span><span class="sc-entity-name">${esc(states[id]?.attributes?.friendly_name || id)}</span><span class="sc-entity-id">${esc(id)}${controllable(this._hass,id)?'':' · non disponibile/supportata'}</span></span></label>`).join('')}</div>`;
  }
  editor(config, profile, group) {
    const [kind, id] = this.edit;
    const item = this.editRecord;
    const d = this.draft || {};
    let content = '';
    if (kind === 'profile') content = `${field('name', 'Nome', item?.name)}${select('profile_type', 'Tipo', [['exclusive','Esclusivo'],['shared','Condiviso']], item?.profile_type || 'exclusive')}${field('icon','Icona',item?.icon)}${field('color','Colore HEX',item?.color)}${field('order','Ordine',item?.order ?? 0,'number')}`;
    if (kind === 'group') content = `${field('name','Nome',item?.name)}${field('icon','Icona',item?.icon)}${field('color','Colore HEX',item?.color)}${field('order','Ordine',item?.order ?? 0,'number')}${this.entities(d.selectedEntities || item?.entity_ids || [])}`;
    if (kind === 'schedule') {
      const owner = config.groups.find((g) => g.id === this.ownerGroup);
      const ids = d.selectedEntities || item?.target_entity_ids || targetEntities(this._hass,owner?.entity_ids || []).slice(0,1);
      this.actionDomain = ids[0]?.split('.')[0] || this.actionDomain;
      const slots = this.slotDraft || item?.time_slots || [{weekdays:[0,1,2,3,4,5,6],start:'08:00',end:'09:00'}];
      const condition = this.conditionDraft === undefined ? item?.condition : this.conditionDraft;
      content = `${field('name','Nome',item?.name)}<label class="sc-check"><input name="enabled" type="checkbox" ${item?.enabled !== false ? 'checked' : ''}>Abilitato</label>
        <p>Gruppo: ${esc(owner?.name || 'non disponibile')}. Scegli dispositivi dello stesso tipo.</p>${this.entities(ids,owner?.entity_ids || [])}
        <p>Orari: ${esc(this._hass.config?.time_zone || 'fuso Home Assistant')}. Se la fine precede l’inizio, la fascia termina il giorno successivo.</p>${slotsForm(slots)}
        ${actionForm('start','Azione iniziale',this._hass,ids,this.actionReset?null:item?.start_action,false,d)}${actionForm('end','Azione finale',this._hass,ids,this.actionReset?null:item?.end_action,true,d)}
        <details><summary>Condizioni e opzioni</summary><h4>Condizione</h4>${conditionForm(condition)}<datalist id="sc-condition-entities">${Object.keys(this._hass.states||{}).map((id)=>`<option value="${esc(id)}">${esc(this._hass.states[id].attributes?.friendly_name||id)}</option>`).join('')}</datalist>
        <p>Se falsa: azione finale se presente, altrimenti ripristino deciso dal motore. La fine fascia senza azione finale non invia comandi.</p>
        ${select('override_policy','Comandi manuali', [['cooperative','Cooperativa'],['manual_override','Priorità al comando manuale']],item?.override_policy || 'cooperative')}
        ${field('inclusion_dates','Date incluse (AAAA-MM-GG, separate da virgola)',(item?.inclusion_dates || []).join(', '))}
        ${field('exclusion_dates','Date escluse (AAAA-MM-GG, separate da virgola)',(item?.exclusion_dates || []).join(', '))}
        ${notificationForm('start_notification','Notifica iniziale',item?.start_notification,this._hass,d)}${notificationForm('end_notification','Notifica finale',item?.end_notification,this._hass,d)}</details>
        <details><summary>Pro · configurazione JSON</summary><label class="sc-check"><input type="checkbox" name="pro_config_enabled">Usa JSON per condizioni, fasce e notifiche</label>${area('pro_config','Configurazione avanzata',json({time_slots:slots,condition:condition||null,start_notification:item?.start_notification||null,end_notification:item?.end_notification||null}),8)}</details>`;
    }
    if (kind === 'timer') {
      const ids = targetEntities(this._hass);
      const selected = d.entity_id || ids[0];
      this.actionDomain = selected?.split('.')[0];
      content = `${select('entity_id','Entità',ids.map((id) => [id, `${this._hass.states[id].attributes?.friendly_name || id} · ${id}`]),selected)}${field('duration_seconds','Durata in secondi (1–604800)',300,'number')}${actionForm('timer','Azione timer',this._hass,selected?[selected]:[],null,false,d)}`;
    }
    return `<form data-editor="${esc(kind)}" class="sc-editor"><h3>${({profile:id?'Modifica profilo':'Nuovo profilo',group:id?'Modifica gruppo':'Nuovo gruppo',schedule:id?'Modifica schedule':'Nuovo schedule',timer:'Quick Timer'})[kind]}</h3>${content}<div class="sc-actions"><button type="submit">Salva</button>${button('close','Annulla')}</div></form>`;
  }
  async click(event) {
    const buttonEl = event.target.closest('button'); if (!buttonEl || this.adapter.busy) return;
    if (buttonEl.dataset.profile) { this.selectedProfile = buttonEl.dataset.profile; this.selectedGroup = null; this.edit = null; this.draft = null; this.render(); return; }
    if (buttonEl.dataset.group) { this.selectedGroup = buttonEl.dataset.group; this.edit = null; this.draft = null; this.render(); return; }
    const command = buttonEl.dataset.command, id = buttonEl.dataset.id;
    if (!command) return;
    if (['addSlot','removeSlot','addCondition','addConditionChild','removeCondition'].includes(command)) {
      this.capture();
      if (command === 'addSlot') this.slotDraft.push({weekdays:[0,1,2,3,4,5,6],start:'08:00',end:'09:00'});
      if (command === 'removeSlot' && this.slotDraft.length>1) this.slotDraft.splice(Number(id),1);
      if (command === 'addCondition') this.conditionDraft = blankCondition();
      if (command === 'removeCondition' && id==='condition') this.conditionDraft = null;
      else if (command === 'addConditionChild' || command === 'removeCondition') {
        const path = id.split('.').slice(1).map(Number);
        let node = this.conditionDraft;
        const index = command==='removeCondition' ? path.pop() : null;
        for (const i of path) node = node.children[i];
        if (command === 'addConditionChild') node.children.push(blankCondition());
        else if (node.children.length>2) node.children.splice(index,1);
        else this.localError = 'Un gruppo E/O richiede almeno due regole. Rimuovi l’intero gruppo per eliminarle.';
      }
      this.render(); return;
    }
    if (command === 'close') { this.edit = null; this.draft = null; this.localError = null; this.render(); return; }
    if (/^(new|edit)/.test(command)) {
      const kind = command.replace(/^(new|edit)/,'').toLowerCase();
      const config = this.adapter.state.config;
      const profile = config.profiles.find((p)=>p.id===this.selectedProfile)||config.profiles[0];
      const group = config.groups.find((g)=>g.id===this.selectedGroup)||config.groups.find((g)=>g.profile_id===profile?.id);
      this.edit = [kind,id||null];
      this.editRecord = id ? structuredClone(config[`${kind}s`].find((x)=>x.id===id)) : null;
      this.ownerGroup = this.editRecord?.group_id || group?.id;
      this.ownerProfile = this.editRecord?.profile_id || profile?.id;
      this.editRevision = this.adapter.state.revision;
      this.changedFields = new Set();
      this.slotDraft = null; this.conditionDraft = undefined; this.actionReset = false; this.actionDomain = null;
      this.draft = null; this.localError = null; this.render();
      this.shadowRoot.querySelector('form[data-editor]')?.scrollIntoView?.({block:'start'});
      return;
    }
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
        const owner = config.groups.find((g)=>g.id===this.ownerGroup);
        const domain = this.draft.selectedEntities[0]?.split('.')[0];
        if (!domain || !this.draft.selectedEntities.every((x)=>x.startsWith(`${domain}.`) && owner?.entity_ids.includes(x))) throw new Error('Scegli entità dello stesso tipo appartenenti al gruppo.');
        const slots = readSlots(form);
        if (!slots.length || slots.some((s)=>!s.weekdays.length || !s.start || !s.end || s.start===s.end)) throw new Error('Ogni fascia richiede almeno un giorno e orari diversi.');
        const dates = (str)=>[...new Set(str.split(',').map((x)=>x.trim()).filter(Boolean))].sort();
        payload = {name:data.name.trim(),enabled:form.elements.enabled.checked,target_entity_ids:this.draft.selectedEntities,
          time_slots:slots,start_action:readAction(form,'start',domain),end_action:readAction(form,'end',domain),
          condition:readCondition(form),override_policy:data.override_policy,inclusion_dates:dates(data.inclusion_dates),exclusion_dates:dates(data.exclusion_dates),
          start_notification:readNotification(form,'start_notification'),end_notification:readNotification(form,'end_notification')};
        if (form.elements.pro_config_enabled.checked) {
          const pro = parseJson(data.pro_config,'Configurazione Pro');
          if (!pro || Array.isArray(pro) || typeof pro!=='object' || Object.keys(pro).some((k)=>!['time_slots','condition','start_notification','end_notification'].includes(k))) throw new Error('Campi Pro non validi.');
          Object.assign(payload,clean(pro));
        }
        for (const key of ['start_notification','end_notification']) if (payload[key] && !payload[key].message.trim()) throw new Error('Inserisci il messaggio della notifica oppure disabilitala.');
        const validateCondition = (node) => {if (!node) return;if (['and','or'].includes(node.operator)) {if(node.children.length<2) throw new Error('Servono due regole per E/O.');node.children.forEach(validateCondition);} else if (!node.entity_id || !this._hass.states[node.entity_id]) throw new Error('Seleziona un’entità valida nella condizione.');};
        validateCondition(payload.condition);
      }
      if (kind === 'timer') { const domain = data.entity_id.split('.')[0]; payload = {entity_id:data.entity_id,duration_seconds:Number(data.duration_seconds),action:readAction(form,'timer',domain)}; if (payload.duration_seconds<1 || payload.duration_seconds>604800) throw new Error('La durata deve essere tra 1 e 604800 secondi.'); }
      if (!payload) throw new Error('Editor non disponibile.');
      if (this.adapter.conflicted && !confirm('I dati sono cambiati su un altro client. Hai confrontato la bozza con i nuovi dati prima di salvare?')) return;
      if (id) {
        if (kind === 'schedule' && !this.actionReset) {
          for (const prefix of ['start','end']) {
            if (![...this.changedFields].some((name)=>name.startsWith(`${prefix}_`) && !name.startsWith(`${prefix}_notification`))) delete payload[`${prefix}_action`];
          }
        }
        for (const key of Object.keys(payload)) if (JSON.stringify(payload[key]) === JSON.stringify(clean(this.editRecord[key]))) delete payload[key];
        if (!Object.keys(payload).length) { this.edit=null; this.draft=null; this.render(); return; }
        payload[`${kind}_id`] = id;
      }
      if (!id && kind === 'group') payload.profile_id = this.ownerProfile;
      if (!id && kind === 'schedule') { payload.profile_id = this.ownerProfile; payload.group_id = this.ownerGroup; }
      const type = kind === 'timer' ? 'quick_timer/create' : `${kind}/${id ? 'update' : 'create'}`;
      const ok = await this.adapter.mutate(type,payload,{ runtime: kind === 'timer', expectedRevision: kind === 'timer' || this.adapter.conflicted ? undefined : this.editRevision });
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
