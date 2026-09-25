# Changelog

After each update restart Home Assistant and reload the dashboard.

## 0.4.2

- Delete button in the editor of existing schedules, profiles and groups.
- 0–100 % sliders show an icon and what each end means (fully closed / fully
  open, warm / cool light, fan off / maximum).
- The Quick Timer button left the main card: use the Quick Timer card.
  Running timers are still listed under Activity.
- The “manual commands” option is no longer shown (it was never applied).
- Profile and schedule switches are configuration entities and the next-slot
  sensor is diagnostic, so they stay out of automatic dashboards and favourites.

## 0.4.1

- **Automations and voice**: a switch per profile and per schedule, a
  next-slot sensor, services `set_profile`, `set_schedule`, `start_timer` and
  `cancel_timer`.
- **Languages**: English, French, German and Spanish besides Italian, following
  the Home Assistant user language (card option `language`).
- **Sunrise / sunset** slot boundaries with an offset in minutes.
- **Previous state** end action: puts the device back as it was at the start.
- **Statistics** at the bottom of each schedule: activations, slots blocked by
  the condition, last dates.
- Fixes: finished records are cleaned up after a week; deactivating a profile
  or changing a schedule acts on the slot in progress at once; device commands
  time out after 20 s and are retried; failed commands are shown in the card;
  cards show “waiting” when another schedule or timer has priority.
- Faster: cards redraw only when an entity they show changes; a sensor update
  that does not change a condition no longer recomputes everything.

## 0.4.0

- Import from a weekly-schedule-card backup, with a preview of each schedule.
- Valves are edited like covers.
- Serpentine and ring cards: the whole week of every active profile.
- Timeline card, Quick Timer card, main card redesign, conditions with
  hysteresis and delays, status notifications, backup / restore / RESET.
