// HA WebSocket adapter. The server owns all actions, storage and revisions.
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
    this.onChange();
    try {
      await connection.sendMessagePromise({
        type: `schedule_creator/${type}`,
        expected_revision: expectedRevision ?? (runtime ? this.state.runtime_summary.revision : this.state.revision),
        ...fields,
      });
      if (this.closed || generation !== this.generation) return false;
      await this.refresh();
      this.conflicted = false;
      return true;
    } catch (error) {
      if (this.closed || generation !== this.generation) return false;
      this.writeError = error;
      if (error.code === 'revision_conflict') {
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
// Convert persisted, server-owned nested records into editable API payloads.
const clean = (value) => {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.entries(value).filter(([key]) => !['id', 'schema_version', 'revision', 'created_at', 'updated_at'].includes(key))
      .map(([key, child]) => [key, key === 'data' ? structuredClone(child) : clean(child)]),
  );
  return value;
};

const messageFor = (error) => ({
  revision_conflict: 'Configurazione cambiata su un altro client. La bozza è conservata: confrontala e salva di nuovo.',
  unauthorized: 'Serve un account amministratore per modificare.',
  invalid_payload: 'Dati non validi: controlla entità, fasce e parametri delle azioni.',
  invalid_format: 'Formato non valido: controlla i campi richiesti.',
  not_found: 'Profilo, gruppo o schedule non trovato. Aggiorna la vista.',
  ownership_mismatch: 'Il gruppo non appartiene al profilo scelto.',
  profile_in_use: 'Profilo in uso: rimuovi prima i gruppi e gli schedule collegati.',
  group_in_use: 'Gruppo in uso: rimuovi prima gli schedule collegati.',
  invalid_state: 'Il timer non è più attivo.',
  not_loaded: 'Integrazione non caricata: controlla Dispositivi e servizi.',
  storage_unavailable: 'Archivio non disponibile: controlla i log di Home Assistant.',
})[error?.code] || error?.message || 'Operazione non riuscita. Controlla i log di Home Assistant.';

function parseJson(text, label) {
  try { return JSON.parse(text); } catch { throw new Error(`${label}: JSON non valido.`); }
}
// UI-only builders. Execution, conditions and notifications belong to HA.
const uiEscape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const E = uiEscape;
const input = (name, label, value = '', type = 'text', attrs = '') => `<label>${label}<input name="${name}" type="${type}" value="${E(value)}" ${attrs}></label>`;
const choice = (name, label, values, selected) => `<label>${label}<select name="${name}">${values.map(([v,t]) => `<option value="${E(v)}" ${v === selected ? 'selected' : ''}>${E(t)}</option>`).join('')}</select></label>`;
const check = (name,label,checked) => `<label class="sc-check"><input type="checkbox" name="${name}" ${checked ? 'checked' : ''}>${label}</label>`;
const commands = {
  switch: {turn_on:'Accendi',turn_off:'Spegni'}, input_boolean: {turn_on:'Attiva',turn_off:'Disattiva'},
  light: {turn_on:'Accendi / regola luce',turn_off:'Spegni'},
  climate: {set_hvac_mode:'Modalità',set_temperature:'Temperatura e modalità',set_fan_mode:'Velocità ventola',set_preset_mode:'Preset'},
  fan: {turn_on:'Accendi',turn_off:'Spegni',set_percentage:'Velocità (%)',set_preset_mode:'Preset'},
  cover: {open_cover:'Apri',close_cover:'Chiudi',stop_cover:'Ferma',set_cover_position:'Posizione (%)'},
};
function controllable(hass, id) {
  const domain = id.split('.')[0];
  return !!commands[domain] && Object.keys(commands[domain]).some((x) => hass.services?.[domain]?.[x]);
}
function targetEntities(hass, allowed = null) {
  return Object.keys(hass.states || {}).filter((id) => (!allowed || allowed.includes(id)) && controllable(hass,id));
}
const intersect = (states, key) => states.length ? (states[0].attributes?.[key] || []).filter((value) => states.every((s) => (s.attributes?.[key] || []).includes(value))) : [];
const knownData = {turn_on:['brightness','brightness_pct','rgb_color','color_temp_kelvin'], turn_off:[],set_hvac_mode:['hvac_mode'],set_temperature:['temperature','target_temp_low','target_temp_high','hvac_mode'],set_fan_mode:['fan_mode'],set_percentage:['percentage'],set_preset_mode:['preset_mode'],open_cover:[],close_cover:[],stop_cover:[],set_cover_position:['position']};
const modeLabels = {heat:'Riscaldamento',cool:'Raffrescamento',heat_cool:'Auto caldo/freddo',auto:'Automatico',fan_only:'Solo ventola',dry:'Deumidifica',off:'Spento'};
function actionForm(prefix, label, hass, ids, value, optional, draft = {}) {
  const domain = ids[0]?.split('.')[0];
  const states = ids.map((id) => hass.states?.[id]).filter(Boolean);
  if (!domain) return `<fieldset><legend>${label}</legend><p>Seleziona prima un’entità.</p></fieldset>`;
  const attrs = states[0]?.attributes || {};
  const hvac = intersect(states,'hvac_modes'), fans = intersect(states,'fan_modes'), presets = intersect(states,'preset_modes');
  const available = Object.entries(commands[domain] || {}).filter(([action]) => hass.services?.[domain]?.[action])
    .filter(([action]) => action !== 'set_temperature' || states.every((s) => (s.attributes?.supported_features & 3) !== 0))
    .filter(([action]) => action !== 'set_hvac_mode' || hvac.length)
    .filter(([action]) => action !== 'set_fan_mode' || fans.length)
    .filter(([action]) => action !== 'set_preset_mode' || presets.length)
    .filter(([action]) => action !== 'set_percentage' || states.every((s) => (s.attributes?.supported_features & 1) !== 0))
    .filter(([action]) => action !== 'set_cover_position' || states.every((s) => (s.attributes?.supported_features & 4) !== 0));
  const fallback = available[0]?.[0] || '';
  const representable = !value || (value.domain === domain && available.some(([a]) => a === value.action) && Object.keys(value.data || {}).every((k) => (knownData[value.action] || []).includes(k)));
  const current = draft[`${prefix}_command`] ?? (optional && !value ? 'none' : value?.action || fallback);
  const get = (name, val = '') => draft[`${prefix}_${name}`] ?? val;
  const actionOptions = [...(optional ? [['none','Nessune azioni alla fine']] : []),...available];
  if (value && !available.some(([a]) => a === value.action)) actionOptions.push([value.action, `${value.action} (azione conservata)`]);
  const data = value?.data || {};
  const pro = get('pro', !representable ? 'on' : '') === 'on';
  let fields = '';
  if (current === 'set_temperature') {
    const range = (attrs.supported_features & 2) && !(attrs.supported_features & 1);
    const min = Math.max(...states.map((s) => s.attributes?.min_temp ?? 7));
    const max = Math.min(...states.map((s) => s.attributes?.max_temp ?? 35));
    const limits = `min="${min}" max="${max}" step="any"`;
    fields += range ? input(`${prefix}_target_temp_low`,'Temperatura minima',get('target_temp_low',data.target_temp_low),'number',limits) + input(`${prefix}_target_temp_high`,'Temperatura massima',get('target_temp_high',data.target_temp_high),'number',limits) : input(`${prefix}_temperature`,'Temperatura',get('temperature',data.temperature ?? attrs.temperature ?? 20),'number',limits);
    fields += choice(`${prefix}_hvac_mode`,'Modalità', [['','Non cambiare modalità'],...hvac.map((x)=>[x,modeLabels[x] || x])],get('hvac_mode',data.hvac_mode || ''));
  }
  if (current === 'set_hvac_mode') fields += choice(`${prefix}_hvac_mode`,'Modalità',hvac.map((x)=>[x,modeLabels[x] || x]),get('hvac_mode',data.hvac_mode || hvac[0]));
  if (current === 'set_fan_mode') fields += choice(`${prefix}_fan_mode`,'Velocità ventola',fans.map((x)=>[x,x]),get('fan_mode',data.fan_mode || fans[0]));
  if (current === 'set_preset_mode') fields += choice(`${prefix}_preset_mode`,'Preset',presets.map((x)=>[x,x]),get('preset_mode',data.preset_mode || presets[0]));
  if (current === 'set_percentage' || current === 'set_cover_position') {
    const key = current === 'set_percentage' ? 'percentage' : 'position';
    fields += input(`${prefix}_${key}`,current === 'set_percentage' ? 'Velocità (%)' : 'Posizione (%)',get(key,data[key] ?? 50),'number','min="0" max="100" step="1"');
  }
  if (domain === 'light' && current === 'turn_on') {
    const modes = states.map((s) => s.attributes?.supported_color_modes || []);
    if (modes.every((m) => m.some((x) => !['onoff','unknown'].includes(x)))) fields += input(`${prefix}_brightness_pct`,'Luminosità % (vuoto = non cambiare)',get('brightness_pct',data.brightness_pct ?? (data.brightness === undefined ? '' : Math.round(data.brightness / 255 * 100))),'number','min="0" max="100"');
    const colors = [['','Non cambiare colore']];
    if (modes.every((m) => m.some((x) => ['hs','xy','rgb','rgbw','rgbww'].includes(x)))) colors.push(['rgb','Colore']);
    if (modes.every((m) => m.includes('color_temp'))) colors.push(['kelvin','Temperatura colore']);
    const colorMode = get('color_mode',data.rgb_color ? 'rgb' : data.color_temp_kelvin ? 'kelvin' : '');
    if (colors.length > 1) fields += choice(`${prefix}_color_mode`,'Colore',colors,colorMode);
    if (colorMode === 'rgb') fields += input(`${prefix}_color`,'Colore',get('color',data.rgb_color ? '#'+data.rgb_color.map((v)=>v.toString(16).padStart(2,'0')).join('') : '#ffffff'),'color');
    if (colorMode === 'kelvin') fields += input(`${prefix}_color_temp_kelvin`,'Temperatura colore (K)',get('color_temp_kelvin',data.color_temp_kelvin ?? 3000),'number',`min="${Math.max(...states.map((s)=>s.attributes?.min_color_temp_kelvin ?? 2000))}" max="${Math.min(...states.map((s)=>s.attributes?.max_color_temp_kelvin ?? 6500))}"`);
  }
  return `<fieldset data-action="${prefix}" data-domain="${E(domain)}"><legend>${label}</legend>${choice(`${prefix}_command`,'Comando',actionOptions,current)}${pro ? '<p>Azione personalizzata conservata in modalità Pro.</p>' : ''}<div ${pro ? 'hidden' : ''}>${fields}</div><details><summary>Pro · azione personalizzata</summary>${check(`${prefix}_pro`,'Usa JSON al posto dei controlli',pro)}<label>Azione JSON<textarea name="${prefix}_json" rows="4">${E(get('json',JSON.stringify(value ? {domain:value.domain,action:value.action,data:value.data} : {domain,action:fallback,data:{}},null,2)))}</textarea></label></details></fieldset>`;
}
function readAction(form, prefix, domain) {
  const val = (key) => form.elements[`${prefix}_${key}`]?.value;
  if (form.elements[`${prefix}_pro`]?.checked) {
    const a = JSON.parse(val('json'));
    if (!a || a.domain !== domain || !a.action || !a.data || typeof a.data !== 'object' || Array.isArray(a.data)) throw new Error('Azione Pro non valida per le entità selezionate.');
    if (['entity_id','device_id','area_id'].some((k)=>k in a.data)) throw new Error('Il target è già definito dalle entità selezionate.');
    return {domain:a.domain,action:a.action,data:a.data};
  }
  const action = val('command');
  if (action === 'none') return null;
  if (!action) throw new Error('Seleziona un comando disponibile.');
  const data = {};
  for (const key of knownData[action] || []) {
    if (['rgb_color','brightness'].includes(key)) continue;
    if (key === 'color_temp_kelvin' && val('color_mode') !== 'kelvin') continue;
    const v = val(key);
    if (v !== undefined && v !== '') data[key] = ['hvac_mode','fan_mode','preset_mode'].includes(key) ? v : Number(v);
  }
  if (domain === 'light' && action === 'turn_on' && val('color_mode') === 'rgb') data.rgb_color = val('color').slice(1).match(/../g).map((v)=>parseInt(v,16));
  const required = {set_hvac_mode:['hvac_mode'],set_fan_mode:['fan_mode'],set_preset_mode:['preset_mode'],set_percentage:['percentage'],set_cover_position:['position']}[action] || [];
  if (required.some((key)=>data[key] === undefined || data[key] === '')) throw new Error('Completa i parametri del comando selezionato.');
  if (action === 'set_temperature' && data.temperature === undefined && (data.target_temp_low === undefined || data.target_temp_high === undefined)) throw new Error('Inserisci la temperatura richiesta.');
  if (Object.values(data).some((v)=>typeof v === 'number' && !Number.isFinite(v))) throw new Error('Inserisci un valore numerico valido.');
  return {domain,action,data};
}
const blankCondition = () => ({operator:'available',entity_id:'',value:null,lower:null,upper:null,children:[],minimum_duration_seconds:null,hysteresis:null});
const operators = [['available','Entità disponibile'],['state_equals','Stato uguale a'],['state_not_equals','Stato diverso da'],['numeric_greater','Maggiore di'],['numeric_greater_or_equal','Maggiore o uguale'],['numeric_less','Minore di'],['numeric_less_or_equal','Minore o uguale'],['numeric_range','Compreso tra'],['and','Tutte le condizioni (E)'],['or','Almeno una condizione (O)']];
function conditionForm(node, path = 'condition') {
  if (!node) return '<p>Nessuna condizione</p><button type="button" data-command="addCondition">＋ Condizione</button>';
  const op = node.operator, logical = ['and','or'].includes(op), numeric = op.startsWith('numeric_');
  return `<fieldset data-condition="${path}">${choice(`${path}_operator`,'Condizione',operators,op)}${logical ? node.children.map((n,i)=>conditionForm(n,`${path}.${i}`)).join('')+`<button type="button" data-command="addConditionChild" data-id="${path}">＋ Regola</button>` : input(`${path}_entity_id`,'Entità',node.entity_id,'text','list="sc-condition-entities"') + (op === 'numeric_range' ? input(`${path}_lower`,'Minimo',node.lower,'number','step="any"') + input(`${path}_upper`,'Massimo',node.upper,'number','step="any"') : op === 'available' ? '' : input(`${path}_value`,'Valore',node.value,numeric ? 'number' : 'text',numeric ? 'step="any"' : ''))}${input(`${path}_minimum_duration_seconds`,'Durata minima (secondi, facoltativa)',node.minimum_duration_seconds,'number','min="0" step="any"')}${numeric ? input(`${path}_hysteresis`,'Isteresi (facoltativa)',node.hysteresis,'number','min="0" step="any"') : ''}<button type="button" data-command="removeCondition" data-id="${path}">Rimuovi</button></fieldset>`;
}
function readCondition(form,path='condition') {
  const element = form.elements[`${path}_operator`]; if (!element) return null;
  const op = element.value, logical = ['and','or'].includes(op), numeric=op.startsWith('numeric_');
  const v=(key)=>form.elements[`${path}_${key}`]?.value ?? '';
  const n=(key)=>v(key)==='' ? null : Number(v(key));
  const children=[];
  for(let i=0;form.elements[`${path}.${i}_operator`];i++) children.push(readCondition(form,`${path}.${i}`));
  return {operator:op,entity_id:logical ? null : v('entity_id'),value:logical || ['available','numeric_range'].includes(op) ? null : numeric ? n('value') : v('value'),lower:op==='numeric_range'?n('lower'):null,upper:op==='numeric_range'?n('upper'):null,children:logical ? (children.length ? children : [blankCondition(),blankCondition()]) : [],minimum_duration_seconds:n('minimum_duration_seconds'),hysteresis:numeric ? n('hysteresis') : null};
}
function notificationForm(prefix,label,value,hass,draft={}) {
  const enabled = draft[`${prefix}_enabled`] === undefined ? !!value : draft[`${prefix}_enabled`] === 'on';
  const services = ['persistent_notification.create',...Object.keys(hass.services?.notify || {}).map((x)=>`notify.${x}`)];
  if(value && !services.includes(value.action)) services.push(value.action);
  return `<fieldset><legend>${label}</legend>${check(`${prefix}_enabled`,'Abilita notifica',enabled)}<div ${enabled ? '' : 'hidden'}>${choice(`${prefix}_action`,'Destinazione',services.map((x)=>[x,x==='persistent_notification.create'?'Notifica in Home Assistant':x]),draft[`${prefix}_action`] ?? value?.action ?? services[0])}${input(`${prefix}_title`,'Titolo',draft[`${prefix}_title`] ?? value?.title ?? '')}${input(`${prefix}_message`,'Messaggio',draft[`${prefix}_message`] ?? value?.message ?? '')}</div></fieldset>`;
}
function readNotification(form,prefix) {
  return form.elements[`${prefix}_enabled`]?.checked ? {action:form.elements[`${prefix}_action`].value,title:form.elements[`${prefix}_title`].value,message:form.elements[`${prefix}_message`].value} : null;
}
function slotsForm(slots) {
  return slots.map((slot,i)=>`<fieldset data-slot="${i}"><legend>Fascia ${i+1}</legend><div class="sc-days">${['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map((d,day)=>`<label class="sc-check"><input type="checkbox" name="slot_${i}_days" value="${day}" ${slot.weekdays.includes(day)?'checked':''}>${d}</label>`).join('')}</div>${input(`slot_${i}_start`,'Dalle',slot.start,'time')}${input(`slot_${i}_end`,'Alle',slot.end,'time')}<button type="button" data-command="removeSlot" data-id="${i}">Rimuovi fascia</button></fieldset>`).join('')+'<button type="button" data-command="addSlot">＋ Fascia</button>';
}
function readSlots(form) {
  return [...form.querySelectorAll('[data-slot]')].map((node)=>{const i=node.dataset.slot;return {weekdays:[...node.querySelectorAll('input[type=checkbox]:checked')].map((x)=>Number(x.value)),start:form.elements[`slot_${i}_start`].value,end:form.elements[`slot_${i}_end`].value};});
}




const STYLE = "        [role=\"button\"]:focus-visible{outline:2px solid var(--primary-color,#03a9f4);outline-offset:2px;border-radius:6px}\n        :host{display:block;font-family:var(--primary-font-family,sans-serif)}\n        ha-card{padding:14px 16px 8px}\n        .card-header{display:flex;flex-direction:column;gap:0;margin-bottom:0}\n        .hdr-row1{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}\n        .hdr-row2{display:flex;flex-wrap:nowrap;gap:6px;align-items:center;margin-bottom:6px;padding-bottom:6px;overflow-x:auto;scrollbar-width:none}\n        .hdr-row2::-webkit-scrollbar{display:none}\n        .hdr-sep{height:1px;background:var(--divider-color,#e0e0e0);margin-bottom:10px}\n        .card-title{font-size:.95em;font-weight:500;color:var(--primary-text-color)}\n        .hdr-icons{display:flex;gap:8px;align-items:center}\n        .btn-icon,.btn-groups,.btn-layout-toggle{width:32px;height:32px;border-radius:50%;background:var(--secondary-background-color,#f5f5f5);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--secondary-text-color);padding:0;flex-shrink:0;transition:all .15s}\n        .btn-icon:hover,.btn-groups:hover,.btn-layout-toggle:hover{background:color-mix(in srgb,var(--primary-color,#03a9f4) 10%,transparent);color:var(--primary-color,#03a9f4)}\n        .btn-hdr{padding:4px 12px;border-radius:8px;border:1px solid var(--divider-color,#ccc);background:none;cursor:pointer;font-size:.78em;color:var(--primary-text-color)}\n        .btn-hdr:hover{background:var(--divider-color,#e0e0e0)}\n        .profile-status-bar{font-size:.68em;color:var(--secondary-text-color);display:flex;align-items:center;gap:4px;flex-wrap:wrap;padding:2px 0 4px}\n        .psb-active{color:#4CAF50;font-weight:600}\n        .psb-activate-btn{background:none;border:none;cursor:pointer;font-size:1em;color:var(--primary-color,#03a9f4);padding:0;text-decoration:underline;font-family:inherit}\n        .ent-legend{display:flex;flex-wrap:wrap;gap:8px 16px;padding:8px 0 4px;border-top:1px solid var(--divider-color,#e0e0e0);margin-top:8px}\n        .ent-legend-item{display:flex;align-items:center;gap:4px;font-size:.72em;color:var(--secondary-text-color)}\n        .ent-legend-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}\n        .tab-bar{display:flex;margin-bottom:12px;border-bottom:2px solid var(--divider-color,#e0e0e0);overflow-x:auto}\n        .tab{padding:6px 16px;font-size:.82em;font-weight:600;cursor:pointer;color:var(--secondary-text-color);border-bottom:2px solid transparent;margin-bottom:-2px;white-space:nowrap;user-select:none}\n        .tab.active{color:var(--primary-color,#03a9f4);border-bottom-color:var(--primary-color,#03a9f4)}\n        .tab-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;vertical-align:middle}\n        .grid{display:grid;grid-template-columns:36px repeat(7,1fr);gap:6px}\n        .hdr-cell{text-align:center;font-size:.68em;font-weight:700;color:var(--secondary-text-color);padding:4px 0;text-transform:uppercase;letter-spacing:.05em}\n        .time-axis{position:relative;height:480px}\n        .time-lbl{position:absolute;right:4px;font-size:.6em;color:var(--secondary-text-color);transform:translateY(-50%);white-space:nowrap}\n        .day-column{position:relative;height:480px;background:color-mix(in srgb,var(--divider-color,#e0e0e0) 78%,var(--secondary-text-color,#9e9e9e) 22%);border-radius:6px;overflow:hidden;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.06)}\n        .day-column:hover{background:color-mix(in srgb,var(--primary-color,#03a9f4) 8%,var(--divider-color,#e0e0e0))}\n        .sub-col{position:absolute;top:0;bottom:0}\n        .sub-col:hover{background:rgba(255,255,255,.08)}\n        .sub-divider{position:absolute;top:0;left:0;width:1px;height:100%;background:rgba(255,255,255,.35);z-index:1;pointer-events:none}\n        @keyframes block-pulse{0%,100%{box-shadow:inset 0 0 0 1px var(--blk-glow-soft)}50%{box-shadow:inset 0 0 0 2px var(--blk-glow-soft),0 0 6px var(--blk-glow-soft)}}\n        .block{position:absolute;left:0;right:0;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:filter .15s;overflow:hidden;border-radius:4px;border-left:3px solid rgba(255,255,255,.35);box-sizing:border-box;opacity:.72}\n        .block:hover{filter:brightness(.84);opacity:1}\n        .block.active{animation:block-pulse 2s infinite ease-in-out;opacity:.9!important;z-index:2}\n        .block.off{opacity:.5;background-image:repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(255,255,255,.15) 4px,rgba(255,255,255,.15) 6px)}\n        .block.muted,.gantt-block.muted{background-image:repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(255,152,0,.5) 4px,rgba(255,152,0,.5) 8px)!important;outline:2px dashed #FF9800;outline-offset:-2px;animation:none!important;opacity:.85!important}\n        .blk-muted-ico{position:absolute;top:1px;left:2px;--mdi-icon-size:13px;color:#FF9800;z-index:3;pointer-events:none;filter:drop-shadow(0 1px 1px rgba(0,0,0,.5))}\n        .blk-stop{position:absolute;bottom:2px;right:2px;--mdi-icon-size:12px;color:inherit;opacity:.85;pointer-events:none;line-height:1}\n        .add-hint{position:absolute;bottom:6px;right:0;left:0;text-align:center;font-size:1.1em;color:var(--secondary-text-color);opacity:0;pointer-events:none;transition:opacity .15s}\n        .day-column:hover .add-hint,.sub-col:hover .add-hint{opacity:.5}\n        .gantt{display:flex;flex-direction:column}\n        .gantt-hdr{display:flex;margin-bottom:4px}\n        .gantt-day-col{width:46px;flex-shrink:0}\n        .gantt-axis{position:relative;flex:1;height:18px}\n        .gantt-tick{position:absolute;font-size:.58em;color:var(--secondary-text-color);transform:translateX(-50%);white-space:nowrap;top:0}\n        .gantt-vline{position:absolute;top:0;bottom:0;width:1px;background:var(--divider-color,#e0e0e0);pointer-events:none}\n        .gantt-day{display:flex;border-bottom:1px solid var(--divider-color,#e0e0e0)}\n        .gantt-day:last-child{border-bottom:none}\n        .gantt-day-lbl{width:46px;flex-shrink:0;font-size:.72em;font-weight:600;color:var(--secondary-text-color);display:flex;align-items:center;padding:4px 0}\n        .gantt-rows{flex:1;display:flex;flex-direction:column;gap:2px;padding:4px 0}\n        .gantt-row{display:flex;align-items:center;height:32px;border-radius:4px;overflow:hidden;padding-left:4px;cursor:pointer;background:var(--divider-color,#f5f5f5);position:relative}\n        .gantt-row:hover{background:color-mix(in srgb,var(--primary-color,#03a9f4) 6%,var(--divider-color,#f5f5f5))}\n        .gantt-ent-spacer{width:64px;flex-shrink:0}\n        .gantt-ent-lbl{font-size:.62em;font-weight:600;color:var(--secondary-text-color);width:64px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n        .gantt-area{flex:1;position:relative;height:100%}\n        .gantt-block{position:absolute;top:3px;bottom:3px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:.65em;font-variant-numeric:tabular-nums;font-weight:600;color:white;text-shadow:0 1px 2px rgba(0,0,0,.4);cursor:pointer;overflow:hidden;min-width:4px;border-left:3px solid rgba(255,255,255,.4);box-sizing:border-box;opacity:.88}\n        .gantt-block:hover{filter:brightness(.84);opacity:1}\n        .gantt-block.active{animation:block-pulse 2s infinite ease-in-out;opacity:1!important;z-index:2}\n        @media (prefers-reduced-motion: reduce){\n          .block.active,.gantt-block.active{animation:none!important;box-shadow:0 0 0 2px var(--blk-glow,var(--primary-color,#03a9f4)),0 0 6px var(--blk-glow-soft,transparent)}\n        }\n        .gantt-block.off{opacity:.5;background-image:repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(255,255,255,.15) 4px,rgba(255,255,255,.15) 6px)}\n        .gantt-add{position:absolute;right:4px;top:50%;transform:translateY(-50%);font-size:.9em;color:var(--secondary-text-color);opacity:0;pointer-events:none}\n        .gantt-row:hover .gantt-add{opacity:.5}\n        .legend{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}\n        .legend-item{display:flex;align-items:center;gap:4px;font-size:.75em;color:var(--primary-text-color);cursor:pointer}\n        .legend-dot{width:12px;height:12px;border-radius:50%;flex-shrink:0}\n        .chip-wrap{position:relative;flex-shrink:0}\n        .profile-chip{display:flex;position:relative;align-items:center;gap:5px;padding:2px 8px 2px 9px;height:24px;border-radius:13px;border:1.5px solid color-mix(in srgb,var(--pchip-color,#03a9f4) 30%,var(--divider-color,#ccc));border-left:3px solid var(--pchip-color,#03a9f4);background:linear-gradient(90deg,color-mix(in srgb,var(--pchip-color,#03a9f4) 22%,transparent) 0%,transparent 60%);cursor:pointer;font-size:.68em;color:var(--primary-text-color);user-select:none;transition:all .15s;box-sizing:border-box;flex-shrink:0}\n        .profile-chip:hover{border-color:color-mix(in srgb,var(--pchip-color,#03a9f4) 55%,var(--divider-color,#ccc));border-left-color:var(--pchip-color,#03a9f4);background:linear-gradient(90deg,color-mix(in srgb,var(--pchip-color,#03a9f4) 32%,transparent) 0%,transparent 65%)}\n        .profile-chip.viewed{background:linear-gradient(90deg,color-mix(in srgb,var(--pchip-color,#03a9f4) 30%,transparent) 0%,color-mix(in srgb,var(--pchip-color,#03a9f4) 5%,transparent) 70%);border-color:color-mix(in srgb,var(--pchip-color,#03a9f4) 45%,var(--divider-color,#ccc));font-weight:600}\n        .profile-chip.active-op{border-left-width:4px;box-shadow:0 1px 6px color-mix(in srgb,var(--pchip-color,#03a9f4) 30%,transparent)}\n        .profile-chip.active-op::after{content:'';position:absolute;left:5px;right:5px;bottom:-5px;height:4px;border-radius:50%;background:var(--success-color,#4CAF50)}\n        .profile-chip.viewed.active-op{background:linear-gradient(90deg,color-mix(in srgb,var(--pchip-color,#03a9f4) 42%,transparent) 0%,color-mix(in srgb,var(--pchip-color,#03a9f4) 8%,transparent) 75%);border-color:var(--pchip-color,#03a9f4);font-weight:600;box-shadow:0 1px 8px color-mix(in srgb,var(--pchip-color,#03a9f4) 34%,transparent)}\n        .chip-act-dot{width:7px;height:7px;border-radius:50%;background:#4CAF50;flex-shrink:0;box-shadow:0 0 4px color-mix(in srgb,#4CAF50 60%,transparent)}\n        .chip-lock{opacity:.55;flex-shrink:0;color:currentColor}\n        .chip-activate{display:flex;align-items:center;justify-content:center;width:17px;height:17px;border-radius:50%;background:none;border:none;cursor:pointer;padding:0;margin-left:1px;color:#4CAF50;transition:background .12s,color .12s}\n        .chip-activate.on{color:var(--secondary-text-color)}\n        .chip-activate:hover{background:color-mix(in srgb,currentColor 16%,transparent)}\n        .chip-menu{display:flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;background:none;border:none;cursor:pointer;padding:0;color:inherit;opacity:.55;transition:background .12s,opacity .12s}\n        .chip-menu:hover{opacity:1;background:color-mix(in srgb,currentColor 14%,transparent)}\n        .chip-dropdown{display:none;position:fixed;z-index:100;background:var(--card-background-color,#fff);border:1px solid var(--divider-color,#ccc);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.15);min-width:130px;overflow:hidden}\n        .chip-dropdown.open{display:block}\n        .chip-dd-item{padding:8px 14px;font-size:.8em;cursor:pointer;color:var(--primary-text-color);white-space:nowrap}\n        .chip-dd-item:hover{background:var(--divider-color,#e0e0e0)}\n        .chip-dd-item.disabled{opacity:.38;pointer-events:none}\n        .chip-add{height:24px;padding:0 9px;border-radius:13px;border:1.5px dashed var(--divider-color,#ccc);background:none;cursor:pointer;font-size:.8em;color:var(--secondary-text-color);line-height:1;display:flex;align-items:center;flex-shrink:0;transition:all .12s}\n        .chip-add:hover{border-color:var(--primary-color,#03a9f4);color:var(--primary-color,#03a9f4)}\n        .empty-title{font-size:1em;font-weight:600;color:var(--primary-text-color)}\n        .empty-sub{font-size:.85em;color:var(--secondary-text-color);max-width:320px;line-height:1.5}\n        .btn-setup{padding:10px 24px;border-radius:10px;background:var(--primary-color,#03a9f4);color:white;border:none;cursor:pointer;font-size:.88em;font-weight:600}\n        .ha-card-empty{padding:28px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px}\n.day-column,.block,.gantt-row,.gantt-block,.profile-chip{cursor:default}\n.status{font-size:.78em;color:var(--secondary-text-color);margin:8px 0}.error{color:var(--error-color,#f44336)}\n.read-only{font-size:.72em;color:var(--secondary-text-color);padding:4px 8px;border:1px solid var(--divider-color,#ccc);border-radius:8px}\n.sc-entry{border-left:3px solid var(--pchip-color,#03a9f4);margin:4px 0;padding:7px 10px;border-radius:5px;background:var(--secondary-background-color,#f5f5f5);font-size:.8em}\n.sc-meta{font-size:.85em;color:var(--secondary-text-color)}.sc-list{padding:0;margin:10px 0;list-style:none}\n.sc-heading{font-size:.8em;font-weight:600;margin:12px 0 5px}\n.sc-week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px;margin-top:12px}\n.sc-day{min-width:0;background:var(--secondary-background-color,#f5f5f5);border-radius:6px;padding:6px}\n.sc-day strong{font-size:.68em;color:var(--secondary-text-color)}\n.sc-slot{margin-top:5px;padding:5px;border-radius:4px;background:color-mix(in srgb,var(--pchip-color,#03a9f4) 20%,var(--card-background-color,#fff));border-left:3px solid var(--pchip-color,#03a9f4);font-size:.68em;overflow-wrap:anywhere}\n.sc-empty{padding:20px 0;color:var(--secondary-text-color);font-size:.83em;text-align:center}\n";
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
    this.shadowRoot.addEventListener('input', (e) => {
      if (!e.target.closest('form')) return;
      this.changedFields?.add(e.target.name);
      this.capture();
      if (e.target.name === 'entity_search') {
        const query = e.target.value.toLowerCase();
        this.shadowRoot.querySelectorAll('[data-entity-label]').forEach((node) => { node.hidden = !node.dataset.entityLabel.includes(query); });
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
    form.querySelectorAll('[data-entity-label]').forEach((node) => { node.hidden = !node.dataset.entityLabel.includes(query); });
  }
  render() {
    if (!this.config) return;
    const focused = this.shadowRoot.activeElement;
    const openSections = new Set([...this.shadowRoot.querySelectorAll('details[open]')].map((node)=>node.querySelector('summary')?.textContent));
    const focusName = focused?.name;
    const selection = focused?.selectionStart;
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
    const editable = this._hass?.user?.is_admin === true && writeError?.code !== 'unauthorized';
    const view = state ? `<div class="profile-status-bar">${profile ? `${esc(profile.name)} · ${profile.active ? 'attivo' : 'inattivo'} · ${esc(profile.profile_type)}` : 'Nessun profilo'} · ${state.runtime_summary?.active_leases ?? 0} lease attive · ${state.quick_timers?.length ?? 0} timer attivi</div>
      <div class="tab-bar">${tabs}</div>${schedules.length ? `<div class="sc-week">${slots}</div><div class="sc-heading">Schedule</div><ul class="sc-list">${schedules.map((s) => `<li class="sc-entry">${esc(s.name)} · ${esc(s.target_entity_ids.join(', '))}${s.enabled ? '' : ' · spento'} ${editable ? button('editSchedule', 'Modifica', s.id) + button('deleteSchedule', 'Elimina', s.id) : ''}</li>`).join('')}</ul>` : '<div class="sc-empty">Nessuno schedule in questa vista</div>'}
      ${editable ? `<div class="sc-controls">${button('newProfile', '＋ Profilo')}${profile ? `${button('editProfile', 'Modifica profilo', profile.id)}${button('toggleProfile', profile.active ? 'Disattiva' : 'Attiva', profile.id)}${button('deleteProfile', 'Elimina profilo', profile.id)}${button('newGroup', '＋ Gruppo')}` : ''}${group ? `${button('editGroup', 'Modifica gruppo', group.id)}${button('deleteGroup', 'Elimina gruppo', group.id)}${button('newSchedule', '＋ Schedule')}` : ''}${button('newTimer', '＋ Quick Timer')}</div>` : '<p>Vista in sola lettura: serve un amministratore per modificare.</p>'}
      ${this.edit && editable ? this.editor(config, profile, group) : ''}
      <section class="sc-operational"><h3>Stato operativo</h3>${(state.operational?.occurrences || []).map((x) => `<p>${esc(config.schedules?.find((s) => s.id === x.schedule_id)?.name || x.schedule_id)}: ${esc(x.state)}, condizione ${esc(x.condition_branch)}, termine ${esc(x.end_utc)}</p>`).join('') || '<p>Nessuna fascia attiva.</p>'}${(state.operational?.leases || []).map((x) => `<p>${esc(x.entity_id)}: ${esc(x.state)} (${esc(x.controller_type)})</p>`).join('')}${(state.quick_timers || []).map((x) => `<p>Timer ${esc(x.entity_id)}: <span data-expiry="${esc(x.expires_at)}"></span> (${esc(x.state)}) ${editable ? button('cancelTimer', 'Annulla', x.id) : ''}</p>`).join('')}<p>Motivo di eventuali rifiuti: stato non disponibile.</p></section>` : '';
    this.shadowRoot.innerHTML = `<style>${STYLE}</style><style>[hidden]{display:none!important}.sc-check{display:flex!important;align-items:center;gap:5px}.sc-check input{width:auto!important}details{margin:8px 0}.sc-week{overflow-x:auto;grid-template-columns:repeat(7,minmax(90px,1fr))}.sc-controls,.sc-actions{display:flex;flex-wrap:wrap;gap:6px;margin:12px}.sc-controls button,.sc-actions button,.sc-entry button{border:1px solid var(--divider-color,#aaa);border-radius:7px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#222);padding:7px;cursor:pointer}.sc-editor{padding:14px;border-top:1px solid var(--divider-color,#aaa);display:grid;gap:10px}.sc-editor label{display:grid;gap:4px}.sc-editor input,.sc-editor select,.sc-editor textarea{box-sizing:border-box;width:100%;max-width:100%;padding:7px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#222);border:1px solid var(--divider-color,#aaa);border-radius:5px}.sc-editor fieldset{min-width:0}.sc-entities{max-height:160px;overflow:auto;display:grid;gap:4px}.sc-entities label,.sc-days label{display:inline-flex;align-items:center;gap:5px}.sc-entities input,.sc-days input{width:auto}.sc-days{display:flex;flex-wrap:wrap;gap:9px}.sc-operational{padding:12px}.sc-error{color:var(--error-color,#b33);padding:10px}.sc-entities label[hidden],[hidden]{display:none!important}</style><ha-card style="--pchip-color:${tint(profile?.color)}"><div class="card-header"><div class="hdr-row1"><span class="card-title">${esc(this.config.title || 'Schedule Creator')}</span></div><div class="hdr-row2">${chips}</div><div class="hdr-sep"></div></div>${status}${info ? `<p class="sc-error" role="alert">${esc(typeof info === 'string' ? info : messageFor(info))}</p>` : ''}${view}</ha-card>`;
    this.restoreDraft(); this.updateClock();
    this.shadowRoot.querySelectorAll('details').forEach((node)=>{node.open=openSections.has(node.querySelector('summary')?.textContent);});
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
    return `<label>Ricerca entità<input type="search" name="entity_search" placeholder="Nome, dominio o ID"></label><div class="sc-entities">${ids.sort().map((id) => `<label data-entity-label="${esc(`${id} ${states[id]?.attributes?.friendly_name || ''}`.toLowerCase())}"><input type="checkbox" name="entities" value="${esc(id)}" ${selected.includes(id) ? 'checked' : ''}>${esc(states[id]?.attributes?.friendly_name || id)} · ${esc(id)}${controllable(this._hass,id)?'':' · non disponibile/supportata'}</label>`).join('')}</div>`;
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
    return `<form data-editor="${esc(kind)}" class="sc-editor"><h3>${id ? 'Modifica' : 'Nuovo'} ${esc(kind)}</h3>${content}<div class="sc-actions"><button type="submit">Salva</button>${button('close','Chiudi')}</div></form>`;
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
      this.draft = null; this.localError = null; this.render(); return;
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
