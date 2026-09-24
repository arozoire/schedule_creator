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
4. Dalla 0.3.5 la card si carica **da sola** in tutte le dashboard: non serve
   aggiungere una risorsa. Se in **Impostazioni → Dashboard → ⋮ → Risorse**
   esiste già `/schedule_creator/frontend/schedule-creator-card.js` (con o senza
   `?v=`/`hacstag`), può restare o essere rimossa: tutti gli URL caricano lo
   stesso bundle una volta sola.
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

## Aggiornamenti senza interventi manuali (0.3.5)

L'URL `/schedule_creator/frontend/schedule-creator-card.js` restituisce un
piccolo loader mai memorizzato in cache (`Cache-Control: no-store`) che importa
`/schedule_creator/static/schedule-creator-card.js?v=<hash del contenuto>`.
Quando HACS sostituisce il bundle, l'hash cambia e il browser scarica la nuova
card al successivo caricamento della pagina, senza modificare risorse o `?v=`.
La card confronta la propria versione con `integration_version` del backend:

| Situazione | Cosa fare | Messaggio nella card |
|---|---|---|
| Solo la card è cambiata (stesso Python) | Ricaricare la pagina | Nessuno, dopo il refresh |
| Nuovo codice Python scaricato da HACS | **Riavviare Home Assistant** (non serve riavviare il Raspberry) | «Riavvia Home Assistant…» finché il backend in esecuzione è più vecchio |
| Pagina aperta da prima dell'aggiornamento | Ricaricare la pagina / app | «Ricarica la pagina…» |
| Ricarica dell'integrazione da Dispositivi e servizi | Utile solo per riavviare il runtime; **non** importa nuovo codice Python | — |

Ogni release di Schedule Creator include codice Python, quindi dopo un
aggiornamento HACS serve un riavvio di Home Assistant: è il limite del
caricamento dei moduli Python in HA, non aggirabile in modo sicuro. Dopo il
riavvio basta ricaricare la dashboard; non servono più `?v=` né cancellazioni
della cache. Il primo passaggio alla 0.3.5 richiede ancora riavvio e refresh.

## Contratto tecnico

### Editor azioni, suggerimenti e manutenzione 0.3.5

- Climate: pulsanti modalità HVAC con icone, temperatura con cursore e campo
  numerico, ventola a chip; preset e swing in «Altre opzioni». Con «Spento»
  restano solo i pulsanti. Inizio, fine e Quick Timer salvano un unico
  `apply_state` (vedi `websocket-api.md`). Le azioni precedenti con
  `set_temperature`/`set_hvac_mode` si riaprono negli stessi controlli.
- Luci: Acceso/Spento e cursore luminosità (1–100%), colore o temperatura
  colore se supportati. Tende: Apri/Chiudi/Posizione/Ferma con cursore
  percentuale. Ventole: velocità in percentuale e preset. La fine può essere
  «Nessuna azione».
- Il nome dello schedule e i testi delle notifiche vengono proposti da entità,
  azione e fascia e si aggiornano finché non li modifichi; «Suggerisci»
  ripropone il nome. Negli schedule esistenti i testi non cambiano da soli.
- «Gestisci schedule» usa righe compatte. «Panoramica profili e interazioni»
  mostra stato e tipo dei profili e le entità comandate da più profili.
  L'ordine dei profili/gruppi serve solo a disporli nell'elenco.
- «Manutenzione»: Salva backup (file JSON), Ripristina backup con anteprima e
  controllo delle entità mancanti, RESET con conferma scritta.

### Vista ed editor 0.3.3

La vista principale è una settimana tipo con colonne lunedì–domenica e asse
00:00–24:00. Posizione e altezza rappresentano inizio e durata; sovrapposizioni
affiancate, fasce notturne divise alla mezzanotte. Clicca una fascia per aprire
l'editor. La lista completa è raccolta in **Gestisci schedule**. Su schermi
stretti si scorre la griglia orizzontalmente. Date speciali/condizioni restano
nelle opzioni: la griglia non promette esecuzione in una data specifica.

Profili, gruppi, schedule e timer si modificano in popup modali; Esc o Annulla
chiudono, Salva invia tramite il backend. Errori e bozza restano nel popup.
Focus e scroll vengono mantenuti durante i cambi dei controlli. Una preview
con dati fittizi è disponibile in `frontend/preview.html`.

The integration includes a separate Lovelace card derived from the
weekly-schedule-card visual style. It does not register or modify the original
card. Since 0.3.5 the integration loads the card automatically (frontend extra
module); an existing Lovelace resource with URL
`/schedule_creator/frontend/schedule-creator-card.js` keeps working and is no
longer required. That URL serves an uncached loader importing the bundle by
content hash, so HACS updates reach the browser after a page reload. The card
compares its version with the running backend and explains whether to reload
the page or restart Home Assistant (see "Aggiornamenti senza interventi manuali").
A server response with code
`unknown_command` requires checking the backend integration version and a full
Home Assistant restart. The text `Method not implemented.` alone does not
identify a backend problem. Expand **Dettagli errore** and copy its text: the
report includes card/HA versions, the failing phase, command, server
acknowledgement, error code and available stack. It does not include the schedule
payload, configuration snapshot or authentication data. If the server already
acknowledged the save, reload the dashboard before creating another schedule.

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
0–6 (lunedì–domenica). Fasce e condizioni sono modificabili tramite controlli nella card. Ogni nodo condizione può indicare operator, entity_id, value,
lower, upper, children, minimum_duration_seconds e hysteresis secondo il
modello; sono supportati state_equals, state_not_equals, numeric_greater,
numeric_greater_or_equal, numeric_less, numeric_less_or_equal, numeric_range,
available, and e or. Si possono modificare anche policy, date e notifiche.
Per un'azione che non rientra nei comandi comuni, scegliere **JSON avanzato**:
`{"domain":"switch","action":"turn_on","data":{}}`. Non inserire ID di
entità in `data`: il server usa gli ID del gruppo. La modifica di uno schedule
preserva le proprietà avanzate e le fasce aggiuntive nella bozza. La modalità Pro resta disponibile per azioni e configurazioni personalizzate.

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


## Correzioni 0.2.1 dopo la prova HA

- Nei nuovi gruppi e nei timer compaiono switch/input_boolean, luci, climate,
  ventole e cover, purché HA esponga i servizi del dominio. Sensori e automazioni
  non sono nuove destinazioni selezionabili. Eventuali entità già memorizzate ma
  non disponibili restano riconoscibili durante la modifica, senza perdita muta.
- La ricerca filtra davvero nome e ID: la regola CSS `hidden` prevale sul layout.
- Uno schedule propone soltanto le entità del proprio gruppo. Un singolo schedule
  usa un tipo di dispositivo; un gruppo può contenere tipi diversi.
- Switch: ON/OFF. Luci: ON/OFF e, se supportati, luminosità, colore RGB o Kelvin.
  Climate: modalità disponibili, temperatura (anche intervallo), modalità ventola
  e preset. Fan: ON/OFF, percentuale e preset. Cover: apertura/chiusura/stop/posizione.
  I parametri appaiono solo quando pertinenti al comando e alle capability.
  Per climate temperatura e modalità possono condividere un comando; la velocità
  ventola è un comando separato, secondo il contratto corrente del backend.
- Fasce multiple, albero condizioni E/O e confronti, durata minima, isteresi,
  notifiche e destinazioni si configurano con campi e pulsanti. I sensori sono
  ammessi nelle condizioni, dove vengono letti e non comandati.
- JSON è confinato a sezioni Pro richiuse di default, con attivazione esplicita.
  Azioni personalizzate esistenti sono conservate; rinominare lo schedule non
  riscrive il payload dell'azione. Una bozza usa la revisione della sua apertura.

Verifica automatica: test DOM sul bundle distribuito e test HA che crea profilo,
gruppo e schedule via WebSocket, chiude il client, avanza l'orologio nel fuso
Europe/Rome e verifica ON/OFF attraverso servizi switch registrati nel test.
Questa è una simulazione HA, non una prova sui dispositivi dell'utente.

Prova personale 0.2.1: aggiorna HACS, riavvia HA e ricarica la dashboard. Ripeti
prima gruppo/ricerca (punto 4), schedule ON/OFF imminente con profilo attivo (5)
e timer (7). Poi luce e climate con i comandi effettivamente supportati.

## Revisione grafica 0.3.0

La card usa colori e caratteri del tema Home Assistant. La settimana diventa
un'agenda verticale quando la card è larga al massimo 600 px, anche dentro
una dashboard desktop a colonne. Profili e gruppi restano scorribili; gestione
e attività sono sezioni espandibili. Gli editor mantengono le API esistenti.

Anteprima riproducibile: dalla radice del repository avvia
`python -m http.server 8765`, poi apri `http://localhost:8765/frontend/preview.html`.
La pagina usa dati fittizi, consente il cambio tema e disabilita i salvataggi.
