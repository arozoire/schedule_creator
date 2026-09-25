import { ScheduleCreatorStateAdapter } from './state-adapter.js';
import { weeklySegments } from './timeline.js';
import { clean, messageFor, parseJson, diagnosticFor } from './editor.js';
import { controllable, targetEntities, notificationForm, readNotification } from './forms.js';
import { blankCondition, conditionForm, readCondition, slotsForm, readSlots, magnetSnap, toMinutes, toTime, DAY_SHORTCUTS, iconPicker, colorPicker } from './schedule-editor.js';
import { actionForm, readAction, describeAction, describeState, pretty } from './action-editor.js';
import { isWscBackup, convertWscBackup, wscImportPayload } from './wsc-import.js';

const STYLE = '__SC_CSS__';
const CARD_VERSION = '0.3.12';
const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[char]);
const tint = (value) => /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(value || '') ? value : '#03a9f4';
const field = (name, title, value = '', type = 'text') => `<label>${title}<input name="${name}" type="${type}" value="${esc(value)}"></label>`;
const area = (name, title, value, rows = 4) => `<label>${title}<textarea name="${name}" rows="${rows}">${esc(value)}</textarea></label>`;
const select = (name, title, options, current) => `<label>${title}<select name="${name}">${options.map(([value, label]) => `<option value="${esc(value)}" ${value === current ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label>`;
const button = (name, label, id = '') => `<button type="button" data-command="${name}" data-id="${esc(id)}">${esc(label)}</button>`;
const json = (value) => JSON.stringify(clean(value), null, 2);
// Wall clock in the Home Assistant time zone: weekday 0 = Monday.
export function haNow(timeZone, date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone: timeZone || undefined, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(date).map((p) => [p.type, p.value]));
  return {weekday: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(parts.weekday), minutes: Number(parts.hour) * 60 + Number(parts.minute), label: `${parts.hour}:${parts.minute}`};
}
// Climate blocks: blue (cool) to orange (warm), like weekly-schedule-card.
export function temperatureColor(value) {
  const t = Math.min(1, Math.max(0, (Number(value) - 17) / 12));
  const stops = [[74, 144, 217], [150, 196, 232], [240, 138, 75]];
  const [a, b, f] = t < 0.5 ? [stops[0], stops[1], t * 2] : [stops[1], stops[2], (t - 0.5) * 2];
  return `rgb(${a.map((c, i) => Math.round(c + (b[i] - c) * f)).join(',')})`;
}
const FULL_DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.name).localeCompare(String(b.name));
const daysLabel = (days) => {
  const d = [...days].sort((a, b) => a - b), key = d.join('');
  if (key === '0123456') return 'Tutti i giorni';
  if (key === '01234') return 'Lun–Ven';
  if (key === '56') return 'Weekend';
  return d.length > 2 && d.every((v, i) => !i || v === d[i - 1] + 1) ? `${DAYS[d[0]]}–${DAYS[d.at(-1)]}` : d.map((i) => DAYS[i]).join(', ');
};
const newer = (a, b) => {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i += 1) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  return false;
};
// Backend and card versions come from the same manifest at build time.
export function versionAdvice(backend) {
  if (backend === CARD_VERSION) return '';
  if (!backend || newer(CARD_VERSION, backend)) return `La card v${CARD_VERSION} è aggiornata, ma Home Assistant esegue ancora l’integrazione ${backend ? `v${backend}` : 'precedente'}. Riavvia Home Assistant (Impostazioni → Sistema → Riavvia) per attivare il nuovo backend.`;
  return `L’integrazione v${backend} è attiva, ma questa pagina usa ancora la card v${CARD_VERSION}. Ricarica la pagina; nell’app mobile usa “Ricarica” o svuota la cache del frontend.`;
}
class ScheduleCreatorCard extends HTMLElement {
  constructor() {
    super(); this.attachShadow({ mode: 'open' });
    this.adapter = new ScheduleCreatorStateAdapter(() => this.render());
    this.selectedProfile = null; this.selectedGroup = null;
    this.edit = null; this.draft = null; this.localError = null;
    this.localErrorDetails = null;
    this.shadowRoot.innerHTML = `<style>${STYLE}</style><ha-card></ha-card><dialog class="sc-dialog" aria-labelledby="sc-editor-title"></dialog>`;
    this.dialog = this.shadowRoot.querySelector('dialog');
    this.dialog.addEventListener('cancel', event=>{event.preventDefault(); if(!this.adapter.busy) this.closeEditor();});
    this.shadowRoot.addEventListener('click', (e) => this.click(e));
    this.shadowRoot.addEventListener('pointerdown', (e) => this.startDrag(e));
    this.shadowRoot.addEventListener('submit', (e) => this.submit(e));
    this.shadowRoot.addEventListener('keydown', (e) => {
      if (e.target.name === 'entity_search' && e.key === 'Enter') e.preventDefault();
    });
    this.shadowRoot.addEventListener('input', (e) => {
      if (!e.target.closest('form')) return;
      this.syncRange(e.target);
      if (e.target.dataset.colorCustom !== undefined) {
        const radio = e.target.parentElement.querySelector('input[type="radio"]');
        radio.value = e.target.value; radio.checked = true;
        e.target.parentElement.style.setProperty('--swatch', e.target.value);
      }
      const slotTime = /^slot_(\d+)_(start|end)$/.exec(e.target.getAttribute('name') || '');
      if (slotTime) {
        const form = e.target.form;
        this.syncTimebar(slotTime[1], toMinutes(form.elements[`slot_${slotTime[1]}_start`].value), toMinutes(form.elements[`slot_${slotTime[1]}_end`].value));
      }
      const name = e.target.getAttribute('name') || e.target.dataset.mirror;
      this.changedFields?.add(name);
      this.capture();
      if (name && name !== 'name' && !/_notification_(title|message)$/.test(name)) this.updateSuggestions();
      // Choosing a condition entity reveals the comparisons that fit it.
      if (/^condition(\.\d+)*_entity_id$/.test(name || '') && this._hass.states[e.target.value]) this.render();
      if (e.target.name === 'entity_search') {
        const query = e.target.value.toLowerCase();
        e.target.form.querySelectorAll('[data-entity-label]').forEach((node) => {
          const matches = node.dataset.entityLabel.includes(query);
          node.hidden = !matches;
          node.style.setProperty('display', matches ? '' : 'none', matches ? '' : 'important');
        });
      }
    });
    this.shadowRoot.addEventListener('change', (e) => {
      if (!e.target.closest('form')) return;
      if (e.target.dataset.role === 'backup-file') { this.readBackupFile(e.target); return; }
      if (e.target.dataset.mirror || e.target.type === 'range') return;
      this.changedFields?.add(e.target.getAttribute('name'));
      const previousDomain = this.actionDomain;
      if (e.target.name === 'entities' && this.edit?.[0] === 'schedule' && e.target.checked) {
        const others = [...this.shadowRoot.querySelectorAll('[name="entities"]:checked')].filter((x)=>x!==e.target);
        if (others.some((x)=>x.value.split('.')[0] !== e.target.value.split('.')[0])) {
          e.target.checked = false;
          this.localError = 'Uno schedule controlla entità dello stesso tipo. Crea uno schedule separato per gli altri dispositivi.';
        }
      }
      this.capture();
      // A text/time field emits change on blur, just before a click on Save.
      // Replacing the form here removes the clicked button before submission.
      // Only selectors and checkboxes can change which controls are displayed.
      if (!e.target.matches('select,input[type="checkbox"],input[type="radio"]')) return;
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
  connectedCallback() {
    if (this._hass) this.adapter.connect(this._hass);
    // Serpentine/ring cards ask the main card to open a schedule (see week-cards.js).
    this.onExternalEdit ??= (event) => {
      const id = event.detail?.schedule_id;
      if (event.defaultPrevented || !this.adapter.state?.config?.schedules?.some((s) => s.id === id)) return;
      event.preventDefault(); this.openEditor('editSchedule', id); this.scrollIntoView?.({block: 'start', behavior: 'smooth'});
    };
    if (!this.listening) { window.addEventListener('schedule-creator-edit', this.onExternalEdit); window.__scheduleCreatorEditors = (window.__scheduleCreatorEditors || 0) + 1; this.listening = true; }
    this.render();
  }
  disconnectedCallback() {
    this.adapter.disconnect(); clearInterval(this.clock); this.clock = null;
    if (this.listening) { window.removeEventListener('schedule-creator-edit', this.onExternalEdit); window.__scheduleCreatorEditors -= 1; this.listening = false; }
  }
  // A week card on another view navigates here with ?sc_edit=<schedule id>.
  openRequestedSchedule() {
    const params = new URLSearchParams(window.location?.search || '');
    const id = params.get('sc_edit');
    this.checkedRequest = true;
    if (!id) return false;
    params.delete('sc_edit');
    history.replaceState(history.state, '', `${window.location.pathname}${params.size ? `?${params}` : ''}${window.location.hash}`);
    if (!this.adapter.state.config.schedules.some((s) => s.id === id)) return false;
    this.openEditor('editSchedule', id);
    return true;
  }
  closeEditor() {
    this.edit=null; this.draft=null; this.localError=null; this.localErrorDetails=null;
    this.render();
    const opener=[...this.shadowRoot.querySelectorAll('button')].find(node=>node.dataset.command===this.editorOpener?.command && node.dataset.id===this.editorOpener?.id);
    (opener || this.shadowRoot.querySelector('[data-command="newSchedule"]'))?.focus({preventScroll:true});
  }
  capture() {
    const form = this.shadowRoot.querySelector('form[data-editor]');
    if (!form) return;
    this.draft = Object.fromEntries([...new FormData(form)].filter(([, value]) => typeof value === 'string'));
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
    // The form.elements collection may include HA controls whose name getter
    // throws; the editor only creates native input/select/textarea fields.
    for (const node of form.querySelectorAll('input[name],select[name],textarea[name]')) {
      const name = node.getAttribute('name');
      if (name === 'entities' || name.startsWith('slot_') || name.startsWith('condition') || node.type === 'file') continue;
      if (this.draft[name] === undefined) continue;
      if (node.type === 'checkbox') node.checked = this.draft[name] === 'on';
      else if (node.type === 'radio') node.checked = this.draft[name] === node.value;
      else { node.value = this.draft[name]; this.syncRange(node); }
    }
    form.querySelectorAll('.sc-choice').forEach((node) => node.classList.toggle('is-selected', !!node.querySelector('input:checked')));
    form.querySelectorAll('[name="entities"]').forEach((x) => { x.checked = this.draft.selectedEntities.includes(x.value); });
    const query = form.querySelector('input[name="entity_search"]')?.value?.toLowerCase() || '';
    form.querySelectorAll('[data-entity-label]').forEach((node) => {
      const matches = node.dataset.entityLabel.includes(query);
      node.hidden = !matches;
      node.style.setProperty('display', matches ? '' : 'none', matches ? '' : 'important');
    });
  }
  render() {
    if (!this.config) return;
    if (!this.checkedRequest && this.adapter.state && this.openRequestedSchedule()) return;
    const focused = this.shadowRoot.activeElement;
    const hadDetails = this.shadowRoot.querySelector('details');
    const openSections = new Set([...this.shadowRoot.querySelectorAll('details[open]')].map((node)=>node.dataset.section || node.querySelector('summary')?.textContent));
    const focusName = focused?.getAttribute('name');
    const focusCommand = focused?.dataset.command;
    const focusId = focused?.dataset.id;
    const selection = focused?.matches('input,textarea') ? focused.selectionStart : null;
    const focusValue = focused?.type === 'checkbox' ? focused.value : null;
    const scrollPositions = [...this.shadowRoot.querySelectorAll('[data-scroll],.sc-entities,dialog')].map(node=>[node.dataset.scroll || node.className,node.scrollTop,node.scrollLeft]);
    const ancestors=[];
    for(let node=this;node;node=node.parentElement || node.getRootNode()?.host) ancestors.push([node,node.scrollTop,node.scrollLeft]);
    const pageX=window.scrollX, pageY=window.scrollY;
    const { state, error, loading, busy, writeError } = this.adapter;
    const config = state?.config || {};
    const profiles = [...(config.profiles || [])].sort(byOrder);
    const profile = profiles.find((p) => p.id === this.selectedProfile) || profiles[0];
    const groups = (config.groups || []).filter((g) => g.profile_id === profile?.id).sort(byOrder);
    const group = groups.find((g) => g.id === this.selectedGroup) || groups[0];
    const schedules = (config.schedules || []).filter((s) => s.profile_id === profile?.id && (!group || s.group_id === group.id));
    const chips = profiles.map((p) => `<button type="button" class="profile-chip ${p.id === profile?.id ? 'viewed' : ''} ${p.active ? 'active-op' : ''}" style="--pchip-color:${tint(p.color)}" aria-pressed="${p.id === profile?.id}" data-profile="${esc(p.id)}">${p.icon ? `<ha-icon icon="${esc(p.icon)}" aria-hidden="true"></ha-icon>` : ''}${esc(p.name)}</button>`).join('');
    const tabs = groups.map((g) => `<button type="button" class="tab ${g.id === group?.id ? 'active' : ''}" aria-pressed="${g.id === group?.id}" data-group="${esc(g.id)}" style="--tab-color:${tint(g.color)}">${g.icon ? `<ha-icon icon="${esc(g.icon)}" aria-hidden="true"></ha-icon>` : ''}${esc(g.name)}</button>`).join('');
    const segments=weeklySegments(schedules);
    const palette=['#087f8c','#7057b5','#b65c21','#317a45','#b34269','#326ab2'];
    const colorFor=schedule=>{
      const data=schedule.start_action?.data||{};
      return schedule.start_action?.domain==='climate' && data.temperature!=null && data.state!=='off' ? temperatureColor(data.temperature) : palette[schedules.indexOf(schedule)%palette.length];
    };
    const now=haNow(this._hass?.config?.time_zone);
    this.clockMinute=now.minutes;
    const occurrences=state?.operational?.occurrences||[];
    const runningState=(scheduleId)=>{
      const item=occurrences.find((x)=>x.schedule_id===scheduleId);
      if(!item) return '';
      return item.condition_branch==='false' || item.state==='suspended' ? 'is-paused' : 'is-running';
    };
    const time=minute=>`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
    const slots = `<div class="sc-timeline-head"><span>Ora</span>${DAYS.map((day,index)=>`<strong class="${index===now.weekday?'is-today':''}">${day}${index===now.weekday?'<span class="sc-today-tag"> · oggi</span>':''}</strong>`).join('')}</div><div class="sc-timeline-grid"><div class="sc-time-axis">${Array.from({length:13},(_,i)=>`<span style="top:${i/12*100}%">${time(i*120)}</span>`).join('')}</div>${DAYS.map((day,index)=>`<div class="sc-day-track ${index===now.weekday?'is-today':''}" data-day="${index}" aria-label="${day}" title="${this._hass?.user?.is_admin===true && group ? 'Clicca uno spazio libero per aggiungere uno schedule' : ''}">${segments[index].map(({schedule,start,end,lane,lanes})=>{
      const label=`${schedule.name} · ${day} ${time(start)}–${time(end)}${schedule.enabled?'':' · Disabilitato'}`;
      const live=index===now.weekday && start<=now.minutes && now.minutes<end ? runningState(schedule.id) : '';
      return `<button type="button" class="sc-time-block ${schedule.enabled?'':'is-off'} ${live}" data-command="editSchedule" data-id="${esc(schedule.id)}" aria-label="${esc(label)}" title="${esc(label)}" style="top:${start/1440*100}%;height:${(end-start)/1440*100}%;left:${lane/lanes*100}%;width:${100/lanes}%;--block-color:${colorFor(schedule)}"><span>${esc(schedule.name)}</span><small>${time(start)}–${time(end)}</small></button>`;
    }).join('')}${index===now.weekday?`<span class="sc-now-line" style="top:${now.minutes/1440*100}%" aria-label="Ora ${now.label}"></span>`:''}</div>`).join('')}</div>`;
    const legend = `<div class="sc-legend" aria-hidden="true"><span><i class="sc-legend-temp"></i>Clima: freddo → caldo</span><span><i class="sc-legend-running"></i>In corso</span><span><i class="sc-legend-paused"></i>In pausa</span><span><i class="sc-legend-now"></i>Ora</span></div>`;
    const advice = state ? versionAdvice(state.integration_version) : '';
    const status = `${error ? `<div class="status error" role="alert">${esc(messageFor(error))}</div>` : loading ? '<div class="status">Caricamento…</div>' : ''}${advice ? `<div class="status sc-warning" role="status">${esc(advice)}</div>` : ''}${this.notice && !this.edit ? `<div class="status sc-notice" role="status">${esc(this.notice)}</div>` : ''}`;
    const info = this.localError || writeError;
    const errorDetails = this.localError ? this.localErrorDetails : writeError ? diagnosticFor(writeError, {cardVersion:CARD_VERSION,haVersion:this._hass.config?.version}) : null;
    const editable = this._hass?.user?.is_admin === true && writeError?.code !== 'unauthorized';
    const view = state ? `<div class="profile-status-bar">${profile ? `<span class="sc-badge ${profile.active ? 'is-active' : ''}">${profile.active ? 'Profilo attivo' : 'Profilo inattivo'}</span><span>${esc(profile.profile_type === 'exclusive' ? 'Esclusivo' : 'Condiviso')}</span>` : 'Crea un profilo per iniziare'}<span>· ${state.quick_timers?.length ?? 0} timer attivi</span></div>
      ${this.nowTiles(config, occurrences, state.quick_timers || [])}
      <div class="sc-toolbar"><h2>Settimana${group ? ` · ${esc(group.name)}` : ''}</h2>${groups.length ? `<nav class="tab-bar" aria-label="Gruppi">${tabs}</nav>` : ''}</div>
      ${schedules.length ? `<section class="sc-timeline" data-scroll="timeline" aria-label="Programmazione settimanale">${slots}</section>${legend}<details data-section="schedules" class="sc-schedules"><summary>Gestisci schedule (${schedules.length})</summary><ul class="sc-list">${schedules.map((schedule) => `<li class="sc-entry" style="--block-color:${colorFor(schedule)}"><div class="sc-entry-copy"><strong>${esc(schedule.name)}</strong><span class="sc-meta">${esc(schedule.target_entity_ids.map((id)=>this._hass.states[id]?.attributes?.friendly_name || id).join(', '))} · ${schedule.enabled ? '' : 'disabilitato · '}${schedule.time_slots?.length ?? 0} ${schedule.time_slots?.length === 1 ? 'fascia' : 'fasce'}</span></div>${editable ? `<div class="sc-entry-actions">${button('editSchedule','Modifica',schedule.id)}${button('deleteSchedule','Elimina',schedule.id)}</div>` : ''}</li>`).join('')}</ul></details>` : `<${editable ? `button type="button" data-command="${!profile ? 'newProfile' : !group ? 'newGroup' : 'newSchedule'}"` : 'div'} class="sc-empty"><strong>${!profile ? 'Inizia dal tuo primo profilo' : !group ? 'Aggiungi un gruppo di dispositivi' : 'La settimana è ancora libera'}</strong>${!profile ? 'Organizza la casa per abitudini, ambienti o stagioni.' : !group ? 'Riunisci i dispositivi che vuoi programmare.' : 'Tocca qui o su un orario del calendario per creare uno schedule.'}</${editable ? 'button' : 'div'}>`}
      ${editable ? `<details class="sc-management" data-section="management" ${!profile || !group ? 'open' : ''}><summary>Gestisci profili e gruppi</summary><div class="sc-controls">${button('newProfile','＋ Profilo')}${profile ? `${button('editProfile','Modifica profilo',profile.id)}${button('toggleProfile',profile.active ? 'Disattiva profilo' : 'Attiva profilo',profile.id)}${button('deleteProfile','Elimina profilo',profile.id)}${button('newGroup','＋ Gruppo')}` : ''}${group ? `${button('editGroup','Modifica gruppo',group.id)}${button('deleteGroup','Elimina gruppo',group.id)}` : ''}</div></details>` : '<p class="sc-meta">Vista in sola lettura: serve un amministratore per modificare.</p>'}
      ${profiles.length ? this.overview(config, profiles) : ''}
      ${editable ? `<details class="sc-maintenance" data-section="maintenance"><summary>Manutenzione · backup, import e RESET</summary><p class="sc-meta">Il backup salva profili, gruppi e schedule in un file JSON. Il ripristino li sostituisce e lascia i profili disattivati. L’import dalla weekly-schedule-card li aggiunge in un nuovo profilo disattivato. RESET cancella tutti i dati di Schedule Creator.</p><div class="sc-controls">${button('exportBackup','Salva backup')}${button('newRestore','Ripristina backup')}${button('newImport','Importa da Weekly Schedule Card')}${button('newReset','RESET…')}</div></details>` : ''}
      <details class="sc-operational" data-section="operational"><summary>Attività · ${state.operational?.occurrences?.length ?? 0} fasce in corso · ${state.quick_timers?.length ?? 0} timer</summary>${(state.operational?.occurrences || []).map((x) => `<p>${esc(config.schedules?.find((s) => s.id === x.schedule_id)?.name || x.schedule_id)}: ${esc(x.state)}, condizione ${esc(x.condition_branch)}, termine ${esc(x.end_utc)}</p>`).join('') || '<p>Nessuna fascia attiva.</p>'}${(state.operational?.leases || []).map((x) => `<p>${esc(x.entity_id)}: ${esc(x.state)} (${esc(x.controller_type)})</p>`).join('')}${(state.quick_timers || []).map((x) => `<p>Timer ${esc(this._hass.states[x.entity_id]?.attributes?.friendly_name || x.entity_id)}: <span data-expiry="${esc(x.expires_at)}"></span> ${editable ? button('cancelTimer','Annulla timer',x.id) : ''}</p>`).join('')}</details>` : '';
    const errorMarkup = `${info ? `<p class="sc-error" role="alert">${esc(typeof info === 'string' ? info : messageFor(info))}</p>` : ''}${errorDetails ? `<details class="sc-error-details" data-section="error-details"><summary>Dettagli errore</summary><p>Seleziona e copia questo testo per segnalare il problema.</p><textarea readonly aria-label="Dettagli errore da copiare" rows="10">${esc(errorDetails)}</textarea></details>` : ''}`;
    const surface=this.shadowRoot.querySelector('ha-card');
    surface.style.setProperty('--pchip-color',tint(profile?.color));
    const running = occurrences.length;
    const header = `<div class="sc-head"><span class="sc-logo" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="3"></rect><path d="M8 2v4M16 2v4M3 10h18M8 15h3"></path></svg></span><div class="sc-head-copy"><span class="card-title">${esc(this.config.title || 'Schedule Creator')}</span><span class="sc-sub">${now.weekday >= 0 ? FULL_DAYS[now.weekday] : ''} · ${now.label}${state ? ` · ${running ? `${running} ${running === 1 ? 'fascia' : 'fasce'} in corso` : 'nessuna fascia in corso'}` : ''}</span></div><span class="sc-version">v${CARD_VERSION}</span>${state && editable ? `<div class="sc-head-actions">${button('newTimer','Quick Timer')}${group ? button('newSchedule','＋ Schedule') : ''}</div>` : ''}</div>`;
    surface.innerHTML = `<div class="card-header">${header}${profiles.length ? `<div class="sc-segmented" role="group" aria-label="Profili">${chips}</div>` : ''}</div>${status}${this.edit ? '' : errorMarkup}${view}`;
    if(this.edit && editable) {
      const wasOpen=this.dialog.open;
      this.dialog.innerHTML = `<div class="sc-dialog-heading"><span class="sc-dialog-brand">Schedule Creator</span><button type="button" data-command="close" aria-label="Chiudi editor">✕</button></div>${errorMarkup}${this.notice ? `<div class="status sc-notice" role="status">${esc(this.notice)}</div>` : ''}${this.editor(config,profile,group)}`;
      if(!wasOpen) {
        if(this.dialog.showModal) this.dialog.showModal(); else this.dialog.setAttribute('open','');
        this.dialog.querySelector('input[name="name"],select[name="entity_id"]')?.focus({preventScroll:true});
      }
    } else {
      if(this.dialog.open) { if(this.dialog.close) this.dialog.close(); else this.dialog.removeAttribute('open'); }
      this.dialog.innerHTML='';
    }
    this.restoreDraft(); this.updateClock();
    if (this.edit?.[0] === 'schedule') this.updateSuggestions();
    this.shadowRoot.querySelectorAll('details').forEach((node)=>{if (hadDetails) node.open=openSections.has(node.dataset.section || node.querySelector('summary')?.textContent);});
    const nextFocus = focusName ? [...this.shadowRoot.querySelectorAll('[name]')].find((x)=>x.getAttribute('name')===focusName && (focusValue===null || x.value===focusValue)) : focusCommand ? [...this.dialog.querySelectorAll('[data-command]')].find(x=>x.dataset.command===focusCommand && x.dataset.id===focusId) : null;
    if (nextFocus) { nextFocus.focus({preventScroll:true}); if (selection !== null && selection !== undefined && ['text','search','textarea'].includes(nextFocus.type)) nextFocus.setSelectionRange(selection,selection); }
    for(const [key,top,left] of scrollPositions) {
      const node=[...this.shadowRoot.querySelectorAll('[data-scroll],.sc-entities,dialog')].find(node=>(node.dataset.scroll || node.className)===key);
      if(node) {node.scrollTop=top;node.scrollLeft=left;}
    }
    for(const [node,top,left] of ancestors) {node.scrollTop=top;node.scrollLeft=left;}
    if(window.scrollX!==pageX || window.scrollY!==pageY) window.scrollTo(pageX,pageY);
    if (!this.clock && this.isConnected) this.clock = setInterval(() => this.updateClock(), 1000);
    this.shadowRoot.querySelectorAll('button,input,select,textarea').forEach((b) => { b.disabled = busy; });
  }
  overview(config, profiles) {
    const friendly = (id) => this._hass.states[id]?.attributes?.friendly_name || id;
    const owners = new Map();
    for (const schedule of config.schedules || []) for (const id of schedule.target_entity_ids) {
      if (!owners.has(id)) owners.set(id, new Set());
      owners.get(id).add(schedule.profile_id);
    }
    const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));
    const shared = [...owners].filter(([, ids]) => ids.size > 1).map(([id, ids]) => {
      const list = [...ids].map((pid) => byId[pid]).filter(Boolean);
      // Two exclusive profiles are never active together; any other pair can be.
      const together = list.some((a, i) => list.slice(i + 1).some((b) => a.profile_type !== 'exclusive' || b.profile_type !== 'exclusive'));
      const now = list.filter((p) => p.active).length > 1;
      return `<li><strong>${esc(friendly(id))}</strong> · ${list.map((p) => esc(p.name)).join(', ')}<span class="sc-meta">${now ? 'Più profili attivi ora: vince la fascia iniziata per ultima.' : together ? 'Possono essere attivi insieme: se le fasce si sovrappongono vince quella iniziata per ultima.' : 'Profili esclusivi: mai attivi insieme, nessun conflitto.'}</span></li>`;
    });
    const rows = profiles.map((p) => {
      const groups = (config.groups || []).filter((g) => g.profile_id === p.id).length;
      const schedules = (config.schedules || []).filter((x) => x.profile_id === p.id);
      const entities = new Set(schedules.flatMap((x) => x.target_entity_ids)).size;
      return `<li class="sc-overview-row" style="--pchip-color:${tint(p.color)}"><span class="sc-dot"></span><strong>${esc(p.name)}</strong><span class="sc-badge ${p.active ? 'is-active' : ''}">${p.active ? 'Attivo' : 'Inattivo'}</span><span class="sc-meta">${p.profile_type === 'exclusive' ? 'Esclusivo' : 'Condiviso'} · ${groups} gruppi · ${schedules.length} schedule · ${entities} entità</span></li>`;
    }).join('');
    return `<details class="sc-overview" data-section="overview"><summary>Panoramica profili e interazioni</summary><ul class="sc-overview-list">${rows}</ul><p class="sc-meta"><strong>Esclusivo</strong>: attivandolo si disattivano gli altri profili esclusivi. <strong>Condiviso</strong>: resta attivo insieme agli altri. Solo i profili attivi eseguono i loro schedule. Se due fasce comandano la stessa entità vince quella iniziata per ultima; a parità un Quick Timer prevale su uno schedule con condizione, che prevale su uno normale. L’ordine serve solo a disporre profili e gruppi.</p><h4>Entità comandate da più profili</h4>${shared.length ? `<ul class="sc-overview-list">${shared.join('')}</ul>` : '<p class="sc-meta">Nessuna: ogni entità è programmata da un solo profilo.</p>'}</details>`;
  }
  canAddSchedule() {
    const config = this.adapter.state?.config;
    if (!config || this._hass?.user?.is_admin !== true) return false;
    const profile = config.profiles.find((p) => p.id === this.selectedProfile) || [...config.profiles].sort(byOrder)[0];
    return config.groups.some((g) => g.profile_id === profile?.id);
  }
  nowTiles(config, occurrences, timers) {
    const friendly = (id) => this._hass.states[id]?.attributes?.friendly_name || id;
    const zone = this._hass?.config?.time_zone || undefined;
    const clock = (iso) => new Intl.DateTimeFormat('it-IT', {timeZone: zone, hour: '2-digit', minute: '2-digit'}).format(new Date(iso));
    const tiles = occurrences.map((item) => {
      const schedule = (config.schedules || []).find((s) => s.id === item.schedule_id);
      if (!schedule) return '';
      const paused = item.condition_branch === 'false', waiting = item.state === 'suspended';
      const kind = paused || waiting ? 'is-paused' : 'is-running';
      const label = paused ? 'In pausa' : waiting ? 'In attesa' : 'Adesso';
      const detail = paused ? 'La condizione non è soddisfatta' : waiting ? 'Un altro schedule o timer ha la priorità' : `Fino alle ${clock(item.end_utc)}${schedule.condition ? ' · condizione vera' : ''}`;
      return `<button type="button" class="sc-now-tile ${kind}" data-command="editSchedule" data-id="${esc(schedule.id)}"><span class="sc-now-label">${label} · ${esc(schedule.target_entity_ids.map(friendly).join(', '))}</span><strong>${esc(describeAction(schedule.start_action) || schedule.name)}</strong><span class="sc-now-detail">${esc(detail)}</span></button>`;
    });
    const timerTiles = timers.map((timer) => `<div class="sc-now-tile is-timer"><span class="sc-now-label">Timer · ${esc(friendly(timer.entity_id))}</span><strong>${esc(describeAction(timer.action))}</strong><span class="sc-now-detail">Resta <span data-expiry="${esc(timer.expires_at)}"></span>${timer.previous ? ` · poi ${esc(describeState(timer.previous, timer.entity_id.split('.')[0]))}` : ''}</span></div>`);
    const all = [...tiles, ...timerTiles].filter(Boolean);
    return all.length ? `<div class="sc-now">${all.join('')}</div>` : '<p class="sc-now-empty">Nessuna fascia in corso adesso.</p>';
  }
  otherSlots(config, ids, ownId) {
    const palette = ['#087f8c','#7057b5','#b65c21','#317a45','#b34269','#326ab2'];
    return (config.schedules || []).filter((s) => s.id !== ownId && s.target_entity_ids.some((x) => ids.includes(x)))
      .flatMap((s) => (s.time_slots || []).map((slot) => ({...slot, name: s.name, color: palette[config.schedules.indexOf(s) % palette.length]})));
  }
  statusEnabled(config, scheduleId) {
    return !!scheduleId && (config.settings?.status_notification_schedule_ids || []).includes(scheduleId);
  }
  notificationExtras(config, item) {
    const url = config.settings?.notification_url;
    const here = window.location?.pathname?.startsWith('/') ? window.location.pathname : '';
    const status = this.draft?.status_notification === undefined ? this.statusEnabled(config, item?.id) : this.draft.status_notification === 'on';
    return `<fieldset><legend>Notifica di stato</legend><label class="sc-check"><input type="checkbox" name="status_notification" ${status ? 'checked' : ''}>Notifica persistente per tutta la fascia</label><p>In Home Assistant compare una notifica che dice se lo schedule è attivo, in pausa per la condizione o in attesa di un altro controllo; si aggiorna da sola e sparisce a fine fascia.</p></fieldset>
      <fieldset><legend>Tocco sulla notifica</legend><p>${url ? `Apre <strong>${esc(url)}</strong> (app Companion e notifiche di Home Assistant).` : 'Nessuna pagina impostata: la notifica non apre nulla.'}</p><div class="sc-controls">${url !== here && here ? button('setNotificationUrl','Apri questa dashboard',here) : ''}${url ? button('setNotificationUrl','Rimuovi collegamento','') : ''}</div></fieldset>`;
  }
  entityPills(selected, allowed) {
    const states = this._hass?.states || {};
    const ids = [...new Set([...targetEntities(this._hass, allowed), ...selected.filter((id) => allowed.includes(id))])].sort();
    return `<div class="sc-entity-pills">${ids.map((id) => `<label class="sc-entity-pill" title="${esc(id)}"><input type="checkbox" name="entities" value="${esc(id)}" ${selected.includes(id) ? 'checked' : ''}><span>${esc(states[id]?.attributes?.friendly_name || id)}</span></label>`).join('')}</div>`;
  }
  entityRadios(ids, selected) {
    const states = this._hass?.states || {};
    return `<label>Ricerca entità<input type="search" name="entity_search" placeholder="Nome, dominio o ID"></label><div class="sc-entities" role="radiogroup" aria-label="Entità">${[...ids].sort().map((id) => `<label data-entity-label="${esc(`${id} ${states[id]?.attributes?.friendly_name || ''}`.toLowerCase())}"><input type="radio" name="entity_id" value="${esc(id)}" ${id === selected ? 'checked' : ''}><span><span class="sc-entity-name">${esc(states[id]?.attributes?.friendly_name || id)}</span><span class="sc-entity-id">${esc(id)}</span></span></label>`).join('')}</div>`;
  }
  // Drag the slot (move) or a handle (resize) with snap and magnets, like weekly-schedule-card.
  startDrag(event) {
    const bar = event.target.closest('.sc-tb-edit[data-slot-bar]');
    if (!bar || event.button > 0) return;
    event.preventDefault();
    const track = bar.parentElement, i = bar.dataset.slotBar;
    const form = this.shadowRoot.querySelector('form[data-editor]');
    const startInput = form.elements[`slot_${i}_start`], endInput = form.elements[`slot_${i}_end`];
    const handle = event.target.closest('[data-handle]')?.dataset.handle || 'move';
    const s0 = toMinutes(startInput.value), e0 = toMinutes(endInput.value), x0 = event.clientX;
    const magnets = (track.dataset.magnets || '').split(',').filter(Boolean).map(Number);
    const snap = Number(track.dataset.snap) || 15;
    bar.setPointerCapture?.(event.pointerId);
    const move = (e) => {
      const width = track.getBoundingClientRect().width || 1;
      const dx = (e.clientX - x0) / width * 1440, threshold = 10 / width * 1440;
      let start = s0, end = e0;
      const snapTo = (m) => magnetSnap(m, magnets, threshold, snap);
      if (handle === 'move') {
        const duration = e0 - s0, a = snapTo(s0 + dx), b = snapTo(e0 + dx) - duration;
        start = Math.max(0, Math.min(1440 - duration, Math.abs(a - s0 - dx) <= Math.abs(b - s0 - dx) ? a : b));
        end = start + duration;
      } else if (handle === 'start') start = Math.max(0, Math.min(e0 - snap, snapTo(s0 + dx)));
      else end = Math.max(s0 + snap, Math.min(1440, snapTo(e0 + dx)));
      startInput.value = toTime(start); endInput.value = toTime(end % 1440);
      track.querySelectorAll('.sc-tb-magnet').forEach((m) => m.classList.toggle('is-near', [start, end].includes(Number(m.dataset.min))));
      this.syncTimebar(i, start, end);
    };
    const stop = () => {
      bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', stop); bar.removeEventListener('pointercancel', stop);
      track.querySelectorAll('.sc-tb-magnet').forEach((m) => m.classList.remove('is-near'));
      startInput.dispatchEvent(new Event('input', {bubbles: true}));
    };
    bar.addEventListener('pointermove', move); bar.addEventListener('pointerup', stop); bar.addEventListener('pointercancel', stop);
  }
  syncTimebar(i, start, end) {
    const bar = this.shadowRoot.querySelector(`.sc-tb-edit[data-slot-bar="${i}"]`);
    if (!bar || end <= start) return;
    bar.style.left = `${start / 1440 * 100}%`; bar.style.width = `${(end - start) / 1440 * 100}%`;
    bar.classList.toggle('is-narrow', end - start < 300);
    bar.querySelector('.sc-tb-label').textContent = `${toTime(start)}–${toTime(end)}`;
  }
  syncRange(node) {
    const root = node?.closest?.('.sc-range');
    if (!root) return;
    const range = root.querySelector('input[type="range"]'), mirror = root.querySelector('[data-mirror]');
    if (node === mirror) { if (mirror.value !== '' && Number.isFinite(Number(mirror.value))) range.value = mirror.value; }
    else if (mirror) mirror.value = range.value;
    const min = Number(range.min), max = Number(range.max);
    range.style.setProperty('--sc-fill', `${max > min ? (Number(range.value) - min) / (max - min) * 100 : 0}%`);
  }
  suggestion(form) {
    const ids = this.draft?.selectedEntities || [...form.querySelectorAll('[name="entities"]:checked')].map((x) => x.value);
    const domain = ids[0]?.split('.')[0];
    if (!domain) return null;
    const attempt = (prefix) => { try { return readAction(form, prefix, domain); } catch { return null; } };
    const start = attempt('start'), end = attempt('end');
    const slots = readSlots(form), slot = slots[0];
    const who = `${this._hass.states[ids[0]]?.attributes?.friendly_name || ids[0]}${ids.length > 1 ? ` +${ids.length - 1}` : ''}`;
    const when = slot?.weekdays.length ? `${daysLabel(slot.weekdays)} ${slot.start}–${slot.end}${slots.length > 1 ? ` (+${slots.length - 1})` : ''}` : '';
    return {
      name: [who, describeAction(start), when].filter(Boolean).join(' · '),
      start_notification_message: `${who}: ${describeAction(start) || 'avvio'}${slot ? ` alle ${slot.start}` : ''}`,
      end_notification_message: end ? `${who}: ${describeAction(end)}${slot ? ` alle ${slot.end}` : ''}` : `${who}: fascia terminata${slot ? ` alle ${slot.end}` : ''}`,
    };
  }
  // Suggested texts replace a field only while it still holds the previous suggestion.
  updateSuggestions(force = false) {
    const form = this.shadowRoot.querySelector('form[data-editor="schedule"]');
    if (!form) return;
    const suggested = this.suggestion(form);
    if (!suggested) return;
    const fill = (key, value) => {
      const node = [...form.querySelectorAll('input')].find((x) => x.getAttribute('name') === key);
      // Existing schedules keep their texts; an empty notification is filled
      // only after it is enabled in this editor session.
      const phase = key.split('_notification_')[1] ? key.split('_notification_')[0] : null;
      const fresh = !this.edit?.[1] || (phase && this.changedFields?.has(`${phase}_notification_enabled`));
      const auto = this.auto[key] ?? (fresh ? '' : undefined);
      if (!node || (!(force && key === 'name') && node.value !== auto)) return;
      node.value = value; this.auto[key] = value;
      if (this.draft) this.draft[key] = value;
    };
    fill('name', suggested.name);
    const title = form.querySelector('input[name="name"]')?.value?.trim() || suggested.name;
    for (const phase of ['start', 'end']) {
      fill(`${phase}_notification_title`, title);
      fill(`${phase}_notification_message`, suggested[`${phase}_notification_message`]);
    }
  }
  // Preview of a weekly-schedule-card import: what becomes of each schedule.
  importContent(config) {
    const data = this.importData, hass = this._hass;
    const intro = '<p>Gli schedule della weekly-schedule-card vengono <strong>aggiunti</strong> in un nuovo profilo, <strong>disattivato</strong>: nulla viene eseguito finché non lo attivi. La weekly-schedule-card e Scheduler non vengono modificati.</p>';
    const input = '<label>Backup della weekly-schedule-card (.json)<input type="file" accept="application/json,.json" data-role="backup-file"></label>';
    if (!data) return `${intro}<p class="sc-meta">Nella weekly-schedule-card: Gruppi → Manutenzione → Salva configurazione.</p>${input}`;
    const {converted, backup} = data;
    const again = (config.migration_metadata?.imports || []).find((x) => x.source === 'weekly-schedule-card' && x.source_created_at && x.source_created_at === backup.createdAt);
    const leaves = (node) => !node ? [] : node.children?.length ? node.children.flatMap(leaves) : [node.entity_id];
    const entities = [...new Set(converted.profiles.flatMap((p) => p.groups.flatMap((g) => [...g.entity_ids, ...g.schedules.flatMap((s) => leaves(s.condition))])))];
    const missing = entities.filter((id) => !hass.states[id]);
    const mark = {ok: ['✓', 'Pronto'], note: ['!', 'Da controllare'], off: ['⏸', 'Importato disattivato'], skip: ['✕', 'Non importato']};
    const symbol = {numeric_greater: '>', numeric_less: '<', numeric_greater_or_equal: '≥', numeric_less_or_equal: '≤', state_equals: '=', state_not_equals: '≠'};
    const condText = (node) => !node ? '' : ['and', 'or'].includes(node.operator) ? node.children.map(condText).join(node.operator === 'and' ? ' e ' : ' o ') : `${hass.states[node.entity_id]?.attributes?.friendly_name || node.entity_id} ${symbol[node.operator] || node.operator} ${node.value}${node.hysteresis ? ` (isteresi ${node.hysteresis})` : ''}`;
    const rows = converted.rows.map((r) => `<li class="sc-import-row is-${r.status}"><span class="sc-import-mark" title="${esc(mark[r.status][1])}" aria-label="${esc(mark[r.status][1])}">${mark[r.status][0]}</span><div><strong>${esc(r.name || r.source)}</strong>${r.slots ? `<span class="sc-meta">${esc(r.slots.map((x) => `${daysLabel(x.weekdays)} ${x.start}–${x.end}`).join(' · '))} · ${esc(describeAction(r.start))}${r.end ? ` → alla fine ${esc(describeAction(r.end))}` : ''}${r.condition ? ` · se ${esc(condText(r.condition))}` : ''}</span>` : ''}${r.notes.length ? `<ul class="sc-import-notes">${r.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}</div></li>`).join('');
    const count = (status) => converted.rows.filter((r) => r.status === status).length;
    const profiles = converted.profiles.map((p) => `<p>Profilo <strong>«${esc(p.name)}»</strong> · ${p.profile_type === 'exclusive' ? 'esclusivo' : 'condiviso'} · ${p.groups.length} gruppi (${esc(p.groups.map((g) => g.name).join(', '))})${p.wasActive ? ' · era attivo nella weekly-schedule-card' : ''}</p>`).join('');
    return `${intro}${input}<div class="sc-summary"><strong>${esc(data.file)}</strong><p>Salvato il ${esc(String(backup.createdAt || '').replace('T', ' ').slice(0, 16) || 'data sconosciuta')} · ${count('ok') + count('note')} pronti · ${count('off')} disattivati · ${count('skip')} non importati</p>${profiles}
      ${again ? `<p class="sc-error">Questo backup è già stato importato il ${esc(String(again.imported_at).replace('T', ' ').slice(0, 16))}: importandolo di nuovo gli schedule saranno duplicati.</p>` : ''}
      ${missing.length ? `<p class="sc-error">Entità non presenti in questo Home Assistant: ${esc(missing.join(', '))}</p>` : ''}
      <p class="sc-import-warning">Prima di attivare il profilo importato spegni gli stessi schedule nella weekly-schedule-card (o in Scheduler): altrimenti i dispositivi ricevono i comandi due volte.</p></div>
      <ul class="sc-import">${rows}</ul>`;
  }
  async exportBackup() {
    this.localError = null; this.notice = null;
    try {
      const backup = await this.adapter.connection.sendMessagePromise({type: 'schedule_creator/backup/export'});
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], {type: 'application/json'}));
      const link = document.createElement('a');
      link.href = url; link.download = `schedule-creator-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.notice = `Backup salvato: ${backup.config.profiles.length} profili, ${backup.config.groups.length} gruppi, ${backup.config.schedules.length} schedule.`;
    } catch (error) {
      this.localError = messageFor({...error, operation: 'schedule_creator/backup/export'});
    }
    this.render();
  }
  async readBackupFile(input) {
    this.localError = null; this.restoreData = null; this.importData = null;
    try {
      const backup = JSON.parse(await input.files[0].text());
      if (isWscBackup(backup)) {
        // A weekly-schedule-card backup is imported next to existing data, never restored over it.
        const config = this.adapter.state.config;
        const converted = convertWscBackup(backup, {existingProfileNames: config.profiles.map((p) => p.name), entityName: (id) => this._hass.states[id]?.attributes?.friendly_name || id});
        this.importData = {backup, converted, file: input.files[0].name};
        if (this.edit) this.edit = ['import', null];
      } else if (backup?.format === 'schedule_creator.backup' && backup.config) {
        this.restoreData = backup;
        if (this.edit) this.edit = ['restore', null];
      } else throw new Error('Il file non è un backup di Schedule Creator né della weekly-schedule-card.');
    } catch (error) {
      this.localError = error instanceof SyntaxError ? 'Il file non contiene JSON valido.' : error.message;
    }
    this.render();
  }
  updateClock() {
    // The now line, today column and running markers follow the minute.
    if (!this.edit && this.clockMinute !== undefined && haNow(this._hass?.config?.time_zone).minutes !== this.clockMinute) { this.render(); return; }
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
    if (kind === 'profile') content = `${field('name', 'Nome', item?.name)}${select('profile_type', 'Tipo', [['exclusive','Esclusivo'],['shared','Condiviso']], item?.profile_type || 'exclusive')}${iconPicker(d.icon ?? item?.icon)}${colorPicker(d.color ?? item?.color)}${field('order','Posizione nell’elenco (0 = primo)',item?.order ?? 0,'number')}<p>Serve solo a ordinare l’elenco: non cambia priorità né esecuzione.</p>`;
    if (kind === 'group') content = `${field('name','Nome',item?.name)}${iconPicker(d.icon ?? item?.icon)}${colorPicker(d.color ?? item?.color)}${field('order','Posizione nell’elenco (0 = primo)',item?.order ?? 0,'number')}<p>Serve solo a ordinare l’elenco: non cambia priorità né esecuzione.</p>${this.entities(d.selectedEntities || item?.entity_ids || [])}`;
    if (kind === 'schedule') {
      const owner = config.groups.find((g) => g.id === this.ownerGroup);
      const ids = d.selectedEntities || item?.target_entity_ids || targetEntities(this._hass,owner?.entity_ids || []).slice(0,1);
      this.actionDomain = ids[0]?.split('.')[0] || this.actionDomain;
      const slots = this.slotDraft || item?.time_slots || [{weekdays:[0,1,2,3,4,5,6],start:'08:00',end:'09:00'}];
      const condition = this.conditionDraft === undefined ? item?.condition : this.conditionDraft;
      const friendly = (x) => this._hass.states[x]?.attributes?.friendly_name || x;
      const endSummary = d.end_mode ? pretty(d.end_mode) : this.actionReset || !item?.end_action ? 'Nessuna azione' : describeAction(item.end_action);
      const leafs = (node) => !node ? [] : ['and','or'].includes(node.operator) ? node.children.flatMap(leafs) : [node];
      const conditionSummary = !condition ? 'Nessuna' : leafs(condition).length > 1 ? `${leafs(condition).length} condizioni` : friendly(leafs(condition)[0].entity_id) || 'Da completare';
      const notified = (key, fallback) => d[`${key}_enabled`] === undefined ? !!fallback : d[`${key}_enabled`] === 'on';
      const notificationSummary = [notified('start_notification', item?.start_notification) && 'Inizio', notified('end_notification', item?.end_notification) && 'Fine', (d.status_notification === undefined ? this.statusEnabled(config, item?.id) : d.status_notification === 'on') && 'Stato'].filter(Boolean).join(' · ') || 'Nessuna';
      const row = (section, label, summary, body) => `<details class="sc-row" data-section="${section}"><summary><span>${label}</span><em>${esc(summary)}</em></summary><div class="sc-row-body">${body}</div></details>`;
      content = `<div class="sc-name-row">${field('name','Nome',item?.name)}${button('suggestName','Suggerisci')}</div>
        <div class="sc-field"><span class="sc-field-label">Dispositivi · ${esc(owner?.name || 'gruppo')}</span>${this.entityPills(ids,owner?.entity_ids || [])}</div>
        <div class="sc-section-label">Quando</div>${slotsForm(slots,{others:this.otherSlots(config,ids,item?.id),snap:this.snap})}
        <div class="sc-section-label">All’inizio</div>${actionForm('start','Azione iniziale',this._hass,ids,this.actionReset?null:item?.start_action,false,d)}
        <div class="sc-rows">
        ${row('row-end','Alla fine',endSummary,actionForm('end','Azione finale',this._hass,ids,this.actionReset?null:item?.end_action,true,d))}
        ${row('row-conditions','Condizioni',conditionSummary,`${conditionForm(condition,this._hass)}<datalist id="sc-condition-entities">${Object.keys(this._hass.states||{}).sort().map((id)=>`<option value="${esc(id)}">${esc(this._hass.states[id].attributes?.friendly_name||id)}</option>`).join('')}</datalist><p>Se falsa: azione finale se presente, altrimenti ripristino deciso dal motore. La fine fascia senza azione finale non invia comandi.</p>`)}
        ${row('row-notifications','Notifiche',notificationSummary,`${notificationForm('start_notification','Notifica iniziale',item?.start_notification,this._hass,d)}${notificationForm('end_notification','Notifica finale',item?.end_notification,this._hass,d)}${this.notificationExtras(config,item)}`)}
        ${row('row-options','Altre opzioni',item?.enabled === false ? 'Disabilitato' : 'Abilitato',`<label class="sc-check"><input name="enabled" type="checkbox" ${item?.enabled !== false ? 'checked' : ''}>Schedule abilitato</label><p>Orari nel fuso ${esc(this._hass.config?.time_zone || 'di Home Assistant')}. Se la fine precede l’inizio, la fascia termina il giorno successivo.</p>${select('override_policy','Comandi manuali', [['cooperative','Cooperativa'],['manual_override','Priorità al comando manuale']],item?.override_policy || 'cooperative')}${field('inclusion_dates','Date incluse (AAAA-MM-GG, separate da virgola)',(item?.inclusion_dates || []).join(', '))}${field('exclusion_dates','Date escluse (AAAA-MM-GG, separate da virgola)',(item?.exclusion_dates || []).join(', '))}`)}
        </div>
        <details><summary>Pro · configurazione JSON</summary><label class="sc-check"><input type="checkbox" name="pro_config_enabled">Usa JSON per condizioni, fasce e notifiche</label>${area('pro_config','Configurazione avanzata',json({time_slots:slots,condition:condition||null,start_notification:item?.start_notification||null,end_notification:item?.end_notification||null}),8)}</details>`;
    }
    if (kind === 'restore') {
      const b = this.restoreData?.config;
      const missing = b ? [...new Set([...(b.groups || []).flatMap((g) => g.entity_ids || []), ...(b.schedules || []).flatMap((x) => x.target_entity_ids || [])])].filter((id) => !this._hass.states[id]) : [];
      content = `<p>Il ripristino <strong>sostituisce</strong> tutti i profili, gruppi e schedule attuali con quelli del file. I profili ripristinati restano <strong>disattivati</strong>: attivali quando vuoi che eseguano i comandi. Timer e fasce in corso non fanno parte del backup.</p><label>File di backup (.json)<input type="file" accept="application/json,.json" data-role="backup-file"></label>${b ? `<div class="sc-summary"><strong>Contenuto del file</strong><p>${(b.profiles || []).length} profili · ${(b.groups || []).length} gruppi · ${(b.schedules || []).length} schedule</p><p>Salvato il ${esc(String(this.restoreData.exported_at || '').replace('T', ' ').slice(0, 16) || 'data sconosciuta')} con la versione ${esc(this.restoreData.integration_version || 'sconosciuta')}.</p>${missing.length ? `<p class="sc-error">Entità non presenti in questo Home Assistant: ${esc(missing.join(', '))}. Gli schedule collegati non potranno comandarle.</p>` : ''}</div>` : '<p>Scegli un file creato con “Salva backup”.</p>'}`;
    }
    if (kind === 'import') content = this.importContent(config);
    if (kind === 'reset') {
      const timers = this.adapter.state.quick_timers?.length ?? 0;
      content = `<p>RESET cancella <strong>tutti</strong> i dati di Schedule Creator: ${config.profiles.length} profili, ${config.groups.length} gruppi, ${config.schedules.length} schedule, ${timers} timer attivi, fasce in corso e storico operazioni. L’integrazione resta installata e vuota.</p><p>I dispositivi restano nello stato in cui si trovano: nessun comando di spegnimento o ripristino viene inviato. Dispositivi, entità, automazioni e la vecchia weekly-schedule-card non vengono toccati.</p><p>Prima di procedere puoi salvare un backup.</p><div class="sc-controls">${button('exportBackup','Salva backup')}</div>${field('confirm','Scrivi RESET per confermare','')}`;
    }
    if (kind === 'timer') {
      const ids = targetEntities(this._hass);
      const selected = d.entity_id || ids[0];
      this.actionDomain = selected?.split('.')[0];
      content = `${this.entityRadios(ids,selected)}${field('duration_seconds','Durata in secondi (1–604800)',300,'number')}${actionForm('timer','Azione timer',this._hass,selected?[selected]:[],null,false,d)}`;
    }
    const subtitle = kind === 'schedule' ? config.groups.find((g) => g.id === this.ownerGroup)?.name : kind === 'group' ? profile?.name : '';
    return `<form data-editor="${esc(kind)}" class="sc-editor"><h3 id="sc-editor-title">${subtitle ? `<small>${esc(subtitle)}</small>` : ''}${({profile:id?'Modifica profilo':'Nuovo profilo',group:id?'Modifica gruppo':'Nuovo gruppo',schedule:id?'Modifica schedule':'Nuovo schedule',timer:'Quick Timer',restore:'Ripristina backup',import:'Importa da Weekly Schedule Card',reset:'RESET completo'})[kind]}</h3>${content}<div class="sc-actions"><button type="submit" class="sc-save ${kind === 'reset' ? 'sc-danger' : ''}">${({restore:'Ripristina',import:'Importa',reset:'Cancella tutto',schedule:'Salva schedule'})[kind] || 'Salva'}</button>${button('close','Annulla')}</div></form>`;
  }
  async click(event) {
    const track = event.target.closest?.('.sc-day-track');
    if (track && !event.target.closest('.sc-time-block') && !this.adapter.busy && track.dataset.day !== undefined && this.canAddSchedule()) {
      // Clicking free space starts a one-hour slot at that half hour, like weekly-schedule-card.
      const rect = track.getBoundingClientRect();
      const minutes = Math.min(1380, Math.max(0, Math.floor((event.clientY - rect.top) / (rect.height || 1) * 48) * 30));
      this.openEditor('newSchedule', '', {weekdays: [Number(track.dataset.day)], start: toTime(minutes), end: toTime(minutes + 60)});
      return;
    }
    const buttonEl = event.target.closest('button'); if (!buttonEl || this.adapter.busy) return;
    if (buttonEl.dataset.profile) { this.selectedProfile = buttonEl.dataset.profile; this.selectedGroup = null; this.edit = null; this.draft = null; this.render(); return; }
    if (buttonEl.dataset.group) { this.selectedGroup = buttonEl.dataset.group; this.edit = null; this.draft = null; this.render(); return; }
    const command = buttonEl.dataset.command, id = buttonEl.dataset.id;
    if (!command) return;
    if (['addSlot','removeSlot','addCondition','addConditionChild','removeCondition','setSnap','slotDays'].includes(command)) {
      this.capture();
      if (command === 'setSnap') this.snap = Number(id);
      if (command === 'slotDays') { const [i, key] = id.split(':'); this.slotDraft[Number(i)].weekdays = [...DAY_SHORTCUTS[key]]; }
      if (command === 'addSlot') {
        // Like weekly-schedule-card "next slot": start where the last one ends.
        const last = this.slotDraft.at(-1), start = last ? toMinutes(last.end) % 1440 : 480;
        this.slotDraft.push({weekdays:[...(last?.weekdays || [0,1,2,3,4,5,6])],start:toTime(start),end:toTime(Math.min(start + 60, 1439))});
      }
      if (command === 'removeSlot' && this.slotDraft.length>1) this.slotDraft.splice(Number(id),1);
      if (command === 'addCondition') {
        const root = this.conditionDraft;
        this.conditionDraft = !root ? blankCondition() : ['and','or'].includes(root.operator) ? {...root, children:[...root.children, blankCondition()]} : {...blankCondition(), operator:'and', entity_id:null, children:[root, blankCondition()]};
      }
      if (command === 'addConditionChild') {
        let node = this.conditionDraft;
        for (const i of id.split('.').slice(1).map(Number)) node = node.children[i];
        node.children.push(blankCondition());
      }
      if (command === 'removeCondition') {
        const path = id.split('.').slice(1).map(Number);
        if (!path.length) this.conditionDraft = null;
        else {
          const index = path.pop();
          let parent = this.conditionDraft;
          for (const i of path) parent = parent.children[i];
          parent.children.splice(index, 1);
          // A group with a single rule collapses into that rule.
          if (parent.children.length === 1) {
            if (parent === this.conditionDraft) this.conditionDraft = parent.children[0];
            else Object.assign(parent, parent.children[0]);
          }
        }
      }
      this.render(); return;
    }
    if (command === 'setNotificationUrl') {
      await this.adapter.mutate('settings/update', {notification_url: id || null});
      this.editRevision = this.adapter.state.revision;
      return;
    }
    if (command === 'close') { this.closeEditor(); return; }
    if (command === 'stepValue') {
      const [name, direction] = id.split(':');
      const node = [...this.shadowRoot.querySelectorAll('input')].find((x) => x.getAttribute('name') === name);
      if (node) {
        const step = Number(node.step) || 1, value = Number(node.value) + step * Number(direction);
        node.value = String(Math.round(Math.min(Number(node.max), Math.max(Number(node.min), value)) / step) * step);
        node.dispatchEvent(new Event('input', {bubbles: true}));
      }
      return;
    }
    if (command === 'suggestName') { this.capture(); this.updateSuggestions(true); return; }
    if (command === 'exportBackup') { await this.exportBackup(); return; }
    if (/^(new|edit)/.test(command)) { this.openEditor(command, id); return; }
    const types = { toggleProfile: 'profile/set_active', deleteProfile: 'profile/delete', deleteGroup: 'group/delete', deleteSchedule: 'schedule/delete', cancelTimer: 'quick_timer/cancel' };
    return this.runCommand(command, id, types);
  }
  openEditor(command, id, slot = null) {
    {
      if(this._hass?.user?.is_admin !== true) return;
      this.editorOpener={command,id};
      this.adapter.writeError=null;
      const kind = command.replace(/^(new|edit)/,'').toLowerCase();
      const config = this.adapter.state.config;
      const profile = config.profiles.find((p)=>p.id===this.selectedProfile)||config.profiles[0];
      const group = config.groups.find((g)=>g.id===this.selectedGroup)||config.groups.find((g)=>g.profile_id===profile?.id);
      this.edit = [kind,id||null];
      this.editRecord = id ? structuredClone(config[`${kind}s`].find((x)=>x.id===id)) : null;
      this.auto = {}; this.restoreData = null; this.importData = null; this.notice = null;
      this.ownerGroup = this.editRecord?.group_id || group?.id;
      this.ownerProfile = this.editRecord?.profile_id || profile?.id;
      this.editRevision = this.adapter.state.revision;
      this.changedFields = new Set();
      this.slotDraft = null; this.conditionDraft = undefined; this.actionReset = false; this.actionDomain = null;
      if (slot) this.slotDraft = [slot];
      this.draft = null; this.localError = null; this.localErrorDetails = null; this.render();
    }
  }
  async runCommand(command, id, types) {
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
    this.localError = null; this.localErrorDetails = null;
    const [kind,id] = this.edit;
    const type = ({timer:'quick_timer/create',restore:'backup/import',import:'import/merge',reset:'reset'})[kind] || `${kind}/${id ? 'update' : 'create'}`;
    let phase = 'lettura del modulo';
    try {
      this.capture();
      const data = Object.fromEntries(new FormData(form));
      const config = this.adapter.state.config;
      let payload;
      phase = 'validazione del nome';
      if (!['timer','restore','import','reset'].includes(kind) && !data.name?.trim()) throw new Error('Inserisci un nome prima di salvare.');
      if (kind === 'restore') {
        if (!this.restoreData) throw new Error('Scegli prima un file di backup.');
        payload = {backup: this.restoreData};
      }
      if (kind === 'import') {
        const count = this.importData?.converted.profiles.reduce((n, p) => n + p.groups.reduce((m, g) => m + g.schedules.length, 0), 0);
        if (!count) throw new Error('Scegli prima un backup della weekly-schedule-card con almeno uno schedule importabile.');
        payload = wscImportPayload(this.importData.converted, this.importData.backup);
      }
      if (kind === 'reset') {
        if (data.confirm?.trim() !== 'RESET') throw new Error('Scrivi RESET in maiuscolo per confermare la cancellazione.');
        payload = {confirm: 'RESET'};
      }
      phase = 'preparazione dei dati';
      if (kind === 'profile') payload = { name: data.name.trim(), profile_type: data.profile_type, icon: data.icon || null, color: data.color || null, order: Number(data.order) };
      if (kind === 'group') payload = { name: data.name.trim(), entity_ids: this.draft.selectedEntities, icon: data.icon || null, color: data.color || null, order: Number(data.order) };
      if (kind === 'schedule') {
        phase = 'validazione delle entità';
        const owner = config.groups.find((g)=>g.id===this.ownerGroup);
        const domain = this.draft.selectedEntities[0]?.split('.')[0];
        if (!domain || !this.draft.selectedEntities.every((x)=>x.startsWith(`${domain}.`) && owner?.entity_ids.includes(x))) throw new Error('Scegli entità dello stesso tipo appartenenti al gruppo.');
        phase = 'lettura delle fasce orarie';
        const slots = readSlots(form);
        if (!slots.length || slots.some((s)=>!s.weekdays.length || !s.start || !s.end || s.start===s.end)) throw new Error('Ogni fascia richiede almeno un giorno e orari diversi.');
        const dates = (str)=>[...new Set(str.split(',').map((x)=>x.trim()).filter(Boolean))].sort();
        phase = 'lettura azione iniziale';
        const startAction = readAction(form,'start',domain);
        phase = 'lettura azione finale';
        const endAction = readAction(form,'end',domain);
        phase = 'lettura condizioni e notifiche';
        payload = {name:data.name.trim(),enabled:form.elements.enabled.checked,target_entity_ids:this.draft.selectedEntities,
          time_slots:slots,start_action:startAction,end_action:endAction,
          condition:readCondition(form),override_policy:data.override_policy,inclusion_dates:dates(data.inclusion_dates),exclusion_dates:dates(data.exclusion_dates),
          start_notification:readNotification(form,'start_notification'),end_notification:readNotification(form,'end_notification')};
        if (form.elements.pro_config_enabled.checked) {
          const pro = parseJson(data.pro_config,'Configurazione Pro');
          if (!pro || Array.isArray(pro) || typeof pro!=='object' || Object.keys(pro).some((k)=>!['time_slots','condition','start_notification','end_notification'].includes(k))) throw new Error('Campi Pro non validi.');
          Object.assign(payload,clean(pro));
        }
        for (const key of ['start_notification','end_notification']) if (payload[key] && !payload[key].message.trim()) throw new Error('Inserisci il messaggio della notifica oppure disabilitala.');
        const statusWanted = form.elements.status_notification?.checked ?? false;
        if (statusWanted !== this.statusEnabled(config, id)) payload.status_notification = statusWanted;
        const validateCondition = (node) => {if (!node) return;if (['and','or'].includes(node.operator)) {if(node.children.length<2) throw new Error('Servono due regole per E/O.');node.children.forEach(validateCondition);} else {if (!node.entity_id || !this._hass.states[node.entity_id]) throw new Error('Seleziona un’entità valida nella condizione.');if (node.operator === 'numeric_range' ? node.lower === null || node.upper === null : node.operator !== 'available' && (node.value === null || node.value === '')) throw new Error('Completa il valore della condizione.');}};
        validateCondition(payload.condition);
      }
      if (kind === 'timer') { const domain = data.entity_id.split('.')[0]; payload = {entity_id:data.entity_id,duration_seconds:Number(data.duration_seconds),action:readAction(form,'timer',domain)}; if (payload.duration_seconds<1 || payload.duration_seconds>604800) throw new Error('La durata deve essere tra 1 e 604800 secondi.'); }
      if (!payload) throw new Error('Editor non disponibile.');
      phase = 'confronto con la configurazione esistente';
      if (this.adapter.conflicted && !confirm('I dati sono cambiati su un altro client. Hai confrontato la bozza con i nuovi dati prima di salvare?')) return;
      if (id) {
        if (kind === 'schedule' && !this.actionReset) {
          for (const prefix of ['start','end']) {
            if (![...this.changedFields].some((name)=>name.startsWith(`${prefix}_`) && !name.startsWith(`${prefix}_notification`))) delete payload[`${prefix}_action`];
          }
        }
        for (const key of Object.keys(payload)) if (key !== 'status_notification' && JSON.stringify(payload[key]) === JSON.stringify(clean(this.editRecord[key]))) delete payload[key];
        if (!Object.keys(payload).length) { this.edit=null; this.draft=null; this.render(); return; }
        payload[`${kind}_id`] = id;
      }
      if (!id && kind === 'group') payload.profile_id = this.ownerProfile;
      if (!id && kind === 'schedule') { payload.profile_id = this.ownerProfile; payload.group_id = this.ownerGroup; }
      phase = 'salvataggio e aggiornamento della vista';
      const ok = await this.adapter.mutate(type,payload,{ runtime: kind === 'timer', expectedRevision: kind === 'timer' || this.adapter.conflicted ? undefined : this.editRevision });
      if (ok && kind === 'import') {
        const names = this.importData.converted.profiles.map((p) => p.name);
        this.selectedProfile = this.adapter.state?.config?.profiles?.find((p) => p.name === names[0])?.id || null; this.selectedGroup = null;
        this.notice = `Importato in ${names.map((n) => `«${n}»`).join(', ')}. Il profilo è disattivato: spegni gli schedule nella weekly-schedule-card prima di attivarlo.`;
      }
      if (ok && ['restore','reset'].includes(kind)) {
        this.selectedProfile = null; this.selectedGroup = null;
        this.notice = kind === 'reset' ? 'RESET completato: Schedule Creator è vuoto.' : 'Backup ripristinato. I profili sono disattivati: attivali per eseguire gli schedule.';
      }
      if (ok) this.closeEditor();
    } catch (error) {
      this.localError = messageFor(error);
      this.localErrorDetails = diagnosticFor(error, {cardVersion:CARD_VERSION,haVersion:this._hass.config?.version,phase,operation:`schedule_creator/${type}`});
      this.render();
    }
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
