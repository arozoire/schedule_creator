# Moving from weekly-schedule-card to Schedule Creator

weekly-schedule-card is no longer developed. Schedule Creator replaces it: the
schedules run inside Home Assistant instead of through Scheduler, helpers and
generated automations, so there is nothing left to clean up by hand.

The move takes about ten minutes. Nothing is deleted until you decide, and the
old setup keeps working until the very last step.

## 1. Save the old configuration

1. Update weekly-schedule-card to **1.5.3 or newer**.
2. Open the card, go to **Groups → Maintenance → Save configuration** and keep
   the downloaded `weekly-schedule-card-backup-….json` file.

This file is your safety net: the same menu can restore it later.

## 2. Install Schedule Creator

1. In HACS add `https://github.com/arozoire/schedule_creator` as a custom
   repository of type **Integration**, download **Schedule Creator** and
   restart Home Assistant.
2. **Settings → Devices & services → Add integration → Schedule Creator.**
3. Add the card to a dashboard:

   ```yaml
   type: custom:schedule-creator-card
   ```

## 3. Import

1. In the Schedule Creator card open **Maintenance → Import from Weekly
   Schedule Card** and choose the backup file.
2. Read the preview. Every schedule is marked:
   - **Ready** – converted as it was;
   - **To check** – converted, with a note (for example “workdays” became
     Monday–Friday);
   - **Imported disabled** – something could not be converted (a condition on
     an attribute): complete it in the editor and enable the schedule;
   - **Not imported** – one-off schedules or unsupported times, with the reason.
3. Press **Import**. Everything lands in a new profile that is **inactive**:
   nothing runs yet.

Not imported: running Quick Timers, dashboards and cards. Sunrise/sunset times,
conditions with hysteresis, end actions and notifications are imported.

## 4. Check the imported schedules

Open the imported profile and look at each schedule, in particular the ones
marked *To check* or *Imported disabled*. The week view, the timeline card and
the statistics at the bottom of each schedule help you verify.

## 5. Stop weekly-schedule-card

Choose one:

- **Keep it for now** – turn its schedules off (in the old card, or the
  `switch.schedule_…` entities of Scheduler). Easy to undo.
- **Remove its data** – in the old card open **Groups → Maintenance → RESET**,
  download the inventory, tick the confirmation and type `RESET`. It deletes
  the schedules, automations and helpers weekly-schedule-card generated. It
  does not send commands to your devices and does not touch anything else.

  Scheduler entries that the card cannot recognise as its own are listed as
  *ignored* and kept: delete them in Scheduler if you do not need them.

Do this **before** the next step, otherwise both would command your devices.

## 6. Activate the new profile

In Schedule Creator activate the imported profile (or turn on
`switch.schedule_creator_profile_…`). From now on Schedule Creator runs the
schedules, with or without an open dashboard.

## 7. Tidy up (optional)

- Remove the old cards from your dashboards.
- Uninstall weekly-schedule-card in HACS.
- If nothing else uses them, remove the **Scheduler** integration and
  scheduler-card, and the `input_text.wsc_store_…` helpers
  (**Settings → Devices & services → Helpers**).

## Going back

Deactivate the Schedule Creator profile, turn the old schedules back on — or,
after a RESET, restore the backup from step 1 in weekly-schedule-card
(**Maintenance → Restore from backup**; it needs an empty weekly-schedule-card
and restores the profiles inactive).
