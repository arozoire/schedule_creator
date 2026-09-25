// Convert a weekly-schedule-card backup (schema weekly-schedule-card/backup v1)
// into Schedule Creator drafts for schedule_creator/import/merge. Pure: the
// card shows the result for review and the backend validates everything again.
import { describeAction } from './action-editor.js';
import { t } from './i18n.js';

export const WSC_SCHEMA = 'weekly-schedule-card/backup';
const WSC_DAYS = {mon: [0], tue: [1], wed: [2], thu: [3], fri: [4], sat: [5], sun: [6], daily: [0, 1, 2, 3, 4, 5, 6], workday: [0, 1, 2, 3, 4], weekend: [5, 6]};
const WSC_MARKER = 'WSC conditional v1';
const WSC_OPERATORS = {'>': 'numeric_greater', '<': 'numeric_less', '>=': 'numeric_greater_or_equal', '<=': 'numeric_less_or_equal', '==': 'state_equals', '!=': 'state_not_equals'};
const WSC_SCHEDULER_MATCH = {is: 'state_equals', not: 'state_not_equals', above: 'numeric_greater', below: 'numeric_less'};
const WSC_POSITION = new Set(['cover', 'valve']);
const wscTime = (value) => /^\d{2}:\d{2}(:\d{2})?$/.test(String(value || '')) ? String(value).slice(0, 5) : null;
const wscClock = (m) => `${String(Math.floor(((m % 1440) + 1440) % 1440 / 60)).padStart(2, '0')}:${String(((m % 60) + 60) % 60).padStart(2, '0')}`;
// Scheduler boundary: "07:30", or "sunrise+00:30" / "sunset-01:00" (seconds optional).
// Sun boundaries keep an approximate time from today's sun for the week views.
function wscBoundary(value, sun) {
  const fixed = wscTime(value);
  if (fixed) return {time: fixed};
  const m = /^(sunrise|sunset)([+-])(\d{2}):(\d{2})(?::\d{2})?$/.exec(String(value || ''));
  if (!m) return null;
  const offset = (m[2] === '-' ? -1 : 1) * (Number(m[3]) * 60 + Number(m[4]));
  if (Math.abs(offset) > 360) return null;
  const base = sun?.[m[1]] ?? (m[1] === 'sunrise' ? 390 : 1140);
  return {time: wscClock(base + offset), sun: m[1], offset};
}

export function isWscBackup(value) {
  return !!value && typeof value === 'object' && value.schema === WSC_SCHEMA && value.version === 1 && !!value.profileData && Array.isArray(value.schedules);
}

// Service calls of a Scheduler timeslot; conditional schedules keep the real
// calls JSON-encoded inside a logbook.log marker.
function wscSlotCalls(slot) {
  const actions = slot?.actions || [];
  const first = actions[0], data = first?.service_data || first?.data || {};
  if (actions.length === 1 && first?.service === 'logbook.log' && data.name === WSC_MARKER) {
    try { return JSON.parse(data.message); } catch { return []; }
  }
  return actions;
}
const wscCallEntity = (call) => {
  const id = call?.entity_id ?? call?.target?.entity_id ?? (call?.service_data || call?.data || {}).entity_id;
  return Array.isArray(id) ? id : id ? [id] : [];
};
const wscCallData = (call) => { const {entity_id: _drop, ...rest} = call?.service_data || call?.data || {}; return rest; };

// Start action for one entity from its service calls.
function wscStartAction(calls, entityId, extras, notes) {
  const domain = entityId.split('.')[0];
  const services = calls.map((c) => [String(c.service || ''), wscCallData(c)]);
  if (domain === 'climate') {
    const state = {}, get = (name) => services.find(([s]) => s === `climate.${name}`)?.[1];
    if (get('turn_off')) return {domain, action: 'apply_state', data: {state: 'off'}};
    const temp = get('set_temperature') || {};
    const mode = get('set_hvac_mode')?.hvac_mode || temp.hvac_mode || extras?.hvacMode;
    for (const key of ['temperature', 'target_temp_low', 'target_temp_high']) if (temp[key] != null) state[key] = Number(temp[key]);
    const fan = get('set_fan_mode')?.fan_mode || extras?.fanMode, swing = get('set_swing_mode')?.swing_mode || extras?.swingMode, preset = get('set_preset_mode')?.preset_mode || extras?.presetMode;
    if (fan) state.fan_mode = fan;
    if (swing) state.swing_mode = swing;
    if (preset) state.preset_mode = preset;
    if (mode) return {domain, action: 'apply_state', data: mode === 'off' ? {state: 'off'} : {state: mode, ...state}};
    // Temperature only: the device keeps its current mode, as in WSC.
    if (Object.keys(state).length) { notes.push(t('Solo temperatura: la modalità resta quella del dispositivo.')); return {domain, action: 'set_temperature', data: state}; }
    return null;
  }
  const own = services.filter(([s]) => s.split('.')[0] === domain);
  const generic = services.filter(([s]) => /^homeassistant\.turn_(on|off)$/.test(s)).map(([s, d]) => [`${domain}.${s.split('.')[1]}`, d]);
  const usable = own.length ? own : generic;
  if (!usable.length) return null;
  if (usable.length > 1) notes.push(t('Più comandi nella fascia: importato solo “{service}”.', {service: usable[0][0]}));
  const [service, data] = usable[0];
  return {domain, action: service.split('.')[1], data};
}

// WSC "at the end" choice (link.stopAction/stopValue) as an end action.
function wscEndAction(link, entityId) {
  const type = link?.stopAction, v = link?.stopValue, domain = entityId.split('.')[0];
  if (!type) return null;
  const act = (d, action, data = {}) => ({domain: d, action, data});
  switch (type) {
    case 'turn_off': return domain === 'climate' ? act(domain, 'apply_state', {state: 'off'}) : act(domain, 'turn_off');
    case 'turn_on': return act(domain, 'turn_on');
    case 'set_temperature': return act(domain, 'set_temperature', {temperature: Number(v)});
    case 'set_hvac_mode': return act('climate', 'apply_state', {state: String(v)});
    case 'set_preset_mode': case 'set_fan_mode': case 'set_swing_mode': return act('climate', type, {[type.slice(4)]: v});
    case 'set_brightness': return act('light', 'turn_on', {brightness_pct: Number(v)});
    case 'set_color_temp': return act('light', 'turn_on', {color_temp_kelvin: Number(v)});
    case 'set_color': { const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(v || '')); return act('light', 'turn_on', {rgb_color: m ? m.slice(1).map((x) => parseInt(x, 16)) : [255, 255, 255]}); }
    case 'set_speed': return act('fan', 'set_percentage', {percentage: Number(v)});
    case 'set_humidity': return act('humidifier', 'set_humidity', {humidity: Number(v)});
    case 'set_hum_mode': return act('humidifier', 'set_mode', {mode: v});
    case 'set_operation_mode': return act('water_heater', 'set_operation_mode', {operation_mode: v});
    case 'set_position': return WSC_POSITION.has(domain) ? act(domain, `set_${domain}_position`, {position: Number(v)}) : null;
    case 'open': case 'close': case 'stop': return WSC_POSITION.has(domain) ? act(domain, `${type}_${domain}`) : null;
    default: return null;
  }
}

const wscLeaf = (operator, entity_id, value, hysteresis = null) => ({operator, entity_id, value, lower: null, upper: null, children: [], minimum_duration_seconds: null, hysteresis});
const wscCombine = (nodes, operator) => nodes.length === 1 ? nodes[0] : {operator, entity_id: null, value: null, lower: null, upper: null, children: nodes, minimum_duration_seconds: null, hysteresis: null};

// One comparison; null with a note when Schedule Creator cannot express it.
function wscConditionLeaf(entity, attribute, operator, raw, hysteresis, notes) {
  if (!entity || !operator) { notes.push(t('Condizione incompleta ignorata.')); return null; }
  if (attribute) { notes.push(t('Condizione sull’attributo “{attribute}” di {entity}: non supportata.', {attribute, entity})); return null; }
  if (operator.startsWith('numeric')) {
    const value = Number(raw);
    if (!Number.isFinite(value)) { notes.push(t('Valore non numerico “{value}” per {entity}.', {value: raw, entity})); return null; }
    const band = Number(hysteresis);
    return wscLeaf(operator, entity, value, Number.isFinite(band) && band > 0 ? band : null);
  }
  return wscLeaf(operator, entity, String(raw ?? ''));
}

function wscConditionOf(link, slot, notes) {
  const nodes = [];
  let broken = false;
  for (const c of link?.conditions || []) {
    const node = wscConditionLeaf(c.entity, c.attribute, WSC_OPERATORS[c.operator], c.value, c.hysteresis, notes);
    if (node) nodes.push(node); else broken = true;
  }
  const own = (slot?.conditions || []).map((c) => wscConditionLeaf(c.entity_id, c.attribute, WSC_SCHEDULER_MATCH[c.match_type], c.value, null, notes));
  if (own.length) {
    if (own.some((x) => !x)) broken = true;
    const valid = own.filter(Boolean);
    if (valid.length) {
      nodes.push(wscCombine(valid, slot.condition_type === 'or' ? 'or' : 'and'));
      if (!slot.track_conditions) notes.push(t('La condizione di Scheduler era valutata solo all’inizio: ora vale per tutta la fascia.'));
    }
  }
  if (!nodes.length) return {condition: null, broken};
  const operator = link?.conditions?.length && link.condCombinator === 'or' && !own.length ? 'or' : 'and';
  return {condition: wscCombine(nodes, operator), broken};
}

const wscNotifyAction = (service) => { const s = String(service || '').trim(); return !s ? null : s.includes('.') ? s : `notify.${s}`; };

// Returns {profiles: drafts for import/merge, rows: one line per source schedule}.
export function convertWscBackup(backup, {existingProfileNames = [], entityName = (id) => id, sun = null} = {}) {
  if (!isWscBackup(backup)) throw new Error(t('Il file non è un backup della weekly-schedule-card.'));
  const byId = new Map(backup.schedules.map((s) => [s.entityId, s.config]));
  const used = new Set(existingProfileNames.map((n) => String(n).toLowerCase()));
  const active = new Set(backup.profileData.activeProfiles || []);
  const rows = [], profiles = [];
  for (const source of backup.profileData.profiles || []) {
    let name = String(source.name || t('Profilo WSC')).trim() || t('Profilo WSC');
    if (used.has(name.toLowerCase())) name = `${name} (WSC)`;
    used.add(name.toLowerCase());
    const wscGroups = (source.groups?.length ? source.groups : backup.profileData.groups) || [];
    const names = new Map(wscGroups.flatMap((g) => (g.entities || []).map((e) => [e.entity, e.name])));
    const label = (id) => names.get(id) || entityName(id);
    const groups = wscGroups.map((g) => ({name: String(g.name || t('Gruppo')), color: /^#[0-9a-f]{6}$/i.test(g.color || '') ? g.color : null, entity_ids: [...new Set((g.entities || []).map((e) => e.entity).filter(Boolean))], schedules: []}));
    const groupFor = (entityId) => {
      let group = groups.find((g) => g.entity_ids.includes(entityId));
      if (!group) { group = groups.find((g) => g.name === t('Altri dispositivi')) || {name: t('Altri dispositivi'), color: null, entity_ids: [], schedules: []}; if (!groups.includes(group)) groups.push(group); group.entity_ids.push(entityId); }
      return group;
    };
    const links = new Map((source.scheduleLinks || []).map((l) => [l.id, l]));
    const taken = new Set();
    for (const id of source.schedules || []) {
      const config = byId.get(id), link = links.get(id) || {};
      const row = {profile: name, source: config?.name || id, status: 'ok', notes: []};
      rows.push(row);
      const skip = (why) => { row.status = 'skip'; row.notes.push(why); };
      if (!config) { skip(t('Configurazione mancante nel backup.')); continue; }
      if (link.oneShot || config.repeat_type === 'single') { skip(t('Schedule una tantum: non importato.')); continue; }
      const days = [...new Set((config.weekdays || []).flatMap((d) => WSC_DAYS[d] || []))].sort((a, b) => a - b);
      if (!days.length) { skip(t('Giorni non riconosciuti.')); continue; }
      if ((config.weekdays || []).includes('workday')) row.notes.push(t('“Giorni lavorativi” importati come lunedì–venerdì.'));
      if (config.start_date || config.end_date) row.notes.push(t('Periodo {from} → {to} non supportato: vale tutto l’anno.', {from: config.start_date || '…', to: config.end_date || '…'}));
      if (link.autoChildId) row.notes.push(t('Fine gestita da uno schedule figlio della vecchia versione: controlla l’azione finale.'));
      const slots = [];
      let start = null, entityId = null;
      for (const slot of config.timeslots || []) {
        const calls = wscSlotCalls(slot), entities = [...new Set(calls.flatMap(wscCallEntity))];
        const first = wscBoundary(slot.start, sun);
        if (!first) { row.notes.push(t('Orario “{time}” non supportato.', {time: slot.start})); continue; }
        let last = slot.stop ? wscBoundary(slot.stop, sun) : null;
        if (slot.stop && !last) { row.notes.push(t('Orario “{time}” non supportato.', {time: slot.stop})); continue; }
        if (!last) {
          last = first.sun ? {time: wscClock(Number(first.time.slice(0, 2)) * 60 + Number(first.time.slice(3)) + 1), sun: first.sun, offset: first.offset + 1} : {time: wscClock(Number(first.time.slice(0, 2)) * 60 + Number(first.time.slice(3)) + 1)};
          row.notes.push(t('Azione puntuale: diventa una fascia di un minuto.'));
        }
        const from = first.time, to = last.time;
        if (!first.sun && !last.sun && from === to) { row.notes.push(t('Fascia di durata zero ignorata.')); continue; }
        if (entities.length !== 1 || (entityId && entities[0] !== entityId)) { row.notes.push(t('Fascia con più dispositivi: ignorata.')); continue; }
        const action = wscStartAction(calls, entities[0], link.extras, row.notes);
        if (!action) { row.notes.push(t('Comando non riconosciuto per {entity}.', {entity: entities[0]})); continue; }
        if (start && JSON.stringify(start) !== JSON.stringify(action)) { row.notes.push(t('Fasce con azioni diverse: importata solo la prima azione.')); continue; }
        start = action; entityId = entities[0];
        const entry = {weekdays: days, start: from, end: to};
        if (first.sun) Object.assign(entry, {start_sun: first.sun, start_offset_minutes: first.offset});
        if (last.sun) Object.assign(entry, {end_sun: last.sun, end_offset_minutes: last.offset});
        slots.push(entry);
      }
      if (!slots.length) { skip(row.notes.pop() || t('Nessuna fascia importabile.')); continue; }
      const {condition, broken} = wscConditionOf(link, (config.timeslots || [])[0], row.notes);
      const draft = {
        name: '', enabled: config.enabled !== false, target_entity_ids: [entityId], time_slots: slots, start_action: start,
        end_action: wscEndAction(link, entityId), condition,
        override_policy: link.overrideEnabled ? 'manual_override' : 'cooperative',
        start_notification: null, end_notification: null,
      };
      if (config.enabled === false) { row.status = 'off'; row.notes.push(t('Era disattivato nella weekly-schedule-card: resta disattivato.')); }
      if (broken) { draft.enabled = false; row.status = 'off'; row.notes.push(t('Importato disattivato: completa la condizione e riattivalo.')); }
      const conditionNote = t('Quando la condizione è falsa viene eseguita l’azione finale.');
      if (condition) row.notes.push(conditionNote);
      const service = wscNotifyAction(link.notifyService), trigger = link.notifyTrigger || 'start';
      if (service && trigger !== 'end' && link.notifyMessage) draft.start_notification = {action: service, title: '', message: link.notifyMessage};
      if (service && trigger !== 'start' && link.notifyMessageEnd) draft.end_notification = {action: service, title: '', message: link.notifyMessageEnd};
      let title = `${label(entityId)} · ${describeAction(start)}`;
      if (taken.has(title)) title = `${title} ${slots[0].start}`;
      taken.add(title);
      draft.name = title;
      Object.assign(row, {name: title, entity: entityId, slots, start, end: draft.end_action, condition, enabled: draft.enabled});
      if (row.status === 'ok' && row.notes.some((n) => n !== conditionNote)) row.status = 'note';
      groupFor(entityId).schedules.push(draft);
    }
    const kept = groups.filter((g) => g.entity_ids.length);
    profiles.push({name, profile_type: source.exclusive === false ? 'shared' : 'exclusive', color: null, groups: kept, wasActive: active.has(source.id)});
  }
  return {profiles, rows};
}

// Payload without the preview-only fields.
export function wscImportPayload(converted, backup) {
  return {source: 'weekly-schedule-card', source_created_at: typeof backup?.createdAt === 'string' ? backup.createdAt : null,
    profiles: converted.profiles.map(({wasActive: _a, ...p}) => p)};
}
