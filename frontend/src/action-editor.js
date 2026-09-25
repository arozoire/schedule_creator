// Desired-state action editor inspired by the weekly-schedule-card Quick Timer:
// mode buttons, sliders and option chips. HA executes; this only builds payloads.
import { uiEscape, check } from './forms.js';

const escA = uiEscape;
export const APPLY_STATE = 'apply_state';
const intersect = (states, key) => states.length ? (states[0].attributes?.[key] || []).filter((value) => states.every((s) => (s.attributes?.[key] || []).includes(value))) : [];
const every = (states, test) => states.length > 0 && states.every(test);
const features = (s) => s.attributes?.supported_features || 0;
export const modeLabels = {off:'Spento',on:'Acceso',auto:'Auto',heat_cool:'Caldo/Freddo',cool:'Freddo',heat:'Caldo',dry:'Deumidifica',fan_only:'Ventola',open:'Apri',close:'Chiudi',stop:'Ferma',position:'Posizione',none:'Nessuna azione'};
const modeIcons = {off:'power',on:'power',auto:'autorenew',heat_cool:'sun-snowflake',cool:'snowflake',heat:'fire',dry:'water-percent',fan_only:'fan',open:'arrow-up',close:'arrow-down',stop:'stop',position:'tune-vertical',none:'minus-circle-outline'};
export const pretty = (value) => modeLabels[value] || String(value).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const round = (value, step) => Math.round(value / step) * step;
// Covers and valves share open/close/stop/position commands and feature bits.
export const POSITION_ACTIONS = {
  cover: {open: 'open_cover', close: 'close_cover', stop: 'stop_cover', position: 'set_cover_position'},
  valve: {open: 'open_valve', close: 'close_valve', stop: 'stop_valve', position: 'set_valve_position'},
};

function capabilities(hass, ids) {
  const domain = ids[0]?.split('.')[0];
  const states = ids.map((id) => hass.states?.[id]).filter(Boolean);
  const numberLimit = (key, fallback, pick) => pick(...states.map((s) => Number(s.attributes?.[key] ?? fallback)));
  const caps = {domain, states, attrs: states[0]?.attributes || {}};
  if (domain === 'climate') {
    caps.modes = intersect(states, 'hvac_modes');
    caps.temperature = every(states, (s) => features(s) & 1 || s.attributes?.temperature != null);
    caps.range = !caps.temperature && every(states, (s) => features(s) & 2);
    caps.min = numberLimit('min_temp', 7, Math.max); caps.max = numberLimit('max_temp', 35, Math.min);
    caps.step = Number(caps.attrs.target_temp_step) || 0.5;
    caps.fan_modes = intersect(states, 'fan_modes');
    caps.preset_modes = intersect(states, 'preset_modes');
    caps.swing_modes = intersect(states, 'swing_modes');
    caps.swing_horizontal_modes = intersect(states, 'swing_horizontal_modes');
    caps.unit = caps.attrs.temperature_unit || hass.config?.unit_system?.temperature || '°C';
  } else if (POSITION_ACTIONS[domain]) {
    caps.modes = [['open', 1], ['close', 2], ['position', 4], ['stop', 8]].filter(([, bit]) => every(states, (s) => features(s) & bit)).map(([mode]) => mode);
    if (!caps.modes.length) caps.modes = ['open', 'close'];
  } else {
    caps.modes = ['on', 'off'];
    if (domain === 'light') {
      const modes = states.map((s) => s.attributes?.supported_color_modes || []);
      caps.dimmable = states.length > 0 && modes.every((m) => m.some((x) => !['onoff', 'unknown'].includes(x)));
      caps.rgb = states.length > 0 && modes.every((m) => m.some((x) => ['hs', 'xy', 'rgb', 'rgbw', 'rgbww'].includes(x)));
      caps.kelvin = states.length > 0 && modes.every((m) => m.includes('color_temp'));
      caps.minK = numberLimit('min_color_temp_kelvin', 2000, Math.max); caps.maxK = numberLimit('max_color_temp_kelvin', 6500, Math.min);
    }
    if (domain === 'fan') {
      caps.speed = every(states, (s) => features(s) & 1);
      caps.preset_modes = intersect(states, 'preset_modes');
    }
  }
  return caps;
}

// Translate a stored action into editable controls; null means "keep as Pro".
export function actionToUi(domain, action, caps) {
  if (!action) return {mode: 'none'};
  const data = action.data || {};
  const keys = Object.keys(data);
  const only = (...allowed) => keys.every((key) => allowed.includes(key));
  if (action.domain !== domain) return null;
  if (domain === 'climate') {
    if (action.action === APPLY_STATE && only('state', 'temperature', 'target_temp_low', 'target_temp_high', 'fan_mode', 'preset_mode', 'swing_mode', 'swing_horizontal_mode')) return {...data, mode: data.state};
    if (action.action === 'set_hvac_mode' && only('hvac_mode')) return {mode: data.hvac_mode};
    if (action.action === 'set_temperature' && only('temperature', 'target_temp_low', 'target_temp_high', 'hvac_mode')) {
      const {hvac_mode: mode, ...rest} = data;
      return {...rest, mode: mode || (caps.states[0]?.state !== 'off' && caps.states[0]?.state) || caps.modes.find((m) => m !== 'off')};
    }
    return null;
  }
  if (POSITION_ACTIONS[domain]) {
    const mode = Object.keys(POSITION_ACTIONS[domain]).find((key) => POSITION_ACTIONS[domain][key] === action.action);
    return mode && only('position') ? {mode, position: data.position} : null;
  }
  if (action.action === 'turn_off' && !keys.length) return {mode: 'off'};
  if (domain === 'light' && action.action === 'turn_on' && only('brightness_pct', 'brightness', 'rgb_color', 'color_temp_kelvin')) {
    const brightness = data.brightness_pct ?? (data.brightness === undefined ? undefined : Math.round(data.brightness / 255 * 100));
    return {mode: 'on', brightness_pct: brightness, color_mode: data.rgb_color ? 'rgb' : data.color_temp_kelvin ? 'kelvin' : '', rgb_color: data.rgb_color, color_temp_kelvin: data.color_temp_kelvin};
  }
  if (domain === 'fan') {
    if (action.action === 'turn_on' && only('percentage', 'preset_mode')) return {mode: 'on', ...data};
    if (action.action === 'set_percentage' && only('percentage')) return {mode: 'on', percentage: data.percentage};
    if (action.action === 'set_preset_mode' && only('preset_mode')) return {mode: 'on', preset_mode: data.preset_mode};
    return null;
  }
  if (action.action === 'turn_on' && !keys.length) return {mode: 'on'};
  return null;
}

function defaults(caps, optional) {
  if (optional) return {mode: 'none'};
  const a = caps.attrs, current = caps.states[0]?.state;
  if (caps.domain === 'climate') {
    const mode = caps.modes.includes(current) && current !== 'off' ? current : caps.modes.find((m) => m !== 'off') || caps.modes[0];
    return {mode, temperature: a.temperature ?? round((caps.min + caps.max) / 2, caps.step), target_temp_low: a.target_temp_low ?? caps.min, target_temp_high: a.target_temp_high ?? caps.max, fan_mode: a.fan_mode, preset_mode: a.preset_mode, swing_mode: a.swing_mode, swing_horizontal_mode: a.swing_horizontal_mode};
  }
  if (POSITION_ACTIONS[caps.domain]) return {mode: caps.modes.includes('position') ? 'position' : caps.modes[0], position: a.current_position ?? 50};
  return {mode: 'on', brightness_pct: 100, percentage: a.percentage ?? 50};
}

function choices(name, label, values, selected, {primary = false, icons = false} = {}) {
  if (!values.length) return '';
  return `<div class="sc-field"><span class="sc-field-label" id="${name}-label">${escA(label)}</span><div class="sc-choices${primary ? ' sc-mode-buttons' : ''}" role="radiogroup" aria-labelledby="${name}-label">${values.map((v) => `<label class="sc-choice${String(v) === String(selected) ? ' is-selected' : ''}"><input type="radio" name="${name}" value="${escA(v)}" ${String(v) === String(selected) ? 'checked' : ''}>${icons ? `<ha-icon icon="mdi:${modeIcons[v] || 'tune'}" aria-hidden="true"></ha-icon>` : ''}<span>${escA(pretty(v))}</span></label>`).join('')}</div></div>`;
}

export function rangeField(name, label, value, min, max, step = 1, unit = '') {
  const v = Math.min(max, Math.max(min, Number(value ?? min)));
  const fill = max > min ? (v - min) / (max - min) * 100 : 0;
  return `<div class="sc-field sc-range"><div class="sc-range-head"><span class="sc-field-label" id="${name}-label">${escA(label)}</span><span class="sc-range-value"><input type="number" data-mirror="${name}" aria-labelledby="${name}-label" min="${min}" max="${max}" step="${step}" value="${v}">${escA(unit)}</span></div><input type="range" name="${name}" aria-labelledby="${name}-label" min="${min}" max="${max}" step="${step}" value="${v}" style="--sc-fill:${fill}%"><div class="sc-range-labels" aria-hidden="true"><span>${min}</span><span>${max}</span></div></div>`;
}

// Big value with − / + like the weekly-schedule-card editor (climate temperature).
export function stepperField(name, label, value, min, max, step, unit = '') {
  const v = Math.min(max, Math.max(min, Number(value ?? min)));
  return `<div class="sc-field sc-stepper"><span class="sc-field-label" id="${name}-label">${escA(label)}</span><div class="sc-stepper-row"><button type="button" class="sc-step" data-command="stepValue" data-id="${name}:-1" aria-label="Diminuisci">−</button><span class="sc-stepper-value"><input type="number" name="${name}" aria-labelledby="${name}-label" min="${min}" max="${max}" step="${step}" value="${v}" inputmode="decimal"><span>${escA(unit)}</span></span><button type="button" class="sc-step" data-command="stepValue" data-id="${name}:1" aria-label="Aumenta">+</button></div><div class="sc-range-labels" aria-hidden="true"><span>${min}</span><span>${max}</span></div></div>`;
}

export function describeState(state, domain) {
  if (!state) return '';
  const a = state.attributes || {};
  const parts = [{open: 'Aperta', closed: 'Chiusa', opening: 'In apertura', closing: 'In chiusura'}[state.state] || pretty(state.state)];
  if (!['off', 'unknown', 'unavailable'].includes(state.state)) {
    if (domain === 'climate' && a.temperature != null && state.state !== 'fan_only') parts.push(`${a.temperature}${a.temperature_unit || '°C'}`);
    if (domain === 'climate' && a.fan_mode) parts.push(pretty(a.fan_mode));
    if (domain === 'light' && a.brightness != null) parts.push(`${Math.round(a.brightness / 255 * 100)}%`);
    if (domain === 'fan' && a.percentage != null) parts.push(`${a.percentage}%`);
    if (POSITION_ACTIONS[domain] && a.current_position != null) parts.push(`${a.current_position}%`);
  }
  return parts.join(' · ');
}

export function actionForm(prefix, label, hass, ids, value, optional, draft = {}) {
  const caps = capabilities(hass, ids);
  const {domain} = caps;
  if (!domain) return `<fieldset><legend>${label}</legend><p>Seleziona prima un’entità.</p></fieldset>`;
  const parsed = value === undefined || value === null ? (optional ? {mode: 'none'} : null) : actionToUi(domain, value, caps);
  const base = {...defaults(caps, false), ...(value ? parsed || {} : optional ? {mode: 'none'} : {})};
  const get = (key) => draft[`${prefix}_${key}`] ?? base[key];
  const pro = (draft[`${prefix}_pro`] ?? (value && !parsed ? 'on' : '')) === 'on';
  const modes = [...(optional ? ['none'] : []), ...caps.modes];
  const mode = modes.includes(get('mode')) ? get('mode') : modes[0];
  const fields = [], more = [];
  const name = (key) => `${prefix}_${key}`;
  fields.push(choices(name('mode'), domain === 'climate' ? 'Modalità HVAC' : POSITION_ACTIONS[domain] ? 'Comando' : 'Stato', modes, mode, {primary: true, icons: true}));
  if (domain === 'climate' && !['none', 'off'].includes(mode)) {
    if (mode !== 'fan_only' && caps.temperature) fields.push(stepperField(name('temperature'), 'Temperatura', get('temperature'), caps.min, caps.max, caps.step, caps.unit));
    if (mode !== 'fan_only' && caps.range) fields.push(stepperField(name('target_temp_low'), 'Minima', get('target_temp_low'), caps.min, caps.max, caps.step, caps.unit), stepperField(name('target_temp_high'), 'Massima', get('target_temp_high'), caps.min, caps.max, caps.step, caps.unit));
    fields.push(choices(name('fan_mode'), 'Ventola', caps.fan_modes, get('fan_mode')));
    more.push(choices(name('preset_mode'), 'Preset', caps.preset_modes, get('preset_mode')));
    more.push(choices(name('swing_mode'), 'Swing', caps.swing_modes, get('swing_mode')));
    more.push(choices(name('swing_horizontal_mode'), 'Swing orizzontale', caps.swing_horizontal_modes, get('swing_horizontal_mode')));
  }
  if (domain === 'light' && mode === 'on') {
    if (caps.dimmable) fields.push(rangeField(name('brightness_pct'), 'Luminosità', get('brightness_pct') ?? 100, 1, 100, 1, '%'));
    const colors = [['', 'Non cambiare colore'], ...(caps.rgb ? [['rgb', 'Colore']] : []), ...(caps.kelvin ? [['kelvin', 'Temperatura colore']] : [])];
    const colorMode = get('color_mode') || '';
    if (colors.length > 1) fields.push(`<label>Colore<select name="${name('color_mode')}">${colors.map(([v, t]) => `<option value="${v}" ${v === colorMode ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`);
    if (colorMode === 'rgb') fields.push(`<label>Colore<input name="${name('color')}" type="color" value="${escA(draft[name('color')] ?? (base.rgb_color ? '#' + base.rgb_color.map((v) => v.toString(16).padStart(2, '0')).join('') : '#ffffff'))}"></label>`);
    if (colorMode === 'kelvin') fields.push(rangeField(name('color_temp_kelvin'), 'Temperatura colore', get('color_temp_kelvin') ?? 3000, caps.minK, caps.maxK, 50, 'K'));
  }
  if (domain === 'fan' && mode === 'on') {
    if (caps.speed) fields.push(rangeField(name('percentage'), 'Velocità', get('percentage') ?? 50, 0, 100, 1, '%'));
    fields.push(choices(name('preset_mode'), 'Preset', caps.preset_modes, get('preset_mode')));
  }
  if (POSITION_ACTIONS[domain] && mode === 'position') fields.push(rangeField(name('position'), 'Posizione', get('position') ?? 50, 0, 100, 1, '%'));
  const extra = more.filter(Boolean);
  const current = caps.states.length === 1 ? `<p class="sc-current">Stato attuale <strong>${escA(describeState(caps.states[0], domain))}</strong></p>` : '';
  const json = draft[name('json')] ?? JSON.stringify(value ? {domain: value.domain, action: value.action, data: value.data} : {domain, action: domain === 'climate' ? APPLY_STATE : POSITION_ACTIONS[domain]?.open || 'turn_on', data: domain === 'climate' ? {state: mode} : {}}, null, 2);
  return `<fieldset class="sc-action" data-action="${prefix}" data-domain="${escA(domain)}"><legend>${label}</legend>${current}${pro ? '<p>Azione personalizzata conservata in modalità Pro.</p>' : ''}<div class="sc-action-fields" ${pro ? 'hidden' : ''}>${fields.join('')}${extra.length ? `<details class="sc-more" data-section="${prefix}-more"><summary>Altre opzioni</summary>${extra.join('')}</details>` : ''}</div><details data-section="${prefix}-pro"><summary>Pro · azione personalizzata</summary>${check(name('pro'), 'Usa JSON al posto dei controlli', pro)}<label>Azione JSON<textarea name="${name('json')}" rows="4">${escA(json)}</textarea></label></details></fieldset>`;
}

export function readAction(form, prefix, domain) {
  const el = (key) => form.elements[`${prefix}_${key}`];
  // Radio groups come back as RadioNodeList; plain objects are accepted in tests.
  const val = (key) => el(key)?.value;
  const num = (key) => (val(key) === undefined || val(key) === '' ? undefined : Number(val(key)));
  if (el('pro')?.checked) {
    const a = JSON.parse(val('json'));
    if (!a || a.domain !== domain || !a.action || !a.data || typeof a.data !== 'object' || Array.isArray(a.data)) throw new Error('Azione Pro non valida per le entità selezionate.');
    if (['entity_id', 'device_id', 'area_id'].some((k) => k in a.data)) throw new Error('Il target è già definito dalle entità selezionate.');
    if (a.action === APPLY_STATE && typeof a.data.state !== 'string') throw new Error('apply_state richiede il campo "state".');
    return {domain: a.domain, action: a.action, data: a.data};
  }
  const mode = val('mode');
  if (mode === 'none') return null;
  if (!mode) throw new Error('Scegli cosa deve fare il dispositivo.');
  const data = {};
  const put = (key, value) => { if (value !== undefined && value !== '') data[key] = value; };
  let action;
  if (domain === 'climate') {
    action = APPLY_STATE; data.state = mode;
    if (mode !== 'off') {
      if (mode !== 'fan_only') { put('temperature', num('temperature')); put('target_temp_low', num('target_temp_low')); put('target_temp_high', num('target_temp_high')); }
      for (const key of ['fan_mode', 'preset_mode', 'swing_mode', 'swing_horizontal_mode']) put(key, val(key));
    }
  } else if (POSITION_ACTIONS[domain]) {
    action = POSITION_ACTIONS[domain][mode];
    if (mode === 'position') put('position', num('position'));
  } else {
    action = mode === 'off' ? 'turn_off' : 'turn_on';
    if (mode === 'on' && domain === 'light') {
      put('brightness_pct', num('brightness_pct'));
      if (val('color_mode') === 'rgb' && val('color')) data.rgb_color = val('color').slice(1).match(/../g).map((v) => parseInt(v, 16));
      if (val('color_mode') === 'kelvin') put('color_temp_kelvin', num('color_temp_kelvin'));
    }
    if (mode === 'on' && domain === 'fan') { put('percentage', num('percentage')); put('preset_mode', val('preset_mode')); }
  }
  if (!action) throw new Error('Comando non disponibile per questo dispositivo.');
  if (/^set_(cover|valve)_position$/.test(action) && data.position === undefined) throw new Error('Indica la posizione richiesta.');
  if (Object.values(data).some((v) => typeof v === 'number' && !Number.isFinite(v))) throw new Error('Inserisci un valore numerico valido.');
  return {domain, action, data};
}

// Short human text used for suggested names and notification messages.
export function describeAction(action) {
  if (!action) return '';
  const d = action.data || {};
  if (action.action === APPLY_STATE) {
    const parts = [pretty(d.state)];
    if (d.temperature != null) parts.push(`${d.temperature}°`);
    if (d.target_temp_low != null && d.target_temp_high != null) parts.push(`${d.target_temp_low}–${d.target_temp_high}°`);
    if (d.fan_mode) parts.push(`ventola ${pretty(d.fan_mode).toLowerCase()}`);
    return parts.join(' ');
  }
  const base = {turn_on: 'Accendi', turn_off: 'Spegni', open_cover: 'Apri', close_cover: 'Chiudi', stop_cover: 'Ferma', set_cover_position: `Posizione ${d.position}%`, open_valve: 'Apri', close_valve: 'Chiudi', stop_valve: 'Ferma', set_valve_position: `Posizione ${d.position}%`, set_hvac_mode: pretty(d.hvac_mode), set_temperature: `${d.temperature ?? ''}°`, set_percentage: `Velocità ${d.percentage}%`}[action.action] || pretty(action.action);
  const extra = d.brightness_pct != null ? ` ${d.brightness_pct}%` : d.percentage != null && action.action === 'turn_on' ? ` ${d.percentage}%` : '';
  return base + extra;
}
