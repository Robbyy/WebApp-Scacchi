# Stato avanzamento lavori - WebApp Scacchi

> Fotografia operativa dello stato del progetto al **2026-06-25**.
> Fonti di riferimento: `planning-prototipi-webapp.md` (Parte 1 e Parte 2), `decisioni-tecniche.md` (ADR), e verifica locale end-to-end su frontend Angular e backend Spring Boot.
> Questo documento non sostituisce planning e ADR: riassume cosa risulta implementato e cosa manca.

---

## 1. Sintesi esecutiva

- **Parte 1 (Prototipi 0-6) + estensioni anticipate**: completa e verificata (vedi sezione 2).
- **Parte 2 pianificata**: roadmap P7-P17 + sezioni TODO/idee, descritta nel planning (sezioni 11-19). Fasi: A consolidamento, B studi, C import PGN, D apprendimento, E motore Stockfish.
- **Parte 2 implementata finora**: **P7-P10** (fase A · consolidamento completata) + **P11** (modello Studi backend). Prossimo: **P12** (UI Studi + audio mosse).

Alla verifica del 2026-06-25:

- `git status --short` pulito;
- backend attivo su `http://localhost:8080`, frontend su `http://localhost:4200`;
- **test backend: 38 passati**; **test frontend: 72 passati**;
- checklist manuale E2E formalizzata in `checklist-e2e.md`;
- verifiche browser dei flussi principali senza errori console.

Ultimi commit rilevanti: `050f86c` (P8), `fa90ef7` (P9), `793d867` (P10); P11 nel commit corrente.

Il repository resta strutturato con due progetti separati: `backend/` (Spring Boot + Maven + H2/JPA) e `frontend/` (Angular + npm + `chess.js`).

---

## 2. Stato Parte 1 (Prototipi 0-6) e estensioni

Tutti completati e verificati. Sintesi:

| # | Prototipo | Stato | Note |
|---|-----------|-------|------|
| 0 | Scaffolding & hello-world | ✅ | `GET /api/ping`, proxy, CORS, H2 **su file** (`backend/data/`) |
| 1 | Scacchiera renderizzata | ✅ | Componente custom + `chess.js`, pezzi SVG Staunton, click **e** drag-and-drop, promozione |
| 2 | Variante visualizzata | ✅ | Lista/dettaglio, replay, navigazione tastiera (superato dalla persistenza) |
| 3 | Training loop | ✅ | Validazione lato client, supporto rami multipli |
| 4 | Persistenza CRUD (H2) | ✅ | `GET/POST/PUT/DELETE`, seed iniziale, converter JSON |
| 5 | Editor mossa-per-mossa | ✅ | Creazione/modifica da scacchiera; alberi |
| 6 | Import PGN base | ✅ | Parsing client `chess.js`, `sourcePgn` su colonna `text` |

**Estensioni anticipate** (ora consolidate in Parte 2): modifica varianti (`PUT`), modello ad albero `MoveNode` (`children[0]` = mainline), training su rami, scacchiera evoluta (read-only/controlled, orientamento, promozione).

---

## 3. Parte 2 — avanzamento

### Prototipo 7 — Validazione scacchistica backend + fix scacchiera ✅

**Backend (R13):**
- Integrata libreria **`chesslib`** via **JitPack** (non su Maven Central) come motore di regole (ADR 0004).
- `VariantValidator`: valida la legalità di mainline e, ricorsivamente, di ogni ramo dell'albero dalla posizione iniziale. Nota: `loadFromSan` di chesslib non verifica la legalità, quindi si controlla con `board.legalMoves().contains(move)`.
- `POST`/`PUT` rifiutano payload illegali con **400 strutturato** (`field`, `ply`, `branchPath`, `message`) via `@ExceptionHandler`.

**Frontend:**
- Drag che trascina **solo il pezzo** (niente sfondo della casa).
- Casa di partenza **vuota durante il trascinamento** (il pezzo si "solleva").
- **Cornice della scacchiera più stretta** (padding 5px, gutter 1.25rem).
- Editor e import PGN mostrano il **messaggio di validazione** del backend sul 400.

**Verifica:** API testata (`e4,e4` → 400 ply 2; ramo `Xx9` → 400 branchPath `[0,1]`; legale → 201); fix drag e cornice verificati live. Test backend 24, frontend 43 (al termine di P7).

### Prototipo 8 — Consolidamento del modello ad albero ✅

- `promoteToMainline(tree, path)`: riordina i `children` lungo il percorso così che la linea scelta diventi `children[0]` a ogni livello.
- Editor: pulsante **"Rendi mainline"** (promuove la variante corrente), **conferma prima di cancellare un sottoalbero**, **indicatore di ramo** (mainline/variante + SAN della linea).
- Backend: test di **round-trip** `tree → DB → DTO` con rami multipli/profondi; test che ribadisce il vincolo `children[0] = mainline`.
- Docs: **ADR 0002** aggiornato con lo stato di consolidamento.

**Verifica:** promozione, conferma cancellazione e annulla verificati live. Test backend 26, frontend 46 (al termine di P8).

### Prototipo 9 — Robustezza interazioni e azioni distruttive ✅

- **Dialog di conferma riusabile** (`ConfirmService` + `ConfirmDialog`, `ask()` → `Promise<boolean>`, montato a livello app).
- **Toast/snackbar globale** (`ToastService` + `ToastHost`, success/error/info con auto-dismiss).
- Lista: eliminazione variante con **conferma** + toast esito; pulsante disabilitato durante la chiamata.
- Editor: flag `dirty` + **guard `canDeactivate`** che avvisa delle modifiche non salvate; toast su salvataggio.
- Import PGN: toast su salvataggio.
- Backend: nessuna modifica necessaria (P7 fornisce già messaggi strutturati).

**Verifica:** dialog di eliminazione, guard "modifiche non salvate" (blocco + uscita) e toast "Variante eliminata." verificati live, zero errori console. Test backend 26, frontend **49**.

### Prototipo 10 — Suite test automatici + checklist E2E ✅ (chiude la fase A)

- Backend: test aggiuntivo che il `PUT` rifiuta una mossa illegale (`400` con `field`/`ply`).
- Frontend: nuovo `move-tree.spec.ts` con test unit delle utilità dell'albero (mainline, `addChild`/`removeNode`, `promoteToMainline`, `isOnMainline`, `lineSans`, `fenAt`, `buildTokens`, `remainingMainline`).
- Documentazione: **`checklist-e2e.md`** — checklist manuale ripetibile (18 flussi: 12 core + 6 Parte 2) con sezione di copertura automatica; runner E2E browser (Playwright/Cypress) **rinviato** per non introdurre tooling pesante ora.

**Esito:** test backend **27**, frontend **67**, tutti verdi. Fase A · consolidamento **completata**.

### Prototipo 11 — Modello Studi (backend) ✅ (apre la fase B)

- Entità **`Study`** (`id`, `name`, `description?`, `color?` WHITE/BLACK/**MIXED**, `createdAt`) nel nuovo package `study`.
- Relazione **1-N** `Study → Variant` tramite colonna `study_id` **nullable** sulla `Variant` (FK); `VariantDto` espone `studyId`.
- `StudyRepository`/`StudyService`/`StudyController`: CRUD completo (`GET` lista con `variantCount` / dettaglio con `variants`, `POST`, `PUT`, `DELETE`); payload invalido → `400` (`ValidationError`, via `InvalidStudyException`).
- **Cancellazione a cascata (R14):** `StudyService.delete` (`@Transactional`) elimina prima le varianti dello studio, poi lo studio; nessuna riassegnazione.
- **Studio di default "Repertorio":** `StudyDataInitializer` (`@Order(2)`, dopo le varianti) lo crea e vi aggancia in modo idempotente le varianti legacy senza studio.
- Frontend (no UI ancora): modello `Study`/`CreateStudyRequest` e `StudyService` (CRUD). Decisione in **ADR 0005**.

**Verifica:** test backend **38** (+11: `StudyControllerTest` — CRUD, dettaglio con varianti, cascata), frontend **72** (+5: `study.service.spec`).

### Prototipi 12-17 — da fare

- **P12** UI Studi (lista/dettaglio, crea/elimina studio e varianti) + audio mosse.
- **P13** Import PGN avanzato (varianti annidate → `tree`).
- **P14-P16** Persistenza sessioni → statistiche → spaced repetition.
- **P17** Integrazione Stockfish (toggle motore, barra valutazione, gioca-vs-computer in nuova tab; mai in allenamento).

---

## 4. Verifiche eseguite

### Backend
Comando: `.\mvnw.cmd test` (con `MAVEN_OPTS=-Djavax.net.ssl.trustStoreType=Windows-ROOT`).
Esito: **38 test passati**. Copertura: contesto Spring, ping, repository varianti, controller varianti (CRUD + validazione legalità su `POST` e `PUT` + round-trip albero), `MoveNode`, `VariantValidator`, **controller studi (CRUD, dettaglio con varianti, cancellazione a cascata)**.

### Frontend
Comando: `npm test -- --watch=false` (fuori sandbox per evitare `spawn EPERM` su esbuild).
Esito: **72 test passati** (9 file), incluse le utilità `move-tree` e il **`StudyService`**.

### Checklist manuale E2E
`checklist-e2e.md` — 18 flussi ripetibili (creazione, lista, dettaglio, replay, training, rami, import PGN, eliminazione + validazione/drag/promozione/conferme/guard/toast della Parte 2).

### Verifiche browser (live)
Lista, dettaglio, training, editor (rami, promozione, conferma cancellazione, guard modifiche non salvate), import PGN, dialog di conferma e toast: tutti senza errori console.

---

## 5. Cosa manca — approfondimento (aggiornato)

### 5.1 Validazione mosse/albero lato backend — ✅ RISOLTO (P7)
La legalità di mainline e albero è ora validata lato server con `chesslib`; errori `400` strutturati. Resta fuori la validazione "semantica" (qualità della linea), non prevista.

### 5.2 Consolidamento modello ad albero — ✅ in gran parte (P8)
Vincolo `children[0] = mainline` ufficiale e testato; round-trip garantito; promozione a mainline e protezione cancellazione sottoalbero implementate. Restano: import/export PGN ramificato (P13 / TODO export) e UX avanzata ulteriore.

### 5.3 Import PGN oltre la linea principale — ⏳ pianificato (P13)
Varianti annidate, commenti, NAG. Export PGN spostato a TODO (sezione 19 del planning).

### 5.4 UX e sicurezza azioni distruttive — ✅ RISOLTO (P9)
Conferma su elimina variante e su elimina sottoalbero; guard modifiche non salvate; feedback errori via toast; stati loading/saving. Resta margine per skeleton di caricamento ed empty-state curati (proposte UX sezione 17 del planning).

### 5.5 Test E2E formalizzati — ✅ in gran parte (P10)
Suite automatica ampliata (backend 27, frontend 67, incluse le utilità `move-tree`) e **checklist manuale** in `checklist-e2e.md`. Resta rinviato il solo runner E2E browser (Playwright/Cypress).

### 5.6 Responsive e qualità visiva — ⏳ proposte da validare
Il difetto responsive principale (board fissa a 720px tra ~800-1280px, pannello sotto la piega) e le altre proposte grafiche sono in **sezione 17 del planning**, subordinate a validazione dell'utente (non nei rilasci).

### 5.7 Persistenza e migrazioni — invariato
H2 su file in sviluppo. Migrazioni versionate (Liquibase) e Supabase restano gli **ultimissimi passi** (terza tornata, sezione 18 del planning).

### 5.8 Studi / raggruppamento varianti — ✅ backend (P11), UI in P12
Entità `Study` 1-N con `Variant`, **cancellazione a cascata** e studio di default "Repertorio" implementati e testati nel backend (ADR 0005); modello e `StudyService` lato frontend pronti. Resta la **UI** (lista/dettaglio, crea/elimina studio e varianti) → P12.

### 5.9 Post-MVP ancora fuori
Spaced repetition (P16) e statistiche (P15) sono pianificate; multiutente, Supabase Auth, Supabase PostgreSQL, Docker restano per la terza tornata.

---

## 6. Rischi aggiornati

| ID | Rischio | Stato |
|----|---------|-------|
| R1/R12 | Rendering scacchiera | Chiuso (board custom + chess.js; click/drag/promozione) |
| R2 | Rappresentazione mosse | Gestito (SAN + `tree` JSON; mainline derivata) |
| R3 | Validazione mosse legali (backend) | **Chiuso (P7)**: validazione server con chesslib |
| R11 | Modello ad albero | **Consolidato (P8)**: vincolo ufficiale, round-trip, promozione, protezione delete |
| R13 | Libreria scacchi Java | Chiuso: `chesslib` via JitPack (ADR 0004) |
| R14 | Modello Studi / cancellazione | **Chiuso lato backend (P11)**: entità, FK `study_id`, delete a cascata, studio di default (ADR 0005); UI in P12 |
| R15 | Import PGN ramificato | Aperto → P13 |
| R16 | Responsive scacchiera | Aperto (proposta UX da validare) |
| R8/R9/R10 | Supabase DB / Auth / Docker | Rinviati (terza tornata) |

---

## 7. Prossimi passi consigliati

1. **P12** — **UI Studi** (lista/dettaglio, crea/elimina studio e varianti) + audio mosse, sul modello degli *studies* di Lichess.
2. **P13** — import PGN avanzato (varianti annidate).
3. Proseguire con apprendimento (P14-P16) e infine **Stockfish (P17)**.
4. Quando opportuno, sottoporre all'utente le **proposte grafiche** (sezione 17 del planning), a partire dal fix responsive della scacchiera.

---

## 8. Stato finale

La webapp ha completato la Parte 1, l'intera **fase A di consolidamento della Parte 2** e il **primo passo della fase B · Studi** (P11): il backend valida la legalità delle mosse, il modello ad albero è consolidato (promozione, protezione, round-trip), le interazioni distruttive sono protette (conferme, toast, guard), gli **Studi** vivono in DB con CRUD e **cancellazione a cascata** (studio di default "Repertorio"), e i flussi sono coperti da test automatici (backend 38, frontend 72) più una checklist E2E ripetibile. Il progetto è pronto per **P12 · UI Studi**.
