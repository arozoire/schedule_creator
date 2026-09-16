# AI development handoff

## Current checkpoint

- Date: 2026-09-16
- Current phase: 2.2 — storage nativo e journal delle operazioni
- Repository: arozoire/schedule_creator
- Branch: codex/phase-2-storage
- Pull request: #4 (DRAFT)
- Remote head: 04ecf731dd5a669612a9da983541ef5fe708e194
- Base commit: 176d440844b26d68c27e66f710a0637cadf5ba6b
- Working tree: clean after fix for Store compatibility
- CI status: Local tests pass (66 pytest, mypy strict, ruff)
- Last verified commit: 04ecf731dd5a669612a9da983541ef5fe708e194 (after fix)

## What currently works

- Integrazione lifecycle completata e mergiata (Fase 1)
- Modelli persistiti versionati completati e mergiati (Fase 2.1)
- Storage nativo Home Assistant con tre Store separati (config, runtime, audit)
- Atomicità delle scritture tramite async lock per Store
- Mutazioni ottimistiche della configurazione con controllo revisione
- Commit immediati per lo runtime, buffered per l'audit
- Journal delle operazioni con stati PREPARED/SENT/RETRY_WAIT/SUCCEEDED/FAILED_FINAL/SUPERSEDED
- Sequenze monotone per le operazioni
- Recovery plan deterministico all'avvio (senza replay dei servizi)
- Pruning dell'audit basato su tempo reale e numero massimo di record
- Validazione incrociata di snapshot, lease, operazioni, controller
- Gestione degli errori: audit non autorevole, non blocca runtime
- Migrazioni Store: dispatch per versioni future
- Config-entry removal: preserva i dati nativi fino a RESET esplicito
- Correzioni per clock rollback: timestamp monotoni, retry basati su wall-clock

## Changes made in this session

- Commit: 04ecf731dd5a669612a9da983541ef5fe708e194 (esistente)
- Files: custom_components/schedule_creator/storage.py
- Behaviour: Rimosso parametro `serialize_in_event_loop` non supportato da Home Assistant Store
- Reason: Fix di compatibilità con l'API corrente di Home Assistant Store

## Decisions and invariants

- Lo storage audit è non autorevole: un suo errore non può bloccare config o runtime
- I timestamp persistiti non retrocedono mai, anche in caso di correzione dell'orologio
- Le scadenze di retry usano il tempo reale (wall-clock), non il tempo persistito
- Il pruning dell'audit usa il tempo reale per la finestre di retention
- Le operazioni terminali (SUCCEEDED, FAILED_FINAL, SUPERSEDED) non sono incluse nel recovery plan
- I snapshot sono immutabili e legati al controller di appartenenza
- Ogni operazione ha una sequenza univoca e monotona

## Tests performed

| Command/check | Environment | Result | Commit covered |
|---|---|---|---|
| `pytest tests/test_storage.py` | local | 27 passed | 04ecf73 |
| `pytest tests/` | local | 66 passed | 04ecf73 (after fix) |
| `mypy custom_components/schedule_creator --strict` | local | no issues | 04ecf73 (after fix) |
| `ruff check custom_components/schedule_creator` | local | all checks passed | 04ecf73 (after fix) |
| Test specifici clock rollback | local | 3 passed | 04ecf73 |

## Known limitations

- Recovery: il piano è deterministico ma non esegue il replay dei servizi (Fase 2.4+)
- WebSocket API: non implementate (Fase 2.3)
- Motore temporale: non implementato (Fase 2.4)
- Arbitraggio: non implementato (Fase 2.5)
- Condizioni e snapshot: non implementati (Fase 2.6)
- Quick Timer: non implementato (Fase 2.8)
- Manutenzione (backup/ripristino/RESET): non implementata (Fase 2.9)
- Adattatori di dominio: non implementati (Fase 2.7)
- Migrazione da Weekly Schedule Card: non implementata (Fase 3)
- Card Lovelace: progetto separato, non implementata (Fase 4)

## Open review findings

Tutti i thread della review precedente risultano risolti:
- Validazione entity ID con la grammatica slug di Home Assistant
- Rifiuto di UUID non canonici durante la costruzione diretta
- Enforcement dei limiti di fan-out delle condizioni e budget dei nodi totali
- Rifiuto di selettori target embeddati nei dati delle azioni
- Binding delle operazioni target/restore ai controller persistiti
- Rifiuto di lease orfani o non corrispondenti
- Rifiuto di snapshot Quick Timer appartenenti ad un altro controller o entità

## Next exact task

1. Attendere conferma esplicita del proprietario per il merge della PR #4
2. Dopo il merge, procedere con la Fase 2.3 (API native)

## Actions requiring owner confirmation

- Merge: **SÌ** - La fase 2.2 è completa e validata. Richiesto merge esplicito della PR #4
- Version bump: NO - Non richiesto fino al completamento della Fase 2.3
- Release: NO - Non richiesto fino al completamento di tutte le fasi
- Destructive maintenance: NO

## Session history

### 2026-09-16 — Vibe Code

- Summary: Verifica e validazione della Fase 2.2 (storage nativo e journal). Fix di compatibilità con Home Assistant Store (rimozione parametro `serialize_in_event_loop`). Tutti i test locali passano (66 pytest, mypy strict, ruff).
- Final commit: 04ecf731dd5a669612a9da983541ef5fe708e194 (con fix di compatibilità)
- Remaining work: Attesa conferma merge PR #4 per procedere con Fase 2.3
