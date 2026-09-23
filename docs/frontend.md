# Schedule Creator card

## Installazione con HACS

Serve Home Assistant 2026.9.2 o successivo con HACS gia installato.

1. In **HACS**, apri il menu **⋮ → Repository personalizzati**. Inserisci
   `https://github.com/arozoire/schedule_creator`, scegli **Integrazione** e
   premi **Aggiungi**. Se il repository e gia presente, salta questo passo.
2. Cerca **Schedule Creator** in HACS e scarica la release più recente.
   La card e inclusa nella stessa integrazione; non aggiungere un repository
   dashboard separato. Riavvia Home Assistant dopo il download.
3. In **Impostazioni → Dispositivi e servizi → Aggiungi integrazione**, cerca
   **Schedule Creator** e completa il modulo. Serve anche quando i file sono
   gia installati: crea il config entry e avvia il backend.
4. In **Impostazioni → Dashboard → ⋮ → Risorse**, aggiungi una risorsa di tipo
   **Modulo JavaScript** con URL esattamente
   `/schedule_creator/frontend/schedule-creator-card.js`. Se la risorsa esiste
   gia, non aggiungerla due volte. Ricarica la pagina/dashboard.
5. Modifica una dashboard, scegli **Aggiungi scheda → Manuale** e incolla:

   ```yaml
   type: custom:schedule-creator-card
   title: Schedule Creator
   ```

Se Home Assistant non mostra la scheda, apri direttamente l'URL della risorsa
nel browser: deve restituire JavaScript, non 404. Controlla che l'integrazione
sia stata configurata e avviata, quindi ricarica la pagina; sulla app mobile
ricarica la dashboard o svuota la cache frontend. Se appare `not_loaded`,
controlla **Dispositivi e servizi**: i soli file HACS non creano il config entry.
Una configurazione nuova e vuota mostra un calendario vuoto: crea un profilo,
poi un gruppo e uno schedule dalla card. La vecchia weekly-schedule-card resta
installata e puo stare nella stessa dashboard.

## Contratto tecnico

The integration includes a separate Lovelace card derived from the
weekly-schedule-card visual style. It does not register or modify the original
card. After installing the integration and restarting Home Assistant, add a
Lovelace resource of type **JavaScript module** with URL:

`/schedule_creator/frontend/schedule-creator-card.js`

Then add a manual dashboard card:

```yaml
type: custom:schedule-creator-card
title: Schedule Creator
```

The resource is registered by the integration's global setup. Install this
repository as a HACS **integration**, not as a frontend card. The generated JS
asset ships inside `custom_components/schedule_creator/frontend/`. The source
and its dependency-free build are in `frontend/`; run `npm run build` there if
changing them. Registration is idempotent during config-entry reloads; an HA
restart is needed after the first install to load the static route and new JS.

| UI field | Backend source | Conversion or limit |
|---|---|---|
| Profile chips | `config.profiles`, `active_profile_ids` | Uses profile `active`; chips select a view, never activate a profile |
| Group tabs | `config.groups` | Filtered by `profile_id`; when no group, shows all schedules for profile |
| Entity labels | `config.schedules[].target_entity_ids` | Text only; no HA schedule-switch discovery |
| Weekly blocks | `config.schedules[].time_slots[]` | `weekdays` 0–6 Monday–Sunday, local `start` and `end`; overnight slots show start/end label on starting day |
| Runtime line | `runtime_summary`, `quick_timers`, `operational` | Active timer and lease/occurrence projections; no snapshots |
| Live changes | `subscribe_runtime` → `get_state` | Runtime and config revisions invalidate the state |

The card subscribes before its first read, refetches after an event during an
in-flight request, releases the listener on removal and rereads after a new HA
connection. HTTP serves the JS with cache headers disabled. On reload, refresh
the browser if the old bundle remains cached.

The dashboard card supports profile, group and schedule CRUD and Quick Timer.
Its Lovelace card editor changes only the title. No legacy helper, automation,
reset or migration action runs.
Running legacy and new schedules against the same devices may cause competing
commands; use separate entities while evaluating the new integration.

Validation: Node adapter tests and generated bundle syntax; Python lint and HA
CI. Browser smoke test in an actual HA dashboard (old and new cards together,
empty/populated state, theme/mobile, disconnection) remains to be done on an
installation; the Node tests use a mocked HA connection.

## Frontend 1–9 (versione successiva)

La card ora gestisce profili, gruppi, schedule e timer tramite i comandi WebSocket
amministrativi. Il titolo nella configurazione della card rimane modificabile
mentre Home Assistant aggiorna lo stato. Scegli un profilo, crea un gruppo con
entità reali, poi uno schedule; il profilo nuovo parte inattivo e va attivato.
L'intervallo è nell'ora locale configurata in Home Assistant, con giorni ISO
0–6 (lunedì–domenica). Le fasce aggiuntive e l'albero delle condizioni usano
JSON esplicito. Ogni nodo condizione può indicare operator, entity_id, value,
lower, upper, children, minimum_duration_seconds e hysteresis secondo il
modello; sono supportati state_equals, state_not_equals, numeric_greater,
numeric_greater_or_equal, numeric_less, numeric_less_or_equal, numeric_range,
available, and e or. Si possono modificare anche policy, date e notifiche.
Per un'azione che non rientra nei comandi comuni, scegliere **JSON avanzato**:
`{"domain":"switch","action":"turn_on","data":{}}`. Non inserire ID di
entità in `data`: il server usa gli ID del gruppo. La modifica di uno schedule
preserva le proprietà avanzate e le fasce aggiuntive nella bozza. L'editor
JSON richiede una conoscenza del modello: non offre ancora widget per ogni nodo.

`get_state` ora restituisce `quick_timers` (solo attivi: id, entity_id, state,
expires_at, action) e `operational` (occorrenze attive/sospese: id, schedule_id,
state, condition_branch, end_utc; lease: entity_id, controller_type, state).
Queste proiezioni sono leggibili da tutti gli utenti autenticati, come la
configurazione. Non includono snapshot, giornale delle operazioni o errori interni.
Il conteggio `runtime_summary.quick_timers` include anche timer terminali;
l'elenco attivo è distinto. L'assenza di un motivo verificabile appare come
«stato non disponibile». La subscription runtime esistente aggiunge eventi
`{"config_revision": N}` dopo i commit della configurazione; il payload
runtime `{"revision": N}` e la risposta iniziale restano compatibili.

Un account non admin può leggere ma non modificare. Un conflitto di revisione
aggiorna i dati, conserva la bozza e richiede conferma prima di ritentare.
La UI visualizza l'esito del commit; le azioni fisiche successive sono gestite
dal backend e vanno verificate nell'entità di Home Assistant. Il countdown del
timer è solo visuale. Non è prevista importazione automatica dalla vecchia
weekly-schedule-card; per prove parallele usa entità distinte.

Prove locali: `cd frontend && npm run build && npm test` (mock WebSocket).
Smoke su Home Assistant reale, incluse azioni su dispositivi, smartphone e
convivenza con la vecchia card: in attesa della prova dell'utente.
