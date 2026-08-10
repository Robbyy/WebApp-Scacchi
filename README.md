# WebApp Scacchi

Webapp personale per l'allenamento delle aperture di scacchi: gestione di studi e varianti,
allenamento su scacchiera con controllo errori, import PGN e studi Lichess,
registrazione sessioni, statistiche e spaced repetition SM-2.

## Stato

Parte 1 e Parte 2 (P0–P19) completate e verificate in locale.
Backend: 103 test verdi. Frontend: 338 test verdi.
Terza tornata (infrastruttura) avviata: **schema gestito da Liquibase** (ISSUE-019, fatto).
OpenSpec è installato e lo scaffold `openspec/` è pronto per le change di maggiore impatto.
ISSUE-003 (header home: titolo e pulsanti a capo) risolta e verificata a Full HD
(commit `aa5048b`). Evolutiva **R22 completata** (2026-08-06): pagina unica
creazione/import studio, modifica inline dei metadati e griglia home a due colonne
ISSUE-011 + ISSUE-012 + ISSUE-009). Evolutiva **R23 completata** (2026-08-10): pannello
varianti adattivo nel dettaglio e nell'editor (rail da 1500px, drawer alle altre larghezze),
rimozione di Auto-play e correzioni P1 al cambio variante (ISSUE-010 + ISSUE-008).
Evolutiva **R24 completata** (2026-08-10): menu azioni per mossa nell'editor e annotazioni
(commento + un NAG) sui nodi dell'albero, lette anche nel dettaglio (ISSUE-013 +
`issue-016-move-comments`).
Prossimi: bug ISSUE-004/005/006/020, evolutiva R25 (`issue-016-custom-starting-fen`),
Supabase PostgreSQL, Supabase Auth, Docker e CI/CD.

## Stack

| Layer | Tecnologie |
|-------|------------|
| Frontend | Angular 22 · TypeScript · Vitest · chess.js · Stockfish asm.js |
| Backend | Java 21 · Spring Boot 4.1.0 · Maven · JPA/Hibernate · chesslib |
| Database | H2 su file (locale), schema versionato con Liquibase · futuro: Supabase PostgreSQL |
| Auth | non ancora implementata · futuro: Supabase Auth |

## Struttura del repository

```
backend/    Spring Boot (Maven) — API REST, persistenza JPA, validazione scacchistica
frontend/   Angular — scacchiera, editor, training, import, statistiche, spaced repetition
docs/       Documentazione operativa e archivio storico
openspec/   Change/spec per evoluzioni medio-grandi (schema spec-driven)
```

Backend e frontend sono **fisicamente separati**: build indipendenti, comunicazione solo via HTTP REST.

## Documentazione

Ordine consigliato di lettura:

1. **Questo file** — panoramica progetto
2. [`docs/stato-corrente.md`](docs/stato-corrente.md) — cosa esiste oggi, funzionalità, aree delicate
3. Per task specifici:
   - architettura / API / dati → [`docs/architettura.md`](docs/architettura.md)
   - ripetizione spaziata (SM-2) → [`docs/sm2.md`](docs/sm2.md)
   - migrazioni schema (Liquibase) → [`docs/specs/liquibase.md`](docs/specs/liquibase.md)
   - setup e test → [`backend/README.md`](backend/README.md), [`frontend/README.md`](frontend/README.md)
   - checklist manuale → [`docs/checklist-e2e.md`](docs/checklist-e2e.md)
   - change/spec → [`openspec/`](openspec/) (CLI `openspec`, comandi Claude `/opsx:*`)
4. [`docs/adr/decisioni-tecniche.md`](docs/adr/decisioni-tecniche.md) — decisioni architetturali (ADR 0001–0013)
5. [`docs/roadmap.md`](docs/roadmap.md) — cosa viene dopo · [`docs/backlog.md`](docs/backlog.md) — backlog (indice; classi in [`docs/backlog/`](docs/backlog/): bug, manutenzione evolutiva, sviluppi importanti) · [`docs/piano-rilasci-evolutivi.md`](docs/piano-rilasci-evolutivi.md) — sequenza prioritaria dei prossimi rilasci evolutivi

Storico: [`docs/archive/`](docs/archive/) · git log
