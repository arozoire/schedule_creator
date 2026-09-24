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
