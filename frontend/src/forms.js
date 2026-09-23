// UI-only builders. Execution, conditions and notifications belong to HA.
export const uiEscape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const E = uiEscape;
export const input = (name, label, value = '', type = 'text', attrs = '') => `<label>${label}<input name="${name}" type="${type}" value="${E(value)}" ${attrs}></label>`;
export const choice = (name, label, values, selected) => `<label>${label}<select name="${name}">${values.map(([v,t]) => `<option value="${E(v)}" ${v === selected ? 'selected' : ''}>${E(t)}</option>`).join('')}</select></label>`;
export const check = (name,label,checked) => `<label class="sc-check"><input type="checkbox" name="${name}" ${checked ? 'checked' : ''}>${label}</label>`;
const commands = {
  switch: {turn_on:'Accendi',turn_off:'Spegni'}, input_boolean: {turn_on:'Attiva',turn_off:'Disattiva'},
  light: {turn_on:'Accendi / regola luce',turn_off:'Spegni'},
  climate: {set_hvac_mode:'Modalità',set_temperature:'Temperatura e modalità',set_fan_mode:'Velocità ventola',set_preset_mode:'Preset'},
  fan: {turn_on:'Accendi',turn_off:'Spegni',set_percentage:'Velocità (%)',set_preset_mode:'Preset'},
  cover: {open_cover:'Apri',close_cover:'Chiudi',stop_cover:'Ferma',set_cover_position:'Posizione (%)'},
};
export function controllable(hass, id) {
  const domain = id.split('.')[0];
  return !!commands[domain] && Object.keys(commands[domain]).some((x) => hass.services?.[domain]?.[x]);
}
export function targetEntities(hass, allowed = null) {
  return Object.keys(hass.states || {}).filter((id) => (!allowed || allowed.includes(id)) && controllable(hass,id));
}
const intersect = (states, key) => states.length ? (states[0].attributes?.[key] || []).filter((value) => states.every((s) => (s.attributes?.[key] || []).includes(value))) : [];
const knownData = {turn_on:['brightness','brightness_pct','rgb_color','color_temp_kelvin'], turn_off:[],set_hvac_mode:['hvac_mode'],set_temperature:['temperature','target_temp_low','target_temp_high','hvac_mode'],set_fan_mode:['fan_mode'],set_percentage:['percentage'],set_preset_mode:['preset_mode'],open_cover:[],close_cover:[],stop_cover:[],set_cover_position:['position']};
const modeLabels = {heat:'Riscaldamento',cool:'Raffrescamento',heat_cool:'Auto caldo/freddo',auto:'Automatico',fan_only:'Solo ventola',dry:'Deumidifica',off:'Spento'};
export function actionForm(prefix, label, hass, ids, value, optional, draft = {}) {
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
export function readAction(form, prefix, domain) {
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
export const blankCondition = () => ({operator:'available',entity_id:'',value:null,lower:null,upper:null,children:[],minimum_duration_seconds:null,hysteresis:null});
const operators = [['available','Entità disponibile'],['state_equals','Stato uguale a'],['state_not_equals','Stato diverso da'],['numeric_greater','Maggiore di'],['numeric_greater_or_equal','Maggiore o uguale'],['numeric_less','Minore di'],['numeric_less_or_equal','Minore o uguale'],['numeric_range','Compreso tra'],['and','Tutte le condizioni (E)'],['or','Almeno una condizione (O)']];
export function conditionForm(node, path = 'condition') {
  if (!node) return '<p>Nessuna condizione</p><button type="button" data-command="addCondition">＋ Condizione</button>';
  const op = node.operator, logical = ['and','or'].includes(op), numeric = op.startsWith('numeric_');
  return `<fieldset data-condition="${path}">${choice(`${path}_operator`,'Condizione',operators,op)}${logical ? node.children.map((n,i)=>conditionForm(n,`${path}.${i}`)).join('')+`<button type="button" data-command="addConditionChild" data-id="${path}">＋ Regola</button>` : input(`${path}_entity_id`,'Entità',node.entity_id,'text','list="sc-condition-entities"') + (op === 'numeric_range' ? input(`${path}_lower`,'Minimo',node.lower,'number','step="any"') + input(`${path}_upper`,'Massimo',node.upper,'number','step="any"') : op === 'available' ? '' : input(`${path}_value`,'Valore',node.value,numeric ? 'number' : 'text',numeric ? 'step="any"' : ''))}${input(`${path}_minimum_duration_seconds`,'Durata minima (secondi, facoltativa)',node.minimum_duration_seconds,'number','min="0" step="any"')}${numeric ? input(`${path}_hysteresis`,'Isteresi (facoltativa)',node.hysteresis,'number','min="0" step="any"') : ''}<button type="button" data-command="removeCondition" data-id="${path}">Rimuovi</button></fieldset>`;
}
export function readCondition(form,path='condition') {
  const element = form.elements[`${path}_operator`]; if (!element) return null;
  const op = element.value, logical = ['and','or'].includes(op), numeric=op.startsWith('numeric_');
  const v=(key)=>form.elements[`${path}_${key}`]?.value ?? '';
  const n=(key)=>v(key)==='' ? null : Number(v(key));
  const children=[];
  for(let i=0;form.elements[`${path}.${i}_operator`];i++) children.push(readCondition(form,`${path}.${i}`));
  return {operator:op,entity_id:logical ? null : v('entity_id'),value:logical || ['available','numeric_range'].includes(op) ? null : numeric ? n('value') : v('value'),lower:op==='numeric_range'?n('lower'):null,upper:op==='numeric_range'?n('upper'):null,children:logical ? (children.length ? children : [blankCondition(),blankCondition()]) : [],minimum_duration_seconds:n('minimum_duration_seconds'),hysteresis:numeric ? n('hysteresis') : null};
}
export function notificationForm(prefix,label,value,hass,draft={}) {
  const enabled = draft[`${prefix}_enabled`] === undefined ? !!value : draft[`${prefix}_enabled`] === 'on';
  const services = ['persistent_notification.create',...Object.keys(hass.services?.notify || {}).map((x)=>`notify.${x}`)];
  if(value && !services.includes(value.action)) services.push(value.action);
  return `<fieldset><legend>${label}</legend>${check(`${prefix}_enabled`,'Abilita notifica',enabled)}<div ${enabled ? '' : 'hidden'}>${choice(`${prefix}_action`,'Destinazione',services.map((x)=>[x,x==='persistent_notification.create'?'Notifica in Home Assistant':x]),draft[`${prefix}_action`] ?? value?.action ?? services[0])}${input(`${prefix}_title`,'Titolo',draft[`${prefix}_title`] ?? value?.title ?? '')}${input(`${prefix}_message`,'Messaggio',draft[`${prefix}_message`] ?? value?.message ?? '')}</div></fieldset>`;
}
export function readNotification(form,prefix) {
  return form.elements[`${prefix}_enabled`]?.checked ? {action:form.elements[`${prefix}_action`].value,title:form.elements[`${prefix}_title`].value,message:form.elements[`${prefix}_message`].value} : null;
}
export function slotsForm(slots) {
  return slots.map((slot,i)=>`<fieldset data-slot="${i}"><legend>Fascia ${i+1}</legend><div class="sc-days">${['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map((d,day)=>`<label class="sc-check"><input type="checkbox" name="slot_${i}_days" value="${day}" ${slot.weekdays.includes(day)?'checked':''}>${d}</label>`).join('')}</div>${input(`slot_${i}_start`,'Dalle',slot.start,'time')}${input(`slot_${i}_end`,'Alle',slot.end,'time')}<button type="button" data-command="removeSlot" data-id="${i}">Rimuovi fascia</button></fieldset>`).join('')+'<button type="button" data-command="addSlot">＋ Fascia</button>';
}
export function readSlots(form) {
  return [...form.querySelectorAll('[data-slot]')].map((node)=>{const i=node.dataset.slot;return {weekdays:[...node.querySelectorAll('input[type=checkbox]:checked')].map((x)=>Number(x.value)),start:form.elements[`slot_${i}_start`].value,end:form.elements[`slot_${i}_end`].value};});
}
