// Schedule editor widgets modelled on weekly-schedule-card: time bar with magnets,
// day shortcuts, entity-first conditions, icon and colour pickers.
import { uiEscape } from './forms.js';

const escS = uiEscape;
const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
export const DAY_SHORTCUTS = {all: [0, 1, 2, 3, 4, 5, 6], workdays: [0, 1, 2, 3, 4], weekend: [5, 6]};
export const SNAP_OPTIONS = [5, 10, 15, 30];
export const toMinutes = (value) => { const [h, m] = String(value || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
export const toTime = (minutes) => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

// Background blocks: other slots on at least one of the selected days.
export function slotBlocks(others, weekdays) {
  return others.filter((o) => o.weekdays.some((d) => weekdays.includes(d))).flatMap((o) => {
    const start = toMinutes(o.start), end = toMinutes(o.end);
    return end > start ? [{...o, from: start, to: end}] : [{...o, from: start, to: 1440}, ...(end ? [{...o, from: 0, to: end}] : [])];
  });
}

export function magnetSnap(minutes, points, threshold, snap) {
  let best = null, distance = threshold;
  for (const point of points) { const d = Math.abs(minutes - point); if (d < distance) { distance = d; best = point; } }
  return best ?? Math.round(minutes / snap) * snap;
}

function timebar(i, slot, others, snap) {
  const start = toMinutes(slot.start), end = toMinutes(slot.end);
  const blocks = slotBlocks(others, slot.weekdays);
  const magnets = [...new Set(blocks.flatMap((b) => [b.from, b.to]))].filter((m) => m > 0 && m < 1440);
  const overnight = end <= start;
  const pct = (m) => `${m / 1440 * 100}%`;
  const edit = overnight
    ? `<div class="sc-tb-edit is-static" style="left:${pct(start)};width:${pct(1440 - start)}"></div>${end ? `<div class="sc-tb-edit is-static" style="left:0;width:${pct(end)}"></div>` : ''}`
    : `<div class="sc-tb-edit${end - start < 300 ? ' is-narrow' : ''}" data-slot-bar="${i}" style="left:${pct(start)};width:${pct(end - start)}"><span class="sc-tb-handle" data-handle="start"></span><span class="sc-tb-label">${toTime(start)}–${toTime(end)}</span><span class="sc-tb-handle" data-handle="end"></span></div>`;
  return `<div class="sc-timebar" data-timebar="${i}" data-magnets="${magnets.join(',')}" data-snap="${snap}">${blocks.map((b) => `<div class="sc-tb-bg" title="${escS(`${b.name} ${toTime(b.from)}–${toTime(b.to)}`)}" style="left:${pct(b.from)};width:${pct(b.to - b.from)};--block-color:${b.color}"></div>`).join('')}${magnets.map((m) => `<div class="sc-tb-magnet" data-min="${m}" style="left:${pct(m)}"></div>`).join('')}${edit}</div><div class="sc-tb-ticks" aria-hidden="true">${[0, 6, 12, 18, 24].map((h) => `<span>${String(h).padStart(2, '0')}:00</span>`).join('')}</div>${overnight ? '<p>Fascia a cavallo della mezzanotte: modifica gli orari nei campi qui sotto.</p>' : blocks.length ? '<p>Trascina la fascia o le maniglie: si aggancia agli inizi/fini degli altri schedule (magnete).</p>' : '<p>Trascina la fascia o le maniglie per cambiare gli orari.</p>'}`;
}

export function slotsForm(slots, {others = [], snap = 15} = {}) {
  const snapRow = `<div class="sc-snap" role="group" aria-label="Passo di aggancio"><span>Passo</span>${SNAP_OPTIONS.map((s) => `<button type="button" class="sc-pill${s === snap ? ' is-selected' : ''}" data-command="setSnap" data-id="${s}" aria-pressed="${s === snap}">${s} min</button>`).join('')}</div>`;
  return snapRow + slots.map((slot, i) => {
    const key = slot.weekdays.join('');
    const shortcuts = [['all', 'Tutti'], ['workdays', 'Feriali'], ['weekend', 'Weekend']].map(([id, label]) => `<button type="button" class="sc-pill${DAY_SHORTCUTS[id].join('') === key ? ' is-selected' : ''}" data-command="slotDays" data-id="${i}:${id}">${label}</button>`).join('');
    const days = DAY_LABELS.map((d, day) => `<label class="sc-day-chip"><input type="checkbox" name="slot_${i}_days" value="${day}" ${slot.weekdays.includes(day) ? 'checked' : ''}><span>${d}</span></label>`).join('');
    const siblings = slots.filter((_, j) => j !== i).map((s) => ({...s, name: 'Altra fascia di questo schedule', color: '#8a96a3'}));
    return `<fieldset data-slot="${i}"><legend>Fascia ${i + 1}</legend>${timebar(i, slot, [...others, ...siblings], snap)}<div class="sc-time-row">${`<label>Inizio<input name="slot_${i}_start" type="time" value="${escS(slot.start)}"></label><label>Fine<input name="slot_${i}_end" type="time" value="${escS(slot.end)}"></label>`}</div><div class="sc-shortcuts">${shortcuts}</div><div class="sc-days">${days}</div>${slots.length > 1 ? `<button type="button" data-command="removeSlot" data-id="${i}">Rimuovi fascia</button>` : ''}</fieldset>`;
  }).join('') + '<button type="button" data-command="addSlot">＋ Fascia successiva</button>';
}

export function readSlots(form) {
  return [...form.querySelectorAll('[data-slot]')].map((node) => {
    const i = node.dataset.slot;
    return {weekdays: [...node.querySelectorAll('input[type=checkbox]:checked')].map((x) => Number(x.value)), start: form.elements[`slot_${i}_start`].value, end: form.elements[`slot_${i}_end`].value};
  });
}

// ---------------------------------------------------------------- conditions
export const blankCondition = () => ({operator: 'state_equals', entity_id: '', value: null, lower: null, upper: null, children: [], minimum_duration_seconds: null, hysteresis: null});
const NUMERIC_DOMAINS = ['input_number', 'number', 'counter'];
const BOOLEAN_DOMAINS = ['binary_sensor', 'input_boolean', 'switch', 'light', 'fan', 'automation', 'person', 'device_tracker'];

// What can be compared for an entity: decides operators and value control.
export function conditionKind(hass, entityId) {
  const state = hass.states?.[entityId];
  if (!state) return {kind: 'none'};
  const domain = entityId.split('.')[0], a = state.attributes || {};
  const unit = a.unit_of_measurement || '';
  if (NUMERIC_DOMAINS.includes(domain) || (domain === 'sensor' && (unit || a.state_class || !Number.isNaN(Number.parseFloat(state.state))))) return {kind: 'numeric', unit, step: a.step || (unit === '°C' || unit === '°F' ? 0.5 : 1), min: a.min, max: a.max, current: state.state};
  if (domain === 'person' || domain === 'device_tracker') return {kind: 'select', options: ['home', 'not_home'], current: state.state};
  if (BOOLEAN_DOMAINS.includes(domain)) return {kind: 'boolean', options: ['on', 'off'], current: state.state};
  if (domain === 'input_select' || domain === 'select') return {kind: 'select', options: a.options || [], current: state.state};
  if (domain === 'climate') return {kind: 'select', options: a.hvac_modes || [], current: state.state};
  if (domain === 'cover') return {kind: 'select', options: ['open', 'closed', 'opening', 'closing'], current: state.state};
  return {kind: 'select', options: [...new Set([state.state].filter((x) => !['unknown', 'unavailable'].includes(x)))], current: state.state, free: true};
}

// Suggested hysteresis: half a degree for temperatures, else about 5% of the threshold.
export function defaultHysteresis(unit, value) {
  if (['°C', '°F', 'K'].includes(unit)) return 0.5;
  if (unit === '%') return 2;
  const v = Math.abs(Number(value));
  return Number.isFinite(v) && v > 0 ? Math.max(0.1, Math.round(v * 0.05 * 10) / 10) : 1;
}

const valueLabels = {on: 'Acceso / Sì', off: 'Spento / No', home: 'A casa', not_home: 'Fuori casa', open: 'Aperta', closed: 'Chiusa', opening: 'In apertura', closing: 'In chiusura'};
const DURATIONS = [[0, 'Subito'], [60, '1 min'], [300, '5 min'], [600, '10 min'], [900, '15 min'], [1800, '30 min']];
const radios = (name, options, selected, cls = 'sc-choices') => `<div class="${cls}" role="radiogroup">${options.map(([v, label]) => `<label class="sc-choice${String(v) === String(selected) ? ' is-selected' : ''}"><input type="radio" name="${name}" value="${escS(v)}" ${String(v) === String(selected) ? 'checked' : ''}><span>${escS(label)}</span></label>`).join('')}</div>`;

function leafForm(node, path, hass) {
  const friendly = (id) => hass.states?.[id]?.attributes?.friendly_name || id;
  const entity = `<label>1 · Entità da controllare<input name="${path}_entity_id" value="${escS(node.entity_id || '')}" list="sc-condition-entities" placeholder="Cerca per nome o ID" autocomplete="off"></label>`;
  const remove = `<button type="button" data-command="removeCondition" data-id="${path}">Rimuovi condizione</button>`;
  const spec = conditionKind(hass, node.entity_id);
  if (spec.kind === 'none') return `<fieldset class="sc-condition" data-condition="${path}"><input type="hidden" name="${path}_operator" value="${escS(node.operator)}">${entity}<p>Scegli un’entità: poi vedrai solo i confronti possibili (acceso/spento, maggiore/minore…).</p>${remove}</fieldset>`;
  const now = `<p class="sc-current">Ora <strong>${escS(friendly(node.entity_id))}: ${escS(spec.kind === 'numeric' ? spec.current : valueLabels[spec.current] || spec.current)}${spec.unit ? ` ${escS(spec.unit)}` : ''}</strong></p>`;
  let body;
  if (spec.kind === 'numeric') {
    const ops = [['numeric_greater', '>'], ['numeric_greater_or_equal', '≥'], ['numeric_less', '<'], ['numeric_less_or_equal', '≤'], ['numeric_range', 'tra'], ['available', 'disponibile']];
    const op = ops.some(([v]) => v === node.operator) ? node.operator : 'numeric_greater';
    const limits = `step="${spec.step}"${spec.min != null ? ` min="${spec.min}"` : ''}${spec.max != null ? ` max="${spec.max}"` : ''}`;
    const unit = spec.unit ? ` (${escS(spec.unit)})` : '';
    const values = op === 'numeric_range'
      ? `<div class="sc-time-row"><label>Da${unit}<input name="${path}_lower" type="number" ${limits} value="${escS(node.lower ?? '')}"></label><label>A${unit}<input name="${path}_upper" type="number" ${limits} value="${escS(node.upper ?? '')}"></label></div>`
      : op === 'available' ? '' : `<label>3 · Valore${unit}<input name="${path}_value" type="number" ${limits} value="${escS(node.value ?? '')}" placeholder="${escS(spec.current)}"></label>`;
    const reference = op === 'numeric_range' ? node.lower : node.value;
    const hysteresis = op === 'available' ? '' : `<label>Isteresi${unit}<input name="${path}_hysteresis" type="number" min="0" step="0.1" value="${escS(node.hysteresis ?? defaultHysteresis(spec.unit, reference ?? spec.current))}"></label><p>Margine anti-oscillazione: una volta vera, la condizione torna falsa solo oltre la soglia ± isteresi.</p>`;
    body = `<div class="sc-field"><span class="sc-field-label">2 · Confronto</span>${radios(`${path}_operator`, ops, op)}</div>${values}${hysteresis}`;
  } else {
    const ops = [['state_equals', 'è'], ['state_not_equals', 'non è'], ['available', 'disponibile']];
    const op = ops.some(([v]) => v === node.operator) ? node.operator : 'state_equals';
    const options = [...new Set([...spec.options, ...(node.value != null && node.value !== '' ? [String(node.value)] : [])])];
    const value = op === 'available' ? '' : spec.free
      ? `<label>3 · Valore<input name="${path}_value" value="${escS(node.value ?? spec.current ?? '')}"></label>`
      : `<div class="sc-field"><span class="sc-field-label">3 · Valore</span>${radios(`${path}_value`, options.map((v) => [v, valueLabels[v] || v]), node.value ?? options[0])}</div>`;
    body = `<div class="sc-field"><span class="sc-field-label">2 · Confronto</span>${radios(`${path}_operator`, ops, op)}</div>${value}`;
  }
  const presets = (seconds) => [...DURATIONS, ...(DURATIONS.some(([s]) => s === seconds) ? [] : [[seconds, `${Math.round(seconds / 60 * 10) / 10} min`]])];
  const duration = Number(node.minimum_duration_seconds || 0), release = Number(node.release_delay_seconds || 0);
  const durationField = `<div class="sc-field"><span class="sc-field-label">Diventa vera dopo</span>${radios(`${path}_minimum_duration_seconds`, presets(duration), duration)}</div><div class="sc-field"><span class="sc-field-label">Torna falsa dopo</span>${radios(`${path}_release_delay_seconds`, presets(release), release)}<p>Evita avanti e indietro: la condizione cambia solo se resta vera (o falsa) per questo tempo. Esempio tende: chiudi dopo 10 min sopra 500 lx, riapri dopo 15 min sotto.</p></div>`;
  return `<fieldset class="sc-condition" data-condition="${path}">${entity}${now}${body}${durationField}${remove}</fieldset>`;
}

export function conditionForm(node, hass, path = 'condition') {
  if (!node) return '<p>Nessuna condizione: lo schedule esegue sempre nelle sue fasce.</p><button type="button" data-command="addCondition">＋ Condizione</button>';
  if (!['and', 'or'].includes(node.operator)) return `${leafForm(node, path, hass)}${path === 'condition' ? '<button type="button" data-command="addCondition">＋ Altra condizione</button>' : ''}`;
  const group = `<div class="sc-field"><span class="sc-field-label">Quando vale lo schedule</span>${radios(`${path}_operator`, [['and', 'Tutte le condizioni'], ['or', 'Almeno una']], node.operator)}</div>`;
  return `<div class="sc-condition-group" data-condition="${path}">${group}${node.children.map((child, i) => conditionForm(child, hass, `${path}.${i}`)).join('')}<button type="button" data-command="${path === 'condition' ? 'addCondition' : 'addConditionChild'}" data-id="${path}">＋ Altra condizione</button></div>`;
}

export function readCondition(form, path = 'condition') {
  const value = (key) => form.elements[`${path}_${key}`]?.value ?? '';
  const op = value('operator');
  if (!op) return null;
  const logical = ['and', 'or'].includes(op), numeric = op.startsWith('numeric_');
  const number = (key) => value(key) === '' ? null : Number(value(key));
  const children = [];
  for (let i = 0; form.querySelector(`[data-condition="${path}.${i}"]`); i++) children.push(readCondition(form, `${path}.${i}`));
  const duration = number('minimum_duration_seconds');
  const release = number('release_delay_seconds');
  return {
    ...(release ? {release_delay_seconds: release} : {}),
    operator: op,
    entity_id: logical ? null : value('entity_id'),
    value: logical || ['available', 'numeric_range'].includes(op) ? null : numeric ? number('value') : value('value'),
    lower: op === 'numeric_range' ? number('lower') : null,
    upper: op === 'numeric_range' ? number('upper') : null,
    children: logical ? children : [],
    minimum_duration_seconds: duration ? duration : null,
    hysteresis: numeric ? number('hysteresis') : null,
  };
}

// ------------------------------------------------------------ icon / colour
export const ICONS = [['home', 'Casa'], ['sofa', 'Soggiorno'], ['bed', 'Camera'], ['silverware-fork-knife', 'Cucina'], ['shower', 'Bagno'], ['desk', 'Studio'], ['garage', 'Garage'], ['tree', 'Giardino'], ['stairs', 'Scale'], ['lightbulb', 'Luci'], ['ceiling-light', 'Plafoniera'], ['led-strip-variant', 'Striscia LED'], ['thermostat', 'Termostato'], ['air-conditioner', 'Clima'], ['radiator', 'Termosifone'], ['fan', 'Ventola'], ['blinds', 'Tapparelle'], ['curtains', 'Tende'], ['power-socket-eu', 'Presa'], ['water-boiler', 'Boiler'], ['washing-machine', 'Lavatrice'], ['television', 'TV'], ['robot-vacuum', 'Robot'], ['sprinkler-variant', 'Irrigazione'], ['weather-night', 'Notte'], ['white-balance-sunny', 'Giorno'], ['briefcase', 'Lavoro'], ['beach', 'Vacanza'], ['snowflake', 'Inverno'], ['calendar-clock', 'Programma']];
export const COLORS = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#00897b', '#039be5', '#3949ab', '#8e24aa', '#d81b60', '#6d4c41', '#546e7a', '#9e9e9e'];

export function iconPicker(selected) {
  const value = String(selected || '').replace(/^mdi:/, '');
  const known = ICONS.some(([id]) => id === value);
  const options = [['', 'Nessuna', ''], ...ICONS.map(([id, label]) => [`mdi:${id}`, label, id]), ...(value && !known ? [[selected, value, value]] : [])];
  return `<div class="sc-field"><span class="sc-field-label">Icona</span><div class="sc-icon-grid" role="radiogroup" aria-label="Icona">${options.map(([v, label, icon]) => `<label class="sc-icon-choice${(selected || '') === v ? ' is-selected' : ''}" title="${escS(label)}"><input type="radio" name="icon" value="${escS(v)}" ${(selected || '') === v ? 'checked' : ''}>${icon ? `<ha-icon icon="mdi:${escS(icon)}" aria-hidden="true"></ha-icon>` : '<span aria-hidden="true">∅</span>'}<small>${escS(label)}</small></label>`).join('')}</div></div>`;
}

export function colorPicker(selected) {
  const value = (selected || '').toLowerCase();
  const custom = value && !COLORS.includes(value);
  return `<div class="sc-field"><span class="sc-field-label">Colore</span><div class="sc-swatches" role="radiogroup" aria-label="Colore"><label class="sc-swatch sc-swatch-none${!value ? ' is-selected' : ''}" title="Automatico"><input type="radio" name="color" value="" ${!value ? 'checked' : ''}><span>Auto</span></label>${COLORS.map((c) => `<label class="sc-swatch${value === c ? ' is-selected' : ''}" style="--swatch:${c}" title="${c}"><input type="radio" name="color" value="${c}" ${value === c ? 'checked' : ''}></label>`).join('')}<label class="sc-swatch sc-swatch-custom${custom ? ' is-selected' : ''}" title="Altro colore"${custom ? ` style="--swatch:${escS(value)}"` : ''}><input type="radio" name="color" value="${escS(custom ? value : '#607d8b')}" data-custom ${custom ? 'checked' : ''}><input type="color" data-color-custom value="${escS(custom ? value : '#607d8b')}" aria-label="Altro colore"><span>＋</span></label></div></div>`;
}

