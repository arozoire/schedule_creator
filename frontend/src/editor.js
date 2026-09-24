// Convert persisted, server-owned nested records into editable API payloads.
export const clean = (value) => {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.entries(value).filter(([key]) => !['id', 'schema_version', 'revision', 'created_at', 'updated_at'].includes(key))
      .map(([key, child]) => [key, key === 'data' ? structuredClone(child) : clean(child)]),
  );
  return value;
};

export const messageFor = (error) => {
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

export function diagnosticFor(error, { cardVersion, haVersion, phase, operation } = {}) {
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

export function parseJson(text, label) {
  try { return JSON.parse(text); } catch { throw new Error(`${label}: JSON non valido.`); }
}
