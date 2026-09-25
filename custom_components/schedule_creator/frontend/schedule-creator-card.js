// Generated translations of the Italian interface text (key = Italian).
// Keep placeholders such as {time} identical in every language.
const STRINGS = {
  en: {
    "Diminuisci": "Decrease",
    "Aumenta": "Increase",
    "Aperta": "Open",
    "Chiusa": "Closed",
    "In apertura": "Opening",
    "In chiusura": "Closing",
    "Seleziona prima un’entità.": "Select an entity first.",
    "Modalità HVAC": "HVAC mode",
    "Comando": "Command",
    "Stato": "State",
    "Temperatura": "Temperature",
    "Minima": "Minimum",
    "Massima": "Maximum",
    "Ventola": "Fan",
    "Swing orizzontale": "Horizontal swing",
    "Luminosità": "Brightness",
    "Non cambiare colore": "Keep the colour",
    "Colore": "Colour",
    "Temperatura colore": "Colour temperature",
    "Velocità": "Speed",
    "Posizione": "Position",
    "Stato attuale": "Current state",
    "Azione personalizzata conservata in modalità Pro.": "Custom action kept in Pro mode.",
    "Altre opzioni": "More options",
    "Pro · azione personalizzata": "Pro · custom action",
    "Usa JSON al posto dei controlli": "Use JSON instead of the controls",
    "Azione JSON": "JSON action",
    "Azione Pro non valida per le entità selezionate.": "Invalid Pro action for the selected entities.",
    "Il target è già definito dalle entità selezionate.": "The target is already set by the selected entities.",
    "apply_state richiede il campo \"state\".": "apply_state requires the \"state\" field.",
    "Scegli cosa deve fare il dispositivo.": "Choose what the device should do.",
    "Comando non disponibile per questo dispositivo.": "Command not available for this device.",
    "Indica la posizione richiesta.": "Enter the requested position.",
    "Inserisci un valore numerico valido.": "Enter a valid number.",
    "Stato precedente": "Previous state",
    "ventola {mode}": "fan {mode}",
    "Accendi": "Turn on",
    "Spegni": "Turn off",
    "Apri": "Open",
    "Chiudi": "Close",
    "Ferma": "Stop",
    "Posizione {value}%": "Position {value}%",
    "Velocità {value}%": "Speed {value}%",
    "Home Assistant ha confermato il salvataggio, ma la card non è riuscita ad aggiornare la vista. Ricarica la dashboard prima di riprovare.": "Home Assistant confirmed the save, but the card could not refresh the view. Reload the dashboard before trying again.",
    "Home Assistant ha rifiutato {operation} ({code}). Aggiorna l’integrazione Schedule Creator, riavvia completamente Home Assistant e riprova. Se persiste, comunica questo comando e controlla i log dell’integrazione.": "Home Assistant rejected {operation} ({code}). Update the Schedule Creator integration, fully restart Home Assistant and try again. If it persists, report this command and check the integration logs.",
    "Salvataggio non riuscito: una funzione ha restituito “Method not implemented”. La bozza è conservata. Apri “Dettagli errore” e invia il testo per individuare il passaggio che fallisce.": "Save failed: a function returned “Method not implemented”. The draft is kept. Open “Error details” and send the text to find the failing step.",
    "Configurazione cambiata su un altro client. La bozza è conservata: confrontala e salva di nuovo.": "The configuration changed on another client. The draft is kept: compare it and save again.",
    "Serve un account amministratore per modificare.": "An administrator account is needed to edit.",
    "Dati non validi: controlla entità, fasce e parametri delle azioni.": "Invalid data: check entities, slots and action settings.",
    "Formato non valido: controlla i campi richiesti.": "Invalid format: check the required fields.",
    "Profilo, gruppo o schedule non trovato. Aggiorna la vista.": "Profile, group or schedule not found. Refresh the view.",
    "Il gruppo non appartiene al profilo scelto.": "The group does not belong to the chosen profile.",
    "Profilo in uso: rimuovi prima i gruppi e gli schedule collegati.": "Profile in use: remove its groups and schedules first.",
    "Gruppo in uso: rimuovi prima gli schedule collegati.": "Group in use: remove its schedules first.",
    "Il timer non è più attivo.": "The timer is no longer active.",
    "Integrazione non caricata: controlla Dispositivi e servizi.": "Integration not loaded: check Devices & services.",
    "Archivio non disponibile: controlla i log di Home Assistant.": "Storage unavailable: check the Home Assistant logs.",
    "Operazione {operation} non riuscita ({code}). Controlla i log di Home Assistant.": "Operation {operation} failed ({code}). Check the Home Assistant logs.",
    "errore sconosciuto": "unknown error",
    "Operazione non riuscita. Controlla i log di Home Assistant.": "Operation failed. Check the Home Assistant logs.",
    "non disponibile": "not available",
    "Fase": "Phase",
    "Operazione": "Operation",
    "Conferma del server": "Server confirmation",
    "ricevuta": "received",
    "non ricevuta": "not received",
    "Codice": "Code",
    "Errore": "Error",
    "Traccia": "Trace",
    "JSON non valido.": "invalid JSON.",
    "Abilita notifica": "Enable notification",
    "Destinazione": "Target",
    "Notifica in Home Assistant": "Home Assistant notification",
    "Titolo": "Title",
    "Messaggio": "Message",
    "1 ora": "1 hour",
    "{count} ore": "{count} hours",
    "{count} minuti": "{count} minutes",
    "Avvia": "Start",
    "{action} fino alle {time}": "{action} until {time}",
    "{action} per {duration}": "{action} for {duration}",
    "Caricamento…": "Loading…",
    "Scegli l’entità": "Choose the entity",
    "Cerca per nome o ID": "Search by name or ID",
    "Alla scadenza torna a": "When it ends it returns to",
    "lo stato precedente": "the previous state",
    "Annulla": "Cancel",
    "Nessun timer attivo. Serve un amministratore per avviarne uno.": "No active timer. An administrator is needed to start one.",
    "Durante il timer": "During the timer",
    "Azione": "Action",
    "Per quanto": "For how long",
    "Durata": "Duration",
    "Fino alle": "Until",
    "Durata in minuti": "Duration in minutes",
    "Minuti": "Minutes",
    "Cambia": "Change",
    "Entità non disponibile.": "Entity unavailable.",
    "Scegli una durata tra 1 minuto e 7 giorni.": "Choose a duration between 1 minute and 7 days.",
    "Entità": "Entity",
    "Scegli nella card": "Choose in the card",
    "Durate rapide (minuti, separate da virgola)": "Quick durations (minutes, comma separated)",
    "Tutti i giorni": "Every day",
    "Lun–Ven": "Mon–Fri",
    "Weekend": "Weekend",
    "La card v{card} è aggiornata, ma Home Assistant esegue ancora l’integrazione {backend}. Riavvia Home Assistant (Impostazioni → Sistema → Riavvia) per attivare il nuovo backend.": "Card v{card} is up to date, but Home Assistant still runs the {backend} integration. Restart Home Assistant (Settings → System → Restart) to activate the new backend.",
    "precedente": "previous",
    "L’integrazione v{backend} è attiva, ma questa pagina usa ancora la card v{card}. Ricarica la pagina; nell’app mobile usa “Ricarica” o svuota la cache del frontend.": "Integration v{backend} is active, but this page still uses card v{card}. Reload the page; in the mobile app use “Reload” or clear the frontend cache.",
    "Uno schedule controlla entità dello stesso tipo. Crea uno schedule separato per gli altri dispositivi.": "A schedule controls entities of one type. Create a separate schedule for the other devices.",
    "Tipo di dispositivo cambiato: scegli nuovamente le azioni.": "Device type changed: choose the actions again.",
    "Orario": "Time",
    "oggi": "today",
    "Clicca uno spazio libero per aggiungere uno schedule": "Click free space to add a schedule",
    "Disabilitato": "Disabled",
    "Ora": "Now",
    "Clima: freddo → caldo": "Climate: cool → warm",
    "In corso": "Running",
    "In pausa": "Paused",
    "Un comando non è riuscito nelle ultime 24 ore: dettagli in “Attività”.": "A command failed in the last 24 hours: details in “Activity”.",
    "{count} comandi non sono riusciti nelle ultime 24 ore: dettagli in “Attività”.": "{count} commands failed in the last 24 hours: details in “Activity”.",
    "Profilo attivo": "Active profile",
    "Profilo inattivo": "Inactive profile",
    "Esclusivo": "Exclusive",
    "Condiviso": "Shared",
    "Crea un profilo per iniziare": "Create a profile to start",
    "{count} timer attivi": "{count} active timers",
    "Settimana": "Week",
    "Gruppi": "Groups",
    "Programmazione settimanale": "Weekly schedule",
    "Gestisci schedule ({count})": "Manage schedules ({count})",
    "disabilitato": "disabled",
    "1 fascia": "1 slot",
    "{count} fasce": "{count} slots",
    "Modifica": "Edit",
    "Elimina": "Delete",
    "Inizia dal tuo primo profilo": "Start with your first profile",
    "Aggiungi un gruppo di dispositivi": "Add a group of devices",
    "La settimana è ancora libera": "The week is still free",
    "Organizza la casa per abitudini, ambienti o stagioni.": "Organise the home by habits, rooms or seasons.",
    "Riunisci i dispositivi che vuoi programmare.": "Gather the devices you want to schedule.",
    "Tocca qui o su un orario del calendario per creare uno schedule.": "Tap here or on a time in the calendar to create a schedule.",
    "Gestisci profili e gruppi": "Manage profiles and groups",
    "Profilo": "Profile",
    "Modifica profilo": "Edit profile",
    "Disattiva profilo": "Deactivate profile",
    "Attiva profilo": "Activate profile",
    "Elimina profilo": "Delete profile",
    "Gruppo": "Group",
    "Modifica gruppo": "Edit group",
    "Elimina gruppo": "Delete group",
    "Vista in sola lettura: serve un amministratore per modificare.": "Read-only view: an administrator is needed to edit.",
    "Manutenzione · backup, import e RESET": "Maintenance · backup, import and RESET",
    "Il backup salva profili, gruppi e schedule in un file JSON. Il ripristino li sostituisce e lascia i profili disattivati. L’import dalla weekly-schedule-card li aggiunge in un nuovo profilo disattivato. RESET cancella tutti i dati di Schedule Creator.": "A backup saves profiles, groups and schedules to a JSON file. Restoring replaces them and leaves the profiles inactive. Importing from weekly-schedule-card adds them in a new inactive profile. RESET deletes all Schedule Creator data.",
    "Salva backup": "Save backup",
    "Ripristina backup": "Restore backup",
    "Importa da Weekly Schedule Card": "Import from Weekly Schedule Card",
    "Attività · {slots} fasce in corso · {timers} timer": "Activity · {slots} running slots · {timers} timers",
    "{count} errori": "{count} errors",
    "Comandi non riusciti": "Failed commands",
    "condizione": "condition",
    "termine": "end",
    "Nessuna fascia attiva.": "No active slot.",
    "Timer": "Timer",
    "Annulla timer": "Cancel timer",
    "Dettagli errore": "Error details",
    "Seleziona e copia questo testo per segnalare il problema.": "Select and copy this text to report the problem.",
    "Dettagli errore da copiare": "Error details to copy",
    "1 fascia in corso": "1 slot running",
    "{count} fasce in corso": "{count} slots running",
    "nessuna fascia in corso": "no slot running",
    "Schedule": "Schedule",
    "Profili": "Profiles",
    "Chiudi editor": "Close editor",
    "Più profili attivi ora: vince la fascia iniziata per ultima.": "Several profiles active now: the slot that started last wins.",
    "Possono essere attivi insieme: se le fasce si sovrappongono vince quella iniziata per ultima.": "They can be active together: if slots overlap, the one that started last wins.",
    "Profili esclusivi: mai attivi insieme, nessun conflitto.": "Exclusive profiles: never active together, no conflict.",
    "Attivo": "Active",
    "Inattivo": "Inactive",
    "{groups} gruppi · {schedules} schedule · {entities} entità": "{groups} groups · {schedules} schedules · {entities} entities",
    "Panoramica profili e interazioni": "Profiles and interactions overview",
    "<strong>Esclusivo</strong>: attivandolo si disattivano gli altri profili esclusivi. <strong>Condiviso</strong>: resta attivo insieme agli altri. Solo i profili attivi eseguono i loro schedule. Se due fasce comandano la stessa entità vince quella iniziata per ultima; a parità un Quick Timer prevale su uno schedule con condizione, che prevale su uno normale. L’ordine serve solo a disporre profili e gruppi.": "<strong>Exclusive</strong>: activating it deactivates the other exclusive profiles. <strong>Shared</strong>: stays active together with the others. Only active profiles run their schedules. When two slots control the same entity, the one that started last wins; on a tie a Quick Timer beats a conditional schedule, which beats a plain one. The order only arranges profiles and groups.",
    "Entità comandate da più profili": "Entities controlled by several profiles",
    "Nessuna: ogni entità è programmata da un solo profilo.": "None: each entity is scheduled by one profile.",
    "In attesa": "Waiting",
    "Adesso": "Now",
    "La condizione non è soddisfatta": "The condition is not met",
    "Un altro schedule o timer ha la priorità": "Another schedule or timer has priority",
    "Fino alle {time}": "Until {time}",
    "condizione vera": "condition true",
    "Resta": "Left",
    "poi": "then",
    "Nessuna fascia in corso adesso.": "No slot running right now.",
    "Notifica di stato": "Status notification",
    "Notifica persistente per tutta la fascia": "Persistent notification for the whole slot",
    "In Home Assistant compare una notifica che dice se lo schedule è attivo, in pausa per la condizione o in attesa di un altro controllo; si aggiorna da sola e sparisce a fine fascia.": "Home Assistant shows a notification telling whether the schedule is active, paused by its condition or waiting for another controller; it updates itself and disappears when the slot ends.",
    "Tocco sulla notifica": "Tapping the notification",
    "Apre <strong>{url}</strong> (app Companion e notifiche di Home Assistant).": "Opens <strong>{url}</strong> (Companion app and Home Assistant notifications).",
    "Nessuna pagina impostata: la notifica non apre nulla.": "No page set: the notification opens nothing.",
    "Apri questa dashboard": "Open this dashboard",
    "Rimuovi collegamento": "Remove link",
    "Ricerca entità": "Entity search",
    "Nome, dominio o ID": "Name, domain or ID",
    "avvio": "start",
    "alle {time}": "at {time}",
    "fascia terminata": "slot ended",
    "Gli schedule della weekly-schedule-card vengono <strong>aggiunti</strong> in un nuovo profilo, <strong>disattivato</strong>: nulla viene eseguito finché non lo attivi. La weekly-schedule-card e Scheduler non vengono modificati.": "The weekly-schedule-card schedules are <strong>added</strong> in a new, <strong>inactive</strong> profile: nothing runs until you activate it. weekly-schedule-card and Scheduler are not changed.",
    "Backup della weekly-schedule-card (.json)": "weekly-schedule-card backup (.json)",
    "Nella weekly-schedule-card: Gruppi → Manutenzione → Salva configurazione.": "In weekly-schedule-card: Groups → Maintenance → Save configuration.",
    "Pronto": "Ready",
    "Da controllare": "To check",
    "Importato disattivato": "Imported disabled",
    "Non importato": "Not imported",
    "e": "and",
    "o": "or",
    "isteresi": "hysteresis",
    "alla fine": "at the end",
    "se": "if",
    "esclusivo": "exclusive",
    "condiviso": "shared",
    "{count} gruppi": "{count} groups",
    "era attivo nella weekly-schedule-card": "was active in weekly-schedule-card",
    "Salvato il {date}": "Saved on {date}",
    "data sconosciuta": "unknown date",
    "{ready} pronti · {off} disattivati · {skip} non importati": "{ready} ready · {off} disabled · {skip} not imported",
    "Questo backup è già stato importato il {date}: importandolo di nuovo gli schedule saranno duplicati.": "This backup was already imported on {date}: importing it again duplicates the schedules.",
    "Entità non presenti in questo Home Assistant: {list}": "Entities missing in this Home Assistant: {list}",
    "Prima di attivare il profilo importato spegni gli stessi schedule nella weekly-schedule-card (o in Scheduler): altrimenti i dispositivi ricevono i comandi due volte.": "Before activating the imported profile, turn the same schedules off in weekly-schedule-card (or Scheduler): otherwise devices receive the commands twice.",
    "1 attivazione": "1 activation",
    "{count} attivazioni": "{count} activations",
    "mai": "never",
    "Attivazioni": "Activations",
    "Fasce bloccate dalla condizione": "Slots blocked by the condition",
    "Ultima attivazione": "Last activation",
    "Ultimo blocco per condizione": "Last blocked by condition",
    "Conteggi da quando è installata la versione 0.3.15; una fascia conta una volta sola.": "Counted since version 0.3.15 was installed; each slot counts once.",
    "Schedule eliminato": "Deleted schedule",
    "notifica": "notification",
    "ripristino dello stato": "state restore",
    "azione finale": "end action",
    "azione a condizione falsa": "action when the condition is false",
    "azione iniziale": "start action",
    "esito sconosciuto: Home Assistant si è riavviato durante l’invio": "unknown outcome: Home Assistant restarted while sending",
    "il servizio ha restituito un errore o non ha risposto ({count} tentativi)": "the service returned an error or did not answer ({count} attempts)",
    "ripristino non riuscito ({count} tentativi)": "restore failed ({count} attempts)",
    "notifica non inviata ({count} tentativi)": "notification not sent ({count} attempts)",
    "dati del comando non validi": "invalid command data",
    "stato iniziale non disponibile": "initial state unavailable",
    "Backup salvato: {profiles} profili, {groups} gruppi, {schedules} schedule.": "Backup saved: {profiles} profiles, {groups} groups, {schedules} schedules.",
    "Il file non è un backup di Schedule Creator né della weekly-schedule-card.": "The file is not a Schedule Creator or weekly-schedule-card backup.",
    "Il file non contiene JSON valido.": "The file does not contain valid JSON.",
    "non disponibile/supportata": "unavailable/unsupported",
    "Nome": "Name",
    "Tipo": "Type",
    "Posizione nell’elenco (0 = primo)": "Position in the list (0 = first)",
    "Serve solo a ordinare l’elenco: non cambia priorità né esecuzione.": "Only sorts the list: it changes neither priority nor execution.",
    "Nessuna azione": "No action",
    "Nessuna": "None",
    "{count} condizioni": "{count} conditions",
    "Da completare": "To complete",
    "Inizio": "Start",
    "Fine": "End",
    "Suggerisci": "Suggest",
    "Dispositivi": "Devices",
    "gruppo": "group",
    "Quando": "When",
    "All’inizio": "At the start",
    "Azione iniziale": "Start action",
    "Alla fine": "At the end",
    "Azione finale": "End action",
    "Condizioni": "Conditions",
    "Se falsa: azione finale se presente, altrimenti ripristino deciso dal motore. La fine fascia senza azione finale non invia comandi.": "If false: the end action if set, otherwise a restore decided by the engine. The end of a slot without an end action sends no command.",
    "Notifiche": "Notifications",
    "Notifica iniziale": "Start notification",
    "Notifica finale": "End notification",
    "Abilitato": "Enabled",
    "Schedule abilitato": "Schedule enabled",
    "Orari nel fuso {zone}. Se la fine precede l’inizio, la fascia termina il giorno successivo.": "Times in the {zone} time zone. If the end is before the start, the slot ends the next day.",
    "Comandi manuali": "Manual commands",
    "Cooperativa": "Cooperative",
    "Priorità al comando manuale": "Manual command has priority",
    "Date incluse (AAAA-MM-GG, separate da virgola)": "Included dates (YYYY-MM-DD, comma separated)",
    "Date escluse (AAAA-MM-GG, separate da virgola)": "Excluded dates (YYYY-MM-DD, comma separated)",
    "Statistiche": "Statistics",
    "Pro · configurazione JSON": "Pro · JSON configuration",
    "Usa JSON per condizioni, fasce e notifiche": "Use JSON for conditions, slots and notifications",
    "Configurazione avanzata": "Advanced configuration",
    "Il ripristino <strong>sostituisce</strong> tutti i profili, gruppi e schedule attuali con quelli del file. I profili ripristinati restano <strong>disattivati</strong>: attivali quando vuoi che eseguano i comandi. Timer e fasce in corso non fanno parte del backup.": "Restoring <strong>replaces</strong> all current profiles, groups and schedules with those in the file. Restored profiles stay <strong>inactive</strong>: activate them when you want them to send commands. Timers and running slots are not part of the backup.",
    "File di backup (.json)": "Backup file (.json)",
    "Contenuto del file": "File contents",
    "{profiles} profili · {groups} gruppi · {schedules} schedule": "{profiles} profiles · {groups} groups · {schedules} schedules",
    "Salvato il {date} con la versione {version}.": "Saved on {date} with version {version}.",
    "sconosciuta": "unknown",
    "Entità non presenti in questo Home Assistant: {list}. Gli schedule collegati non potranno comandarle.": "Entities missing in this Home Assistant: {list}. The related schedules will not be able to control them.",
    "Scegli un file creato con “Salva backup”.": "Choose a file created with “Save backup”.",
    "RESET cancella <strong>tutti</strong> i dati di Schedule Creator: {profiles} profili, {groups} gruppi, {schedules} schedule, {timers} timer attivi, fasce in corso e storico operazioni. L’integrazione resta installata e vuota.": "RESET deletes <strong>all</strong> Schedule Creator data: {profiles} profiles, {groups} groups, {schedules} schedules, {timers} active timers, running slots and operation history. The integration stays installed and empty.",
    "I dispositivi restano nello stato in cui si trovano: nessun comando di spegnimento o ripristino viene inviato. Dispositivi, entità, automazioni e la vecchia weekly-schedule-card non vengono toccati.": "Devices stay as they are: no turn-off or restore command is sent. Devices, entities, automations and the old weekly-schedule-card are not touched.",
    "Prima di procedere puoi salvare un backup.": "You can save a backup before continuing.",
    "Scrivi RESET per confermare": "Type RESET to confirm",
    "Durata in secondi (1–604800)": "Duration in seconds (1–604800)",
    "Azione timer": "Timer action",
    "Nuovo profilo": "New profile",
    "Nuovo gruppo": "New group",
    "Modifica schedule": "Edit schedule",
    "Nuovo schedule": "New schedule",
    "RESET completo": "Full RESET",
    "Ripristina": "Restore",
    "Importa": "Import",
    "Cancella tutto": "Delete everything",
    "Salva schedule": "Save schedule",
    "Salva": "Save",
    "Eliminare questo elemento?": "Delete this item?",
    "I dati sono cambiati su un altro client. Hai verificato le modifiche prima di procedere?": "The data changed on another client. Did you check the changes before continuing?",
    "lettura del modulo": "reading the form",
    "validazione del nome": "name validation",
    "Inserisci un nome prima di salvare.": "Enter a name before saving.",
    "Scegli prima un file di backup.": "Choose a backup file first.",
    "Scegli prima un backup della weekly-schedule-card con almeno uno schedule importabile.": "First choose a weekly-schedule-card backup with at least one importable schedule.",
    "Scrivi RESET in maiuscolo per confermare la cancellazione.": "Type RESET in capitals to confirm the deletion.",
    "preparazione dei dati": "preparing the data",
    "validazione delle entità": "entity validation",
    "Scegli entità dello stesso tipo appartenenti al gruppo.": "Choose entities of one type that belong to the group.",
    "lettura delle fasce orarie": "reading the time slots",
    "Ogni fascia richiede almeno un giorno e orari diversi.": "Each slot needs at least one day and different times.",
    "lettura azione iniziale": "reading the start action",
    "lettura azione finale": "reading the end action",
    "lettura condizioni e notifiche": "reading conditions and notifications",
    "Configurazione Pro": "Pro configuration",
    "Campi Pro non validi.": "Invalid Pro fields.",
    "Inserisci il messaggio della notifica oppure disabilitala.": "Enter the notification message or disable it.",
    "Servono due regole per E/O.": "AND/OR needs two rules.",
    "Seleziona un’entità valida nella condizione.": "Select a valid entity in the condition.",
    "Completa il valore della condizione.": "Complete the condition value.",
    "La durata deve essere tra 1 e 604800 secondi.": "The duration must be between 1 and 604800 seconds.",
    "Editor non disponibile.": "Editor unavailable.",
    "confronto con la configurazione esistente": "comparing with the current configuration",
    "I dati sono cambiati su un altro client. Hai confrontato la bozza con i nuovi dati prima di salvare?": "The data changed on another client. Did you compare the draft with the new data before saving?",
    "salvataggio e aggiornamento della vista": "saving and refreshing the view",
    "Importato in {names}. Il profilo è disattivato: spegni gli schedule nella weekly-schedule-card prima di attivarlo.": "Imported into {names}. The profile is inactive: turn the schedules off in weekly-schedule-card before activating it.",
    "RESET completato: Schedule Creator è vuoto.": "RESET completed: Schedule Creator is empty.",
    "Backup ripristinato. I profili sono disattivati: attivali per eseguire gli schedule.": "Backup restored. Profiles are inactive: activate them to run the schedules.",
    "Titolo della card": "Card title",
    "Fascia a cavallo della mezzanotte: modifica gli orari nei campi qui sotto.": "Slot across midnight: change the times in the fields below.",
    "Trascina la fascia o le maniglie: si aggancia agli inizi/fini degli altri schedule (magnete).": "Drag the slot or its handles: it snaps to the starts/ends of other schedules (magnet).",
    "Trascina la fascia o le maniglie per cambiare gli orari.": "Drag the slot or its handles to change the times.",
    "Passo di aggancio": "Snap step",
    "Passo": "Step",
    "Tutti": "All",
    "Feriali": "Weekdays",
    "Altra fascia di questo schedule": "Another slot of this schedule",
    "Fascia {n}": "Slot {n}",
    "Rimuovi fascia": "Remove slot",
    "Fascia successiva": "Next slot",
    "riferimento": "reference",
    "minuti prima (−) o dopo (+)": "minutes before (−) or after (+)",
    "min · ≈ {time} oggi": "min · ≈ {time} today",
    "1 · Entità da controllare": "1 · Entity to check",
    "Rimuovi condizione": "Remove condition",
    "Scegli un’entità: poi vedrai solo i confronti possibili (acceso/spento, maggiore/minore…).": "Choose an entity: then you will only see the comparisons that fit (on/off, greater/less…).",
    "tra": "between",
    "disponibile": "available",
    "Da": "From",
    "A": "To",
    "3 · Valore": "3 · Value",
    "Isteresi": "Hysteresis",
    "Margine anti-oscillazione: una volta vera, la condizione torna falsa solo oltre la soglia ± isteresi.": "Anti-flapping margin: once true, the condition only turns false beyond the threshold ± hysteresis.",
    "2 · Confronto": "2 · Comparison",
    "è": "is",
    "non è": "is not",
    "Diventa vera dopo": "Becomes true after",
    "Torna falsa dopo": "Becomes false after",
    "Evita avanti e indietro: la condizione cambia solo se resta vera (o falsa) per questo tempo. Esempio tende: chiudi dopo 10 min sopra 500 lx, riapri dopo 15 min sotto.": "Avoids back and forth: the condition only changes if it stays true (or false) for this long. Blinds example: close after 10 min above 500 lx, reopen after 15 min below.",
    "Nessuna condizione: lo schedule esegue sempre nelle sue fasce.": "No condition: the schedule always runs in its slots.",
    "Condizione": "Condition",
    "Altra condizione": "Another condition",
    "Quando vale lo schedule": "When the schedule applies",
    "Tutte le condizioni": "All conditions",
    "Almeno una": "At least one",
    "Icona": "Icon",
    "Automatico": "Automatic",
    "Altro colore": "Other colour",
    "fino alle {time}": "until {time}",
    "In pausa · condizione": "Paused · condition",
    "Prossima {time}": "Next {time}",
    "Dalle {time}": "From {time}",
    "Non disponibile": "Unavailable",
    "Profili attivi": "Active profiles",
    "Nessun profilo attivo": "No active profile",
    "Oggi": "Today",
    "Giorno": "Day",
    "Nessuna entità programmata nei profili attivi.": "No entity scheduled in the active profiles.",
    "in corso": "running",
    "in pausa": "paused",
    "profilo {name}": "profile {name}",
    "ora": "now",
    "La settimana": "The week",
    "Lun → · Mar ← · la mezzanotte è nella curva": "Mon → · Tue ← · midnight is in the curve",
    "Settimana a serpentina": "Serpentine week",
    "La settimana ad anello": "The week as a ring",
    "Ogni anello è un dispositivo · lo spazio tra i settori è la mezzanotte": "Each ring is a device · the gap between sectors is midnight",
    "Nessuna attività in corso": "Nothing running",
    "Prossima: {name}": "Next: {name}",
    "Settimana ad anello": "Ring week",
    "Solo temperatura: la modalità resta quella del dispositivo.": "Temperature only: the device keeps its mode.",
    "Più comandi nella fascia: importato solo “{service}”.": "Several commands in the slot: only “{service}” was imported.",
    "Condizione incompleta ignorata.": "Incomplete condition ignored.",
    "Condizione sull’attributo “{attribute}” di {entity}: non supportata.": "Condition on attribute “{attribute}” of {entity}: not supported.",
    "Valore non numerico “{value}” per {entity}.": "Non-numeric value “{value}” for {entity}.",
    "La condizione di Scheduler era valutata solo all’inizio: ora vale per tutta la fascia.": "The Scheduler condition was only checked at the start: it now applies to the whole slot.",
    "Il file non è un backup della weekly-schedule-card.": "The file is not a weekly-schedule-card backup.",
    "Profilo WSC": "WSC profile",
    "Altri dispositivi": "Other devices",
    "Configurazione mancante nel backup.": "Configuration missing from the backup.",
    "Schedule una tantum: non importato.": "One-off schedule: not imported.",
    "Giorni non riconosciuti.": "Days not recognised.",
    "“Giorni lavorativi” importati come lunedì–venerdì.": "“Workdays” imported as Monday–Friday.",
    "Periodo {from} → {to} non supportato: vale tutto l’anno.": "Period {from} → {to} not supported: it applies all year.",
    "Fine gestita da uno schedule figlio della vecchia versione: controlla l’azione finale.": "End handled by a child schedule of the old version: check the end action.",
    "Orario “{time}” non supportato.": "Time “{time}” not supported.",
    "Azione puntuale: diventa una fascia di un minuto.": "Single-point action: it becomes a one-minute slot.",
    "Fascia di durata zero ignorata.": "Zero-length slot ignored.",
    "Fascia con più dispositivi: ignorata.": "Slot with several devices: ignored.",
    "Comando non riconosciuto per {entity}.": "Command not recognised for {entity}.",
    "Fasce con azioni diverse: importata solo la prima azione.": "Slots with different actions: only the first action was imported.",
    "Nessuna fascia importabile.": "No importable slot.",
    "Era disattivato nella weekly-schedule-card: resta disattivato.": "It was disabled in weekly-schedule-card: it stays disabled.",
    "Importato disattivato: completa la condizione e riattivalo.": "Imported disabled: complete the condition and enable it again.",
    "Quando la condizione è falsa viene eseguita l’azione finale.": "When the condition is false the end action runs.",
    "Lun": "Mon",
    "Mar": "Tue",
    "Mer": "Wed",
    "Gio": "Thu",
    "Ven": "Fri",
    "Sab": "Sat",
    "Dom": "Sun",
    "Lunedì": "Monday",
    "Martedì": "Tuesday",
    "Mercoledì": "Wednesday",
    "Giovedì": "Thursday",
    "Venerdì": "Friday",
    "Sabato": "Saturday",
    "Domenica": "Sunday",
    "LUN": "MON",
    "MAR": "TUE",
    "MER": "WED",
    "GIO": "THU",
    "VEN": "FRI",
    "SAB": "SAT",
    "DOM": "SUN",
    "Alba": "Sunrise",
    "Tramonto": "Sunset",
    "Spento": "Off",
    "Acceso": "On",
    "Auto": "Auto",
    "Caldo/Freddo": "Heat/Cool",
    "Freddo": "Cool",
    "Caldo": "Heat",
    "Deumidifica": "Dry",
    "Acceso / Sì": "On / Yes",
    "Spento / No": "Off / No",
    "A casa": "Home",
    "Fuori casa": "Away",
    "Subito": "At once",
    "Casa": "Home",
    "Soggiorno": "Living room",
    "Camera": "Bedroom",
    "Cucina": "Kitchen",
    "Bagno": "Bathroom",
    "Studio": "Office",
    "Garage": "Garage",
    "Giardino": "Garden",
    "Scale": "Stairs",
    "Luci": "Lights",
    "Plafoniera": "Ceiling light",
    "Striscia LED": "LED strip",
    "Termostato": "Thermostat",
    "Clima": "Air conditioning",
    "Termosifone": "Radiator",
    "Tapparelle": "Shutters",
    "Tende": "Blinds",
    "Presa": "Socket",
    "Boiler": "Water heater",
    "Lavatrice": "Washing machine",
    "TV": "TV",
    "Robot": "Robot",
    "Irrigazione": "Irrigation",
    "Notte": "Night",
    "Lavoro": "Work",
    "Vacanza": "Holiday",
    "Inverno": "Winter",
    "Programma": "Schedule",
  },
  fr: {
    "Diminuisci": "Diminuer",
    "Aumenta": "Augmenter",
    "Aperta": "Ouvert",
    "Chiusa": "Fermé",
    "In apertura": "Ouverture",
    "In chiusura": "Fermeture",
    "Seleziona prima un’entità.": "Sélectionnez d’abord une entité.",
    "Modalità HVAC": "Mode CVC",
    "Comando": "Commande",
    "Stato": "État",
    "Temperatura": "Température",
    "Minima": "Minimum",
    "Massima": "Maximum",
    "Ventola": "Ventilation",
    "Swing orizzontale": "Oscillation horizontale",
    "Luminosità": "Luminosité",
    "Non cambiare colore": "Ne pas changer la couleur",
    "Colore": "Couleur",
    "Temperatura colore": "Température de couleur",
    "Velocità": "Vitesse",
    "Posizione": "Position",
    "Stato attuale": "État actuel",
    "Azione personalizzata conservata in modalità Pro.": "Action personnalisée conservée en mode Pro.",
    "Altre opzioni": "Plus d’options",
    "Pro · azione personalizzata": "Pro · action personnalisée",
    "Usa JSON al posto dei controlli": "Utiliser du JSON au lieu des commandes",
    "Azione JSON": "Action JSON",
    "Azione Pro non valida per le entità selezionate.": "Action Pro non valide pour les entités sélectionnées.",
    "Il target è già definito dalle entità selezionate.": "La cible est déjà définie par les entités sélectionnées.",
    "apply_state richiede il campo \"state\".": "apply_state nécessite le champ \"state\".",
    "Scegli cosa deve fare il dispositivo.": "Choisissez ce que l’appareil doit faire.",
    "Comando non disponibile per questo dispositivo.": "Commande indisponible pour cet appareil.",
    "Indica la posizione richiesta.": "Indiquez la position souhaitée.",
    "Inserisci un valore numerico valido.": "Saisissez une valeur numérique valide.",
    "Stato precedente": "État précédent",
    "ventola {mode}": "ventilation {mode}",
    "Accendi": "Allumer",
    "Spegni": "Éteindre",
    "Apri": "Ouvrir",
    "Chiudi": "Fermer",
    "Ferma": "Arrêter",
    "Posizione {value}%": "Position {value} %",
    "Velocità {value}%": "Vitesse {value} %",
    "Home Assistant ha confermato il salvataggio, ma la card non è riuscita ad aggiornare la vista. Ricarica la dashboard prima di riprovare.": "Home Assistant a confirmé l’enregistrement, mais la carte n’a pas pu actualiser la vue. Rechargez le tableau de bord avant de réessayer.",
    "Home Assistant ha rifiutato {operation} ({code}). Aggiorna l’integrazione Schedule Creator, riavvia completamente Home Assistant e riprova. Se persiste, comunica questo comando e controlla i log dell’integrazione.": "Home Assistant a refusé {operation} ({code}). Mettez à jour l’intégration Schedule Creator, redémarrez complètement Home Assistant et réessayez. Si le problème persiste, signalez cette commande et consultez les journaux de l’intégration.",
    "Salvataggio non riuscito: una funzione ha restituito “Method not implemented”. La bozza è conservata. Apri “Dettagli errore” e invia il testo per individuare il passaggio che fallisce.": "Échec de l’enregistrement : une fonction a renvoyé « Method not implemented ». Le brouillon est conservé. Ouvrez « Détails de l’erreur » et envoyez le texte pour identifier l’étape en échec.",
    "Configurazione cambiata su un altro client. La bozza è conservata: confrontala e salva di nuovo.": "La configuration a changé sur un autre client. Le brouillon est conservé : comparez-le et enregistrez à nouveau.",
    "Serve un account amministratore per modificare.": "Un compte administrateur est nécessaire pour modifier.",
    "Dati non validi: controlla entità, fasce e parametri delle azioni.": "Données non valides : vérifiez les entités, les plages et les paramètres des actions.",
    "Formato non valido: controlla i campi richiesti.": "Format non valide : vérifiez les champs obligatoires.",
    "Profilo, gruppo o schedule non trovato. Aggiorna la vista.": "Profil, groupe ou planning introuvable. Actualisez la vue.",
    "Il gruppo non appartiene al profilo scelto.": "Le groupe n’appartient pas au profil choisi.",
    "Profilo in uso: rimuovi prima i gruppi e gli schedule collegati.": "Profil utilisé : supprimez d’abord ses groupes et plannings.",
    "Gruppo in uso: rimuovi prima gli schedule collegati.": "Groupe utilisé : supprimez d’abord ses plannings.",
    "Il timer non è più attivo.": "Le minuteur n’est plus actif.",
    "Integrazione non caricata: controlla Dispositivi e servizi.": "Intégration non chargée : vérifiez Appareils et services.",
    "Archivio non disponibile: controlla i log di Home Assistant.": "Stockage indisponible : consultez les journaux de Home Assistant.",
    "Operazione {operation} non riuscita ({code}). Controlla i log di Home Assistant.": "L’opération {operation} a échoué ({code}). Consultez les journaux de Home Assistant.",
    "errore sconosciuto": "erreur inconnue",
    "Operazione non riuscita. Controlla i log di Home Assistant.": "Échec de l’opération. Consultez les journaux de Home Assistant.",
    "non disponibile": "non disponible",
    "Fase": "Phase",
    "Operazione": "Opération",
    "Conferma del server": "Confirmation du serveur",
    "ricevuta": "reçue",
    "non ricevuta": "non reçue",
    "Codice": "Code",
    "Errore": "Erreur",
    "Traccia": "Trace",
    "JSON non valido.": "JSON non valide.",
    "Abilita notifica": "Activer la notification",
    "Destinazione": "Destination",
    "Notifica in Home Assistant": "Notification dans Home Assistant",
    "Titolo": "Titre",
    "Messaggio": "Message",
    "1 ora": "1 heure",
    "{count} ore": "{count} heures",
    "{count} minuti": "{count} minutes",
    "Avvia": "Démarrer",
    "{action} fino alle {time}": "{action} jusqu’à {time}",
    "{action} per {duration}": "{action} pendant {duration}",
    "Caricamento…": "Chargement…",
    "Scegli l’entità": "Choisissez l’entité",
    "Cerca per nome o ID": "Rechercher par nom ou ID",
    "Alla scadenza torna a": "À l’échéance, revient à",
    "lo stato precedente": "l’état précédent",
    "Annulla": "Annuler",
    "Nessun timer attivo. Serve un amministratore per avviarne uno.": "Aucun minuteur actif. Un administrateur est nécessaire pour en lancer un.",
    "Durante il timer": "Pendant le minuteur",
    "Azione": "Action",
    "Per quanto": "Pendant combien de temps",
    "Durata": "Durée",
    "Fino alle": "Jusqu’à",
    "Durata in minuti": "Durée en minutes",
    "Minuti": "Minutes",
    "Cambia": "Changer",
    "Entità non disponibile.": "Entité indisponible.",
    "Scegli una durata tra 1 minuto e 7 giorni.": "Choisissez une durée entre 1 minute et 7 jours.",
    "Entità": "Entité",
    "Scegli nella card": "Choisir dans la carte",
    "Durate rapide (minuti, separate da virgola)": "Durées rapides (minutes, séparées par des virgules)",
    "Tutti i giorni": "Tous les jours",
    "Lun–Ven": "Lun–Ven",
    "Weekend": "Week-end",
    "La card v{card} è aggiornata, ma Home Assistant esegue ancora l’integrazione {backend}. Riavvia Home Assistant (Impostazioni → Sistema → Riavvia) per attivare il nuovo backend.": "La carte v{card} est à jour, mais Home Assistant exécute encore l’intégration {backend}. Redémarrez Home Assistant (Paramètres → Système → Redémarrer) pour activer le nouveau backend.",
    "precedente": "précédente",
    "L’integrazione v{backend} è attiva, ma questa pagina usa ancora la card v{card}. Ricarica la pagina; nell’app mobile usa “Ricarica” o svuota la cache del frontend.": "L’intégration v{backend} est active, mais cette page utilise encore la carte v{card}. Rechargez la page ; dans l’application mobile, utilisez « Recharger » ou videz le cache du frontend.",
    "Uno schedule controlla entità dello stesso tipo. Crea uno schedule separato per gli altri dispositivi.": "Un planning contrôle des entités d’un seul type. Créez un planning séparé pour les autres appareils.",
    "Tipo di dispositivo cambiato: scegli nuovamente le azioni.": "Type d’appareil modifié : choisissez à nouveau les actions.",
    "Orario": "Heure",
    "oggi": "aujourd’hui",
    "Clicca uno spazio libero per aggiungere uno schedule": "Cliquez sur un espace libre pour ajouter un planning",
    "Disabilitato": "Désactivé",
    "Ora": "Maintenant",
    "Clima: freddo → caldo": "Climat : froid → chaud",
    "In corso": "En cours",
    "In pausa": "En pause",
    "Un comando non è riuscito nelle ultime 24 ore: dettagli in “Attività”.": "Une commande a échoué ces dernières 24 heures : détails dans « Activité ».",
    "{count} comandi non sono riusciti nelle ultime 24 ore: dettagli in “Attività”.": "{count} commandes ont échoué ces dernières 24 heures : détails dans « Activité ».",
    "Profilo attivo": "Profil actif",
    "Profilo inattivo": "Profil inactif",
    "Esclusivo": "Exclusif",
    "Condiviso": "Partagé",
    "Crea un profilo per iniziare": "Créez un profil pour commencer",
    "{count} timer attivi": "{count} minuteurs actifs",
    "Settimana": "Semaine",
    "Gruppi": "Groupes",
    "Programmazione settimanale": "Programmation hebdomadaire",
    "Gestisci schedule ({count})": "Gérer les plannings ({count})",
    "disabilitato": "désactivé",
    "1 fascia": "1 plage",
    "{count} fasce": "{count} plages",
    "Modifica": "Modifier",
    "Elimina": "Supprimer",
    "Inizia dal tuo primo profilo": "Commencez par votre premier profil",
    "Aggiungi un gruppo di dispositivi": "Ajoutez un groupe d’appareils",
    "La settimana è ancora libera": "La semaine est encore libre",
    "Organizza la casa per abitudini, ambienti o stagioni.": "Organisez la maison par habitudes, pièces ou saisons.",
    "Riunisci i dispositivi che vuoi programmare.": "Rassemblez les appareils à programmer.",
    "Tocca qui o su un orario del calendario per creare uno schedule.": "Touchez ici ou une heure du calendrier pour créer un planning.",
    "Gestisci profili e gruppi": "Gérer les profils et les groupes",
    "Profilo": "Profil",
    "Modifica profilo": "Modifier le profil",
    "Disattiva profilo": "Désactiver le profil",
    "Attiva profilo": "Activer le profil",
    "Elimina profilo": "Supprimer le profil",
    "Gruppo": "Groupe",
    "Modifica gruppo": "Modifier le groupe",
    "Elimina gruppo": "Supprimer le groupe",
    "Vista in sola lettura: serve un amministratore per modificare.": "Vue en lecture seule : un administrateur est nécessaire pour modifier.",
    "Manutenzione · backup, import e RESET": "Maintenance · sauvegarde, import et RESET",
    "Il backup salva profili, gruppi e schedule in un file JSON. Il ripristino li sostituisce e lascia i profili disattivati. L’import dalla weekly-schedule-card li aggiunge in un nuovo profilo disattivato. RESET cancella tutti i dati di Schedule Creator.": "La sauvegarde enregistre profils, groupes et plannings dans un fichier JSON. La restauration les remplace et laisse les profils désactivés. L’import depuis weekly-schedule-card les ajoute dans un nouveau profil désactivé. RESET efface toutes les données de Schedule Creator.",
    "Salva backup": "Enregistrer la sauvegarde",
    "Ripristina backup": "Restaurer une sauvegarde",
    "Importa da Weekly Schedule Card": "Importer depuis Weekly Schedule Card",
    "Attività · {slots} fasce in corso · {timers} timer": "Activité · {slots} plages en cours · {timers} minuteurs",
    "{count} errori": "{count} erreurs",
    "Comandi non riusciti": "Commandes en échec",
    "condizione": "condition",
    "termine": "fin",
    "Nessuna fascia attiva.": "Aucune plage active.",
    "Timer": "Minuteur",
    "Annulla timer": "Annuler le minuteur",
    "Dettagli errore": "Détails de l’erreur",
    "Seleziona e copia questo testo per segnalare il problema.": "Sélectionnez et copiez ce texte pour signaler le problème.",
    "Dettagli errore da copiare": "Détails de l’erreur à copier",
    "1 fascia in corso": "1 plage en cours",
    "{count} fasce in corso": "{count} plages en cours",
    "nessuna fascia in corso": "aucune plage en cours",
    "Schedule": "Planning",
    "Profili": "Profils",
    "Chiudi editor": "Fermer l’éditeur",
    "Più profili attivi ora: vince la fascia iniziata per ultima.": "Plusieurs profils actifs : la plage commencée en dernier l’emporte.",
    "Possono essere attivi insieme: se le fasce si sovrappongono vince quella iniziata per ultima.": "Ils peuvent être actifs ensemble : si les plages se chevauchent, celle commencée en dernier l’emporte.",
    "Profili esclusivi: mai attivi insieme, nessun conflitto.": "Profils exclusifs : jamais actifs ensemble, aucun conflit.",
    "Attivo": "Actif",
    "Inattivo": "Inactif",
    "{groups} gruppi · {schedules} schedule · {entities} entità": "{groups} groupes · {schedules} plannings · {entities} entités",
    "Panoramica profili e interazioni": "Vue d’ensemble des profils et interactions",
    "<strong>Esclusivo</strong>: attivandolo si disattivano gli altri profili esclusivi. <strong>Condiviso</strong>: resta attivo insieme agli altri. Solo i profili attivi eseguono i loro schedule. Se due fasce comandano la stessa entità vince quella iniziata per ultima; a parità un Quick Timer prevale su uno schedule con condizione, che prevale su uno normale. L’ordine serve solo a disporre profili e gruppi.": "<strong>Exclusif</strong> : l’activer désactive les autres profils exclusifs. <strong>Partagé</strong> : reste actif avec les autres. Seuls les profils actifs exécutent leurs plannings. Si deux plages commandent la même entité, celle commencée en dernier l’emporte ; à égalité, un Quick Timer l’emporte sur un planning conditionnel, qui l’emporte sur un planning simple. L’ordre sert uniquement à disposer profils et groupes.",
    "Entità comandate da più profili": "Entités commandées par plusieurs profils",
    "Nessuna: ogni entità è programmata da un solo profilo.": "Aucune : chaque entité est programmée par un seul profil.",
    "In attesa": "En attente",
    "Adesso": "Maintenant",
    "La condizione non è soddisfatta": "La condition n’est pas remplie",
    "Un altro schedule o timer ha la priorità": "Un autre planning ou minuteur est prioritaire",
    "Fino alle {time}": "Jusqu’à {time}",
    "condizione vera": "condition vraie",
    "Resta": "Reste",
    "poi": "puis",
    "Nessuna fascia in corso adesso.": "Aucune plage en cours actuellement.",
    "Notifica di stato": "Notification d’état",
    "Notifica persistente per tutta la fascia": "Notification persistante pendant toute la plage",
    "In Home Assistant compare una notifica che dice se lo schedule è attivo, in pausa per la condizione o in attesa di un altro controllo; si aggiorna da sola e sparisce a fine fascia.": "Home Assistant affiche une notification indiquant si le planning est actif, en pause à cause de la condition ou en attente d’un autre contrôle ; elle se met à jour seule et disparaît à la fin de la plage.",
    "Tocco sulla notifica": "Appui sur la notification",
    "Apre <strong>{url}</strong> (app Companion e notifiche di Home Assistant).": "Ouvre <strong>{url}</strong> (application Companion et notifications de Home Assistant).",
    "Nessuna pagina impostata: la notifica non apre nulla.": "Aucune page définie : la notification n’ouvre rien.",
    "Apri questa dashboard": "Ouvrir ce tableau de bord",
    "Rimuovi collegamento": "Supprimer le lien",
    "Ricerca entità": "Recherche d’entité",
    "Nome, dominio o ID": "Nom, domaine ou ID",
    "avvio": "démarrage",
    "alle {time}": "à {time}",
    "fascia terminata": "plage terminée",
    "Gli schedule della weekly-schedule-card vengono <strong>aggiunti</strong> in un nuovo profilo, <strong>disattivato</strong>: nulla viene eseguito finché non lo attivi. La weekly-schedule-card e Scheduler non vengono modificati.": "Les plannings de weekly-schedule-card sont <strong>ajoutés</strong> dans un nouveau profil <strong>désactivé</strong> : rien ne s’exécute tant que vous ne l’activez pas. weekly-schedule-card et Scheduler ne sont pas modifiés.",
    "Backup della weekly-schedule-card (.json)": "Sauvegarde de weekly-schedule-card (.json)",
    "Nella weekly-schedule-card: Gruppi → Manutenzione → Salva configurazione.": "Dans weekly-schedule-card : Groupes → Maintenance → Enregistrer la configuration.",
    "Pronto": "Prêt",
    "Da controllare": "À vérifier",
    "Importato disattivato": "Importé désactivé",
    "Non importato": "Non importé",
    "e": "et",
    "o": "ou",
    "isteresi": "hystérésis",
    "alla fine": "à la fin",
    "se": "si",
    "esclusivo": "exclusif",
    "condiviso": "partagé",
    "{count} gruppi": "{count} groupes",
    "era attivo nella weekly-schedule-card": "était actif dans weekly-schedule-card",
    "Salvato il {date}": "Enregistré le {date}",
    "data sconosciuta": "date inconnue",
    "{ready} pronti · {off} disattivati · {skip} non importati": "{ready} prêts · {off} désactivés · {skip} non importés",
    "Questo backup è già stato importato il {date}: importandolo di nuovo gli schedule saranno duplicati.": "Cette sauvegarde a déjà été importée le {date} : l’importer à nouveau dupliquera les plannings.",
    "Entità non presenti in questo Home Assistant: {list}": "Entités absentes de ce Home Assistant : {list}",
    "Prima di attivare il profilo importato spegni gli stessi schedule nella weekly-schedule-card (o in Scheduler): altrimenti i dispositivi ricevono i comandi due volte.": "Avant d’activer le profil importé, désactivez les mêmes plannings dans weekly-schedule-card (ou Scheduler) : sinon les appareils reçoivent les commandes deux fois.",
    "1 attivazione": "1 activation",
    "{count} attivazioni": "{count} activations",
    "mai": "jamais",
    "Attivazioni": "Activations",
    "Fasce bloccate dalla condizione": "Plages bloquées par la condition",
    "Ultima attivazione": "Dernière activation",
    "Ultimo blocco per condizione": "Dernier blocage par condition",
    "Conteggi da quando è installata la versione 0.3.15; una fascia conta una volta sola.": "Comptes depuis l’installation de la version 0.3.15 ; chaque plage compte une seule fois.",
    "Schedule eliminato": "Planning supprimé",
    "notifica": "notification",
    "ripristino dello stato": "restauration de l’état",
    "azione finale": "action de fin",
    "azione a condizione falsa": "action quand la condition est fausse",
    "azione iniziale": "action de début",
    "esito sconosciuto: Home Assistant si è riavviato durante l’invio": "résultat inconnu : Home Assistant a redémarré pendant l’envoi",
    "il servizio ha restituito un errore o non ha risposto ({count} tentativi)": "le service a renvoyé une erreur ou n’a pas répondu ({count} tentatives)",
    "ripristino non riuscito ({count} tentativi)": "échec de la restauration ({count} tentatives)",
    "notifica non inviata ({count} tentativi)": "notification non envoyée ({count} tentatives)",
    "dati del comando non validi": "données de commande non valides",
    "stato iniziale non disponibile": "état initial indisponible",
    "Backup salvato: {profiles} profili, {groups} gruppi, {schedules} schedule.": "Sauvegarde enregistrée : {profiles} profils, {groups} groupes, {schedules} plannings.",
    "Il file non è un backup di Schedule Creator né della weekly-schedule-card.": "Le fichier n’est pas une sauvegarde de Schedule Creator ni de weekly-schedule-card.",
    "Il file non contiene JSON valido.": "Le fichier ne contient pas de JSON valide.",
    "non disponibile/supportata": "indisponible/non prise en charge",
    "Nome": "Nom",
    "Tipo": "Type",
    "Posizione nell’elenco (0 = primo)": "Position dans la liste (0 = premier)",
    "Serve solo a ordinare l’elenco: non cambia priorità né esecuzione.": "Sert uniquement à trier la liste : ne change ni la priorité ni l’exécution.",
    "Nessuna azione": "Aucune action",
    "Nessuna": "Aucune",
    "{count} condizioni": "{count} conditions",
    "Da completare": "À compléter",
    "Inizio": "Début",
    "Fine": "Fin",
    "Suggerisci": "Suggérer",
    "Dispositivi": "Appareils",
    "gruppo": "groupe",
    "Quando": "Quand",
    "All’inizio": "Au début",
    "Azione iniziale": "Action de début",
    "Alla fine": "À la fin",
    "Azione finale": "Action de fin",
    "Condizioni": "Conditions",
    "Se falsa: azione finale se presente, altrimenti ripristino deciso dal motore. La fine fascia senza azione finale non invia comandi.": "Si fausse : action de fin si elle existe, sinon restauration décidée par le moteur. La fin d’une plage sans action de fin n’envoie aucune commande.",
    "Notifiche": "Notifications",
    "Notifica iniziale": "Notification de début",
    "Notifica finale": "Notification de fin",
    "Abilitato": "Activé",
    "Schedule abilitato": "Planning activé",
    "Orari nel fuso {zone}. Se la fine precede l’inizio, la fascia termina il giorno successivo.": "Heures dans le fuseau {zone}. Si la fin précède le début, la plage se termine le lendemain.",
    "Comandi manuali": "Commandes manuelles",
    "Cooperativa": "Coopérative",
    "Priorità al comando manuale": "Priorité à la commande manuelle",
    "Date incluse (AAAA-MM-GG, separate da virgola)": "Dates incluses (AAAA-MM-JJ, séparées par des virgules)",
    "Date escluse (AAAA-MM-GG, separate da virgola)": "Dates exclues (AAAA-MM-JJ, séparées par des virgules)",
    "Statistiche": "Statistiques",
    "Pro · configurazione JSON": "Pro · configuration JSON",
    "Usa JSON per condizioni, fasce e notifiche": "Utiliser du JSON pour les conditions, plages et notifications",
    "Configurazione avanzata": "Configuration avancée",
    "Il ripristino <strong>sostituisce</strong> tutti i profili, gruppi e schedule attuali con quelli del file. I profili ripristinati restano <strong>disattivati</strong>: attivali quando vuoi che eseguano i comandi. Timer e fasce in corso non fanno parte del backup.": "La restauration <strong>remplace</strong> tous les profils, groupes et plannings actuels par ceux du fichier. Les profils restaurés restent <strong>désactivés</strong> : activez-les quand vous voulez qu’ils envoient des commandes. Les minuteurs et plages en cours ne font pas partie de la sauvegarde.",
    "File di backup (.json)": "Fichier de sauvegarde (.json)",
    "Contenuto del file": "Contenu du fichier",
    "{profiles} profili · {groups} gruppi · {schedules} schedule": "{profiles} profils · {groups} groupes · {schedules} plannings",
    "Salvato il {date} con la versione {version}.": "Enregistré le {date} avec la version {version}.",
    "sconosciuta": "inconnue",
    "Entità non presenti in questo Home Assistant: {list}. Gli schedule collegati non potranno comandarle.": "Entités absentes de ce Home Assistant : {list}. Les plannings liés ne pourront pas les commander.",
    "Scegli un file creato con “Salva backup”.": "Choisissez un fichier créé avec « Enregistrer la sauvegarde ».",
    "RESET cancella <strong>tutti</strong> i dati di Schedule Creator: {profiles} profili, {groups} gruppi, {schedules} schedule, {timers} timer attivi, fasce in corso e storico operazioni. L’integrazione resta installata e vuota.": "RESET efface <strong>toutes</strong> les données de Schedule Creator : {profiles} profils, {groups} groupes, {schedules} plannings, {timers} minuteurs actifs, plages en cours et historique des opérations. L’intégration reste installée et vide.",
    "I dispositivi restano nello stato in cui si trovano: nessun comando di spegnimento o ripristino viene inviato. Dispositivi, entità, automazioni e la vecchia weekly-schedule-card non vengono toccati.": "Les appareils restent dans leur état actuel : aucune commande d’extinction ou de restauration n’est envoyée. Appareils, entités, automatisations et l’ancienne weekly-schedule-card ne sont pas modifiés.",
    "Prima di procedere puoi salvare un backup.": "Vous pouvez enregistrer une sauvegarde avant de continuer.",
    "Scrivi RESET per confermare": "Tapez RESET pour confirmer",
    "Durata in secondi (1–604800)": "Durée en secondes (1–604800)",
    "Azione timer": "Action du minuteur",
    "Nuovo profilo": "Nouveau profil",
    "Nuovo gruppo": "Nouveau groupe",
    "Modifica schedule": "Modifier le planning",
    "Nuovo schedule": "Nouveau planning",
    "RESET completo": "RESET complet",
    "Ripristina": "Restaurer",
    "Importa": "Importer",
    "Cancella tutto": "Tout effacer",
    "Salva schedule": "Enregistrer le planning",
    "Salva": "Enregistrer",
    "Eliminare questo elemento?": "Supprimer cet élément ?",
    "I dati sono cambiati su un altro client. Hai verificato le modifiche prima di procedere?": "Les données ont changé sur un autre client. Avez-vous vérifié les modifications avant de continuer ?",
    "lettura del modulo": "lecture du formulaire",
    "validazione del nome": "validation du nom",
    "Inserisci un nome prima di salvare.": "Saisissez un nom avant d’enregistrer.",
    "Scegli prima un file di backup.": "Choisissez d’abord un fichier de sauvegarde.",
    "Scegli prima un backup della weekly-schedule-card con almeno uno schedule importabile.": "Choisissez d’abord une sauvegarde de weekly-schedule-card avec au moins un planning importable.",
    "Scrivi RESET in maiuscolo per confermare la cancellazione.": "Tapez RESET en majuscules pour confirmer la suppression.",
    "preparazione dei dati": "préparation des données",
    "validazione delle entità": "validation des entités",
    "Scegli entità dello stesso tipo appartenenti al gruppo.": "Choisissez des entités d’un même type appartenant au groupe.",
    "lettura delle fasce orarie": "lecture des plages horaires",
    "Ogni fascia richiede almeno un giorno e orari diversi.": "Chaque plage nécessite au moins un jour et des heures différentes.",
    "lettura azione iniziale": "lecture de l’action de début",
    "lettura azione finale": "lecture de l’action de fin",
    "lettura condizioni e notifiche": "lecture des conditions et notifications",
    "Configurazione Pro": "Configuration Pro",
    "Campi Pro non validi.": "Champs Pro non valides.",
    "Inserisci il messaggio della notifica oppure disabilitala.": "Saisissez le message de la notification ou désactivez-la.",
    "Servono due regole per E/O.": "ET/OU nécessite deux règles.",
    "Seleziona un’entità valida nella condizione.": "Sélectionnez une entité valide dans la condition.",
    "Completa il valore della condizione.": "Complétez la valeur de la condition.",
    "La durata deve essere tra 1 e 604800 secondi.": "La durée doit être comprise entre 1 et 604800 secondes.",
    "Editor non disponibile.": "Éditeur indisponible.",
    "confronto con la configurazione esistente": "comparaison avec la configuration existante",
    "I dati sono cambiati su un altro client. Hai confrontato la bozza con i nuovi dati prima di salvare?": "Les données ont changé sur un autre client. Avez-vous comparé le brouillon aux nouvelles données avant d’enregistrer ?",
    "salvataggio e aggiornamento della vista": "enregistrement et actualisation de la vue",
    "Importato in {names}. Il profilo è disattivato: spegni gli schedule nella weekly-schedule-card prima di attivarlo.": "Importé dans {names}. Le profil est désactivé : désactivez les plannings dans weekly-schedule-card avant de l’activer.",
    "RESET completato: Schedule Creator è vuoto.": "RESET terminé : Schedule Creator est vide.",
    "Backup ripristinato. I profili sono disattivati: attivali per eseguire gli schedule.": "Sauvegarde restaurée. Les profils sont désactivés : activez-les pour exécuter les plannings.",
    "Titolo della card": "Titre de la carte",
    "Fascia a cavallo della mezzanotte: modifica gli orari nei campi qui sotto.": "Plage à cheval sur minuit : modifiez les heures dans les champs ci-dessous.",
    "Trascina la fascia o le maniglie: si aggancia agli inizi/fini degli altri schedule (magnete).": "Faites glisser la plage ou ses poignées : elle s’aimante aux débuts/fins des autres plannings.",
    "Trascina la fascia o le maniglie per cambiare gli orari.": "Faites glisser la plage ou ses poignées pour changer les heures.",
    "Passo di aggancio": "Pas d’aimantation",
    "Passo": "Pas",
    "Tutti": "Tous",
    "Feriali": "Semaine",
    "Altra fascia di questo schedule": "Autre plage de ce planning",
    "Fascia {n}": "Plage {n}",
    "Rimuovi fascia": "Supprimer la plage",
    "Fascia successiva": "Plage suivante",
    "riferimento": "référence",
    "minuti prima (−) o dopo (+)": "minutes avant (−) ou après (+)",
    "min · ≈ {time} oggi": "min · ≈ {time} aujourd’hui",
    "1 · Entità da controllare": "1 · Entité à surveiller",
    "Rimuovi condizione": "Supprimer la condition",
    "Scegli un’entità: poi vedrai solo i confronti possibili (acceso/spento, maggiore/minore…).": "Choisissez une entité : vous ne verrez ensuite que les comparaisons possibles (allumé/éteint, supérieur/inférieur…).",
    "tra": "entre",
    "disponibile": "disponible",
    "Da": "De",
    "A": "À",
    "3 · Valore": "3 · Valeur",
    "Isteresi": "Hystérésis",
    "Margine anti-oscillazione: una volta vera, la condizione torna falsa solo oltre la soglia ± isteresi.": "Marge anti-oscillation : une fois vraie, la condition ne redevient fausse qu’au-delà du seuil ± hystérésis.",
    "2 · Confronto": "2 · Comparaison",
    "è": "est",
    "non è": "n’est pas",
    "Diventa vera dopo": "Devient vraie après",
    "Torna falsa dopo": "Redevient fausse après",
    "Evita avanti e indietro: la condizione cambia solo se resta vera (o falsa) per questo tempo. Esempio tende: chiudi dopo 10 min sopra 500 lx, riapri dopo 15 min sotto.": "Évite les allers-retours : la condition ne change que si elle reste vraie (ou fausse) pendant ce temps. Exemple de stores : fermer après 10 min au-dessus de 500 lx, rouvrir après 15 min en dessous.",
    "Nessuna condizione: lo schedule esegue sempre nelle sue fasce.": "Aucune condition : le planning s’exécute toujours dans ses plages.",
    "Condizione": "Condition",
    "Altra condizione": "Autre condition",
    "Quando vale lo schedule": "Quand le planning s’applique",
    "Tutte le condizioni": "Toutes les conditions",
    "Almeno una": "Au moins une",
    "Icona": "Icône",
    "Automatico": "Automatique",
    "Altro colore": "Autre couleur",
    "fino alle {time}": "jusqu’à {time}",
    "In pausa · condizione": "En pause · condition",
    "Prossima {time}": "Prochaine {time}",
    "Dalle {time}": "Dès {time}",
    "Non disponibile": "Indisponible",
    "Profili attivi": "Profils actifs",
    "Nessun profilo attivo": "Aucun profil actif",
    "Oggi": "Aujourd’hui",
    "Giorno": "Jour",
    "Nessuna entità programmata nei profili attivi.": "Aucune entité programmée dans les profils actifs.",
    "in corso": "en cours",
    "in pausa": "en pause",
    "profilo {name}": "profil {name}",
    "ora": "maintenant",
    "La settimana": "La semaine",
    "Lun → · Mar ← · la mezzanotte è nella curva": "Lun → · Mar ← · minuit est dans le virage",
    "Settimana a serpentina": "Semaine en serpentin",
    "La settimana ad anello": "La semaine en anneau",
    "Ogni anello è un dispositivo · lo spazio tra i settori è la mezzanotte": "Chaque anneau est un appareil · l’espace entre les secteurs est minuit",
    "Nessuna attività in corso": "Aucune activité en cours",
    "Prossima: {name}": "Prochaine : {name}",
    "Settimana ad anello": "Semaine en anneau",
    "Solo temperatura: la modalità resta quella del dispositivo.": "Température uniquement : l’appareil garde son mode.",
    "Più comandi nella fascia: importato solo “{service}”.": "Plusieurs commandes dans la plage : seul « {service} » a été importé.",
    "Condizione incompleta ignorata.": "Condition incomplète ignorée.",
    "Condizione sull’attributo “{attribute}” di {entity}: non supportata.": "Condition sur l’attribut « {attribute} » de {entity} : non prise en charge.",
    "Valore non numerico “{value}” per {entity}.": "Valeur non numérique « {value} » pour {entity}.",
    "La condizione di Scheduler era valutata solo all’inizio: ora vale per tutta la fascia.": "La condition de Scheduler n’était évaluée qu’au début : elle vaut désormais pour toute la plage.",
    "Il file non è un backup della weekly-schedule-card.": "Le fichier n’est pas une sauvegarde de weekly-schedule-card.",
    "Profilo WSC": "Profil WSC",
    "Altri dispositivi": "Autres appareils",
    "Configurazione mancante nel backup.": "Configuration absente de la sauvegarde.",
    "Schedule una tantum: non importato.": "Planning ponctuel : non importé.",
    "Giorni non riconosciuti.": "Jours non reconnus.",
    "“Giorni lavorativi” importati come lunedì–venerdì.": "« Jours ouvrés » importés comme lundi–vendredi.",
    "Periodo {from} → {to} non supportato: vale tutto l’anno.": "Période {from} → {to} non prise en charge : valable toute l’année.",
    "Fine gestita da uno schedule figlio della vecchia versione: controlla l’azione finale.": "Fin gérée par un planning enfant de l’ancienne version : vérifiez l’action de fin.",
    "Orario “{time}” non supportato.": "Heure « {time} » non prise en charge.",
    "Azione puntuale: diventa una fascia di un minuto.": "Action ponctuelle : elle devient une plage d’une minute.",
    "Fascia di durata zero ignorata.": "Plage de durée nulle ignorée.",
    "Fascia con più dispositivi: ignorata.": "Plage avec plusieurs appareils : ignorée.",
    "Comando non riconosciuto per {entity}.": "Commande non reconnue pour {entity}.",
    "Fasce con azioni diverse: importata solo la prima azione.": "Plages avec des actions différentes : seule la première action a été importée.",
    "Nessuna fascia importabile.": "Aucune plage importable.",
    "Era disattivato nella weekly-schedule-card: resta disattivato.": "Il était désactivé dans weekly-schedule-card : il reste désactivé.",
    "Importato disattivato: completa la condizione e riattivalo.": "Importé désactivé : complétez la condition et réactivez-le.",
    "Quando la condizione è falsa viene eseguita l’azione finale.": "Quand la condition est fausse, l’action de fin est exécutée.",
    "Lun": "Lun",
    "Mar": "Mar",
    "Mer": "Mer",
    "Gio": "Jeu",
    "Ven": "Ven",
    "Sab": "Sam",
    "Dom": "Dim",
    "Lunedì": "Lundi",
    "Martedì": "Mardi",
    "Mercoledì": "Mercredi",
    "Giovedì": "Jeudi",
    "Venerdì": "Vendredi",
    "Sabato": "Samedi",
    "Domenica": "Dimanche",
    "LUN": "LUN",
    "MAR": "MAR",
    "MER": "MER",
    "GIO": "JEU",
    "VEN": "VEN",
    "SAB": "SAM",
    "DOM": "DIM",
    "Alba": "Lever du soleil",
    "Tramonto": "Coucher du soleil",
    "Spento": "Éteint",
    "Acceso": "Allumé",
    "Auto": "Auto",
    "Caldo/Freddo": "Chaud/Froid",
    "Freddo": "Froid",
    "Caldo": "Chaud",
    "Deumidifica": "Déshumidifier",
    "Acceso / Sì": "Allumé / Oui",
    "Spento / No": "Éteint / Non",
    "A casa": "À la maison",
    "Fuori casa": "Absent",
    "Subito": "Immédiatement",
    "Casa": "Maison",
    "Soggiorno": "Séjour",
    "Camera": "Chambre",
    "Cucina": "Cuisine",
    "Bagno": "Salle de bain",
    "Studio": "Bureau",
    "Garage": "Garage",
    "Giardino": "Jardin",
    "Scale": "Escaliers",
    "Luci": "Lumières",
    "Plafoniera": "Plafonnier",
    "Striscia LED": "Ruban LED",
    "Termostato": "Thermostat",
    "Clima": "Climatisation",
    "Termosifone": "Radiateur",
    "Tapparelle": "Volets",
    "Tende": "Stores",
    "Presa": "Prise",
    "Boiler": "Chauffe-eau",
    "Lavatrice": "Lave-linge",
    "TV": "TV",
    "Robot": "Robot",
    "Irrigazione": "Arrosage",
    "Notte": "Nuit",
    "Lavoro": "Travail",
    "Vacanza": "Vacances",
    "Inverno": "Hiver",
    "Programma": "Programme",
  },
  de: {
    "Diminuisci": "Verringern",
    "Aumenta": "Erhöhen",
    "Aperta": "Offen",
    "Chiusa": "Geschlossen",
    "In apertura": "Öffnet",
    "In chiusura": "Schließt",
    "Seleziona prima un’entità.": "Wähle zuerst eine Entität.",
    "Modalità HVAC": "HVAC-Modus",
    "Comando": "Befehl",
    "Stato": "Zustand",
    "Temperatura": "Temperatur",
    "Minima": "Minimum",
    "Massima": "Maximum",
    "Ventola": "Lüfter",
    "Swing orizzontale": "Horizontale Schwenkung",
    "Luminosità": "Helligkeit",
    "Non cambiare colore": "Farbe nicht ändern",
    "Colore": "Farbe",
    "Temperatura colore": "Farbtemperatur",
    "Velocità": "Geschwindigkeit",
    "Posizione": "Position",
    "Stato attuale": "Aktueller Zustand",
    "Azione personalizzata conservata in modalità Pro.": "Benutzerdefinierte Aktion im Pro-Modus beibehalten.",
    "Altre opzioni": "Weitere Optionen",
    "Pro · azione personalizzata": "Pro · benutzerdefinierte Aktion",
    "Usa JSON al posto dei controlli": "JSON statt der Bedienelemente verwenden",
    "Azione JSON": "JSON-Aktion",
    "Azione Pro non valida per le entità selezionate.": "Ungültige Pro-Aktion für die gewählten Entitäten.",
    "Il target è già definito dalle entità selezionate.": "Das Ziel ist bereits durch die gewählten Entitäten festgelegt.",
    "apply_state richiede il campo \"state\".": "apply_state benötigt das Feld \"state\".",
    "Scegli cosa deve fare il dispositivo.": "Wähle, was das Gerät tun soll.",
    "Comando non disponibile per questo dispositivo.": "Befehl für dieses Gerät nicht verfügbar.",
    "Indica la posizione richiesta.": "Gib die gewünschte Position an.",
    "Inserisci un valore numerico valido.": "Gib eine gültige Zahl ein.",
    "Stato precedente": "Vorheriger Zustand",
    "ventola {mode}": "Lüfter {mode}",
    "Accendi": "Einschalten",
    "Spegni": "Ausschalten",
    "Apri": "Öffnen",
    "Chiudi": "Schließen",
    "Ferma": "Stoppen",
    "Posizione {value}%": "Position {value} %",
    "Velocità {value}%": "Geschwindigkeit {value} %",
    "Home Assistant ha confermato il salvataggio, ma la card non è riuscita ad aggiornare la vista. Ricarica la dashboard prima di riprovare.": "Home Assistant hat das Speichern bestätigt, aber die Karte konnte die Ansicht nicht aktualisieren. Lade das Dashboard neu, bevor du es erneut versuchst.",
    "Home Assistant ha rifiutato {operation} ({code}). Aggiorna l’integrazione Schedule Creator, riavvia completamente Home Assistant e riprova. Se persiste, comunica questo comando e controlla i log dell’integrazione.": "Home Assistant hat {operation} abgelehnt ({code}). Aktualisiere die Integration Schedule Creator, starte Home Assistant komplett neu und versuche es erneut. Falls es bleibt, melde diesen Befehl und prüfe die Protokolle der Integration.",
    "Salvataggio non riuscito: una funzione ha restituito “Method not implemented”. La bozza è conservata. Apri “Dettagli errore” e invia il testo per individuare il passaggio che fallisce.": "Speichern fehlgeschlagen: Eine Funktion hat „Method not implemented“ zurückgegeben. Der Entwurf bleibt erhalten. Öffne „Fehlerdetails“ und sende den Text, um den fehlerhaften Schritt zu finden.",
    "Configurazione cambiata su un altro client. La bozza è conservata: confrontala e salva di nuovo.": "Die Konfiguration wurde auf einem anderen Client geändert. Der Entwurf bleibt erhalten: vergleiche ihn und speichere erneut.",
    "Serve un account amministratore per modificare.": "Zum Bearbeiten ist ein Administratorkonto nötig.",
    "Dati non validi: controlla entità, fasce e parametri delle azioni.": "Ungültige Daten: prüfe Entitäten, Zeitfenster und Aktionsparameter.",
    "Formato non valido: controlla i campi richiesti.": "Ungültiges Format: prüfe die Pflichtfelder.",
    "Profilo, gruppo o schedule non trovato. Aggiorna la vista.": "Profil, Gruppe oder Zeitplan nicht gefunden. Aktualisiere die Ansicht.",
    "Il gruppo non appartiene al profilo scelto.": "Die Gruppe gehört nicht zum gewählten Profil.",
    "Profilo in uso: rimuovi prima i gruppi e gli schedule collegati.": "Profil in Verwendung: entferne zuerst seine Gruppen und Zeitpläne.",
    "Gruppo in uso: rimuovi prima gli schedule collegati.": "Gruppe in Verwendung: entferne zuerst ihre Zeitpläne.",
    "Il timer non è più attivo.": "Der Timer ist nicht mehr aktiv.",
    "Integrazione non caricata: controlla Dispositivi e servizi.": "Integration nicht geladen: prüfe Geräte & Dienste.",
    "Archivio non disponibile: controlla i log di Home Assistant.": "Speicher nicht verfügbar: prüfe die Protokolle von Home Assistant.",
    "Operazione {operation} non riuscita ({code}). Controlla i log di Home Assistant.": "Vorgang {operation} fehlgeschlagen ({code}). Prüfe die Protokolle von Home Assistant.",
    "errore sconosciuto": "unbekannter Fehler",
    "Operazione non riuscita. Controlla i log di Home Assistant.": "Vorgang fehlgeschlagen. Prüfe die Protokolle von Home Assistant.",
    "non disponibile": "nicht verfügbar",
    "Fase": "Phase",
    "Operazione": "Vorgang",
    "Conferma del server": "Serverbestätigung",
    "ricevuta": "erhalten",
    "non ricevuta": "nicht erhalten",
    "Codice": "Code",
    "Errore": "Fehler",
    "Traccia": "Ablauf",
    "JSON non valido.": "ungültiges JSON.",
    "Abilita notifica": "Benachrichtigung aktivieren",
    "Destinazione": "Ziel",
    "Notifica in Home Assistant": "Benachrichtigung in Home Assistant",
    "Titolo": "Titel",
    "Messaggio": "Nachricht",
    "1 ora": "1 Stunde",
    "{count} ore": "{count} Stunden",
    "{count} minuti": "{count} Minuten",
    "Avvia": "Starten",
    "{action} fino alle {time}": "{action} bis {time}",
    "{action} per {duration}": "{action} für {duration}",
    "Caricamento…": "Wird geladen…",
    "Scegli l’entità": "Entität wählen",
    "Cerca per nome o ID": "Nach Name oder ID suchen",
    "Alla scadenza torna a": "Danach zurück zu",
    "lo stato precedente": "dem vorherigen Zustand",
    "Annulla": "Abbrechen",
    "Nessun timer attivo. Serve un amministratore per avviarne uno.": "Kein aktiver Timer. Zum Starten ist ein Administrator nötig.",
    "Durante il timer": "Während des Timers",
    "Azione": "Aktion",
    "Per quanto": "Wie lange",
    "Durata": "Dauer",
    "Fino alle": "Bis",
    "Durata in minuti": "Dauer in Minuten",
    "Minuti": "Minuten",
    "Cambia": "Ändern",
    "Entità non disponibile.": "Entität nicht verfügbar.",
    "Scegli una durata tra 1 minuto e 7 giorni.": "Wähle eine Dauer zwischen 1 Minute und 7 Tagen.",
    "Entità": "Entität",
    "Scegli nella card": "In der Karte wählen",
    "Durate rapide (minuti, separate da virgola)": "Schnelle Dauern (Minuten, durch Komma getrennt)",
    "Tutti i giorni": "Jeden Tag",
    "Lun–Ven": "Mo–Fr",
    "Weekend": "Wochenende",
    "La card v{card} è aggiornata, ma Home Assistant esegue ancora l’integrazione {backend}. Riavvia Home Assistant (Impostazioni → Sistema → Riavvia) per attivare il nuovo backend.": "Die Karte v{card} ist aktuell, aber Home Assistant führt noch die Integration {backend} aus. Starte Home Assistant neu (Einstellungen → System → Neu starten), um das neue Backend zu aktivieren.",
    "precedente": "einer älteren Version",
    "L’integrazione v{backend} è attiva, ma questa pagina usa ancora la card v{card}. Ricarica la pagina; nell’app mobile usa “Ricarica” o svuota la cache del frontend.": "Die Integration v{backend} ist aktiv, aber diese Seite nutzt noch die Karte v{card}. Lade die Seite neu; in der mobilen App „Neu laden“ verwenden oder den Frontend-Cache leeren.",
    "Uno schedule controlla entità dello stesso tipo. Crea uno schedule separato per gli altri dispositivi.": "Ein Zeitplan steuert Entitäten eines Typs. Lege für die anderen Geräte einen eigenen Zeitplan an.",
    "Tipo di dispositivo cambiato: scegli nuovamente le azioni.": "Gerätetyp geändert: wähle die Aktionen erneut.",
    "Orario": "Uhrzeit",
    "oggi": "heute",
    "Clicca uno spazio libero per aggiungere uno schedule": "Klicke auf eine freie Stelle, um einen Zeitplan hinzuzufügen",
    "Disabilitato": "Deaktiviert",
    "Ora": "Jetzt",
    "Clima: freddo → caldo": "Klima: kalt → warm",
    "In corso": "Läuft",
    "In pausa": "Pausiert",
    "Un comando non è riuscito nelle ultime 24 ore: dettagli in “Attività”.": "Ein Befehl ist in den letzten 24 Stunden fehlgeschlagen: Details unter „Aktivität“.",
    "{count} comandi non sono riusciti nelle ultime 24 ore: dettagli in “Attività”.": "{count} Befehle sind in den letzten 24 Stunden fehlgeschlagen: Details unter „Aktivität“.",
    "Profilo attivo": "Aktives Profil",
    "Profilo inattivo": "Inaktives Profil",
    "Esclusivo": "Exklusiv",
    "Condiviso": "Gemeinsam",
    "Crea un profilo per iniziare": "Lege ein Profil an, um zu beginnen",
    "{count} timer attivi": "{count} aktive Timer",
    "Settimana": "Woche",
    "Gruppi": "Gruppen",
    "Programmazione settimanale": "Wochenplan",
    "Gestisci schedule ({count})": "Zeitpläne verwalten ({count})",
    "disabilitato": "deaktiviert",
    "1 fascia": "1 Zeitfenster",
    "{count} fasce": "{count} Zeitfenster",
    "Modifica": "Bearbeiten",
    "Elimina": "Löschen",
    "Inizia dal tuo primo profilo": "Beginne mit deinem ersten Profil",
    "Aggiungi un gruppo di dispositivi": "Füge eine Gerätegruppe hinzu",
    "La settimana è ancora libera": "Die Woche ist noch frei",
    "Organizza la casa per abitudini, ambienti o stagioni.": "Organisiere das Zuhause nach Gewohnheiten, Räumen oder Jahreszeiten.",
    "Riunisci i dispositivi che vuoi programmare.": "Fasse die Geräte zusammen, die du planen möchtest.",
    "Tocca qui o su un orario del calendario per creare uno schedule.": "Tippe hier oder auf eine Uhrzeit im Kalender, um einen Zeitplan anzulegen.",
    "Gestisci profili e gruppi": "Profile und Gruppen verwalten",
    "Profilo": "Profil",
    "Modifica profilo": "Profil bearbeiten",
    "Disattiva profilo": "Profil deaktivieren",
    "Attiva profilo": "Profil aktivieren",
    "Elimina profilo": "Profil löschen",
    "Gruppo": "Gruppe",
    "Modifica gruppo": "Gruppe bearbeiten",
    "Elimina gruppo": "Gruppe löschen",
    "Vista in sola lettura: serve un amministratore per modificare.": "Nur-Lese-Ansicht: zum Bearbeiten ist ein Administrator nötig.",
    "Manutenzione · backup, import e RESET": "Wartung · Sicherung, Import und RESET",
    "Il backup salva profili, gruppi e schedule in un file JSON. Il ripristino li sostituisce e lascia i profili disattivati. L’import dalla weekly-schedule-card li aggiunge in un nuovo profilo disattivato. RESET cancella tutti i dati di Schedule Creator.": "Die Sicherung speichert Profile, Gruppen und Zeitpläne in einer JSON-Datei. Die Wiederherstellung ersetzt sie und lässt die Profile inaktiv. Der Import aus weekly-schedule-card fügt sie in einem neuen inaktiven Profil hinzu. RESET löscht alle Daten von Schedule Creator.",
    "Salva backup": "Sicherung speichern",
    "Ripristina backup": "Sicherung wiederherstellen",
    "Importa da Weekly Schedule Card": "Aus Weekly Schedule Card importieren",
    "Attività · {slots} fasce in corso · {timers} timer": "Aktivität · {slots} laufende Zeitfenster · {timers} Timer",
    "{count} errori": "{count} Fehler",
    "Comandi non riusciti": "Fehlgeschlagene Befehle",
    "condizione": "Bedingung",
    "termine": "Ende",
    "Nessuna fascia attiva.": "Kein aktives Zeitfenster.",
    "Timer": "Timer",
    "Annulla timer": "Timer abbrechen",
    "Dettagli errore": "Fehlerdetails",
    "Seleziona e copia questo testo per segnalare il problema.": "Markiere und kopiere diesen Text, um das Problem zu melden.",
    "Dettagli errore da copiare": "Fehlerdetails zum Kopieren",
    "1 fascia in corso": "1 Zeitfenster läuft",
    "{count} fasce in corso": "{count} Zeitfenster laufen",
    "nessuna fascia in corso": "kein Zeitfenster läuft",
    "Schedule": "Zeitplan",
    "Profili": "Profile",
    "Chiudi editor": "Editor schließen",
    "Più profili attivi ora: vince la fascia iniziata per ultima.": "Mehrere Profile gerade aktiv: das zuletzt gestartete Zeitfenster gewinnt.",
    "Possono essere attivi insieme: se le fasce si sovrappongono vince quella iniziata per ultima.": "Sie können gleichzeitig aktiv sein: überlappen sich Zeitfenster, gewinnt das zuletzt gestartete.",
    "Profili esclusivi: mai attivi insieme, nessun conflitto.": "Exklusive Profile: nie gleichzeitig aktiv, kein Konflikt.",
    "Attivo": "Aktiv",
    "Inattivo": "Inaktiv",
    "{groups} gruppi · {schedules} schedule · {entities} entità": "{groups} Gruppen · {schedules} Zeitpläne · {entities} Entitäten",
    "Panoramica profili e interazioni": "Überblick über Profile und Wechselwirkungen",
    "<strong>Esclusivo</strong>: attivandolo si disattivano gli altri profili esclusivi. <strong>Condiviso</strong>: resta attivo insieme agli altri. Solo i profili attivi eseguono i loro schedule. Se due fasce comandano la stessa entità vince quella iniziata per ultima; a parità un Quick Timer prevale su uno schedule con condizione, che prevale su uno normale. L’ordine serve solo a disporre profili e gruppi.": "<strong>Exklusiv</strong>: beim Aktivieren werden die anderen exklusiven Profile deaktiviert. <strong>Gemeinsam</strong>: bleibt zusammen mit den anderen aktiv. Nur aktive Profile führen ihre Zeitpläne aus. Steuern zwei Zeitfenster dieselbe Entität, gewinnt das zuletzt gestartete; bei Gleichstand gewinnt ein Quick Timer vor einem Zeitplan mit Bedingung, dieser vor einem normalen. Die Reihenfolge dient nur der Anordnung von Profilen und Gruppen.",
    "Entità comandate da più profili": "Entitäten, die von mehreren Profilen gesteuert werden",
    "Nessuna: ogni entità è programmata da un solo profilo.": "Keine: jede Entität wird von nur einem Profil geplant.",
    "In attesa": "Wartet",
    "Adesso": "Jetzt",
    "La condizione non è soddisfatta": "Die Bedingung ist nicht erfüllt",
    "Un altro schedule o timer ha la priorità": "Ein anderer Zeitplan oder Timer hat Vorrang",
    "Fino alle {time}": "Bis {time}",
    "condizione vera": "Bedingung erfüllt",
    "Resta": "Noch",
    "poi": "danach",
    "Nessuna fascia in corso adesso.": "Gerade läuft kein Zeitfenster.",
    "Notifica di stato": "Statusbenachrichtigung",
    "Notifica persistente per tutta la fascia": "Dauerhafte Benachrichtigung für das ganze Zeitfenster",
    "In Home Assistant compare una notifica che dice se lo schedule è attivo, in pausa per la condizione o in attesa di un altro controllo; si aggiorna da sola e sparisce a fine fascia.": "In Home Assistant erscheint eine Benachrichtigung, ob der Zeitplan aktiv, durch die Bedingung pausiert oder auf eine andere Steuerung wartend ist; sie aktualisiert sich selbst und verschwindet am Ende des Zeitfensters.",
    "Tocco sulla notifica": "Tippen auf die Benachrichtigung",
    "Apre <strong>{url}</strong> (app Companion e notifiche di Home Assistant).": "Öffnet <strong>{url}</strong> (Companion-App und Home-Assistant-Benachrichtigungen).",
    "Nessuna pagina impostata: la notifica non apre nulla.": "Keine Seite festgelegt: die Benachrichtigung öffnet nichts.",
    "Apri questa dashboard": "Dieses Dashboard öffnen",
    "Rimuovi collegamento": "Link entfernen",
    "Ricerca entità": "Entitätssuche",
    "Nome, dominio o ID": "Name, Domäne oder ID",
    "avvio": "Start",
    "alle {time}": "um {time}",
    "fascia terminata": "Zeitfenster beendet",
    "Gli schedule della weekly-schedule-card vengono <strong>aggiunti</strong> in un nuovo profilo, <strong>disattivato</strong>: nulla viene eseguito finché non lo attivi. La weekly-schedule-card e Scheduler non vengono modificati.": "Die Zeitpläne der weekly-schedule-card werden in einem neuen, <strong>inaktiven</strong> Profil <strong>hinzugefügt</strong>: nichts läuft, bis du es aktivierst. weekly-schedule-card und Scheduler werden nicht verändert.",
    "Backup della weekly-schedule-card (.json)": "Sicherung der weekly-schedule-card (.json)",
    "Nella weekly-schedule-card: Gruppi → Manutenzione → Salva configurazione.": "In der weekly-schedule-card: Gruppen → Wartung → Konfiguration speichern.",
    "Pronto": "Bereit",
    "Da controllare": "Zu prüfen",
    "Importato disattivato": "Deaktiviert importiert",
    "Non importato": "Nicht importiert",
    "e": "und",
    "o": "oder",
    "isteresi": "Hysterese",
    "alla fine": "am Ende",
    "se": "wenn",
    "esclusivo": "exklusiv",
    "condiviso": "gemeinsam",
    "{count} gruppi": "{count} Gruppen",
    "era attivo nella weekly-schedule-card": "war in der weekly-schedule-card aktiv",
    "Salvato il {date}": "Gespeichert am {date}",
    "data sconosciuta": "unbekanntes Datum",
    "{ready} pronti · {off} disattivati · {skip} non importati": "{ready} bereit · {off} deaktiviert · {skip} nicht importiert",
    "Questo backup è già stato importato il {date}: importandolo di nuovo gli schedule saranno duplicati.": "Diese Sicherung wurde bereits am {date} importiert: ein erneuter Import verdoppelt die Zeitpläne.",
    "Entità non presenti in questo Home Assistant: {list}": "In diesem Home Assistant fehlende Entitäten: {list}",
    "Prima di attivare il profilo importato spegni gli stessi schedule nella weekly-schedule-card (o in Scheduler): altrimenti i dispositivi ricevono i comandi due volte.": "Bevor du das importierte Profil aktivierst, schalte dieselben Zeitpläne in der weekly-schedule-card (oder in Scheduler) aus: sonst erhalten die Geräte die Befehle doppelt.",
    "1 attivazione": "1 Aktivierung",
    "{count} attivazioni": "{count} Aktivierungen",
    "mai": "nie",
    "Attivazioni": "Aktivierungen",
    "Fasce bloccate dalla condizione": "Durch die Bedingung blockierte Zeitfenster",
    "Ultima attivazione": "Letzte Aktivierung",
    "Ultimo blocco per condizione": "Zuletzt durch Bedingung blockiert",
    "Conteggi da quando è installata la versione 0.3.15; una fascia conta una volta sola.": "Gezählt seit Installation von Version 0.3.15; jedes Zeitfenster zählt einmal.",
    "Schedule eliminato": "Gelöschter Zeitplan",
    "notifica": "Benachrichtigung",
    "ripristino dello stato": "Wiederherstellung des Zustands",
    "azione finale": "Endaktion",
    "azione a condizione falsa": "Aktion bei nicht erfüllter Bedingung",
    "azione iniziale": "Startaktion",
    "esito sconosciuto: Home Assistant si è riavviato durante l’invio": "Ergebnis unbekannt: Home Assistant wurde während des Sendens neu gestartet",
    "il servizio ha restituito un errore o non ha risposto ({count} tentativi)": "der Dienst hat einen Fehler gemeldet oder nicht geantwortet ({count} Versuche)",
    "ripristino non riuscito ({count} tentativi)": "Wiederherstellung fehlgeschlagen ({count} Versuche)",
    "notifica non inviata ({count} tentativi)": "Benachrichtigung nicht gesendet ({count} Versuche)",
    "dati del comando non validi": "ungültige Befehlsdaten",
    "stato iniziale non disponibile": "Anfangszustand nicht verfügbar",
    "Backup salvato: {profiles} profili, {groups} gruppi, {schedules} schedule.": "Sicherung gespeichert: {profiles} Profile, {groups} Gruppen, {schedules} Zeitpläne.",
    "Il file non è un backup di Schedule Creator né della weekly-schedule-card.": "Die Datei ist weder eine Sicherung von Schedule Creator noch der weekly-schedule-card.",
    "Il file non contiene JSON valido.": "Die Datei enthält kein gültiges JSON.",
    "non disponibile/supportata": "nicht verfügbar/nicht unterstützt",
    "Nome": "Name",
    "Tipo": "Typ",
    "Posizione nell’elenco (0 = primo)": "Position in der Liste (0 = erste)",
    "Serve solo a ordinare l’elenco: non cambia priorità né esecuzione.": "Dient nur zum Sortieren der Liste: ändert weder Priorität noch Ausführung.",
    "Nessuna azione": "Keine Aktion",
    "Nessuna": "Keine",
    "{count} condizioni": "{count} Bedingungen",
    "Da completare": "Zu vervollständigen",
    "Inizio": "Beginn",
    "Fine": "Ende",
    "Suggerisci": "Vorschlagen",
    "Dispositivi": "Geräte",
    "gruppo": "Gruppe",
    "Quando": "Wann",
    "All’inizio": "Zu Beginn",
    "Azione iniziale": "Startaktion",
    "Alla fine": "Am Ende",
    "Azione finale": "Endaktion",
    "Condizioni": "Bedingungen",
    "Se falsa: azione finale se presente, altrimenti ripristino deciso dal motore. La fine fascia senza azione finale non invia comandi.": "Wenn nicht erfüllt: Endaktion, falls vorhanden, sonst eine vom System entschiedene Wiederherstellung. Das Ende eines Zeitfensters ohne Endaktion sendet keinen Befehl.",
    "Notifiche": "Benachrichtigungen",
    "Notifica iniziale": "Startbenachrichtigung",
    "Notifica finale": "Endbenachrichtigung",
    "Abilitato": "Aktiviert",
    "Schedule abilitato": "Zeitplan aktiviert",
    "Orari nel fuso {zone}. Se la fine precede l’inizio, la fascia termina il giorno successivo.": "Zeiten in der Zeitzone {zone}. Liegt das Ende vor dem Beginn, endet das Zeitfenster am Folgetag.",
    "Comandi manuali": "Manuelle Befehle",
    "Cooperativa": "Kooperativ",
    "Priorità al comando manuale": "Manueller Befehl hat Vorrang",
    "Date incluse (AAAA-MM-GG, separate da virgola)": "Eingeschlossene Daten (JJJJ-MM-TT, durch Komma getrennt)",
    "Date escluse (AAAA-MM-GG, separate da virgola)": "Ausgeschlossene Daten (JJJJ-MM-TT, durch Komma getrennt)",
    "Statistiche": "Statistik",
    "Pro · configurazione JSON": "Pro · JSON-Konfiguration",
    "Usa JSON per condizioni, fasce e notifiche": "JSON für Bedingungen, Zeitfenster und Benachrichtigungen verwenden",
    "Configurazione avanzata": "Erweiterte Konfiguration",
    "Il ripristino <strong>sostituisce</strong> tutti i profili, gruppi e schedule attuali con quelli del file. I profili ripristinati restano <strong>disattivati</strong>: attivali quando vuoi che eseguano i comandi. Timer e fasce in corso non fanno parte del backup.": "Die Wiederherstellung <strong>ersetzt</strong> alle aktuellen Profile, Gruppen und Zeitpläne durch die aus der Datei. Wiederhergestellte Profile bleiben <strong>inaktiv</strong>: aktiviere sie, wenn sie Befehle senden sollen. Timer und laufende Zeitfenster sind nicht Teil der Sicherung.",
    "File di backup (.json)": "Sicherungsdatei (.json)",
    "Contenuto del file": "Dateiinhalt",
    "{profiles} profili · {groups} gruppi · {schedules} schedule": "{profiles} Profile · {groups} Gruppen · {schedules} Zeitpläne",
    "Salvato il {date} con la versione {version}.": "Gespeichert am {date} mit Version {version}.",
    "sconosciuta": "unbekannt",
    "Entità non presenti in questo Home Assistant: {list}. Gli schedule collegati non potranno comandarle.": "In diesem Home Assistant fehlende Entitäten: {list}. Die zugehörigen Zeitpläne können sie nicht steuern.",
    "Scegli un file creato con “Salva backup”.": "Wähle eine mit „Sicherung speichern“ erstellte Datei.",
    "RESET cancella <strong>tutti</strong> i dati di Schedule Creator: {profiles} profili, {groups} gruppi, {schedules} schedule, {timers} timer attivi, fasce in corso e storico operazioni. L’integrazione resta installata e vuota.": "RESET löscht <strong>alle</strong> Daten von Schedule Creator: {profiles} Profile, {groups} Gruppen, {schedules} Zeitpläne, {timers} aktive Timer, laufende Zeitfenster und den Verlauf. Die Integration bleibt installiert und leer.",
    "I dispositivi restano nello stato in cui si trovano: nessun comando di spegnimento o ripristino viene inviato. Dispositivi, entità, automazioni e la vecchia weekly-schedule-card non vengono toccati.": "Die Geräte bleiben in ihrem aktuellen Zustand: es wird kein Aus- oder Wiederherstellungsbefehl gesendet. Geräte, Entitäten, Automationen und die alte weekly-schedule-card bleiben unberührt.",
    "Prima di procedere puoi salvare un backup.": "Vor dem Fortfahren kannst du eine Sicherung speichern.",
    "Scrivi RESET per confermare": "Gib RESET zur Bestätigung ein",
    "Durata in secondi (1–604800)": "Dauer in Sekunden (1–604800)",
    "Azione timer": "Timer-Aktion",
    "Nuovo profilo": "Neues Profil",
    "Nuovo gruppo": "Neue Gruppe",
    "Modifica schedule": "Zeitplan bearbeiten",
    "Nuovo schedule": "Neuer Zeitplan",
    "RESET completo": "Vollständiger RESET",
    "Ripristina": "Wiederherstellen",
    "Importa": "Importieren",
    "Cancella tutto": "Alles löschen",
    "Salva schedule": "Zeitplan speichern",
    "Salva": "Speichern",
    "Eliminare questo elemento?": "Dieses Element löschen?",
    "I dati sono cambiati su un altro client. Hai verificato le modifiche prima di procedere?": "Die Daten wurden auf einem anderen Client geändert. Hast du die Änderungen vor dem Fortfahren geprüft?",
    "lettura del modulo": "Formular lesen",
    "validazione del nome": "Namensprüfung",
    "Inserisci un nome prima di salvare.": "Gib vor dem Speichern einen Namen ein.",
    "Scegli prima un file di backup.": "Wähle zuerst eine Sicherungsdatei.",
    "Scegli prima un backup della weekly-schedule-card con almeno uno schedule importabile.": "Wähle zuerst eine Sicherung der weekly-schedule-card mit mindestens einem importierbaren Zeitplan.",
    "Scrivi RESET in maiuscolo per confermare la cancellazione.": "Gib RESET in Großbuchstaben ein, um das Löschen zu bestätigen.",
    "preparazione dei dati": "Daten vorbereiten",
    "validazione delle entità": "Entitätsprüfung",
    "Scegli entità dello stesso tipo appartenenti al gruppo.": "Wähle Entitäten eines Typs, die zur Gruppe gehören.",
    "lettura delle fasce orarie": "Zeitfenster lesen",
    "Ogni fascia richiede almeno un giorno e orari diversi.": "Jedes Zeitfenster braucht mindestens einen Tag und unterschiedliche Zeiten.",
    "lettura azione iniziale": "Startaktion lesen",
    "lettura azione finale": "Endaktion lesen",
    "lettura condizioni e notifiche": "Bedingungen und Benachrichtigungen lesen",
    "Configurazione Pro": "Pro-Konfiguration",
    "Campi Pro non validi.": "Ungültige Pro-Felder.",
    "Inserisci il messaggio della notifica oppure disabilitala.": "Gib die Nachricht der Benachrichtigung ein oder deaktiviere sie.",
    "Servono due regole per E/O.": "UND/ODER braucht zwei Regeln.",
    "Seleziona un’entità valida nella condizione.": "Wähle in der Bedingung eine gültige Entität.",
    "Completa il valore della condizione.": "Vervollständige den Wert der Bedingung.",
    "La durata deve essere tra 1 e 604800 secondi.": "Die Dauer muss zwischen 1 und 604800 Sekunden liegen.",
    "Editor non disponibile.": "Editor nicht verfügbar.",
    "confronto con la configurazione esistente": "Vergleich mit der bestehenden Konfiguration",
    "I dati sono cambiati su un altro client. Hai confrontato la bozza con i nuovi dati prima di salvare?": "Die Daten wurden auf einem anderen Client geändert. Hast du den Entwurf vor dem Speichern mit den neuen Daten verglichen?",
    "salvataggio e aggiornamento della vista": "Speichern und Aktualisieren der Ansicht",
    "Importato in {names}. Il profilo è disattivato: spegni gli schedule nella weekly-schedule-card prima di attivarlo.": "Importiert in {names}. Das Profil ist inaktiv: schalte die Zeitpläne in der weekly-schedule-card aus, bevor du es aktivierst.",
    "RESET completato: Schedule Creator è vuoto.": "RESET abgeschlossen: Schedule Creator ist leer.",
    "Backup ripristinato. I profili sono disattivati: attivali per eseguire gli schedule.": "Sicherung wiederhergestellt. Die Profile sind inaktiv: aktiviere sie, um die Zeitpläne auszuführen.",
    "Titolo della card": "Kartentitel",
    "Fascia a cavallo della mezzanotte: modifica gli orari nei campi qui sotto.": "Zeitfenster über Mitternacht: ändere die Zeiten in den Feldern unten.",
    "Trascina la fascia o le maniglie: si aggancia agli inizi/fini degli altri schedule (magnete).": "Ziehe das Zeitfenster oder seine Griffe: es rastet an Anfängen/Enden anderer Zeitpläne ein (Magnet).",
    "Trascina la fascia o le maniglie per cambiare gli orari.": "Ziehe das Zeitfenster oder seine Griffe, um die Zeiten zu ändern.",
    "Passo di aggancio": "Rasterschritt",
    "Passo": "Schritt",
    "Tutti": "Alle",
    "Feriali": "Werktage",
    "Altra fascia di questo schedule": "Anderes Zeitfenster dieses Zeitplans",
    "Fascia {n}": "Zeitfenster {n}",
    "Rimuovi fascia": "Zeitfenster entfernen",
    "Fascia successiva": "Nächstes Zeitfenster",
    "riferimento": "Bezug",
    "minuti prima (−) o dopo (+)": "Minuten vorher (−) oder nachher (+)",
    "min · ≈ {time} oggi": "min · ≈ {time} heute",
    "1 · Entità da controllare": "1 · Zu prüfende Entität",
    "Rimuovi condizione": "Bedingung entfernen",
    "Scegli un’entità: poi vedrai solo i confronti possibili (acceso/spento, maggiore/minore…).": "Wähle eine Entität: dann siehst du nur passende Vergleiche (an/aus, größer/kleiner…).",
    "tra": "zwischen",
    "disponibile": "verfügbar",
    "Da": "Von",
    "A": "Bis",
    "3 · Valore": "3 · Wert",
    "Isteresi": "Hysterese",
    "Margine anti-oscillazione: una volta vera, la condizione torna falsa solo oltre la soglia ± isteresi.": "Schutz gegen Flattern: einmal erfüllt, wird die Bedingung erst jenseits von Schwelle ± Hysterese wieder unerfüllt.",
    "2 · Confronto": "2 · Vergleich",
    "è": "ist",
    "non è": "ist nicht",
    "Diventa vera dopo": "Wird erfüllt nach",
    "Torna falsa dopo": "Wird unerfüllt nach",
    "Evita avanti e indietro: la condizione cambia solo se resta vera (o falsa) per questo tempo. Esempio tende: chiudi dopo 10 min sopra 500 lx, riapri dopo 15 min sotto.": "Verhindert Hin und Her: die Bedingung ändert sich nur, wenn sie so lange erfüllt (oder unerfüllt) bleibt. Beispiel Rollos: nach 10 min über 500 lx schließen, nach 15 min darunter wieder öffnen.",
    "Nessuna condizione: lo schedule esegue sempre nelle sue fasce.": "Keine Bedingung: der Zeitplan läuft in seinen Zeitfenstern immer.",
    "Condizione": "Bedingung",
    "Altra condizione": "Weitere Bedingung",
    "Quando vale lo schedule": "Wann der Zeitplan gilt",
    "Tutte le condizioni": "Alle Bedingungen",
    "Almeno una": "Mindestens eine",
    "Icona": "Symbol",
    "Automatico": "Automatisch",
    "Altro colore": "Andere Farbe",
    "fino alle {time}": "bis {time}",
    "In pausa · condizione": "Pausiert · Bedingung",
    "Prossima {time}": "Nächstes {time}",
    "Dalle {time}": "Ab {time}",
    "Non disponibile": "Nicht verfügbar",
    "Profili attivi": "Aktive Profile",
    "Nessun profilo attivo": "Kein aktives Profil",
    "Oggi": "Heute",
    "Giorno": "Tag",
    "Nessuna entità programmata nei profili attivi.": "Keine Entität in den aktiven Profilen geplant.",
    "in corso": "läuft",
    "in pausa": "pausiert",
    "profilo {name}": "Profil {name}",
    "ora": "jetzt",
    "La settimana": "Die Woche",
    "Lun → · Mar ← · la mezzanotte è nella curva": "Mo → · Di ← · Mitternacht liegt in der Kurve",
    "Settimana a serpentina": "Woche als Serpentine",
    "La settimana ad anello": "Die Woche als Ring",
    "Ogni anello è un dispositivo · lo spazio tra i settori è la mezzanotte": "Jeder Ring ist ein Gerät · die Lücke zwischen den Sektoren ist Mitternacht",
    "Nessuna attività in corso": "Gerade keine Aktivität",
    "Prossima: {name}": "Nächstes: {name}",
    "Settimana ad anello": "Woche als Ring",
    "Solo temperatura: la modalità resta quella del dispositivo.": "Nur Temperatur: das Gerät behält seinen Modus.",
    "Più comandi nella fascia: importato solo “{service}”.": "Mehrere Befehle im Zeitfenster: nur „{service}“ wurde importiert.",
    "Condizione incompleta ignorata.": "Unvollständige Bedingung ignoriert.",
    "Condizione sull’attributo “{attribute}” di {entity}: non supportata.": "Bedingung auf Attribut „{attribute}“ von {entity}: nicht unterstützt.",
    "Valore non numerico “{value}” per {entity}.": "Nicht numerischer Wert „{value}“ für {entity}.",
    "La condizione di Scheduler era valutata solo all’inizio: ora vale per tutta la fascia.": "Die Scheduler-Bedingung wurde nur zu Beginn geprüft: jetzt gilt sie für das ganze Zeitfenster.",
    "Il file non è un backup della weekly-schedule-card.": "Die Datei ist keine Sicherung der weekly-schedule-card.",
    "Profilo WSC": "WSC-Profil",
    "Altri dispositivi": "Weitere Geräte",
    "Configurazione mancante nel backup.": "Konfiguration fehlt in der Sicherung.",
    "Schedule una tantum: non importato.": "Einmaliger Zeitplan: nicht importiert.",
    "Giorni non riconosciuti.": "Tage nicht erkannt.",
    "“Giorni lavorativi” importati come lunedì–venerdì.": "„Werktage“ als Montag–Freitag importiert.",
    "Periodo {from} → {to} non supportato: vale tutto l’anno.": "Zeitraum {from} → {to} nicht unterstützt: gilt das ganze Jahr.",
    "Fine gestita da uno schedule figlio della vecchia versione: controlla l’azione finale.": "Ende wird von einem Unterzeitplan der alten Version gesteuert: prüfe die Endaktion.",
    "Orario “{time}” non supportato.": "Uhrzeit „{time}“ nicht unterstützt.",
    "Azione puntuale: diventa una fascia di un minuto.": "Punktuelle Aktion: wird zu einem Zeitfenster von einer Minute.",
    "Fascia di durata zero ignorata.": "Zeitfenster ohne Dauer ignoriert.",
    "Fascia con più dispositivi: ignorata.": "Zeitfenster mit mehreren Geräten: ignoriert.",
    "Comando non riconosciuto per {entity}.": "Befehl für {entity} nicht erkannt.",
    "Fasce con azioni diverse: importata solo la prima azione.": "Zeitfenster mit unterschiedlichen Aktionen: nur die erste Aktion wurde importiert.",
    "Nessuna fascia importabile.": "Kein importierbares Zeitfenster.",
    "Era disattivato nella weekly-schedule-card: resta disattivato.": "In der weekly-schedule-card deaktiviert: bleibt deaktiviert.",
    "Importato disattivato: completa la condizione e riattivalo.": "Deaktiviert importiert: vervollständige die Bedingung und aktiviere ihn wieder.",
    "Quando la condizione è falsa viene eseguita l’azione finale.": "Ist die Bedingung nicht erfüllt, wird die Endaktion ausgeführt.",
    "Lun": "Mo",
    "Mar": "Di",
    "Mer": "Mi",
    "Gio": "Do",
    "Ven": "Fr",
    "Sab": "Sa",
    "Dom": "So",
    "Lunedì": "Montag",
    "Martedì": "Dienstag",
    "Mercoledì": "Mittwoch",
    "Giovedì": "Donnerstag",
    "Venerdì": "Freitag",
    "Sabato": "Samstag",
    "Domenica": "Sonntag",
    "LUN": "MO",
    "MAR": "DI",
    "MER": "MI",
    "GIO": "DO",
    "VEN": "FR",
    "SAB": "SA",
    "DOM": "SO",
    "Alba": "Sonnenaufgang",
    "Tramonto": "Sonnenuntergang",
    "Spento": "Aus",
    "Acceso": "An",
    "Auto": "Auto",
    "Caldo/Freddo": "Heizen/Kühlen",
    "Freddo": "Kühlen",
    "Caldo": "Heizen",
    "Deumidifica": "Entfeuchten",
    "Acceso / Sì": "An / Ja",
    "Spento / No": "Aus / Nein",
    "A casa": "Zu Hause",
    "Fuori casa": "Abwesend",
    "Subito": "Sofort",
    "Casa": "Zuhause",
    "Soggiorno": "Wohnzimmer",
    "Camera": "Schlafzimmer",
    "Cucina": "Küche",
    "Bagno": "Bad",
    "Studio": "Arbeitszimmer",
    "Garage": "Garage",
    "Giardino": "Garten",
    "Scale": "Treppe",
    "Luci": "Lichter",
    "Plafoniera": "Deckenleuchte",
    "Striscia LED": "LED-Streifen",
    "Termostato": "Thermostat",
    "Clima": "Klimaanlage",
    "Termosifone": "Heizkörper",
    "Tapparelle": "Rollläden",
    "Tende": "Rollos",
    "Presa": "Steckdose",
    "Boiler": "Boiler",
    "Lavatrice": "Waschmaschine",
    "TV": "TV",
    "Robot": "Roboter",
    "Irrigazione": "Bewässerung",
    "Notte": "Nacht",
    "Lavoro": "Arbeit",
    "Vacanza": "Urlaub",
    "Inverno": "Winter",
    "Programma": "Programm",
  },
  es: {
    "Diminuisci": "Disminuir",
    "Aumenta": "Aumentar",
    "Aperta": "Abierto",
    "Chiusa": "Cerrado",
    "In apertura": "Abriendo",
    "In chiusura": "Cerrando",
    "Seleziona prima un’entità.": "Selecciona primero una entidad.",
    "Modalità HVAC": "Modo HVAC",
    "Comando": "Orden",
    "Stato": "Estado",
    "Temperatura": "Temperatura",
    "Minima": "Mínima",
    "Massima": "Máxima",
    "Ventola": "Ventilador",
    "Swing orizzontale": "Oscilación horizontal",
    "Luminosità": "Brillo",
    "Non cambiare colore": "No cambiar el color",
    "Colore": "Color",
    "Temperatura colore": "Temperatura de color",
    "Velocità": "Velocidad",
    "Posizione": "Posición",
    "Stato attuale": "Estado actual",
    "Azione personalizzata conservata in modalità Pro.": "Acción personalizada conservada en modo Pro.",
    "Altre opzioni": "Más opciones",
    "Pro · azione personalizzata": "Pro · acción personalizada",
    "Usa JSON al posto dei controlli": "Usar JSON en lugar de los controles",
    "Azione JSON": "Acción JSON",
    "Azione Pro non valida per le entità selezionate.": "Acción Pro no válida para las entidades seleccionadas.",
    "Il target è già definito dalle entità selezionate.": "El destino ya lo definen las entidades seleccionadas.",
    "apply_state richiede il campo \"state\".": "apply_state requiere el campo \"state\".",
    "Scegli cosa deve fare il dispositivo.": "Elige qué debe hacer el dispositivo.",
    "Comando non disponibile per questo dispositivo.": "Orden no disponible para este dispositivo.",
    "Indica la posizione richiesta.": "Indica la posición deseada.",
    "Inserisci un valore numerico valido.": "Introduce un valor numérico válido.",
    "Stato precedente": "Estado anterior",
    "ventola {mode}": "ventilador {mode}",
    "Accendi": "Encender",
    "Spegni": "Apagar",
    "Apri": "Abrir",
    "Chiudi": "Cerrar",
    "Ferma": "Detener",
    "Posizione {value}%": "Posición {value} %",
    "Velocità {value}%": "Velocidad {value} %",
    "Home Assistant ha confermato il salvataggio, ma la card non è riuscita ad aggiornare la vista. Ricarica la dashboard prima di riprovare.": "Home Assistant confirmó el guardado, pero la tarjeta no pudo actualizar la vista. Recarga el panel antes de volver a intentarlo.",
    "Home Assistant ha rifiutato {operation} ({code}). Aggiorna l’integrazione Schedule Creator, riavvia completamente Home Assistant e riprova. Se persiste, comunica questo comando e controlla i log dell’integrazione.": "Home Assistant rechazó {operation} ({code}). Actualiza la integración Schedule Creator, reinicia Home Assistant por completo y vuelve a intentarlo. Si persiste, informa de este comando y revisa los registros de la integración.",
    "Salvataggio non riuscito: una funzione ha restituito “Method not implemented”. La bozza è conservata. Apri “Dettagli errore” e invia il testo per individuare il passaggio che fallisce.": "Error al guardar: una función devolvió «Method not implemented». El borrador se conserva. Abre «Detalles del error» y envía el texto para localizar el paso que falla.",
    "Configurazione cambiata su un altro client. La bozza è conservata: confrontala e salva di nuovo.": "La configuración cambió en otro cliente. El borrador se conserva: compáralo y guarda de nuevo.",
    "Serve un account amministratore per modificare.": "Se necesita una cuenta de administrador para editar.",
    "Dati non validi: controlla entità, fasce e parametri delle azioni.": "Datos no válidos: revisa entidades, franjas y parámetros de las acciones.",
    "Formato non valido: controlla i campi richiesti.": "Formato no válido: revisa los campos obligatorios.",
    "Profilo, gruppo o schedule non trovato. Aggiorna la vista.": "Perfil, grupo o programación no encontrado. Actualiza la vista.",
    "Il gruppo non appartiene al profilo scelto.": "El grupo no pertenece al perfil elegido.",
    "Profilo in uso: rimuovi prima i gruppi e gli schedule collegati.": "Perfil en uso: elimina primero sus grupos y programaciones.",
    "Gruppo in uso: rimuovi prima gli schedule collegati.": "Grupo en uso: elimina primero sus programaciones.",
    "Il timer non è più attivo.": "El temporizador ya no está activo.",
    "Integrazione non caricata: controlla Dispositivi e servizi.": "Integración no cargada: revisa Dispositivos y servicios.",
    "Archivio non disponibile: controlla i log di Home Assistant.": "Almacenamiento no disponible: revisa los registros de Home Assistant.",
    "Operazione {operation} non riuscita ({code}). Controlla i log di Home Assistant.": "La operación {operation} falló ({code}). Revisa los registros de Home Assistant.",
    "errore sconosciuto": "error desconocido",
    "Operazione non riuscita. Controlla i log di Home Assistant.": "La operación falló. Revisa los registros de Home Assistant.",
    "non disponibile": "no disponible",
    "Fase": "Fase",
    "Operazione": "Operación",
    "Conferma del server": "Confirmación del servidor",
    "ricevuta": "recibida",
    "non ricevuta": "no recibida",
    "Codice": "Código",
    "Errore": "Error",
    "Traccia": "Traza",
    "JSON non valido.": "JSON no válido.",
    "Abilita notifica": "Activar notificación",
    "Destinazione": "Destino",
    "Notifica in Home Assistant": "Notificación en Home Assistant",
    "Titolo": "Título",
    "Messaggio": "Mensaje",
    "1 ora": "1 hora",
    "{count} ore": "{count} horas",
    "{count} minuti": "{count} minutos",
    "Avvia": "Iniciar",
    "{action} fino alle {time}": "{action} hasta las {time}",
    "{action} per {duration}": "{action} durante {duration}",
    "Caricamento…": "Cargando…",
    "Scegli l’entità": "Elige la entidad",
    "Cerca per nome o ID": "Buscar por nombre o ID",
    "Alla scadenza torna a": "Al terminar vuelve a",
    "lo stato precedente": "el estado anterior",
    "Annulla": "Cancelar",
    "Nessun timer attivo. Serve un amministratore per avviarne uno.": "Ningún temporizador activo. Se necesita un administrador para iniciar uno.",
    "Durante il timer": "Durante el temporizador",
    "Azione": "Acción",
    "Per quanto": "Cuánto tiempo",
    "Durata": "Duración",
    "Fino alle": "Hasta las",
    "Durata in minuti": "Duración en minutos",
    "Minuti": "Minutos",
    "Cambia": "Cambiar",
    "Entità non disponibile.": "Entidad no disponible.",
    "Scegli una durata tra 1 minuto e 7 giorni.": "Elige una duración entre 1 minuto y 7 días.",
    "Entità": "Entidad",
    "Scegli nella card": "Elegir en la tarjeta",
    "Durate rapide (minuti, separate da virgola)": "Duraciones rápidas (minutos, separados por comas)",
    "Tutti i giorni": "Todos los días",
    "Lun–Ven": "Lun–Vie",
    "Weekend": "Fin de semana",
    "La card v{card} è aggiornata, ma Home Assistant esegue ancora l’integrazione {backend}. Riavvia Home Assistant (Impostazioni → Sistema → Riavvia) per attivare il nuovo backend.": "La tarjeta v{card} está actualizada, pero Home Assistant sigue ejecutando la integración {backend}. Reinicia Home Assistant (Ajustes → Sistema → Reiniciar) para activar el nuevo backend.",
    "precedente": "anterior",
    "L’integrazione v{backend} è attiva, ma questa pagina usa ancora la card v{card}. Ricarica la pagina; nell’app mobile usa “Ricarica” o svuota la cache del frontend.": "La integración v{backend} está activa, pero esta página aún usa la tarjeta v{card}. Recarga la página; en la app móvil usa «Recargar» o vacía la caché del frontend.",
    "Uno schedule controlla entità dello stesso tipo. Crea uno schedule separato per gli altri dispositivi.": "Una programación controla entidades de un solo tipo. Crea otra programación para los demás dispositivos.",
    "Tipo di dispositivo cambiato: scegli nuovamente le azioni.": "Tipo de dispositivo cambiado: vuelve a elegir las acciones.",
    "Orario": "Hora",
    "oggi": "hoy",
    "Clicca uno spazio libero per aggiungere uno schedule": "Haz clic en un espacio libre para añadir una programación",
    "Disabilitato": "Desactivado",
    "Ora": "Ahora",
    "Clima: freddo → caldo": "Clima: frío → cálido",
    "In corso": "En curso",
    "In pausa": "En pausa",
    "Un comando non è riuscito nelle ultime 24 ore: dettagli in “Attività”.": "Una orden falló en las últimas 24 horas: detalles en «Actividad».",
    "{count} comandi non sono riusciti nelle ultime 24 ore: dettagli in “Attività”.": "{count} órdenes fallaron en las últimas 24 horas: detalles en «Actividad».",
    "Profilo attivo": "Perfil activo",
    "Profilo inattivo": "Perfil inactivo",
    "Esclusivo": "Exclusivo",
    "Condiviso": "Compartido",
    "Crea un profilo per iniziare": "Crea un perfil para empezar",
    "{count} timer attivi": "{count} temporizadores activos",
    "Settimana": "Semana",
    "Gruppi": "Grupos",
    "Programmazione settimanale": "Programación semanal",
    "Gestisci schedule ({count})": "Gestionar programaciones ({count})",
    "disabilitato": "desactivado",
    "1 fascia": "1 franja",
    "{count} fasce": "{count} franjas",
    "Modifica": "Editar",
    "Elimina": "Eliminar",
    "Inizia dal tuo primo profilo": "Empieza por tu primer perfil",
    "Aggiungi un gruppo di dispositivi": "Añade un grupo de dispositivos",
    "La settimana è ancora libera": "La semana aún está libre",
    "Organizza la casa per abitudini, ambienti o stagioni.": "Organiza la casa por hábitos, estancias o estaciones.",
    "Riunisci i dispositivi che vuoi programmare.": "Reúne los dispositivos que quieres programar.",
    "Tocca qui o su un orario del calendario per creare uno schedule.": "Toca aquí o en una hora del calendario para crear una programación.",
    "Gestisci profili e gruppi": "Gestionar perfiles y grupos",
    "Profilo": "Perfil",
    "Modifica profilo": "Editar perfil",
    "Disattiva profilo": "Desactivar perfil",
    "Attiva profilo": "Activar perfil",
    "Elimina profilo": "Eliminar perfil",
    "Gruppo": "Grupo",
    "Modifica gruppo": "Editar grupo",
    "Elimina gruppo": "Eliminar grupo",
    "Vista in sola lettura: serve un amministratore per modificare.": "Vista de solo lectura: se necesita un administrador para editar.",
    "Manutenzione · backup, import e RESET": "Mantenimiento · copia, importación y RESET",
    "Il backup salva profili, gruppi e schedule in un file JSON. Il ripristino li sostituisce e lascia i profili disattivati. L’import dalla weekly-schedule-card li aggiunge in un nuovo profilo disattivato. RESET cancella tutti i dati di Schedule Creator.": "La copia guarda perfiles, grupos y programaciones en un archivo JSON. La restauración los sustituye y deja los perfiles desactivados. La importación desde weekly-schedule-card los añade en un perfil nuevo desactivado. RESET borra todos los datos de Schedule Creator.",
    "Salva backup": "Guardar copia",
    "Ripristina backup": "Restaurar copia",
    "Importa da Weekly Schedule Card": "Importar desde Weekly Schedule Card",
    "Attività · {slots} fasce in corso · {timers} timer": "Actividad · {slots} franjas en curso · {timers} temporizadores",
    "{count} errori": "{count} errores",
    "Comandi non riusciti": "Órdenes fallidas",
    "condizione": "condición",
    "termine": "fin",
    "Nessuna fascia attiva.": "Ninguna franja activa.",
    "Timer": "Temporizador",
    "Annulla timer": "Cancelar temporizador",
    "Dettagli errore": "Detalles del error",
    "Seleziona e copia questo testo per segnalare il problema.": "Selecciona y copia este texto para informar del problema.",
    "Dettagli errore da copiare": "Detalles del error para copiar",
    "1 fascia in corso": "1 franja en curso",
    "{count} fasce in corso": "{count} franjas en curso",
    "nessuna fascia in corso": "ninguna franja en curso",
    "Schedule": "Programación",
    "Profili": "Perfiles",
    "Chiudi editor": "Cerrar editor",
    "Più profili attivi ora: vince la fascia iniziata per ultima.": "Varios perfiles activos ahora: gana la franja que empezó la última.",
    "Possono essere attivi insieme: se le fasce si sovrappongono vince quella iniziata per ultima.": "Pueden estar activos a la vez: si las franjas se solapan, gana la que empezó la última.",
    "Profili esclusivi: mai attivi insieme, nessun conflitto.": "Perfiles exclusivos: nunca activos a la vez, sin conflicto.",
    "Attivo": "Activo",
    "Inattivo": "Inactivo",
    "{groups} gruppi · {schedules} schedule · {entities} entità": "{groups} grupos · {schedules} programaciones · {entities} entidades",
    "Panoramica profili e interazioni": "Resumen de perfiles e interacciones",
    "<strong>Esclusivo</strong>: attivandolo si disattivano gli altri profili esclusivi. <strong>Condiviso</strong>: resta attivo insieme agli altri. Solo i profili attivi eseguono i loro schedule. Se due fasce comandano la stessa entità vince quella iniziata per ultima; a parità un Quick Timer prevale su uno schedule con condizione, che prevale su uno normale. L’ordine serve solo a disporre profili e gruppi.": "<strong>Exclusivo</strong>: al activarlo se desactivan los demás perfiles exclusivos. <strong>Compartido</strong>: sigue activo junto con los demás. Solo los perfiles activos ejecutan sus programaciones. Si dos franjas controlan la misma entidad, gana la que empezó la última; en empate un Quick Timer gana a una programación con condición, que gana a una normal. El orden solo sirve para colocar perfiles y grupos.",
    "Entità comandate da più profili": "Entidades controladas por varios perfiles",
    "Nessuna: ogni entità è programmata da un solo profilo.": "Ninguna: cada entidad la programa un solo perfil.",
    "In attesa": "En espera",
    "Adesso": "Ahora",
    "La condizione non è soddisfatta": "La condición no se cumple",
    "Un altro schedule o timer ha la priorità": "Otra programación o temporizador tiene prioridad",
    "Fino alle {time}": "Hasta las {time}",
    "condizione vera": "condición verdadera",
    "Resta": "Quedan",
    "poi": "después",
    "Nessuna fascia in corso adesso.": "Ninguna franja en curso ahora.",
    "Notifica di stato": "Notificación de estado",
    "Notifica persistente per tutta la fascia": "Notificación persistente durante toda la franja",
    "In Home Assistant compare una notifica che dice se lo schedule è attivo, in pausa per la condizione o in attesa di un altro controllo; si aggiorna da sola e sparisce a fine fascia.": "En Home Assistant aparece una notificación que indica si la programación está activa, en pausa por la condición o esperando a otro control; se actualiza sola y desaparece al final de la franja.",
    "Tocco sulla notifica": "Toque en la notificación",
    "Apre <strong>{url}</strong> (app Companion e notifiche di Home Assistant).": "Abre <strong>{url}</strong> (app Companion y notificaciones de Home Assistant).",
    "Nessuna pagina impostata: la notifica non apre nulla.": "Ninguna página configurada: la notificación no abre nada.",
    "Apri questa dashboard": "Abrir este panel",
    "Rimuovi collegamento": "Quitar enlace",
    "Ricerca entità": "Buscar entidad",
    "Nome, dominio o ID": "Nombre, dominio o ID",
    "avvio": "inicio",
    "alle {time}": "a las {time}",
    "fascia terminata": "franja terminada",
    "Gli schedule della weekly-schedule-card vengono <strong>aggiunti</strong> in un nuovo profilo, <strong>disattivato</strong>: nulla viene eseguito finché non lo attivi. La weekly-schedule-card e Scheduler non vengono modificati.": "Las programaciones de weekly-schedule-card se <strong>añaden</strong> en un perfil nuevo <strong>desactivado</strong>: no se ejecuta nada hasta que lo actives. weekly-schedule-card y Scheduler no se modifican.",
    "Backup della weekly-schedule-card (.json)": "Copia de weekly-schedule-card (.json)",
    "Nella weekly-schedule-card: Gruppi → Manutenzione → Salva configurazione.": "En weekly-schedule-card: Grupos → Mantenimiento → Guardar configuración.",
    "Pronto": "Listo",
    "Da controllare": "Por revisar",
    "Importato disattivato": "Importado desactivado",
    "Non importato": "No importado",
    "e": "y",
    "o": "o",
    "isteresi": "histéresis",
    "alla fine": "al final",
    "se": "si",
    "esclusivo": "exclusivo",
    "condiviso": "compartido",
    "{count} gruppi": "{count} grupos",
    "era attivo nella weekly-schedule-card": "estaba activo en weekly-schedule-card",
    "Salvato il {date}": "Guardado el {date}",
    "data sconosciuta": "fecha desconocida",
    "{ready} pronti · {off} disattivati · {skip} non importati": "{ready} listos · {off} desactivados · {skip} no importados",
    "Questo backup è già stato importato il {date}: importandolo di nuovo gli schedule saranno duplicati.": "Esta copia ya se importó el {date}: importarla de nuevo duplicará las programaciones.",
    "Entità non presenti in questo Home Assistant: {list}": "Entidades que no existen en este Home Assistant: {list}",
    "Prima di attivare il profilo importato spegni gli stessi schedule nella weekly-schedule-card (o in Scheduler): altrimenti i dispositivi ricevono i comandi due volte.": "Antes de activar el perfil importado, desactiva las mismas programaciones en weekly-schedule-card (o en Scheduler): si no, los dispositivos reciben las órdenes dos veces.",
    "1 attivazione": "1 activación",
    "{count} attivazioni": "{count} activaciones",
    "mai": "nunca",
    "Attivazioni": "Activaciones",
    "Fasce bloccate dalla condizione": "Franjas bloqueadas por la condición",
    "Ultima attivazione": "Última activación",
    "Ultimo blocco per condizione": "Último bloqueo por condición",
    "Conteggi da quando è installata la versione 0.3.15; una fascia conta una volta sola.": "Recuentos desde que se instaló la versión 0.3.15; cada franja cuenta una sola vez.",
    "Schedule eliminato": "Programación eliminada",
    "notifica": "notificación",
    "ripristino dello stato": "restauración del estado",
    "azione finale": "acción final",
    "azione a condizione falsa": "acción con condición falsa",
    "azione iniziale": "acción inicial",
    "esito sconosciuto: Home Assistant si è riavviato durante l’invio": "resultado desconocido: Home Assistant se reinició durante el envío",
    "il servizio ha restituito un errore o non ha risposto ({count} tentativi)": "el servicio devolvió un error o no respondió ({count} intentos)",
    "ripristino non riuscito ({count} tentativi)": "restauración fallida ({count} intentos)",
    "notifica non inviata ({count} tentativi)": "notificación no enviada ({count} intentos)",
    "dati del comando non validi": "datos de la orden no válidos",
    "stato iniziale non disponibile": "estado inicial no disponible",
    "Backup salvato: {profiles} profili, {groups} gruppi, {schedules} schedule.": "Copia guardada: {profiles} perfiles, {groups} grupos, {schedules} programaciones.",
    "Il file non è un backup di Schedule Creator né della weekly-schedule-card.": "El archivo no es una copia de Schedule Creator ni de weekly-schedule-card.",
    "Il file non contiene JSON valido.": "El archivo no contiene JSON válido.",
    "non disponibile/supportata": "no disponible/no compatible",
    "Nome": "Nombre",
    "Tipo": "Tipo",
    "Posizione nell’elenco (0 = primo)": "Posición en la lista (0 = primero)",
    "Serve solo a ordinare l’elenco: non cambia priorità né esecuzione.": "Solo ordena la lista: no cambia la prioridad ni la ejecución.",
    "Nessuna azione": "Ninguna acción",
    "Nessuna": "Ninguna",
    "{count} condizioni": "{count} condiciones",
    "Da completare": "Por completar",
    "Inizio": "Inicio",
    "Fine": "Fin",
    "Suggerisci": "Sugerir",
    "Dispositivi": "Dispositivos",
    "gruppo": "grupo",
    "Quando": "Cuándo",
    "All’inizio": "Al inicio",
    "Azione iniziale": "Acción inicial",
    "Alla fine": "Al final",
    "Azione finale": "Acción final",
    "Condizioni": "Condiciones",
    "Se falsa: azione finale se presente, altrimenti ripristino deciso dal motore. La fine fascia senza azione finale non invia comandi.": "Si es falsa: la acción final si existe; si no, una restauración decidida por el motor. El final de una franja sin acción final no envía órdenes.",
    "Notifiche": "Notificaciones",
    "Notifica iniziale": "Notificación inicial",
    "Notifica finale": "Notificación final",
    "Abilitato": "Activado",
    "Schedule abilitato": "Programación activada",
    "Orari nel fuso {zone}. Se la fine precede l’inizio, la fascia termina il giorno successivo.": "Horas en la zona horaria {zone}. Si el final es anterior al inicio, la franja termina al día siguiente.",
    "Comandi manuali": "Órdenes manuales",
    "Cooperativa": "Cooperativa",
    "Priorità al comando manuale": "Prioridad a la orden manual",
    "Date incluse (AAAA-MM-GG, separate da virgola)": "Fechas incluidas (AAAA-MM-DD, separadas por comas)",
    "Date escluse (AAAA-MM-GG, separate da virgola)": "Fechas excluidas (AAAA-MM-DD, separadas por comas)",
    "Statistiche": "Estadísticas",
    "Pro · configurazione JSON": "Pro · configuración JSON",
    "Usa JSON per condizioni, fasce e notifiche": "Usar JSON para condiciones, franjas y notificaciones",
    "Configurazione avanzata": "Configuración avanzada",
    "Il ripristino <strong>sostituisce</strong> tutti i profili, gruppi e schedule attuali con quelli del file. I profili ripristinati restano <strong>disattivati</strong>: attivali quando vuoi che eseguano i comandi. Timer e fasce in corso non fanno parte del backup.": "La restauración <strong>sustituye</strong> todos los perfiles, grupos y programaciones actuales por los del archivo. Los perfiles restaurados quedan <strong>desactivados</strong>: actívalos cuando quieras que envíen órdenes. Los temporizadores y las franjas en curso no forman parte de la copia.",
    "File di backup (.json)": "Archivo de copia (.json)",
    "Contenuto del file": "Contenido del archivo",
    "{profiles} profili · {groups} gruppi · {schedules} schedule": "{profiles} perfiles · {groups} grupos · {schedules} programaciones",
    "Salvato il {date} con la versione {version}.": "Guardado el {date} con la versión {version}.",
    "sconosciuta": "desconocida",
    "Entità non presenti in questo Home Assistant: {list}. Gli schedule collegati non potranno comandarle.": "Entidades que no existen en este Home Assistant: {list}. Las programaciones asociadas no podrán controlarlas.",
    "Scegli un file creato con “Salva backup”.": "Elige un archivo creado con «Guardar copia».",
    "RESET cancella <strong>tutti</strong> i dati di Schedule Creator: {profiles} profili, {groups} gruppi, {schedules} schedule, {timers} timer attivi, fasce in corso e storico operazioni. L’integrazione resta installata e vuota.": "RESET borra <strong>todos</strong> los datos de Schedule Creator: {profiles} perfiles, {groups} grupos, {schedules} programaciones, {timers} temporizadores activos, franjas en curso e historial de operaciones. La integración sigue instalada y vacía.",
    "I dispositivi restano nello stato in cui si trovano: nessun comando di spegnimento o ripristino viene inviato. Dispositivi, entità, automazioni e la vecchia weekly-schedule-card non vengono toccati.": "Los dispositivos se quedan como están: no se envía ninguna orden de apagado ni de restauración. Dispositivos, entidades, automatizaciones y la antigua weekly-schedule-card no se tocan.",
    "Prima di procedere puoi salvare un backup.": "Antes de continuar puedes guardar una copia.",
    "Scrivi RESET per confermare": "Escribe RESET para confirmar",
    "Durata in secondi (1–604800)": "Duración en segundos (1–604800)",
    "Azione timer": "Acción del temporizador",
    "Nuovo profilo": "Nuevo perfil",
    "Nuovo gruppo": "Nuevo grupo",
    "Modifica schedule": "Editar programación",
    "Nuovo schedule": "Nueva programación",
    "RESET completo": "RESET completo",
    "Ripristina": "Restaurar",
    "Importa": "Importar",
    "Cancella tutto": "Borrar todo",
    "Salva schedule": "Guardar programación",
    "Salva": "Guardar",
    "Eliminare questo elemento?": "¿Eliminar este elemento?",
    "I dati sono cambiati su un altro client. Hai verificato le modifiche prima di procedere?": "Los datos cambiaron en otro cliente. ¿Has revisado los cambios antes de continuar?",
    "lettura del modulo": "lectura del formulario",
    "validazione del nome": "validación del nombre",
    "Inserisci un nome prima di salvare.": "Introduce un nombre antes de guardar.",
    "Scegli prima un file di backup.": "Elige primero un archivo de copia.",
    "Scegli prima un backup della weekly-schedule-card con almeno uno schedule importabile.": "Elige primero una copia de weekly-schedule-card con al menos una programación importable.",
    "Scrivi RESET in maiuscolo per confermare la cancellazione.": "Escribe RESET en mayúsculas para confirmar el borrado.",
    "preparazione dei dati": "preparación de los datos",
    "validazione delle entità": "validación de las entidades",
    "Scegli entità dello stesso tipo appartenenti al gruppo.": "Elige entidades del mismo tipo que pertenezcan al grupo.",
    "lettura delle fasce orarie": "lectura de las franjas horarias",
    "Ogni fascia richiede almeno un giorno e orari diversi.": "Cada franja necesita al menos un día y horas distintas.",
    "lettura azione iniziale": "lectura de la acción inicial",
    "lettura azione finale": "lectura de la acción final",
    "lettura condizioni e notifiche": "lectura de condiciones y notificaciones",
    "Configurazione Pro": "Configuración Pro",
    "Campi Pro non validi.": "Campos Pro no válidos.",
    "Inserisci il messaggio della notifica oppure disabilitala.": "Introduce el mensaje de la notificación o desactívala.",
    "Servono due regole per E/O.": "Y/O necesita dos reglas.",
    "Seleziona un’entità valida nella condizione.": "Selecciona una entidad válida en la condición.",
    "Completa il valore della condizione.": "Completa el valor de la condición.",
    "La durata deve essere tra 1 e 604800 secondi.": "La duración debe estar entre 1 y 604800 segundos.",
    "Editor non disponibile.": "Editor no disponible.",
    "confronto con la configurazione esistente": "comparación con la configuración existente",
    "I dati sono cambiati su un altro client. Hai confrontato la bozza con i nuovi dati prima di salvare?": "Los datos cambiaron en otro cliente. ¿Has comparado el borrador con los datos nuevos antes de guardar?",
    "salvataggio e aggiornamento della vista": "guardado y actualización de la vista",
    "Importato in {names}. Il profilo è disattivato: spegni gli schedule nella weekly-schedule-card prima di attivarlo.": "Importado en {names}. El perfil está desactivado: desactiva las programaciones en weekly-schedule-card antes de activarlo.",
    "RESET completato: Schedule Creator è vuoto.": "RESET completado: Schedule Creator está vacío.",
    "Backup ripristinato. I profili sono disattivati: attivali per eseguire gli schedule.": "Copia restaurada. Los perfiles están desactivados: actívalos para ejecutar las programaciones.",
    "Titolo della card": "Título de la tarjeta",
    "Fascia a cavallo della mezzanotte: modifica gli orari nei campi qui sotto.": "Franja que cruza la medianoche: cambia las horas en los campos de abajo.",
    "Trascina la fascia o le maniglie: si aggancia agli inizi/fini degli altri schedule (magnete).": "Arrastra la franja o sus tiradores: se ajusta a los inicios/finales de otras programaciones (imán).",
    "Trascina la fascia o le maniglie per cambiare gli orari.": "Arrastra la franja o sus tiradores para cambiar las horas.",
    "Passo di aggancio": "Paso de ajuste",
    "Passo": "Paso",
    "Tutti": "Todos",
    "Feriali": "Laborables",
    "Altra fascia di questo schedule": "Otra franja de esta programación",
    "Fascia {n}": "Franja {n}",
    "Rimuovi fascia": "Quitar franja",
    "Fascia successiva": "Franja siguiente",
    "riferimento": "referencia",
    "minuti prima (−) o dopo (+)": "minutos antes (−) o después (+)",
    "min · ≈ {time} oggi": "min · ≈ {time} hoy",
    "1 · Entità da controllare": "1 · Entidad a comprobar",
    "Rimuovi condizione": "Quitar condición",
    "Scegli un’entità: poi vedrai solo i confronti possibili (acceso/spento, maggiore/minore…).": "Elige una entidad: después solo verás las comparaciones posibles (encendido/apagado, mayor/menor…).",
    "tra": "entre",
    "disponibile": "disponible",
    "Da": "Desde",
    "A": "Hasta",
    "3 · Valore": "3 · Valor",
    "Isteresi": "Histéresis",
    "Margine anti-oscillazione: una volta vera, la condizione torna falsa solo oltre la soglia ± isteresi.": "Margen anti-oscilación: una vez verdadera, la condición solo vuelve a falsa más allá del umbral ± histéresis.",
    "2 · Confronto": "2 · Comparación",
    "è": "es",
    "non è": "no es",
    "Diventa vera dopo": "Pasa a verdadera tras",
    "Torna falsa dopo": "Vuelve a falsa tras",
    "Evita avanti e indietro: la condizione cambia solo se resta vera (o falsa) per questo tempo. Esempio tende: chiudi dopo 10 min sopra 500 lx, riapri dopo 15 min sotto.": "Evita el vaivén: la condición solo cambia si sigue verdadera (o falsa) durante este tiempo. Ejemplo de estores: cerrar tras 10 min por encima de 500 lx, volver a abrir tras 15 min por debajo.",
    "Nessuna condizione: lo schedule esegue sempre nelle sue fasce.": "Sin condición: la programación siempre se ejecuta en sus franjas.",
    "Condizione": "Condición",
    "Altra condizione": "Otra condición",
    "Quando vale lo schedule": "Cuándo vale la programación",
    "Tutte le condizioni": "Todas las condiciones",
    "Almeno una": "Al menos una",
    "Icona": "Icono",
    "Automatico": "Automático",
    "Altro colore": "Otro color",
    "fino alle {time}": "hasta las {time}",
    "In pausa · condizione": "En pausa · condición",
    "Prossima {time}": "Próxima {time}",
    "Dalle {time}": "Desde las {time}",
    "Non disponibile": "No disponible",
    "Profili attivi": "Perfiles activos",
    "Nessun profilo attivo": "Ningún perfil activo",
    "Oggi": "Hoy",
    "Giorno": "Día",
    "Nessuna entità programmata nei profili attivi.": "Ninguna entidad programada en los perfiles activos.",
    "in corso": "en curso",
    "in pausa": "en pausa",
    "profilo {name}": "perfil {name}",
    "ora": "ahora",
    "La settimana": "La semana",
    "Lun → · Mar ← · la mezzanotte è nella curva": "Lun → · Mar ← · la medianoche está en la curva",
    "Settimana a serpentina": "Semana en serpentina",
    "La settimana ad anello": "La semana en anillo",
    "Ogni anello è un dispositivo · lo spazio tra i settori è la mezzanotte": "Cada anillo es un dispositivo · el hueco entre sectores es la medianoche",
    "Nessuna attività in corso": "Ninguna actividad en curso",
    "Prossima: {name}": "Próxima: {name}",
    "Settimana ad anello": "Semana en anillo",
    "Solo temperatura: la modalità resta quella del dispositivo.": "Solo temperatura: el dispositivo mantiene su modo.",
    "Più comandi nella fascia: importato solo “{service}”.": "Varias órdenes en la franja: solo se importó «{service}».",
    "Condizione incompleta ignorata.": "Condición incompleta ignorada.",
    "Condizione sull’attributo “{attribute}” di {entity}: non supportata.": "Condición sobre el atributo «{attribute}» de {entity}: no compatible.",
    "Valore non numerico “{value}” per {entity}.": "Valor no numérico «{value}» para {entity}.",
    "La condizione di Scheduler era valutata solo all’inizio: ora vale per tutta la fascia.": "La condición de Scheduler solo se evaluaba al inicio: ahora vale para toda la franja.",
    "Il file non è un backup della weekly-schedule-card.": "El archivo no es una copia de weekly-schedule-card.",
    "Profilo WSC": "Perfil WSC",
    "Altri dispositivi": "Otros dispositivos",
    "Configurazione mancante nel backup.": "Falta la configuración en la copia.",
    "Schedule una tantum: non importato.": "Programación puntual: no importada.",
    "Giorni non riconosciuti.": "Días no reconocidos.",
    "“Giorni lavorativi” importati come lunedì–venerdì.": "«Días laborables» importados como lunes–viernes.",
    "Periodo {from} → {to} non supportato: vale tutto l’anno.": "Periodo {from} → {to} no compatible: vale todo el año.",
    "Fine gestita da uno schedule figlio della vecchia versione: controlla l’azione finale.": "Final gestionado por una programación hija de la versión antigua: revisa la acción final.",
    "Orario “{time}” non supportato.": "Hora «{time}» no compatible.",
    "Azione puntuale: diventa una fascia di un minuto.": "Acción puntual: se convierte en una franja de un minuto.",
    "Fascia di durata zero ignorata.": "Franja de duración cero ignorada.",
    "Fascia con più dispositivi: ignorata.": "Franja con varios dispositivos: ignorada.",
    "Comando non riconosciuto per {entity}.": "Orden no reconocida para {entity}.",
    "Fasce con azioni diverse: importata solo la prima azione.": "Franjas con acciones distintas: solo se importó la primera acción.",
    "Nessuna fascia importabile.": "Ninguna franja importable.",
    "Era disattivato nella weekly-schedule-card: resta disattivato.": "Estaba desactivado en weekly-schedule-card: sigue desactivado.",
    "Importato disattivato: completa la condizione e riattivalo.": "Importado desactivado: completa la condición y vuelve a activarlo.",
    "Quando la condizione è falsa viene eseguita l’azione finale.": "Cuando la condición es falsa se ejecuta la acción final.",
    "Lun": "Lun",
    "Mar": "Mar",
    "Mer": "Mié",
    "Gio": "Jue",
    "Ven": "Vie",
    "Sab": "Sáb",
    "Dom": "Dom",
    "Lunedì": "Lunes",
    "Martedì": "Martes",
    "Mercoledì": "Miércoles",
    "Giovedì": "Jueves",
    "Venerdì": "Viernes",
    "Sabato": "Sábado",
    "Domenica": "Domingo",
    "LUN": "LUN",
    "MAR": "MAR",
    "MER": "MIÉ",
    "GIO": "JUE",
    "VEN": "VIE",
    "SAB": "SÁB",
    "DOM": "DOM",
    "Alba": "Amanecer",
    "Tramonto": "Atardecer",
    "Spento": "Apagado",
    "Acceso": "Encendido",
    "Auto": "Auto",
    "Caldo/Freddo": "Calor/Frío",
    "Freddo": "Frío",
    "Caldo": "Calor",
    "Deumidifica": "Deshumidificar",
    "Acceso / Sì": "Encendido / Sí",
    "Spento / No": "Apagado / No",
    "A casa": "En casa",
    "Fuori casa": "Fuera de casa",
    "Subito": "Inmediato",
    "Casa": "Casa",
    "Soggiorno": "Salón",
    "Camera": "Dormitorio",
    "Cucina": "Cocina",
    "Bagno": "Baño",
    "Studio": "Estudio",
    "Garage": "Garaje",
    "Giardino": "Jardín",
    "Scale": "Escaleras",
    "Luci": "Luces",
    "Plafoniera": "Plafón",
    "Striscia LED": "Tira LED",
    "Termostato": "Termostato",
    "Clima": "Aire acondicionado",
    "Termosifone": "Radiador",
    "Tapparelle": "Persianas",
    "Tende": "Estores",
    "Presa": "Enchufe",
    "Boiler": "Calentador",
    "Lavatrice": "Lavadora",
    "TV": "TV",
    "Robot": "Robot",
    "Irrigazione": "Riego",
    "Notte": "Noche",
    "Lavoro": "Trabajo",
    "Vacanza": "Vacaciones",
    "Inverno": "Invierno",
    "Programma": "Programa",
  },
};
// Interface language. Italian text is the key; other languages come from
// i18n-strings.js and fall back to Italian for anything missing.


const LANGUAGES = ['it', 'en', 'fr', 'de', 'es'];
const LOCALES = {it: 'it-IT', en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES'};
let currentLanguage = 'it';

// Card option first, then the HA user language; unknown languages use English.
function setLanguage(hass, config) {
  const wanted = String(config?.language || hass?.locale?.language || hass?.language || 'it').toLowerCase().slice(0, 2);
  currentLanguage = LANGUAGES.includes(wanted) ? wanted : 'en';
  return currentLanguage;
}
const language = () => currentLanguage;
function translations() { return STRINGS; }
const locale = () => LOCALES[currentLanguage];

// t('Fino alle {time}', {time}) → "Until 18:00" in English.
function t(text, params) {
  const translated = currentLanguage === 'it' ? text : STRINGS[currentLanguage]?.[text] ?? text;
  return params ? translated.replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match)) : translated;
}
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

// Entities a card shows: groups, schedule targets, condition sensors, timers.
// Cached per state snapshot, which the adapter replaces on every change.
const watchedCache = new WeakMap();
function watchedEntities(state) {
  if (!state?.config) return null;
  if (watchedCache.has(state)) return watchedCache.get(state);
  const ids = new Set();
  const walk = (node) => { if (!node) return; if (node.entity_id) ids.add(node.entity_id); (node.children || []).forEach(walk); };
  for (const group of state.config.groups || []) for (const id of group.entity_ids || []) ids.add(id);
  for (const schedule of state.config.schedules || []) { for (const id of schedule.target_entity_ids || []) ids.add(id); walk(schedule.condition); }
  for (const timer of state.quick_timers || []) ids.add(timer.entity_id);
  watchedCache.set(state, ids);
  return ids;
}

// HA replaces a state object when it changes, so identity is enough. Updates of
// unrelated entities (many per second in a busy home) no longer re-render.
function hassChanged(previous, next, ids) {
  if (!previous || !ids || previous.connection !== next?.connection || previous.user !== next?.user || previous.config !== next?.config || previous.language !== next?.language) return true;
  for (const id of ids) if (previous.states?.[id] !== next.states?.[id]) return true;
  return false;
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

function diagnosticFor(error, { cardVersion, haVersion, phase, operation } = {}) {
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

function parseJson(text, label) {
  try { return JSON.parse(text); } catch { throw new Error(`${label}: ${t('JSON non valido.')}`); }
}
// UI-only builders. Execution, conditions and notifications belong to HA.


const uiEscape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const E = uiEscape;
const input = (name, label, value = '', type = 'text', attrs = '') => `<label>${label}<input name="${name}" type="${type}" value="${E(value)}" ${attrs}></label>`;
const choice = (name, label, values, selected) => `<label>${label}<select name="${name}">${values.map(([v,text]) => `<option value="${E(v)}" ${v === selected ? 'selected' : ''}>${E(text)}</option>`).join('')}</select></label>`;
const check = (name,label,checked) => `<label class="sc-check"><input type="checkbox" name="${name}" ${checked ? 'checked' : ''}>${label}</label>`;
const commands = {
  switch: {turn_on:'Accendi',turn_off:'Spegni'}, input_boolean: {turn_on:'Attiva',turn_off:'Disattiva'},
  light: {turn_on:'Accendi / regola luce',turn_off:'Spegni'},
  climate: {set_hvac_mode:'Modalità',set_temperature:'Temperatura e modalità',set_fan_mode:'Velocità ventola',set_preset_mode:'Preset'},
  fan: {turn_on:'Accendi',turn_off:'Spegni',set_percentage:'Velocità (%)',set_preset_mode:'Preset'},
  cover: {open_cover:'Apri',close_cover:'Chiudi',stop_cover:'Ferma',set_cover_position:'Posizione (%)'},
  valve: {open_valve:'Apri',close_valve:'Chiudi',stop_valve:'Ferma',set_valve_position:'Posizione (%)'},
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
  return `<fieldset><legend>${label}</legend>${check(`${prefix}_enabled`,t('Abilita notifica'),enabled)}<div ${enabled ? '' : 'hidden'}>${choice(`${prefix}_action`,t('Destinazione'),services.map((x)=>[x,x==='persistent_notification.create'?t('Notifica in Home Assistant'):x]),draft[`${prefix}_action`] ?? value?.action ?? services[0])}${input(`${prefix}_title`,t('Titolo'),draft[`${prefix}_title`] ?? value?.title ?? '')}${input(`${prefix}_message`,t('Messaggio'),draft[`${prefix}_message`] ?? value?.message ?? '')}</div></fieldset>`;
}
function readNotification(form,prefix) {
  return form.elements[`${prefix}_enabled`]?.checked ? {action:form.elements[`${prefix}_action`].value,title:form.elements[`${prefix}_title`].value,message:form.elements[`${prefix}_message`].value} : null;
}
// Desired-state action editor inspired by the weekly-schedule-card Quick Timer:
// mode buttons, sliders and option chips. HA executes; this only builds payloads.



const escA = uiEscape;
const APPLY_STATE = 'apply_state';
// End action that puts back the state captured when the slot started.
const RESTORE_PREVIOUS = 'restore_previous';
const intersect = (states, key) => states.length ? (states[0].attributes?.[key] || []).filter((value) => states.every((s) => (s.attributes?.[key] || []).includes(value))) : [];
const every = (states, test) => states.length > 0 && states.every(test);
const features = (s) => s.attributes?.supported_features || 0;
const modeLabels = {off:'Spento',on:'Acceso',auto:'Auto',heat_cool:'Caldo/Freddo',cool:'Freddo',heat:'Caldo',dry:'Deumidifica',fan_only:'Ventola',open:'Apri',close:'Chiudi',stop:'Ferma',position:'Posizione',none:'Nessuna azione',restore:'Stato precedente'};
const modeIcons = {off:'power',on:'power',auto:'autorenew',heat_cool:'sun-snowflake',cool:'snowflake',heat:'fire',dry:'water-percent',fan_only:'fan',open:'arrow-up',close:'arrow-down',stop:'stop',position:'tune-vertical',none:'minus-circle-outline',restore:'history'};
const pretty = (value) => (modeLabels[value] ? t(modeLabels[value]) : null) || String(value).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const round = (value, step) => Math.round(value / step) * step;
// Covers and valves share open/close/stop/position commands and feature bits.
const POSITION_ACTIONS = {
  cover: {open: 'open_cover', close: 'close_cover', stop: 'stop_cover', position: 'set_cover_position'},
  valve: {open: 'open_valve', close: 'close_valve', stop: 'stop_valve', position: 'set_valve_position'},
};

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
  } else if (POSITION_ACTIONS[domain]) {
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
  if (action.action === RESTORE_PREVIOUS) return {mode: 'restore'};
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
  if (POSITION_ACTIONS[domain]) {
    const mode = Object.keys(POSITION_ACTIONS[domain]).find((key) => POSITION_ACTIONS[domain][key] === action.action);
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
  if (POSITION_ACTIONS[caps.domain]) return {mode: caps.modes.includes('position') ? 'position' : caps.modes[0], position: a.current_position ?? 50};
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
  return `<div class="sc-field sc-stepper"><span class="sc-field-label" id="${name}-label">${escA(label)}</span><div class="sc-stepper-row"><button type="button" class="sc-step" data-command="stepValue" data-id="${name}:-1" aria-label="${t('Diminuisci')}">−</button><span class="sc-stepper-value"><input type="number" name="${name}" aria-labelledby="${name}-label" min="${min}" max="${max}" step="${step}" value="${v}" inputmode="decimal"><span>${escA(unit)}</span></span><button type="button" class="sc-step" data-command="stepValue" data-id="${name}:1" aria-label="${t('Aumenta')}">+</button></div><div class="sc-range-labels" aria-hidden="true"><span>${min}</span><span>${max}</span></div></div>`;
}

function describeState(state, domain) {
  if (!state) return '';
  const a = state.attributes || {};
  const parts = [{open: t('Aperta'), closed: t('Chiusa'), opening: t('In apertura'), closing: t('In chiusura')}[state.state] || pretty(state.state)];
  if (!['off', 'unknown', 'unavailable'].includes(state.state)) {
    if (domain === 'climate' && a.temperature != null && state.state !== 'fan_only') parts.push(`${a.temperature}${a.temperature_unit || '°C'}`);
    if (domain === 'climate' && a.fan_mode) parts.push(pretty(a.fan_mode));
    if (domain === 'light' && a.brightness != null) parts.push(`${Math.round(a.brightness / 255 * 100)}%`);
    if (domain === 'fan' && a.percentage != null) parts.push(`${a.percentage}%`);
    if (POSITION_ACTIONS[domain] && a.current_position != null) parts.push(`${a.current_position}%`);
  }
  return parts.join(' · ');
}

function actionForm(prefix, label, hass, ids, value, optional, draft = {}) {
  const caps = capabilities(hass, ids);
  const {domain} = caps;
  if (!domain) return `<fieldset><legend>${label}</legend><p>${t('Seleziona prima un’entità.')}</p></fieldset>`;
  const parsed = value === undefined || value === null ? (optional ? {mode: 'none'} : null) : actionToUi(domain, value, caps);
  const base = {...defaults(caps, false), ...(value ? parsed || {} : optional ? {mode: 'none'} : {})};
  const get = (key) => draft[`${prefix}_${key}`] ?? base[key];
  const pro = (draft[`${prefix}_pro`] ?? (value && !parsed ? 'on' : '')) === 'on';
  const modes = [...(optional ? ['none', 'restore'] : []), ...caps.modes];
  const mode = modes.includes(get('mode')) ? get('mode') : modes[0];
  const fields = [], more = [];
  const name = (key) => `${prefix}_${key}`;
  fields.push(choices(name('mode'), domain === 'climate' ? t('Modalità HVAC') : POSITION_ACTIONS[domain] ? t('Comando') : t('Stato'), modes, mode, {primary: true, icons: true}));
  if (domain === 'climate' && !['none', 'off', 'restore'].includes(mode)) {
    if (mode !== 'fan_only' && caps.temperature) fields.push(stepperField(name('temperature'), t('Temperatura'), get('temperature'), caps.min, caps.max, caps.step, caps.unit));
    if (mode !== 'fan_only' && caps.range) fields.push(stepperField(name('target_temp_low'), t('Minima'), get('target_temp_low'), caps.min, caps.max, caps.step, caps.unit), stepperField(name('target_temp_high'), t('Massima'), get('target_temp_high'), caps.min, caps.max, caps.step, caps.unit));
    fields.push(choices(name('fan_mode'), t('Ventola'), caps.fan_modes, get('fan_mode')));
    more.push(choices(name('preset_mode'), 'Preset', caps.preset_modes, get('preset_mode')));
    more.push(choices(name('swing_mode'), 'Swing', caps.swing_modes, get('swing_mode')));
    more.push(choices(name('swing_horizontal_mode'), t('Swing orizzontale'), caps.swing_horizontal_modes, get('swing_horizontal_mode')));
  }
  if (domain === 'light' && mode === 'on') {
    if (caps.dimmable) fields.push(rangeField(name('brightness_pct'), t('Luminosità'), get('brightness_pct') ?? 100, 1, 100, 1, '%'));
    const colors = [['', t('Non cambiare colore')], ...(caps.rgb ? [['rgb', t('Colore')]] : []), ...(caps.kelvin ? [['kelvin', t('Temperatura colore')]] : [])];
    const colorMode = get('color_mode') || '';
    if (colors.length > 1) fields.push(`<label>${t('Colore')}<select name="${name('color_mode')}">${colors.map(([v, text]) => `<option value="${v}" ${v === colorMode ? 'selected' : ''}>${text}</option>`).join('')}</select></label>`);
    if (colorMode === 'rgb') fields.push(`<label>${t('Colore')}<input name="${name('color')}" type="color" value="${escA(draft[name('color')] ?? (base.rgb_color ? '#' + base.rgb_color.map((v) => v.toString(16).padStart(2, '0')).join('') : '#ffffff'))}"></label>`);
    if (colorMode === 'kelvin') fields.push(rangeField(name('color_temp_kelvin'), t('Temperatura colore'), get('color_temp_kelvin') ?? 3000, caps.minK, caps.maxK, 50, 'K'));
  }
  if (domain === 'fan' && mode === 'on') {
    if (caps.speed) fields.push(rangeField(name('percentage'), t('Velocità'), get('percentage') ?? 50, 0, 100, 1, '%'));
    fields.push(choices(name('preset_mode'), 'Preset', caps.preset_modes, get('preset_mode')));
  }
  if (POSITION_ACTIONS[domain] && mode === 'position') fields.push(rangeField(name('position'), t('Posizione'), get('position') ?? 50, 0, 100, 1, '%'));
  const extra = more.filter(Boolean);
  const current = caps.states.length === 1 ? `<p class="sc-current">${t('Stato attuale')} <strong>${escA(describeState(caps.states[0], domain))}</strong></p>` : '';
  const json = draft[name('json')] ?? JSON.stringify(value ? {domain: value.domain, action: value.action, data: value.data} : {domain, action: domain === 'climate' ? APPLY_STATE : POSITION_ACTIONS[domain]?.open || 'turn_on', data: domain === 'climate' ? {state: mode} : {}}, null, 2);
  return `<fieldset class="sc-action" data-action="${prefix}" data-domain="${escA(domain)}"><legend>${label}</legend>${current}${pro ? `<p>${t('Azione personalizzata conservata in modalità Pro.')}</p>` : ''}<div class="sc-action-fields" ${pro ? 'hidden' : ''}>${fields.join('')}${extra.length ? `<details class="sc-more" data-section="${prefix}-more"><summary>${t('Altre opzioni')}</summary>${extra.join('')}</details>` : ''}</div><details data-section="${prefix}-pro"><summary>${t('Pro · azione personalizzata')}</summary>${check(name('pro'), t('Usa JSON al posto dei controlli'), pro)}<label>${t('Azione JSON')}<textarea name="${name('json')}" rows="4">${escA(json)}</textarea></label></details></fieldset>`;
}

function readAction(form, prefix, domain) {
  const el = (key) => form.elements[`${prefix}_${key}`];
  // Radio groups come back as RadioNodeList; plain objects are accepted in tests.
  const val = (key) => el(key)?.value;
  const num = (key) => (val(key) === undefined || val(key) === '' ? undefined : Number(val(key)));
  if (el('pro')?.checked) {
    const a = JSON.parse(val('json'));
    if (!a || a.domain !== domain || !a.action || !a.data || typeof a.data !== 'object' || Array.isArray(a.data)) throw new Error(t('Azione Pro non valida per le entità selezionate.'));
    if (['entity_id', 'device_id', 'area_id'].some((k) => k in a.data)) throw new Error(t('Il target è già definito dalle entità selezionate.'));
    if (a.action === APPLY_STATE && typeof a.data.state !== 'string') throw new Error(t('apply_state richiede il campo "state".'));
    return {domain: a.domain, action: a.action, data: a.data};
  }
  const mode = val('mode');
  if (mode === 'none') return null;
  if (mode === 'restore') return {domain, action: RESTORE_PREVIOUS, data: {}};
  if (!mode) throw new Error(t('Scegli cosa deve fare il dispositivo.'));
  const data = {};
  const put = (key, value) => { if (value !== undefined && value !== '') data[key] = value; };
  let action;
  if (domain === 'climate') {
    action = APPLY_STATE; data.state = mode;
    if (mode !== 'off') {
      if (mode !== 'fan_only') { put('temperature', num('temperature')); put('target_temp_low', num('target_temp_low')); put('target_temp_high', num('target_temp_high')); }
      for (const key of ['fan_mode', 'preset_mode', 'swing_mode', 'swing_horizontal_mode']) put(key, val(key));
    }
  } else if (POSITION_ACTIONS[domain]) {
    action = POSITION_ACTIONS[domain][mode];
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
  if (!action) throw new Error(t('Comando non disponibile per questo dispositivo.'));
  if (/^set_(cover|valve)_position$/.test(action) && data.position === undefined) throw new Error(t('Indica la posizione richiesta.'));
  if (Object.values(data).some((v) => typeof v === 'number' && !Number.isFinite(v))) throw new Error(t('Inserisci un valore numerico valido.'));
  return {domain, action, data};
}

// Short human text used for suggested names and notification messages.
function describeAction(action) {
  if (!action) return '';
  if (action.action === RESTORE_PREVIOUS) return t('Stato precedente');
  const d = action.data || {};
  if (action.action === APPLY_STATE) {
    const parts = [pretty(d.state)];
    if (d.temperature != null) parts.push(`${d.temperature}°`);
    if (d.target_temp_low != null && d.target_temp_high != null) parts.push(`${d.target_temp_low}–${d.target_temp_high}°`);
    if (d.fan_mode) parts.push(t('ventola {mode}', {mode: pretty(d.fan_mode).toLowerCase()}));
    return parts.join(' ');
  }
  const base = {turn_on: t('Accendi'), turn_off: t('Spegni'), open_cover: t('Apri'), close_cover: t('Chiudi'), stop_cover: t('Ferma'), set_cover_position: t('Posizione {value}%', {value: d.position}), open_valve: t('Apri'), close_valve: t('Chiudi'), stop_valve: t('Ferma'), set_valve_position: t('Posizione {value}%', {value: d.position}), set_hvac_mode: pretty(d.hvac_mode), set_temperature: `${d.temperature ?? ''}°`, set_percentage: t('Velocità {value}%', {value: d.percentage})}[action.action] || pretty(action.action);
  const extra = d.brightness_pct != null ? ` ${d.brightness_pct}%` : d.percentage != null && action.action === 'turn_on' ? ` ${d.percentage}%` : '';
  return base + extra;
}
// Convert a weekly-schedule-card backup (schema weekly-schedule-card/backup v1)
// into Schedule Creator drafts for schedule_creator/import/merge. Pure: the
// card shows the result for review and the backend validates everything again.



const WSC_SCHEMA = 'weekly-schedule-card/backup';
const WSC_DAYS = {mon: [0], tue: [1], wed: [2], thu: [3], fri: [4], sat: [5], sun: [6], daily: [0, 1, 2, 3, 4, 5, 6], workday: [0, 1, 2, 3, 4], weekend: [5, 6]};
const WSC_MARKER = 'WSC conditional v1';
const WSC_OPERATORS = {'>': 'numeric_greater', '<': 'numeric_less', '>=': 'numeric_greater_or_equal', '<=': 'numeric_less_or_equal', '==': 'state_equals', '!=': 'state_not_equals'};
const WSC_SCHEDULER_MATCH = {is: 'state_equals', not: 'state_not_equals', above: 'numeric_greater', below: 'numeric_less'};
const WSC_POSITION = new Set(['cover', 'valve']);
const wscTime = (value) => /^\d{2}:\d{2}(:\d{2})?$/.test(String(value || '')) ? String(value).slice(0, 5) : null;
const wscClock = (m) => `${String(Math.floor(((m % 1440) + 1440) % 1440 / 60)).padStart(2, '0')}:${String(((m % 60) + 60) % 60).padStart(2, '0')}`;
// Scheduler boundary: "07:30", or "sunrise+00:30" / "sunset-01:00" (seconds optional).
// Sun boundaries keep an approximate time from today's sun for the week views.
function wscBoundary(value, sun) {
  const fixed = wscTime(value);
  if (fixed) return {time: fixed};
  const m = /^(sunrise|sunset)([+-])(\d{2}):(\d{2})(?::\d{2})?$/.exec(String(value || ''));
  if (!m) return null;
  const offset = (m[2] === '-' ? -1 : 1) * (Number(m[3]) * 60 + Number(m[4]));
  if (Math.abs(offset) > 360) return null;
  const base = sun?.[m[1]] ?? (m[1] === 'sunrise' ? 390 : 1140);
  return {time: wscClock(base + offset), sun: m[1], offset};
}

function isWscBackup(value) {
  return !!value && typeof value === 'object' && value.schema === WSC_SCHEMA && value.version === 1 && !!value.profileData && Array.isArray(value.schedules);
}

// Service calls of a Scheduler timeslot; conditional schedules keep the real
// calls JSON-encoded inside a logbook.log marker.
function wscSlotCalls(slot) {
  const actions = slot?.actions || [];
  const first = actions[0], data = first?.service_data || first?.data || {};
  if (actions.length === 1 && first?.service === 'logbook.log' && data.name === WSC_MARKER) {
    try { return JSON.parse(data.message); } catch { return []; }
  }
  return actions;
}
const wscCallEntity = (call) => {
  const id = call?.entity_id ?? call?.target?.entity_id ?? (call?.service_data || call?.data || {}).entity_id;
  return Array.isArray(id) ? id : id ? [id] : [];
};
const wscCallData = (call) => { const {entity_id: _drop, ...rest} = call?.service_data || call?.data || {}; return rest; };

// Start action for one entity from its service calls.
function wscStartAction(calls, entityId, extras, notes) {
  const domain = entityId.split('.')[0];
  const services = calls.map((c) => [String(c.service || ''), wscCallData(c)]);
  if (domain === 'climate') {
    const state = {}, get = (name) => services.find(([s]) => s === `climate.${name}`)?.[1];
    if (get('turn_off')) return {domain, action: 'apply_state', data: {state: 'off'}};
    const temp = get('set_temperature') || {};
    const mode = get('set_hvac_mode')?.hvac_mode || temp.hvac_mode || extras?.hvacMode;
    for (const key of ['temperature', 'target_temp_low', 'target_temp_high']) if (temp[key] != null) state[key] = Number(temp[key]);
    const fan = get('set_fan_mode')?.fan_mode || extras?.fanMode, swing = get('set_swing_mode')?.swing_mode || extras?.swingMode, preset = get('set_preset_mode')?.preset_mode || extras?.presetMode;
    if (fan) state.fan_mode = fan;
    if (swing) state.swing_mode = swing;
    if (preset) state.preset_mode = preset;
    if (mode) return {domain, action: 'apply_state', data: mode === 'off' ? {state: 'off'} : {state: mode, ...state}};
    // Temperature only: the device keeps its current mode, as in WSC.
    if (Object.keys(state).length) { notes.push(t('Solo temperatura: la modalità resta quella del dispositivo.')); return {domain, action: 'set_temperature', data: state}; }
    return null;
  }
  const own = services.filter(([s]) => s.split('.')[0] === domain);
  const generic = services.filter(([s]) => /^homeassistant\.turn_(on|off)$/.test(s)).map(([s, d]) => [`${domain}.${s.split('.')[1]}`, d]);
  const usable = own.length ? own : generic;
  if (!usable.length) return null;
  if (usable.length > 1) notes.push(t('Più comandi nella fascia: importato solo “{service}”.', {service: usable[0][0]}));
  const [service, data] = usable[0];
  return {domain, action: service.split('.')[1], data};
}

// WSC "at the end" choice (link.stopAction/stopValue) as an end action.
function wscEndAction(link, entityId) {
  const type = link?.stopAction, v = link?.stopValue, domain = entityId.split('.')[0];
  if (!type) return null;
  const act = (d, action, data = {}) => ({domain: d, action, data});
  switch (type) {
    case 'turn_off': return domain === 'climate' ? act(domain, 'apply_state', {state: 'off'}) : act(domain, 'turn_off');
    case 'turn_on': return act(domain, 'turn_on');
    case 'set_temperature': return act(domain, 'set_temperature', {temperature: Number(v)});
    case 'set_hvac_mode': return act('climate', 'apply_state', {state: String(v)});
    case 'set_preset_mode': case 'set_fan_mode': case 'set_swing_mode': return act('climate', type, {[type.slice(4)]: v});
    case 'set_brightness': return act('light', 'turn_on', {brightness_pct: Number(v)});
    case 'set_color_temp': return act('light', 'turn_on', {color_temp_kelvin: Number(v)});
    case 'set_color': { const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(v || '')); return act('light', 'turn_on', {rgb_color: m ? m.slice(1).map((x) => parseInt(x, 16)) : [255, 255, 255]}); }
    case 'set_speed': return act('fan', 'set_percentage', {percentage: Number(v)});
    case 'set_humidity': return act('humidifier', 'set_humidity', {humidity: Number(v)});
    case 'set_hum_mode': return act('humidifier', 'set_mode', {mode: v});
    case 'set_operation_mode': return act('water_heater', 'set_operation_mode', {operation_mode: v});
    case 'set_position': return WSC_POSITION.has(domain) ? act(domain, `set_${domain}_position`, {position: Number(v)}) : null;
    case 'open': case 'close': case 'stop': return WSC_POSITION.has(domain) ? act(domain, `${type}_${domain}`) : null;
    default: return null;
  }
}

const wscLeaf = (operator, entity_id, value, hysteresis = null) => ({operator, entity_id, value, lower: null, upper: null, children: [], minimum_duration_seconds: null, hysteresis});
const wscCombine = (nodes, operator) => nodes.length === 1 ? nodes[0] : {operator, entity_id: null, value: null, lower: null, upper: null, children: nodes, minimum_duration_seconds: null, hysteresis: null};

// One comparison; null with a note when Schedule Creator cannot express it.
function wscConditionLeaf(entity, attribute, operator, raw, hysteresis, notes) {
  if (!entity || !operator) { notes.push(t('Condizione incompleta ignorata.')); return null; }
  if (attribute) { notes.push(t('Condizione sull’attributo “{attribute}” di {entity}: non supportata.', {attribute, entity})); return null; }
  if (operator.startsWith('numeric')) {
    const value = Number(raw);
    if (!Number.isFinite(value)) { notes.push(t('Valore non numerico “{value}” per {entity}.', {value: raw, entity})); return null; }
    const band = Number(hysteresis);
    return wscLeaf(operator, entity, value, Number.isFinite(band) && band > 0 ? band : null);
  }
  return wscLeaf(operator, entity, String(raw ?? ''));
}

function wscConditionOf(link, slot, notes) {
  const nodes = [];
  let broken = false;
  for (const c of link?.conditions || []) {
    const node = wscConditionLeaf(c.entity, c.attribute, WSC_OPERATORS[c.operator], c.value, c.hysteresis, notes);
    if (node) nodes.push(node); else broken = true;
  }
  const own = (slot?.conditions || []).map((c) => wscConditionLeaf(c.entity_id, c.attribute, WSC_SCHEDULER_MATCH[c.match_type], c.value, null, notes));
  if (own.length) {
    if (own.some((x) => !x)) broken = true;
    const valid = own.filter(Boolean);
    if (valid.length) {
      nodes.push(wscCombine(valid, slot.condition_type === 'or' ? 'or' : 'and'));
      if (!slot.track_conditions) notes.push(t('La condizione di Scheduler era valutata solo all’inizio: ora vale per tutta la fascia.'));
    }
  }
  if (!nodes.length) return {condition: null, broken};
  const operator = link?.conditions?.length && link.condCombinator === 'or' && !own.length ? 'or' : 'and';
  return {condition: wscCombine(nodes, operator), broken};
}

const wscNotifyAction = (service) => { const s = String(service || '').trim(); return !s ? null : s.includes('.') ? s : `notify.${s}`; };

// Returns {profiles: drafts for import/merge, rows: one line per source schedule}.
function convertWscBackup(backup, {existingProfileNames = [], entityName = (id) => id, sun = null} = {}) {
  if (!isWscBackup(backup)) throw new Error(t('Il file non è un backup della weekly-schedule-card.'));
  const byId = new Map(backup.schedules.map((s) => [s.entityId, s.config]));
  const used = new Set(existingProfileNames.map((n) => String(n).toLowerCase()));
  const active = new Set(backup.profileData.activeProfiles || []);
  const rows = [], profiles = [];
  for (const source of backup.profileData.profiles || []) {
    let name = String(source.name || t('Profilo WSC')).trim() || t('Profilo WSC');
    if (used.has(name.toLowerCase())) name = `${name} (WSC)`;
    used.add(name.toLowerCase());
    const wscGroups = (source.groups?.length ? source.groups : backup.profileData.groups) || [];
    const names = new Map(wscGroups.flatMap((g) => (g.entities || []).map((e) => [e.entity, e.name])));
    const label = (id) => names.get(id) || entityName(id);
    const groups = wscGroups.map((g) => ({name: String(g.name || t('Gruppo')), color: /^#[0-9a-f]{6}$/i.test(g.color || '') ? g.color : null, entity_ids: [...new Set((g.entities || []).map((e) => e.entity).filter(Boolean))], schedules: []}));
    const groupFor = (entityId) => {
      let group = groups.find((g) => g.entity_ids.includes(entityId));
      if (!group) { group = groups.find((g) => g.name === t('Altri dispositivi')) || {name: t('Altri dispositivi'), color: null, entity_ids: [], schedules: []}; if (!groups.includes(group)) groups.push(group); group.entity_ids.push(entityId); }
      return group;
    };
    const links = new Map((source.scheduleLinks || []).map((l) => [l.id, l]));
    const taken = new Set();
    for (const id of source.schedules || []) {
      const config = byId.get(id), link = links.get(id) || {};
      const row = {profile: name, source: config?.name || id, status: 'ok', notes: []};
      rows.push(row);
      const skip = (why) => { row.status = 'skip'; row.notes.push(why); };
      if (!config) { skip(t('Configurazione mancante nel backup.')); continue; }
      if (link.oneShot || config.repeat_type === 'single') { skip(t('Schedule una tantum: non importato.')); continue; }
      const days = [...new Set((config.weekdays || []).flatMap((d) => WSC_DAYS[d] || []))].sort((a, b) => a - b);
      if (!days.length) { skip(t('Giorni non riconosciuti.')); continue; }
      if ((config.weekdays || []).includes('workday')) row.notes.push(t('“Giorni lavorativi” importati come lunedì–venerdì.'));
      if (config.start_date || config.end_date) row.notes.push(t('Periodo {from} → {to} non supportato: vale tutto l’anno.', {from: config.start_date || '…', to: config.end_date || '…'}));
      if (link.autoChildId) row.notes.push(t('Fine gestita da uno schedule figlio della vecchia versione: controlla l’azione finale.'));
      const slots = [];
      let start = null, entityId = null;
      for (const slot of config.timeslots || []) {
        const calls = wscSlotCalls(slot), entities = [...new Set(calls.flatMap(wscCallEntity))];
        const first = wscBoundary(slot.start, sun);
        if (!first) { row.notes.push(t('Orario “{time}” non supportato.', {time: slot.start})); continue; }
        let last = slot.stop ? wscBoundary(slot.stop, sun) : null;
        if (slot.stop && !last) { row.notes.push(t('Orario “{time}” non supportato.', {time: slot.stop})); continue; }
        if (!last) {
          last = first.sun ? {time: wscClock(Number(first.time.slice(0, 2)) * 60 + Number(first.time.slice(3)) + 1), sun: first.sun, offset: first.offset + 1} : {time: wscClock(Number(first.time.slice(0, 2)) * 60 + Number(first.time.slice(3)) + 1)};
          row.notes.push(t('Azione puntuale: diventa una fascia di un minuto.'));
        }
        const from = first.time, to = last.time;
        if (!first.sun && !last.sun && from === to) { row.notes.push(t('Fascia di durata zero ignorata.')); continue; }
        if (entities.length !== 1 || (entityId && entities[0] !== entityId)) { row.notes.push(t('Fascia con più dispositivi: ignorata.')); continue; }
        const action = wscStartAction(calls, entities[0], link.extras, row.notes);
        if (!action) { row.notes.push(t('Comando non riconosciuto per {entity}.', {entity: entities[0]})); continue; }
        if (start && JSON.stringify(start) !== JSON.stringify(action)) { row.notes.push(t('Fasce con azioni diverse: importata solo la prima azione.')); continue; }
        start = action; entityId = entities[0];
        const entry = {weekdays: days, start: from, end: to};
        if (first.sun) Object.assign(entry, {start_sun: first.sun, start_offset_minutes: first.offset});
        if (last.sun) Object.assign(entry, {end_sun: last.sun, end_offset_minutes: last.offset});
        slots.push(entry);
      }
      if (!slots.length) { skip(row.notes.pop() || t('Nessuna fascia importabile.')); continue; }
      const {condition, broken} = wscConditionOf(link, (config.timeslots || [])[0], row.notes);
      const draft = {
        name: '', enabled: config.enabled !== false, target_entity_ids: [entityId], time_slots: slots, start_action: start,
        end_action: wscEndAction(link, entityId), condition,
        override_policy: link.overrideEnabled ? 'manual_override' : 'cooperative',
        start_notification: null, end_notification: null,
      };
      if (config.enabled === false) { row.status = 'off'; row.notes.push(t('Era disattivato nella weekly-schedule-card: resta disattivato.')); }
      if (broken) { draft.enabled = false; row.status = 'off'; row.notes.push(t('Importato disattivato: completa la condizione e riattivalo.')); }
      const conditionNote = t('Quando la condizione è falsa viene eseguita l’azione finale.');
      if (condition) row.notes.push(conditionNote);
      const service = wscNotifyAction(link.notifyService), trigger = link.notifyTrigger || 'start';
      if (service && trigger !== 'end' && link.notifyMessage) draft.start_notification = {action: service, title: '', message: link.notifyMessage};
      if (service && trigger !== 'start' && link.notifyMessageEnd) draft.end_notification = {action: service, title: '', message: link.notifyMessageEnd};
      let title = `${label(entityId)} · ${describeAction(start)}`;
      if (taken.has(title)) title = `${title} ${slots[0].start}`;
      taken.add(title);
      draft.name = title;
      Object.assign(row, {name: title, entity: entityId, slots, start, end: draft.end_action, condition, enabled: draft.enabled});
      if (row.status === 'ok' && row.notes.some((n) => n !== conditionNote)) row.status = 'note';
      groupFor(entityId).schedules.push(draft);
    }
    const kept = groups.filter((g) => g.entity_ids.length);
    profiles.push({name, profile_type: source.exclusive === false ? 'shared' : 'exclusive', color: null, groups: kept, wasActive: active.has(source.id)});
  }
  return {profiles, rows};
}

// Payload without the preview-only fields.
function wscImportPayload(converted, backup) {
  return {source: 'weekly-schedule-card', source_created_at: typeof backup?.createdAt === 'string' ? backup.createdAt : null,
    profiles: converted.profiles.map(({wasActive: _a, ...p}) => p)};
}
// Schedule editor widgets modelled on weekly-schedule-card: time bar with magnets,
// day shortcuts, entity-first conditions, icon and colour pickers.



const escS = uiEscape;
const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const DAY_SHORTCUTS = {all: [0, 1, 2, 3, 4, 5, 6], workdays: [0, 1, 2, 3, 4], weekend: [5, 6]};
const SNAP_OPTIONS = [5, 10, 15, 30];
const toMinutes = (value) => { const [h, m] = String(value || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
const toTime = (minutes) => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const SUN_LABELS = {sunrise: 'Alba', sunset: 'Tramonto'};

// Today's sunrise and sunset in minutes of the HA day, from sun.sun; null
// without the sun integration. Used only to show sun-based slots.
function sunMinutes(hass) {
  const a = hass?.states?.['sun.sun']?.attributes;
  if (!a?.next_rising || !a?.next_setting) return null;
  const at = (iso) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone: hass.config?.time_zone || undefined, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
    return Number(p.hour) * 60 + Number(p.minute);
  };
  return {sunrise: at(a.next_rising), sunset: at(a.next_setting)};
}
const signed = (m) => `${m < 0 ? '−' : '+'}${Math.abs(m)}′`;
// "Tramonto −30′" for a sun boundary, the time otherwise.
function boundaryLabel(slot, side) {
  const event = slot[`${side}_sun`];
  if (!event) return String(slot[side] || '').slice(0, 5);
  const offset = slot[`${side}_offset_minutes`] || 0;
  return `${t(SUN_LABELS[event])}${offset ? ` ${signed(offset)}` : ''}`;
}

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
  return `<div class="sc-timebar" data-timebar="${i}" data-magnets="${magnets.join(',')}" data-snap="${snap}">${blocks.map((b) => `<div class="sc-tb-bg" title="${escS(`${b.name} ${toTime(b.from)}–${toTime(b.to)}`)}" style="left:${pct(b.from)};width:${pct(b.to - b.from)};--block-color:${b.color}"></div>`).join('')}${magnets.map((m) => `<div class="sc-tb-magnet" data-min="${m}" style="left:${pct(m)}"></div>`).join('')}${edit}</div><div class="sc-tb-ticks" aria-hidden="true">${[0, 6, 12, 18, 24].map((h) => `<span>${String(h).padStart(2, '0')}:00</span>`).join('')}</div><p>${overnight ? t('Fascia a cavallo della mezzanotte: modifica gli orari nei campi qui sotto.') : blocks.length ? t('Trascina la fascia o le maniglie: si aggancia agli inizi/fini degli altri schedule (magnete).') : t('Trascina la fascia o le maniglie per cambiare gli orari.')}</p>`;
}

function slotsForm(slots, {others = [], snap = 15} = {}) {
  const snapRow = `<div class="sc-snap" role="group" aria-label="${t('Passo di aggancio')}"><span>${t('Passo')}</span>${SNAP_OPTIONS.map((s) => `<button type="button" class="sc-pill${s === snap ? ' is-selected' : ''}" data-command="setSnap" data-id="${s}" aria-pressed="${s === snap}">${s} min</button>`).join('')}</div>`;
  return snapRow + slots.map((slot, i) => {
    const key = slot.weekdays.join('');
    const shortcuts = [['all', t('Tutti')], ['workdays', t('Feriali')], ['weekend', t('Weekend')]].map(([id, label]) => `<button type="button" class="sc-pill${DAY_SHORTCUTS[id].join('') === key ? ' is-selected' : ''}" data-command="slotDays" data-id="${i}:${id}">${label}</button>`).join('');
    const days = DAY_LABELS.map((d, day) => `<label class="sc-day-chip"><input type="checkbox" name="slot_${i}_days" value="${day}" ${slot.weekdays.includes(day) ? 'checked' : ''}><span>${t(d)}</span></label>`).join('');
    const siblings = slots.filter((_, j) => j !== i).map((s) => ({...s, name: t('Altra fascia di questo schedule'), color: '#8a96a3'}));
    return `<fieldset data-slot="${i}"><legend>${t('Fascia {n}', {n: i + 1})}</legend>${timebar(i, slot, [...others, ...siblings], snap)}<div class="sc-time-row">${boundaryField(i, 'start', t('Inizio'), slot)}${boundaryField(i, 'end', t('Fine'), slot)}</div><div class="sc-shortcuts">${shortcuts}</div><div class="sc-days">${days}</div>${slots.length > 1 ? `<button type="button" data-command="removeSlot" data-id="${i}">${t('Rimuovi fascia')}</button>` : ''}</fieldset>`;
  }).join('') + `<button type="button" data-command="addSlot">＋ ${t('Fascia successiva')}</button>`;
}

// A boundary is a fixed time or sunrise/sunset with an offset in minutes.
function boundaryField(i, side, label, slot) {
  const event = slot[`${side}_sun`] || '';
  const kind = `<select name="slot_${i}_${side}_sun" aria-label="${label}: ${t('riferimento')}">${[['', t('Orario')], ['sunrise', t(SUN_LABELS.sunrise)], ['sunset', t(SUN_LABELS.sunset)]].map(([v, text]) => `<option value="${v}" ${v === event ? 'selected' : ''}>${text}</option>`).join('')}</select>`;
  const value = event
    ? `<input name="slot_${i}_${side}_offset" type="number" min="-360" max="360" step="5" value="${escS(slot[`${side}_offset_minutes`] ?? 0)}" aria-label="${label}: ${t('minuti prima (−) o dopo (+)')}"><input type="hidden" name="slot_${i}_${side}" value="${escS(slot[side])}"><small>${t('min · ≈ {time} oggi', {time: escS(String(slot[side] || '').slice(0, 5))})}</small>`
    : `<input name="slot_${i}_${side}" type="time" value="${escS(slot[side])}">`;
  return `<div class="sc-bound"><span class="sc-field-label">${label}</span><div class="sc-bound-row">${kind}${value}</div></div>`;
}

function readSlots(form, sun = null) {
  return [...form.querySelectorAll('[data-slot]')].map((node) => {
    const i = node.dataset.slot;
    const slot = {weekdays: [...node.querySelectorAll('input[type=checkbox]:checked')].map((x) => Number(x.value)), start: form.elements[`slot_${i}_start`].value, end: form.elements[`slot_${i}_end`].value};
    for (const side of ['start', 'end']) {
      const event = form.elements[`slot_${i}_${side}_sun`]?.value;
      if (!event) continue;
      const offset = Math.max(-360, Math.min(360, Math.round(Number(form.elements[`slot_${i}_${side}_offset`]?.value) || 0)));
      slot[`${side}_sun`] = event;
      slot[`${side}_offset_minutes`] = offset;
      // Approximate time for the week views; the integration uses the real sun.
      if (sun?.[event] != null) slot[side] = toTime((sun[event] + offset + 1440) % 1440);
    }
    return slot;
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
  if (domain === 'cover' || domain === 'valve') return {kind: 'select', options: ['open', 'closed', 'opening', 'closing'], current: state.state};
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
const valueLabel = (value) => (valueLabels[value] ? t(valueLabels[value]) : value);
const DURATIONS = [[0, 'Subito'], [60, '1 min'], [300, '5 min'], [600, '10 min'], [900, '15 min'], [1800, '30 min']];
const durations = () => DURATIONS.map(([s, label]) => [s, s ? label : t(label)]);
const radios = (name, options, selected, cls = 'sc-choices') => `<div class="${cls}" role="radiogroup">${options.map(([v, label]) => `<label class="sc-choice${String(v) === String(selected) ? ' is-selected' : ''}"><input type="radio" name="${name}" value="${escS(v)}" ${String(v) === String(selected) ? 'checked' : ''}><span>${escS(label)}</span></label>`).join('')}</div>`;

function leafForm(node, path, hass) {
  const friendly = (id) => hass.states?.[id]?.attributes?.friendly_name || id;
  const entity = `<label>${t('1 · Entità da controllare')}<input name="${path}_entity_id" value="${escS(node.entity_id || '')}" list="sc-condition-entities" placeholder="${t('Cerca per nome o ID')}" autocomplete="off"></label>`;
  const remove = `<button type="button" data-command="removeCondition" data-id="${path}">${t('Rimuovi condizione')}</button>`;
  const spec = conditionKind(hass, node.entity_id);
  if (spec.kind === 'none') return `<fieldset class="sc-condition" data-condition="${path}"><input type="hidden" name="${path}_operator" value="${escS(node.operator)}">${entity}<p>${t('Scegli un’entità: poi vedrai solo i confronti possibili (acceso/spento, maggiore/minore…).')}</p>${remove}</fieldset>`;
  const now = `<p class="sc-current">${t('Ora')} <strong>${escS(friendly(node.entity_id))}: ${escS(spec.kind === 'numeric' ? spec.current : valueLabel(spec.current))}${spec.unit ? ` ${escS(spec.unit)}` : ''}</strong></p>`;
  let body;
  if (spec.kind === 'numeric') {
    const ops = [['numeric_greater', '>'], ['numeric_greater_or_equal', '≥'], ['numeric_less', '<'], ['numeric_less_or_equal', '≤'], ['numeric_range', t('tra')], ['available', t('disponibile')]];
    const op = ops.some(([v]) => v === node.operator) ? node.operator : 'numeric_greater';
    const limits = `step="${spec.step}"${spec.min != null ? ` min="${spec.min}"` : ''}${spec.max != null ? ` max="${spec.max}"` : ''}`;
    const unit = spec.unit ? ` (${escS(spec.unit)})` : '';
    const values = op === 'numeric_range'
      ? `<div class="sc-time-row"><label>${t('Da')}${unit}<input name="${path}_lower" type="number" ${limits} value="${escS(node.lower ?? '')}"></label><label>${t('A')}${unit}<input name="${path}_upper" type="number" ${limits} value="${escS(node.upper ?? '')}"></label></div>`
      : op === 'available' ? '' : `<label>${t('3 · Valore')}${unit}<input name="${path}_value" type="number" ${limits} value="${escS(node.value ?? '')}" placeholder="${escS(spec.current)}"></label>`;
    const reference = op === 'numeric_range' ? node.lower : node.value;
    const hysteresis = op === 'available' ? '' : `<label>${t('Isteresi')}${unit}<input name="${path}_hysteresis" type="number" min="0" step="0.1" value="${escS(node.hysteresis ?? defaultHysteresis(spec.unit, reference ?? spec.current))}"></label><p>${t('Margine anti-oscillazione: una volta vera, la condizione torna falsa solo oltre la soglia ± isteresi.')}</p>`;
    body = `<div class="sc-field"><span class="sc-field-label">${t('2 · Confronto')}</span>${radios(`${path}_operator`, ops, op)}</div>${values}${hysteresis}`;
  } else {
    const ops = [['state_equals', t('è')], ['state_not_equals', t('non è')], ['available', t('disponibile')]];
    const op = ops.some(([v]) => v === node.operator) ? node.operator : 'state_equals';
    const options = [...new Set([...spec.options, ...(node.value != null && node.value !== '' ? [String(node.value)] : [])])];
    const value = op === 'available' ? '' : spec.free
      ? `<label>${t('3 · Valore')}<input name="${path}_value" value="${escS(node.value ?? spec.current ?? '')}"></label>`
      : `<div class="sc-field"><span class="sc-field-label">${t('3 · Valore')}</span>${radios(`${path}_value`, options.map((v) => [v, valueLabel(v)]), node.value ?? options[0])}</div>`;
    body = `<div class="sc-field"><span class="sc-field-label">${t('2 · Confronto')}</span>${radios(`${path}_operator`, ops, op)}</div>${value}`;
  }
  const presets = (seconds) => [...durations(), ...(DURATIONS.some(([s]) => s === seconds) ? [] : [[seconds, `${Math.round(seconds / 60 * 10) / 10} min`]])];
  const duration = Number(node.minimum_duration_seconds || 0), release = Number(node.release_delay_seconds || 0);
  const durationField = `<div class="sc-field"><span class="sc-field-label">${t('Diventa vera dopo')}</span>${radios(`${path}_minimum_duration_seconds`, presets(duration), duration)}</div><div class="sc-field"><span class="sc-field-label">${t('Torna falsa dopo')}</span>${radios(`${path}_release_delay_seconds`, presets(release), release)}<p>${t('Evita avanti e indietro: la condizione cambia solo se resta vera (o falsa) per questo tempo. Esempio tende: chiudi dopo 10 min sopra 500 lx, riapri dopo 15 min sotto.')}</p></div>`;
  return `<fieldset class="sc-condition" data-condition="${path}">${entity}${now}${body}${durationField}${remove}</fieldset>`;
}

function conditionForm(node, hass, path = 'condition') {
  if (!node) return `<p>${t('Nessuna condizione: lo schedule esegue sempre nelle sue fasce.')}</p><button type="button" data-command="addCondition">＋ ${t('Condizione')}</button>`;
  if (!['and', 'or'].includes(node.operator)) return `${leafForm(node, path, hass)}${path === 'condition' ? `<button type="button" data-command="addCondition">＋ ${t('Altra condizione')}</button>` : ''}`;
  const group = `<div class="sc-field"><span class="sc-field-label">${t('Quando vale lo schedule')}</span>${radios(`${path}_operator`, [['and', t('Tutte le condizioni')], ['or', t('Almeno una')]], node.operator)}</div>`;
  return `<div class="sc-condition-group" data-condition="${path}">${group}${node.children.map((child, i) => conditionForm(child, hass, `${path}.${i}`)).join('')}<button type="button" data-command="${path === 'condition' ? 'addCondition' : 'addConditionChild'}" data-id="${path}">＋ ${t('Altra condizione')}</button></div>`;
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
  const options = [['', t('Nessuna'), ''], ...ICONS.map(([id, label]) => [`mdi:${id}`, t(label), id]), ...(value && !known ? [[selected, value, value]] : [])];
  return `<div class="sc-field"><span class="sc-field-label">${t('Icona')}</span><div class="sc-icon-grid" role="radiogroup" aria-label="${t('Icona')}">${options.map(([v, label, icon]) => `<label class="sc-icon-choice${(selected || '') === v ? ' is-selected' : ''}" title="${escS(label)}"><input type="radio" name="icon" value="${escS(v)}" ${(selected || '') === v ? 'checked' : ''}>${icon ? `<ha-icon icon="mdi:${escS(icon)}" aria-hidden="true"></ha-icon>` : '<span aria-hidden="true">∅</span>'}<small>${escS(label)}</small></label>`).join('')}</div></div>`;
}

function colorPicker(selected) {
  const value = (selected || '').toLowerCase();
  const custom = value && !COLORS.includes(value);
  return `<div class="sc-field"><span class="sc-field-label">${t('Colore')}</span><div class="sc-swatches" role="radiogroup" aria-label="${t('Colore')}"><label class="sc-swatch sc-swatch-none${!value ? ' is-selected' : ''}" title="${t('Automatico')}"><input type="radio" name="color" value="" ${!value ? 'checked' : ''}><span>Auto</span></label>${COLORS.map((c) => `<label class="sc-swatch${value === c ? ' is-selected' : ''}" style="--swatch:${c}" title="${c}"><input type="radio" name="color" value="${c}" ${value === c ? 'checked' : ''}></label>`).join('')}<label class="sc-swatch sc-swatch-custom${custom ? ' is-selected' : ''}" title="${t('Altro colore')}"${custom ? ` style="--swatch:${escS(value)}"` : ''}><input type="radio" name="color" value="${escS(custom ? value : '#607d8b')}" data-custom ${custom ? 'checked' : ''}><input type="color" data-color-custom value="${escS(custom ? value : '#607d8b')}" aria-label="${t('Altro colore')}"><span>＋</span></label></div></div>`;
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









const STYLE = ":host {\n  overflow-anchor: none;\n  display: block;\n  font-family: var(--primary-font-family, Arial, sans-serif);\n  color: var(--primary-text-color, #202a35);\n  container-type: inline-size;\n  --sc-accent: var(--primary-color, #00897b);\n  --sc-muted: var(--secondary-text-color, #647180);\n  --sc-surface: var(--secondary-background-color, #f4f6f8);\n  --sc-border: var(--divider-color, #dce2e7);\n}\n* {\n  box-sizing: border-box;\n}\nha-card {\n  display: block;\n  overflow: hidden;\n  padding: 24px;\n  border-radius: var(--ha-card-border-radius, 20px);\n  background: var(--card-background-color, #fff);\n}\nbutton,\ninput,\nselect,\ntextarea {\n  font: inherit;\n  color: inherit;\n}\nbutton {\n  min-height: 40px;\n  padding: 9px 14px;\n  border: 1px solid var(--sc-border);\n  border-radius: 10px;\n  background: var(--card-background-color, #fff);\n  cursor: pointer;\n  line-height: 1.3;\n  transition:\n    background 0.15s,\n    border-color 0.15s;\n}\nbutton:hover {\n  background: var(--sc-surface);\n  border-color: var(--sc-accent);\n}\nbutton:disabled {\n  opacity: 0.5;\n  cursor: wait;\n}\nbutton:focus-visible,\ninput:focus-visible,\nselect:focus-visible,\ntextarea:focus-visible,\nsummary:focus-visible {\n  outline: 3px solid var(--sc-accent);\n  outline-offset: 3px;\n}\nbutton[data-command^=\"delete\"],\nbutton[data-command^=\"remove\"] {\n  color: var(--error-color, #b3261e);\n}\nbutton[data-command=\"newSchedule\"],\n.sc-actions button[type=\"submit\"] {\n  background: var(--sc-accent);\n  color: var(--text-primary-color, #fff);\n  border-color: var(--sc-accent);\n  font-weight: 600;\n}\n.card-header {\n  margin-bottom: 20px;\n}\n.hdr-row1 {\n  display: flex;\n  gap: 12px;\n  align-items: center;\n  margin-bottom: 20px;\n}\n.card-title {\n  font-size: 1.4rem;\n  font-weight: 700;\n  letter-spacing: -0.03em;\n}\n.sc-version {\n  margin-left: auto;\n  color: var(--sc-muted);\n  font-size: 0.72rem;\n  border: 1px solid var(--sc-border);\n  border-radius: 20px;\n  padding: 4px 8px;\n}\n.sc-eyebrow {\n  font-size: 0.7rem;\n  font-weight: 700;\n  letter-spacing: 0.1em;\n  text-transform: uppercase;\n  color: var(--sc-muted);\n  margin: 0 0 8px;\n}\n.hdr-row2 {\n  display: flex;\n  gap: 8px;\n  overflow-x: auto;\n  padding: 3px 2px 8px;\n}\n.profile-chip {\n  flex-shrink: 0;\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  border-radius: 24px;\n  color: var(--sc-muted);\n}\n.profile-chip.viewed {\n  color: var(--primary-text-color, #202a35);\n  border-color: var(--pchip-color);\n  background: color-mix(\n    in srgb,\n    var(--pchip-color) 12%,\n    var(--card-background-color, #fff)\n  );\n  font-weight: 600;\n}\n.profile-chip.active-op::before {\n  content: \"\";\n  width: 7px;\n  height: 7px;\n  border-radius: 50%;\n  background: var(--success-color, #388e3c);\n}\n.profile-status-bar {\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 8px;\n  font-size: 0.8rem;\n  color: var(--sc-muted);\n  margin: 0 0 18px;\n}\n.sc-badge {\n  display: inline-flex;\n  align-items: center;\n  padding: 5px 9px;\n  border-radius: 6px;\n  background: var(--sc-surface);\n  font-size: 0.73rem;\n  font-weight: 600;\n}\n.sc-badge.is-active {\n  color: var(--success-color, #287d39);\n  background: color-mix(\n    in srgb,\n    var(--success-color, #287d39) 10%,\n    var(--card-background-color, #fff)\n  );\n}\n.tab-bar {\n  display: flex;\n  overflow-x: auto;\n  gap: 5px;\n  border-bottom: 1px solid var(--sc-border);\n  margin-bottom: 20px;\n  padding-bottom: 8px;\n}\n.tab {\n  white-space: nowrap;\n  border-color: transparent;\n  color: var(--sc-muted);\n}\n.tab.active {\n  color: var(--sc-accent);\n  background: color-mix(\n    in srgb,\n    var(--sc-accent) 9%,\n    var(--card-background-color, #fff)\n  );\n  font-weight: 600;\n}\n.sc-toolbar,\n.sc-controls,\n.sc-actions,\n.sc-entry-actions {\n  display: flex;\n  gap: 8px;\n  flex-wrap: wrap;\n  align-items: center;\n}\n.sc-toolbar {\n  justify-content: space-between;\n  margin: 20px 0 14px;\n}\n.sc-toolbar h2 {\n  font-size: 1.05rem;\n  margin: 0;\n}\n.sc-toolbar p {\n  margin: 4px 0 0;\n  color: var(--sc-muted);\n  font-size: 0.8rem;\n}\n.sc-controls {\n  margin: 14px 0;\n}\n.sc-week {\n  display: grid;\n  grid-template-columns: repeat(7, minmax(0, 1fr));\n  gap: 7px;\n  margin: 14px 0 24px;\n}\n.sc-day {\n  min-width: 0;\n  min-height: 124px;\n  padding: 10px 7px;\n  border: 1px solid var(--sc-border);\n  border-radius: 12px;\n  background: var(--sc-surface);\n}\n.sc-day > strong {\n  display: block;\n  color: var(--sc-muted);\n  font-size: 0.72rem;\n  font-weight: 600;\n  margin: 0 2px 10px;\n}\n.sc-slot {\n  margin-top: 7px;\n  padding: 8px 7px;\n  border-radius: 6px;\n  background: var(--card-background-color, #fff);\n  border-left: 3px solid var(--pchip-color, var(--sc-accent));\n  font-size: 0.72rem;\n  overflow-wrap: anywhere;\n  line-height: 1.5;\n}\n.sc-slot time {\n  font-size: 0.66rem;\n  font-variant-numeric: tabular-nums;\n  color: var(--sc-muted);\n}\n.sc-slot.is-off {\n  opacity: 0.6;\n  border-left-style: dashed;\n}\n.sc-day-empty {\n  color: var(--sc-muted);\n  font-size: 0.72rem;\n}\n.sc-list {\n  list-style: none;\n  padding: 0;\n  margin: 4px 0 0;\n  display: grid;\n  gap: 4px;\n}\n.sc-entry {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 10px;\n  padding: 7px 8px 7px 12px;\n  border: 1px solid var(--sc-border);\n  border-left: 3px solid var(--block-color, var(--sc-accent));\n  border-radius: 8px;\n}\n.sc-entry-copy {\n  min-width: 0;\n  display: grid;\n  gap: 2px;\n}\n.sc-entry strong {\n  font-size: 0.84rem;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.sc-entry .sc-meta {\n  margin: 0;\n  font-size: 0.72rem;\n  line-height: 1.35;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.sc-meta {\n  font-size: 0.76rem;\n  color: var(--sc-muted);\n  margin: 6px 0 0;\n  overflow-wrap: anywhere;\n  line-height: 1.5;\n}\n.sc-entry-actions {\n  flex-shrink: 0;\n  flex-wrap: nowrap !important;\n  gap: 4px !important;\n}\n.sc-entry-actions button {\n  font-size: 0.72rem;\n  min-height: 30px;\n  padding: 4px 9px;\n  border-radius: 7px;\n}\n.sc-empty {\n  padding: 30px 18px;\n  border: 1px dashed var(--sc-border);\n  border-radius: 14px;\n  background: var(--sc-surface);\n  text-align: center;\n  color: var(--sc-muted);\n  font-size: 0.85rem;\n  line-height: 1.6;\n}\n.sc-empty strong {\n  display: block;\n  color: var(--primary-text-color, #202a35);\n  font-size: 1rem;\n  margin-bottom: 5px;\n}\ndetails {\n  border: 1px solid var(--sc-border);\n  border-radius: 12px;\n  padding: 12px 14px;\n  margin: 12px 0;\n}\nsummary {\n  cursor: pointer;\n  font-size: 0.82rem;\n  font-weight: 600;\n  min-height: 24px;\n  line-height: 24px;\n}\ndetails[open] > summary {\n  margin-bottom: 12px;\n}\n.sc-operational {\n  margin-top: 20px;\n  color: var(--sc-muted);\n  font-size: 0.8rem;\n}\n.sc-operational p {\n  line-height: 1.6;\n}\n.sc-editor {\n  padding: 22px;\n  margin: 20px 0;\n  border: 1px solid var(--sc-border);\n  border-radius: 16px;\n  display: grid;\n  gap: 16px;\n  background: var(--sc-surface);\n}\n.sc-editor h3 {\n  font-size: 1.15rem;\n  margin: 0;\n  letter-spacing: -0.02em;\n}\n.sc-editor p {\n  font-size: 0.8rem;\n  color: var(--sc-muted);\n  line-height: 1.6;\n  margin: 0;\n}\n.sc-editor label {\n  display: grid;\n  gap: 7px;\n  font-size: 0.8rem;\n  font-weight: 500;\n  min-width: 0;\n}\n.sc-editor input,\n.sc-editor select,\n.sc-editor textarea {\n  width: 100%;\n  max-width: 100%;\n  min-height: 44px;\n  padding: 10px 12px;\n  background: var(--card-background-color, #fff);\n  border: 1px solid var(--sc-border);\n  border-radius: 8px;\n  font-size: 0.9rem;\n}\n.sc-editor textarea {\n  font-family: monospace;\n  line-height: 1.5;\n  resize: vertical;\n}\n.sc-editor fieldset {\n  min-width: 0;\n  border: 1px solid var(--sc-border);\n  border-radius: 12px;\n  padding: 16px;\n  display: grid;\n  gap: 14px;\n  background: var(--card-background-color, #fff);\n  margin: 0;\n}\n.sc-editor legend {\n  font-size: 0.8rem;\n  font-weight: 700;\n  padding: 0 7px;\n}\n.sc-editor details {\n  margin: 0;\n  background: var(--card-background-color, #fff);\n}\n.sc-editor details > * + * {\n  margin-top: 12px;\n}\n.sc-check {\n  display: flex !important;\n  align-items: center;\n  gap: 9px !important;\n}\n.sc-editor input[type=\"checkbox\"] {\n  width: 18px !important;\n  min-height: 18px;\n  height: 18px;\n  accent-color: var(--sc-accent);\n  flex-shrink: 0;\n}\n.sc-entities {\n  max-height: 240px;\n  overflow: auto;\n  display: grid;\n  gap: 5px;\n  border: 1px solid var(--sc-border);\n  padding: 6px;\n  border-radius: 10px;\n  background: var(--card-background-color, #fff);\n}\n.sc-entities label {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  min-height: 48px;\n  padding: 8px 10px;\n  border-radius: 7px;\n  font-weight: 400;\n}\n.sc-entities label:hover {\n  background: var(--sc-surface);\n}\n.sc-entity-name {\n  display: block;\n  font-weight: 500;\n}\n.sc-entity-id {\n  display: block;\n  font-size: 0.7rem;\n  color: var(--sc-muted);\n  margin-top: 3px;\n  overflow-wrap: anywhere;\n}\n.sc-days {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 7px;\n}\n.sc-days label {\n  padding: 8px;\n  border: 1px solid var(--sc-border);\n  border-radius: 8px;\n}\n.sc-actions {\n  padding-top: 16px;\n  border-top: 1px solid var(--sc-border);\n}\n.sc-actions button {\n  min-width: 100px;\n}\n.status,\n.sc-error {\n  padding: 12px 14px;\n  border-radius: 10px;\n  font-size: 0.85rem;\n  line-height: 1.6;\n  margin: 12px 0;\n  background: var(--sc-surface);\n}\n.sc-error,\n.error {\n  color: var(--error-color, #b3261e);\n  background: color-mix(\n    in srgb,\n    var(--error-color, #b3261e) 8%,\n    var(--card-background-color, #fff)\n  );\n  overflow-wrap: anywhere;\n}\n[hidden],\n.sc-entities label[hidden] {\n  display: none !important;\n}\n@container (max-width:600px) {\n  ha-card {\n    padding: 16px;\n  }\n  .card-title {\n    font-size: 1.2rem;\n  }\n  .sc-week {\n    grid-template-columns: 1fr;\n    gap: 7px;\n  }\n  .sc-day {\n    display: grid;\n    grid-template-columns: 34px 1fr;\n    gap: 5px 9px;\n    min-height: 45px;\n    padding: 9px;\n  }\n  .sc-day > strong {\n    grid-row: 1/20;\n    margin: 5px 0;\n  }\n  .sc-slot {\n    margin: 0;\n    padding: 6px 9px;\n  }\n  .sc-slot time {\n    margin-right: 8px;\n  }\n  .sc-editor {\n    padding: 14px;\n  }\n  .sc-toolbar {\n    align-items: flex-start;\n  }\n  .sc-toolbar .sc-controls {\n    margin: 0;\n  }\n  .sc-days {\n    gap: 5px;\n  }\n  .sc-days label {\n    padding: 7px;\n  }\n  .sc-editor fieldset {\n    padding: 12px;\n  }\n}\n@media (prefers-reduced-motion: reduce) {\n  * {\n    transition: none !important;\n  }\n}\n.sc-slot time {\n  display: block;\n}\n.sc-editor {\n  scroll-margin-top: 16px;\n}\n.sc-error-details textarea {\n  width: 100%;\n  box-sizing: border-box;\n  background: var(--card-background-color, #fff);\n  color: var(--primary-text-color, #202a35);\n  border: 1px solid var(--sc-border);\n  border-radius: 8px;\n  padding: 10px;\n  font: 12px/1.5 monospace;\n  resize: vertical;\n}\n.sc-error-details p {\n  font-size: .8rem;\n  color: var(--sc-muted);\n}\n.sc-timeline {\n  overflow-x: auto;\n  padding: 8px 0 14px;\n  overscroll-behavior-x: contain;\n}\n.sc-timeline-head, .sc-timeline-grid {\n  display: grid;\n  grid-template-columns: 38px repeat(7,minmax(0,1fr));\n  gap: 4px;\n}\n.sc-timeline-head { margin-bottom: 10px; text-align: center; font-size: .74rem; color: var(--sc-muted); }\n.sc-time-axis, .sc-day-track { position: relative; height: 576px; }\n.sc-time-axis span { position:absolute; right:4px; transform:translateY(-50%); font-size:.65rem; font-variant-numeric:tabular-nums; color:var(--sc-muted); }\n.sc-day-track {\n  border-radius: 7px;\n  background: repeating-linear-gradient(to bottom, var(--sc-border) 0 1px, transparent 1px 24px), var(--sc-surface);\n}\n.sc-time-block {\n  position:absolute;\n  display:flex;\n  flex-direction:column;\n  align-items:flex-start;\n  justify-content:flex-start;\n  min-height:8px;\n  padding:3px 4px;\n  border:1px solid var(--card-background-color,#fff);\n  border-left:3px solid var(--block-color);\n  border-radius:5px;\n  background:color-mix(in srgb,var(--block-color) 34%,var(--card-background-color,#fff));\n  color:var(--primary-text-color,#202a35);\n  font-size:.68rem;\n  line-height:1.3;\n  text-align:left;\n  overflow:hidden;\n}\n.sc-time-block span { font-weight:600; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }\n.sc-time-block small { font-size:.6rem; white-space:nowrap; }\n.sc-time-block:hover { background:color-mix(in srgb,var(--block-color) 38%,var(--card-background-color,#fff)); }\n.sc-time-block.is-off { opacity:.55; border-style:dashed; }\n.sc-dialog {\n  width:min(680px,calc(100vw - 24px));\n  max-height:calc(100dvh - 32px);\n  padding:0 20px 20px;\n  border:1px solid var(--sc-border);\n  border-radius:18px;\n  background:var(--card-background-color,#fff);\n  color:var(--primary-text-color,#202a35);\n  box-shadow:0 20px 70px #0005;\n  overscroll-behavior:contain;\n}\n.sc-dialog::backdrop { background:#0008; }\n.sc-dialog-heading { position:sticky; top:0; z-index:2; display:flex; align-items:center; justify-content:space-between; padding:12px 0; background:var(--card-background-color,#fff); border-bottom:1px solid var(--sc-border); }\n.sc-dialog-heading button { min-width:40px; }\n.sc-dialog .sc-editor { margin:16px 0 0; padding:0; border:0; background:transparent; }\n.sc-dialog .sc-actions { position:sticky; bottom:-20px; padding:12px 0; background:var(--card-background-color,#fff); z-index:1; }\n@media (max-width:600px) {\n  .sc-dialog { width:calc(100vw - 12px); max-height:calc(100dvh - 12px); padding:0 14px 14px; }\n  .sc-dialog .sc-actions { bottom:-14px; }\n}\n@container (max-width:600px) {\n  .sc-slot time {\n    display: inline-block;\n  }\n}\n\n/* Desired-state action editor (weekly-schedule-card Quick Timer style) */\n.sc-field { display: grid; gap: 8px; min-width: 0; }\n.sc-field-label { font-size: .8rem; font-weight: 500; }\n.sc-current { display: flex; justify-content: space-between; gap: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--sc-border); }\n.sc-current strong { color: var(--primary-text-color, #202a35); font-weight: 600; }\n.sc-action-fields { display: grid; gap: 16px; }\n.sc-choices {\n  display: flex; flex-wrap: wrap; gap: 4px; padding: 4px;\n  border-radius: 12px; background: var(--sc-surface);\n}\n.sc-editor label.sc-choice {\n  position: relative; flex: 1 1 auto; display: flex; flex-direction: column;\n  align-items: center; justify-content: center; gap: 4px; min-width: 64px; min-height: 42px;\n  padding: 8px 10px; border: 1px solid transparent; border-radius: 9px;\n  font-size: .8rem; font-weight: 500; text-align: center; cursor: pointer; color: var(--sc-muted);\n}\n.sc-editor .sc-choice input {\n  position: absolute; inset: 0; width: 100%; height: 100%; min-height: 0; margin: 0;\n  opacity: 0; cursor: pointer;\n}\n.sc-choice:hover { color: var(--primary-text-color, #202a35); }\n.sc-choice.is-selected, .sc-choice:has(input:checked) {\n  color: var(--sc-accent); border-color: var(--sc-accent);\n  background: var(--card-background-color, #fff); font-weight: 600;\n  box-shadow: 0 1px 3px #0001;\n}\n.sc-choice:has(input:focus-visible) { outline: 3px solid var(--sc-accent); outline-offset: 2px; }\n.sc-mode-buttons { background: transparent; padding: 0; gap: 6px; }\n.sc-mode-buttons .sc-choice { min-height: 64px; border-color: var(--sc-border); background: var(--card-background-color, #fff); }\n.sc-choice ha-icon { --mdc-icon-size: 20px; }\n.sc-range-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }\n.sc-range-value { display: inline-flex; align-items: center; gap: 4px; font-weight: 600; color: var(--sc-accent); }\n.sc-editor .sc-range-value input {\n  width: 84px; min-height: 40px; padding: 6px 10px; text-align: center;\n  font-size: 1.15rem; font-weight: 600; color: var(--sc-accent); background: var(--sc-surface); border-color: transparent;\n}\n.sc-editor input[type=\"range\"] {\n  -webkit-appearance: none; appearance: none; width: 100%; min-height: 24px; padding: 0;\n  border: 0; background: transparent; accent-color: var(--sc-accent);\n}\ninput[type=\"range\"]::-webkit-slider-runnable-track { height: 6px; border-radius: 6px; background: linear-gradient(to right, var(--sc-accent) var(--sc-fill, 0%), var(--sc-border) var(--sc-fill, 0%)); }\ninput[type=\"range\"]::-moz-range-track { height: 6px; border-radius: 6px; background: var(--sc-border); }\ninput[type=\"range\"]::-moz-range-progress { height: 6px; border-radius: 6px; background: var(--sc-accent); }\ninput[type=\"range\"]::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; margin-top: -8px; border-radius: 50%; border: 4px solid var(--card-background-color, #fff); background: var(--sc-accent); box-shadow: 0 0 0 1px var(--sc-accent); }\ninput[type=\"range\"]::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; border: 4px solid var(--card-background-color, #fff); background: var(--sc-accent); box-shadow: 0 0 0 1px var(--sc-accent); }\n.sc-range-labels { display: flex; justify-content: space-between; font-size: .7rem; color: var(--sc-muted); }\n.sc-more { padding: 10px 12px; }\n.sc-name-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: end; }\n.sc-name-row button { min-height: 44px; }\n.sc-summary { padding: 12px 14px; border-radius: 10px; background: var(--card-background-color, #fff); border: 1px solid var(--sc-border); }\n.sc-summary p { margin-top: 6px !important; }\n.sc-notice { color: var(--success-color, #287d39); background: color-mix(in srgb, var(--success-color, #287d39) 9%, var(--card-background-color, #fff)); }\n.sc-warning { color: var(--warning-color, #8a5a00); background: color-mix(in srgb, var(--warning-color, #f0a500) 12%, var(--card-background-color, #fff)); }\n.sc-actions button.sc-danger { background: var(--error-color, #b3261e); border-color: var(--error-color, #b3261e); color: #fff; }\n.sc-overview-list { list-style: none; margin: 0 0 10px; padding: 0; display: grid; gap: 6px; font-size: .82rem; }\n.sc-overview-row { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; padding: 8px 10px; border: 1px solid var(--sc-border); border-radius: 8px; }\n.sc-overview-row .sc-meta { margin: 0; flex-basis: 100%; padding-left: 18px; }\n.sc-overview-list li:not(.sc-overview-row) { padding: 8px 10px; border-radius: 8px; background: var(--sc-surface); }\n.sc-overview-list li .sc-meta { display: block; margin-top: 3px; }\n.sc-overview h4 { margin: 14px 0 8px; font-size: .82rem; }\n.sc-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--pchip-color, var(--sc-accent)); flex-shrink: 0; }\n.sc-maintenance .sc-controls { margin: 10px 0 0; }\n\n/* Time bar with magnets and day shortcuts (weekly-schedule-card style) */\n.sc-timebar { position: relative; height: 48px; border-radius: 8px; background: var(--sc-surface); overflow: hidden; touch-action: none; user-select: none; }\n.sc-tb-bg { position: absolute; top: 6px; bottom: 6px; border-radius: 6px; background: var(--block-color); opacity: .4; pointer-events: auto; }\n.sc-tb-magnet { position: absolute; top: 0; bottom: 0; width: 2px; transform: translateX(-50%); background: color-mix(in srgb, var(--sc-accent) 45%, transparent); pointer-events: none; }\n.sc-tb-magnet.is-near { background: var(--sc-accent); box-shadow: 0 0 6px var(--sc-accent); }\n.sc-tb-edit { position: absolute; top: 0; bottom: 0; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: var(--sc-accent); color: var(--text-primary-color, #fff); font-size: .72rem; font-weight: 700; font-variant-numeric: tabular-nums; cursor: grab; touch-action: none; box-shadow: 0 2px 8px #0003; overflow: hidden; }\n.sc-tb-edit:active { cursor: grabbing; }\n.sc-tb-edit.is-static { cursor: default; opacity: .75; }\n.sc-tb-label { pointer-events: none; white-space: nowrap; padding: 0 22px; }\n.sc-tb-handle { position: absolute; top: 0; bottom: 0; width: 22px; display: flex; align-items: center; justify-content: center; cursor: ew-resize; }\n.sc-tb-handle::after { content: \"\"; width: 16px; height: 16px; border-radius: 50%; background: #fff; border: 2px solid var(--sc-accent); box-shadow: 0 1px 4px #0004; }\n.sc-tb-handle[data-handle=\"start\"] { left: 0; }\n.sc-tb-handle[data-handle=\"end\"] { right: 0; }\n.sc-tb-ticks { display: flex; justify-content: space-between; font-size: .66rem; color: var(--sc-muted); margin-top: -8px; }\n.sc-time-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }\n.sc-snap, .sc-shortcuts { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: .75rem; color: var(--sc-muted); }\n.sc-editor .sc-pill { min-height: 30px; padding: 4px 12px; border-radius: 16px; font-size: .76rem; color: var(--sc-muted); }\n.sc-editor .sc-pill.is-selected { color: var(--sc-accent); border-color: var(--sc-accent); background: color-mix(in srgb, var(--sc-accent) 12%, var(--card-background-color, #fff)); font-weight: 600; }\n.sc-days { gap: 6px !important; }\n.sc-editor .sc-days label.sc-day-chip { position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; padding: 0; border-radius: 50%; border: 1.5px solid var(--sc-border); font-size: .74rem; font-weight: 600; color: var(--sc-muted); cursor: pointer; }\n.sc-editor .sc-day-chip input { position: absolute; inset: 0; width: 100% !important; height: 100% !important; margin: 0; opacity: 0; cursor: pointer; }\n.sc-day-chip:has(input:checked) { background: var(--sc-accent); border-color: var(--sc-accent) !important; color: var(--text-primary-color, #fff) !important; }\n.sc-day-chip:has(input:focus-visible) { outline: 3px solid var(--sc-accent); outline-offset: 2px; }\n\n/* Conditions */\n.sc-condition-group { display: grid; gap: 12px; }\n.sc-editor fieldset.sc-condition { background: var(--card-background-color, #fff); }\n\n/* Icon and colour pickers */\n.sc-icon-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(68px, 1fr)); gap: 6px; max-height: 232px; overflow: auto; padding: 2px; }\n.sc-editor label.sc-icon-choice { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; min-height: 64px; padding: 6px 4px; border: 1px solid var(--sc-border); border-radius: 10px; cursor: pointer; color: var(--sc-muted); text-align: center; }\n.sc-icon-choice small { font-size: .64rem; line-height: 1.2; }\n.sc-editor .sc-icon-choice input, .sc-editor .sc-swatch input[type=\"radio\"] { position: absolute; inset: 0; width: 100% !important; height: 100% !important; min-height: 0; margin: 0; opacity: 0; cursor: pointer; }\n.sc-icon-choice.is-selected, .sc-icon-choice:has(input:checked) { color: var(--sc-accent); border-color: var(--sc-accent); background: color-mix(in srgb, var(--sc-accent) 10%, var(--card-background-color, #fff)); }\n.sc-swatches { display: flex; flex-wrap: wrap; gap: 8px; }\n.sc-editor label.sc-swatch { position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; background: var(--swatch, var(--sc-surface)); border: 2px solid var(--card-background-color, #fff); box-shadow: 0 0 0 1px var(--sc-border); cursor: pointer; font-size: .66rem; color: var(--sc-muted); }\n.sc-swatch.is-selected, .sc-swatch:has(input[type=\"radio\"]:checked) { box-shadow: 0 0 0 3px var(--sc-accent); }\n.sc-editor .sc-swatch-custom input[type=\"color\"] { position: absolute; inset: 0; width: 100% !important; height: 100% !important; min-height: 0; padding: 0; opacity: 0; cursor: pointer; z-index: 1; }\n.sc-swatch-custom span { font-size: 1rem; }\n.tab ha-icon, .profile-chip ha-icon { --mdc-icon-size: 18px; margin-right: 4px; }\n.tab.active { border-bottom: 2px solid var(--tab-color, var(--sc-accent)); }\n.sc-tb-edit.is-narrow .sc-tb-label { visibility: hidden; }\n.sc-tb-edit.is-narrow .sc-tb-handle { width: 16px; }\n.sc-tb-edit.is-narrow .sc-tb-handle::after { width: 12px; height: 12px; }\n\n/* ---- Direction A \"Agenda viva\" (0.3.7) ---- */\n.sc-head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }\n.sc-logo { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--sc-accent); background: color-mix(in srgb, var(--sc-accent) 12%, var(--card-background-color, #fff)); }\n.sc-logo svg { width: 22px; height: 22px; }\n.sc-head-copy { display: grid; gap: 2px; flex-grow: 1; min-width: 0; }\n.sc-sub { font-size: .8rem; color: var(--sc-muted); }\n.sc-head .sc-version { margin-left: 0; }\n.sc-head-actions { display: flex; gap: 8px; }\n.sc-segmented { display: flex; gap: 4px; padding: 4px; border-radius: 14px; background: var(--sc-surface); overflow-x: auto; }\n.sc-segmented .profile-chip { flex: 1 0 auto; justify-content: center; min-height: 38px; border: 0; border-radius: 10px; background: transparent; color: var(--sc-muted); font-weight: 600; }\n.sc-segmented .profile-chip.viewed { background: var(--card-background-color, #fff); color: var(--primary-text-color, #202a35); box-shadow: 0 1px 3px #00000014; font-weight: 700; }\n.sc-now { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; margin: 4px 0 8px; }\n.sc-now-tile { display: grid; gap: 5px; text-align: left; padding: 14px 16px; border: 0; border-radius: 16px; min-height: 0; color: var(--primary-text-color, #202a35); }\n.sc-now-tile.is-running { background: color-mix(in srgb, var(--sc-accent) 12%, var(--card-background-color, #fff)); }\n.sc-now-tile.is-paused { background: color-mix(in srgb, var(--warning-color, #f0a500) 14%, var(--card-background-color, #fff)); }\n.sc-now-tile.is-timer { background: var(--sc-surface); }\n.sc-now-tile:hover { border: 0; filter: brightness(.98); }\n.sc-now-label { font-size: .72rem; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; color: var(--sc-accent); }\n.sc-now-tile.is-paused .sc-now-label { color: color-mix(in srgb, var(--warning-color, #f0a500) 60%, #000); }\n.sc-now-tile strong { font-size: 1.2rem; letter-spacing: -0.02em; }\n.sc-now-detail { font-size: .78rem; color: var(--sc-muted); }\n.sc-now-empty { font-size: .82rem; color: var(--sc-muted); margin: 4px 0 8px; }\n.sc-toolbar { flex-wrap: wrap; gap: 8px 12px; }\n.sc-toolbar .tab-bar { border: 0; margin: 0; padding: 0; gap: 6px; }\n.sc-toolbar .tab { min-height: 32px; padding: 4px 12px; border-radius: 16px; background: var(--sc-surface); font-size: .8rem; }\n.sc-toolbar .tab.active { background: var(--primary-text-color, #202a35); color: var(--card-background-color, #fff); border-bottom: 0; }\n.sc-timeline-head strong.is-today { color: var(--sc-accent); font-weight: 800; }\n.sc-day-track.is-today { background: color-mix(in srgb, var(--sc-accent) 8%, var(--sc-surface)); box-shadow: inset 0 0 0 2px var(--sc-accent); }\n.sc-now-line { position: absolute; left: -3px; right: -3px; height: 2px; background: var(--error-color, #d6453d); z-index: 2; pointer-events: none; }\n.sc-time-block.is-running { box-shadow: 0 0 0 2px var(--card-background-color, #fff), 0 0 0 4px var(--success-color, #1f9d55); z-index: 1; }\n.sc-time-block.is-paused { border: 2px dashed color-mix(in srgb, var(--warning-color, #f0a500) 70%, #000); z-index: 1; }\n.sc-legend { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: .72rem; color: var(--sc-muted); margin: 6px 0 12px; }\n.sc-legend span { display: inline-flex; align-items: center; gap: 6px; }\n.sc-legend i { display: inline-block; width: 14px; height: 12px; border-radius: 4px; }\n.sc-legend .sc-legend-temp { width: 40px; background: linear-gradient(90deg, rgb(74,144,217), rgb(150,196,232), rgb(240,138,75)); }\n.sc-legend .sc-legend-running { box-shadow: 0 0 0 2px var(--success-color, #1f9d55); }\n.sc-legend .sc-legend-paused { border: 2px dashed var(--warning-color, #f0a500); box-sizing: border-box; }\n.sc-legend .sc-legend-now { height: 2px; background: var(--error-color, #d6453d); }\n.sc-editor h3 small { display: block; font-size: .75rem; font-weight: 600; color: var(--sc-muted); letter-spacing: 0; }\n.sc-section-label { font-size: .72rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--sc-muted); margin-bottom: -8px; }\n.sc-entity-pills { display: flex; flex-wrap: wrap; gap: 8px; }\n.sc-editor label.sc-entity-pill { position: relative; display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 6px 14px; border-radius: 18px; background: var(--sc-surface); color: var(--sc-muted); font-weight: 600; cursor: pointer; }\n.sc-editor .sc-entity-pill input { position: absolute; inset: 0; width: 100% !important; height: 100% !important; min-height: 0; margin: 0; opacity: 0; cursor: pointer; }\n.sc-entity-pill::before { content: \"\"; width: 8px; height: 8px; border-radius: 50%; background: currentColor; opacity: .35; }\n.sc-entity-pill:has(input:checked) { color: var(--sc-accent); background: color-mix(in srgb, var(--sc-accent) 14%, var(--card-background-color, #fff)); }\n.sc-entity-pill:has(input:checked)::before { opacity: 1; }\n.sc-entity-pill:has(input:focus-visible) { outline: 3px solid var(--sc-accent); outline-offset: 2px; }\n.sc-stepper-row { display: flex; align-items: center; gap: 12px; }\n.sc-editor .sc-step { width: 48px; height: 48px; min-height: 48px; padding: 0; border-radius: 50%; font-size: 1.4rem; line-height: 1; flex-shrink: 0; }\n.sc-stepper-value { flex-grow: 1; display: flex; align-items: baseline; justify-content: center; gap: 4px; color: var(--sc-accent); font-weight: 800; }\n.sc-editor .sc-stepper-value input { width: 96px; min-height: 52px; padding: 4px; border: 0; background: transparent; text-align: center; font-size: 2.2rem; font-weight: 800; letter-spacing: -0.03em; color: inherit; -moz-appearance: textfield; }\n.sc-stepper-value input::-webkit-inner-spin-button, .sc-stepper-value input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }\n.sc-rows { display: grid; border: 1px solid var(--sc-border); border-radius: 14px; overflow: hidden; background: var(--card-background-color, #fff); }\n.sc-editor details.sc-row { margin: 0; border: 0; border-radius: 0; padding: 0; background: transparent; }\n.sc-row + .sc-row { border-top: 1px solid var(--sc-border) !important; }\n.sc-row > summary { display: flex; align-items: center; gap: 10px; min-height: 48px; padding: 0 14px; list-style: none; }\n.sc-row > summary::-webkit-details-marker { display: none; }\n.sc-row > summary span { flex-grow: 1; font-size: .85rem; font-weight: 700; }\n.sc-row > summary em { font-style: normal; font-size: .82rem; font-weight: 500; color: var(--sc-muted); max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.sc-row > summary::after { content: \"\\203A\"; font-size: 1.2rem; color: var(--sc-muted); transition: transform .15s; }\n.sc-row[open] > summary::after { transform: rotate(90deg); }\n.sc-row[open] > summary { margin: 0; }\n.sc-row-body { display: grid; gap: 14px; padding: 4px 14px 16px; }\n.sc-actions button.sc-save { flex-grow: 1; min-height: 50px; border-radius: 14px; font-size: 1rem; }\n@media (max-width: 600px) {\n  .sc-dialog { width: 100vw; max-width: 100vw; margin: auto 0 0; max-height: 92dvh; border-radius: 24px 24px 0 0; padding: 0 16px 16px; }\n  .sc-dialog-heading::before { content: \"\"; position: absolute; left: 50%; top: 6px; width: 40px; height: 5px; margin-left: -20px; border-radius: 3px; background: var(--sc-border); }\n  .sc-dialog-heading { padding-top: 18px; }\n  .sc-now { grid-template-columns: 1fr; }\n  .sc-head-actions { width: 100%; }\n  .sc-head-actions button { flex-grow: 1; }\n}\n.sc-dialog-brand { font-size: .75rem; font-weight: 700; color: var(--sc-muted); letter-spacing: .04em; text-transform: uppercase; }\n\n/* 0.3.10: lighter header, fluid week, clickable free space */\n.sc-head { gap: 10px; margin-bottom: 12px; }\n.sc-logo { width: 34px; height: 34px; border-radius: 10px; }\n.sc-logo svg { width: 18px; height: 18px; }\n.sc-head .card-title { font-size: 1.05rem; }\n.sc-sub { font-size: .74rem; }\n.sc-head .sc-version { padding: 2px 7px; font-size: .66rem; }\n.sc-head-actions { margin-left: auto; gap: 6px; }\n.sc-head-actions button, .sc-head-actions button[data-command=\"newSchedule\"] { min-height: 30px; padding: 4px 12px; border-radius: 15px; font-size: .78rem; font-weight: 600; }\n.sc-segmented { padding: 3px; border-radius: 12px; }\n.sc-segmented .profile-chip { min-height: 30px; padding: 4px 10px; font-size: .82rem; }\n.sc-day-track { cursor: copy; }\n.sc-time-block { cursor: pointer; }\nbutton.sc-empty { display: block; width: 100%; font: inherit; cursor: pointer; }\nbutton.sc-empty:hover { border-color: var(--sc-accent); }\n@container (max-width: 520px) {\n  .sc-time-block small { display: none; }\n  .sc-time-block { padding: 2px 3px; font-size: .6rem; }\n  .sc-timeline-head { font-size: .66rem; }\n  .sc-timeline-head strong.is-today { font-size: .66rem; }\n}\n@media (max-width: 600px) { .sc-head-actions { width: auto; } .sc-head-actions button { flex-grow: 0; } }\n@container (max-width: 520px) {\n  .sc-today-tag { display: none; }\n  .sc-now { gap: 6px; }\n  .sc-now-tile { padding: 10px 12px; gap: 3px; border-radius: 12px; }\n  .sc-now-tile strong { font-size: 1rem; }\n}\n.sc-import {\n  list-style: none;\n  margin: 12px 0 0;\n  padding: 0;\n  display: grid;\n  gap: 8px;\n}\n.sc-import-row {\n  display: flex;\n  gap: 10px;\n  padding: 10px 12px;\n  border-radius: 12px;\n  background: var(--sc-surface);\n}\n.sc-import-row > div {\n  display: grid;\n  gap: 2px;\n  min-width: 0;\n}\n.sc-import-mark {\n  flex: none;\n  width: 24px;\n  height: 24px;\n  display: grid;\n  place-items: center;\n  border-radius: 50%;\n  font-size: 0.8rem;\n  font-weight: 800;\n  color: #fff;\n  background: var(--success-color, #1f9d55);\n}\n.sc-import-row.is-note .sc-import-mark {\n  background: var(--warning-color, #b7791f);\n}\n.sc-import-row.is-off .sc-import-mark {\n  background: var(--secondary-text-color, #647180);\n}\n.sc-import-row.is-skip {\n  opacity: 0.75;\n}\n.sc-import-row.is-skip .sc-import-mark {\n  background: var(--error-color, #b3261e);\n}\n.sc-import-notes {\n  margin: 4px 0 0;\n  padding-left: 18px;\n  font-size: 0.78rem;\n  color: var(--sc-muted);\n}\n.sc-import-warning {\n  padding: 8px 10px;\n  border-radius: 10px;\n  background: color-mix(in srgb, var(--warning-color, #f0a500) 16%, transparent);\n  font-size: 0.85rem;\n}\n.sc-failures {\n  margin: 8px 0;\n  padding: 10px 12px;\n  border-radius: 10px;\n  background: color-mix(in srgb, var(--error-color, #b3261e) 8%, var(--card-background-color, #fff));\n}\n.sc-failures ul {\n  margin: 6px 0 0;\n  padding-left: 18px;\n  font-size: 0.82rem;\n}\n.sc-stats {\n  display: grid;\n  grid-template-columns: 1fr auto;\n  gap: 6px 16px;\n  margin: 0;\n  font-size: 0.85rem;\n}\n.sc-stats dt {\n  color: var(--sc-muted);\n}\n.sc-stats dd {\n  margin: 0;\n  font-weight: 700;\n  text-align: right;\n  font-variant-numeric: tabular-nums;\n}\n.sc-bound {\n  display: grid;\n  gap: 4px;\n  min-width: 0;\n}\n.sc-bound-row {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 6px;\n}\n.sc-bound-row select {\n  flex: 0 1 auto;\n}\n.sc-bound-row input[type=\"time\"] {\n  flex: 1 1 110px;\n}\n.sc-bound-row input[type=\"number\"] {\n  width: 76px;\n}\n.sc-bound-row small {\n  color: var(--sc-muted);\n  font-size: 0.75rem;\n}\n";
const CARD_VERSION = "0.3.17";
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
// A running slot without an active lease waits for another schedule or timer.
// Integrations older than 0.3.13 do not report lease owners.
function slotWaiting(state, item) {
  const leases = state?.operational?.leases || [];
  if (item.state === 'suspended') return true;
  return leases.some((l) => 'occurrence_id' in l) && item.condition_branch !== 'false' && !leases.some((l) => l.state === 'active' && l.occurrence_id === item.id);
}
const FULL_DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.name).localeCompare(String(b.name));
const daysLabel = (days) => {
  const d = [...days].sort((a, b) => a - b), key = d.join('');
  if (key === '0123456') return t('Tutti i giorni');
  if (key === '01234') return t('Lun–Ven');
  if (key === '56') return t('Weekend');
  return d.length > 2 && d.every((v, i) => !i || v === d[i - 1] + 1) ? `${t(DAYS[d[0]])}–${t(DAYS[d.at(-1)])}` : d.map((i) => t(DAYS[i])).join(', ');
};
const newer = (a, b) => {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i += 1) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  return false;
};
// Backend and card versions come from the same manifest at build time.
function versionAdvice(backend) {
  if (backend === CARD_VERSION) return '';
  if (!backend || newer(CARD_VERSION, backend)) return t('La card v{card} è aggiornata, ma Home Assistant esegue ancora l’integrazione {backend}. Riavvia Home Assistant (Impostazioni → Sistema → Riavvia) per attivare il nuovo backend.', {card: CARD_VERSION, backend: backend ? `v${backend}` : t('precedente')});
  return t('L’integrazione v{backend} è attiva, ma questa pagina usa ancora la card v{card}. Ricarica la pagina; nell’app mobile usa “Ricarica” o svuota la cache del frontend.', {card: CARD_VERSION, backend});
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
          this.localError = t('Uno schedule controlla entità dello stesso tipo. Crea uno schedule separato per gli altri dispositivi.');
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
        this.localError = t('Tipo di dispositivo cambiato: scegli nuovamente le azioni.');
      }
      this.render();
    });
  }
  static getStubConfig() { return { type: 'custom:schedule-creator-card' }; }
  static getConfigElement() { return document.createElement('schedule-creator-card-editor'); }
  getCardSize() { return 8; }
  setConfig(config) { this.config = config; this.render(); }
  set hass(hass) {
    const previous = this._hass; this._hass = hass;
    if (this.isConnected) this.adapter.connect(hass);
    if (hass?.connection !== this.adapter.connection || (!this.edit && hassChanged(previous, hass, watchedEntities(this.adapter.state)))) this.render();
  }
  connectedCallback() {
    if (this._hass) this.adapter.connect(this._hass);
    // Serpentine/ring cards ask the main card to open a schedule (see week-cards.js).
    this.onExternalEdit ??= (event) => {
      const id = event.detail?.schedule_id;
      if (event.defaultPrevented || !this.adapter.state?.config?.schedules?.some((s) => s.id === id)) return;
      event.preventDefault(); this.openEditor('editSchedule', id); this.scrollIntoView?.({block: 'start', behavior: 'smooth'});
    };
    if (!this.listening) { window.addEventListener('schedule-creator-edit', this.onExternalEdit); window.__scheduleCreatorEditors = (window.__scheduleCreatorEditors || 0) + 1; this.listening = true; }
    this.render();
  }
  disconnectedCallback() {
    this.adapter.disconnect(); clearInterval(this.clock); this.clock = null;
    if (this.listening) { window.removeEventListener('schedule-creator-edit', this.onExternalEdit); window.__scheduleCreatorEditors -= 1; this.listening = false; }
  }
  // A week card on another view navigates here with ?sc_edit=<schedule id>.
  openRequestedSchedule() {
    const params = new URLSearchParams(window.location?.search || '');
    const id = params.get('sc_edit');
    this.checkedRequest = true;
    if (!id) return false;
    params.delete('sc_edit');
    history.replaceState(history.state, '', `${window.location.pathname}${params.size ? `?${params}` : ''}${window.location.hash}`);
    if (!this.adapter.state.config.schedules.some((s) => s.id === id)) return false;
    this.openEditor('editSchedule', id);
    return true;
  }
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
    this.slotDraft = readSlots(form, sunMinutes(this._hass));
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
    setLanguage(this._hass, this.config);
    if (!this.checkedRequest && this.adapter.state && this.openRequestedSchedule()) return;
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
    const waitingFor=(item)=>slotWaiting(state,item);
    const runningState=(scheduleId)=>{
      const item=occurrences.find((x)=>x.schedule_id===scheduleId);
      if(!item) return '';
      return item.condition_branch==='false' || waitingFor(item) ? 'is-paused' : 'is-running';
    };
    const time=minute=>`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
    const slots = `<div class="sc-timeline-head"><span>${t('Orario')}</span>${DAYS.map((day,index)=>`<strong class="${index===now.weekday?'is-today':''}">${t(day)}${index===now.weekday?`<span class="sc-today-tag"> · ${t('oggi')}</span>`:''}</strong>`).join('')}</div><div class="sc-timeline-grid"><div class="sc-time-axis">${Array.from({length:13},(_,i)=>`<span style="top:${i/12*100}%">${time(i*120)}</span>`).join('')}</div>${DAYS.map((day,index)=>`<div class="sc-day-track ${index===now.weekday?'is-today':''}" data-day="${index}" aria-label="${t(day)}" title="${this._hass?.user?.is_admin===true && group ? t('Clicca uno spazio libero per aggiungere uno schedule') : ''}">${segments[index].map(({schedule,start,end,lane,lanes})=>{
      const label=`${schedule.name} · ${t(day)} ${time(start)}–${time(end)}${schedule.enabled?'':` · ${t('Disabilitato')}`}`;
      const live=index===now.weekday && start<=now.minutes && now.minutes<end ? runningState(schedule.id) : '';
      return `<button type="button" class="sc-time-block ${schedule.enabled?'':'is-off'} ${live}" data-command="editSchedule" data-id="${esc(schedule.id)}" aria-label="${esc(label)}" title="${esc(label)}" style="top:${start/1440*100}%;height:${(end-start)/1440*100}%;left:${lane/lanes*100}%;width:${100/lanes}%;--block-color:${colorFor(schedule)}"><span>${esc(schedule.name)}</span><small>${time(start)}–${time(end)}</small></button>`;
    }).join('')}${index===now.weekday?`<span class="sc-now-line" style="top:${now.minutes/1440*100}%" aria-label="${t('Ora')} ${now.label}"></span>`:''}</div>`).join('')}</div>`;
    const legend = `<div class="sc-legend" aria-hidden="true"><span><i class="sc-legend-temp"></i>${t('Clima: freddo → caldo')}</span><span><i class="sc-legend-running"></i>${t('In corso')}</span><span><i class="sc-legend-paused"></i>${t('In pausa')}</span><span><i class="sc-legend-now"></i>${t('Ora')}</span></div>`;
    const advice = state ? versionAdvice(state.integration_version) : '';
    const failures = state?.failures || [], recentFailures = failures.filter((f) => Date.now() - new Date(f.at) < 86400000);
    const failureBanner = recentFailures.length ? `<div class="status sc-warning" role="status">${recentFailures.length === 1 ? t('Un comando non è riuscito nelle ultime 24 ore: dettagli in “Attività”.') : t('{count} comandi non sono riusciti nelle ultime 24 ore: dettagli in “Attività”.', {count: recentFailures.length})}</div>` : '';
    const status = `${error ? `<div class="status error" role="alert">${esc(messageFor(error))}</div>` : loading ? `<div class="status">${t('Caricamento…')}</div>` : ''}${advice ? `<div class="status sc-warning" role="status">${esc(advice)}</div>` : ''}${failureBanner}${this.notice && !this.edit ? `<div class="status sc-notice" role="status">${esc(this.notice)}</div>` : ''}`;
    const info = this.localError || writeError;
    const errorDetails = this.localError ? this.localErrorDetails : writeError ? diagnosticFor(writeError, {cardVersion:CARD_VERSION,haVersion:this._hass.config?.version}) : null;
    const editable = this._hass?.user?.is_admin === true && writeError?.code !== 'unauthorized';
    const view = state ? `<div class="profile-status-bar">${profile ? `<span class="sc-badge ${profile.active ? 'is-active' : ''}">${profile.active ? t('Profilo attivo') : t('Profilo inattivo')}</span><span>${esc(profile.profile_type === 'exclusive' ? t('Esclusivo') : t('Condiviso'))}</span>` : t('Crea un profilo per iniziare')}<span>· ${t('{count} timer attivi', {count: state.quick_timers?.length ?? 0})}</span></div>
      ${this.nowTiles(config, occurrences, state.quick_timers || [])}
      <div class="sc-toolbar"><h2>${t('Settimana')}${group ? ` · ${esc(group.name)}` : ''}</h2>${groups.length ? `<nav class="tab-bar" aria-label="${t('Gruppi')}">${tabs}</nav>` : ''}</div>
      ${schedules.length ? `<section class="sc-timeline" data-scroll="timeline" aria-label="${t('Programmazione settimanale')}">${slots}</section>${legend}<details data-section="schedules" class="sc-schedules"><summary>${t('Gestisci schedule ({count})', {count: schedules.length})}</summary><ul class="sc-list">${schedules.map((schedule) => `<li class="sc-entry" style="--block-color:${colorFor(schedule)}"><div class="sc-entry-copy"><strong>${esc(schedule.name)}</strong><span class="sc-meta">${esc(schedule.target_entity_ids.map((id)=>this._hass.states[id]?.attributes?.friendly_name || id).join(', '))} · ${schedule.enabled ? '' : `${t('disabilitato')} · `}${schedule.time_slots?.length === 1 ? t('1 fascia') : t('{count} fasce', {count: schedule.time_slots?.length ?? 0})}</span></div>${editable ? `<div class="sc-entry-actions">${button('editSchedule',t('Modifica'),schedule.id)}${button('deleteSchedule',t('Elimina'),schedule.id)}</div>` : ''}</li>`).join('')}</ul></details>` : `<${editable ? `button type="button" data-command="${!profile ? 'newProfile' : !group ? 'newGroup' : 'newSchedule'}"` : 'div'} class="sc-empty"><strong>${!profile ? t('Inizia dal tuo primo profilo') : !group ? t('Aggiungi un gruppo di dispositivi') : t('La settimana è ancora libera')}</strong>${!profile ? t('Organizza la casa per abitudini, ambienti o stagioni.') : !group ? t('Riunisci i dispositivi che vuoi programmare.') : t('Tocca qui o su un orario del calendario per creare uno schedule.')}</${editable ? 'button' : 'div'}>`}
      ${editable ? `<details class="sc-management" data-section="management" ${!profile || !group ? 'open' : ''}><summary>${t('Gestisci profili e gruppi')}</summary><div class="sc-controls">${button('newProfile',`＋ ${t('Profilo')}`)}${profile ? `${button('editProfile',t('Modifica profilo'),profile.id)}${button('toggleProfile',profile.active ? t('Disattiva profilo') : t('Attiva profilo'),profile.id)}${button('deleteProfile',t('Elimina profilo'),profile.id)}${button('newGroup',`＋ ${t('Gruppo')}`)}` : ''}${group ? `${button('editGroup',t('Modifica gruppo'),group.id)}${button('deleteGroup',t('Elimina gruppo'),group.id)}` : ''}</div></details>` : `<p class="sc-meta">${t('Vista in sola lettura: serve un amministratore per modificare.')}</p>`}
      ${profiles.length ? this.overview(config, profiles) : ''}
      ${editable ? `<details class="sc-maintenance" data-section="maintenance"><summary>${t('Manutenzione · backup, import e RESET')}</summary><p class="sc-meta">${t('Il backup salva profili, gruppi e schedule in un file JSON. Il ripristino li sostituisce e lascia i profili disattivati. L’import dalla weekly-schedule-card li aggiunge in un nuovo profilo disattivato. RESET cancella tutti i dati di Schedule Creator.')}</p><div class="sc-controls">${button('exportBackup',t('Salva backup'))}${button('newRestore',t('Ripristina backup'))}${button('newImport',t('Importa da Weekly Schedule Card'))}${button('newReset','RESET…')}</div></details>` : ''}
      <details class="sc-operational" data-section="operational"><summary>${t('Attività · {slots} fasce in corso · {timers} timer', {slots: state.operational?.occurrences?.length ?? 0, timers: state.quick_timers?.length ?? 0})}${failures.length ? ` · ${t('{count} errori', {count: failures.length})}` : ''}</summary>${failures.length ? `<div class="sc-failures"><strong>${t('Comandi non riusciti')}</strong><ul>${failures.map((f) => `<li>${esc(this.failureText(f))}</li>`).join('')}</ul></div>` : ''}${(state.operational?.occurrences || []).map((x) => `<p>${esc(config.schedules?.find((s) => s.id === x.schedule_id)?.name || x.schedule_id)}: ${esc(x.state)}, ${t('condizione')} ${esc(x.condition_branch)}, ${t('termine')} ${esc(x.end_utc)}</p>`).join('') || `<p>${t('Nessuna fascia attiva.')}</p>`}${(state.operational?.leases || []).map((x) => `<p>${esc(x.entity_id)}: ${esc(x.state)} (${esc(x.controller_type)})</p>`).join('')}${(state.quick_timers || []).map((x) => `<p>${t('Timer')} ${esc(this._hass.states[x.entity_id]?.attributes?.friendly_name || x.entity_id)}: <span data-expiry="${esc(x.expires_at)}"></span> ${editable ? button('cancelTimer',t('Annulla timer'),x.id) : ''}</p>`).join('')}</details>` : '';
    const errorMarkup = `${info ? `<p class="sc-error" role="alert">${esc(typeof info === 'string' ? info : messageFor(info))}</p>` : ''}${errorDetails ? `<details class="sc-error-details" data-section="error-details"><summary>${t('Dettagli errore')}</summary><p>${t('Seleziona e copia questo testo per segnalare il problema.')}</p><textarea readonly aria-label="${t('Dettagli errore da copiare')}" rows="10">${esc(errorDetails)}</textarea></details>` : ''}`;
    const surface=this.shadowRoot.querySelector('ha-card');
    surface.style.setProperty('--pchip-color',tint(profile?.color));
    const running = occurrences.length;
    const header = `<div class="sc-head"><span class="sc-logo" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="3"></rect><path d="M8 2v4M16 2v4M3 10h18M8 15h3"></path></svg></span><div class="sc-head-copy"><span class="card-title">${esc(this.config.title || 'Schedule Creator')}</span><span class="sc-sub">${now.weekday >= 0 ? t(FULL_DAYS[now.weekday]) : ''} · ${now.label}${state ? ` · ${running ? (running === 1 ? t('1 fascia in corso') : t('{count} fasce in corso', {count: running})) : t('nessuna fascia in corso')}` : ''}</span></div><span class="sc-version">v${CARD_VERSION}</span>${state && editable ? `<div class="sc-head-actions">${button('newTimer','Quick Timer')}${group ? button('newSchedule',`＋ ${t('Schedule')}`) : ''}</div>` : ''}</div>`;
    surface.innerHTML = `<div class="card-header">${header}${profiles.length ? `<div class="sc-segmented" role="group" aria-label="${t('Profili')}">${chips}</div>` : ''}</div>${status}${this.edit ? '' : errorMarkup}${view}`;
    if(this.edit && editable) {
      const wasOpen=this.dialog.open;
      this.dialog.innerHTML = `<div class="sc-dialog-heading"><span class="sc-dialog-brand">Schedule Creator</span><button type="button" data-command="close" aria-label="${t('Chiudi editor')}">✕</button></div>${errorMarkup}${this.notice ? `<div class="status sc-notice" role="status">${esc(this.notice)}</div>` : ''}${this.editor(config,profile,group)}`;
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
      return `<li><strong>${esc(friendly(id))}</strong> · ${list.map((p) => esc(p.name)).join(', ')}<span class="sc-meta">${now ? t('Più profili attivi ora: vince la fascia iniziata per ultima.') : together ? t('Possono essere attivi insieme: se le fasce si sovrappongono vince quella iniziata per ultima.') : t('Profili esclusivi: mai attivi insieme, nessun conflitto.')}</span></li>`;
    });
    const rows = profiles.map((p) => {
      const groups = (config.groups || []).filter((g) => g.profile_id === p.id).length;
      const schedules = (config.schedules || []).filter((x) => x.profile_id === p.id);
      const entities = new Set(schedules.flatMap((x) => x.target_entity_ids)).size;
      return `<li class="sc-overview-row" style="--pchip-color:${tint(p.color)}"><span class="sc-dot"></span><strong>${esc(p.name)}</strong><span class="sc-badge ${p.active ? 'is-active' : ''}">${p.active ? t('Attivo') : t('Inattivo')}</span><span class="sc-meta">${p.profile_type === 'exclusive' ? t('Esclusivo') : t('Condiviso')} · ${t('{groups} gruppi · {schedules} schedule · {entities} entità', {groups, schedules: schedules.length, entities})}</span></li>`;
    }).join('');
    return `<details class="sc-overview" data-section="overview"><summary>${t('Panoramica profili e interazioni')}</summary><ul class="sc-overview-list">${rows}</ul><p class="sc-meta">${t('<strong>Esclusivo</strong>: attivandolo si disattivano gli altri profili esclusivi. <strong>Condiviso</strong>: resta attivo insieme agli altri. Solo i profili attivi eseguono i loro schedule. Se due fasce comandano la stessa entità vince quella iniziata per ultima; a parità un Quick Timer prevale su uno schedule con condizione, che prevale su uno normale. L’ordine serve solo a disporre profili e gruppi.')}</p><h4>${t('Entità comandate da più profili')}</h4>${shared.length ? `<ul class="sc-overview-list">${shared.join('')}</ul>` : `<p class="sc-meta">${t('Nessuna: ogni entità è programmata da un solo profilo.')}</p>`}</details>`;
  }
  canAddSchedule() {
    const config = this.adapter.state?.config;
    if (!config || this._hass?.user?.is_admin !== true) return false;
    const profile = config.profiles.find((p) => p.id === this.selectedProfile) || [...config.profiles].sort(byOrder)[0];
    return config.groups.some((g) => g.profile_id === profile?.id);
  }
  nowTiles(config, occurrences, timers) {
    const friendly = (id) => this._hass.states[id]?.attributes?.friendly_name || id;
    const zone = this._hass?.config?.time_zone || undefined;
    const clock = (iso) => new Intl.DateTimeFormat(locale(), {timeZone: zone, hour: '2-digit', minute: '2-digit'}).format(new Date(iso));
    const tiles = occurrences.map((item) => {
      const schedule = (config.schedules || []).find((s) => s.id === item.schedule_id);
      if (!schedule) return '';
      const paused = item.condition_branch === 'false', waiting = !paused && slotWaiting(this.adapter.state, item);
      const kind = paused || waiting ? 'is-paused' : 'is-running';
      const label = paused ? t('In pausa') : waiting ? t('In attesa') : t('Adesso');
      const detail = paused ? t('La condizione non è soddisfatta') : waiting ? t('Un altro schedule o timer ha la priorità') : `${t('Fino alle {time}', {time: clock(item.end_utc)})}${schedule.condition ? ` · ${t('condizione vera')}` : ''}`;
      return `<button type="button" class="sc-now-tile ${kind}" data-command="editSchedule" data-id="${esc(schedule.id)}"><span class="sc-now-label">${label} · ${esc(schedule.target_entity_ids.map(friendly).join(', '))}</span><strong>${esc(describeAction(schedule.start_action) || schedule.name)}</strong><span class="sc-now-detail">${esc(detail)}</span></button>`;
    });
    const timerTiles = timers.map((timer) => `<div class="sc-now-tile is-timer"><span class="sc-now-label">${t('Timer')} · ${esc(friendly(timer.entity_id))}</span><strong>${esc(describeAction(timer.action))}</strong><span class="sc-now-detail">${t('Resta')} <span data-expiry="${esc(timer.expires_at)}"></span>${timer.previous ? ` · ${t('poi')} ${esc(describeState(timer.previous, timer.entity_id.split('.')[0]))}` : ''}</span></div>`);
    const all = [...tiles, ...timerTiles].filter(Boolean);
    return all.length ? `<div class="sc-now">${all.join('')}</div>` : `<p class="sc-now-empty">${t('Nessuna fascia in corso adesso.')}</p>`;
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
    return `<fieldset><legend>${t('Notifica di stato')}</legend><label class="sc-check"><input type="checkbox" name="status_notification" ${status ? 'checked' : ''}>${t('Notifica persistente per tutta la fascia')}</label><p>${t('In Home Assistant compare una notifica che dice se lo schedule è attivo, in pausa per la condizione o in attesa di un altro controllo; si aggiorna da sola e sparisce a fine fascia.')}</p></fieldset>
      <fieldset><legend>${t('Tocco sulla notifica')}</legend><p>${url ? t('Apre <strong>{url}</strong> (app Companion e notifiche di Home Assistant).', {url: esc(url)}) : t('Nessuna pagina impostata: la notifica non apre nulla.')}</p><div class="sc-controls">${url !== here && here ? button('setNotificationUrl',t('Apri questa dashboard'),here) : ''}${url ? button('setNotificationUrl',t('Rimuovi collegamento'),'') : ''}</div></fieldset>`;
  }
  entityPills(selected, allowed) {
    const states = this._hass?.states || {};
    const ids = [...new Set([...targetEntities(this._hass, allowed), ...selected.filter((id) => allowed.includes(id))])].sort();
    return `<div class="sc-entity-pills">${ids.map((id) => `<label class="sc-entity-pill" title="${esc(id)}"><input type="checkbox" name="entities" value="${esc(id)}" ${selected.includes(id) ? 'checked' : ''}><span>${esc(states[id]?.attributes?.friendly_name || id)}</span></label>`).join('')}</div>`;
  }
  entityRadios(ids, selected) {
    const states = this._hass?.states || {};
    return `<label>${t('Ricerca entità')}<input type="search" name="entity_search" placeholder="${t('Nome, dominio o ID')}"></label><div class="sc-entities" role="radiogroup" aria-label="${t('Entità')}">${[...ids].sort().map((id) => `<label data-entity-label="${esc(`${id} ${states[id]?.attributes?.friendly_name || ''}`.toLowerCase())}"><input type="radio" name="entity_id" value="${esc(id)}" ${id === selected ? 'checked' : ''}><span><span class="sc-entity-name">${esc(states[id]?.attributes?.friendly_name || id)}</span><span class="sc-entity-id">${esc(id)}</span></span></label>`).join('')}</div>`;
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
    const slots = readSlots(form, sunMinutes(this._hass)), slot = slots[0];
    const who = `${this._hass.states[ids[0]]?.attributes?.friendly_name || ids[0]}${ids.length > 1 ? ` +${ids.length - 1}` : ''}`;
    const when = slot?.weekdays.length ? `${daysLabel(slot.weekdays)} ${boundaryLabel(slot, 'start')}–${boundaryLabel(slot, 'end')}${slots.length > 1 ? ` (+${slots.length - 1})` : ''}` : '';
    return {
      name: [who, describeAction(start), when].filter(Boolean).join(' · '),
      start_notification_message: `${who}: ${describeAction(start) || t('avvio')}${slot ? ` ${t('alle {time}', {time: slot.start})}` : ''}`,
      end_notification_message: end ? `${who}: ${describeAction(end)}${slot ? ` ${t('alle {time}', {time: slot.end})}` : ''}` : `${who}: ${t('fascia terminata')}${slot ? ` ${t('alle {time}', {time: slot.end})}` : ''}`,
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
  // Preview of a weekly-schedule-card import: what becomes of each schedule.
  importContent(config) {
    const data = this.importData, hass = this._hass;
    const intro = `<p>${t('Gli schedule della weekly-schedule-card vengono <strong>aggiunti</strong> in un nuovo profilo, <strong>disattivato</strong>: nulla viene eseguito finché non lo attivi. La weekly-schedule-card e Scheduler non vengono modificati.')}</p>`;
    const input = `<label>${t('Backup della weekly-schedule-card (.json)')}<input type="file" accept="application/json,.json" data-role="backup-file"></label>`;
    if (!data) return `${intro}<p class="sc-meta">${t('Nella weekly-schedule-card: Gruppi → Manutenzione → Salva configurazione.')}</p>${input}`;
    const {converted, backup} = data;
    const again = (config.migration_metadata?.imports || []).find((x) => x.source === 'weekly-schedule-card' && x.source_created_at && x.source_created_at === backup.createdAt);
    const leaves = (node) => !node ? [] : node.children?.length ? node.children.flatMap(leaves) : [node.entity_id];
    const entities = [...new Set(converted.profiles.flatMap((p) => p.groups.flatMap((g) => [...g.entity_ids, ...g.schedules.flatMap((s) => leaves(s.condition))])))];
    const missing = entities.filter((id) => !hass.states[id]);
    const mark = {ok: ['✓', t('Pronto')], note: ['!', t('Da controllare')], off: ['⏸', t('Importato disattivato')], skip: ['✕', t('Non importato')]};
    const symbol = {numeric_greater: '>', numeric_less: '<', numeric_greater_or_equal: '≥', numeric_less_or_equal: '≤', state_equals: '=', state_not_equals: '≠'};
    const condText = (node) => !node ? '' : ['and', 'or'].includes(node.operator) ? node.children.map(condText).join(node.operator === 'and' ? ` ${t('e')} ` : ` ${t('o')} `) : `${hass.states[node.entity_id]?.attributes?.friendly_name || node.entity_id} ${symbol[node.operator] || node.operator} ${node.value}${node.hysteresis ? ` (${t('isteresi')} ${node.hysteresis})` : ''}`;
    const rows = converted.rows.map((r) => `<li class="sc-import-row is-${r.status}"><span class="sc-import-mark" title="${esc(mark[r.status][1])}" aria-label="${esc(mark[r.status][1])}">${mark[r.status][0]}</span><div><strong>${esc(r.name || r.source)}</strong>${r.slots ? `<span class="sc-meta">${esc(r.slots.map((x) => `${daysLabel(x.weekdays)} ${boundaryLabel(x, 'start')}–${boundaryLabel(x, 'end')}`).join(' · '))} · ${esc(describeAction(r.start))}${r.end ? ` → ${t('alla fine')} ${esc(describeAction(r.end))}` : ''}${r.condition ? ` · ${t('se')} ${esc(condText(r.condition))}` : ''}</span>` : ''}${r.notes.length ? `<ul class="sc-import-notes">${r.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}</div></li>`).join('');
    const count = (status) => converted.rows.filter((r) => r.status === status).length;
    const profiles = converted.profiles.map((p) => `<p>${t('Profilo')} <strong>«${esc(p.name)}»</strong> · ${p.profile_type === 'exclusive' ? t('esclusivo') : t('condiviso')} · ${t('{count} gruppi', {count: p.groups.length})} (${esc(p.groups.map((g) => g.name).join(', '))})${p.wasActive ? ` · ${t('era attivo nella weekly-schedule-card')}` : ''}</p>`).join('');
    return `${intro}${input}<div class="sc-summary"><strong>${esc(data.file)}</strong><p>${t('Salvato il {date}', {date: esc(String(backup.createdAt || '').replace('T', ' ').slice(0, 16) || t('data sconosciuta'))})} · ${t('{ready} pronti · {off} disattivati · {skip} non importati', {ready: count('ok') + count('note'), off: count('off'), skip: count('skip')})}</p>${profiles}
      ${again ? `<p class="sc-error">${t('Questo backup è già stato importato il {date}: importandolo di nuovo gli schedule saranno duplicati.', {date: esc(String(again.imported_at).replace('T', ' ').slice(0, 16))})}</p>` : ''}
      ${missing.length ? `<p class="sc-error">${t('Entità non presenti in questo Home Assistant: {list}', {list: esc(missing.join(', '))})}</p>` : ''}
      <p class="sc-import-warning">${t('Prima di attivare il profilo importato spegni gli stessi schedule nella weekly-schedule-card (o in Scheduler): altrimenti i dispositivi ricevono i comandi due volte.')}</p></div>
      <ul class="sc-import">${rows}</ul>`;
  }
  // Activity counters of one schedule (debug aid, bottom of the editor).
  statsOf(id) { return this.adapter.state?.stats?.[id] || {activations: 0, muted: 0, last_activation: null, last_muted: null}; }
  statsSummary(id) { const s = this.statsOf(id); return s.activations === 1 ? t('1 attivazione') : t('{count} attivazioni', {count: s.activations}); }
  statsBody(id) {
    const s = this.statsOf(id);
    const when = (iso) => iso ? new Intl.DateTimeFormat(locale(), {timeZone: this._hass?.config?.time_zone || undefined, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}).format(new Date(iso)) : t('mai');
    return `<dl class="sc-stats"><dt>${t('Attivazioni')}</dt><dd>${s.activations}</dd><dt>${t('Fasce bloccate dalla condizione')}</dt><dd>${s.muted}</dd><dt>${t('Ultima attivazione')}</dt><dd>${esc(when(s.last_activation))}</dd><dt>${t('Ultimo blocco per condizione')}</dt><dd>${esc(when(s.last_muted))}</dd></dl><p class="sc-meta">${t('Conteggi da quando è installata la versione 0.3.15; una fascia conta una volta sola.')}</p>`;
  }
  // One readable line for a command that failed for good.
  failureText(f) {
    const when = new Intl.DateTimeFormat(locale(), {timeZone: this._hass?.config?.time_zone || undefined, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}).format(new Date(f.at));
    const who = f.quick_timer ? 'Quick Timer' : f.schedule_name || t('Schedule eliminato');
    const what = f.kind === 'notification' ? t('notifica') : f.kind === 'restore' ? t('ripristino dello stato') : f.phase === 'schedule_end' ? t('azione finale') : f.phase === 'condition_fallback' ? t('azione a condizione falsa') : t('azione iniziale');
    const why = {sent_outcome_unknown: t('esito sconosciuto: Home Assistant si è riavviato durante l’invio'), service_failed: t('il servizio ha restituito un errore o non ha risposto ({count} tentativi)', {count: f.attempts}), restore_failed: t('ripristino non riuscito ({count} tentativi)', {count: f.attempts}), notification_failed: t('notifica non inviata ({count} tentativi)', {count: f.attempts}), invalid_payload: t('dati del comando non validi'), invalid_snapshot: t('stato iniziale non disponibile')}[f.error_code] || f.error_code || t('errore sconosciuto');
    const entity = f.entity_id ? ` · ${this._hass?.states?.[f.entity_id]?.attributes?.friendly_name || f.entity_id}` : '';
    return `${when} · ${who}${entity} · ${what}: ${why}`;
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
      this.notice = t('Backup salvato: {profiles} profili, {groups} gruppi, {schedules} schedule.', {profiles: backup.config.profiles.length, groups: backup.config.groups.length, schedules: backup.config.schedules.length});
    } catch (error) {
      this.localError = messageFor({...error, operation: 'schedule_creator/backup/export'});
    }
    this.render();
  }
  async readBackupFile(input) {
    this.localError = null; this.restoreData = null; this.importData = null;
    try {
      const backup = JSON.parse(await input.files[0].text());
      if (isWscBackup(backup)) {
        // A weekly-schedule-card backup is imported next to existing data, never restored over it.
        const config = this.adapter.state.config;
        const converted = convertWscBackup(backup, {existingProfileNames: config.profiles.map((p) => p.name), entityName: (id) => this._hass.states[id]?.attributes?.friendly_name || id, sun: sunMinutes(this._hass)});
        this.importData = {backup, converted, file: input.files[0].name};
        if (this.edit) this.edit = ['import', null];
      } else if (backup?.format === 'schedule_creator.backup' && backup.config) {
        this.restoreData = backup;
        if (this.edit) this.edit = ['restore', null];
      } else throw new Error(t('Il file non è un backup di Schedule Creator né della weekly-schedule-card.'));
    } catch (error) {
      this.localError = error instanceof SyntaxError ? t('Il file non contiene JSON valido.') : error.message;
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
    return `<label>${t('Ricerca entità')}<input type="search" name="entity_search" placeholder="${t('Nome, dominio o ID')}"></label><div class="sc-entities">${ids.sort().map((id) => `<label data-entity-label="${esc(`${id} ${states[id]?.attributes?.friendly_name || ''}`.toLowerCase())}"><input type="checkbox" name="entities" value="${esc(id)}" ${selected.includes(id) ? 'checked' : ''}><span><span class="sc-entity-name">${esc(states[id]?.attributes?.friendly_name || id)}</span><span class="sc-entity-id">${esc(id)}${controllable(this._hass,id)?'':` · ${t('non disponibile/supportata')}`}</span></span></label>`).join('')}</div>`;
  }
  editor(config, profile, group) {
    const [kind, id] = this.edit;
    const item = this.editRecord;
    const d = this.draft || {};
    let content = '';
    if (kind === 'profile') content = `${field('name', t('Nome'), item?.name)}${select('profile_type', t('Tipo'), [['exclusive',t('Esclusivo')],['shared',t('Condiviso')]], item?.profile_type || 'exclusive')}${iconPicker(d.icon ?? item?.icon)}${colorPicker(d.color ?? item?.color)}${field('order',t('Posizione nell’elenco (0 = primo)'),item?.order ?? 0,'number')}<p>${t('Serve solo a ordinare l’elenco: non cambia priorità né esecuzione.')}</p>`;
    if (kind === 'group') content = `${field('name',t('Nome'),item?.name)}${iconPicker(d.icon ?? item?.icon)}${colorPicker(d.color ?? item?.color)}${field('order',t('Posizione nell’elenco (0 = primo)'),item?.order ?? 0,'number')}<p>${t('Serve solo a ordinare l’elenco: non cambia priorità né esecuzione.')}</p>${this.entities(d.selectedEntities || item?.entity_ids || [])}`;
    if (kind === 'schedule') {
      const owner = config.groups.find((g) => g.id === this.ownerGroup);
      const ids = d.selectedEntities || item?.target_entity_ids || targetEntities(this._hass,owner?.entity_ids || []).slice(0,1);
      this.actionDomain = ids[0]?.split('.')[0] || this.actionDomain;
      const slots = this.slotDraft || item?.time_slots || [{weekdays:[0,1,2,3,4,5,6],start:'08:00',end:'09:00'}];
      const condition = this.conditionDraft === undefined ? item?.condition : this.conditionDraft;
      const friendly = (x) => this._hass.states[x]?.attributes?.friendly_name || x;
      const endSummary = d.end_mode ? pretty(d.end_mode) : this.actionReset || !item?.end_action ? t('Nessuna azione') : describeAction(item.end_action);
      const leafs = (node) => !node ? [] : ['and','or'].includes(node.operator) ? node.children.flatMap(leafs) : [node];
      const conditionSummary = !condition ? t('Nessuna') : leafs(condition).length > 1 ? t('{count} condizioni', {count: leafs(condition).length}) : friendly(leafs(condition)[0].entity_id) || t('Da completare');
      const notified = (key, fallback) => d[`${key}_enabled`] === undefined ? !!fallback : d[`${key}_enabled`] === 'on';
      const notificationSummary = [notified('start_notification', item?.start_notification) && t('Inizio'), notified('end_notification', item?.end_notification) && t('Fine'), (d.status_notification === undefined ? this.statusEnabled(config, item?.id) : d.status_notification === 'on') && t('Stato')].filter(Boolean).join(' · ') || t('Nessuna');
      const row = (section, label, summary, body) => `<details class="sc-row" data-section="${section}"><summary><span>${label}</span><em>${esc(summary)}</em></summary><div class="sc-row-body">${body}</div></details>`;
      content = `<div class="sc-name-row">${field('name',t('Nome'),item?.name)}${button('suggestName',t('Suggerisci'))}</div>
        <div class="sc-field"><span class="sc-field-label">${t('Dispositivi')} · ${esc(owner?.name || t('gruppo'))}</span>${this.entityPills(ids,owner?.entity_ids || [])}</div>
        <div class="sc-section-label">${t('Quando')}</div>${slotsForm(slots,{others:this.otherSlots(config,ids,item?.id),snap:this.snap})}
        <div class="sc-section-label">${t('All’inizio')}</div>${actionForm('start',t('Azione iniziale'),this._hass,ids,this.actionReset?null:item?.start_action,false,d)}
        <div class="sc-rows">
        ${row('row-end',t('Alla fine'),endSummary,actionForm('end',t('Azione finale'),this._hass,ids,this.actionReset?null:item?.end_action,true,d))}
        ${row('row-conditions',t('Condizioni'),conditionSummary,`${conditionForm(condition,this._hass)}<datalist id="sc-condition-entities">${Object.keys(this._hass.states||{}).sort().map((id)=>`<option value="${esc(id)}">${esc(this._hass.states[id].attributes?.friendly_name||id)}</option>`).join('')}</datalist><p>${t('Se falsa: azione finale se presente, altrimenti ripristino deciso dal motore. La fine fascia senza azione finale non invia comandi.')}</p>`)}
        ${row('row-notifications',t('Notifiche'),notificationSummary,`${notificationForm('start_notification',t('Notifica iniziale'),item?.start_notification,this._hass,d)}${notificationForm('end_notification',t('Notifica finale'),item?.end_notification,this._hass,d)}${this.notificationExtras(config,item)}`)}
        ${row('row-options',t('Altre opzioni'),item?.enabled === false ? t('Disabilitato') : t('Abilitato'),`<label class="sc-check"><input name="enabled" type="checkbox" ${item?.enabled !== false ? 'checked' : ''}>${t('Schedule abilitato')}</label><p>${t('Orari nel fuso {zone}. Se la fine precede l’inizio, la fascia termina il giorno successivo.', {zone: esc(this._hass.config?.time_zone || 'Home Assistant')})}</p>${select('override_policy',t('Comandi manuali'), [['cooperative',t('Cooperativa')],['manual_override',t('Priorità al comando manuale')]],item?.override_policy || 'cooperative')}${field('inclusion_dates',t('Date incluse (AAAA-MM-GG, separate da virgola)'),(item?.inclusion_dates || []).join(', '))}${field('exclusion_dates',t('Date escluse (AAAA-MM-GG, separate da virgola)'),(item?.exclusion_dates || []).join(', '))}`)}
        ${id ? row('row-stats',t('Statistiche'),this.statsSummary(id),this.statsBody(id)) : ''}
        </div>
        <details><summary>${t('Pro · configurazione JSON')}</summary><label class="sc-check"><input type="checkbox" name="pro_config_enabled">${t('Usa JSON per condizioni, fasce e notifiche')}</label>${area('pro_config',t('Configurazione avanzata'),json({time_slots:slots,condition:condition||null,start_notification:item?.start_notification||null,end_notification:item?.end_notification||null}),8)}</details>`;
    }
    if (kind === 'restore') {
      const b = this.restoreData?.config;
      const missing = b ? [...new Set([...(b.groups || []).flatMap((g) => g.entity_ids || []), ...(b.schedules || []).flatMap((x) => x.target_entity_ids || [])])].filter((id) => !this._hass.states[id]) : [];
      content = `<p>${t('Il ripristino <strong>sostituisce</strong> tutti i profili, gruppi e schedule attuali con quelli del file. I profili ripristinati restano <strong>disattivati</strong>: attivali quando vuoi che eseguano i comandi. Timer e fasce in corso non fanno parte del backup.')}</p><label>${t('File di backup (.json)')}<input type="file" accept="application/json,.json" data-role="backup-file"></label>${b ? `<div class="sc-summary"><strong>${t('Contenuto del file')}</strong><p>${t('{profiles} profili · {groups} gruppi · {schedules} schedule', {profiles: (b.profiles || []).length, groups: (b.groups || []).length, schedules: (b.schedules || []).length})}</p><p>${t('Salvato il {date} con la versione {version}.', {date: esc(String(this.restoreData.exported_at || '').replace('T', ' ').slice(0, 16) || t('data sconosciuta')), version: esc(this.restoreData.integration_version || t('sconosciuta'))})}</p>${missing.length ? `<p class="sc-error">${t('Entità non presenti in questo Home Assistant: {list}. Gli schedule collegati non potranno comandarle.', {list: esc(missing.join(', '))})}</p>` : ''}</div>` : `<p>${t('Scegli un file creato con “Salva backup”.')}</p>`}`;
    }
    if (kind === 'import') content = this.importContent(config);
    if (kind === 'reset') {
      const timers = this.adapter.state.quick_timers?.length ?? 0;
      content = `<p>${t('RESET cancella <strong>tutti</strong> i dati di Schedule Creator: {profiles} profili, {groups} gruppi, {schedules} schedule, {timers} timer attivi, fasce in corso e storico operazioni. L’integrazione resta installata e vuota.', {profiles: config.profiles.length, groups: config.groups.length, schedules: config.schedules.length, timers})}</p><p>${t('I dispositivi restano nello stato in cui si trovano: nessun comando di spegnimento o ripristino viene inviato. Dispositivi, entità, automazioni e la vecchia weekly-schedule-card non vengono toccati.')}</p><p>${t('Prima di procedere puoi salvare un backup.')}</p><div class="sc-controls">${button('exportBackup',t('Salva backup'))}</div>${field('confirm',t('Scrivi RESET per confermare'),'')}`;
    }
    if (kind === 'timer') {
      const ids = targetEntities(this._hass);
      const selected = d.entity_id || ids[0];
      this.actionDomain = selected?.split('.')[0];
      content = `${this.entityRadios(ids,selected)}${field('duration_seconds',t('Durata in secondi (1–604800)'),300,'number')}${actionForm('timer',t('Azione timer'),this._hass,selected?[selected]:[],null,false,d)}`;
    }
    const subtitle = kind === 'schedule' ? config.groups.find((g) => g.id === this.ownerGroup)?.name : kind === 'group' ? profile?.name : '';
    return `<form data-editor="${esc(kind)}" class="sc-editor"><h3 id="sc-editor-title">${subtitle ? `<small>${esc(subtitle)}</small>` : ''}${({profile:id?t('Modifica profilo'):t('Nuovo profilo'),group:id?t('Modifica gruppo'):t('Nuovo gruppo'),schedule:id?t('Modifica schedule'):t('Nuovo schedule'),timer:'Quick Timer',restore:t('Ripristina backup'),import:t('Importa da Weekly Schedule Card'),reset:t('RESET completo')})[kind]}</h3>${content}<div class="sc-actions"><button type="submit" class="sc-save ${kind === 'reset' ? 'sc-danger' : ''}">${({restore:t('Ripristina'),import:t('Importa'),reset:t('Cancella tutto'),schedule:t('Salva schedule')})[kind] || t('Salva')}</button>${button('close',t('Annulla'))}</div></form>`;
  }
  async click(event) {
    const track = event.target.closest?.('.sc-day-track');
    if (track && !event.target.closest('.sc-time-block') && !this.adapter.busy && track.dataset.day !== undefined && this.canAddSchedule()) {
      // Clicking free space starts a one-hour slot at that half hour, like weekly-schedule-card.
      const rect = track.getBoundingClientRect();
      const minutes = Math.min(1380, Math.max(0, Math.floor((event.clientY - rect.top) / (rect.height || 1) * 48) * 30));
      this.openEditor('newSchedule', '', {weekdays: [Number(track.dataset.day)], start: toTime(minutes), end: toTime(minutes + 60)});
      return;
    }
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
    if (/^(new|edit)/.test(command)) { this.openEditor(command, id); return; }
    const types = { toggleProfile: 'profile/set_active', deleteProfile: 'profile/delete', deleteGroup: 'group/delete', deleteSchedule: 'schedule/delete', cancelTimer: 'quick_timer/cancel' };
    return this.runCommand(command, id, types);
  }
  openEditor(command, id, slot = null) {
    {
      if(this._hass?.user?.is_admin !== true) return;
      this.editorOpener={command,id};
      this.adapter.writeError=null;
      const kind = command.replace(/^(new|edit)/,'').toLowerCase();
      const config = this.adapter.state.config;
      const profile = config.profiles.find((p)=>p.id===this.selectedProfile)||config.profiles[0];
      const group = config.groups.find((g)=>g.id===this.selectedGroup)||config.groups.find((g)=>g.profile_id===profile?.id);
      this.edit = [kind,id||null];
      this.editRecord = id ? structuredClone(config[`${kind}s`].find((x)=>x.id===id)) : null;
      this.auto = {}; this.restoreData = null; this.importData = null; this.notice = null;
      this.ownerGroup = this.editRecord?.group_id || group?.id;
      this.ownerProfile = this.editRecord?.profile_id || profile?.id;
      this.editRevision = this.adapter.state.revision;
      this.changedFields = new Set();
      this.slotDraft = null; this.conditionDraft = undefined; this.actionReset = false; this.actionDomain = null;
      if (slot) this.slotDraft = [slot];
      this.draft = null; this.localError = null; this.localErrorDetails = null; this.render();
    }
  }
  async runCommand(command, id, types) {
    if (!types[command]) return;
    if (command.startsWith('delete') && !confirm(t('Eliminare questo elemento?'))) return;
    const payload = command === 'toggleProfile' ? { profile_id: id, active: !this.adapter.state.config.profiles.find((p) => p.id === id)?.active } :
      { [command === 'cancelTimer' ? 'quick_timer_id' : `${command.slice(6).toLowerCase()}_id`]: id };
    if (this.adapter.conflicted && !confirm(t('I dati sono cambiati su un altro client. Hai verificato le modifiche prima di procedere?'))) return;
    await this.adapter.mutate(types[command], payload, { runtime: command === 'cancelTimer' });
  }
  async submit(event) {
    const form = event.target.closest('form[data-editor]'); if (!form) return;
    event.preventDefault(); if (this.adapter.busy) return;
    this.localError = null; this.localErrorDetails = null;
    const [kind,id] = this.edit;
    const type = ({timer:'quick_timer/create',restore:'backup/import',import:'import/merge',reset:'reset'})[kind] || `${kind}/${id ? 'update' : 'create'}`;
    let phase = t('lettura del modulo');
    try {
      this.capture();
      const data = Object.fromEntries(new FormData(form));
      const config = this.adapter.state.config;
      let payload;
      phase = t('validazione del nome');
      if (!['timer','restore','import','reset'].includes(kind) && !data.name?.trim()) throw new Error(t('Inserisci un nome prima di salvare.'));
      if (kind === 'restore') {
        if (!this.restoreData) throw new Error(t('Scegli prima un file di backup.'));
        payload = {backup: this.restoreData};
      }
      if (kind === 'import') {
        const count = this.importData?.converted.profiles.reduce((n, p) => n + p.groups.reduce((m, g) => m + g.schedules.length, 0), 0);
        if (!count) throw new Error(t('Scegli prima un backup della weekly-schedule-card con almeno uno schedule importabile.'));
        payload = wscImportPayload(this.importData.converted, this.importData.backup);
      }
      if (kind === 'reset') {
        if (data.confirm?.trim() !== 'RESET') throw new Error(t('Scrivi RESET in maiuscolo per confermare la cancellazione.'));
        payload = {confirm: 'RESET'};
      }
      phase = t('preparazione dei dati');
      if (kind === 'profile') payload = { name: data.name.trim(), profile_type: data.profile_type, icon: data.icon || null, color: data.color || null, order: Number(data.order) };
      if (kind === 'group') payload = { name: data.name.trim(), entity_ids: this.draft.selectedEntities, icon: data.icon || null, color: data.color || null, order: Number(data.order) };
      if (kind === 'schedule') {
        phase = t('validazione delle entità');
        const owner = config.groups.find((g)=>g.id===this.ownerGroup);
        const domain = this.draft.selectedEntities[0]?.split('.')[0];
        if (!domain || !this.draft.selectedEntities.every((x)=>x.startsWith(`${domain}.`) && owner?.entity_ids.includes(x))) throw new Error(t('Scegli entità dello stesso tipo appartenenti al gruppo.'));
        phase = t('lettura delle fasce orarie');
        const slots = readSlots(form, sunMinutes(this._hass));
        if (!slots.length || slots.some((s)=>!s.weekdays.length || !s.start || !s.end || s.start===s.end)) throw new Error(t('Ogni fascia richiede almeno un giorno e orari diversi.'));
        const dates = (str)=>[...new Set(str.split(',').map((x)=>x.trim()).filter(Boolean))].sort();
        phase = t('lettura azione iniziale');
        const startAction = readAction(form,'start',domain);
        phase = t('lettura azione finale');
        const endAction = readAction(form,'end',domain);
        phase = t('lettura condizioni e notifiche');
        payload = {name:data.name.trim(),enabled:form.elements.enabled.checked,target_entity_ids:this.draft.selectedEntities,
          time_slots:slots,start_action:startAction,end_action:endAction,
          condition:readCondition(form),override_policy:data.override_policy,inclusion_dates:dates(data.inclusion_dates),exclusion_dates:dates(data.exclusion_dates),
          start_notification:readNotification(form,'start_notification'),end_notification:readNotification(form,'end_notification')};
        if (form.elements.pro_config_enabled.checked) {
          const pro = parseJson(data.pro_config,t('Configurazione Pro'));
          if (!pro || Array.isArray(pro) || typeof pro!=='object' || Object.keys(pro).some((k)=>!['time_slots','condition','start_notification','end_notification'].includes(k))) throw new Error(t('Campi Pro non validi.'));
          Object.assign(payload,clean(pro));
        }
        for (const key of ['start_notification','end_notification']) if (payload[key] && !payload[key].message.trim()) throw new Error(t('Inserisci il messaggio della notifica oppure disabilitala.'));
        const statusWanted = form.elements.status_notification?.checked ?? false;
        if (statusWanted !== this.statusEnabled(config, id)) payload.status_notification = statusWanted;
        const validateCondition = (node) => {if (!node) return;if (['and','or'].includes(node.operator)) {if(node.children.length<2) throw new Error(t('Servono due regole per E/O.'));node.children.forEach(validateCondition);} else {if (!node.entity_id || !this._hass.states[node.entity_id]) throw new Error(t('Seleziona un’entità valida nella condizione.'));if (node.operator === 'numeric_range' ? node.lower === null || node.upper === null : node.operator !== 'available' && (node.value === null || node.value === '')) throw new Error(t('Completa il valore della condizione.'));}};
        validateCondition(payload.condition);
      }
      if (kind === 'timer') { const domain = data.entity_id.split('.')[0]; payload = {entity_id:data.entity_id,duration_seconds:Number(data.duration_seconds),action:readAction(form,'timer',domain)}; if (payload.duration_seconds<1 || payload.duration_seconds>604800) throw new Error(t('La durata deve essere tra 1 e 604800 secondi.')); }
      if (!payload) throw new Error(t('Editor non disponibile.'));
      phase = t('confronto con la configurazione esistente');
      if (this.adapter.conflicted && !confirm(t('I dati sono cambiati su un altro client. Hai confrontato la bozza con i nuovi dati prima di salvare?'))) return;
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
      phase = t('salvataggio e aggiornamento della vista');
      const ok = await this.adapter.mutate(type,payload,{ runtime: kind === 'timer', expectedRevision: kind === 'timer' || this.adapter.conflicted ? undefined : this.editRevision });
      if (ok && kind === 'import') {
        const names = this.importData.converted.profiles.map((p) => p.name);
        this.selectedProfile = this.adapter.state?.config?.profiles?.find((p) => p.name === names[0])?.id || null; this.selectedGroup = null;
        this.notice = t('Importato in {names}. Il profilo è disattivato: spegni gli schedule nella weekly-schedule-card prima di attivarlo.', {names: names.map((n) => `«${n}»`).join(', ')});
      }
      if (ok && ['restore','reset'].includes(kind)) {
        this.selectedProfile = null; this.selectedGroup = null;
        this.notice = kind === 'reset' ? t('RESET completato: Schedule Creator è vuoto.') : t('Backup ripristinato. I profili sono disattivati: attivali per eseguire gli schedule.');
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
    setLanguage(this._hass, this.config);
    this.innerHTML = `<div style="padding:12px"><label>${t('Titolo della card')} <input type="text" value="${esc(this.config.title || '')}"></label></div>`;
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
// Standalone Quick Timer card, like weekly-schedule-card's quick-timer-card.
// Same backend and bundle as the main card: timers live in Schedule Creator.






const qtEsc = uiEscape;
const QT_STYLE = ":host {\n  overflow-anchor: none;\n  display: block;\n  font-family: var(--primary-font-family, Arial, sans-serif);\n  color: var(--primary-text-color, #202a35);\n  container-type: inline-size;\n  --sc-accent: var(--primary-color, #00897b);\n  --sc-muted: var(--secondary-text-color, #647180);\n  --sc-surface: var(--secondary-background-color, #f4f6f8);\n  --sc-border: var(--divider-color, #dce2e7);\n}\n* {\n  box-sizing: border-box;\n}\nha-card {\n  display: block;\n  overflow: hidden;\n  padding: 24px;\n  border-radius: var(--ha-card-border-radius, 20px);\n  background: var(--card-background-color, #fff);\n}\nbutton,\ninput,\nselect,\ntextarea {\n  font: inherit;\n  color: inherit;\n}\nbutton {\n  min-height: 40px;\n  padding: 9px 14px;\n  border: 1px solid var(--sc-border);\n  border-radius: 10px;\n  background: var(--card-background-color, #fff);\n  cursor: pointer;\n  line-height: 1.3;\n  transition:\n    background 0.15s,\n    border-color 0.15s;\n}\nbutton:hover {\n  background: var(--sc-surface);\n  border-color: var(--sc-accent);\n}\nbutton:disabled {\n  opacity: 0.5;\n  cursor: wait;\n}\nbutton:focus-visible,\ninput:focus-visible,\nselect:focus-visible,\ntextarea:focus-visible,\nsummary:focus-visible {\n  outline: 3px solid var(--sc-accent);\n  outline-offset: 3px;\n}\nbutton[data-command^=\"delete\"],\nbutton[data-command^=\"remove\"] {\n  color: var(--error-color, #b3261e);\n}\nbutton[data-command=\"newSchedule\"],\n.sc-actions button[type=\"submit\"] {\n  background: var(--sc-accent);\n  color: var(--text-primary-color, #fff);\n  border-color: var(--sc-accent);\n  font-weight: 600;\n}\n.card-header {\n  margin-bottom: 20px;\n}\n.hdr-row1 {\n  display: flex;\n  gap: 12px;\n  align-items: center;\n  margin-bottom: 20px;\n}\n.card-title {\n  font-size: 1.4rem;\n  font-weight: 700;\n  letter-spacing: -0.03em;\n}\n.sc-version {\n  margin-left: auto;\n  color: var(--sc-muted);\n  font-size: 0.72rem;\n  border: 1px solid var(--sc-border);\n  border-radius: 20px;\n  padding: 4px 8px;\n}\n.sc-eyebrow {\n  font-size: 0.7rem;\n  font-weight: 700;\n  letter-spacing: 0.1em;\n  text-transform: uppercase;\n  color: var(--sc-muted);\n  margin: 0 0 8px;\n}\n.hdr-row2 {\n  display: flex;\n  gap: 8px;\n  overflow-x: auto;\n  padding: 3px 2px 8px;\n}\n.profile-chip {\n  flex-shrink: 0;\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  border-radius: 24px;\n  color: var(--sc-muted);\n}\n.profile-chip.viewed {\n  color: var(--primary-text-color, #202a35);\n  border-color: var(--pchip-color);\n  background: color-mix(\n    in srgb,\n    var(--pchip-color) 12%,\n    var(--card-background-color, #fff)\n  );\n  font-weight: 600;\n}\n.profile-chip.active-op::before {\n  content: \"\";\n  width: 7px;\n  height: 7px;\n  border-radius: 50%;\n  background: var(--success-color, #388e3c);\n}\n.profile-status-bar {\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 8px;\n  font-size: 0.8rem;\n  color: var(--sc-muted);\n  margin: 0 0 18px;\n}\n.sc-badge {\n  display: inline-flex;\n  align-items: center;\n  padding: 5px 9px;\n  border-radius: 6px;\n  background: var(--sc-surface);\n  font-size: 0.73rem;\n  font-weight: 600;\n}\n.sc-badge.is-active {\n  color: var(--success-color, #287d39);\n  background: color-mix(\n    in srgb,\n    var(--success-color, #287d39) 10%,\n    var(--card-background-color, #fff)\n  );\n}\n.tab-bar {\n  display: flex;\n  overflow-x: auto;\n  gap: 5px;\n  border-bottom: 1px solid var(--sc-border);\n  margin-bottom: 20px;\n  padding-bottom: 8px;\n}\n.tab {\n  white-space: nowrap;\n  border-color: transparent;\n  color: var(--sc-muted);\n}\n.tab.active {\n  color: var(--sc-accent);\n  background: color-mix(\n    in srgb,\n    var(--sc-accent) 9%,\n    var(--card-background-color, #fff)\n  );\n  font-weight: 600;\n}\n.sc-toolbar,\n.sc-controls,\n.sc-actions,\n.sc-entry-actions {\n  display: flex;\n  gap: 8px;\n  flex-wrap: wrap;\n  align-items: center;\n}\n.sc-toolbar {\n  justify-content: space-between;\n  margin: 20px 0 14px;\n}\n.sc-toolbar h2 {\n  font-size: 1.05rem;\n  margin: 0;\n}\n.sc-toolbar p {\n  margin: 4px 0 0;\n  color: var(--sc-muted);\n  font-size: 0.8rem;\n}\n.sc-controls {\n  margin: 14px 0;\n}\n.sc-week {\n  display: grid;\n  grid-template-columns: repeat(7, minmax(0, 1fr));\n  gap: 7px;\n  margin: 14px 0 24px;\n}\n.sc-day {\n  min-width: 0;\n  min-height: 124px;\n  padding: 10px 7px;\n  border: 1px solid var(--sc-border);\n  border-radius: 12px;\n  background: var(--sc-surface);\n}\n.sc-day > strong {\n  display: block;\n  color: var(--sc-muted);\n  font-size: 0.72rem;\n  font-weight: 600;\n  margin: 0 2px 10px;\n}\n.sc-slot {\n  margin-top: 7px;\n  padding: 8px 7px;\n  border-radius: 6px;\n  background: var(--card-background-color, #fff);\n  border-left: 3px solid var(--pchip-color, var(--sc-accent));\n  font-size: 0.72rem;\n  overflow-wrap: anywhere;\n  line-height: 1.5;\n}\n.sc-slot time {\n  font-size: 0.66rem;\n  font-variant-numeric: tabular-nums;\n  color: var(--sc-muted);\n}\n.sc-slot.is-off {\n  opacity: 0.6;\n  border-left-style: dashed;\n}\n.sc-day-empty {\n  color: var(--sc-muted);\n  font-size: 0.72rem;\n}\n.sc-list {\n  list-style: none;\n  padding: 0;\n  margin: 4px 0 0;\n  display: grid;\n  gap: 4px;\n}\n.sc-entry {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 10px;\n  padding: 7px 8px 7px 12px;\n  border: 1px solid var(--sc-border);\n  border-left: 3px solid var(--block-color, var(--sc-accent));\n  border-radius: 8px;\n}\n.sc-entry-copy {\n  min-width: 0;\n  display: grid;\n  gap: 2px;\n}\n.sc-entry strong {\n  font-size: 0.84rem;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.sc-entry .sc-meta {\n  margin: 0;\n  font-size: 0.72rem;\n  line-height: 1.35;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.sc-meta {\n  font-size: 0.76rem;\n  color: var(--sc-muted);\n  margin: 6px 0 0;\n  overflow-wrap: anywhere;\n  line-height: 1.5;\n}\n.sc-entry-actions {\n  flex-shrink: 0;\n  flex-wrap: nowrap !important;\n  gap: 4px !important;\n}\n.sc-entry-actions button {\n  font-size: 0.72rem;\n  min-height: 30px;\n  padding: 4px 9px;\n  border-radius: 7px;\n}\n.sc-empty {\n  padding: 30px 18px;\n  border: 1px dashed var(--sc-border);\n  border-radius: 14px;\n  background: var(--sc-surface);\n  text-align: center;\n  color: var(--sc-muted);\n  font-size: 0.85rem;\n  line-height: 1.6;\n}\n.sc-empty strong {\n  display: block;\n  color: var(--primary-text-color, #202a35);\n  font-size: 1rem;\n  margin-bottom: 5px;\n}\ndetails {\n  border: 1px solid var(--sc-border);\n  border-radius: 12px;\n  padding: 12px 14px;\n  margin: 12px 0;\n}\nsummary {\n  cursor: pointer;\n  font-size: 0.82rem;\n  font-weight: 600;\n  min-height: 24px;\n  line-height: 24px;\n}\ndetails[open] > summary {\n  margin-bottom: 12px;\n}\n.sc-operational {\n  margin-top: 20px;\n  color: var(--sc-muted);\n  font-size: 0.8rem;\n}\n.sc-operational p {\n  line-height: 1.6;\n}\n.sc-editor {\n  padding: 22px;\n  margin: 20px 0;\n  border: 1px solid var(--sc-border);\n  border-radius: 16px;\n  display: grid;\n  gap: 16px;\n  background: var(--sc-surface);\n}\n.sc-editor h3 {\n  font-size: 1.15rem;\n  margin: 0;\n  letter-spacing: -0.02em;\n}\n.sc-editor p {\n  font-size: 0.8rem;\n  color: var(--sc-muted);\n  line-height: 1.6;\n  margin: 0;\n}\n.sc-editor label {\n  display: grid;\n  gap: 7px;\n  font-size: 0.8rem;\n  font-weight: 500;\n  min-width: 0;\n}\n.sc-editor input,\n.sc-editor select,\n.sc-editor textarea {\n  width: 100%;\n  max-width: 100%;\n  min-height: 44px;\n  padding: 10px 12px;\n  background: var(--card-background-color, #fff);\n  border: 1px solid var(--sc-border);\n  border-radius: 8px;\n  font-size: 0.9rem;\n}\n.sc-editor textarea {\n  font-family: monospace;\n  line-height: 1.5;\n  resize: vertical;\n}\n.sc-editor fieldset {\n  min-width: 0;\n  border: 1px solid var(--sc-border);\n  border-radius: 12px;\n  padding: 16px;\n  display: grid;\n  gap: 14px;\n  background: var(--card-background-color, #fff);\n  margin: 0;\n}\n.sc-editor legend {\n  font-size: 0.8rem;\n  font-weight: 700;\n  padding: 0 7px;\n}\n.sc-editor details {\n  margin: 0;\n  background: var(--card-background-color, #fff);\n}\n.sc-editor details > * + * {\n  margin-top: 12px;\n}\n.sc-check {\n  display: flex !important;\n  align-items: center;\n  gap: 9px !important;\n}\n.sc-editor input[type=\"checkbox\"] {\n  width: 18px !important;\n  min-height: 18px;\n  height: 18px;\n  accent-color: var(--sc-accent);\n  flex-shrink: 0;\n}\n.sc-entities {\n  max-height: 240px;\n  overflow: auto;\n  display: grid;\n  gap: 5px;\n  border: 1px solid var(--sc-border);\n  padding: 6px;\n  border-radius: 10px;\n  background: var(--card-background-color, #fff);\n}\n.sc-entities label {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  min-height: 48px;\n  padding: 8px 10px;\n  border-radius: 7px;\n  font-weight: 400;\n}\n.sc-entities label:hover {\n  background: var(--sc-surface);\n}\n.sc-entity-name {\n  display: block;\n  font-weight: 500;\n}\n.sc-entity-id {\n  display: block;\n  font-size: 0.7rem;\n  color: var(--sc-muted);\n  margin-top: 3px;\n  overflow-wrap: anywhere;\n}\n.sc-days {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 7px;\n}\n.sc-days label {\n  padding: 8px;\n  border: 1px solid var(--sc-border);\n  border-radius: 8px;\n}\n.sc-actions {\n  padding-top: 16px;\n  border-top: 1px solid var(--sc-border);\n}\n.sc-actions button {\n  min-width: 100px;\n}\n.status,\n.sc-error {\n  padding: 12px 14px;\n  border-radius: 10px;\n  font-size: 0.85rem;\n  line-height: 1.6;\n  margin: 12px 0;\n  background: var(--sc-surface);\n}\n.sc-error,\n.error {\n  color: var(--error-color, #b3261e);\n  background: color-mix(\n    in srgb,\n    var(--error-color, #b3261e) 8%,\n    var(--card-background-color, #fff)\n  );\n  overflow-wrap: anywhere;\n}\n[hidden],\n.sc-entities label[hidden] {\n  display: none !important;\n}\n@container (max-width:600px) {\n  ha-card {\n    padding: 16px;\n  }\n  .card-title {\n    font-size: 1.2rem;\n  }\n  .sc-week {\n    grid-template-columns: 1fr;\n    gap: 7px;\n  }\n  .sc-day {\n    display: grid;\n    grid-template-columns: 34px 1fr;\n    gap: 5px 9px;\n    min-height: 45px;\n    padding: 9px;\n  }\n  .sc-day > strong {\n    grid-row: 1/20;\n    margin: 5px 0;\n  }\n  .sc-slot {\n    margin: 0;\n    padding: 6px 9px;\n  }\n  .sc-slot time {\n    margin-right: 8px;\n  }\n  .sc-editor {\n    padding: 14px;\n  }\n  .sc-toolbar {\n    align-items: flex-start;\n  }\n  .sc-toolbar .sc-controls {\n    margin: 0;\n  }\n  .sc-days {\n    gap: 5px;\n  }\n  .sc-days label {\n    padding: 7px;\n  }\n  .sc-editor fieldset {\n    padding: 12px;\n  }\n}\n@media (prefers-reduced-motion: reduce) {\n  * {\n    transition: none !important;\n  }\n}\n.sc-slot time {\n  display: block;\n}\n.sc-editor {\n  scroll-margin-top: 16px;\n}\n.sc-error-details textarea {\n  width: 100%;\n  box-sizing: border-box;\n  background: var(--card-background-color, #fff);\n  color: var(--primary-text-color, #202a35);\n  border: 1px solid var(--sc-border);\n  border-radius: 8px;\n  padding: 10px;\n  font: 12px/1.5 monospace;\n  resize: vertical;\n}\n.sc-error-details p {\n  font-size: .8rem;\n  color: var(--sc-muted);\n}\n.sc-timeline {\n  overflow-x: auto;\n  padding: 8px 0 14px;\n  overscroll-behavior-x: contain;\n}\n.sc-timeline-head, .sc-timeline-grid {\n  display: grid;\n  grid-template-columns: 38px repeat(7,minmax(0,1fr));\n  gap: 4px;\n}\n.sc-timeline-head { margin-bottom: 10px; text-align: center; font-size: .74rem; color: var(--sc-muted); }\n.sc-time-axis, .sc-day-track { position: relative; height: 576px; }\n.sc-time-axis span { position:absolute; right:4px; transform:translateY(-50%); font-size:.65rem; font-variant-numeric:tabular-nums; color:var(--sc-muted); }\n.sc-day-track {\n  border-radius: 7px;\n  background: repeating-linear-gradient(to bottom, var(--sc-border) 0 1px, transparent 1px 24px), var(--sc-surface);\n}\n.sc-time-block {\n  position:absolute;\n  display:flex;\n  flex-direction:column;\n  align-items:flex-start;\n  justify-content:flex-start;\n  min-height:8px;\n  padding:3px 4px;\n  border:1px solid var(--card-background-color,#fff);\n  border-left:3px solid var(--block-color);\n  border-radius:5px;\n  background:color-mix(in srgb,var(--block-color) 34%,var(--card-background-color,#fff));\n  color:var(--primary-text-color,#202a35);\n  font-size:.68rem;\n  line-height:1.3;\n  text-align:left;\n  overflow:hidden;\n}\n.sc-time-block span { font-weight:600; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }\n.sc-time-block small { font-size:.6rem; white-space:nowrap; }\n.sc-time-block:hover { background:color-mix(in srgb,var(--block-color) 38%,var(--card-background-color,#fff)); }\n.sc-time-block.is-off { opacity:.55; border-style:dashed; }\n.sc-dialog {\n  width:min(680px,calc(100vw - 24px));\n  max-height:calc(100dvh - 32px);\n  padding:0 20px 20px;\n  border:1px solid var(--sc-border);\n  border-radius:18px;\n  background:var(--card-background-color,#fff);\n  color:var(--primary-text-color,#202a35);\n  box-shadow:0 20px 70px #0005;\n  overscroll-behavior:contain;\n}\n.sc-dialog::backdrop { background:#0008; }\n.sc-dialog-heading { position:sticky; top:0; z-index:2; display:flex; align-items:center; justify-content:space-between; padding:12px 0; background:var(--card-background-color,#fff); border-bottom:1px solid var(--sc-border); }\n.sc-dialog-heading button { min-width:40px; }\n.sc-dialog .sc-editor { margin:16px 0 0; padding:0; border:0; background:transparent; }\n.sc-dialog .sc-actions { position:sticky; bottom:-20px; padding:12px 0; background:var(--card-background-color,#fff); z-index:1; }\n@media (max-width:600px) {\n  .sc-dialog { width:calc(100vw - 12px); max-height:calc(100dvh - 12px); padding:0 14px 14px; }\n  .sc-dialog .sc-actions { bottom:-14px; }\n}\n@container (max-width:600px) {\n  .sc-slot time {\n    display: inline-block;\n  }\n}\n\n/* Desired-state action editor (weekly-schedule-card Quick Timer style) */\n.sc-field { display: grid; gap: 8px; min-width: 0; }\n.sc-field-label { font-size: .8rem; font-weight: 500; }\n.sc-current { display: flex; justify-content: space-between; gap: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--sc-border); }\n.sc-current strong { color: var(--primary-text-color, #202a35); font-weight: 600; }\n.sc-action-fields { display: grid; gap: 16px; }\n.sc-choices {\n  display: flex; flex-wrap: wrap; gap: 4px; padding: 4px;\n  border-radius: 12px; background: var(--sc-surface);\n}\n.sc-editor label.sc-choice {\n  position: relative; flex: 1 1 auto; display: flex; flex-direction: column;\n  align-items: center; justify-content: center; gap: 4px; min-width: 64px; min-height: 42px;\n  padding: 8px 10px; border: 1px solid transparent; border-radius: 9px;\n  font-size: .8rem; font-weight: 500; text-align: center; cursor: pointer; color: var(--sc-muted);\n}\n.sc-editor .sc-choice input {\n  position: absolute; inset: 0; width: 100%; height: 100%; min-height: 0; margin: 0;\n  opacity: 0; cursor: pointer;\n}\n.sc-choice:hover { color: var(--primary-text-color, #202a35); }\n.sc-choice.is-selected, .sc-choice:has(input:checked) {\n  color: var(--sc-accent); border-color: var(--sc-accent);\n  background: var(--card-background-color, #fff); font-weight: 600;\n  box-shadow: 0 1px 3px #0001;\n}\n.sc-choice:has(input:focus-visible) { outline: 3px solid var(--sc-accent); outline-offset: 2px; }\n.sc-mode-buttons { background: transparent; padding: 0; gap: 6px; }\n.sc-mode-buttons .sc-choice { min-height: 64px; border-color: var(--sc-border); background: var(--card-background-color, #fff); }\n.sc-choice ha-icon { --mdc-icon-size: 20px; }\n.sc-range-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }\n.sc-range-value { display: inline-flex; align-items: center; gap: 4px; font-weight: 600; color: var(--sc-accent); }\n.sc-editor .sc-range-value input {\n  width: 84px; min-height: 40px; padding: 6px 10px; text-align: center;\n  font-size: 1.15rem; font-weight: 600; color: var(--sc-accent); background: var(--sc-surface); border-color: transparent;\n}\n.sc-editor input[type=\"range\"] {\n  -webkit-appearance: none; appearance: none; width: 100%; min-height: 24px; padding: 0;\n  border: 0; background: transparent; accent-color: var(--sc-accent);\n}\ninput[type=\"range\"]::-webkit-slider-runnable-track { height: 6px; border-radius: 6px; background: linear-gradient(to right, var(--sc-accent) var(--sc-fill, 0%), var(--sc-border) var(--sc-fill, 0%)); }\ninput[type=\"range\"]::-moz-range-track { height: 6px; border-radius: 6px; background: var(--sc-border); }\ninput[type=\"range\"]::-moz-range-progress { height: 6px; border-radius: 6px; background: var(--sc-accent); }\ninput[type=\"range\"]::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; margin-top: -8px; border-radius: 50%; border: 4px solid var(--card-background-color, #fff); background: var(--sc-accent); box-shadow: 0 0 0 1px var(--sc-accent); }\ninput[type=\"range\"]::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; border: 4px solid var(--card-background-color, #fff); background: var(--sc-accent); box-shadow: 0 0 0 1px var(--sc-accent); }\n.sc-range-labels { display: flex; justify-content: space-between; font-size: .7rem; color: var(--sc-muted); }\n.sc-more { padding: 10px 12px; }\n.sc-name-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: end; }\n.sc-name-row button { min-height: 44px; }\n.sc-summary { padding: 12px 14px; border-radius: 10px; background: var(--card-background-color, #fff); border: 1px solid var(--sc-border); }\n.sc-summary p { margin-top: 6px !important; }\n.sc-notice { color: var(--success-color, #287d39); background: color-mix(in srgb, var(--success-color, #287d39) 9%, var(--card-background-color, #fff)); }\n.sc-warning { color: var(--warning-color, #8a5a00); background: color-mix(in srgb, var(--warning-color, #f0a500) 12%, var(--card-background-color, #fff)); }\n.sc-actions button.sc-danger { background: var(--error-color, #b3261e); border-color: var(--error-color, #b3261e); color: #fff; }\n.sc-overview-list { list-style: none; margin: 0 0 10px; padding: 0; display: grid; gap: 6px; font-size: .82rem; }\n.sc-overview-row { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; padding: 8px 10px; border: 1px solid var(--sc-border); border-radius: 8px; }\n.sc-overview-row .sc-meta { margin: 0; flex-basis: 100%; padding-left: 18px; }\n.sc-overview-list li:not(.sc-overview-row) { padding: 8px 10px; border-radius: 8px; background: var(--sc-surface); }\n.sc-overview-list li .sc-meta { display: block; margin-top: 3px; }\n.sc-overview h4 { margin: 14px 0 8px; font-size: .82rem; }\n.sc-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--pchip-color, var(--sc-accent)); flex-shrink: 0; }\n.sc-maintenance .sc-controls { margin: 10px 0 0; }\n\n/* Time bar with magnets and day shortcuts (weekly-schedule-card style) */\n.sc-timebar { position: relative; height: 48px; border-radius: 8px; background: var(--sc-surface); overflow: hidden; touch-action: none; user-select: none; }\n.sc-tb-bg { position: absolute; top: 6px; bottom: 6px; border-radius: 6px; background: var(--block-color); opacity: .4; pointer-events: auto; }\n.sc-tb-magnet { position: absolute; top: 0; bottom: 0; width: 2px; transform: translateX(-50%); background: color-mix(in srgb, var(--sc-accent) 45%, transparent); pointer-events: none; }\n.sc-tb-magnet.is-near { background: var(--sc-accent); box-shadow: 0 0 6px var(--sc-accent); }\n.sc-tb-edit { position: absolute; top: 0; bottom: 0; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: var(--sc-accent); color: var(--text-primary-color, #fff); font-size: .72rem; font-weight: 700; font-variant-numeric: tabular-nums; cursor: grab; touch-action: none; box-shadow: 0 2px 8px #0003; overflow: hidden; }\n.sc-tb-edit:active { cursor: grabbing; }\n.sc-tb-edit.is-static { cursor: default; opacity: .75; }\n.sc-tb-label { pointer-events: none; white-space: nowrap; padding: 0 22px; }\n.sc-tb-handle { position: absolute; top: 0; bottom: 0; width: 22px; display: flex; align-items: center; justify-content: center; cursor: ew-resize; }\n.sc-tb-handle::after { content: \"\"; width: 16px; height: 16px; border-radius: 50%; background: #fff; border: 2px solid var(--sc-accent); box-shadow: 0 1px 4px #0004; }\n.sc-tb-handle[data-handle=\"start\"] { left: 0; }\n.sc-tb-handle[data-handle=\"end\"] { right: 0; }\n.sc-tb-ticks { display: flex; justify-content: space-between; font-size: .66rem; color: var(--sc-muted); margin-top: -8px; }\n.sc-time-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }\n.sc-snap, .sc-shortcuts { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: .75rem; color: var(--sc-muted); }\n.sc-editor .sc-pill { min-height: 30px; padding: 4px 12px; border-radius: 16px; font-size: .76rem; color: var(--sc-muted); }\n.sc-editor .sc-pill.is-selected { color: var(--sc-accent); border-color: var(--sc-accent); background: color-mix(in srgb, var(--sc-accent) 12%, var(--card-background-color, #fff)); font-weight: 600; }\n.sc-days { gap: 6px !important; }\n.sc-editor .sc-days label.sc-day-chip { position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; padding: 0; border-radius: 50%; border: 1.5px solid var(--sc-border); font-size: .74rem; font-weight: 600; color: var(--sc-muted); cursor: pointer; }\n.sc-editor .sc-day-chip input { position: absolute; inset: 0; width: 100% !important; height: 100% !important; margin: 0; opacity: 0; cursor: pointer; }\n.sc-day-chip:has(input:checked) { background: var(--sc-accent); border-color: var(--sc-accent) !important; color: var(--text-primary-color, #fff) !important; }\n.sc-day-chip:has(input:focus-visible) { outline: 3px solid var(--sc-accent); outline-offset: 2px; }\n\n/* Conditions */\n.sc-condition-group { display: grid; gap: 12px; }\n.sc-editor fieldset.sc-condition { background: var(--card-background-color, #fff); }\n\n/* Icon and colour pickers */\n.sc-icon-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(68px, 1fr)); gap: 6px; max-height: 232px; overflow: auto; padding: 2px; }\n.sc-editor label.sc-icon-choice { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; min-height: 64px; padding: 6px 4px; border: 1px solid var(--sc-border); border-radius: 10px; cursor: pointer; color: var(--sc-muted); text-align: center; }\n.sc-icon-choice small { font-size: .64rem; line-height: 1.2; }\n.sc-editor .sc-icon-choice input, .sc-editor .sc-swatch input[type=\"radio\"] { position: absolute; inset: 0; width: 100% !important; height: 100% !important; min-height: 0; margin: 0; opacity: 0; cursor: pointer; }\n.sc-icon-choice.is-selected, .sc-icon-choice:has(input:checked) { color: var(--sc-accent); border-color: var(--sc-accent); background: color-mix(in srgb, var(--sc-accent) 10%, var(--card-background-color, #fff)); }\n.sc-swatches { display: flex; flex-wrap: wrap; gap: 8px; }\n.sc-editor label.sc-swatch { position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; background: var(--swatch, var(--sc-surface)); border: 2px solid var(--card-background-color, #fff); box-shadow: 0 0 0 1px var(--sc-border); cursor: pointer; font-size: .66rem; color: var(--sc-muted); }\n.sc-swatch.is-selected, .sc-swatch:has(input[type=\"radio\"]:checked) { box-shadow: 0 0 0 3px var(--sc-accent); }\n.sc-editor .sc-swatch-custom input[type=\"color\"] { position: absolute; inset: 0; width: 100% !important; height: 100% !important; min-height: 0; padding: 0; opacity: 0; cursor: pointer; z-index: 1; }\n.sc-swatch-custom span { font-size: 1rem; }\n.tab ha-icon, .profile-chip ha-icon { --mdc-icon-size: 18px; margin-right: 4px; }\n.tab.active { border-bottom: 2px solid var(--tab-color, var(--sc-accent)); }\n.sc-tb-edit.is-narrow .sc-tb-label { visibility: hidden; }\n.sc-tb-edit.is-narrow .sc-tb-handle { width: 16px; }\n.sc-tb-edit.is-narrow .sc-tb-handle::after { width: 12px; height: 12px; }\n\n/* ---- Direction A \"Agenda viva\" (0.3.7) ---- */\n.sc-head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }\n.sc-logo { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--sc-accent); background: color-mix(in srgb, var(--sc-accent) 12%, var(--card-background-color, #fff)); }\n.sc-logo svg { width: 22px; height: 22px; }\n.sc-head-copy { display: grid; gap: 2px; flex-grow: 1; min-width: 0; }\n.sc-sub { font-size: .8rem; color: var(--sc-muted); }\n.sc-head .sc-version { margin-left: 0; }\n.sc-head-actions { display: flex; gap: 8px; }\n.sc-segmented { display: flex; gap: 4px; padding: 4px; border-radius: 14px; background: var(--sc-surface); overflow-x: auto; }\n.sc-segmented .profile-chip { flex: 1 0 auto; justify-content: center; min-height: 38px; border: 0; border-radius: 10px; background: transparent; color: var(--sc-muted); font-weight: 600; }\n.sc-segmented .profile-chip.viewed { background: var(--card-background-color, #fff); color: var(--primary-text-color, #202a35); box-shadow: 0 1px 3px #00000014; font-weight: 700; }\n.sc-now { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; margin: 4px 0 8px; }\n.sc-now-tile { display: grid; gap: 5px; text-align: left; padding: 14px 16px; border: 0; border-radius: 16px; min-height: 0; color: var(--primary-text-color, #202a35); }\n.sc-now-tile.is-running { background: color-mix(in srgb, var(--sc-accent) 12%, var(--card-background-color, #fff)); }\n.sc-now-tile.is-paused { background: color-mix(in srgb, var(--warning-color, #f0a500) 14%, var(--card-background-color, #fff)); }\n.sc-now-tile.is-timer { background: var(--sc-surface); }\n.sc-now-tile:hover { border: 0; filter: brightness(.98); }\n.sc-now-label { font-size: .72rem; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; color: var(--sc-accent); }\n.sc-now-tile.is-paused .sc-now-label { color: color-mix(in srgb, var(--warning-color, #f0a500) 60%, #000); }\n.sc-now-tile strong { font-size: 1.2rem; letter-spacing: -0.02em; }\n.sc-now-detail { font-size: .78rem; color: var(--sc-muted); }\n.sc-now-empty { font-size: .82rem; color: var(--sc-muted); margin: 4px 0 8px; }\n.sc-toolbar { flex-wrap: wrap; gap: 8px 12px; }\n.sc-toolbar .tab-bar { border: 0; margin: 0; padding: 0; gap: 6px; }\n.sc-toolbar .tab { min-height: 32px; padding: 4px 12px; border-radius: 16px; background: var(--sc-surface); font-size: .8rem; }\n.sc-toolbar .tab.active { background: var(--primary-text-color, #202a35); color: var(--card-background-color, #fff); border-bottom: 0; }\n.sc-timeline-head strong.is-today { color: var(--sc-accent); font-weight: 800; }\n.sc-day-track.is-today { background: color-mix(in srgb, var(--sc-accent) 8%, var(--sc-surface)); box-shadow: inset 0 0 0 2px var(--sc-accent); }\n.sc-now-line { position: absolute; left: -3px; right: -3px; height: 2px; background: var(--error-color, #d6453d); z-index: 2; pointer-events: none; }\n.sc-time-block.is-running { box-shadow: 0 0 0 2px var(--card-background-color, #fff), 0 0 0 4px var(--success-color, #1f9d55); z-index: 1; }\n.sc-time-block.is-paused { border: 2px dashed color-mix(in srgb, var(--warning-color, #f0a500) 70%, #000); z-index: 1; }\n.sc-legend { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: .72rem; color: var(--sc-muted); margin: 6px 0 12px; }\n.sc-legend span { display: inline-flex; align-items: center; gap: 6px; }\n.sc-legend i { display: inline-block; width: 14px; height: 12px; border-radius: 4px; }\n.sc-legend .sc-legend-temp { width: 40px; background: linear-gradient(90deg, rgb(74,144,217), rgb(150,196,232), rgb(240,138,75)); }\n.sc-legend .sc-legend-running { box-shadow: 0 0 0 2px var(--success-color, #1f9d55); }\n.sc-legend .sc-legend-paused { border: 2px dashed var(--warning-color, #f0a500); box-sizing: border-box; }\n.sc-legend .sc-legend-now { height: 2px; background: var(--error-color, #d6453d); }\n.sc-editor h3 small { display: block; font-size: .75rem; font-weight: 600; color: var(--sc-muted); letter-spacing: 0; }\n.sc-section-label { font-size: .72rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--sc-muted); margin-bottom: -8px; }\n.sc-entity-pills { display: flex; flex-wrap: wrap; gap: 8px; }\n.sc-editor label.sc-entity-pill { position: relative; display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 6px 14px; border-radius: 18px; background: var(--sc-surface); color: var(--sc-muted); font-weight: 600; cursor: pointer; }\n.sc-editor .sc-entity-pill input { position: absolute; inset: 0; width: 100% !important; height: 100% !important; min-height: 0; margin: 0; opacity: 0; cursor: pointer; }\n.sc-entity-pill::before { content: \"\"; width: 8px; height: 8px; border-radius: 50%; background: currentColor; opacity: .35; }\n.sc-entity-pill:has(input:checked) { color: var(--sc-accent); background: color-mix(in srgb, var(--sc-accent) 14%, var(--card-background-color, #fff)); }\n.sc-entity-pill:has(input:checked)::before { opacity: 1; }\n.sc-entity-pill:has(input:focus-visible) { outline: 3px solid var(--sc-accent); outline-offset: 2px; }\n.sc-stepper-row { display: flex; align-items: center; gap: 12px; }\n.sc-editor .sc-step { width: 48px; height: 48px; min-height: 48px; padding: 0; border-radius: 50%; font-size: 1.4rem; line-height: 1; flex-shrink: 0; }\n.sc-stepper-value { flex-grow: 1; display: flex; align-items: baseline; justify-content: center; gap: 4px; color: var(--sc-accent); font-weight: 800; }\n.sc-editor .sc-stepper-value input { width: 96px; min-height: 52px; padding: 4px; border: 0; background: transparent; text-align: center; font-size: 2.2rem; font-weight: 800; letter-spacing: -0.03em; color: inherit; -moz-appearance: textfield; }\n.sc-stepper-value input::-webkit-inner-spin-button, .sc-stepper-value input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }\n.sc-rows { display: grid; border: 1px solid var(--sc-border); border-radius: 14px; overflow: hidden; background: var(--card-background-color, #fff); }\n.sc-editor details.sc-row { margin: 0; border: 0; border-radius: 0; padding: 0; background: transparent; }\n.sc-row + .sc-row { border-top: 1px solid var(--sc-border) !important; }\n.sc-row > summary { display: flex; align-items: center; gap: 10px; min-height: 48px; padding: 0 14px; list-style: none; }\n.sc-row > summary::-webkit-details-marker { display: none; }\n.sc-row > summary span { flex-grow: 1; font-size: .85rem; font-weight: 700; }\n.sc-row > summary em { font-style: normal; font-size: .82rem; font-weight: 500; color: var(--sc-muted); max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.sc-row > summary::after { content: \"\\203A\"; font-size: 1.2rem; color: var(--sc-muted); transition: transform .15s; }\n.sc-row[open] > summary::after { transform: rotate(90deg); }\n.sc-row[open] > summary { margin: 0; }\n.sc-row-body { display: grid; gap: 14px; padding: 4px 14px 16px; }\n.sc-actions button.sc-save { flex-grow: 1; min-height: 50px; border-radius: 14px; font-size: 1rem; }\n@media (max-width: 600px) {\n  .sc-dialog { width: 100vw; max-width: 100vw; margin: auto 0 0; max-height: 92dvh; border-radius: 24px 24px 0 0; padding: 0 16px 16px; }\n  .sc-dialog-heading::before { content: \"\"; position: absolute; left: 50%; top: 6px; width: 40px; height: 5px; margin-left: -20px; border-radius: 3px; background: var(--sc-border); }\n  .sc-dialog-heading { padding-top: 18px; }\n  .sc-now { grid-template-columns: 1fr; }\n  .sc-head-actions { width: 100%; }\n  .sc-head-actions button { flex-grow: 1; }\n}\n.sc-dialog-brand { font-size: .75rem; font-weight: 700; color: var(--sc-muted); letter-spacing: .04em; text-transform: uppercase; }\n\n/* 0.3.10: lighter header, fluid week, clickable free space */\n.sc-head { gap: 10px; margin-bottom: 12px; }\n.sc-logo { width: 34px; height: 34px; border-radius: 10px; }\n.sc-logo svg { width: 18px; height: 18px; }\n.sc-head .card-title { font-size: 1.05rem; }\n.sc-sub { font-size: .74rem; }\n.sc-head .sc-version { padding: 2px 7px; font-size: .66rem; }\n.sc-head-actions { margin-left: auto; gap: 6px; }\n.sc-head-actions button, .sc-head-actions button[data-command=\"newSchedule\"] { min-height: 30px; padding: 4px 12px; border-radius: 15px; font-size: .78rem; font-weight: 600; }\n.sc-segmented { padding: 3px; border-radius: 12px; }\n.sc-segmented .profile-chip { min-height: 30px; padding: 4px 10px; font-size: .82rem; }\n.sc-day-track { cursor: copy; }\n.sc-time-block { cursor: pointer; }\nbutton.sc-empty { display: block; width: 100%; font: inherit; cursor: pointer; }\nbutton.sc-empty:hover { border-color: var(--sc-accent); }\n@container (max-width: 520px) {\n  .sc-time-block small { display: none; }\n  .sc-time-block { padding: 2px 3px; font-size: .6rem; }\n  .sc-timeline-head { font-size: .66rem; }\n  .sc-timeline-head strong.is-today { font-size: .66rem; }\n}\n@media (max-width: 600px) { .sc-head-actions { width: auto; } .sc-head-actions button { flex-grow: 0; } }\n@container (max-width: 520px) {\n  .sc-today-tag { display: none; }\n  .sc-now { gap: 6px; }\n  .sc-now-tile { padding: 10px 12px; gap: 3px; border-radius: 12px; }\n  .sc-now-tile strong { font-size: 1rem; }\n}\n.sc-import {\n  list-style: none;\n  margin: 12px 0 0;\n  padding: 0;\n  display: grid;\n  gap: 8px;\n}\n.sc-import-row {\n  display: flex;\n  gap: 10px;\n  padding: 10px 12px;\n  border-radius: 12px;\n  background: var(--sc-surface);\n}\n.sc-import-row > div {\n  display: grid;\n  gap: 2px;\n  min-width: 0;\n}\n.sc-import-mark {\n  flex: none;\n  width: 24px;\n  height: 24px;\n  display: grid;\n  place-items: center;\n  border-radius: 50%;\n  font-size: 0.8rem;\n  font-weight: 800;\n  color: #fff;\n  background: var(--success-color, #1f9d55);\n}\n.sc-import-row.is-note .sc-import-mark {\n  background: var(--warning-color, #b7791f);\n}\n.sc-import-row.is-off .sc-import-mark {\n  background: var(--secondary-text-color, #647180);\n}\n.sc-import-row.is-skip {\n  opacity: 0.75;\n}\n.sc-import-row.is-skip .sc-import-mark {\n  background: var(--error-color, #b3261e);\n}\n.sc-import-notes {\n  margin: 4px 0 0;\n  padding-left: 18px;\n  font-size: 0.78rem;\n  color: var(--sc-muted);\n}\n.sc-import-warning {\n  padding: 8px 10px;\n  border-radius: 10px;\n  background: color-mix(in srgb, var(--warning-color, #f0a500) 16%, transparent);\n  font-size: 0.85rem;\n}\n.sc-failures {\n  margin: 8px 0;\n  padding: 10px 12px;\n  border-radius: 10px;\n  background: color-mix(in srgb, var(--error-color, #b3261e) 8%, var(--card-background-color, #fff));\n}\n.sc-failures ul {\n  margin: 6px 0 0;\n  padding-left: 18px;\n  font-size: 0.82rem;\n}\n.sc-stats {\n  display: grid;\n  grid-template-columns: 1fr auto;\n  gap: 6px 16px;\n  margin: 0;\n  font-size: 0.85rem;\n}\n.sc-stats dt {\n  color: var(--sc-muted);\n}\n.sc-stats dd {\n  margin: 0;\n  font-weight: 700;\n  text-align: right;\n  font-variant-numeric: tabular-nums;\n}\n.sc-bound {\n  display: grid;\n  gap: 4px;\n  min-width: 0;\n}\n.sc-bound-row {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 6px;\n}\n.sc-bound-row select {\n  flex: 0 1 auto;\n}\n.sc-bound-row input[type=\"time\"] {\n  flex: 1 1 110px;\n}\n.sc-bound-row input[type=\"number\"] {\n  width: 76px;\n}\n.sc-bound-row small {\n  color: var(--sc-muted);\n  font-size: 0.75rem;\n}\n.qt-previous { font-size: .8rem; color: var(--sc-muted); }\n.qt-previous strong { color: var(--primary-text-color, #202a35); }\n/* Quick Timer card: reuses the action editor styles of the main card. */\n.qt-body.sc-editor { margin: 0; padding: 0; border: 0; background: transparent; gap: 14px; }\n.qt-head { display: flex; align-items: center; gap: 12px; }\n.qt-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--sc-accent); background: color-mix(in srgb, var(--sc-accent) 12%, var(--card-background-color, #fff)); flex-shrink: 0; }\n.qt-icon svg { width: 22px; height: 22px; }\n.qt-title { display: grid; gap: 2px; flex-grow: 1; min-width: 0; }\n.qt-title strong { font-size: 1.05rem; }\n.qt-title span { font-size: .8rem; color: var(--sc-muted); }\n.qt-link { min-height: 32px; padding: 4px 12px; font-size: .78rem; }\n.qt-live { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-top: 1px solid var(--sc-border); border-bottom: 1px solid var(--sc-border); font-size: .85rem; color: var(--sc-muted); }\n.qt-live strong { color: var(--primary-text-color, #202a35); }\n.qt-section { font-size: .72rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--sc-muted); margin-bottom: -6px; }\n.qt-body fieldset.sc-action { border: 0; padding: 0; background: transparent; }\n.qt-body fieldset.sc-action > legend { display: none; }\n.qt-tabs, .qt-chips { display: flex; flex-wrap: wrap; gap: 6px; }\n.sc-editor .qt-tab, .sc-editor .qt-chip { min-height: 38px; padding: 6px 14px; border-radius: 10px; font-weight: 600; color: var(--sc-muted); }\n.sc-editor .qt-chip { flex: 1 1 0; min-width: 52px; }\n.qt-tab.is-selected, .qt-chip.is-selected { background: var(--sc-accent) !important; border-color: var(--sc-accent) !important; color: var(--text-primary-color, #fff) !important; }\n.qt-duration { display: flex; align-items: center; gap: 12px; }\n.qt-duration .qt-range { flex-grow: 1; }\n.sc-editor .qt-minutes-box { display: flex; align-items: center; gap: 6px; font-size: .8rem; color: var(--sc-muted); }\n.sc-editor .qt-minutes-box { flex-shrink: 0; }\n.sc-editor .qt-minutes-box input { width: 64px; text-align: center; font-weight: 700; }\n.sc-editor .qt-start { min-height: 50px; border-radius: 14px; border: 0; background: var(--sc-accent); color: var(--text-primary-color, #fff); font-size: 1rem; font-weight: 800; }\n.qt-active { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 16px; background: color-mix(in srgb, var(--sc-accent) 12%, var(--card-background-color, #fff)); }\n.qt-active-copy { display: grid; gap: 4px; flex-grow: 1; }\n.qt-countdown { font-size: 1.8rem; font-weight: 800; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; color: var(--sc-accent); }\n.qt-cancel { color: var(--error-color, #b3261e); }\n.qt-muted { font-size: .8rem; color: var(--sc-muted); margin: 0; }\n.qt-error { font-size: .85rem; color: var(--error-color, #b3261e); margin: 0; }\n.qt-label { display: grid; gap: 6px; font-size: .8rem; }\n.qt-entities { display: grid; gap: 4px; max-height: 280px; overflow: auto; border: 1px solid var(--sc-border); border-radius: 10px; padding: 6px; }\n.sc-editor .qt-entities label { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 8px; font-weight: 400; }\n.sc-editor .qt-entities input { width: 18px !important; min-height: 18px; }\n.qt-entities span { display: grid; gap: 2px; }\n.qt-entities small { font-size: .7rem; color: var(--sc-muted); }\n.qt-entities label[hidden] { display: none !important; }\n.qt-body .sc-action .sc-current { display: none; }\n";
const QT_PRESETS = [5, 10, 15, 30, 45, 60];
const qtDuration = (seconds) => {
  const s = Math.max(0, Math.round(seconds)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${m}:${String(s % 60).padStart(2, '0')}`;
};
const minutesLabel = (minutes) => minutes >= 60 && minutes % 60 === 0 ? (minutes === 60 ? t('1 ora') : t('{count} ore', {count: minutes / 60})) : t('{count} minuti', {count: minutes});

class ScheduleCreatorQuickTimerCard extends HTMLElement {
  constructor() {
    super(); this.attachShadow({mode: 'open'});
    this.adapter = new ScheduleCreatorStateAdapter(() => this.render());
    this.draft = {}; this.minutes = null; this.mode = 'duration'; this.error = null;
    this.shadowRoot.innerHTML = `<style>${QT_STYLE}</style><ha-card></ha-card>`;
    this.shadowRoot.addEventListener('click', (e) => this.click(e));
    this.shadowRoot.addEventListener('input', (e) => this.input(e));
    this.shadowRoot.addEventListener('change', (e) => {
      this.capture();
      if (e.target.matches('input[type="radio"],select,input[type="checkbox"]')) this.render();
    });
    this.shadowRoot.addEventListener('keydown', (e) => { if (e.target.name === 'qt_search' && e.key === 'Enter') e.preventDefault(); });
  }
  static getStubConfig() { return {entity: ''}; }
  static getConfigElement() { return document.createElement('schedule-creator-quick-timer-card-editor'); }
  getCardSize() { return 5; }
  setConfig(config) {
    this.config = config || {};
    const presets = (Array.isArray(this.config.presets) ? this.config.presets : []).map(Number).filter((m) => Number.isFinite(m) && m >= 1);
    this.presets = presets.length ? [...new Set(presets)] : QT_PRESETS;
    this.minutes ??= Number(this.config.default_minutes) >= 1 ? Number(this.config.default_minutes) : this.presets.includes(30) ? 30 : this.presets[0];
    this.render();
  }
  set hass(hass) {
    const previous = this._hass; this._hass = hass;
    if (this.isConnected) this.adapter.connect(hass);
    // Only the chosen device and running timers matter here.
    const state = this.adapter.state, ids = state ? new Set([this.entity, ...(state.quick_timers || []).map((t) => t.entity_id)].filter(Boolean)) : null;
    if (!this.shadowRoot.activeElement && hassChanged(previous, hass, ids)) this.render();
  }
  connectedCallback() { if (this._hass) this.adapter.connect(this._hass); this.render(); this.clock ??= setInterval(() => this.tick(), 1000); }
  disconnectedCallback() { this.adapter.disconnect(); clearInterval(this.clock); this.clock = null; }
  get entity() { return this.config?.entity || this.draft.qt_entity || null; }
  capture() {
    const form = this.shadowRoot.querySelector('form');
    if (!form) return;
    this.draft = {...this.draft, ...Object.fromEntries([...new FormData(form)].filter(([, v]) => typeof v === 'string'))};
    for (const node of form.querySelectorAll('input[type="checkbox"]')) this.draft[node.getAttribute('name')] = node.checked ? 'on' : '';
  }
  input(e) {
    const node = e.target;
    if (node.getAttribute('name') === 'qt_search') {
      const q = node.value.toLowerCase();
      this.shadowRoot.querySelectorAll('[data-entity-label]').forEach((n) => { n.hidden = !n.dataset.entityLabel.includes(q); });
      return;
    }
    if (node.classList.contains('qt-minutes') || node.classList.contains('qt-range')) {
      const v = Math.max(1, Math.round(Number(node.value) || 1));
      this.minutes = v;
      this.shadowRoot.querySelectorAll('.qt-minutes,.qt-range').forEach((n) => { if (n !== node) n.value = v; });
      const range = this.shadowRoot.querySelector('.qt-range');
      if (range) range.style.setProperty('--sc-fill', `${(Math.min(v, Number(range.max)) - 1) / (Number(range.max) - 1) * 100}%`);
      this.shadowRoot.querySelectorAll('.qt-chip').forEach((n) => n.classList.toggle('is-selected', Number(n.dataset.min) === v));
      this.updateStartLabel();
      return;
    }
    if (node.dataset.mirror || node.type === 'range') {
      const root = node.closest('.sc-range');
      const range = root?.querySelector('input[type="range"]'), mirror = root?.querySelector('[data-mirror]');
      if (range && mirror) { if (node === mirror) range.value = mirror.value; else mirror.value = range.value; }
    }
    this.capture(); this.updateStartLabel();
  }
  timers() { return (this.adapter.state?.quick_timers || []).filter((x) => !this.entity || x.entity_id === this.entity); }
  seconds() {
    if (this.mode === 'until') {
      const [h, m] = String(this.draft.qt_until || '').split(':').map(Number);
      if (!Number.isFinite(h)) return null;
      const now = new Date(), end = new Date(now); end.setHours(h, m || 0, 0, 0);
      if (end <= now) end.setDate(end.getDate() + 1);
      return Math.round((end - now) / 1000);
    }
    return this.minutes * 60;
  }
  pendingAction() {
    const form = this.shadowRoot.querySelector('form');
    try { return form && this.entity ? readAction(form, 'timer', this.entity.split('.')[0]) : null; } catch { return null; }
  }
  updateStartLabel() {
    const node = this.shadowRoot.querySelector('.qt-start');
    if (!node) return;
    const action = describeAction(this.pendingAction()) || t('Avvia');
    node.textContent = this.mode === 'until' ? t('{action} fino alle {time}', {action, time: this.draft.qt_until || '--:--'}) : t('{action} per {duration}', {action, duration: minutesLabel(this.minutes)});
  }
  tick() {
    this.shadowRoot.querySelectorAll('[data-expiry]').forEach((n) => { n.textContent = qtDuration((new Date(n.dataset.expiry) - Date.now()) / 1000); });
  }
  render() {
    if (!this.config) return;
    setLanguage(this._hass, this.config);
    const hass = this._hass, surface = this.shadowRoot.querySelector('ha-card');
    if (!hass) { surface.innerHTML = `<div class="qt-body">${t('Caricamento…')}</div>`; return; }
    const {state, error, busy, writeError} = this.adapter;
    const admin = hass.user?.is_admin === true;
    const entity = this.entity, st = entity ? hass.states[entity] : null;
    const name = this.config.name || st?.attributes?.friendly_name || entity || 'Quick Timer';
    const active = this.timers();
    const problem = this.error || writeError || error;
    const focusName = this.shadowRoot.activeElement?.getAttribute?.('name');
    let body;
    if (!entity) {
      const ids = targetEntities(hass).sort();
      body = `<label class="qt-label">${t('Scegli l’entità')}<input type="search" name="qt_search" placeholder="${t('Cerca per nome o ID')}" autocomplete="off"></label><div class="qt-entities" role="radiogroup">${ids.map((id) => `<label data-entity-label="${qtEsc(`${id} ${hass.states[id]?.attributes?.friendly_name || ''}`.toLowerCase())}"><input type="radio" name="qt_entity" value="${qtEsc(id)}"><span><strong>${qtEsc(hass.states[id]?.attributes?.friendly_name || id)}</strong><small>${qtEsc(id)}</small></span></label>`).join('')}</div>`;
    } else if (active.length) {
      body = active.map((timer) => `<div class="qt-active"><div class="qt-active-copy"><span class="qt-countdown" data-expiry="${qtEsc(timer.expires_at)}">${qtDuration((new Date(timer.expires_at) - Date.now()) / 1000)}</span><span class="qt-muted">${qtEsc(describeAction(timer.action))}</span><span class="qt-previous">${t('Alla scadenza torna a')} <strong>${qtEsc(timer.previous ? describeState(timer.previous, entity.split('.')[0]) : t('lo stato precedente'))}</strong></span></div>${admin ? `<button type="button" class="qt-cancel" data-cancel="${qtEsc(timer.id)}">${t('Annulla')}</button>` : ''}</div>`).join('');
    } else if (!admin) {
      body = `<p class="qt-muted">${t('Nessun timer attivo. Serve un amministratore per avviarne uno.')}</p>`;
    } else {
      const chips = this.presets.map((m) => `<button type="button" class="qt-chip${m === this.minutes ? ' is-selected' : ''}" data-min="${m}">${m >= 60 && m % 60 === 0 ? `${m / 60}h` : `${m}′`}</button>`).join('');
      const max = Math.max(120, ...this.presets, this.minutes);
      body = `<div class="qt-section">${t('Durante il timer')}</div>${actionForm('timer', t('Azione'), hass, [entity], null, false, this.draft)}
        <div class="qt-section">${t('Per quanto')}</div><div class="qt-tabs" role="group"><button type="button" class="qt-tab${this.mode === 'duration' ? ' is-selected' : ''}" data-mode="duration">${t('Durata')}</button><button type="button" class="qt-tab${this.mode === 'until' ? ' is-selected' : ''}" data-mode="until">${t('Fino alle')}</button></div>
        ${this.mode === 'duration' ? `<div class="qt-chips">${chips}</div><div class="qt-duration"><input type="range" class="qt-range" min="1" max="${max}" step="1" value="${this.minutes}" aria-label="${t('Durata in minuti')}" style="--sc-fill:${(Math.min(this.minutes, max) - 1) / (max - 1) * 100}%"><label class="qt-minutes-box"><input type="number" class="qt-minutes" min="1" max="10080" value="${this.minutes}" aria-label="${t('Minuti')}">min</label></div>` : `<label class="qt-label">${t('Fino alle')}<input type="time" name="qt_until" value="${qtEsc(this.draft.qt_until || '')}"></label>`}
        <button type="submit" class="qt-start">${t('Avvia')}</button>`;
    }
    surface.innerHTML = `<form class="qt-body sc-editor"><div class="qt-head"><span class="qt-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2 2M9 2h6"></path></svg></span><div class="qt-title"><strong>${qtEsc(this.config.title || 'Timer')}</strong><span>${qtEsc(name)}</span></div>${entity && !this.config.entity ? `<button type="button" class="qt-link" data-change="1">${t('Cambia')}</button>` : ''}</div>
      ${st ? `<div class="qt-live"><span>${t('Stato attuale')}</span><strong>${qtEsc(describeState(st, entity.split('.')[0]))}</strong></div>` : entity ? `<p class="qt-muted">${t('Entità non disponibile.')}</p>` : ''}
      ${problem ? `<p class="qt-error" role="alert">${qtEsc(typeof problem === 'string' ? problem : messageFor(problem))}</p>` : ''}
      ${state || error ? body : `<p class="qt-muted">${t('Caricamento…')}</p>`}</form>`;
    const form = surface.querySelector('form');
    form.addEventListener('submit', (e) => { e.preventDefault(); this.start(); });
    for (const node of form.querySelectorAll('input[name],select[name]')) {
      const key = node.getAttribute('name'), value = this.draft[key];
      if (value === undefined || node.type === 'search') continue;
      if (node.type === 'radio') node.checked = node.value === value;
      else if (node.type === 'checkbox') node.checked = value === 'on';
      else node.value = value;
    }
    if (focusName) form.querySelector(`[name="${focusName}"]`)?.focus({preventScroll: true});
    form.querySelectorAll('button,input,select').forEach((n) => { n.disabled = busy; });
    this.updateStartLabel();
  }
  async click(e) {
    const b = e.target.closest('button');
    if (!b || this.adapter.busy) return;
    this.error = null;
    if (b.dataset.min) { this.minutes = Number(b.dataset.min); this.capture(); this.render(); }
    else if (b.dataset.mode) { this.capture(); this.mode = b.dataset.mode; this.render(); }
    else if (b.dataset.change) { this.draft = {}; this.render(); }
    else if (b.dataset.cancel) await this.adapter.mutate('quick_timer/cancel', {quick_timer_id: b.dataset.cancel}, {runtime: true});
    else if (b.dataset.command === 'stepValue') {
      const [name, dir] = b.dataset.id.split(':');
      const node = this.shadowRoot.querySelector(`input[name="${name}"]`);
      const step = Number(node.step) || 1;
      node.value = String(Math.min(Number(node.max), Math.max(Number(node.min), Number(node.value) + step * Number(dir))));
      this.capture(); this.updateStartLabel();
    }
  }
  async start() {
    this.capture();
    const entity = this.entity;
    try {
      const action = readAction(this.shadowRoot.querySelector('form'), 'timer', entity.split('.')[0]);
      const duration = this.seconds();
      if (!duration || duration < 1 || duration > 604800) throw new Error(t('Scegli una durata tra 1 minuto e 7 giorni.'));
      await this.adapter.mutate('quick_timer/create', {entity_id: entity, duration_seconds: duration, action}, {runtime: true});
    } catch (error) {
      this.error = error.message; this.render();
    }
  }
}

class ScheduleCreatorQuickTimerCardEditor extends HTMLElement {
  setConfig(config) { this.config = config; if (!this.rendered) this.render(); }
  set hass(hass) { this._hass = hass; if (!this.rendered) this.render(); }
  render() {
    if (!this.config || !this._hass) return;
    this.rendered = true;
    setLanguage(this._hass, this.config);
    const ids = targetEntities(this._hass).sort();
    this.innerHTML = `<div style="display:grid;gap:12px;padding:12px"><label>${t('Titolo')} <input name="title" value="${qtEsc(this.config.title || '')}" placeholder="Timer"></label><label>${t('Entità')} <select name="entity"><option value="">${t('Scegli nella card')}</option>${ids.map((id) => `<option value="${qtEsc(id)}" ${id === this.config.entity ? 'selected' : ''}>${qtEsc(this._hass.states[id]?.attributes?.friendly_name || id)}</option>`).join('')}</select></label><label>${t('Durate rapide (minuti, separate da virgola)')} <input name="presets" value="${qtEsc((this.config.presets || []).join(', '))}" placeholder="5, 10, 15, 30, 45, 60"></label></div>`;
    this.querySelectorAll('input,select').forEach((node) => node.addEventListener('change', () => {
      const config = {...this.config};
      const value = node.value.trim();
      if (node.name === 'presets') { const list = value.split(',').map((x) => Number(x.trim())).filter((x) => x >= 1); if (list.length) config.presets = list; else delete config.presets; }
      else if (value) config[node.name] = value; else delete config[node.name];
      this.config = config;
      this.dispatchEvent(new CustomEvent('config-changed', {detail: {config}, bubbles: true, composed: true}));
    }));
  }
}

if (!customElements.get('schedule-creator-quick-timer-card')) customElements.define('schedule-creator-quick-timer-card', ScheduleCreatorQuickTimerCard);
if (!customElements.get('schedule-creator-quick-timer-card-editor')) customElements.define('schedule-creator-quick-timer-card-editor', ScheduleCreatorQuickTimerCardEditor);
window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === 'schedule-creator-quick-timer-card')) window.customCards.push({type: 'schedule-creator-quick-timer-card', name: 'Schedule Creator · Quick Timer', description: 'Quick timer for one device, run by the Schedule Creator backend'});
// Per-entity day timeline across every active profile (mockup direction B).
// Read-only: editing stays in the main card.







const tlEsc = uiEscape;
const TL_STYLE = ":host { display: block; font-family: var(--primary-font-family, Arial, sans-serif); color: var(--primary-text-color, #202a35); --tl-accent: var(--primary-color, #00897b); --tl-muted: var(--secondary-text-color, #647180); --tl-surface: var(--secondary-background-color, #f4f6f8); --tl-border: var(--divider-color, #dce2e7); }\n* { box-sizing: border-box; }\nha-card { display: block; padding: 20px; border-radius: var(--ha-card-border-radius, 20px); background: var(--card-background-color, #fff); }\n.tl-body { display: grid; gap: 16px; }\n.tl-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }\n.tl-eyebrow { display: block; font-size: .7rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--tl-accent); }\n.tl-title { font-size: 1.35rem; letter-spacing: -0.02em; }\n.tl-days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }\n.tl-day { min-height: 48px; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 0; border-radius: 12px; background: var(--tl-surface); color: var(--tl-muted); font: inherit; font-size: .68rem; cursor: pointer; }\n.tl-day strong { font-size: .95rem; color: var(--primary-text-color, #202a35); }\n.tl-day.is-selected { background: var(--tl-accent); color: var(--text-primary-color, #fff); font-weight: 700; }\n.tl-day.is-selected strong { color: inherit; }\n.tl-day:focus-visible { outline: 3px solid var(--tl-accent); outline-offset: 2px; }\n.tl-grid { display: grid; gap: 10px; }\n.tl-row { display: grid; grid-template-columns: minmax(110px, 30%) minmax(0, 1fr); gap: 12px; align-items: center; }\n.tl-name { display: grid; gap: 2px; min-width: 0; }\n.tl-name strong { font-size: .85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.tl-name span { font-size: .72rem; color: var(--tl-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.tl-name .is-running { color: var(--tl-accent); font-weight: 700; }\n.tl-name .is-paused { color: color-mix(in srgb, var(--warning-color, #f0a500) 65%, #000); font-weight: 700; }\n.tl-name .is-timer { color: var(--success-color, #1f9d55); font-weight: 700; }\n.tl-ticks { display: flex; justify-content: space-between; font-size: .64rem; color: var(--tl-muted); font-variant-numeric: tabular-nums; }\n.tl-track { position: relative; height: 38px; border-radius: 10px; background: var(--tl-surface); overflow: hidden; }\n.tl-block { position: absolute; top: 5px; bottom: 5px; display: flex; align-items: center; padding-left: 7px; border-radius: 7px; background: color-mix(in srgb, var(--block) 70%, var(--card-background-color, #fff)); color: #fff; font-size: .7rem; font-weight: 700; white-space: nowrap; overflow: hidden; }\n.tl-block.is-running { box-shadow: inset 0 0 0 2px var(--success-color, #1f9d55); }\n.tl-block.is-paused { background: transparent; border: 2px dashed var(--warning-color, #f0a500); color: color-mix(in srgb, var(--warning-color, #f0a500) 65%, #000); }\n.tl-timer { background: repeating-linear-gradient(45deg, var(--success-color, #1f9d55) 0 4px, color-mix(in srgb, var(--success-color, #1f9d55) 70%, #000) 4px 8px); opacity: .85; }\n.tl-now { position: absolute; top: 0; bottom: 0; width: 2px; margin-left: -1px; background: var(--error-color, #d6453d); }\n.tl-muted { margin: 0; font-size: .82rem; color: var(--tl-muted); }\n.tl-error { margin: 0; color: var(--error-color, #b3261e); }\n@media (max-width: 480px) { .tl-row { grid-template-columns: 1fr; gap: 4px; } .tl-axis > span { display: none; } }\n";
const TL_DAYS = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];
const TL_PALETTE = ['#087f8c', '#7057b5', '#b65c21', '#317a45', '#b34269', '#326ab2'];
const tlMinutes = (value) => { const [h, m] = String(value).split(':').map(Number); return h * 60 + (m || 0); };
const tlTime = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

// Short value shown inside a block: temperature, brightness, position or state.
function shortAction(action) {
  const d = action?.data || {};
  if (!action) return '';
  if (action.action === 'apply_state') return d.state === 'off' ? 'OFF' : d.temperature != null ? `${d.temperature}°` : describeAction(action);
  if (d.brightness_pct != null) return `${d.brightness_pct}%`;
  if (d.position != null) return `${d.position}%`;
  if (d.percentage != null) return `${d.percentage}%`;
  return {turn_on: 'ON', turn_off: 'OFF', open_cover: t('Apri'), close_cover: t('Chiudi'), open_valve: t('Apri'), close_valve: t('Chiudi')}[action.action] || describeAction(action);
}

// The occurrence that really controls an entity now, from the lease it holds;
// a slot paused by its condition holds no lease. Null when a timer or nothing
// controls it. Older integrations without lease owners fall back to any slot.
function liveOccurrence(state, schedules, entityId) {
  const occurrences = state.operational?.occurrences || [], leases = state.operational?.leases || [];
  const covers = (o) => schedules.find((s) => s.id === o.schedule_id)?.target_entity_ids.includes(entityId);
  if (leases.length && !leases.some((l) => 'occurrence_id' in l)) {
    const o = occurrences.find((x) => x.state !== 'pending' && covers(x));
    return o ? {occurrence: o, paused: o.condition_branch === 'false' || o.state === 'suspended'} : null;
  }
  const lease = leases.find((l) => l.entity_id === entityId && l.state === 'active');
  if (lease) { const o = occurrences.find((x) => x.id === lease.occurrence_id); return o ? {occurrence: o, paused: false} : null; }
  const o = occurrences.find((x) => x.condition_branch === 'false' && covers(x));
  return o ? {occurrence: o, paused: true} : null;
}

// Blocks of one weekday for one entity, overnight slots split at midnight.
function dayBlocks(schedules, entityId, day) {
  const blocks = [];
  for (const schedule of schedules) {
    if (!schedule.enabled || !schedule.target_entity_ids.includes(entityId)) continue;
    for (const slot of schedule.time_slots || []) {
      const start = tlMinutes(slot.start), end = tlMinutes(slot.end);
      if (end > start) { if (slot.weekdays.includes(day)) blocks.push({schedule, start, end}); continue; }
      if (slot.weekdays.includes(day)) blocks.push({schedule, start, end: 1440});
      if (end > 0 && slot.weekdays.includes((day + 6) % 7)) blocks.push({schedule, start: 0, end});
    }
  }
  return blocks.sort((a, b) => a.start - b.start);
}

class ScheduleCreatorTimelineCard extends HTMLElement {
  constructor() {
    super(); this.attachShadow({mode: 'open'});
    this.adapter = new ScheduleCreatorStateAdapter(() => this.render());
    this.day = null;
    this.shadowRoot.innerHTML = `<style>${TL_STYLE}</style><ha-card></ha-card>`;
    this.shadowRoot.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-day]');
      if (b) { this.day = Number(b.dataset.day); this.render(); }
    });
  }
  static getStubConfig() { return {}; }
  getCardSize() { return 6; }
  setConfig(config) { this.config = config || {}; this.render(); }
  set hass(hass) { const previous = this._hass; this._hass = hass; if (this.isConnected) this.adapter.connect(hass); if (hassChanged(previous, hass, watchedEntities(this.adapter.state))) this.render(); }
  connectedCallback() { if (this._hass) this.adapter.connect(this._hass); this.render(); this.clock ??= setInterval(() => this.render(), 60000); }
  disconnectedCallback() { this.adapter.disconnect(); clearInterval(this.clock); this.clock = null; }
  now() {
    const zone = this._hass?.config?.time_zone || undefined;
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone: zone, weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(new Date()).map((x) => [x.type, x.value]));
    return {weekday: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday), date: Number(p.day), minutes: Number(p.hour) * 60 + Number(p.minute), zone};
  }
  render() {
    if (!this.config) return;
    setLanguage(this._hass, this.config);
    const surface = this.shadowRoot.querySelector('ha-card'), hass = this._hass;
    const {state, error} = this.adapter;
    if (!hass || (!state && !error)) { surface.innerHTML = `<div class="tl-body"><p class="tl-muted">${t('Caricamento…')}</p></div>`; return; }
    if (!state) { surface.innerHTML = `<div class="tl-body"><p class="tl-error">${tlEsc(messageFor(error))}</p></div>`; return; }
    const config = state.config || {}, now = this.now();
    const day = this.day ?? now.weekday, today = day === now.weekday;
    const active = (config.profiles || []).filter((p) => p.active);
    const activeIds = new Set(active.map((p) => p.id));
    const schedules = (config.schedules || []).filter((s) => activeIds.has(s.profile_id));
    const timers = state.quick_timers || [];
    const wanted = Array.isArray(this.config.entities) && this.config.entities.length ? this.config.entities : null;
    const entities = [...new Set([...schedules.flatMap((s) => s.target_entity_ids), ...timers.map((timer) => timer.entity_id)])].filter((id) => !wanted || wanted.includes(id));
    if (wanted) entities.sort((a, b) => wanted.indexOf(a) - wanted.indexOf(b)); else entities.sort((a, b) => (hass.states[a]?.attributes?.friendly_name || a).localeCompare(hass.states[b]?.attributes?.friendly_name || b));
    const colorOf = (schedule) => { const d = schedule.start_action?.data || {}; return schedule.start_action?.domain === 'climate' && d.temperature != null && d.state !== 'off' ? temperatureColor(d.temperature) : TL_PALETTE[(config.schedules || []).indexOf(schedule) % TL_PALETTE.length]; };
    const clock = (iso) => new Intl.DateTimeFormat(locale(), {timeZone: now.zone, hour: '2-digit', minute: '2-digit'}).format(new Date(iso));
    const dates = TL_DAYS.map((label, i) => {
      const d = new Date(Date.now() + (i - now.weekday) * 86400000);
      return `<button type="button" class="tl-day${i === day ? ' is-selected' : ''}" data-day="${i}" aria-pressed="${i === day}"><span>${t(label)}</span><strong>${new Intl.DateTimeFormat(locale(), {timeZone: now.zone, day: 'numeric'}).format(d)}</strong></button>`;
    }).join('');
    const rows = entities.map((entityId) => {
      const st = hass.states[entityId], domain = entityId.split('.')[0];
      const blocks = dayBlocks(schedules, entityId, day);
      const live = today ? liveOccurrence(state, schedules, entityId) : null, running = live?.occurrence;
      const timer = timers.find((item) => item.entity_id === entityId);
      const next = today ? blocks.find((b) => b.start > now.minutes) : blocks[0];
      let status = '', kind = '';
      if (timer) { status = `${t('Timer')} · ${t('fino alle {time}', {time: clock(timer.expires_at)})}`; kind = 'is-timer'; }
      else if (running) { const paused = live.paused; status = paused ? t('In pausa · condizione') : `${shortAction(schedules.find((s) => s.id === running.schedule_id)?.start_action)} · ${t('fino alle {time}', {time: clock(running.end_utc)})}`; kind = paused ? 'is-paused' : 'is-running'; }
      else if (next) status = today ? t('Prossima {time}', {time: tlTime(next.start)}) : t('Dalle {time}', {time: tlTime(next.start)});
      else status = st ? describeState(st, domain) : t('Non disponibile');
      const bars = blocks.map((b) => {
        const live = today && b.start <= now.minutes && now.minutes < b.end && running?.schedule_id === b.schedule.id ? (kind === 'is-paused' ? ' is-paused' : ' is-running') : '';
        const label = `${b.schedule.name} · ${tlTime(b.start)}–${tlTime(b.end)}`;
        return `<span class="tl-block${live}" title="${tlEsc(label)}" style="left:${b.start / 14.4}%;width:${(b.end - b.start) / 14.4}%;--block:${colorOf(b.schedule)}">${b.end - b.start >= 90 ? tlEsc(shortAction(b.schedule.start_action)) : ''}</span>`;
      }).join('');
      const timerBar = timer && today ? (() => { const left = now.minutes, width = Math.max(1, Math.min(1440 - left, (new Date(timer.expires_at) - Date.now()) / 60000)); return `<span class="tl-block tl-timer" style="left:${left / 14.4}%;width:${width / 14.4}%" title="Quick Timer"></span>`; })() : '';
      return `<div class="tl-row"><div class="tl-name"><strong>${tlEsc(st?.attributes?.friendly_name || entityId)}</strong><span class="${kind}">${tlEsc(status)}</span></div><div class="tl-track" aria-label="${tlEsc(st?.attributes?.friendly_name || entityId)}">${bars}${timerBar}${today ? `<span class="tl-now" style="left:${now.minutes / 14.4}%"></span>` : ''}</div></div>`;
    }).join('');
    surface.innerHTML = `<div class="tl-body"><div class="tl-head"><div><span class="tl-eyebrow">${active.length ? `${t('Profili attivi')} · ${tlEsc(active.map((p) => p.name).join(', '))}` : t('Nessun profilo attivo')}</span><strong class="tl-title">${tlEsc(this.config.title || (today ? t('Oggi') : t(['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'][day])))}</strong></div></div>
      <div class="tl-days" role="group" aria-label="${t('Giorno')}">${dates}</div>
      ${entities.length ? `<div class="tl-grid"><div class="tl-row tl-axis"><span></span><div class="tl-ticks"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div></div>${rows}</div>` : `<p class="tl-muted">${t('Nessuna entità programmata nei profili attivi.')}</p>`}</div>`;
  }
}

if (!customElements.get('schedule-creator-timeline-card')) customElements.define('schedule-creator-timeline-card', ScheduleCreatorTimelineCard);
window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === 'schedule-creator-timeline-card')) window.customCards.push({type: 'schedule-creator-timeline-card', name: 'Schedule Creator · Timeline', description: 'One day per device across all active profiles'});
// Whole-week views of every active profile: serpentine (mockup D) and ring (mockup E).
// Read-only: tapping a block shows its details and hands editing to the main card.








const wkEsc = uiEscape;
const WK_STYLE = ":host { display: block; font-family: var(--primary-font-family, Arial, sans-serif); color: var(--primary-text-color, #202a35); --wk-accent: var(--primary-color, #00897b); --wk-muted: var(--secondary-text-color, #647180); --wk-surface: var(--secondary-background-color, #f3f4f2); --wk-track: color-mix(in srgb, var(--primary-text-color, #202a35) 6%, var(--card-background-color, #fff)); --wk-paused: var(--warning-color, #b7791f); --wk-running: var(--success-color, #1f9d55); --wk-now: var(--error-color, #d6453d); }\n* { box-sizing: border-box; }\nha-card { display: block; padding: 20px; border-radius: var(--ha-card-border-radius, 20px); background: var(--card-background-color, #fff); }\n.wk-body { display: grid; gap: 14px; }\n.wk-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }\n.wk-eyebrow { display: block; font-size: .7rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--wk-accent); }\n.wk-title { font-size: 1.35rem; letter-spacing: -0.02em; }\n.wk-clock { font-size: .78rem; color: var(--wk-muted); font-variant-numeric: tabular-nums; white-space: nowrap; }\n.wk-chips { display: flex; flex-wrap: wrap; gap: 6px; }\n.wk-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 14px; background: var(--wk-surface); font-size: .76rem; font-weight: 600; }\n.wk-chip i { width: 14px; height: 6px; border-radius: 3px; }\n.wk-svg { display: block; width: 100%; height: auto; overflow: visible; }\n.wk-ring { max-width: 560px; margin: 0 auto; }\n.wk-track { fill: none; stroke: var(--wk-track); stroke-linecap: round; stroke-linejoin: round; }\n.wk-tick { stroke: var(--card-background-color, #fff); stroke-width: 1.5; opacity: .9; }\n.wk-hour { font-size: 10px; fill: var(--wk-muted); text-anchor: middle; font-variant-numeric: tabular-nums; }\n.wk-day { font-size: 11px; font-weight: 600; letter-spacing: .06em; fill: var(--wk-muted); }\n.wk-ring .wk-day { font-size: 13px; }\n.wk-day.is-today { font-weight: 800; fill: var(--wk-accent); }\n.wk-block { fill: none; stroke-width: 9; stroke-linecap: round; stroke-linejoin: round; pointer-events: none; }\n.wk-block.is-paused { stroke-opacity: .3; }\n.wk-block.is-selected { stroke-width: 11; }\n.wk-halo { fill: none; stroke: var(--wk-running); stroke-opacity: .35; stroke-width: 15; stroke-linecap: round; stroke-linejoin: round; pointer-events: none; }\n.wk-paused-line { fill: none; stroke: var(--wk-paused); stroke-width: 2.5; stroke-dasharray: 5 4; pointer-events: none; }\n.wk-hit { fill: none; stroke: transparent; stroke-width: 13; stroke-linecap: round; stroke-linejoin: round; cursor: pointer; outline: none; }\n.wk-hit:focus-visible { stroke: color-mix(in srgb, var(--wk-accent) 30%, transparent); }\n.wk-timer { fill: none; stroke: var(--wk-running); stroke-width: 5; stroke-dasharray: 2 3; stroke-linecap: round; pointer-events: none; }\n.wk-band { fill: var(--wk-track); }\n.wk-arc { cursor: pointer; outline: none; }\n.wk-arc.is-paused { fill-opacity: .3; stroke: var(--wk-paused); stroke-width: 1.8; stroke-dasharray: 4 3; }\n.wk-arc.is-running { stroke: var(--wk-running); stroke-width: 2.5; }\n.wk-arc.is-selected, .wk-arc:focus-visible { stroke: var(--primary-text-color, #202a35); stroke-width: 2.5; }\n.wk-arc-timer { fill: var(--wk-running); fill-opacity: .55; pointer-events: none; }\n.wk-now { stroke: var(--wk-now); stroke-width: 2; stroke-linecap: round; pointer-events: none; }\n.wk-now-dot { fill: var(--wk-now); }\n.wk-hub { fill: var(--wk-surface); }\n.wk-hub-eyebrow { font-size: 12px; font-weight: 800; letter-spacing: .08em; fill: var(--wk-accent); text-anchor: middle; }\n.wk-hub-title { font-size: 16px; font-weight: 800; fill: var(--primary-text-color, #202a35); text-anchor: middle; }\n.wk-hub-sub { font-size: 13px; fill: var(--wk-muted); text-anchor: middle; }\n.wk-hub-sub.is-running, .wk-hub-sub.is-timer { fill: var(--wk-running); font-weight: 700; }\n.wk-hub-sub.is-paused { fill: var(--wk-paused); font-weight: 700; }\n.wk-detail { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 14px; background: var(--wk-surface); }\n.wk-swatch { flex: none; width: 6px; align-self: stretch; border-radius: 3px; background: var(--block); }\n.wk-detail-copy { display: grid; gap: 2px; min-width: 0; flex: 1; }\n.wk-detail-copy strong { font-size: .9rem; }\n.wk-detail-copy span { font-size: .76rem; color: var(--wk-muted); }\n.wk-edit, .wk-close { flex: none; border: 0; border-radius: 10px; font: inherit; cursor: pointer; }\n.wk-edit { padding: 8px 12px; background: var(--wk-accent); color: var(--text-primary-color, #fff); font-size: .8rem; font-weight: 700; }\n.wk-close { width: 32px; height: 32px; background: transparent; color: var(--wk-muted); font-size: 1.2rem; }\n.wk-edit:focus-visible, .wk-close:focus-visible { outline: 3px solid var(--wk-accent); outline-offset: 2px; }\n.wk-legend { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; font-size: .7rem; color: var(--wk-muted); }\n.wk-legend > span:first-child { margin-right: auto; }\n.wk-key { display: inline-flex; align-items: center; gap: 5px; }\n.wk-key i { display: inline-block; }\n.wk-key .is-paused { width: 14px; border-top: 2px dashed var(--wk-paused); }\n.wk-key .is-running { width: 12px; height: 6px; border-radius: 3px; background: var(--wk-running); opacity: .5; }\n.wk-key .is-now { width: 2px; height: 12px; background: var(--wk-now); }\n.wk-muted { margin: 0; font-size: .82rem; color: var(--wk-muted); }\n.wk-error { margin: 0; color: var(--error-color, #b3261e); }\n";
const WK_DAYS = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];
const WK_FULL = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const WK_PALETTE = ['#3aa17e', '#9b7fd1', '#d9822b', '#326ab2', '#b34269', '#087f8c'];
const WEEK = 10080;
const wkDay = (i) => t(WK_DAYS[i]);
const wkFull = (i) => t(WK_FULL[i]);
const WK_TURN = 120; // minutes drawn on each half U-turn: midnight sits at the apex
const wkMinutes = (value) => { const [h, m] = String(value).split(':').map(Number); return h * 60 + (m || 0); };
const wkTime = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const wkNum = (n) => n.toFixed(1);

// Blocks of one entity in week minutes (Monday 00:00 = 0). Overnight slots stay
// in one piece across midnight; only the Sunday → Monday wrap is split.
function weekBlocks(schedules, entityId) {
  const blocks = [];
  for (const schedule of schedules) {
    if (!schedule.enabled || !schedule.target_entity_ids.includes(entityId)) continue;
    for (const slot of schedule.time_slots || []) {
      const s = wkMinutes(slot.start), e = wkMinutes(slot.end);
      for (const day of slot.weekdays || []) {
        const start = day * 1440 + s, end = day * 1440 + (e > s ? e : 1440 + e);
        if (end <= WEEK) blocks.push({schedule, start, end});
        else blocks.push({schedule, start, end: WEEK}, {schedule, start: 0, end: end - WEEK});
      }
    }
  }
  return blocks.sort((a, b) => a.start - b.start);
}

// Pieces of a block inside each day, for layouts with a gap at midnight.
function splitByDay(block) {
  const parts = [];
  for (let at = block.start; at < block.end;) {
    const next = Math.min(block.end, (Math.floor(at / 1440) + 1) * 1440);
    parts.push({...block, start: at, end: next});
    at = next;
  }
  return parts;
}

// Serpentine geometry in real pixels. Lane offsets are measured to the left of
// the direction of travel, so lanes stay parallel through every U-turn.
function serpentineLayout(width, lanes) {
  const gap = 13, half = Math.max(1, lanes) * gap / 2 + 6, r = Math.max(half + 12, 30);
  const arc = Math.PI * r / 2, label = 32;
  const xl = label + Math.max(r + half, arc), xr = Math.max(xl + 120, width - xl);
  const top = half + 22;
  const point = (m, s) => {
    const d = Math.min(6, Math.floor(m / 1440)), dm = m - d * 1440, dir = d % 2 ? -1 : 1, y = top + d * 2 * r;
    if (dm >= WK_TURN && dm <= 1440 - WK_TURN) {
      const f = (dm - WK_TURN) / (1440 - 2 * WK_TURN);
      return [dir > 0 ? xl + f * (xr - xl) : xr - f * (xr - xl), y - dir * s];
    }
    const entry = dm < WK_TURN, f = entry ? dm / WK_TURN : (dm - 1440 + WK_TURN) / WK_TURN;
    if (entry && d === 0) return [xl - (1 - f) * arc, y - s];
    if (!entry && d === 6) return [xr + f * arc, y - s];
    const k = entry ? d - 1 : d, cx = k % 2 ? xl : xr, cy = top + k * 2 * r + r;
    const right = k % 2 === 0, R = right ? r + s : r - s;
    const deg = right ? (entry ? 90 * f : -90 + 90 * f) : (entry ? -180 - 90 * f : -90 - 90 * f);
    const a = deg * Math.PI / 180;
    return [cx + R * Math.cos(a), cy + R * Math.sin(a)];
  };
  const path = (a, b, s) => {
    const out = [];
    for (let m = a; ; ) {
      out.push(point(m, s));
      if (m >= b) break;
      const dm = m % 1440;
      const next = dm >= WK_TURN && dm < 1440 - WK_TURN ? m - dm + 1440 - WK_TURN : Math.min(m + 4, dm < WK_TURN ? m - dm + WK_TURN : m - dm + 1440);
      m = Math.min(b, next);
    }
    return `M${out.map(([x, y]) => `${wkNum(x)} ${wkNum(y)}`).join(' L')}`;
  };
  const lane = (i) => ((lanes - 1) / 2 - i) * gap;
  return {width: xr + xl, height: top + 12 * r + half + 10, top, r, half, xl, xr, arc, point, path, lane};
}

// Ring geometry: seven sectors clockwise from the top, one ring per lane.
function ringLayout(lanes) {
  const size = 600, c = size / 2, outer = 262, pitch = Math.min(25, 150 / Math.max(1, lanes)), band = pitch - 5;
  const span = 360 / 7, gapDeg = 1.6;
  const angle = (m) => { const d = Math.min(6, Math.floor(m / 1440)); return -90 + d * span + gapDeg / 2 + (span - gapDeg) * (m - d * 1440) / 1440; };
  const at = (deg, radius) => [c + radius * Math.cos(deg * Math.PI / 180), c + radius * Math.sin(deg * Math.PI / 180)];
  const sector = (a0, a1, ro, ri) => {
    const large = a1 - a0 > 180 ? 1 : 0, [x0, y0] = at(a0, ro), [x1, y1] = at(a1, ro), [x2, y2] = at(a1, ri), [x3, y3] = at(a0, ri);
    return `M${wkNum(x0)} ${wkNum(y0)} A${ro} ${ro} 0 ${large} 1 ${wkNum(x1)} ${wkNum(y1)} L${wkNum(x2)} ${wkNum(y2)} A${ri} ${ri} 0 ${large} 0 ${wkNum(x3)} ${wkNum(y3)}Z`;
  };
  const radii = (i) => [outer - i * pitch, outer - i * pitch - band];
  return {size, c, outer, inner: outer - Math.max(1, lanes) * pitch + 5, span, gapDeg, angle, at, sector, radii};
}

class ScheduleCreatorWeekCard extends HTMLElement {
  constructor() {
    super(); this.attachShadow({mode: 'open'});
    this.adapter = new ScheduleCreatorStateAdapter(() => this.render());
    this.selected = null;
    this.shadowRoot.innerHTML = `<style>${WK_STYLE}</style><ha-card></ha-card>`;
    const pick = (e) => {
      const block = e.target.closest?.('[data-block]');
      if (block) { this.selected = this.selected === block.dataset.block ? null : block.dataset.block; this.render(); this.shadowRoot.querySelector(`[data-block="${this.selected}"]`)?.focus?.({preventScroll: true}); return; }
      if (e.target.closest?.('[data-close]')) { this.selected = null; this.render(); return; }
      const edit = e.target.closest?.('[data-edit]');
      if (edit) this.edit(edit.dataset.edit);
    };
    this.shadowRoot.addEventListener('click', pick);
    this.shadowRoot.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest?.('[data-block]')) { e.preventDefault(); pick(e); } });
  }
  static getStubConfig() { return {}; }
  getCardSize() { return 8; }
  setConfig(config) { this.config = config || {}; this.render(); }
  set hass(hass) { const previous = this._hass; this._hass = hass; if (this.isConnected) this.adapter.connect(hass); if (hassChanged(previous, hass, watchedEntities(this.adapter.state))) this.render(); }
  connectedCallback() {
    if (this._hass) this.adapter.connect(this._hass);
    this.clock ??= setInterval(() => this.render(), 60000);
    if (!this.resize && window.ResizeObserver) { this.resize = new ResizeObserver(() => { const w = Math.round(this.clientWidth); if (w && w !== this.measured) { this.measured = w; this.render(); } }); this.resize.observe(this); }
    this.render();
  }
  disconnectedCallback() { this.adapter.disconnect(); clearInterval(this.clock); this.clock = null; this.resize?.disconnect(); this.resize = null; }
  // The main card on this view opens its editor; otherwise go to edit_path.
  edit(id) {
    const request = new CustomEvent('schedule-creator-edit', {detail: {schedule_id: id}, cancelable: true});
    window.dispatchEvent(request);
    if (request.defaultPrevented || !this.config.edit_path) return;
    history.pushState(null, '', `${this.config.edit_path}?sc_edit=${encodeURIComponent(id)}`);
    window.dispatchEvent(new CustomEvent('location-changed', {detail: {replace: false}}));
  }
  now() {
    const zone = this._hass?.config?.time_zone || undefined;
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone: zone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(new Date()).map((x) => [x.type, x.value]));
    const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday), minutes = Number(p.hour) * 60 + Number(p.minute);
    return {weekday, minutes, week: weekday * 1440 + minutes, label: `${p.hour}:${p.minute}`, zone};
  }
  // Everything both layouts draw: lanes, blocks, live status and the selection.
  model(state) {
    const hass = this._hass, config = state.config || {}, now = this.now();
    const active = (config.profiles || []).filter((p) => p.active), activeIds = new Set(active.map((p) => p.id));
    const schedules = (config.schedules || []).filter((s) => activeIds.has(s.profile_id));
    const timers = state.quick_timers || [];
    const wanted = Array.isArray(this.config.entities) && this.config.entities.length ? this.config.entities : null;
    const name = (id) => hass.states[id]?.attributes?.friendly_name || id;
    let entities = [...new Set([...schedules.flatMap((s) => s.target_entity_ids), ...timers.map((t) => t.entity_id)])].filter((id) => !wanted || wanted.includes(id));
    if (wanted) entities.sort((a, b) => wanted.indexOf(a) - wanted.indexOf(b)); else entities.sort((a, b) => name(a).localeCompare(name(b)));
    entities = entities.slice(0, Math.max(1, Math.min(8, Number(this.config.max_lanes) || 6)));
    const clock = (iso) => new Intl.DateTimeFormat(locale(), {timeZone: now.zone, hour: '2-digit', minute: '2-digit'}).format(new Date(iso));
    const lanes = entities.map((entityId, index) => {
      const base = WK_PALETTE[index % WK_PALETTE.length];
      const colorOf = (schedule) => { const d = schedule.start_action?.data || {}; if (schedule.start_action?.domain !== 'climate') return base; return d.state === 'off' ? '#9aa5ad' : d.temperature != null ? temperatureColor(d.temperature) : base; };
      const live = liveOccurrence(state, schedules, entityId), running = live?.occurrence, paused = !!live?.paused;
      const timer = timers.find((t) => t.entity_id === entityId);
      const blocks = weekBlocks(schedules, entityId).map((b, i) => {
        const live = running?.schedule_id === b.schedule.id && ((b.start <= now.week && now.week < b.end) || (b.start <= now.week + WEEK && now.week + WEEK < b.end));
        return {...b, key: `${index}-${i}`, color: colorOf(b.schedule), live: live ? (paused ? 'paused' : 'running') : ''};
      });
      let status = '';
      if (timer) status = `${t('Timer')} ${t('fino alle {time}', {time: clock(timer.expires_at)})}`;
      else if (running) status = paused ? t('In pausa · condizione') : `${shortAction(schedules.find((s) => s.id === running.schedule_id)?.start_action)} ${t('fino alle {time}', {time: clock(running.end_utc)})}`;
      const climate = entityId.startsWith('climate.');
      return {entityId, name: name(entityId), color: base, climate, blocks, status, statusKind: timer ? 'timer' : running ? (paused ? 'paused' : 'running') : '',
        timer: timer ? {start: now.week, end: Math.min(now.week + Math.max(1, (new Date(timer.expires_at) - Date.now()) / 60000), now.week + WEEK)} : null};
    });
    const pick = lanes.flatMap((l) => l.blocks.map((b) => ({lane: l, block: b}))).find((x) => x.block.key === this.selected);
    if (!pick) this.selected = null;
    const next = lanes.flatMap((l) => l.blocks.filter((b) => b.start > now.week).map((b) => ({lane: l, block: b}))).sort((a, b) => a.block.start - b.block.start)[0];
    return {active, lanes, now, pick, next, profiles: config.profiles || []};
  }
  header(m, fallback) {
    const chips = m.lanes.map((l) => `<span class="wk-chip"><i style="background:${l.climate ? 'linear-gradient(90deg,#4a90d9,#96c4e8,#f08a4b)' : l.color}"></i>${wkEsc(l.name)}</span>`).join('');
    return `<div class="wk-head"><div><span class="wk-eyebrow">${m.active.length ? `${t('Profili attivi')} · ${wkEsc(m.active.map((p) => p.name).join(', '))}` : t('Nessun profilo attivo')}</span><strong class="wk-title">${wkEsc(this.config.title || fallback)}</strong></div><span class="wk-clock">${wkDay(m.now.weekday).toLowerCase()} ${m.now.label}</span></div>
      ${chips ? `<div class="wk-chips">${chips}</div>` : ''}`;
  }
  detail(m) {
    if (!m.pick) return '';
    const {lane, block} = m.pick, s = block.schedule;
    const from = Math.floor(block.start / 1440) % 7;
    const when = `${wkDay(from).charAt(0)}${wkDay(from).slice(1).toLowerCase()} ${wkTime(block.start % 1440)}–${wkTime(block.end % 1440)}`;
    const profile = m.profiles.find((p) => p.id === s.profile_id)?.name;
    const live = block.live === 'running' ? ` · ${t('in corso')}` : block.live === 'paused' ? ` · ${t('in pausa')}` : '';
    const canEdit = this._hass?.user?.is_admin === true && (window.__scheduleCreatorEditors > 0 || this.config.edit_path);
    return `<div class="wk-detail" style="--block:${block.color}" role="status"><span class="wk-swatch"></span><div class="wk-detail-copy"><strong>${wkEsc(s.name)}</strong><span>${wkEsc([lane.name, when + live, describeAction(s.start_action), profile && t('profilo {name}', {name: profile})].filter(Boolean).join(' · '))}</span></div>${canEdit ? `<button type="button" class="wk-edit" data-edit="${wkEsc(s.id)}">${t('Modifica')}</button>` : ''}<button type="button" class="wk-close" data-close aria-label="${t('Chiudi')}">×</button></div>`;
  }
  blockLabel(lane, block) {
    const d = Math.floor(block.start / 1440) % 7;
    return `${lane.name} · ${block.schedule.name} · ${wkFull(d)} ${wkTime(block.start % 1440)}–${wkTime(block.end % 1440)} · ${shortAction(block.schedule.start_action)}`;
  }
  render() {
    if (!this.config) return;
    setLanguage(this._hass, this.config);
    const surface = this.shadowRoot.querySelector('ha-card');
    const {state, error} = this.adapter;
    if (!this._hass || (!state && !error)) { surface.innerHTML = `<div class="wk-body"><p class="wk-muted">${t('Caricamento…')}</p></div>`; return; }
    if (!state) { surface.innerHTML = `<div class="wk-body"><p class="wk-error">${wkEsc(messageFor(error))}</p></div>`; return; }
    const m = this.model(state);
    const body = m.lanes.length ? this.drawing(m) : `<p class="wk-muted">${t('Nessuna entità programmata nei profili attivi.')}</p>`;
    surface.innerHTML = `<div class="wk-body">${this.header(m, this.defaultTitle)}${body}${this.detail(m)}${m.lanes.length ? `<div class="wk-legend"><span>${wkEsc(this.hint)}</span><span class="wk-key"><i class="is-paused"></i>${t('in pausa')}</span><span class="wk-key"><i class="is-running"></i>${t('in corso')}</span><span class="wk-key"><i class="is-now"></i>${t('ora')}</span></div>` : ''}</div>`;
  }
}

class ScheduleCreatorSerpentineCard extends ScheduleCreatorWeekCard {
  get defaultTitle() { return t('La settimana'); }
  get hint() { return t('Lun → · Mar ← · la mezzanotte è nella curva'); }
  drawing(m) {
    const width = Math.max(320, (this.measured || 728) - 40);
    const L = serpentineLayout(width, m.lanes.length);
    const track = L.path(0, WEEK, 0);
    const ticks = [];
    for (let d = 0; d < 7; d++) for (const h of [6, 12, 18]) {
      const [x1, y1] = L.point(d * 1440 + h * 60, L.half), [x2, y2] = L.point(d * 1440 + h * 60, -L.half);
      ticks.push(`<line class="wk-tick" x1="${wkNum(x1)}" y1="${wkNum(y1)}" x2="${wkNum(x2)}" y2="${wkNum(y2)}"/>`);
    }
    const hours = [6, 12, 18].map((h) => { const [x, y] = L.point(h * 60, L.half + 8); return `<text class="wk-hour" x="${wkNum(x)}" y="${wkNum(y)}">${String(h).padStart(2, '0')}</text>`; }).join('');
    const labels = WK_DAYS.map((day, d) => `<text class="wk-day${d === m.now.weekday ? ' is-today' : ''}" x="${d % 2 ? L.width - 4 : 4}" y="${wkNum(L.top + d * 2 * L.r + 4)}" text-anchor="${d % 2 ? 'end' : 'start'}">${t(day)}</text>`).join('');
    const blocks = m.lanes.map((lane, i) => {
      const s = L.lane(i);
      const drawn = lane.blocks.map((b) => {
        const d = L.path(b.start, b.end, s), sel = b.key === this.selected ? ' is-selected' : '';
        const halo = b.live === 'running' ? `<path class="wk-halo" d="${d}"/>` : '';
        const dash = b.live === 'paused' ? `<path class="wk-paused-line" d="${d}"/>` : '';
        return `${halo}<path class="wk-block${b.live === 'paused' ? ' is-paused' : ''}${sel}" d="${d}" style="stroke:${b.color}"/>${dash}<path class="wk-hit" d="${d}" data-block="${b.key}" tabindex="0" role="button" aria-label="${wkEsc(this.blockLabel(lane, b))}"><title>${wkEsc(this.blockLabel(lane, b))}</title></path>`;
      }).join('');
      const timer = lane.timer ? `<path class="wk-timer" d="${L.path(lane.timer.start, Math.min(WEEK, lane.timer.end), s)}"/>` : '';
      return drawn + timer;
    }).join('');
    const [ax, ay] = L.point(m.now.week, L.half + 2), [bx, by] = L.point(m.now.week, -L.half - 2);
    const now = `<line class="wk-now" x1="${wkNum(ax)}" y1="${wkNum(ay)}" x2="${wkNum(bx)}" y2="${wkNum(by)}"/><circle class="wk-now-dot" cx="${wkNum(ax)}" cy="${wkNum(ay)}" r="3"/>`;
    return `<svg class="wk-svg" viewBox="0 0 ${wkNum(L.width)} ${wkNum(L.height)}" role="group" aria-label="${t('Settimana a serpentina')}"><path class="wk-track" d="${track}" style="stroke-width:${L.half * 2}"/>${ticks.join('')}${hours}${labels}${blocks}${now}</svg>`;
  }
}

class ScheduleCreatorRingCard extends ScheduleCreatorWeekCard {
  get defaultTitle() { return t('La settimana ad anello'); }
  get hint() { return t('Ogni anello è un dispositivo · lo spazio tra i settori è la mezzanotte'); }
  drawing(m) {
    const L = ringLayout(m.lanes.length), n = m.lanes.length;
    const bands = [], labels = [];
    for (let d = 0; d < 7; d++) {
      const a0 = -90 + d * L.span + L.gapDeg / 2, a1 = a0 + L.span - L.gapDeg;
      for (let i = 0; i < n; i++) { const [ro, ri] = L.radii(i); bands.push(`<path class="wk-band" d="${L.sector(a0, a1, ro, ri)}"/>`); }
      const [x, y] = L.at((a0 + a1) / 2, L.outer + 18);
      labels.push(`<text class="wk-day${d === m.now.weekday ? ' is-today' : ''}" x="${wkNum(x)}" y="${wkNum(y + 4)}" text-anchor="middle">${wkDay(d)}</text>`);
    }
    const blocks = m.lanes.map((lane, i) => {
      const [ro, ri] = L.radii(i);
      const drawn = lane.blocks.map((b) => splitByDay(b).map((part) => {
        const d = L.sector(L.angle(part.start), L.angle(part.end === Math.ceil(part.end / 1440) * 1440 ? part.end - 0.001 : part.end), ro - 2, ri + 2);
        const cls = `wk-arc${b.live ? ` is-${b.live}` : ''}${b.key === this.selected ? ' is-selected' : ''}`;
        return `<path class="${cls}" d="${d}" style="fill:${b.color}" data-block="${b.key}" tabindex="0" role="button" aria-label="${wkEsc(this.blockLabel(lane, b))}"><title>${wkEsc(this.blockLabel(lane, b))}</title></path>`;
      }).join('')).join('');
      const timer = lane.timer ? splitByDay({start: lane.timer.start, end: Math.min(WEEK, lane.timer.end)}).map((p) => `<path class="wk-arc-timer" d="${L.sector(L.angle(p.start), L.angle(p.end % 1440 ? p.end : p.end - 0.001), ro - 2, ri + 2)}"/>`).join('') : '';
      return drawn + timer;
    }).join('');
    const deg = L.angle(m.now.week), [x1, y1] = L.at(deg, L.inner - 4), [x2, y2] = L.at(deg, L.outer + 4), [dx, dy] = L.at(deg, L.outer + 8);
    const now = `<line class="wk-now" x1="${wkNum(x1)}" y1="${wkNum(y1)}" x2="${wkNum(x2)}" y2="${wkNum(y2)}"/><circle class="wk-now-dot" cx="${wkNum(dx)}" cy="${wkNum(dy)}" r="3.5"/>`;
    // Centre: what is happening now, or the next block when nothing runs.
    const live = m.lanes.filter((l) => l.status).slice(0, 3);
    const lines = live.length ? live.map((l) => [`${l.name}`, l.status, l.statusKind]) : m.next ? [[t('Nessuna attività in corso'), '', ''], [t('Prossima: {name}', {name: m.next.lane.name}), `${wkDay(Math.floor(m.next.block.start / 1440)).toLowerCase()} ${wkTime(m.next.block.start % 1440)}`, '']] : [[t('Nessuna attività in corso'), '', '']];
    const hub = L.inner - 12, cut = (text, max) => text.length > max ? `${text.slice(0, max - 1)}…` : text, max = Math.floor(hub / 5);
    let y = L.c - (lines.length * 36) / 2 + 4;
    const text = lines.map(([title, sub, kind]) => { const out = `<text class="wk-hub-title" x="${L.c}" y="${wkNum(y)}">${wkEsc(cut(title, max))}</text>${sub ? `<text class="wk-hub-sub${kind ? ` is-${kind}` : ''}" x="${L.c}" y="${wkNum(y + 17)}">${wkEsc(cut(sub, max))}</text>` : ''}`; y += 36; return out; }).join('');
    const center = `<circle class="wk-hub" cx="${L.c}" cy="${L.c}" r="${hub}"/><text class="wk-hub-eyebrow" x="${L.c}" y="${wkNum(L.c - (lines.length * 36) / 2 - 20)}">${wkFull(m.now.weekday).toUpperCase()} ${m.now.label}</text>${text}`;
    return `<svg class="wk-svg wk-ring" viewBox="0 0 ${L.size} ${L.size}" role="group" aria-label="${t('Settimana ad anello')}">${bands.join('')}${labels.join('')}${blocks}${center}${now}</svg>`;
  }
}

for (const [tag, cls, name, description] of [
  ['schedule-creator-serpentine-card', ScheduleCreatorSerpentineCard, 'Schedule Creator · Serpentine', 'The week of several devices on a serpentine path'],
  ['schedule-creator-ring-card', ScheduleCreatorRingCard, 'Schedule Creator · Ring', 'The week as a ring: one sector per day, one ring per device'],
]) {
  if (!customElements.get(tag)) customElements.define(tag, cls);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((card) => card.type === tag)) window.customCards.push({type: tag, name, description});
}
