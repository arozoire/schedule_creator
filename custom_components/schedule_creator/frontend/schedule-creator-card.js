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
function notificationForm(prefix,label,value,hass,draft={}) {
  const enabled = draft[`${prefix}_enabled`] === undefined ? !!value : draft[`${prefix}_enabled`] === 'on';
  const services = ['persistent_notification.create',...Object.keys(hass.services?.notify || {}).map((x)=>`notify.${x}`)];
  if(value && !services.includes(value.action)) services.push(value.action);
  return `<fieldset><legend>${label}</legend>${check(`${prefix}_enabled`,'Abilita notifica',enabled)}<div ${enabled ? '' : 'hidden'}>${choice(`${prefix}_action`,'Destinazione',services.map((x)=>[x,x==='persistent_notification.create'?'Notifica in Home Assistant':x]),draft[`${prefix}_action`] ?? value?.action ?? services[0])}${input(`${prefix}_title`,'Titolo',draft[`${prefix}_title`] ?? value?.title ?? '')}${input(`${prefix}_message`,'Messaggio',draft[`${prefix}_message`] ?? value?.message ?? '')}</div></fieldset>`;
}
function readNotification(form,prefix) {
  return form.elements[`${prefix}_enabled`]?.checked ? {action:form.elements[`${prefix}_action`].value,title:form.elements[`${prefix}_title`].value,message:form.elements[`${prefix}_message`].value} : null;
}
// Desired-state action editor inspired by the weekly-schedule-card Quick Timer:
// mode buttons, sliders and option chips. HA executes; this only builds payloads.


const escA = uiEscape;
const APPLY_STATE = 'apply_state';
const intersect = (states, key) => states.length ? (states[0].attributes?.[key] || []).filter((value) => states.every((s) => (s.attributes?.[key] || []).includes(value))) : [];
const every = (states, test) => states.length > 0 && states.every(test);
const features = (s) => s.attributes?.supported_features || 0;
const modeLabels = {off:'Spento',on:'Acceso',auto:'Auto',heat_cool:'Caldo/Freddo',cool:'Freddo',heat:'Caldo',dry:'Deumidifica',fan_only:'Ventola',open:'Apri',close:'Chiudi',stop:'Ferma',position:'Posizione',none:'Nessuna azione'};
const modeIcons = {off:'power',on:'power',auto:'autorenew',heat_cool:'sun-snowflake',cool:'snowflake',heat:'fire',dry:'water-percent',fan_only:'fan',open:'arrow-up',close:'arrow-down',stop:'stop',position:'tune-vertical',none:'minus-circle-outline'};
const pretty = (value) => modeLabels[value] || String(value).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const round = (value, step) => Math.round(value / step) * step;

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
  } else if (domain === 'cover') {
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
function actionToUi(domain, action, caps) {
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
  if (domain === 'cover') {
    const mode = {open_cover: 'open', close_cover: 'close', stop_cover: 'stop', set_cover_position: 'position'}[action.action];
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
  if (caps.domain === 'cover') return {mode: caps.modes.includes('position') ? 'position' : caps.modes[0], position: a.current_position ?? 50};
  return {mode: 'on', brightness_pct: 100, percentage: a.percentage ?? 50};
}

function choices(name, label, values, selected, {primary = false, icons = false} = {}) {
  if (!values.length) return '';
  return `<div class="sc-field"><span class="sc-field-label" id="${name}-label">${escA(label)}</span><div class="sc-choices${primary ? ' sc-mode-buttons' : ''}" role="radiogroup" aria-labelledby="${name}-label">${values.map((v) => `<label class="sc-choice${String(v) === String(selected) ? ' is-selected' : ''}"><input type="radio" name="${name}" value="${escA(v)}" ${String(v) === String(selected) ? 'checked' : ''}>${icons ? `<ha-icon icon="mdi:${modeIcons[v] || 'tune'}" aria-hidden="true"></ha-icon>` : ''}<span>${escA(pretty(v))}</span></label>`).join('')}</div></div>`;
}

function rangeField(name, label, value, min, max, step = 1, unit = '') {
  const v = Math.min(max, Math.max(min, Number(value ?? min)));
  const fill = max > min ? (v - min) / (max - min) * 100 : 0;
  return `<div class="sc-field sc-range"><div class="sc-range-head"><span class="sc-field-label" id="${name}-label">${escA(label)}</span><span class="sc-range-value"><input type="number" data-mirror="${name}" aria-labelledby="${name}-label" min="${min}" max="${max}" step="${step}" value="${v}">${escA(unit)}</span></div><input type="range" name="${name}" aria-labelledby="${name}-label" min="${min}" max="${max}" step="${step}" value="${v}" style="--sc-fill:${fill}%"><div class="sc-range-labels" aria-hidden="true"><span>${min}</span><span>${max}</span></div></div>`;
}

// Big value with − / + like the weekly-schedule-card editor (climate temperature).
function stepperField(name, label, value, min, max, step, unit = '') {
  const v = Math.min(max, Math.max(min, Number(value ?? min)));
  return `<div class="sc-field sc-stepper"><span class="sc-field-label" id="${name}-label">${escA(label)}</span><div class="sc-stepper-row"><button type="button" class="sc-step" data-command="stepValue" data-id="${name}:-1" aria-label="Diminuisci">−</button><span class="sc-stepper-value"><input type="number" name="${name}" aria-labelledby="${name}-label" min="${min}" max="${max}" step="${step}" value="${v}" inputmode="decimal"><span>${escA(unit)}</span></span><button type="button" class="sc-step" data-command="stepValue" data-id="${name}:1" aria-label="Aumenta">+</button></div><div class="sc-range-labels" aria-hidden="true"><span>${min}</span><span>${max}</span></div></div>`;
}

function describeState(state, domain) {
  if (!state) return '';
  const a = state.attributes || {};
  const parts = [pretty(state.state)];
  if (!['off', 'unknown', 'unavailable'].includes(state.state)) {
    if (domain === 'climate' && a.temperature != null && state.state !== 'fan_only') parts.push(`${a.temperature}${a.temperature_unit || '°C'}`);
    if (domain === 'climate' && a.fan_mode) parts.push(pretty(a.fan_mode));
    if (domain === 'light' && a.brightness != null) parts.push(`${Math.round(a.brightness / 255 * 100)}%`);
    if (domain === 'fan' && a.percentage != null) parts.push(`${a.percentage}%`);
    if (domain === 'cover' && a.current_position != null) parts.push(`${a.current_position}%`);
  }
  return parts.join(' · ');
}

function actionForm(prefix, label, hass, ids, value, optional, draft = {}) {
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
  fields.push(choices(name('mode'), domain === 'climate' ? 'Modalità HVAC' : domain === 'cover' ? 'Comando' : 'Stato', modes, mode, {primary: true, icons: true}));
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
  if (domain === 'cover' && mode === 'position') fields.push(rangeField(name('position'), 'Posizione', get('position') ?? 50, 0, 100, 1, '%'));
  const extra = more.filter(Boolean);
  const current = caps.states.length === 1 ? `<p class="sc-current">Stato attuale <strong>${escA(describeState(caps.states[0], domain))}</strong></p>` : '';
  const json = draft[name('json')] ?? JSON.stringify(value ? {domain: value.domain, action: value.action, data: value.data} : {domain, action: domain === 'climate' ? APPLY_STATE : caps.modes.includes('on') ? 'turn_on' : 'open_cover', data: domain === 'climate' ? {state: mode} : {}}, null, 2);
  return `<fieldset class="sc-action" data-action="${prefix}" data-domain="${escA(domain)}"><legend>${label}</legend>${current}${pro ? '<p>Azione personalizzata conservata in modalità Pro.</p>' : ''}<div class="sc-action-fields" ${pro ? 'hidden' : ''}>${fields.join('')}${extra.length ? `<details class="sc-more" data-section="${prefix}-more"><summary>Altre opzioni</summary>${extra.join('')}</details>` : ''}</div><details data-section="${prefix}-pro"><summary>Pro · azione personalizzata</summary>${check(name('pro'), 'Usa JSON al posto dei controlli', pro)}<label>Azione JSON<textarea name="${name('json')}" rows="4">${escA(json)}</textarea></label></details></fieldset>`;
}

function readAction(form, prefix, domain) {
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
  } else if (domain === 'cover') {
    action = {open: 'open_cover', close: 'close_cover', stop: 'stop_cover', position: 'set_cover_position'}[mode];
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
  if (action === 'set_cover_position' && data.position === undefined) throw new Error('Indica la posizione richiesta.');
  if (Object.values(data).some((v) => typeof v === 'number' && !Number.isFinite(v))) throw new Error('Inserisci un valore numerico valido.');
  return {domain, action, data};
}

// Short human text used for suggested names and notification messages.
function describeAction(action) {
  if (!action) return '';
  const d = action.data || {};
  if (action.action === APPLY_STATE) {
    const parts = [pretty(d.state)];
    if (d.temperature != null) parts.push(`${d.temperature}°`);
    if (d.target_temp_low != null && d.target_temp_high != null) parts.push(`${d.target_temp_low}–${d.target_temp_high}°`);
    if (d.fan_mode) parts.push(`ventola ${pretty(d.fan_mode).toLowerCase()}`);
    return parts.join(' ');
  }
  const base = {turn_on: 'Accendi', turn_off: 'Spegni', open_cover: 'Apri', close_cover: 'Chiudi', stop_cover: 'Ferma', set_cover_position: `Posizione ${d.position}%`, set_hvac_mode: pretty(d.hvac_mode), set_temperature: `${d.temperature ?? ''}°`, set_percentage: `Velocità ${d.percentage}%`}[action.action] || pretty(action.action);
  const extra = d.brightness_pct != null ? ` ${d.brightness_pct}%` : d.percentage != null && action.action === 'turn_on' ? ` ${d.percentage}%` : '';
  return base + extra;
}
// Schedule editor widgets modelled on weekly-schedule-card: time bar with magnets,
// day shortcuts, entity-first conditions, icon and colour pickers.


const escS = uiEscape;
const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const DAY_SHORTCUTS = {all: [0, 1, 2, 3, 4, 5, 6], workdays: [0, 1, 2, 3, 4], weekend: [5, 6]};
const SNAP_OPTIONS = [5, 10, 15, 30];
const toMinutes = (value) => { const [h, m] = String(value || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
const toTime = (minutes) => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

// Background blocks: other slots on at least one of the selected days.
function slotBlocks(others, weekdays) {
  return others.filter((o) => o.weekdays.some((d) => weekdays.includes(d))).flatMap((o) => {
    const start = toMinutes(o.start), end = toMinutes(o.end);
    return end > start ? [{...o, from: start, to: end}] : [{...o, from: start, to: 1440}, ...(end ? [{...o, from: 0, to: end}] : [])];
  });
}

function magnetSnap(minutes, points, threshold, snap) {
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

function slotsForm(slots, {others = [], snap = 15} = {}) {
  const snapRow = `<div class="sc-snap" role="group" aria-label="Passo di aggancio"><span>Passo</span>${SNAP_OPTIONS.map((s) => `<button type="button" class="sc-pill${s === snap ? ' is-selected' : ''}" data-command="setSnap" data-id="${s}" aria-pressed="${s === snap}">${s} min</button>`).join('')}</div>`;
  return snapRow + slots.map((slot, i) => {
    const key = slot.weekdays.join('');
    const shortcuts = [['all', 'Tutti'], ['workdays', 'Feriali'], ['weekend', 'Weekend']].map(([id, label]) => `<button type="button" class="sc-pill${DAY_SHORTCUTS[id].join('') === key ? ' is-selected' : ''}" data-command="slotDays" data-id="${i}:${id}">${label}</button>`).join('');
    const days = DAY_LABELS.map((d, day) => `<label class="sc-day-chip"><input type="checkbox" name="slot_${i}_days" value="${day}" ${slot.weekdays.includes(day) ? 'checked' : ''}><span>${d}</span></label>`).join('');
    const siblings = slots.filter((_, j) => j !== i).map((s) => ({...s, name: 'Altra fascia di questo schedule', color: '#8a96a3'}));
    return `<fieldset data-slot="${i}"><legend>Fascia ${i + 1}</legend>${timebar(i, slot, [...others, ...siblings], snap)}<div class="sc-time-row">${`<label>Inizio<input name="slot_${i}_start" type="time" value="${escS(slot.start)}"></label><label>Fine<input name="slot_${i}_end" type="time" value="${escS(slot.end)}"></label>`}</div><div class="sc-shortcuts">${shortcuts}</div><div class="sc-days">${days}</div>${slots.length > 1 ? `<button type="button" data-command="removeSlot" data-id="${i}">Rimuovi fascia</button>` : ''}</fieldset>`;
  }).join('') + '<button type="button" data-command="addSlot">＋ Fascia successiva</button>';
}

function readSlots(form) {
  return [...form.querySelectorAll('[data-slot]')].map((node) => {
    const i = node.dataset.slot;
    return {weekdays: [...node.querySelectorAll('input[type=checkbox]:checked')].map((x) => Number(x.value)), start: form.elements[`slot_${i}_start`].value, end: form.elements[`slot_${i}_end`].value};
  });
}

// ---------------------------------------------------------------- conditions
const blankCondition = () => ({operator: 'state_equals', entity_id: '', value: null, lower: null, upper: null, children: [], minimum_duration_seconds: null, hysteresis: null});
const NUMERIC_DOMAINS = ['input_number', 'number', 'counter'];
const BOOLEAN_DOMAINS = ['binary_sensor', 'input_boolean', 'switch', 'light', 'fan', 'automation', 'person', 'device_tracker'];

// What can be compared for an entity: decides operators and value control.
function conditionKind(hass, entityId) {
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
function defaultHysteresis(unit, value) {
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

function conditionForm(node, hass, path = 'condition') {
  if (!node) return '<p>Nessuna condizione: lo schedule esegue sempre nelle sue fasce.</p><button type="button" data-command="addCondition">＋ Condizione</button>';
  if (!['and', 'or'].includes(node.operator)) return `${leafForm(node, path, hass)}${path === 'condition' ? '<button type="button" data-command="addCondition">＋ Altra condizione</button>' : ''}`;
  const group = `<div class="sc-field"><span class="sc-field-label">Quando vale lo schedule</span>${radios(`${path}_operator`, [['and', 'Tutte le condizioni'], ['or', 'Almeno una']], node.operator)}</div>`;
  return `<div class="sc-condition-group" data-condition="${path}">${group}${node.children.map((child, i) => conditionForm(child, hass, `${path}.${i}`)).join('')}<button type="button" data-command="${path === 'condition' ? 'addCondition' : 'addConditionChild'}" data-id="${path}">＋ Altra condizione</button></div>`;
}

function readCondition(form, path = 'condition') {
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
const ICONS = [['home', 'Casa'], ['sofa', 'Soggiorno'], ['bed', 'Camera'], ['silverware-fork-knife', 'Cucina'], ['shower', 'Bagno'], ['desk', 'Studio'], ['garage', 'Garage'], ['tree', 'Giardino'], ['stairs', 'Scale'], ['lightbulb', 'Luci'], ['ceiling-light', 'Plafoniera'], ['led-strip-variant', 'Striscia LED'], ['thermostat', 'Termostato'], ['air-conditioner', 'Clima'], ['radiator', 'Termosifone'], ['fan', 'Ventola'], ['blinds', 'Tapparelle'], ['curtains', 'Tende'], ['power-socket-eu', 'Presa'], ['water-boiler', 'Boiler'], ['washing-machine', 'Lavatrice'], ['television', 'TV'], ['robot-vacuum', 'Robot'], ['sprinkler-variant', 'Irrigazione'], ['weather-night', 'Notte'], ['white-balance-sunny', 'Giorno'], ['briefcase', 'Lavoro'], ['beach', 'Vacanza'], ['snowflake', 'Inverno'], ['calendar-clock', 'Programma']];
const COLORS = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#00897b', '#039be5', '#3949ab', '#8e24aa', '#d81b60', '#6d4c41', '#546e7a', '#9e9e9e'];

function iconPicker(selected) {
  const value = String(selected || '').replace(/^mdi:/, '');
  const known = ICONS.some(([id]) => id === value);
  const options = [['', 'Nessuna', ''], ...ICONS.map(([id, label]) => [`mdi:${id}`, label, id]), ...(value && !known ? [[selected, value, value]] : [])];
  return `<div class="sc-field"><span class="sc-field-label">Icona</span><div class="sc-icon-grid" role="radiogroup" aria-label="Icona">${options.map(([v, label, icon]) => `<label class="sc-icon-choice${(selected || '') === v ? ' is-selected' : ''}" title="${escS(label)}"><input type="radio" name="icon" value="${escS(v)}" ${(selected || '') === v ? 'checked' : ''}>${icon ? `<ha-icon icon="mdi:${escS(icon)}" aria-hidden="true"></ha-icon>` : '<span aria-hidden="true">∅</span>'}<small>${escS(label)}</small></label>`).join('')}</div></div>`;
}

function colorPicker(selected) {
  const value = (selected || '').toLowerCase();
  const custom = value && !COLORS.includes(value);
  return `<div class="sc-field"><span class="sc-field-label">Colore</span><div class="sc-swatches" role="radiogroup" aria-label="Colore"><label class="sc-swatch sc-swatch-none${!value ? ' is-selected' : ''}" title="Automatico"><input type="radio" name="color" value="" ${!value ? 'checked' : ''}><span>Auto</span></label>${COLORS.map((c) => `<label class="sc-swatch${value === c ? ' is-selected' : ''}" style="--swatch:${c}" title="${c}"><input type="radio" name="color" value="${c}" ${value === c ? 'checked' : ''}></label>`).join('')}<label class="sc-swatch sc-swatch-custom${custom ? ' is-selected' : ''}" title="Altro colore"${custom ? ` style="--swatch:${escS(value)}"` : ''}><input type="radio" name="color" value="${escS(custom ? value : '#607d8b')}" data-custom ${custom ? 'checked' : ''}><input type="color" data-color-custom value="${escS(custom ? value : '#607d8b')}" aria-label="Altro colore"><span>＋</span></label></div></div>`;
}
// Weekly wall-clock projection; execution and date exceptions remain server-side.
function weeklySegments(schedules) {
  const days = Array.from({length:7},()=>[]);
  const minutes = value => {const [h,m]=value.split(':').map(Number);return h*60+m;};
  for(const schedule of schedules) for(const slot of schedule.time_slots || []) {
    const start=minutes(slot.start),end=minutes(slot.end);
    for(const day of slot.weekdays) {
      if(end>start) days[day].push({schedule,start,end});
      else {
        days[day].push({schedule,start,end:1440});
        if(end>0) days[(day+1)%7].push({schedule,start:0,end});
      }
    }
  }
  for(const day of days) {
    day.sort((a,b)=>a.start-b.start || b.end-a.end);
    let cluster=[],ends=[];
    const finish=()=>{for(const segment of cluster) segment.lanes=ends.length;cluster=[];ends=[];};
    for(const segment of day) {
      if(cluster.length && ends.every(end=>end<=segment.start)) finish();
      let lane=ends.findIndex(end=>end<=segment.start);
      if(lane<0) lane=ends.length;
      ends[lane]=segment.end;segment.lane=lane;cluster.push(segment);
    }
    finish();
  }
  return days;
}







const STYLE = ":host {\n  overflow-anchor: none;\n  display: block;\n  font-family: var(--primary-font-family, Arial, sans-serif);\n  color: var(--primary-text-color, #202a35);\n  container-type: inline-size;\n  --sc-accent: var(--primary-color, #00897b);\n  --sc-muted: var(--secondary-text-color, #647180);\n  --sc-surface: var(--secondary-background-color, #f4f6f8);\n  --sc-border: var(--divider-color, #dce2e7);\n}\n* {\n  box-sizing: border-box;\n}\nha-card {\n  display: block;\n  overflow: hidden;\n  padding: 24px;\n  border-radius: var(--ha-card-border-radius, 20px);\n  background: var(--card-background-color, #fff);\n}\nbutton,\ninput,\nselect,\ntextarea {\n  font: inherit;\n  color: inherit;\n}\nbutton {\n  min-height: 40px;\n  padding: 9px 14px;\n  border: 1px solid var(--sc-border);\n  border-radius: 10px;\n  background: var(--card-background-color, #fff);\n  cursor: pointer;\n  line-height: 1.3;\n  transition:\n    background 0.15s,\n    border-color 0.15s;\n}\nbutton:hover {\n  background: var(--sc-surface);\n  border-color: var(--sc-accent);\n}\nbutton:disabled {\n  opacity: 0.5;\n  cursor: wait;\n}\nbutton:focus-visible,\ninput:focus-visible,\nselect:focus-visible,\ntextarea:focus-visible,\nsummary:focus-visible {\n  outline: 3px solid var(--sc-accent);\n  outline-offset: 3px;\n}\nbutton[data-command^=\"delete\"],\nbutton[data-command^=\"remove\"] {\n  color: var(--error-color, #b3261e);\n}\nbutton[data-command=\"newSchedule\"],\n.sc-actions button[type=\"submit\"] {\n  background: var(--sc-accent);\n  color: var(--text-primary-color, #fff);\n  border-color: var(--sc-accent);\n  font-weight: 600;\n}\n.card-header {\n  margin-bottom: 20px;\n}\n.hdr-row1 {\n  display: flex;\n  gap: 12px;\n  align-items: center;\n  margin-bottom: 20px;\n}\n.card-title {\n  font-size: 1.4rem;\n  font-weight: 700;\n  letter-spacing: -0.03em;\n}\n.sc-version {\n  margin-left: auto;\n  color: var(--sc-muted);\n  font-size: 0.72rem;\n  border: 1px solid var(--sc-border);\n  border-radius: 20px;\n  padding: 4px 8px;\n}\n.sc-eyebrow {\n  font-size: 0.7rem;\n  font-weight: 700;\n  letter-spacing: 0.1em;\n  text-transform: uppercase;\n  color: var(--sc-muted);\n  margin: 0 0 8px;\n}\n.hdr-row2 {\n  display: flex;\n  gap: 8px;\n  overflow-x: auto;\n  padding: 3px 2px 8px;\n}\n.profile-chip {\n  flex-shrink: 0;\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  border-radius: 24px;\n  color: var(--sc-muted);\n}\n.profile-chip.viewed {\n  color: var(--primary-text-color, #202a35);\n  border-color: var(--pchip-color);\n  background: color-mix(\n    in srgb,\n    var(--pchip-color) 12%,\n    var(--card-background-color, #fff)\n  );\n  font-weight: 600;\n}\n.profile-chip.active-op::before {\n  content: \"\";\n  width: 7px;\n  height: 7px;\n  border-radius: 50%;\n  background: var(--success-color, #388e3c);\n}\n.profile-status-bar {\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 8px;\n  font-size: 0.8rem;\n  color: var(--sc-muted);\n  margin: 0 0 18px;\n}\n.sc-badge {\n  display: inline-flex;\n  align-items: center;\n  padding: 5px 9px;\n  border-radius: 6px;\n  background: var(--sc-surface);\n  font-size: 0.73rem;\n  font-weight: 600;\n}\n.sc-badge.is-active {\n  color: var(--success-color, #287d39);\n  background: color-mix(\n    in srgb,\n    var(--success-color, #287d39) 10%,\n    var(--card-background-color, #fff)\n  );\n}\n.tab-bar {\n  display: flex;\n  overflow-x: auto;\n  gap: 5px;\n  border-bottom: 1px solid var(--sc-border);\n  margin-bottom: 20px;\n  padding-bottom: 8px;\n}\n.tab {\n  white-space: nowrap;\n  border-color: transparent;\n  color: var(--sc-muted);\n}\n.tab.active {\n  color: var(--sc-accent);\n  background: color-mix(\n    in srgb,\n    var(--sc-accent) 9%,\n    var(--card-background-color, #fff)\n  );\n  font-weight: 600;\n}\n.sc-toolbar,\n.sc-controls,\n.sc-actions,\n.sc-entry-actions {\n  display: flex;\n  gap: 8px;\n  flex-wrap: wrap;\n  align-items: center;\n}\n.sc-toolbar {\n  justify-content: space-between;\n  margin: 20px 0 14px;\n}\n.sc-toolbar h2 {\n  font-size: 1.05rem;\n  margin: 0;\n}\n.sc-toolbar p {\n  margin: 4px 0 0;\n  color: var(--sc-muted);\n  font-size: 0.8rem;\n}\n.sc-controls {\n  margin: 14px 0;\n}\n.sc-week {\n  display: grid;\n  grid-template-columns: repeat(7, minmax(0, 1fr));\n  gap: 7px;\n  margin: 14px 0 24px;\n}\n.sc-day {\n  min-width: 0;\n  min-height: 124px;\n  padding: 10px 7px;\n  border: 1px solid var(--sc-border);\n  border-radius: 12px;\n  background: var(--sc-surface);\n}\n.sc-day > strong {\n  display: block;\n  color: var(--sc-muted);\n  font-size: 0.72rem;\n  font-weight: 600;\n  margin: 0 2px 10px;\n}\n.sc-slot {\n  margin-top: 7px;\n  padding: 8px 7px;\n  border-radius: 6px;\n  background: var(--card-background-color, #fff);\n  border-left: 3px solid var(--pchip-color, var(--sc-accent));\n  font-size: 0.72rem;\n  overflow-wrap: anywhere;\n  line-height: 1.5;\n}\n.sc-slot time {\n  font-size: 0.66rem;\n  font-variant-numeric: tabular-nums;\n  color: var(--sc-muted);\n}\n.sc-slot.is-off {\n  opacity: 0.6;\n  border-left-style: dashed;\n}\n.sc-day-empty {\n  color: var(--sc-muted);\n  font-size: 0.72rem;\n}\n.sc-list {\n  list-style: none;\n  padding: 0;\n  margin: 4px 0 0;\n  display: grid;\n  gap: 4px;\n}\n.sc-entry {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 10px;\n  padding: 7px 8px 7px 12px;\n  border: 1px solid var(--sc-border);\n  border-left: 3px solid var(--block-color, var(--sc-accent));\n  border-radius: 8px;\n}\n.sc-entry-copy {\n  min-width: 0;\n  display: grid;\n  gap: 2px;\n}\n.sc-entry strong {\n  font-size: 0.84rem;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.sc-entry .sc-meta {\n  margin: 0;\n  font-size: 0.72rem;\n  line-height: 1.35;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.sc-meta {\n  font-size: 0.76rem;\n  color: var(--sc-muted);\n  margin: 6px 0 0;\n  overflow-wrap: anywhere;\n  line-height: 1.5;\n}\n.sc-entry-actions {\n  flex-shrink: 0;\n  flex-wrap: nowrap !important;\n  gap: 4px !important;\n}\n.sc-entry-actions button {\n  font-size: 0.72rem;\n  min-height: 30px;\n  padding: 4px 9px;\n  border-radius: 7px;\n}\n.sc-empty {\n  padding: 30px 18px;\n  border: 1px dashed var(--sc-border);\n  border-radius: 14px;\n  background: var(--sc-surface);\n  text-align: center;\n  color: var(--sc-muted);\n  font-size: 0.85rem;\n  line-height: 1.6;\n}\n.sc-empty strong {\n  display: block;\n  color: var(--primary-text-color, #202a35);\n  font-size: 1rem;\n  margin-bottom: 5px;\n}\ndetails {\n  border: 1px solid var(--sc-border);\n  border-radius: 12px;\n  padding: 12px 14px;\n  margin: 12px 0;\n}\nsummary {\n  cursor: pointer;\n  font-size: 0.82rem;\n  font-weight: 600;\n  min-height: 24px;\n  line-height: 24px;\n}\ndetails[open] > summary {\n  margin-bottom: 12px;\n}\n.sc-operational {\n  margin-top: 20px;\n  color: var(--sc-muted);\n  font-size: 0.8rem;\n}\n.sc-operational p {\n  line-height: 1.6;\n}\n.sc-editor {\n  padding: 22px;\n  margin: 20px 0;\n  border: 1px solid var(--sc-border);\n  border-radius: 16px;\n  display: grid;\n  gap: 16px;\n  background: var(--sc-surface);\n}\n.sc-editor h3 {\n  font-size: 1.15rem;\n  margin: 0;\n  letter-spacing: -0.02em;\n}\n.sc-editor p {\n  font-size: 0.8rem;\n  color: var(--sc-muted);\n  line-height: 1.6;\n  margin: 0;\n}\n.sc-editor label {\n  display: grid;\n  gap: 7px;\n  font-size: 0.8rem;\n  font-weight: 500;\n  min-width: 0;\n}\n.sc-editor input,\n.sc-editor select,\n.sc-editor textarea {\n  width: 100%;\n  max-width: 100%;\n  min-height: 44px;\n  padding: 10px 12px;\n  background: var(--card-background-color, #fff);\n  border: 1px solid var(--sc-border);\n  border-radius: 8px;\n  font-size: 0.9rem;\n}\n.sc-editor textarea {\n  font-family: monospace;\n  line-height: 1.5;\n  resize: vertical;\n}\n.sc-editor fieldset {\n  min-width: 0;\n  border: 1px solid var(--sc-border);\n  border-radius: 12px;\n  padding: 16px;\n  display: grid;\n  gap: 14px;\n  background: var(--card-background-color, #fff);\n  margin: 0;\n}\n.sc-editor legend {\n  font-size: 0.8rem;\n  font-weight: 700;\n  padding: 0 7px;\n}\n.sc-editor details {\n  margin: 0;\n  background: var(--card-background-color, #fff);\n}\n.sc-editor details > * + * {\n  margin-top: 12px;\n}\n.sc-check {\n  display: flex !important;\n  align-items: center;\n  gap: 9px !important;\n}\n.sc-editor input[type=\"checkbox\"] {\n  width: 18px !important;\n  min-height: 18px;\n  height: 18px;\n  accent-color: var(--sc-accent);\n  flex-shrink: 0;\n}\n.sc-entities {\n  max-height: 240px;\n  overflow: auto;\n  display: grid;\n  gap: 5px;\n  border: 1px solid var(--sc-border);\n  padding: 6px;\n  border-radius: 10px;\n  background: var(--card-background-color, #fff);\n}\n.sc-entities label {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  min-height: 48px;\n  padding: 8px 10px;\n  border-radius: 7px;\n  font-weight: 400;\n}\n.sc-entities label:hover {\n  background: var(--sc-surface);\n}\n.sc-entity-name {\n  display: block;\n  font-weight: 500;\n}\n.sc-entity-id {\n  display: block;\n  font-size: 0.7rem;\n  color: var(--sc-muted);\n  margin-top: 3px;\n  overflow-wrap: anywhere;\n}\n.sc-days {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 7px;\n}\n.sc-days label {\n  padding: 8px;\n  border: 1px solid var(--sc-border);\n  border-radius: 8px;\n}\n.sc-actions {\n  padding-top: 16px;\n  border-top: 1px solid var(--sc-border);\n}\n.sc-actions button {\n  min-width: 100px;\n}\n.status,\n.sc-error {\n  padding: 12px 14px;\n  border-radius: 10px;\n  font-size: 0.85rem;\n  line-height: 1.6;\n  margin: 12px 0;\n  background: var(--sc-surface);\n}\n.sc-error,\n.error {\n  color: var(--error-color, #b3261e);\n  background: color-mix(\n    in srgb,\n    var(--error-color, #b3261e) 8%,\n    var(--card-background-color, #fff)\n  );\n  overflow-wrap: anywhere;\n}\n[hidden],\n.sc-entities label[hidden] {\n  display: none !important;\n}\n@container (max-width:600px) {\n  ha-card {\n    padding: 16px;\n  }\n  .card-title {\n    font-size: 1.2rem;\n  }\n  .sc-week {\n    grid-template-columns: 1fr;\n    gap: 7px;\n  }\n  .sc-day {\n    display: grid;\n    grid-template-columns: 34px 1fr;\n    gap: 5px 9px;\n    min-height: 45px;\n    padding: 9px;\n  }\n  .sc-day > strong {\n    grid-row: 1/20;\n    margin: 5px 0;\n  }\n  .sc-slot {\n    margin: 0;\n    padding: 6px 9px;\n  }\n  .sc-slot time {\n    margin-right: 8px;\n  }\n  .sc-editor {\n    padding: 14px;\n  }\n  .sc-toolbar {\n    align-items: flex-start;\n  }\n  .sc-toolbar .sc-controls {\n    margin: 0;\n  }\n  .sc-days {\n    gap: 5px;\n  }\n  .sc-days label {\n    padding: 7px;\n  }\n  .sc-editor fieldset {\n    padding: 12px;\n  }\n}\n@media (prefers-reduced-motion: reduce) {\n  * {\n    transition: none !important;\n  }\n}\n.sc-slot time {\n  display: block;\n}\n.sc-editor {\n  scroll-margin-top: 16px;\n}\n.sc-error-details textarea {\n  width: 100%;\n  box-sizing: border-box;\n  background: var(--card-background-color, #fff);\n  color: var(--primary-text-color, #202a35);\n  border: 1px solid var(--sc-border);\n  border-radius: 8px;\n  padding: 10px;\n  font: 12px/1.5 monospace;\n  resize: vertical;\n}\n.sc-error-details p {\n  font-size: .8rem;\n  color: var(--sc-muted);\n}\n.sc-timeline {\n  overflow-x: auto;\n  padding: 8px 0 14px;\n  overscroll-behavior-x: contain;\n}\n.sc-timeline-head, .sc-timeline-grid {\n  display: grid;\n  grid-template-columns: 44px repeat(7,minmax(68px,1fr));\n  gap: 5px;\n  min-width: 555px;\n}\n.sc-timeline-head { margin-bottom: 10px; text-align: center; font-size: .74rem; color: var(--sc-muted); }\n.sc-time-axis, .sc-day-track { position: relative; height: 576px; }\n.sc-time-axis span { position:absolute; right:4px; transform:translateY(-50%); font-size:.65rem; font-variant-numeric:tabular-nums; color:var(--sc-muted); }\n.sc-day-track {\n  border-radius: 7px;\n  background: repeating-linear-gradient(to bottom, var(--sc-border) 0 1px, transparent 1px 24px), var(--sc-surface);\n}\n.sc-time-block {\n  position:absolute;\n  display:flex;\n  flex-direction:column;\n  align-items:flex-start;\n  justify-content:flex-start;\n  min-height:8px;\n  padding:3px 4px;\n  border:1px solid var(--card-background-color,#fff);\n  border-left:3px solid var(--block-color);\n  border-radius:5px;\n  background:color-mix(in srgb,var(--block-color) 34%,var(--card-background-color,#fff));\n  color:var(--primary-text-color,#202a35);\n  font-size:.68rem;\n  line-height:1.3;\n  text-align:left;\n  overflow:hidden;\n}\n.sc-time-block span { font-weight:600; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }\n.sc-time-block small { font-size:.6rem; white-space:nowrap; }\n.sc-time-block:hover { background:color-mix(in srgb,var(--block-color) 38%,var(--card-background-color,#fff)); }\n.sc-time-block.is-off { opacity:.55; border-style:dashed; }\n.sc-dialog {\n  width:min(680px,calc(100vw - 24px));\n  max-height:calc(100dvh - 32px);\n  padding:0 20px 20px;\n  border:1px solid var(--sc-border);\n  border-radius:18px;\n  background:var(--card-background-color,#fff);\n  color:var(--primary-text-color,#202a35);\n  box-shadow:0 20px 70px #0005;\n  overscroll-behavior:contain;\n}\n.sc-dialog::backdrop { background:#0008; }\n.sc-dialog-heading { position:sticky; top:0; z-index:2; display:flex; align-items:center; justify-content:space-between; padding:12px 0; background:var(--card-background-color,#fff); border-bottom:1px solid var(--sc-border); }\n.sc-dialog-heading button { min-width:40px; }\n.sc-dialog .sc-editor { margin:16px 0 0; padding:0; border:0; background:transparent; }\n.sc-dialog .sc-actions { position:sticky; bottom:-20px; padding:12px 0; background:var(--card-background-color,#fff); z-index:1; }\n@media (max-width:600px) {\n  .sc-dialog { width:calc(100vw - 12px); max-height:calc(100dvh - 12px); padding:0 14px 14px; }\n  .sc-dialog .sc-actions { bottom:-14px; }\n}\n@container (max-width:600px) {\n  .sc-slot time {\n    display: inline-block;\n  }\n}\n\n/* Desired-state action editor (weekly-schedule-card Quick Timer style) */\n.sc-field { display: grid; gap: 8px; min-width: 0; }\n.sc-field-label { font-size: .8rem; font-weight: 500; }\n.sc-current { display: flex; justify-content: space-between; gap: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--sc-border); }\n.sc-current strong { color: var(--primary-text-color, #202a35); font-weight: 600; }\n.sc-action-fields { display: grid; gap: 16px; }\n.sc-choices {\n  display: flex; flex-wrap: wrap; gap: 4px; padding: 4px;\n  border-radius: 12px; background: var(--sc-surface);\n}\n.sc-editor label.sc-choice {\n  position: relative; flex: 1 1 auto; display: flex; flex-direction: column;\n  align-items: center; justify-content: center; gap: 4px; min-width: 64px; min-height: 42px;\n  padding: 8px 10px; border: 1px solid transparent; border-radius: 9px;\n  font-size: .8rem; font-weight: 500; text-align: center; cursor: pointer; color: var(--sc-muted);\n}\n.sc-editor .sc-choice input {\n  position: absolute; inset: 0; width: 100%; height: 100%; min-height: 0; margin: 0;\n  opacity: 0; cursor: pointer;\n}\n.sc-choice:hover { color: var(--primary-text-color, #202a35); }\n.sc-choice.is-selected, .sc-choice:has(input:checked) {\n  color: var(--sc-accent); border-color: var(--sc-accent);\n  background: var(--card-background-color, #fff); font-weight: 600;\n  box-shadow: 0 1px 3px #0001;\n}\n.sc-choice:has(input:focus-visible) { outline: 3px solid var(--sc-accent); outline-offset: 2px; }\n.sc-mode-buttons { background: transparent; padding: 0; gap: 6px; }\n.sc-mode-buttons .sc-choice { min-height: 64px; border-color: var(--sc-border); background: var(--card-background-color, #fff); }\n.sc-choice ha-icon { --mdc-icon-size: 20px; }\n.sc-range-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }\n.sc-range-value { display: inline-flex; align-items: center; gap: 4px; font-weight: 600; color: var(--sc-accent); }\n.sc-editor .sc-range-value input {\n  width: 84px; min-height: 40px; padding: 6px 10px; text-align: center;\n  font-size: 1.15rem; font-weight: 600; color: var(--sc-accent); background: var(--sc-surface); border-color: transparent;\n}\n.sc-editor input[type=\"range\"] {\n  -webkit-appearance: none; appearance: none; width: 100%; min-height: 24px; padding: 0;\n  border: 0; background: transparent; accent-color: var(--sc-accent);\n}\ninput[type=\"range\"]::-webkit-slider-runnable-track { height: 6px; border-radius: 6px; background: linear-gradient(to right, var(--sc-accent) var(--sc-fill, 0%), var(--sc-border) var(--sc-fill, 0%)); }\ninput[type=\"range\"]::-moz-range-track { height: 6px; border-radius: 6px; background: var(--sc-border); }\ninput[type=\"range\"]::-moz-range-progress { height: 6px; border-radius: 6px; background: var(--sc-accent); }\ninput[type=\"range\"]::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; margin-top: -8px; border-radius: 50%; border: 4px solid var(--card-background-color, #fff); background: var(--sc-accent); box-shadow: 0 0 0 1px var(--sc-accent); }\ninput[type=\"range\"]::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; border: 4px solid var(--card-background-color, #fff); background: var(--sc-accent); box-shadow: 0 0 0 1px var(--sc-accent); }\n.sc-range-labels { display: flex; justify-content: space-between; font-size: .7rem; color: var(--sc-muted); }\n.sc-more { padding: 10px 12px; }\n.sc-name-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: end; }\n.sc-name-row button { min-height: 44px; }\n.sc-summary { padding: 12px 14px; border-radius: 10px; background: var(--card-background-color, #fff); border: 1px solid var(--sc-border); }\n.sc-summary p { margin-top: 6px !important; }\n.sc-notice { color: var(--success-color, #287d39); background: color-mix(in srgb, var(--success-color, #287d39) 9%, var(--card-background-color, #fff)); }\n.sc-warning { color: var(--warning-color, #8a5a00); background: color-mix(in srgb, var(--warning-color, #f0a500) 12%, var(--card-background-color, #fff)); }\n.sc-actions button.sc-danger { background: var(--error-color, #b3261e); border-color: var(--error-color, #b3261e); color: #fff; }\n.sc-overview-list { list-style: none; margin: 0 0 10px; padding: 0; display: grid; gap: 6px; font-size: .82rem; }\n.sc-overview-row { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; padding: 8px 10px; border: 1px solid var(--sc-border); border-radius: 8px; }\n.sc-overview-row .sc-meta { margin: 0; flex-basis: 100%; padding-left: 18px; }\n.sc-overview-list li:not(.sc-overview-row) { padding: 8px 10px; border-radius: 8px; background: var(--sc-surface); }\n.sc-overview-list li .sc-meta { display: block; margin-top: 3px; }\n.sc-overview h4 { margin: 14px 0 8px; font-size: .82rem; }\n.sc-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--pchip-color, var(--sc-accent)); flex-shrink: 0; }\n.sc-maintenance .sc-controls { margin: 10px 0 0; }\n\n/* Time bar with magnets and day shortcuts (weekly-schedule-card style) */\n.sc-timebar { position: relative; height: 48px; border-radius: 8px; background: var(--sc-surface); overflow: hidden; touch-action: none; user-select: none; }\n.sc-tb-bg { position: absolute; top: 6px; bottom: 6px; border-radius: 6px; background: var(--block-color); opacity: .4; pointer-events: auto; }\n.sc-tb-magnet { position: absolute; top: 0; bottom: 0; width: 2px; transform: translateX(-50%); background: color-mix(in srgb, var(--sc-accent) 45%, transparent); pointer-events: none; }\n.sc-tb-magnet.is-near { background: var(--sc-accent); box-shadow: 0 0 6px var(--sc-accent); }\n.sc-tb-edit { position: absolute; top: 0; bottom: 0; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: var(--sc-accent); color: var(--text-primary-color, #fff); font-size: .72rem; font-weight: 700; font-variant-numeric: tabular-nums; cursor: grab; touch-action: none; box-shadow: 0 2px 8px #0003; overflow: hidden; }\n.sc-tb-edit:active { cursor: grabbing; }\n.sc-tb-edit.is-static { cursor: default; opacity: .75; }\n.sc-tb-label { pointer-events: none; white-space: nowrap; padding: 0 22px; }\n.sc-tb-handle { position: absolute; top: 0; bottom: 0; width: 22px; display: flex; align-items: center; justify-content: center; cursor: ew-resize; }\n.sc-tb-handle::after { content: \"\"; width: 16px; height: 16px; border-radius: 50%; background: #fff; border: 2px solid var(--sc-accent); box-shadow: 0 1px 4px #0004; }\n.sc-tb-handle[data-handle=\"start\"] { left: 0; }\n.sc-tb-handle[data-handle=\"end\"] { right: 0; }\n.sc-tb-ticks { display: flex; justify-content: space-between; font-size: .66rem; color: var(--sc-muted); margin-top: -8px; }\n.sc-time-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }\n.sc-snap, .sc-shortcuts { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: .75rem; color: var(--sc-muted); }\n.sc-editor .sc-pill { min-height: 30px; padding: 4px 12px; border-radius: 16px; font-size: .76rem; color: var(--sc-muted); }\n.sc-editor .sc-pill.is-selected { color: var(--sc-accent); border-color: var(--sc-accent); background: color-mix(in srgb, var(--sc-accent) 12%, var(--card-background-color, #fff)); font-weight: 600; }\n.sc-days { gap: 6px !important; }\n.sc-editor .sc-days label.sc-day-chip { position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; padding: 0; border-radius: 50%; border: 1.5px solid var(--sc-border); font-size: .74rem; font-weight: 600; color: var(--sc-muted); cursor: pointer; }\n.sc-editor .sc-day-chip input { position: absolute; inset: 0; width: 100% !important; height: 100% !important; margin: 0; opacity: 0; cursor: pointer; }\n.sc-day-chip:has(input:checked) { background: var(--sc-accent); border-color: var(--sc-accent) !important; color: var(--text-primary-color, #fff) !important; }\n.sc-day-chip:has(input:focus-visible) { outline: 3px solid var(--sc-accent); outline-offset: 2px; }\n\n/* Conditions */\n.sc-condition-group { display: grid; gap: 12px; }\n.sc-editor fieldset.sc-condition { background: var(--card-background-color, #fff); }\n\n/* Icon and colour pickers */\n.sc-icon-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(68px, 1fr)); gap: 6px; max-height: 232px; overflow: auto; padding: 2px; }\n.sc-editor label.sc-icon-choice { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; min-height: 64px; padding: 6px 4px; border: 1px solid var(--sc-border); border-radius: 10px; cursor: pointer; color: var(--sc-muted); text-align: center; }\n.sc-icon-choice small { font-size: .64rem; line-height: 1.2; }\n.sc-editor .sc-icon-choice input, .sc-editor .sc-swatch input[type=\"radio\"] { position: absolute; inset: 0; width: 100% !important; height: 100% !important; min-height: 0; margin: 0; opacity: 0; cursor: pointer; }\n.sc-icon-choice.is-selected, .sc-icon-choice:has(input:checked) { color: var(--sc-accent); border-color: var(--sc-accent); background: color-mix(in srgb, var(--sc-accent) 10%, var(--card-background-color, #fff)); }\n.sc-swatches { display: flex; flex-wrap: wrap; gap: 8px; }\n.sc-editor label.sc-swatch { position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; background: var(--swatch, var(--sc-surface)); border: 2px solid var(--card-background-color, #fff); box-shadow: 0 0 0 1px var(--sc-border); cursor: pointer; font-size: .66rem; color: var(--sc-muted); }\n.sc-swatch.is-selected, .sc-swatch:has(input[type=\"radio\"]:checked) { box-shadow: 0 0 0 3px var(--sc-accent); }\n.sc-editor .sc-swatch-custom input[type=\"color\"] { position: absolute; inset: 0; width: 100% !important; height: 100% !important; min-height: 0; padding: 0; opacity: 0; cursor: pointer; z-index: 1; }\n.sc-swatch-custom span { font-size: 1rem; }\n.tab ha-icon, .profile-chip ha-icon { --mdc-icon-size: 18px; margin-right: 4px; }\n.tab.active { border-bottom: 2px solid var(--tab-color, var(--sc-accent)); }\n.sc-tb-edit.is-narrow .sc-tb-label { visibility: hidden; }\n.sc-tb-edit.is-narrow .sc-tb-handle { width: 16px; }\n.sc-tb-edit.is-narrow .sc-tb-handle::after { width: 12px; height: 12px; }\n\n/* ---- Direction A \"Agenda viva\" (0.3.7) ---- */\n.sc-head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }\n.sc-logo { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--sc-accent); background: color-mix(in srgb, var(--sc-accent) 12%, var(--card-background-color, #fff)); }\n.sc-logo svg { width: 22px; height: 22px; }\n.sc-head-copy { display: grid; gap: 2px; flex-grow: 1; min-width: 0; }\n.sc-sub { font-size: .8rem; color: var(--sc-muted); }\n.sc-head .sc-version { margin-left: 0; }\n.sc-head-actions { display: flex; gap: 8px; }\n.sc-segmented { display: flex; gap: 4px; padding: 4px; border-radius: 14px; background: var(--sc-surface); overflow-x: auto; }\n.sc-segmented .profile-chip { flex: 1 0 auto; justify-content: center; min-height: 38px; border: 0; border-radius: 10px; background: transparent; color: var(--sc-muted); font-weight: 600; }\n.sc-segmented .profile-chip.viewed { background: var(--card-background-color, #fff); color: var(--primary-text-color, #202a35); box-shadow: 0 1px 3px #00000014; font-weight: 700; }\n.sc-now { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; margin: 4px 0 8px; }\n.sc-now-tile { display: grid; gap: 5px; text-align: left; padding: 14px 16px; border: 0; border-radius: 16px; min-height: 0; color: var(--primary-text-color, #202a35); }\n.sc-now-tile.is-running { background: color-mix(in srgb, var(--sc-accent) 12%, var(--card-background-color, #fff)); }\n.sc-now-tile.is-paused { background: color-mix(in srgb, var(--warning-color, #f0a500) 14%, var(--card-background-color, #fff)); }\n.sc-now-tile.is-timer { background: var(--sc-surface); }\n.sc-now-tile:hover { border: 0; filter: brightness(.98); }\n.sc-now-label { font-size: .72rem; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; color: var(--sc-accent); }\n.sc-now-tile.is-paused .sc-now-label { color: color-mix(in srgb, var(--warning-color, #f0a500) 60%, #000); }\n.sc-now-tile strong { font-size: 1.2rem; letter-spacing: -0.02em; }\n.sc-now-detail { font-size: .78rem; color: var(--sc-muted); }\n.sc-now-empty { font-size: .82rem; color: var(--sc-muted); margin: 4px 0 8px; }\n.sc-toolbar { flex-wrap: wrap; gap: 8px 12px; }\n.sc-toolbar .tab-bar { border: 0; margin: 0; padding: 0; gap: 6px; }\n.sc-toolbar .tab { min-height: 32px; padding: 4px 12px; border-radius: 16px; background: var(--sc-surface); font-size: .8rem; }\n.sc-toolbar .tab.active { background: var(--primary-text-color, #202a35); color: var(--card-background-color, #fff); border-bottom: 0; }\n.sc-timeline-head strong.is-today { color: var(--sc-accent); font-weight: 800; }\n.sc-day-track.is-today { background: color-mix(in srgb, var(--sc-accent) 8%, var(--sc-surface)); box-shadow: inset 0 0 0 2px var(--sc-accent); }\n.sc-now-line { position: absolute; left: -3px; right: -3px; height: 2px; background: var(--error-color, #d6453d); z-index: 2; pointer-events: none; }\n.sc-time-block.is-running { box-shadow: 0 0 0 2px var(--card-background-color, #fff), 0 0 0 4px var(--success-color, #1f9d55); z-index: 1; }\n.sc-time-block.is-paused { border: 2px dashed color-mix(in srgb, var(--warning-color, #f0a500) 70%, #000); z-index: 1; }\n.sc-legend { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: .72rem; color: var(--sc-muted); margin: 6px 0 12px; }\n.sc-legend span { display: inline-flex; align-items: center; gap: 6px; }\n.sc-legend i { display: inline-block; width: 14px; height: 12px; border-radius: 4px; }\n.sc-legend .sc-legend-temp { width: 40px; background: linear-gradient(90deg, rgb(74,144,217), rgb(150,196,232), rgb(240,138,75)); }\n.sc-legend .sc-legend-running { box-shadow: 0 0 0 2px var(--success-color, #1f9d55); }\n.sc-legend .sc-legend-paused { border: 2px dashed var(--warning-color, #f0a500); box-sizing: border-box; }\n.sc-legend .sc-legend-now { height: 2px; background: var(--error-color, #d6453d); }\n.sc-editor h3 small { display: block; font-size: .75rem; font-weight: 600; color: var(--sc-muted); letter-spacing: 0; }\n.sc-section-label { font-size: .72rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--sc-muted); margin-bottom: -8px; }\n.sc-entity-pills { display: flex; flex-wrap: wrap; gap: 8px; }\n.sc-editor label.sc-entity-pill { position: relative; display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 6px 14px; border-radius: 18px; background: var(--sc-surface); color: var(--sc-muted); font-weight: 600; cursor: pointer; }\n.sc-editor .sc-entity-pill input { position: absolute; inset: 0; width: 100% !important; height: 100% !important; min-height: 0; margin: 0; opacity: 0; cursor: pointer; }\n.sc-entity-pill::before { content: \"\"; width: 8px; height: 8px; border-radius: 50%; background: currentColor; opacity: .35; }\n.sc-entity-pill:has(input:checked) { color: var(--sc-accent); background: color-mix(in srgb, var(--sc-accent) 14%, var(--card-background-color, #fff)); }\n.sc-entity-pill:has(input:checked)::before { opacity: 1; }\n.sc-entity-pill:has(input:focus-visible) { outline: 3px solid var(--sc-accent); outline-offset: 2px; }\n.sc-stepper-row { display: flex; align-items: center; gap: 12px; }\n.sc-editor .sc-step { width: 48px; height: 48px; min-height: 48px; padding: 0; border-radius: 50%; font-size: 1.4rem; line-height: 1; flex-shrink: 0; }\n.sc-stepper-value { flex-grow: 1; display: flex; align-items: baseline; justify-content: center; gap: 4px; color: var(--sc-accent); font-weight: 800; }\n.sc-editor .sc-stepper-value input { width: 96px; min-height: 52px; padding: 4px; border: 0; background: transparent; text-align: center; font-size: 2.2rem; font-weight: 800; letter-spacing: -0.03em; color: inherit; -moz-appearance: textfield; }\n.sc-stepper-value input::-webkit-inner-spin-button, .sc-stepper-value input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }\n.sc-rows { display: grid; border: 1px solid var(--sc-border); border-radius: 14px; overflow: hidden; background: var(--card-background-color, #fff); }\n.sc-editor details.sc-row { margin: 0; border: 0; border-radius: 0; padding: 0; background: transparent; }\n.sc-row + .sc-row { border-top: 1px solid var(--sc-border) !important; }\n.sc-row > summary { display: flex; align-items: center; gap: 10px; min-height: 48px; padding: 0 14px; list-style: none; }\n.sc-row > summary::-webkit-details-marker { display: none; }\n.sc-row > summary span { flex-grow: 1; font-size: .85rem; font-weight: 700; }\n.sc-row > summary em { font-style: normal; font-size: .82rem; font-weight: 500; color: var(--sc-muted); max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.sc-row > summary::after { content: \"\\203A\"; font-size: 1.2rem; color: var(--sc-muted); transition: transform .15s; }\n.sc-row[open] > summary::after { transform: rotate(90deg); }\n.sc-row[open] > summary { margin: 0; }\n.sc-row-body { display: grid; gap: 14px; padding: 4px 14px 16px; }\n.sc-actions button.sc-save { flex-grow: 1; min-height: 50px; border-radius: 14px; font-size: 1rem; }\n@media (max-width: 600px) {\n  .sc-dialog { width: 100vw; max-width: 100vw; margin: auto 0 0; max-height: 92dvh; border-radius: 24px 24px 0 0; padding: 0 16px 16px; }\n  .sc-dialog-heading::before { content: \"\"; position: absolute; left: 50%; top: 6px; width: 40px; height: 5px; margin-left: -20px; border-radius: 3px; background: var(--sc-border); }\n  .sc-dialog-heading { padding-top: 18px; }\n  .sc-now { grid-template-columns: 1fr; }\n  .sc-head-actions { width: 100%; }\n  .sc-head-actions button { flex-grow: 1; }\n}\n.sc-dialog-brand { font-size: .75rem; font-weight: 700; color: var(--sc-muted); letter-spacing: .04em; text-transform: uppercase; }\n";
const CARD_VERSION = "0.3.7";
const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[char]);
const tint = (value) => /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(value || '') ? value : '#03a9f4';
const field = (name, title, value = '', type = 'text') => `<label>${title}<input name="${name}" type="${type}" value="${esc(value)}"></label>`;
const area = (name, title, value, rows = 4) => `<label>${title}<textarea name="${name}" rows="${rows}">${esc(value)}</textarea></label>`;
const select = (name, title, options, current) => `<label>${title}<select name="${name}">${options.map(([value, label]) => `<option value="${esc(value)}" ${value === current ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label>`;
const button = (name, label, id = '') => `<button type="button" data-command="${name}" data-id="${esc(id)}">${esc(label)}</button>`;
const json = (value) => JSON.stringify(clean(value), null, 2);
// Wall clock in the Home Assistant time zone: weekday 0 = Monday.
function haNow(timeZone, date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone: timeZone || undefined, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(date).map((p) => [p.type, p.value]));
  return {weekday: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(parts.weekday), minutes: Number(parts.hour) * 60 + Number(parts.minute), label: `${parts.hour}:${parts.minute}`};
}
// Climate blocks: blue (cool) to orange (warm), like weekly-schedule-card.
function temperatureColor(value) {
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
function versionAdvice(backend) {
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
  connectedCallback() { if (this._hass) this.adapter.connect(this._hass); this.render(); }
  disconnectedCallback() { this.adapter.disconnect(); clearInterval(this.clock); this.clock = null; }
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
    const slots = `<div class="sc-timeline-head"><span>Ora</span>${DAYS.map((day,index)=>`<strong class="${index===now.weekday?'is-today':''}">${day}${index===now.weekday?' · oggi':''}</strong>`).join('')}</div><div class="sc-timeline-grid"><div class="sc-time-axis">${Array.from({length:13},(_,i)=>`<span style="top:${i/12*100}%">${time(i*120)}</span>`).join('')}</div>${DAYS.map((day,index)=>`<div class="sc-day-track ${index===now.weekday?'is-today':''}" aria-label="${day}">${segments[index].map(({schedule,start,end,lane,lanes})=>{
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
      ${schedules.length ? `<section class="sc-timeline" data-scroll="timeline" aria-label="Programmazione settimanale">${slots}</section>${legend}<details data-section="schedules" class="sc-schedules"><summary>Gestisci schedule (${schedules.length})</summary><ul class="sc-list">${schedules.map((schedule) => `<li class="sc-entry" style="--block-color:${colorFor(schedule)}"><div class="sc-entry-copy"><strong>${esc(schedule.name)}</strong><span class="sc-meta">${esc(schedule.target_entity_ids.map((id)=>this._hass.states[id]?.attributes?.friendly_name || id).join(', '))} · ${schedule.enabled ? '' : 'disabilitato · '}${schedule.time_slots?.length ?? 0} ${schedule.time_slots?.length === 1 ? 'fascia' : 'fasce'}</span></div>${editable ? `<div class="sc-entry-actions">${button('editSchedule','Modifica',schedule.id)}${button('deleteSchedule','Elimina',schedule.id)}</div>` : ''}</li>`).join('')}</ul></details>` : `<div class="sc-empty"><strong>${!profile ? 'Inizia dal tuo primo profilo' : !group ? 'Aggiungi un gruppo di dispositivi' : 'La settimana è ancora libera'}</strong>${!profile ? 'Organizza la casa per abitudini, ambienti o stagioni.' : !group ? 'Riunisci i dispositivi che vuoi programmare.' : 'Crea uno schedule e scegli giorni, orari e azioni.'}</div>`}
      ${editable ? `<details class="sc-management" data-section="management" ${!profile || !group ? 'open' : ''}><summary>Gestisci profili e gruppi</summary><div class="sc-controls">${button('newProfile','＋ Profilo')}${profile ? `${button('editProfile','Modifica profilo',profile.id)}${button('toggleProfile',profile.active ? 'Disattiva profilo' : 'Attiva profilo',profile.id)}${button('deleteProfile','Elimina profilo',profile.id)}${button('newGroup','＋ Gruppo')}` : ''}${group ? `${button('editGroup','Modifica gruppo',group.id)}${button('deleteGroup','Elimina gruppo',group.id)}` : ''}</div></details>` : '<p class="sc-meta">Vista in sola lettura: serve un amministratore per modificare.</p>'}
      ${profiles.length ? this.overview(config, profiles) : ''}
      ${editable ? `<details class="sc-maintenance" data-section="maintenance"><summary>Manutenzione · backup e RESET</summary><p class="sc-meta">Il backup salva profili, gruppi e schedule in un file JSON. Il ripristino li sostituisce e lascia i profili disattivati. RESET cancella tutti i dati di Schedule Creator.</p><div class="sc-controls">${button('exportBackup','Salva backup')}${button('newRestore','Ripristina backup')}${button('newReset','RESET…')}</div></details>` : ''}
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
    const timerTiles = timers.map((timer) => `<div class="sc-now-tile is-timer"><span class="sc-now-label">Timer · ${esc(friendly(timer.entity_id))}</span><strong>${esc(describeAction(timer.action))}</strong><span class="sc-now-detail">Resta <span data-expiry="${esc(timer.expires_at)}"></span></span></div>`);
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
    this.localError = null; this.restoreData = null;
    try {
      const backup = JSON.parse(await input.files[0].text());
      if (backup?.format !== 'schedule_creator.backup' || !backup.config) throw new Error('Il file non è un backup di Schedule Creator.');
      this.restoreData = backup;
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
    return `<form data-editor="${esc(kind)}" class="sc-editor"><h3 id="sc-editor-title">${subtitle ? `<small>${esc(subtitle)}</small>` : ''}${({profile:id?'Modifica profilo':'Nuovo profilo',group:id?'Modifica gruppo':'Nuovo gruppo',schedule:id?'Modifica schedule':'Nuovo schedule',timer:'Quick Timer',restore:'Ripristina backup',reset:'RESET completo'})[kind]}</h3>${content}<div class="sc-actions"><button type="submit" class="sc-save ${kind === 'reset' ? 'sc-danger' : ''}">${({restore:'Ripristina',reset:'Cancella tutto',schedule:'Salva schedule'})[kind] || 'Salva'}</button>${button('close','Annulla')}</div></form>`;
  }
  async click(event) {
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
    if (/^(new|edit)/.test(command)) {
      if(this._hass?.user?.is_admin !== true) return;
      this.editorOpener={command,id};
      this.adapter.writeError=null;
      const kind = command.replace(/^(new|edit)/,'').toLowerCase();
      const config = this.adapter.state.config;
      const profile = config.profiles.find((p)=>p.id===this.selectedProfile)||config.profiles[0];
      const group = config.groups.find((g)=>g.id===this.selectedGroup)||config.groups.find((g)=>g.profile_id===profile?.id);
      this.edit = [kind,id||null];
      this.editRecord = id ? structuredClone(config[`${kind}s`].find((x)=>x.id===id)) : null;
      this.auto = {}; this.restoreData = null; this.notice = null;
      this.ownerGroup = this.editRecord?.group_id || group?.id;
      this.ownerProfile = this.editRecord?.profile_id || profile?.id;
      this.editRevision = this.adapter.state.revision;
      this.changedFields = new Set();
      this.slotDraft = null; this.conditionDraft = undefined; this.actionReset = false; this.actionDomain = null;
      this.draft = null; this.localError = null; this.localErrorDetails = null; this.render();
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
    const type = ({timer:'quick_timer/create',restore:'backup/import',reset:'reset'})[kind] || `${kind}/${id ? 'update' : 'create'}`;
    let phase = 'lettura del modulo';
    try {
      this.capture();
      const data = Object.fromEntries(new FormData(form));
      const config = this.adapter.state.config;
      let payload;
      phase = 'validazione del nome';
      if (!['timer','restore','reset'].includes(kind) && !data.name?.trim()) throw new Error('Inserisci un nome prima di salvare.');
      if (kind === 'restore') {
        if (!this.restoreData) throw new Error('Scegli prima un file di backup.');
        payload = {backup: this.restoreData};
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
