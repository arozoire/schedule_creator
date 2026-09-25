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
  valve: {open_valve:'Apri',close_valve:'Chiudi',stop_valve:'Ferma',set_valve_position:'Posizione (%)'},
};
export function controllable(hass, id) {
  const domain = id.split('.')[0];
  return !!commands[domain] && Object.keys(commands[domain]).some((x) => hass.services?.[domain]?.[x]);
}
export function targetEntities(hass, allowed = null) {
  return Object.keys(hass.states || {}).filter((id) => (!allowed || allowed.includes(id)) && controllable(hass,id));
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