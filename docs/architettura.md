# Architettura — WebApp Scacchi

> **Fonte autorevole:** controller, DTO, entità JPA e test sono la fonte di verità.
> Questo documento è una panoramica operativa. In caso di discrepanza, il codice vince.
> Per request/response complete → controller e DTO. Per campi esatti → entità JPA.

---

## Vista generale

Il sistema è composto da **due applicazioni fisicamente separate** che comunicano solo via HTTP REST:

```
frontend/ (Angular)  ──── HTTP REST ────  backend/ (Spring Boot)
     ↕                                          ↕
browser del client                        H2 file (locale)
```

- nessun import incrociato tra i due progetti;
- build indipendenti (npm / Maven);
- il frontend non conosce il database, il backend non conosce Angular.

---

## Backend

**Stack:** Java 21 · Spring Boot 4.1.0 · Maven · JPA/Hibernate · H2 (file) · chesslib (JitPack).

Package principali sotto `com.scacchi.backend`:

| Package | Responsabilità |
|---------|----------------|
| `ping` | Health check (`GET /api/ping`) |
| `variant` | CRUD varianti, albero mosse, validazione legalità (`chesslib`) |
| `study` | CRUD studi 1-N con varianti, cascata, import bulk e upsert Lichess |
| `training` | Sessioni di allenamento: registrazione e storico mosse |
| `stats` | Aggregazioni statistiche per variante e studio |
| `review` | Spaced repetition SM-2: scheduling e lista varianti dovute (teoria e formule → [`docs/sm2.md`](sm2.md)) |

---

## Frontend

**Stack:** Angular 22 · TypeScript · Vitest · componenti standalone · signals · OnPush · chess.js · Stockfish asm.js.

Aree principali sotto `src/app`:

| Area | Responsabilità |
|------|----------------|
| `chessboard` | Scacchiera custom (click, drag, promozione) + barra valutazione |
| `variants` | Lista, dettaglio, editor, training, import PGN |
| `studies` | Home a studi, dettaglio, import e OAuth Lichess |
| `stats` | Viste statistiche per variante e studio |
| `reviews` | Vista «Ripeti oggi» (spaced repetition) |
| `play` | Gioca contro il computer (Stockfish client-side) |
| `core` | Servizi e modelli condivisi |

---

## Scelte tecniche importanti

- **Scacchiera custom Angular/CSS/SVG** — nessuna libreria di rendering; pezzi Staunton SVG, palette pergamena. Regole e validazione: `chess.js` (frontend) / `chesslib` (backend). Separazione deliberata rendering–regole (ADR 0001, 0004).
- **Albero mosse `MoveNode`** — `children[0]` è sempre la mainline; gli altri figli sono sotto-varianti. Il campo `moves[]` mantiene la mainline derivata per compatibilità. (ADR 0002.)
- **Stockfish client-side** — asm.js single-thread in un Web Worker (`frontend/public/stockfish/`); nessun endpoint backend; **mai disponibile in modalità allenamento** (per costruzione: `variant-training` non importa né `StockfishService` né `EvalBar`). (ADR 0009.)
- **OAuth Lichess (PKCE)** — solo per leggere studi privati/unlisted; token in `sessionStorage`, mai lato backend; non introduce login applicativo. (ADR 0008.)
- **Import PGN** — parsing client-side con parser dedicato (`core/pgn.ts`); `chess.js` resta motore di regole; varianti annidate, commenti e NAG supportati. (ADR 0007.)

---

## Vincoli

- Frontend e backend **fisicamente separati**: nessun import diretto tra i due progetti.
- Nessuna libreria React nel frontend.
- Nessuna modifica infrastrutturale (Supabase, Docker) senza specifica dedicata.
- H2 file è lo schema **di sviluppo locale**: non è lo schema definitivo. Prima di migrare a PostgreSQL servono migrazioni versionate (vedi §Note H2).
- `userId` è predisposto nullable su `TrainingSession` e `ReviewSchedule` ma **inattivo**: si attiverà con Supabase Auth.

---

## Panoramica API (sintetica, non contrattuale)

Base URL: `/api`. Per dettagli di request/response → controller e DTO nel codice.

| Metodo | Path | Scopo |
|--------|------|-------|
| GET | `/api/ping` | Health check |
| GET | `/api/variants` | Lista varianti |
| GET | `/api/variants/{id}` | Dettaglio variante |
| POST | `/api/variants` | Crea variante |
| PUT | `/api/variants/{id}` | Aggiorna variante |
| DELETE | `/api/variants/{id}` | Elimina variante |
| GET | `/api/studies` | Lista studi (con conteggio varianti) |
| GET | `/api/studies/{id}` | Dettaglio studio + varianti |
| POST | `/api/studies` | Crea studio |
| PUT | `/api/studies/{id}` | Aggiorna studio |
| DELETE | `/api/studies/{id}` | Elimina studio (cascata sulle varianti) |
| POST | `/api/studies/{id}/variants` | Crea variante nello studio |
| POST | `/api/studies/import` | Import bulk: studio + varianti in transazione |
| POST | `/api/studies/import/lichess` | Import/upsert studio Lichess con riferimento remoto |
| POST | `/api/training-sessions` | Registra sessione di allenamento conclusa |
| GET | `/api/training-sessions` | Storico sessioni (filtri `?variantId` / `?studyId`) |
| GET | `/api/training-sessions/{id}` | Dettaglio sessione con mosse |
| GET | `/api/stats/variants/{id}` | Statistiche aggregata per variante |
| GET | `/api/stats/studies/{id}` | Statistiche aggregate per studio |
| GET | `/api/reviews/due` | Varianti dovute per spaced repetition |
| GET | `/api/reviews/variants/{id}` | Schedule SM-2 di una variante (204 se non ancora pianificata) |

**Errore di validazione strutturato (400):** `{ field, ply, branchPath, message }`.

Nota: lo spostamento di varianti tra studi (`PUT /api/variants/{id}/study`) è fuori dalla roadmap attuale.

---

## Mappa entità (overview, non campo-per-campo)

Per i campi esatti → entità JPA in `backend/src/main/java/com/scacchi/backend/`.

```
Study 1──N Variant
  Study:   id, name, description?, color (WHITE/BLACK/MIXED)?,
           createdAt, sourceProvider?, sourceStudyId?, sourceUrl?, lastImportedAt?

  Variant: id, name, color (WHITE/BLACK), moves (mainline JSON), tree (MoveNode JSON),
           startingFen, sourcePgn (text), createdAt, studyId (FK nullable)

Variant 1──N TrainingSession ──N TrainingMove
  TrainingSession: id, variantId, studyId (denormalizzato), result, mistakesCount,
                   movesCount, startedAt, completedAt, userId (nullable, inattivo)
  TrainingMove:    id, sessionId, ply, expectedSan, playedSan, correct

Variant 1──1 ReviewSchedule
  ReviewSchedule: variantId (unique), easeFactor, intervalDays, repetitions,
                  nextReviewDate, lastReviewedAt
```

- `Study → Variant`: **delete a cascata** (eliminare uno studio elimina le sue varianti).
- `Variant → TrainingSession`: cascade su `TrainingMove`.
- `MoveNode`: `{ san: string, children: MoveNode[] }` — `children[0]` è la mainline.

---

## Note su H2 e schema

- DB: `backend/data/scacchi` (file, non in-memory). Il file `scacchi.mv.db` **è committato** come database di esempio (il `.gitignore` lo ri-include con `!backend/data/*.mv.db`), così un clone ha subito dati con cui lavorare.
- **Schema gestito da Liquibase** (ISSUE-019): changelog in `backend/src/main/resources/db/changelog/`, baseline `0001-baseline.yaml`; `ddl-auto: none` (Hibernate non tocca lo schema). Su un DB nuovo il baseline crea le tabelle; sul DB di esempio esistente la precondizione `MARK_RAN` lo registra senza rieseguirlo. Convenzione changeset in [`backend/README.md`](../backend/README.md); decisioni in [`docs/specs/liquibase.md`](specs/liquibase.md).
- Storico: con il precedente `ddl-auto=update` il drift su `source_pgn` (VARCHAR(255)→text) fu corretto con ALTER manuale. Liquibase rende ora lo schema ripetibile e versionato (prerequisito per PostgreSQL).
- `open-in-view: false` → tutte le letture con collezioni LAZY richiedono `@Transactional(readOnly=true)` sul metodo di servizio.

---

## Riferimento ADR

Le decisioni architetturali sono documentate in [`docs/adr/decisioni-tecniche.md`](adr/decisioni-tecniche.md):

- ADR 0001–0003: scacchiera custom, albero mosse, SAN/JSON
- ADR 0004: chesslib (Java)
- ADR 0005: modello Studi
- ADR 0006–0008: import Lichess, parser PGN, OAuth PKCE
- ADR 0009: Stockfish client-side
- ADR 0010–0012: sessioni di allenamento, statistiche, SM-2 relearning

Per il funzionamento dettagliato della ripetizione spaziata (parametri, formule, esempi, flusso) → [`docs/sm2.md`](sm2.md).
