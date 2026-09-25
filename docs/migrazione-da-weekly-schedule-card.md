# Passare dalla weekly-schedule-card a Schedule Creator

La weekly-schedule-card non è più sviluppata. La sostituisce Schedule Creator:
gli schedule girano dentro Home Assistant invece che tramite Scheduler, helper e
automazioni generate, quindi non resta nulla da pulire a mano.

Il passaggio richiede una decina di minuti. Nulla viene cancellato finché non lo
decidi tu, e la vecchia configurazione continua a funzionare fino all'ultimo
passo.

## 1. Salva la vecchia configurazione

1. Aggiorna la weekly-schedule-card alla **1.5.3 o successiva**.
2. Nella card apri **Gruppi → Manutenzione → Salva configurazione** e conserva il
   file `weekly-schedule-card-backup-….json` scaricato.

Questo file è la tua rete di sicurezza: dallo stesso menu potrai ripristinarlo.

## 2. Installa Schedule Creator

1. In HACS aggiungi `https://github.com/arozoire/schedule_creator` come
   repository personalizzato di tipo **Integrazione**, scarica **Schedule
   Creator** e riavvia Home Assistant.
2. **Impostazioni → Dispositivi e servizi → Aggiungi integrazione → Schedule
   Creator.**
3. Aggiungi la card a una dashboard:

   ```yaml
   type: custom:schedule-creator-card
   ```

## 3. Importa

1. Nella card di Schedule Creator apri **Manutenzione → Importa da Weekly
   Schedule Card** e scegli il file di backup.
2. Leggi l'anteprima. Ogni schedule è segnato come:
   - **Pronto** – convertito così com'era;
   - **Da controllare** – convertito, con una nota (per esempio “giorni
     lavorativi” diventati lunedì–venerdì);
   - **Importato disattivato** – qualcosa non si poteva convertire (una
     condizione su un attributo): completala nell'editor e riattiva lo schedule;
   - **Non importato** – schedule una tantum o orari non supportati, con il
     motivo.
3. Premi **Importa**. Tutto finisce in un nuovo profilo **disattivato**: per ora
   non parte nulla.

Non vengono importati i Quick Timer in corso, le dashboard e le card. Orari
alba/tramonto, condizioni con isteresi, azioni finali e notifiche sì.

## 4. Controlla gli schedule importati

Apri il profilo importato e guarda ogni schedule, soprattutto quelli *Da
controllare* o *Importato disattivato*. La settimana, la card timeline e le
statistiche in fondo a ogni schedule aiutano a verificare.

## 5. Ferma la weekly-schedule-card

Scegli una delle due strade:

- **Tenerla per ora** – spegni i suoi schedule (dalla vecchia card o dalle
  entità `switch.schedule_…` di Scheduler). Si torna indietro facilmente.
- **Cancellarne i dati** – nella vecchia card apri **Gruppi → Manutenzione →
  RESET**, scarica l'inventario, spunta la conferma e scrivi `RESET`. Cancella
  schedule, automazioni e helper generati dalla weekly-schedule-card. Non manda
  comandi ai dispositivi e non tocca altro.

  Le voci di Scheduler che la card non riconosce come proprie vengono indicate
  come *ignorate* e restano: cancellale in Scheduler se non ti servono.

Fallo **prima** del passo successivo, altrimenti tutte e due comanderebbero i
dispositivi.

## 6. Attiva il nuovo profilo

In Schedule Creator attiva il profilo importato (oppure accendi
`switch.schedule_creator_profilo_…`). Da qui in poi gli schedule li esegue
Schedule Creator, con o senza una dashboard aperta.

## 7. Pulizia (facoltativa)

- Togli le vecchie card dalle dashboard.
- Disinstalla la weekly-schedule-card da HACS.
- Se nient'altro li usa, rimuovi l'integrazione **Scheduler** e la
  scheduler-card, e gli helper `input_text.wsc_store_…`
  (**Impostazioni → Dispositivi e servizi → Aiutanti**).

## Tornare indietro

Disattiva il profilo di Schedule Creator e riaccendi i vecchi schedule — oppure,
dopo un RESET, ripristina nella weekly-schedule-card il backup del passo 1
(**Manutenzione → Ripristina da salvataggio**; richiede una
weekly-schedule-card vuota e ripristina i profili disattivati).
