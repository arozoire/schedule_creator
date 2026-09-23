// Convert persisted, server-owned nested records into editable API payloads.
export const clean = (value) => {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.entries(value).filter(([key]) => !['id', 'schema_version', 'revision', 'created_at', 'updated_at'].includes(key))
      .map(([key, child]) => [key, clean(child)]),
  );
  return value;
};

export const messageFor = (error) => ({
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

export function parseJson(text, label) {
  try { return JSON.parse(text); } catch { throw new Error(`${label}: JSON non valido.`); }
}

export function actionFromFields(form, prefix, domain) {
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
