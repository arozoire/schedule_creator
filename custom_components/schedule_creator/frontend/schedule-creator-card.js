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
// Convert persisted, server-owned nested records into editable API payloads.
const clean = (value) => {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.entries(value).filter(([key]) => !['id', 'schema_version', 'revision', 'created_at', 'updated_at'].includes(key))
      .map(([key, child]) => [key, key === 'data' ? structuredClone(child) : clean(child)]),
  );
  return value;
};

const messageFor = (error) => {
  const operation = error?.operation;
  if (error?.acknowledged) {
    return 'Home Assistant ha confermato il salvataggio, ma la card non è riuscita ad aggiornare la vista. Ricarica la dashboard prima di riprovare.';
  }
  if (operation && error?.code === 'unknown_command') {
    return `Home Assistant ha rifiutato ${operation} (${error?.code || error?.message}). Aggiorna l’integrazione Schedule Creator, riavvia completamente Home Assistant e riprova. Se persiste, comunica questo comando e controlla i log dell’integrazione.`;
  }
  if (/method not implemented/i.test(error?.message || '')) {
    return 'Salvataggio non riuscito: una funzione ha restituito “Method not implemented”. La bozza è conservata. Apri “Dettagli errore” e invia il testo per individuare il passaggio che fallisce.';
  }
  return ({
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
  })[error?.code] || (operation ? `Operazione ${operation} non riuscita (${error?.code || error?.message || 'errore sconosciuto'}). Controlla i log di Home Assistant.` : error?.message || 'Operazione non riuscita. Controlla i log di Home Assistant.');
};

function diagnosticFor(error, { cardVersion, haVersion, phase, operation } = {}) {
  return [
    `Schedule Creator: ${cardVersion || 'non disponibile'}`,
    `Home Assistant: ${haVersion || 'non disponibile'}`,
    `Fase: ${error?.phase || phase || 'non disponibile'}`,
    `Operazione: ${error?.operation || operation || 'non disponibile'}`,
    `Conferma del server: ${error?.acknowledged ? 'ricevuta' : 'non ricevuta'}`,
    `Codice: ${error?.code || 'non disponibile'}`,
    `Errore: ${error?.name ? `${error.name}: ` : ''}${error?.message || String(error)}`,
    error?.stack ? `Traccia:\n${String(error.stack).split('\n').slice(0, 12).join('\n')}` : 'Traccia: non disponibile',
  ].join('\n');
}

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




const STYLE = ":host {\n  display: block;\n  font-family: var(--primary-font-family, Arial, sans-serif);\n  color: var(--primary-text-color, #202a35);\n  container-type: inline-size;\n  --sc-accent: var(--primary-color, #00897b);\n  --sc-muted: var(--secondary-text-color, #647180);\n  --sc-surface: var(--secondary-background-color, #f4f6f8);\n  --sc-border: var(--divider-color, #dce2e7);\n}\n* {\n  box-sizing: border-box;\n}\nha-card {\n  display: block;\n  overflow: hidden;\n  padding: 24px;\n  border-radius: var(--ha-card-border-radius, 20px);\n  background: var(--card-background-color, #fff);\n}\nbutton,\ninput,\nselect,\ntextarea {\n  font: inherit;\n  color: inherit;\n}\nbutton {\n  min-height: 40px;\n  padding: 9px 14px;\n  border: 1px solid var(--sc-border);\n  border-radius: 10px;\n  background: var(--card-background-color, #fff);\n  cursor: pointer;\n  line-height: 1.3;\n  transition:\n    background 0.15s,\n    border-color 0.15s;\n}\nbutton:hover {\n  background: var(--sc-surface);\n  border-color: var(--sc-accent);\n}\nbutton:disabled {\n  opacity: 0.5;\n  cursor: wait;\n}\nbutton:focus-visible,\ninput:focus-visible,\nselect:focus-visible,\ntextarea:focus-visible,\nsummary:focus-visible {\n  outline: 3px solid var(--sc-accent);\n  outline-offset: 3px;\n}\nbutton[data-command^=\"delete\"],\nbutton[data-command^=\"remove\"] {\n  color: var(--error-color, #b3261e);\n}\nbutton[data-command=\"newSchedule\"],\n.sc-actions button[type=\"submit\"] {\n  background: var(--sc-accent);\n  color: var(--text-primary-color, #fff);\n  border-color: var(--sc-accent);\n  font-weight: 600;\n}\n.card-header {\n  margin-bottom: 20px;\n}\n.hdr-row1 {\n  display: flex;\n  gap: 12px;\n  align-items: center;\n  margin-bottom: 20px;\n}\n.card-title {\n  font-size: 1.4rem;\n  font-weight: 700;\n  letter-spacing: -0.03em;\n}\n.sc-version {\n  margin-left: auto;\n  color: var(--sc-muted);\n  font-size: 0.72rem;\n  border: 1px solid var(--sc-border);\n  border-radius: 20px;\n  padding: 4px 8px;\n}\n.sc-eyebrow {\n  font-size: 0.7rem;\n  font-weight: 700;\n  letter-spacing: 0.1em;\n  text-transform: uppercase;\n  color: var(--sc-muted);\n  margin: 0 0 8px;\n}\n.hdr-row2 {\n  display: flex;\n  gap: 8px;\n  overflow-x: auto;\n  padding: 3px 2px 8px;\n}\n.profile-chip {\n  flex-shrink: 0;\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  border-radius: 24px;\n  color: var(--sc-muted);\n}\n.profile-chip.viewed {\n  color: var(--primary-text-color, #202a35);\n  border-color: var(--pchip-color);\n  background: color-mix(\n    in srgb,\n    var(--pchip-color) 12%,\n    var(--card-background-color, #fff)\n  );\n  font-weight: 600;\n}\n.profile-chip.active-op::before {\n  content: \"\";\n  width: 7px;\n  height: 7px;\n  border-radius: 50%;\n  background: var(--success-color, #388e3c);\n}\n.profile-status-bar {\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 8px;\n  font-size: 0.8rem;\n  color: var(--sc-muted);\n  margin: 0 0 18px;\n}\n.sc-badge {\n  display: inline-flex;\n  align-items: center;\n  padding: 5px 9px;\n  border-radius: 6px;\n  background: var(--sc-surface);\n  font-size: 0.73rem;\n  font-weight: 600;\n}\n.sc-badge.is-active {\n  color: var(--success-color, #287d39);\n  background: color-mix(\n    in srgb,\n    var(--success-color, #287d39) 10%,\n    var(--card-background-color, #fff)\n  );\n}\n.tab-bar {\n  display: flex;\n  overflow-x: auto;\n  gap: 5px;\n  border-bottom: 1px solid var(--sc-border);\n  margin-bottom: 20px;\n  padding-bottom: 8px;\n}\n.tab {\n  white-space: nowrap;\n  border-color: transparent;\n  color: var(--sc-muted);\n}\n.tab.active {\n  color: var(--sc-accent);\n  background: color-mix(\n    in srgb,\n    var(--sc-accent) 9%,\n    var(--card-background-color, #fff)\n  );\n  font-weight: 600;\n}\n.sc-toolbar,\n.sc-controls,\n.sc-actions,\n.sc-entry-actions {\n  display: flex;\n  gap: 8px;\n  flex-wrap: wrap;\n  align-items: center;\n}\n.sc-toolbar {\n  justify-content: space-between;\n  margin: 20px 0 14px;\n}\n.sc-toolbar h2 {\n  font-size: 1.05rem;\n  margin: 0;\n}\n.sc-toolbar p {\n  margin: 4px 0 0;\n  color: var(--sc-muted);\n  font-size: 0.8rem;\n}\n.sc-controls {\n  margin: 14px 0;\n}\n.sc-week {\n  display: grid;\n  grid-template-columns: repeat(7, minmax(0, 1fr));\n  gap: 7px;\n  margin: 14px 0 24px;\n}\n.sc-day {\n  min-width: 0;\n  min-height: 124px;\n  padding: 10px 7px;\n  border: 1px solid var(--sc-border);\n  border-radius: 12px;\n  background: var(--sc-surface);\n}\n.sc-day > strong {\n  display: block;\n  color: var(--sc-muted);\n  font-size: 0.72rem;\n  font-weight: 600;\n  margin: 0 2px 10px;\n}\n.sc-slot {\n  margin-top: 7px;\n  padding: 8px 7px;\n  border-radius: 6px;\n  background: var(--card-background-color, #fff);\n  border-left: 3px solid var(--pchip-color, var(--sc-accent));\n  font-size: 0.72rem;\n  overflow-wrap: anywhere;\n  line-height: 1.5;\n}\n.sc-slot time {\n  font-size: 0.66rem;\n  font-variant-numeric: tabular-nums;\n  color: var(--sc-muted);\n}\n.sc-slot.is-off {\n  opacity: 0.6;\n  border-left-style: dashed;\n}\n.sc-day-empty {\n  color: var(--sc-muted);\n  font-size: 0.72rem;\n}\n.sc-list {\n  list-style: none;\n  padding: 0;\n  margin: 12px 0 22px;\n  display: grid;\n  gap: 10px;\n}\n.sc-entry {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 14px;\n  padding: 16px;\n  border: 1px solid var(--sc-border);\n  border-radius: 12px;\n}\n.sc-entry-copy {\n  min-width: 0;\n}\n.sc-entry strong {\n  font-size: 0.9rem;\n}\n.sc-meta {\n  font-size: 0.76rem;\n  color: var(--sc-muted);\n  margin: 6px 0 0;\n  overflow-wrap: anywhere;\n  line-height: 1.5;\n}\n.sc-entry-actions {\n  flex-shrink: 0;\n}\n.sc-entry-actions button {\n  font-size: 0.76rem;\n}\n.sc-empty {\n  padding: 30px 18px;\n  border: 1px dashed var(--sc-border);\n  border-radius: 14px;\n  background: var(--sc-surface);\n  text-align: center;\n  color: var(--sc-muted);\n  font-size: 0.85rem;\n  line-height: 1.6;\n}\n.sc-empty strong {\n  display: block;\n  color: var(--primary-text-color, #202a35);\n  font-size: 1rem;\n  margin-bottom: 5px;\n}\ndetails {\n  border: 1px solid var(--sc-border);\n  border-radius: 12px;\n  padding: 12px 14px;\n  margin: 12px 0;\n}\nsummary {\n  cursor: pointer;\n  font-size: 0.82rem;\n  font-weight: 600;\n  min-height: 24px;\n  line-height: 24px;\n}\ndetails[open] > summary {\n  margin-bottom: 12px;\n}\n.sc-operational {\n  margin-top: 20px;\n  color: var(--sc-muted);\n  font-size: 0.8rem;\n}\n.sc-operational p {\n  line-height: 1.6;\n}\n.sc-editor {\n  padding: 22px;\n  margin: 20px 0;\n  border: 1px solid var(--sc-border);\n  border-radius: 16px;\n  display: grid;\n  gap: 16px;\n  background: var(--sc-surface);\n}\n.sc-editor h3 {\n  font-size: 1.15rem;\n  margin: 0;\n  letter-spacing: -0.02em;\n}\n.sc-editor p {\n  font-size: 0.8rem;\n  color: var(--sc-muted);\n  line-height: 1.6;\n  margin: 0;\n}\n.sc-editor label {\n  display: grid;\n  gap: 7px;\n  font-size: 0.8rem;\n  font-weight: 500;\n  min-width: 0;\n}\n.sc-editor input,\n.sc-editor select,\n.sc-editor textarea {\n  width: 100%;\n  max-width: 100%;\n  min-height: 44px;\n  padding: 10px 12px;\n  background: var(--card-background-color, #fff);\n  border: 1px solid var(--sc-border);\n  border-radius: 8px;\n  font-size: 0.9rem;\n}\n.sc-editor textarea {\n  font-family: monospace;\n  line-height: 1.5;\n  resize: vertical;\n}\n.sc-editor fieldset {\n  min-width: 0;\n  border: 1px solid var(--sc-border);\n  border-radius: 12px;\n  padding: 16px;\n  display: grid;\n  gap: 14px;\n  background: var(--card-background-color, #fff);\n  margin: 0;\n}\n.sc-editor legend {\n  font-size: 0.8rem;\n  font-weight: 700;\n  padding: 0 7px;\n}\n.sc-editor details {\n  margin: 0;\n  background: var(--card-background-color, #fff);\n}\n.sc-editor details > * + * {\n  margin-top: 12px;\n}\n.sc-check {\n  display: flex !important;\n  align-items: center;\n  gap: 9px !important;\n}\n.sc-editor input[type=\"checkbox\"] {\n  width: 18px !important;\n  min-height: 18px;\n  height: 18px;\n  accent-color: var(--sc-accent);\n  flex-shrink: 0;\n}\n.sc-entities {\n  max-height: 240px;\n  overflow: auto;\n  display: grid;\n  gap: 5px;\n  border: 1px solid var(--sc-border);\n  padding: 6px;\n  border-radius: 10px;\n  background: var(--card-background-color, #fff);\n}\n.sc-entities label {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  min-height: 48px;\n  padding: 8px 10px;\n  border-radius: 7px;\n  font-weight: 400;\n}\n.sc-entities label:hover {\n  background: var(--sc-surface);\n}\n.sc-entity-name {\n  display: block;\n  font-weight: 500;\n}\n.sc-entity-id {\n  display: block;\n  font-size: 0.7rem;\n  color: var(--sc-muted);\n  margin-top: 3px;\n  overflow-wrap: anywhere;\n}\n.sc-days {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 7px;\n}\n.sc-days label {\n  padding: 8px;\n  border: 1px solid var(--sc-border);\n  border-radius: 8px;\n}\n.sc-actions {\n  padding-top: 16px;\n  border-top: 1px solid var(--sc-border);\n}\n.sc-actions button {\n  min-width: 100px;\n}\n.status,\n.sc-error {\n  padding: 12px 14px;\n  border-radius: 10px;\n  font-size: 0.85rem;\n  line-height: 1.6;\n  margin: 12px 0;\n  background: var(--sc-surface);\n}\n.sc-error,\n.error {\n  color: var(--error-color, #b3261e);\n  background: color-mix(\n    in srgb,\n    var(--error-color, #b3261e) 8%,\n    var(--card-background-color, #fff)\n  );\n  overflow-wrap: anywhere;\n}\n[hidden],\n.sc-entities label[hidden] {\n  display: none !important;\n}\n@container (max-width:600px) {\n  ha-card {\n    padding: 16px;\n  }\n  .card-title {\n    font-size: 1.2rem;\n  }\n  .sc-week {\n    grid-template-columns: 1fr;\n    gap: 7px;\n  }\n  .sc-day {\n    display: grid;\n    grid-template-columns: 34px 1fr;\n    gap: 5px 9px;\n    min-height: 45px;\n    padding: 9px;\n  }\n  .sc-day > strong {\n    grid-row: 1/20;\n    margin: 5px 0;\n  }\n  .sc-slot {\n    margin: 0;\n    padding: 6px 9px;\n  }\n  .sc-slot time {\n    margin-right: 8px;\n  }\n  .sc-entry {\n    align-items: flex-start;\n    flex-direction: column;\n  }\n  .sc-entry-actions {\n    align-self: flex-end;\n  }\n  .sc-editor {\n    padding: 14px;\n  }\n  .sc-toolbar {\n    align-items: flex-start;\n  }\n  .sc-toolbar .sc-controls {\n    margin: 0;\n  }\n  .sc-days {\n    gap: 5px;\n  }\n  .sc-days label {\n    padding: 7px;\n  }\n  .sc-editor fieldset {\n    padding: 12px;\n  }\n}\n@media (prefers-reduced-motion: reduce) {\n  * {\n    transition: none !important;\n  }\n}\n.sc-slot time {\n  display: block;\n}\n.sc-editor {\n  scroll-margin-top: 16px;\n}\n.sc-error-details textarea {\n  width: 100%;\n  box-sizing: border-box;\n  background: var(--card-background-color, #fff);\n  color: var(--primary-text-color, #202a35);\n  border: 1px solid var(--sc-border);\n  border-radius: 8px;\n  padding: 10px;\n  font: 12px/1.5 monospace;\n  resize: vertical;\n}\n.sc-error-details p {\n  font-size: .8rem;\n  color: var(--sc-muted);\n}\n@container (max-width:600px) {\n  .sc-slot time {\n    display: inline-block;\n  }\n}\n";
const CARD_VERSION = '0.3.2';
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
    this.localErrorDetails = null;
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
      // A text/time field emits change on blur, just before a click on Save.
      // Replacing the form here removes the clicked button before submission.
      // Only selectors and checkboxes can change which controls are displayed.
      if (!e.target.matches('select,input[type="checkbox"]')) return;
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
    // The form.elements collection may include HA controls whose name getter
    // throws; the editor only creates native input/select/textarea fields.
    for (const node of form.querySelectorAll('input[name],select[name],textarea[name]')) {
      const name = node.getAttribute('name');
      if (name === 'entities' || name.startsWith('slot_') || name.startsWith('condition')) continue;
      if (this.draft[name] === undefined) continue;
      if (node.type === 'checkbox') node.checked = this.draft[name] === 'on';
      else node.value = this.draft[name];
    }
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
    const errorDetails = this.localError ? this.localErrorDetails : writeError ? diagnosticFor(writeError, {cardVersion:CARD_VERSION,haVersion:this._hass.config?.version}) : null;
    const editable = this._hass?.user?.is_admin === true && writeError?.code !== 'unauthorized';
    const view = state ? `<div class="profile-status-bar">${profile ? `<span class="sc-badge ${profile.active ? 'is-active' : ''}">${profile.active ? 'Profilo attivo' : 'Profilo inattivo'}</span><span>${esc(profile.profile_type === 'exclusive' ? 'Esclusivo' : 'Condiviso')}</span>` : 'Crea un profilo per iniziare'}<span>· ${state.quick_timers?.length ?? 0} timer attivi</span></div>
      ${groups.length ? `<nav class="tab-bar" aria-label="Gruppi">${tabs}</nav>` : ''}
      <div class="sc-toolbar"><div><h2>${esc(group?.name || 'La tua settimana')}</h2><p>${schedules.length} schedule · ${esc(this._hass.config?.time_zone || 'Fuso Home Assistant')}</p></div>${editable ? `<div class="sc-controls">${group ? button('newSchedule','＋ Schedule') : ''}${button('newTimer','Quick Timer')}</div>` : ''}</div>
      ${schedules.length ? `<section class="sc-week" aria-label="Programmazione settimanale">${slots}</section><ul class="sc-list">${schedules.map((schedule) => `<li class="sc-entry"><div class="sc-entry-copy"><strong>${esc(schedule.name)}</strong><p class="sc-meta">${esc(schedule.target_entity_ids.map((id)=>this._hass.states[id]?.attributes?.friendly_name || id).join(', '))}</p><p class="sc-meta">${schedule.enabled ? 'Abilitato' : 'Disabilitato'} · ${schedule.time_slots?.length ?? 0} fasce</p></div>${editable ? `<div class="sc-entry-actions">${button('editSchedule','Modifica',schedule.id)}${button('deleteSchedule','Elimina',schedule.id)}</div>` : ''}</li>`).join('')}</ul>` : `<div class="sc-empty"><strong>${!profile ? 'Inizia dal tuo primo profilo' : !group ? 'Aggiungi un gruppo di dispositivi' : 'La settimana è ancora libera'}</strong>${!profile ? 'Organizza la casa per abitudini, ambienti o stagioni.' : !group ? 'Riunisci i dispositivi che vuoi programmare.' : 'Crea uno schedule e scegli giorni, orari e azioni.'}</div>`}
      ${editable ? `<details class="sc-management" data-section="management" ${!profile || !group ? 'open' : ''}><summary>Gestisci profili e gruppi</summary><div class="sc-controls">${button('newProfile','＋ Profilo')}${profile ? `${button('editProfile','Modifica profilo',profile.id)}${button('toggleProfile',profile.active ? 'Disattiva profilo' : 'Attiva profilo',profile.id)}${button('deleteProfile','Elimina profilo',profile.id)}${button('newGroup','＋ Gruppo')}` : ''}${group ? `${button('editGroup','Modifica gruppo',group.id)}${button('deleteGroup','Elimina gruppo',group.id)}` : ''}</div></details>` : '<p class="sc-meta">Vista in sola lettura: serve un amministratore per modificare.</p>'}
      ${this.edit && editable ? this.editor(config, profile, group) : ''}
      <details class="sc-operational" data-section="operational"><summary>Attività · ${state.operational?.occurrences?.length ?? 0} fasce in corso · ${state.quick_timers?.length ?? 0} timer</summary>${(state.operational?.occurrences || []).map((x) => `<p>${esc(config.schedules?.find((s) => s.id === x.schedule_id)?.name || x.schedule_id)}: ${esc(x.state)}, condizione ${esc(x.condition_branch)}, termine ${esc(x.end_utc)}</p>`).join('') || '<p>Nessuna fascia attiva.</p>'}${(state.operational?.leases || []).map((x) => `<p>${esc(x.entity_id)}: ${esc(x.state)} (${esc(x.controller_type)})</p>`).join('')}${(state.quick_timers || []).map((x) => `<p>Timer ${esc(this._hass.states[x.entity_id]?.attributes?.friendly_name || x.entity_id)}: <span data-expiry="${esc(x.expires_at)}"></span> ${editable ? button('cancelTimer','Annulla timer',x.id) : ''}</p>`).join('')}</details>` : '';
    this.shadowRoot.innerHTML = `<style>${STYLE}</style><ha-card style="--pchip-color:${tint(profile?.color)}"><div class="card-header"><div class="hdr-row1"><span class="card-title">${esc(this.config.title || 'Schedule Creator')}</span><span class="sc-version">v${CARD_VERSION}</span></div><p class="sc-eyebrow">Profili</p><div class="hdr-row2" aria-label="Profili">${chips}</div></div>${status}${info ? `<p class="sc-error" role="alert">${esc(typeof info === 'string' ? info : messageFor(info))}</p>` : ''}${errorDetails ? `<details class="sc-error-details" data-section="error-details"><summary>Dettagli errore</summary><p>Seleziona e copia questo testo per segnalare il problema.</p><textarea readonly aria-label="Dettagli errore da copiare" rows="10">${esc(errorDetails)}</textarea></details>` : ''}${view}</ha-card>`;
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
    if (command === 'close') { this.edit = null; this.draft = null; this.localError = null; this.localErrorDetails = null; this.render(); return; }
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
      this.draft = null; this.localError = null; this.localErrorDetails = null; this.render();
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
    this.localError = null; this.localErrorDetails = null;
    const [kind,id] = this.edit;
    const type = kind === 'timer' ? 'quick_timer/create' : `${kind}/${id ? 'update' : 'create'}`;
    let phase = 'lettura del modulo';
    try {
      this.capture();
      const data = Object.fromEntries(new FormData(form));
      const config = this.adapter.state.config;
      let payload;
      phase = 'validazione del nome';
      if (kind !== 'timer' && !data.name?.trim()) throw new Error('Inserisci un nome prima di salvare.');
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
        const validateCondition = (node) => {if (!node) return;if (['and','or'].includes(node.operator)) {if(node.children.length<2) throw new Error('Servono due regole per E/O.');node.children.forEach(validateCondition);} else if (!node.entity_id || !this._hass.states[node.entity_id]) throw new Error('Seleziona un’entità valida nella condizione.');};
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
        for (const key of Object.keys(payload)) if (JSON.stringify(payload[key]) === JSON.stringify(clean(this.editRecord[key]))) delete payload[key];
        if (!Object.keys(payload).length) { this.edit=null; this.draft=null; this.render(); return; }
        payload[`${kind}_id`] = id;
      }
      if (!id && kind === 'group') payload.profile_id = this.ownerProfile;
      if (!id && kind === 'schedule') { payload.profile_id = this.ownerProfile; payload.group_id = this.ownerGroup; }
      phase = 'salvataggio e aggiornamento della vista';
      const ok = await this.adapter.mutate(type,payload,{ runtime: kind === 'timer', expectedRevision: kind === 'timer' || this.adapter.conflicted ? undefined : this.editRevision });
      if (ok) { this.edit = null; this.draft = null; this.render(); }
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
