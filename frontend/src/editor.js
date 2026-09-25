import { t } from './i18n.js';
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
    return t('Home Assistant ha confermato il salvataggio, ma la card non è riuscita ad aggiornare la vista. Ricarica la dashboard prima di riprovare.');
  }
  if (operation && error?.code === 'unknown_command') {
    return t('Home Assistant ha rifiutato {operation} ({code}). Aggiorna l’integrazione Schedule Creator, riavvia completamente Home Assistant e riprova. Se persiste, comunica questo comando e controlla i log dell’integrazione.', {operation, code: error?.code || error?.message});
  }
  if (/method not implemented/i.test(error?.message || '')) {
    return t('Salvataggio non riuscito: una funzione ha restituito “Method not implemented”. La bozza è conservata. Apri “Dettagli errore” e invia il testo per individuare il passaggio che fallisce.');
  }
  return ({
  revision_conflict: t('Configurazione cambiata su un altro client. La bozza è conservata: confrontala e salva di nuovo.'),
  unauthorized: t('Serve un account amministratore per modificare.'),
  invalid_payload: t('Dati non validi: controlla entità, fasce e parametri delle azioni.'),
  invalid_format: t('Formato non valido: controlla i campi richiesti.'),
  not_found: t('Profilo, gruppo o schedule non trovato. Aggiorna la vista.'),
  ownership_mismatch: t('Il gruppo non appartiene al profilo scelto.'),
  profile_in_use: t('Profilo in uso: rimuovi prima i gruppi e gli schedule collegati.'),
  group_in_use: t('Gruppo in uso: rimuovi prima gli schedule collegati.'),
  invalid_state: t('Il timer non è più attivo.'),
  not_loaded: t('Integrazione non caricata: controlla Dispositivi e servizi.'),
  storage_unavailable: t('Archivio non disponibile: controlla i log di Home Assistant.'),
  })[error?.code] || (operation ? t('Operazione {operation} non riuscita ({code}). Controlla i log di Home Assistant.', {operation, code: error?.code || error?.message || t('errore sconosciuto')}) : error?.message || t('Operazione non riuscita. Controlla i log di Home Assistant.'));
};

export function diagnosticFor(error, { cardVersion, haVersion, phase, operation } = {}) {
  return [
    `Schedule Creator: ${cardVersion || t('non disponibile')}`,
    `Home Assistant: ${haVersion || t('non disponibile')}`,
    `${t('Fase')}: ${error?.phase || phase || t('non disponibile')}`,
    `${t('Operazione')}: ${error?.operation || operation || t('non disponibile')}`,
    `${t('Conferma del server')}: ${error?.acknowledged ? t('ricevuta') : t('non ricevuta')}`,
    `${t('Codice')}: ${error?.code || t('non disponibile')}`,
    `${t('Errore')}: ${error?.name ? `${error.name}: ` : ''}${error?.message || String(error)}`,
    error?.stack ? `${t('Traccia')}:\n${String(error.stack).split('\n').slice(0, 12).join('\n')}` : `${t('Traccia')}: ${t('non disponibile')}`,
  ].join('\n');
}

export function parseJson(text, label) {
  try { return JSON.parse(text); } catch { throw new Error(`${label}: ${t('JSON non valido.')}`); }
}
