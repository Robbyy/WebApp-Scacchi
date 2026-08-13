# Stato corrente — WebApp Scacchi

> Aggiornato al: **2026-08-13** (suite test verificata; fine Parte 2, P0–P19; + ISSUE-019 Liquibase; + ISSUE-016 modello a fasi; + ISSUE-021 navigazione a tre sezioni; + ISSUE-022/ISSUE-007 linea migliore del motore; + R22 ISSUE-011/012/009 ciclo di vita dello studio; OAuth R22 operativo; + R23 ISSUE-010/008 rilasciata; + R24 ISSUE-013/`issue-016-move-comments` rilasciata; + R25 rilasciata; + R26 Mediogioco implementata e verificata con E2E 53–58).
> Non è un diario cronologico. La storia per-prototipo è in `docs/archive/stato-avanzamento-2026-06-28.md` e nel git log.

---

## Sintesi

La webapp è funzionante in locale. **Parte 1 (P0–P6) e Parte 2 (P7–P19) completate e verificate.**
Suite automatica verde: backend **120 test**, frontend **446 test**.
La **terza tornata** (infrastruttura) è iniziata: **Liquibase** in place (ISSUE-019); restano Supabase PostgreSQL, Supabase Auth, Docker, CI/CD.
In parallelo è stata chiusa la prima slice OpenSpec per estendere l'app oltre le Aperture: **ISSUE-016 (`issue-016-phase-domain-model`)** introduce `Study.phase` (`OPENING`/`MIDDLEGAME`/`ENDGAME`), immutabile dopo la creazione — vedi [ADR 0014](adr/decisioni-tecniche.md).

---

## Funzionalità implementate

- **Scacchiera custom** Angular/CSS/SVG con pezzi Staunton: click, drag-and-drop, promozione, audio mosse (asset Lichess), barra di valutazione Stockfish.
- **Varianti e studi**: CRUD completo, albero mosse `MoveNode` (`children[0]` = mainline), editor mossa per mossa, promozione a mainline, import PGN con varianti annidate. Da R22 i metadati dello studio (nome/descrizione/colore) sono modificabili con form inline nel dettaglio (ISSUE-012); la fase resta immutabile.
- **Import e sync Lichess**: link studio/capitolo pubblico, OAuth PKCE per studi privati/unlisted, re-import come upsert (varianti sostituite, metadati locali preservati).
- **Ciclo di vita dello studio (R22, ISSUE-011/012/009)**: pagina unica `/studies/new` che sostituisce form inline della home e pagina import Lichess — senza link crea uno studio vuoto, con link fa anteprima/import (upsert incluso), con `?studyId` aggiunge una variante per capitolo a uno studio esistente verificato. Comando compatto Connetti/Disconnetti Lichess nella topbar (bozza del form in `sessionStorage`, ripristinata al ritorno dall'OAuth); home su griglia adattiva a massimo due colonne (card ≥320px).
- **Navigazione tra varianti (R23, ISSUE-010)**: dal dettaglio (e dall'editor) si passa a un'altra variante dello stesso studio senza tornare al dettaglio studio. Componente riusabile `study-variant-nav` (`<nav aria-label="Varianti dello studio">`, voci con nome/colore/numero mosse, `aria-current="page"` sulla corrente): **rail** a colonna solo da **1500px** nel dettaglio, **drawer** a sovrapposizione alle altre larghezze e sempre nell'editor (focus iniziale sulla chiusura, `Esc`, chiusura automatica dopo la navigazione). Il pannello non compare per varianti legacy senza studio, per studi con una sola variante o se la variante non è nella risposta dello studio. Nessuna nuova API: i dati arrivano dal `GET /api/studies/{id}` già usato per la fase. Il cambio rapido usa una pipeline cancellabile e l'editor riavvia il motore anche a FEN invariata.
- **Replay senza Auto-play (R23, ISSUE-008)**: il dettaglio variante ha quattro controlli omogenei — inizio, precedente, successiva, fine — più le frecce `←/→` da tastiera. Riproduzione automatica, timer e pulsante Pausa rimossi.
- **Azioni e annotazioni per mossa (R24, ISSUE-013 + `issue-016-move-comments`)**: nel pannello «Mosse & varianti» dell'editor ogni mossa ha un pulsante azioni `⋮` (raggiungibile anche col tasto destro) con «Annota la mossa», «Promuovi a mainline» (solo per una sotto-variante) ed «Elimina mossa»; il click sinistro resta navigazione. Il menu usa ↑/↓ e `Home`/`End` e, dopo una promozione, il focus passa al pulsante della mossa promossa nel tree riordinato. `MoveNode` porta due campi opzionali — `comment` (testo semplice, max 1.000 caratteri) e `nag` (uno solo fra `!`, `?`, `!!`, `??`, `!?`, `?!`) — persistiti nello stesso JSON dell'albero: nessuna migration, nessun endpoint nuovo, JSON pre-R24 leggibili e alberi non annotati serializzati identici a prima. NAG accanto al SAN e commento come nota sotto la mossa, anche in sola lettura nel dettaglio. Il parser PGN/Lichess **non** è stato esteso: commenti e NAG presenti nell'input restano accettati e scartati.
- **Training loop**: allenamento su scacchiera con supporto rami multipli, validazione scacchistica backend (chesslib), registrazione sessione (mosse, errori, esito).
- **Motore Stockfish client-side**: toggle unico nel dettaglio/editor che governa anche la barra di valutazione (ISSUE-007, R21), «Gioca contro il computer» in nuova tab. Mai disponibile in allenamento.
- **Linea migliore del motore (ISSUE-022, R21)**: nel **solo dettaglio variante**, il pannello motore laterale mostra la Principal Variation di Stockfish in SAN e numerata dalla posizione analizzata, aggiornata a ogni profondità; «Analisi in corso…» finché manca la PV, nessuna linea obsoleta al cambio di posizione. Spegnendo il motore `stop()` svuota valutazione e linea e ignora le righe `info` tardive del worker finché non parte una nuova analisi. Cambiando variante col motore acceso (R23) il toggle resta acceso ma l'analisi riparte dalla FEN iniziale della nuova variante, svuotando valutazione e PV. Editor, allenamento e «Gioca contro il computer» restano esclusi.
- **Statistiche**: aggregazioni per variante e studio (allenamenti, completati, precisione %, mosse più sbagliate).
- **Spaced repetition SM-2**: scheduling dopo ogni allenamento, vista «Ripeti oggi», indicatore prossima ripetizione nel dettaglio variante.
- **Navigazione a tre sezioni (ISSUE-021, R20; R26)**: tab-link **Aperture** (`/`), **Mediogioco** (`/middlegame`) e **Finale** (`/endgame`) nella topbar, dentro una `<nav aria-label="Sezione di studio">` con `aria-current="page"` sulla sezione attiva e sulle relative route figlie. Da R26 Mediogioco è una sezione reale; Finale conserva il segnaposto riusabile `sections/coming-soon` fino a R27.
- **Modello a fasi di gioco (ISSUE-016)**: ogni studio ha una `phase` (`OPENING`/`MIDDLEGAME`/`ENDGAME`), scelta alla creazione e immutabile. `Variant` resta l'elemento figlio comune (variante/capitolo in `OPENING`, posizione creata manualmente in `MIDDLEGAME`/`ENDGAME`). Import/sync Lichess, training, review SM-2 e statistiche restano applicati solo alle Aperture; per le altre fasi il backend rifiuta la richiesta (non solo nascondimento in UI).
- **Posizioni manuali (R25, `issue-016-custom-starting-fen`)**: editor visuale per piazzamento/rimozione pezzi, lato al tratto, arrocco ed en-passant; generazione e normalizzazione della FEN, associazione allo studio, salvataggio anche senza mosse e validazione backend della posizione e dell'albero dalla FEN scelta. I task 6.1–6.3 e i flussi E2E 49–52 sono chiusi: FEN mancante/vuota rifiutata, accesso diretto all'editor dell'albero e terminologia/navigazione posizionale completati.
- **Mediogioco reale (R26, `issue-016-middlegame-section`)**: `/middlegame` filtra gli studi `MIDDLEGAME` e offre lista, creazione manuale, modifica ed eliminazione; il dettaglio gestisce l'elenco e il CRUD delle posizioni. Setup FEN, editor dell'albero, dettaglio con replay/annotazioni, navigazione fra posizioni e analisi Stockfish riusano i componenti stabilizzati in R25/R23/R24 con percorsi canonici di sezione. La fase viene verificata prima di mostrare o rendere modificabile un contenuto. Import/sync Lichess, training, statistiche, review/SM-2 e gioco contro Stockfish dalla posizione non sono esposti. Finale resta pianificato in R27.

---

## Backend attuale

- **Stack**: Java 21 · Spring Boot 4.1.0 · Maven · JPA/Hibernate · H2 file (`backend/data/scacchi`) · chesslib (JitPack).
- **Package**: `ping`, `variant`, `study`, `training`, `stats`, `review`.
- **Test**: 120 verdi (`mvnw.cmd test`). Copertura: CRUD varianti/studi, validazione legalità, FEN custom e albero dalla posizione iniziale effettiva (R25), round-trip albero, annotazioni delle mosse (R24: serializzazione, JSON legacy, rifiuto di commento oltre il limite e NAG fuori insieme), import bulk/upsert Lichess, sessioni, statistiche, SM-2, fasi di gioco (ISSUE-016).
- **Avvio locale**: `mvnw.cmd spring-boot:run` (PowerShell; impostare `MAVEN_OPTS=-Djavax.net.ssl.trustStoreType=Windows-ROOT`).

---

## Frontend attuale

- **Stack**: Angular 22 · TypeScript · Vitest · componenti standalone · signals · OnPush · chess.js · Stockfish asm.js.
- **Aree**: `chessboard`, `variants`, `positions`, `studies`, `stats`, `reviews`, `play`, `sections`, `core`.
- **Routing**: `/` → lista studi Aperture; `/studies/new`, `/studies/:id`, `/variants/:id`, training/statistiche/review e `/play` conservano i flussi delle Aperture. La sezione R26 usa `/middlegame`, `/middlegame/studies/new`, `/middlegame/studies/:id`, `/middlegame/positions/new?studyId={id}`, `/middlegame/positions/:id/setup`, `/middlegame/positions/:id/edit` e `/middlegame/positions/:id`; `/endgame` resta sul segnaposto di R20 in attesa di R27.
- **Test**: 446 verdi (`npm test -- --watch=false`, Vitest headless), inclusi routing e contesto R26, filtro per fase, CRUD studi/posizioni, verifica della fase prima della presentazione o modifica, percorsi canonici, confini delle funzioni riservate alle Aperture e regressioni dei componenti condivisi.
- **Avvio locale**: `npm start` (frontend su `http://localhost:4200`, con proxy verso `http://localhost:8080`).

---

## Verifiche live e checklist manuale

Verifiche browser superate senza errori console: training, editor, import PGN ramificato, import/sync Lichess (studio pubblico reale `OR3CU5Je`) + OAuth, Stockfish e gioca-vs-computer, sessioni, statistiche, spaced repetition. Per R22: pagina `/studies/new` (creazione, anteprima, import, `?studyId`, errori dedicati, bozza OAuth), modifica inline e griglia verificate live su mock backend a 1440/1024/768/320/280px. Il flusso OAuth end-to-end con account Lichess reale è considerato operativo nella verifica corrente; la precedente risposta 401 era legata alla rete di sviluppo. Per R23: rail/drawer varianti, cambio variante dal dettaglio e dall'editor (pulito e con modifiche pendenti), riavvio dell'analisi col motore acceso e assenza di Auto-play verificati live sull'app reale a 1600/1440/1024/768/375/320px, senza overflow orizzontale e con la scacchiera invariata. Per R24: menu azioni (pulsante e tasto destro), dialog di annotazione, promozione ed eliminazione foglia/sottoalbero, lettura in sola lettura nel dettaglio e rifiuto backend dei metadati non validi verificati alle stesse sei larghezze su una variante reale di 48 nodi — su una **copia** del DB H2 in cartella temporanea, per non toccare la snapshot condivisa. Per R25: flussi 49–52 verificati il 2026-08-13 su H2 file temporaneo; creati e poi rimossi studi/posizioni di test, verificati FEN con arrocco/en-passant, albero legale e rifiuto atomico, rifiuti di configurazioni illegali, compatibilità Aperture e terminologia posizionale. Per R26: flussi 53–58 verificati su H2 file temporaneo isolato a 1600/1440/1024/768/375/320px; completati CRUD di studi e posizioni, FEN e albero vuoto/completo, navigazione sorelle, rifiuto di una fase errata, assenza delle azioni fuori scope, responsive e regressione Aperture. Il database persistente non è stato usato.

Checklist E2E ripetibile: [`docs/checklist-e2e.md`](checklist-e2e.md) — **59 flussi** (12 core + 25 Parte 2 + 1 evolutivo R21 + 3 evolutivi R22 + 4 evolutivi R23 + 4 evolutivi R24 + 4 flussi R25 + 6 flussi R26 verificati).

---

## Problemi noti

Nella versione R26 implementata e verificata non risultano bug bloccanti applicativi. R23 ha chiuso i due P1 il 2026-08-10; restano come debito tecnico la race UCI di ISSUE-022 e il ritorno del focus al pulsante «Varianti» alla chiusura del drawer. La build R26 riesce con cinque avvisi di budget CSS/bundle già censiti; non sono errori di compilazione. **Policy DB**: finché non si migra a Supabase, il file `backend/data/scacchi.mv.db` **è versionato su Git** (il `.gitignore` lo ri-include di proposito) ed è la fonte dei dati del repertorio condivisa tra le postazioni; va committato dopo modifiche a repertorio o schema. Dopo l'audit R26 un processo Spring Boot ha aperto la risorsa e il working tree la segnala modificata (90112 byte, SHA-256 `9AECC00B8E0E7539FFB27C9311D968F80DD0458FF393F6F3871170CA4C8F5FBD`); il file resta escluso dallo staging e il ripristino al contenuto versionato è sospeso in attesa di autorizzazione esplicita.

---

## Aree delicate

| Area | Dettaglio |
|------|-----------|
| **Schema via Liquibase** | Lo schema è gestito da **Liquibase** (ISSUE-019), `ddl-auto: none`. Le modifiche allo schema vanno fatte con un nuovo changeset in `db/changelog/changes/` (mai modificare il baseline rilasciato). Storico: il vecchio `ddl-auto=update` causò drift su `source_pgn`, ora prevenuto. |
| **LAZY loading** | `open-in-view: false` — tutte le letture che toccano collezioni LAZY richiedono `@Transactional(readOnly=true)` sul metodo di servizio. |
| **Stockfish mai in allenamento** | Vincolo costruttivo: `variant-training` non importa `StockfishService` né `EvalBar`. Non indebolire questa separazione. |
| **`userId` inattivo** | Predisposto nullable su `TrainingSession` e `ReviewSchedule`. Inattivo finché non arriva Supabase Auth. |
| **Responsive scacchiera** | La board arriva a 720px dove lo spazio lo consente; il pannello può scendere sotto la piega su laptop. R26 ne limita la larghezza con `min(90vw, calc(100vw - 3.5rem), 720px)`: dettaglio ed editor sono stati verificati senza overflow orizzontale a 1600/1440/1024/768/375/320px, incluse le Aperture a 320px. Il pannello varianti R23 **non** tocca il dimensionamento della board — il rail è una terza colonna solo da 1500px e sotto soglia l'elenco è un drawer `position: fixed`, fuori dal flusso. |
| **Soglia 1500px del rail varianti** | Il layout a tre colonne del dettaglio vive in una sola media query di `variant-detail.css` (`@media (min-width: 1500px)`), che accende il rail, alza la `max-width` di `.detail` a 1520px e spegne pulsante e drawer. Cambiando la soglia vanno rivisti insieme questi quattro effetti, altrimenti si ottengono rail e drawer contemporaneamente o una colonna che non entra. |
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
- Conservazione di commenti e NAG **presenti in un PGN importato** (o da Lichess): R24 annota solo dall'editor, l'import continua a scartare `{...}`, `; ...` e `$n` — evolutiva distinta.
- Comando «Elimina continuazioni» (mantenere la mossa ed eliminarne i soli figli): esplicitamente fuori da R24, resta un punto aperto da decidere.
- Sezione completa Finale (oggi ancora sul segnaposto di ISSUE-021), gioco contro il motore da una posizione salvata, tag/categorie — change successive a ISSUE-016 (vedi `docs/roadmap.md`).
- Multi-PV (più linee del motore), frecce/highlight della PV sulla scacchiera e click sulla linea per eseguirla — esplicitamente fuori dal perimetro di ISSUE-022.

---

## Prossima fase

**R25** (`issue-016-custom-starting-fen`) è rilasciata e verificata manualmente. Le suite
automatiche risultano verdi (120 test backend e 346 frontend), i flussi E2E 49–52 sono conclusi
su database temporaneo e i task OpenSpec 6.1–6.3 sono completati.

**R26** (`issue-016-middlegame-section`) è implementata e verificata: 120 test backend e
446 frontend verdi, build Angular riuscita e flussi E2E 53–58 conclusi su database temporaneo.
La change OpenSpec è archiviata in
`openspec/changes/archive/2026-08-13-issue-016-middlegame-section/`.
Il prossimo rilascio di prodotto è **R27** (`issue-016-endgame-section`), che renderà reale
Finale riusando il contesto e i componenti posizionali consolidati dal Mediogioco.

La terza tornata infrastrutturale prosegue poi in quest'ordine:

1. ~~**Liquibase** — migrazioni versionate~~ ✓ fatto (ISSUE-019): schema gestito da Liquibase, baseline in `db/changelog/`.
2. **Supabase PostgreSQL** — migrazione da H2 (il changelog Liquibase usa tipi astratti, portabili).
3. **Supabase Auth + `userId`** — multiutente.
4. **Docker** — containerizzazione FE/BE.
5. **CI/CD** — e rivalutare un runner E2E browser.

Per la roadmap completa con backlog e idee future → [`docs/roadmap.md`](roadmap.md).
