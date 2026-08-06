# Stato corrente — WebApp Scacchi

> Aggiornato al: **2026-08-07** (suite test verificata; fine Parte 2, P0–P19; + ISSUE-019 Liquibase; + ISSUE-016 modello a fasi; + ISSUE-021 navigazione a tre sezioni; + ISSUE-022/ISSUE-007 linea migliore del motore; + R22 ISSUE-011/012/009 ciclo di vita dello studio; OAuth R22 operativo; mini-specifica R23 formalizzata).
> Non è un diario cronologico. La storia per-prototipo è in `docs/archive/stato-avanzamento-2026-06-28.md` e nel git log.

---

## Sintesi

La webapp è funzionante in locale. **Parte 1 (P0–P6) e Parte 2 (P7–P19) completate e verificate.**
Suite automatica verde: backend **84 test**, frontend **249 test**.
La **terza tornata** (infrastruttura) è iniziata: **Liquibase** in place (ISSUE-019); restano Supabase PostgreSQL, Supabase Auth, Docker, CI/CD.
In parallelo è stata chiusa la prima slice OpenSpec per estendere l'app oltre le Aperture: **ISSUE-016 (`issue-016-phase-domain-model`)** introduce `Study.phase` (`OPENING`/`MIDDLEGAME`/`ENDGAME`), immutabile dopo la creazione — vedi [ADR 0014](adr/decisioni-tecniche.md).

---

## Funzionalità implementate

- **Scacchiera custom** Angular/CSS/SVG con pezzi Staunton: click, drag-and-drop, promozione, audio mosse (asset Lichess), barra di valutazione Stockfish.
- **Varianti e studi**: CRUD completo, albero mosse `MoveNode` (`children[0]` = mainline), editor mossa per mossa, promozione a mainline, import PGN con varianti annidate. Da R22 i metadati dello studio (nome/descrizione/colore) sono modificabili con form inline nel dettaglio (ISSUE-012); la fase resta immutabile.
- **Import e sync Lichess**: link studio/capitolo pubblico, OAuth PKCE per studi privati/unlisted, re-import come upsert (varianti sostituite, metadati locali preservati).
- **Ciclo di vita dello studio (R22, ISSUE-011/012/009)**: pagina unica `/studies/new` che sostituisce form inline della home e pagina import Lichess — senza link crea uno studio vuoto, con link fa anteprima/import (upsert incluso), con `?studyId` aggiunge una variante per capitolo a uno studio esistente verificato. Comando compatto Connetti/Disconnetti Lichess nella topbar (bozza del form in `sessionStorage`, ripristinata al ritorno dall'OAuth); home su griglia adattiva a massimo due colonne (card ≥320px).
- **Training loop**: allenamento su scacchiera con supporto rami multipli, validazione scacchistica backend (chesslib), registrazione sessione (mosse, errori, esito).
- **Motore Stockfish client-side**: toggle unico nel dettaglio/editor che governa anche la barra di valutazione (ISSUE-007, R21), «Gioca contro il computer» in nuova tab. Mai disponibile in allenamento.
- **Linea migliore del motore (ISSUE-022, R21)**: nel **solo dettaglio variante**, il pannello motore laterale mostra la Principal Variation di Stockfish in SAN e numerata dalla posizione analizzata, aggiornata a ogni profondità; «Analisi in corso…» finché manca la PV, nessuna linea obsoleta al cambio di posizione. Spegnendo il motore `stop()` svuota valutazione e linea e ignora le righe `info` tardive del worker finché non parte una nuova analisi. Editor, allenamento e «Gioca contro il computer» restano esclusi.
- **Statistiche**: aggregazioni per variante e studio (allenamenti, completati, precisione %, mosse più sbagliate).
- **Spaced repetition SM-2**: scheduling dopo ogni allenamento, vista «Ripeti oggi», indicatore prossima ripetizione nel dettaglio variante.
- **Navigazione a tre sezioni (ISSUE-021, R20)**: tab-link **Aperture** (`/`), **Mediogioco** (`/middlegame`) e **Finale** (`/endgame`) nella topbar, dentro una `<nav aria-label="Sezione di studio">` con `aria-current="page"` sulla sezione attiva (derivata dall'URL: le pagine di dettaglio delle Aperture mantengono acceso il tab Aperture). Mediogioco e Finale montano il segnaposto riusabile `sections/coming-soon` («In fase di implementazione»); i contenuti reali arrivano con le slice di ISSUE-016.
- **Modello a fasi di gioco (ISSUE-016)**: ogni studio ha una `phase` (`OPENING`/`MIDDLEGAME`/`ENDGAME`), scelta alla creazione e immutabile. `Variant` resta l'elemento figlio comune (variante/capitolo in `OPENING`, posizione creata manualmente in `MIDDLEGAME`/`ENDGAME`). Import/sync Lichess, training, review SM-2 e statistiche restano applicati solo alle Aperture; per le altre fasi il backend rifiuta la richiesta (non solo nascondimento in UI).

---

## Backend attuale

- **Stack**: Java 21 · Spring Boot 4.1.0 · Maven · JPA/Hibernate · H2 file (`backend/data/scacchi`) · chesslib (JitPack).
- **Package**: `ping`, `variant`, `study`, `training`, `stats`, `review`.
- **Test**: 84 verdi (`mvnw.cmd test`). Copertura: CRUD varianti/studi, validazione legalità, round-trip albero, import bulk/upsert Lichess, sessioni, statistiche, SM-2, fasi di gioco (ISSUE-016).
- **Avvio locale**: `mvnw.cmd spring-boot:run` (PowerShell; impostare `MAVEN_OPTS=-Djavax.net.ssl.trustStoreType=Windows-ROOT`).

---

## Frontend attuale

- **Stack**: Angular 22 · TypeScript · Vitest · componenti standalone · signals · OnPush · chess.js · Stockfish asm.js.
- **Aree**: `chessboard`, `variants`, `studies`, `stats`, `reviews`, `play`, `sections`, `core`.
- **Routing**: `/` → lista studi (Aperture), `/studies/new` → creazione/import studio (ISSUE-011; dichiarata prima della route dinamica, la storica `/studies/import-lichess` vi reindirizza preservando i query param), `/studies/:id` → dettaglio studio, `/variants/:id` → dettaglio variante, `/variants/:id/training`, `/variants/:id/stats`, `/studies/:id/stats`, `/reviews`, `/play`, `/middlegame` e `/endgame` → segnaposto di sezione (ISSUE-021).
- **Test**: 249 verdi (`npm test -- --watch=false`, Vitest headless).
- **Avvio locale**: `npm start` (frontend su `http://localhost:4200`, con proxy verso `http://localhost:8080`).

---

## Verifiche live e checklist manuale

Verifiche browser superate senza errori console: training, editor, import PGN ramificato, import/sync Lichess (studio pubblico reale `OR3CU5Je`) + OAuth, Stockfish e gioca-vs-computer, sessioni, statistiche, spaced repetition. Per R22: pagina `/studies/new` (creazione, anteprima, import, `?studyId`, errori dedicati, bozza OAuth), modifica inline e griglia verificate live su mock backend a 1440/1024/768/320/280px. Il flusso OAuth end-to-end con account Lichess reale è considerato operativo nella verifica corrente; la precedente risposta 401 era legata alla rete di sviluppo.

Checklist E2E ripetibile: [`docs/checklist-e2e.md`](checklist-e2e.md) — **41 flussi** (12 core + 25 Parte 2 + 1 evolutivo R21 + 3 evolutivi R22).

---

## Problemi noti

Nessun bug bloccante attivo. **Policy DB**: finché non si migra a Supabase, il file `backend/data/scacchi.mv.db` **è versionato su Git** (il `.gitignore` lo ri-include di proposito) ed è la fonte dei dati del repertorio condivisa tra le postazioni; va committato dopo modifiche a repertorio o schema.

---

## Aree delicate

| Area | Dettaglio |
|------|-----------|
| **Schema via Liquibase** | Lo schema è gestito da **Liquibase** (ISSUE-019), `ddl-auto: none`. Le modifiche allo schema vanno fatte con un nuovo changeset in `db/changelog/changes/` (mai modificare il baseline rilasciato). Storico: il vecchio `ddl-auto=update` causò drift su `source_pgn`, ora prevenuto. |
| **LAZY loading** | `open-in-view: false` — tutte le letture che toccano collezioni LAZY richiedono `@Transactional(readOnly=true)` sul metodo di servizio. |
| **Stockfish mai in allenamento** | Vincolo costruttivo: `variant-training` non importa `StockfishService` né `EvalBar`. Non indebolire questa separazione. |
| **`userId` inattivo** | Predisposto nullable su `TrainingSession` e `ReviewSchedule`. Inattivo finché non arriva Supabase Auth. |
| **Responsive scacchiera** | Board fissa a 720px tra ~800–1280px: il pannello scende sotto la piega su laptop. Proposta UX in archivio (planning §17), da validare prima di modificare. Nota R21: intorno ai ~750px la barra di valutazione affiancata fa sforare la pagina di pochi px, e dopo ISSUE-007 non è più nascondibile a mano; è la stessa larghezza fissa della board, non il pannello motore (la linea migliore va a capo e non sfora a nessuna larghezza). |
| **`Study.phase` immutabile** | Scelta alla creazione, non modificabile (ISSUE-016): un update con una `phase` diversa da quella persistita viene rifiutato (400). `GET /api/stats/studies/{id}` e `GET /api/stats/variants/{id}` rispondono `404` per studi/varianti non `OPENING` (le statistiche di training non vanno presentate come statistiche di posizione). |

---

## Non ancora implementato

- Supabase PostgreSQL e Supabase Auth.
- Attivazione multiutente (`userId`).
- Docker e CI/CD.
- Export PGN.
- Import file `.pgn` locale.
- Spostamento varianti tra studi.
- Sync Lichess periodica.
- Runner E2E browser (Playwright/Cypress) — rinviato alla terza tornata.
- Editor manuale di posizione e input/UI per FEN custom (Mediogioco/Finale) — prossima change `issue-016-custom-starting-fen`.
- Viste/sezioni complete Mediogioco e Finale (oggi solo il segnaposto di ISSUE-021), commenti alle mosse, gioco contro il motore da una posizione salvata, tag/categorie — change successive a ISSUE-016 (vedi `docs/roadmap.md`).
- Multi-PV (più linee del motore), frecce/highlight della PV sulla scacchiera e click sulla linea per eseguirla — esplicitamente fuori dal perimetro di ISSUE-022.

---

## Prossima fase

Il prossimo incremento di prodotto è **R23** (ISSUE-010 + ISSUE-008). La
[mini-specifica R23](backlog/manutenzione-evolutiva.md#mini-specifica-r23--issue-010--issue-008)
è formalizzata: pannello varianti adattivo (rail solo da 1500px, drawer alle altre
larghezze e nell'editor), guard esplicito al cambio variante, reazione al cambio di route,
preservazione del pannello motore e rimozione di Auto-play. Non richiede backend o database.

La terza tornata infrastrutturale prosegue poi in quest'ordine:

1. ~~**Liquibase** — migrazioni versionate~~ ✓ fatto (ISSUE-019): schema gestito da Liquibase, baseline in `db/changelog/`.
2. **Supabase PostgreSQL** — migrazione da H2 (il changelog Liquibase usa tipi astratti, portabili).
3. **Supabase Auth + `userId`** — multiutente.
4. **Docker** — containerizzazione FE/BE.
5. **CI/CD** — e rivalutare un runner E2E browser.

Per la roadmap completa con backlog e idee future → [`docs/roadmap.md`](roadmap.md).
