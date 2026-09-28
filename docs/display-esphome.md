# Display ESPHome

Ogni dispositivo usato da uno schedule ha un sensore "Piano" con un entity_id
stabile, indipendente dalla lingua:
`sensor.schedule_creator_plan_<dominio>_<object_id>` (per esempio
`sensor.schedule_creator_plan_climate_bioclimatica`).

Considera solo gli schedule attivi dei **profili attivi**, cioè quello che il
motore eseguirà davvero, con giorni, date escluse/incluse e alba/tramonto già
risolti. Lo stato è `running` (fascia in corso), `idle` (fasce previste, nessuna
in corso) o `none` (nessuno schedule attivo).

## Formato di una fascia

```text
<inizio>-<fine>@<stato>[:<numero>]#<k>      es. 390-510@heat:21#0
```

- inizio, fine: minuti locali da mezzanotte (0–1440);
- stato: quello applicato (`heat`, `off`, `on`, `open`…) oppure il nome
  dell'azione (`turn_on`…); `set` se il termostato riceve solo la temperatura;
- numero: temperatura, posizione, luminosità % o velocità %, massimo un decimale;
- k: indice dello schedule nell'attributo `schedules`.

Una fascia che attraversa la mezzanotte compare in tutti e due i giorni.

## Attributi (tutti testo)

| Attributo | Contenuto |
| --- | --- |
| `today` | Fasce di oggi separate da `\|` |
| `week` | Da lunedì a domenica della settimana corrente, separati da `/` (giorni vuoti possibili) |
| `week_start` | Data di quel lunedì |
| `schedules`, `profile` | Nomi degli schedule (`\|`) e dei profili attivi (` + `) |
| `current`, `current_blocked` | Fascia in corso, e `on` se la sua condizione la blocca |
| `after` | Cosa succede alla fine: `stato[:numero]`, `restore` o `none` |
| `next_start`, `next` | Inizio (ISO) e fascia della prossima |
| `manual` | `on` se il dispositivo non è più come l'ha messo la fascia in corso |
| `truncated` | `on` se un giorno aveva più di 12 fasce (restano le prime 12) |
| `updated` | Ora dell'ultimo calcolo |

## Esempio

```yaml
text_sensor:
  - platform: homeassistant
    id: bio_today
    entity_id: sensor.schedule_creator_plan_climate_bioclimatica
    attribute: today
  - platform: homeassistant
    id: bio_week
    entity_id: sensor.schedule_creator_plan_climate_bioclimatica
    attribute: week
# pulsante: homeassistant.action → schedule_creator.resume
#           data: {entity_id: climate.bioclimatica}
```

## Riprendi

Una modifica manuale durante una fascia resta finché lo schedule non manda il
comando successivo. `schedule_creator.resume` rimanda subito il comando della
fascia in corso (se la condizione la blocca, o non c'è fascia, non fa nulla).
