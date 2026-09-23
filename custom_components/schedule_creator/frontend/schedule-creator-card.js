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

  async mutate(type, fields, { runtime = false } = {}) {
    if (this.busy || this.closed || !this.state) return false;
    const connection = this.connection;
    const generation = this.generation;
    this.busy = true;
    this.writeError = null;
    this.onChange();
    try {
      await connection.sendMessagePromise({
        type: `schedule_creator/${type}`,
        expected_revision: runtime ? this.state.runtime_summary.revision : this.state.revision,
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
      .map(([key, child]) => [key, clean(child)]),
  );
  return value;
};

const messageFor = (error) => ({
  revision_conflict: 'Configurazione cambiata su un altro client. La bozza è conservata: confrontala e salva di nuovo.',
  unauthorized: 'Serve un account amministratore per modificare.',
  invalid_payload: 'Dati non validi: controlla entità, fasce e JSON.',
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

function actionFromFields(form, prefix, domain) {
  const mode = form.elements[`${prefix}_mode`]?.value || 'simple';
  if (mode === 'none') return null;
  if (mode === 'advanced') {
    const action = clean(parseJson(form.elements[`${prefix}_json`].value, prefix));
    if (action.domain !== domain) throw new Error(`Il dominio dell'azione deve essere ${domain}.`);
    if (['entity_id', 'device_id', 'area_id'].some((key) => key in (action.data || {})))
      throw new Error('I target devono stare nel gruppo, non nei dati dell’azione.');
    return action;
  }
  const action = form.elements[`${prefix}_action`].value;
  const data = {};
  if (domain === 'climate' && action === 'set_temperature') {
    data.temperature = Number(form.elements[`${prefix}_number`].value);
  } else if (domain === 'climate' && action === 'set_hvac_mode') {
    data.hvac_mode = form.elements[`${prefix}_text`].value;
  } else if (domain === 'fan' && action === 'set_percentage') {
    data.percentage = Number(form.elements[`${prefix}_number`].value);
  } else if (domain === 'fan' && action === 'set_preset_mode') {
    data.preset_mode = form.elements[`${prefix}_text`].value;
  }
  return { domain, action, data };
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
const defaultAction = (domain) => ({ domain, action: 'turn_on', data: {} });
const defaultCondition = { operator: 'state_equals', entity_id: 'binary_sensor.example', value: 'on', lower: null, upper: null, children: [], minimum_duration_seconds: null, hysteresis: null };
const optionsFor = (domain) => domain === 'climate' ? ['set_temperature', 'set_hvac_mode', 'turn_on', 'turn_off'] : domain === 'fan' ? ['turn_on', 'turn_off', 'set_percentage', 'set_preset_mode'] : ['turn_on', 'turn_off'];
function actionEditor(prefix, domain, value, optional = false) {
  const action = value || defaultAction(domain);
  const supported = action.domain === domain && optionsFor(domain).includes(action.action) &&
    Object.keys(action.data || {}).every((key) => ({ climate: ['temperature', 'hvac_mode'], fan: ['percentage', 'preset_mode'] }[domain] || []).includes(key));
  const mode = optional && !value ? 'none' : supported ? 'simple' : 'advanced';
  return `<fieldset><legend>${prefix === 'start' ? 'Azione iniziale' : prefix === 'end' ? 'Azione finale' : 'Azione timer'}</legend>
    ${select(`${prefix}_mode`, 'Modalità', [...(optional ? [['none', 'Nessuna']] : []), ['simple', 'Comandi comuni'], ['advanced', 'JSON avanzato']], mode)}
    ${select(`${prefix}_action`, 'Comando', optionsFor(domain).map((x) => [x, x]), supported ? action.action : 'turn_on')}
    ${field(`${prefix}_number`, domain === 'fan' ? 'Percentuale (0–100)' : 'Temperatura °C', action.data?.temperature ?? action.data?.percentage ?? (domain === 'fan' ? 50 : 20), 'number')}
    ${field(`${prefix}_text`, 'Modalità HVAC / preset', action.data?.hvac_mode ?? action.data?.preset_mode ?? '')}
    ${area(`${prefix}_json`, 'Azione completa (JSON; target escluso)', json(action))}</fieldset>`;
}

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
      this.capture();
      if (e.target.name === 'entity_search') {
        const query = e.target.value.toLowerCase();
        this.shadowRoot.querySelectorAll('[data-entity-label]').forEach((node) => { node.hidden = !node.dataset.entityLabel.includes(query); });
      }
    });
    this.shadowRoot.addEventListener('change', (e) => { if (e.target.closest('form')) { this.capture(); if (e.target.name === 'entity_id') this.render(); } });
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
    this.draft.selectedEntities = [...form.querySelectorAll('[name="entities"]:checked')].map((x) => x.value);
    this.draft.days = [...form.querySelectorAll('[name="days"]:checked')].map((x) => Number(x.value));
    this.draft.enabled = !!form.elements.enabled?.checked;
  }
  restoreDraft() {
    const form = this.shadowRoot.querySelector('form[data-editor]');
    if (!form || !this.draft) return;
    for (const [name, value] of Object.entries(this.draft)) {
      if (['selectedEntities', 'days', 'enabled'].includes(name)) continue;
      if (form.elements[name] && !['entities', 'days'].includes(name)) form.elements[name].value = value;
    }
    form.querySelectorAll('[name="entities"]').forEach((x) => { x.checked = this.draft.selectedEntities.includes(x.value); });
    form.querySelectorAll('[name="days"]').forEach((x) => { x.checked = this.draft.days.includes(Number(x.value)); });
    if (form.elements.enabled) form.elements.enabled.checked = this.draft.enabled;
    const query = form.elements.entity_search?.value?.toLowerCase() || '';
    form.querySelectorAll('[data-entity-label]').forEach((node) => { node.hidden = !node.dataset.entityLabel.includes(query); });
  }
  render() {
    if (!this.config) return;
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
    const editable = this._hass?.user?.is_admin !== false;
    const view = state ? `<div class="profile-status-bar">${profile ? `${esc(profile.name)} · ${profile.active ? 'attivo' : 'inattivo'} · ${esc(profile.profile_type)}` : 'Nessun profilo'} · ${state.runtime_summary?.active_leases ?? 0} lease attive · ${state.quick_timers?.length ?? 0} timer attivi</div>
      <div class="tab-bar">${tabs}</div>${schedules.length ? `<div class="sc-week">${slots}</div><div class="sc-heading">Schedule</div><ul class="sc-list">${schedules.map((s) => `<li class="sc-entry">${esc(s.name)} · ${esc(s.target_entity_ids.join(', '))}${s.enabled ? '' : ' · spento'} ${editable ? button('editSchedule', 'Modifica', s.id) + button('deleteSchedule', 'Elimina', s.id) : ''}</li>`).join('')}</ul>` : '<div class="sc-empty">Nessuno schedule in questa vista</div>'}
      ${editable ? `<div class="sc-controls">${button('newProfile', '＋ Profilo')}${profile ? `${button('editProfile', 'Modifica profilo', profile.id)}${button('toggleProfile', profile.active ? 'Disattiva' : 'Attiva', profile.id)}${button('deleteProfile', 'Elimina profilo', profile.id)}${button('newGroup', '＋ Gruppo')}` : ''}${group ? `${button('editGroup', 'Modifica gruppo', group.id)}${button('deleteGroup', 'Elimina gruppo', group.id)}${button('newSchedule', '＋ Schedule')}` : ''}${button('newTimer', '＋ Quick Timer')}</div>` : '<p>Vista in sola lettura: serve un amministratore per modificare.</p>'}
      ${this.edit && editable ? this.editor(config, profile, group) : ''}
      <section class="sc-operational"><h3>Stato operativo</h3>${(state.operational?.occurrences || []).map((x) => `<p>${esc(config.schedules?.find((s) => s.id === x.schedule_id)?.name || x.schedule_id)}: ${esc(x.state)}, condizione ${esc(x.condition_branch)}, termine ${esc(x.end_utc)}</p>`).join('') || '<p>Nessuna fascia attiva.</p>'}${(state.operational?.leases || []).map((x) => `<p>${esc(x.entity_id)}: ${esc(x.state)} (${esc(x.controller_type)})</p>`).join('')}${(state.quick_timers || []).map((x) => `<p>Timer ${esc(x.entity_id)}: <span data-expiry="${esc(x.expires_at)}"></span> (${esc(x.state)}) ${editable ? button('cancelTimer', 'Annulla', x.id) : ''}</p>`).join('')}<p>Motivo di eventuali rifiuti: stato non disponibile.</p></section>` : '';
    this.shadowRoot.innerHTML = `<style>${STYLE}</style><style>.sc-week{overflow-x:auto;grid-template-columns:repeat(7,minmax(90px,1fr))}.sc-controls,.sc-actions{display:flex;flex-wrap:wrap;gap:6px;margin:12px}.sc-controls button,.sc-actions button,.sc-entry button{border:1px solid var(--divider-color,#aaa);border-radius:7px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#222);padding:7px;cursor:pointer}.sc-editor{padding:14px;border-top:1px solid var(--divider-color,#aaa);display:grid;gap:10px}.sc-editor label{display:grid;gap:4px}.sc-editor input,.sc-editor select,.sc-editor textarea{box-sizing:border-box;width:100%;max-width:100%;padding:7px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#222);border:1px solid var(--divider-color,#aaa);border-radius:5px}.sc-editor fieldset{min-width:0}.sc-entities{max-height:160px;overflow:auto;display:grid;gap:4px}.sc-entities label,.sc-days label{display:inline-flex;align-items:center;gap:5px}.sc-entities input,.sc-days input{width:auto}.sc-days{display:flex;flex-wrap:wrap;gap:9px}.sc-operational{padding:12px}.sc-error{color:var(--error-color,#b33);padding:10px}</style><ha-card style="--pchip-color:${tint(profile?.color)}"><div class="card-header"><div class="hdr-row1"><span class="card-title">${esc(this.config.title || 'Schedule Creator')}</span></div><div class="hdr-row2">${chips}</div><div class="hdr-sep"></div></div>${status}${info ? `<p class="sc-error" role="alert">${esc(typeof info === 'string' ? info : messageFor(info))}</p>` : ''}${view}</ha-card>`;
    this.restoreDraft(); this.updateClock();
    if (!this.clock && this.isConnected) this.clock = setInterval(() => this.updateClock(), 1000);
    this.shadowRoot.querySelectorAll('button').forEach((b) => { b.disabled = busy; });
  }
  updateClock() {
    this.shadowRoot.querySelectorAll('[data-expiry]').forEach((node) => {
      const seconds = Math.max(0, Math.ceil((new Date(node.dataset.expiry) - Date.now()) / 1000));
      node.textContent = `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m ${seconds % 60}s`;
    });
  }
  entities(selected = [], domain = '') {
    const states = Object.values(this._hass?.states || {}).filter((s) => !domain || s.entity_id.startsWith(`${domain}.`));
    const ids = new Set(states.map((s) => s.entity_id));
    for (const id of selected) if (!ids.has(id)) states.push({ entity_id: id, attributes: { friendly_name: 'Non disponibile' } });
    return `<label>Ricerca entità<input type="search" name="entity_search" placeholder="Nome, dominio o ID"></label><div class="sc-entities">${states.sort((a,b) => a.entity_id.localeCompare(b.entity_id)).map((s) => `<label data-entity-label="${esc(`${s.entity_id} ${s.attributes?.friendly_name || ''}`.toLowerCase())}"><input type="checkbox" name="entities" value="${esc(s.entity_id)}" ${selected.includes(s.entity_id) ? 'checked' : ''}>${esc(s.attributes?.friendly_name || s.entity_id)} · ${esc(s.entity_id)}</label>`).join('')}</div>`;
  }
  editor(config, profile, group) {
    const [kind, id] = this.edit;
    const item = id ? (config[`${kind}s`] || []).find((x) => x.id === id) : null;
    if (id && !item) return '<p>Record eliminato su un altro client. La bozza rimane disponibile finché non chiudi l’editor.</p>';
    let content = '';
    if (kind === 'profile') content = `${field('name', 'Nome', item?.name)}${select('profile_type', 'Tipo', [['exclusive','Esclusivo'],['shared','Condiviso']], item?.profile_type || 'exclusive')}${field('icon','Icona',item?.icon)}${field('color','Colore HEX',item?.color)}${field('order','Ordine',item?.order ?? 0,'number')}`;
    if (kind === 'group') content = `${field('name','Nome',item?.name)}${field('icon','Icona',item?.icon)}${field('color','Colore HEX',item?.color)}${field('order','Ordine',item?.order ?? 0,'number')}${this.entities(item?.entity_ids || [])}`;
    if (kind === 'schedule') {
      const owner = config.groups.find((g) => g.id === (item?.group_id || group?.id));
      const first = item?.time_slots?.[0] || { weekdays: [0,1,2,3,4], start: '08:00', end: '09:00' };
      const domain = (item?.target_entity_ids?.[0] || owner?.entity_ids?.[0] || 'switch.example').split('.')[0];
      content = `${field('name','Nome',item?.name)}<label><input name="enabled" type="checkbox" ${item?.enabled !== false ? 'checked' : ''}>Abilitato</label>${this.entities(item?.target_entity_ids || [],domain)}
        <div class="sc-days">${DAYS.map((day, i) => `<label><input type="checkbox" name="days" value="${i}" ${first.weekdays.includes(i) ? 'checked' : ''}>${day}</label>`).join('')}</div>
        ${field('start','Dalle',first.start,'time')}${field('end','Alle',first.end,'time')}
        ${area('extra_slots','Altre fasce (JSON array, se presenti)',json((item?.time_slots || []).slice(1)),2)}
        ${actionEditor('start',domain,item?.start_action)}${actionEditor('end',domain,item?.end_action,true)}
        <p>Condizione falsa: azione finale se presente, altrimenti ripristino deciso dal motore. La fine fascia senza azione finale non invia comandi.</p>
        ${area('condition','Albero condizioni (JSON o null). Operatori: state_equals, state_not_equals, numeric_greater, numeric_greater_or_equal, numeric_less, numeric_less_or_equal, numeric_range, available, and, or.',item?.condition ? json(item.condition) : 'null',7)}
        ${button('conditionExample','Inserisci esempio di condizione')}
        ${select('override_policy','Policy', [['cooperative','Cooperative'],['manual_override','Manual override']],item?.override_policy || 'cooperative')}
        ${field('inclusion_dates','Date incluse, separate da virgola (AAAA-MM-GG)',(item?.inclusion_dates || []).join(', '))}
        ${field('exclusion_dates','Date escluse, separate da virgola (AAAA-MM-GG)',(item?.exclusion_dates || []).join(', '))}
        ${area('start_notification','Notifica iniziale (JSON o null)',item?.start_notification ? json(item.start_notification) : 'null',3)}
        ${area('end_notification','Notifica finale (JSON o null)',item?.end_notification ? json(item.end_notification) : 'null',3)}
        <p>Notifica JSON: {"action":"notify.mobile_app_example","title":"Titolo","message":"Testo"}.</p>`;
    }
    if (kind === 'timer') {
      const entities = Object.values(this._hass?.states || {});
      const domain = (this.draft?.entity_id || entities.find((x) => ['switch','climate','fan'].includes(x.entity_id.split('.')[0]))?.entity_id || 'switch.example').split('.')[0];
      content = `${select('entity_id','Entità',entities.map((s) => [s.entity_id, `${s.attributes?.friendly_name || s.entity_id} · ${s.entity_id}`]),this.draft?.entity_id)}${field('duration_seconds','Durata in secondi (1–604800)',300,'number')}${actionEditor('timer',domain,null)}`;
    }
    return `<form data-editor="${esc(kind)}" class="sc-editor"><h3>${id ? 'Modifica' : 'Nuovo'} ${esc(kind)}</h3>${content}<div class="sc-actions"><button type="submit">Salva</button>${button('close','Chiudi')}</div></form>`;
  }
  async click(event) {
    const buttonEl = event.target.closest('button'); if (!buttonEl || this.adapter.busy) return;
    if (buttonEl.dataset.profile) { this.selectedProfile = buttonEl.dataset.profile; this.selectedGroup = null; this.edit = null; this.draft = null; this.render(); return; }
    if (buttonEl.dataset.group) { this.selectedGroup = buttonEl.dataset.group; this.edit = null; this.draft = null; this.render(); return; }
    const command = buttonEl.dataset.command, id = buttonEl.dataset.id;
    if (!command) return;
    if (command === 'conditionExample') { const input = this.shadowRoot.querySelector('[name="condition"]'); input.value = JSON.stringify(defaultCondition, null, 2); this.capture(); return; }
    if (command === 'close') { this.edit = null; this.draft = null; this.localError = null; this.render(); return; }
    if (/^(new|edit)/.test(command)) { this.edit = [command.replace(/^(new|edit)/,'').toLowerCase(), id || null]; this.draft = null; this.localError = null; this.render(); return; }
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
        const owner = config.groups.find((g) => g.id === (id ? config.schedules.find((s) => s.id === id)?.group_id : group?.id));
        const domain = this.draft.selectedEntities[0]?.split('.')[0];
        if (!domain || !this.draft.selectedEntities.every((x) => x.startsWith(`${domain}.`) && owner.entity_ids.includes(x))) throw new Error('Scegli entità dello stesso dominio appartenenti al gruppo.');
        const extras = parseJson(data.extra_slots, 'Altre fasce');
        if (!Array.isArray(extras) || !this.draft.days.length) throw new Error('Seleziona almeno un giorno e verifica le altre fasce.');
        const dates = (str) => [...new Set(str.split(',').map((x) => x.trim()).filter(Boolean))].sort();
        payload = { name: data.name.trim(), enabled: this.draft.enabled, target_entity_ids: this.draft.selectedEntities,
          time_slots: [{ weekdays: this.draft.days.sort(), start: data.start, end: data.end }, ...clean(extras)],
          start_action: actionFromFields(form,'start',domain), end_action: actionFromFields(form,'end',domain),
          condition: parseJson(data.condition,'Condizione'), override_policy: data.override_policy,
          inclusion_dates: dates(data.inclusion_dates), exclusion_dates: dates(data.exclusion_dates),
          start_notification: parseJson(data.start_notification,'Notifica iniziale'), end_notification: parseJson(data.end_notification,'Notifica finale') };
      }
      if (kind === 'timer') { const domain = data.entity_id.split('.')[0]; payload = { entity_id: data.entity_id, duration_seconds: Number(data.duration_seconds), action: actionFromFields(form,'timer',domain) }; }
      if (!payload) throw new Error('Editor non disponibile.');
      if (this.adapter.conflicted && !confirm('I dati sono cambiati su un altro client. Hai confrontato la bozza con i nuovi dati prima di salvare?')) return;
      if (id) payload[`${kind}_id`] = id;
      if (!id && kind === 'group') payload.profile_id = profile.id;
      if (!id && kind === 'schedule') { payload.profile_id = profile.id; payload.group_id = group.id; }
      const type = kind === 'timer' ? 'quick_timer/create' : `${kind}/${id ? 'update' : 'create'}`;
      const ok = await this.adapter.mutate(type,payload,{ runtime: kind === 'timer' });
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
