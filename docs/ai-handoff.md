# AI handoff — piano frontend per Sol

## Decisione e checkpoint (2026-09-23)

Il proprietario vuole copiare `arozoire/weekly-schedule-card` **dentro
`arozoire/schedule_creator`**, mantenendo intatto il frontend funzionante.
Implementatore previsto: **Sol**. Riutilizzare grafica, layout, editor e selettori;
non creare un nuovo pannello laterale HA, non riscrivere la UI.
Questo documento contiene il piano originale e lo stato della tappa A qui sotto.

### Aggiornamento tappa A (2026-09-23)

Branch di implementazione: `codex/frontend-copy-phase-a-main` da `main`
`fa1ff9fe8be101c187060a42570c311e212f8cd3`; branch del piano pubblicato:
`codex/frontend-copy-handoff` (`701fa316f7c787c450a91b0dd5e4a433d1153e2f`).
Tappa A implementata localmente: card separata in sola lettura, CSS copiato
dall'upstream con licenza MIT, adapter WebSocket, asset statico HA, editor solo
titolo, documentazione e job CI Node. I vecchi moduli base/Quick Timer non sono
copiati perché l'import li renderebbe eseguibili e attiverebbe storage e
automazioni legacy; la parità visiva completa e i controlli operativi rimangono
per B/C. L'asset riusa chip, tab e palette, visualizzando fasce e gruppi.
I test Node dell'adapter (3) e lint Python locale sono passati; smoke in HA reale
ancora da fare. PR/SHA/CI finale saranno indicati sotto dopo pubblicazione.

- Backend fase 2 completato e unito con PR #23.
- Subscription runtime completata e unita con PR #24.
- Main verificato: `fa1ff9fe8be101c187060a42570c311e212f8cd3`.
- Head PR #24 validato: `4bfe6f6e980eb692bb6441e14c535735eda04813`.
- CI verde: https://github.com/arozoire/schedule_creator/actions/runs/35763823937
- I 185 test erano il checkpoint fase 2, non un conteggio attuale.
- Manifest `0.0.1`; nessuna nuova release.

Il backend gestisce arbitraggio, lease, snapshot, condizioni, azioni, ripristini,
notifiche persistenti e Quick Timer. Le operazioni rimaste `sent` al riavvio
falliscono in sicurezza perché l'esito esterno è ignoto. Non ricreare il motore
nel browser. Fine fascia senza azione finale non ripristina automaticamente;
transizioni condizionali e precedenze seguono i modelli/runtime esistenti.

**Vincoli:** lavoro/token contenuti; test mirati durante sviluppo e CI finale.
Nessun merge, bump, tag, release o deploy sull'HA dell'utente senza richiesta.
Il permesso di unire PR #24 non autorizza merge futuri.

## Sorgente riproducibile e destinazione

Sorgente ispezionata: `arozoire/weekly-schedule-card`, commit
`04a537d8a09c54555e13edad239a9e39adbbaf24` su main, package `1.5.3`.
È il riferimento per la copia, non una nuova attestazione di test.
Non inseguire automaticamente modifiche upstream. Conservare licenza MIT e
attribuzione, registrare SHA e file copiati in `frontend/UPSTREAM.md`.
Nessun submodule o dipendenza runtime dal repository originale.

Struttura proposta:

- `frontend/src/`: sorgenti copiati/adattati e adapter WebSocket.
- `frontend/package.json`, lockfile, `rollup.config.js`: toolchain riutilizzata.
- `frontend/tests/`: test UI utili e test adapter.
- `custom_components/schedule_creator/frontend/`: bundle distribuibili generati.
- `docs/frontend.md`: mappatura, installazione, limiti e prova manuale.

Upstream contiene `base-card.js`, `weekly-schedule-card.js`,
`weekly-schedule-view-card.js`, `weekly-serpentine-card.js`,
`quick-timer-card.js`, `conditional-controller.js`, `maintenance-card.js`,
`reset-card.js`, `lz-string.js` in src. Leggere import e accessi dati prima di
selezionare i file. Priorità: base, card principale ed editor, poi Quick Timer.
Viste alternative solo successivamente se facilmente riutilizzabili.
Non copiare workflow release/deploy, hacs.json o funzioni RESET upstream.
Separare helper UI utili da motore/persistenza legacy, senza lasciarli attivi.

Identità nuove: `custom:schedule-creator-card`,
`schedule-creator-card-editor`, `custom:schedule-creator-quick-timer-card`.
Rinominare anche custom element interni, registrazioni window.customCards,
chiavi locali ed eventi proprietari in conflitto; non eventi standard HA.
Vecchie e nuove card devono convivere nella stessa dashboard.

## Prima attività: mappatura mirata

Leggere questo file, docs/websocket-api.md, modelli pertinenti ed eventuali
AGENTS.md applicabili. Verificare una volta stato remoto, branch e worktree;
preservare modifiche altrui. Creare branch dal main corrente, includendo questo
piano se ancora su branch separato. Non assumere che il vecchio branch locale
abbia la storia del main remoto.

Cercare nel sorgente letture/salvataggi, ID, profili, gruppi, fasce, timer e
registrazioni. Scrivere in docs/frontend.md una breve tabella
campo UI → campo backend → trasformazione/limite. Non rileggere tutta la storia.

## Contratti e lacune da gestire

| Funzione | API esistente |
|---|---|
| Lettura configurazione | schedule_creator/get_state |
| Profili/attivazione | schedule_creator/profile/* documentati |
| Gruppi | schedule_creator/group/* documentati |
| Schedule | schedule_creator/schedule/* documentati |
| Timer | schedule_creator/quick_timer/create e /cancel |
| Invalidazione runtime | schedule_creator/subscribe_runtime |

Usare la connessione autenticata HA, senza token aggiuntivi.
L'adapter traduce UI e modelli senza un secondo archivio autorevole.
ID/revisioni sono server-owned. CRUD usa revisione config, timer revisione runtime:
sono indipendenti. Su conflitto rileggere e chiedere conferma, non ritentare
mutazioni alla cieca. Conservare la bozza dell'utente.

Lacune già note:

1. get_state espone configurazione completa ma **solo conteggi runtime**.
   Non basta per recuperare timer/ID/scadenze dopo refresh. Nella tappa timer
   aggiungere una proiezione di lettura minima documentata (ID, entità, stato,
   scadenza e soli campi UI necessari). Non esporre snapshot, journal o audit.
   Non inventare timer dai conteggi o tenerli solo nella memoria del browser.
2. subscribe_runtime invia solo revisioni runtime, non cambiamenti config.
   Rileggere dopo mutazioni proprie e riconnessione. Per altri client serve
   un'invalidazione config minima, mantenendo compatibile il canale esistente.
3. Nessuna creazione/cancellazione automazioni, esecuzione condizioni, comandi
   target, notifiche o ripristini dal frontend. Stati/metadati HA possono servire
   ai selettori; esecuzione e persistenza restano nel backend.
4. Nessuna migrazione/importazione silenziosa dai dati legacy. Non alterare
   automazioni, helper o storage della card originale. Evitare prove attive con
   vecchi e nuovi schedule sulle medesime entità: l'isolamento UI non impedisce
   a due motori di comandare lo stesso dispositivo.

## Piano di esecuzione

### A — Copia isolata e lettura: prima PR

1. Copiare sorgenti necessari, licenza, toolchain e test riutilizzabili; registrare
   provenienza. Rinominare identità in conflitto senza redesign.
2. Collegare adapter in sola lettura: profili, gruppi, fasce e riepilogo runtime.
   Disabilitare chiaramente comandi non ancora collegati. Nessun pulsante deve
   invocare vecchi salvataggi o creare automazioni.
3. Sottoscrivere prima della lettura iniziale. Accorpare eventi ravvicinati; se un
   evento arriva durante un fetch, ripetere la lettura alla fine. Scartare risposte
   obsolete senza confrontare revisioni config e runtime tra loro.
4. Gestire loading, vuoto, backend assente/non caricato, errore, riconnessione,
   rimozione/reinserimento card. Rilasciare listener/subscription anche se la
   promessa termina dopo detach. Rileggere dopo reload/riconnessione senza
   assumere monotonicità tra istanze runtime diverse.
5. Generare bundle nell'integrazione e servirli tramite API statiche HA supportate:
   verificare codice/versione HA disponibile e registrazione senza duplicati su
   reload. Documentare URL effettivo e risorsa Lovelace module. Inizialmente
   registrazione risorsa manuale documentata; non modificare dashboard dell'utente.
   Mantenere HACS come integration e garantire che includa gli asset generati.

Accettazione A: nuova e vecchia card convivono; dati veri e aggiornamento runtime;
nessuna scrittura legacy. Non dichiarare parità completa con la vecchia card.

### B — Editor e configurazione: seconda PR

6. Collegare editor riusati a CRUD profili/gruppi/schedule e attivazione profili.
   Mappare giorni/fasce, timezone HA, azioni, condizioni, notifiche, fine fascia e
   riferimenti sui modelli esistenti. Nessuna conversione con perdita silenziosa.
   Funzioni upstream non rappresentabili: indicarle/disabilitarle, non emularle.
7. Bloccare doppi invii; distinguere validazione, autorizzazione e conflitto.
   Non admin: UI in lettura; sicurezza sempre verificata dal server.
8. Aggiungere invalidazione config minima per client multipli, se ancora assente,
   con contratto documentato e test mirato. Refresh dopo salvataggio.

Accettazione B: CRUD, attivazione e aggiornamento su secondo client funzionano,
revisioni corrette; vecchio sistema intatto.

### C — Quick Timer e chiusura frontend iniziale: terza PR

9. Implementare proiezione runtime minima; collegare durata/azione, start,
   countdown/stato e cancel. Recuperare elenco e ID dopo refresh. Countdown solo
   visuale: scadenza/ripristino funzionano a browser chiuso. Visualizzare rifiuti
   di precedenza del backend, senza aggirarli.
10. Adattare viste alternative solo se economico; altrimenti registrare il residuo.
    RESET, backup/restore e migrazione legacy restano fuori da queste PR.
11. Documentare installazione, convivenza, differenze e limiti residui.

Accettazione C: timer avviabili/annullabili anche dopo refresh; nessun motore
nel browser; funzioni mancanti esplicitate. Non promettere parità non verificata.
Tre traguardi coerenti, non una PR per micro-modifica; nessun merge autonomo.

## Verifiche proporzionate

- Durante lavoro: test delle parti cambiate e build dopo modifiche strutturali.
- Casi frontend: namespace separati, vuoto/errori, subscribe/unsubscribe,
  riconnessione, evento durante fetch, refresh dopo CRUD, conflitti revisioni,
  read-only, recupero timer persistenti, nessuna scrittura legacy.
- Estensioni backend: test trasporto WebSocket, autorizzazione, payload minimo,
  notifica dopo commit riuscito, nessuna notifica su errore/no-op.
- Smoke browser: card vecchia e nuova insieme, mobile/tema, editor e stati errore.
  Dichiarare cosa è mock e cosa è provato in HA reale; se assente indicare il gap.
- Prima di consegnare ciascuna PR: build e test pertinenti, poi CI finale esistente
  backend più frontend. Non ripetere suite identiche senza motivo.
- Il venv locale HA precedente aveva perso l'interprete: non ripetere tentativi
  identici; usare ambiente disponibile o CI, dichiarando il limite.
- Riutilizzare test UI utili; sostituire aspettative sulle vecchie automazioni.
  I test legacy non dimostrano correttezza dell'adapter nuovo.

## Budget e comunicazione tra agenti

Copia meccanica e patch mirate, non rigenerazione manuale di file enormi.
Niente cambio framework, upgrade dipendenze o refactoring globale non necessario.
Ricerche mirate prima di leggere file interi; nessuna delega automatica.

A ogni traguardo aggiornare questo file: branch, PR, SHA, link CI e test eseguiti,
file chiave, cosa è realmente finito, gap e prossimo passo esatto.
Distinguere piano/implementazione e mock/prova reale. Conservare decisioni e vincoli.

## Prompt pronto per Sol

> Lavora in arozoire/schedule_creator. Leggi docs/ai-handoff.md e
> docs/websocket-api.md sul branch del piano indicato dall'utente. Implementa la
> tappa A: copia indipendente di weekly-schedule-card nello stesso repository,
> identità nuove e adapter in lettura. Non modificare il repository originale.
> Massimo riuso, patch mirate, test pertinenti e CI finale. Aggiorna l'handoff e
> consegna una PR. Niente merge, bump, tag, release o deploy senza autorizzazione.
> Non rifare il backend concluso; non implementare B/C prima di chiudere A.
