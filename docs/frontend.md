# Schedule Creator card — phase A

## Installazione con HACS (versione 0.1.0)

Serve Home Assistant 2026.9.2 o successivo con HACS gia installato.

1. In **HACS**, apri il menu **⋮ → Repository personalizzati**. Inserisci
   `https://github.com/arozoire/schedule_creator`, scegli **Integrazione** e
   premi **Aggiungi**. Se il repository e gia presente, salta questo passo.
2. Cerca **Schedule Creator** in HACS e scarica la release **v0.1.0**.
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
Una configurazione nuova e vuota mostrera un calendario vuoto: l'editor degli
schedule e previsto per la fase B. La vecchia weekly-schedule-card resta
installata e puo stare nella stessa dashboard.

## Contratto tecnico

The integration includes a separate read-only Lovelace card derived from the
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
| Runtime line | `runtime_summary` | Counts only; no timer list or snapshot is available yet |
| Live changes | `subscribe_runtime` → `get_state` | Runtime revisions trigger a new snapshot read; config changes on another client do not currently trigger an event |

The card subscribes before its first read, refetches after an event during an
in-flight request, releases the listener on removal and rereads after a new HA
connection. HTTP serves the JS with cache headers disabled. On reload, refresh
the browser if the old bundle remains cached.

This phase is read-only. The editor can change only the card title. Profile,
group and schedule CRUD, Quick Timer controls and config notifications belong
to phases B/C. No legacy helper, automation, reset or migration action runs.
Running legacy and new schedules against the same devices may cause competing
commands; use separate entities while evaluating the new integration.

Validation: Node adapter tests and generated bundle syntax; Python lint and HA
CI. Browser smoke test in an actual HA dashboard (old and new cards together,
empty/populated state, theme/mobile, disconnection) remains to be done on an
installation; the Node tests use a mocked HA connection.
