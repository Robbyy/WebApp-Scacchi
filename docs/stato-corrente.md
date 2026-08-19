# Stato corrente — WebApp Scacchi

> Aggiornato al: **2026-08-19** (R26.1 e R26.2 implementate, verificate e archiviate in OpenSpec;
> follow-up setup editor verificato; **R26.3 completa**: change modello
> `issue-016-middlegame-guided-study-model` e change flussi `issue-016-middlegame-guided-study-flows`
> implementate, verificate e archiviate — gate B9 chiuso con i flussi E2E 72–81; seguiti dai
> correttivi post-R26.3 del 2026-08-19, fuori change).
> Non è un diario cronologico. La storia per-prototipo è in `docs/archive/stato-avanzamento-2026-06-28.md` e nel git log.

---

## Sintesi

La webapp è funzionante in locale. **Parte 1 (P0–P6) e Parte 2 (P7–P19) completate e verificate.**
Suite automatica verde: backend **208 test**, frontend **711 test**.
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
- **Consolidamento posizioni di studio (R26.1, `issue-016-positional-study-consolidation`)**: implementati e verificati i dieci correttivi emersi dall'uso di R26. Gli studi posizionali non mostrano colore né CTA duplicate; le azioni rispettano la modalità modifica; la griglia FEN è rigidamente 8×8; l'analisi salvata parte nascosta e si rivela solo su richiesta; la posizione è eliminabile dal dettaglio; barra motore, breadcrumb, rail e controlli dell'editor non spostano la board; la navigazione posizionale mostra soltanto i titoli e la home Aperture filtra esplicitamente `OPENING`. Nessuna nuova API, migration o modifica al modello a fasi. R27 deve riusare questi contratti e ripeterne le evidenze con `ENDGAME`.
- **Editor posizionale contestuale (R26.2, `issue-016-position-editor-contextual-actions`)**: in `/middlegame/positions/{id}/edit` il breadcrumb resta visibile ma è testo non focalizzabile, con `aria-current="page"` sulla sola pagina corrente; kicker «MODIFICA POSIZIONE», comando «Posizioni», pulsante «Motore» e label «posizione iniziale» non vengono renderizzati e «Mosse & rami» occupa la posizione gerarchica del motore, subito dopo il nome. Il contratto dipende dalla fase dello studio (`isPosition()`), quindi vale per `MIDDLEGAME` e `ENDGAME`; le Aperture conservano il comportamento pre-R26.2 e il motore resta nel dettaglio della posizione. Nessuna nuova API, migration o modifica al modello a fasi. R27 eredita il contratto ma deve ripetere le evidenze sulle rotte `/endgame`.
- **Follow-up post-R26.2 (`f5bbb25`)**: l'editor di configurazione della posizione (`/middlegame/positions/{id}/setup`) è stato compattato per rientrare nel viewport, con scacchiera adattabile all'altezza, coordinate leggibili, breadcrumb non interattivo, kicker rimosso e FEN readonly non ridimensionabile. Il correttivo è frontend-only e non modifica API, modello o database. Il flusso E2E 67 è stato superato il 2026-08-16 su H2 temporaneo: viewport previsti, salvataggio, Annulla/guard e regressione Aperture verificati.
- **Modello dello studio guidato del Mediogioco (R26.3 change A, `issue-016-middlegame-guided-study-model`)**: gli studi `MIDDLEGAME` hanno ora una tipologia `TACTICAL`/`STRATEGIC` obbligatoria in creazione, immutabile dopo la prima valorizzazione; gli studi legacy senza tipologia restano consultabili/modificabili come «Da classificare» e si classificano una sola volta. Catalogo temi normalizzato (14 tattici, 13 strategici, inclusa «case deboli e case forti»), referenziato dalle posizioni per solo ID (`GET /api/position-themes?studyType=...`). Le posizioni Mediogioco hanno tema, descrizione del tema, descrizione, difficoltà a cinque livelli, fonte e ordine esplicito contiguo (`PUT /api/studies/{id}/variants/order`, riordino atomico); le posizioni legacy senza tema restano usabili come «Tema da assegnare» e non sono eleggibili per lo studio guidato finché non ricevono un tema compatibile. Storico minimo dei tentativi (`PositionAttempt`: posizione, istante server, esito) con validazione tattica autorevole lato backend dalle sole mosse dell'utente e registrazione manuale `UNDERSTOOD`/`NOT_UNDERSTOOD` per le posizioni strategiche; riepiloghi derivati (ultimo esito, conteggio, ultima comprensione) senza percentuali. In UI: classificazione una tantum e blocco della creazione di nuove posizioni finché non classificato, selezione tema/difficoltà/ordine nell'editor di posizione, riordino numerico e drag-and-drop con rollback su errore, pannello «Dati posizione»/«Storico tentativi» nel dettaglio. Nessun flusso di esercizio guidato, replay o tentativo interattivo: appartengono alla change B. Suite 191 backend/503 frontend, build Angular e flussi E2E 68–71 verdi su H2 temporaneo; database condiviso invariato. Change archiviata in `openspec/changes/archive/2026-08-17-issue-016-middlegame-guided-study-model/`.
- **Studio guidato del Mediogioco (R26.3 change B, `issue-016-middlegame-guided-study-flows`)**: due rotte dedicate (`/middlegame/positions/:id/study` manuale, `/middlegame/studies/:id/study` sequenziale) aprono un tentativo che nasconde l'intero albero autore finché non c'è un esito. Due flussi distinti derivati dalla tipologia dello studio: **tattico** — confronto immediato con la mainline, risposta avversaria automatica, invio delle sole `userMoves` all'esito (deviazione → `FAILED`, completamento → `UNDERSTOOD`), Stockfish mai istanziato; **strategico** — segue la mainline finché non c'è deviazione, poi sospende la risposta automatica finché il motore non viene attivato (`Attiva motore per continuare`), usa `StockfishService.requestBestMove` per una sola risposta esplorativa per volta con guardia `attemptEpoch + FEN + requestSequence` e `stop()` su ogni transizione, non persiste le mosse esplorative né mostra PV/barra obbligatorie, e richiede la rivelazione della soluzione (intero albero, replay manuale) prima di abilitare l'esito manuale `UNDERSTOOD`/`NOT_UNDERSTOOD`. Modalità sequenziale con schermata di configurazione obbligatoria (ordine `AUTHOR`/`RANDOM`, filtro `ALL`/`NEVER_ATTEMPTED`/`TO_REVIEW`/`UNDERSTOOD`), snapshot generato una sola volta, «Salta posizione» (con conferma se esistono mosse locali) e riepilogo finale non persistito. Storico e riepiloghi condivisi fra modalità manuale e sequenziale tramite le API della change A. Suite 191 backend/692 frontend, build Angular e flussi E2E 72–81 (gate B9, incluse regressione 68–71, verifica motore spento/non disponibile/callback obsoleta e responsive ai sei viewport) verdi su H2 temporaneo; database condiviso invariato. Change archiviata in `openspec/changes/archive/2026-08-19-issue-016-middlegame-guided-study-flows/`.
- **Correttivi post-R26.3 (2026-08-19)**: emersi dall'uso di R26.3 e da analisi mirate, tutti fuori change OpenSpec. Etichetta `STRATEGIC` corretta in «Strategia»; lista Mediogioco suddivisa nelle sezioni sempre visibili «Studi di tattica» e «Studi di strategia», con «Da classificare» solo in presenza di studi legacy e senza badge ripetuti nelle card; pannello «Dati Mediogioco» a scomparsa e chiuso all'apertura. **Correzione di perdita dati**: `PUT /api/variants/{id}` è full-replace e azzerava tema, descrizioni, difficoltà e fonte a ogni salvataggio dall'editor delle mosse, facendo uscire la posizione dallo studio guidato; introdotto `PUT /api/variants/{id}/tree`, che possiede solo nome, colore e albero e valida dalla FEN persistita. Limiti di lunghezza applicati lato server (nome alla capienza della colonna, metadati Mediogioco al loro limite) invece dei soli `maxlength` di UI. Dettaglio studio a costo costante in query (era una interrogazione per posizione più una rilettura dello studio), con test di regressione dedicato. Nel setup posizione: en passant filtrato per lato al tratto, submit disabilitato senza titolo, compattazione e azioni ancorate sui viewport bassi, ordine modificabile anche in modifica tramite il contratto atomico di riordino. Nessuna migration; API estesa di un endpoint (vedi `architettura.md`).

### R26.3 — Studio guidato del Mediogioco (rilasciata)

R26.3 trasforma l'archivio di posizioni del Mediogioco in uno strumento di studio guidato ed è
stata costruita con due change OpenSpec sequenziali. Il dominio e le scelte di compatibilità sono
chiusi nel [preflight](preflight-mediogioco-studio-guidato.md) e verificati tecnicamente
nell'[analisi](analisi-mediogioco-studio-guidato.md); l'ordine di esecuzione era nel
[piano di implementazione](piano-implementazione-r26.3.md).

1. ✅ `issue-016-middlegame-guided-study-model` — tipologia tattica/strategica, catalogo temi
   normalizzato, metadati e ordine delle posizioni, storico minimo, migrazioni e API. **Implementata,
   verificata e archiviata il 2026-08-17** (dettagli sopra).
2. ✅ `issue-016-middlegame-guided-study-flows` — esercizio tattico e strategico, soluzione,
   motore esplorativo, modalità sequenziale, filtri e riepiloghi. **55/55 task completati.
   Implementata, verificata e archiviata il 2026-08-19** (dettagli sopra).

Gli studi Mediogioco esistenti prima di R26.3 restano consultabili/modificabili come «Da
classificare» finché non vengono classificati una sola volta; le loro posizioni restano
consultabili/modificabili come «Tema da assegnare» finché non ricevono un tema compatibile, dopo
di che diventano eleggibili per lo studio guidato. **R26.3 è rilasciata** come prodotto: entrambe
le change sono implementate, verificate e archiviate. R27 Finale segue R26.3 e non eredita
automaticamente la tipologia dello studio né i flussi guidati (vedi «Prossima fase»).

---

## Backend attuale

- **Stack**: Java 21 · Spring Boot 4.1.0 · Maven · JPA/Hibernate · H2 file (`backend/data/scacchi`) · chesslib (JitPack).
- **Package**: `ping`, `variant`, `study`, `training`, `stats`, `review`, `theme` (catalogo temi Mediogioco, R26.3), `attempt` (storico tentativi, R26.3).
- **Test**: 208 verdi (`mvnw.cmd test`). Copertura: CRUD varianti/studi, validazione legalità, FEN custom e albero dalla posizione iniziale effettiva (R25), round-trip albero, annotazioni delle mosse (R24: serializzazione, JSON legacy, rifiuto di commento oltre il limite e NAG fuori insieme), import bulk/upsert Lichess, sessioni, statistiche, SM-2, fasi di gioco (ISSUE-016), migrazioni Liquibase su H2 temporaneo, tipologia/classificazione studio, catalogo temi, metadati/ordine posizioni e riordino atomico, validazione tattica/strategica dei tentativi e riepiloghi (R26.3 change A); dai correttivi post-R26.3: conservazione dei metadati sull'aggiornamento del solo albero, limiti di lunghezza, e costo in query del dettaglio studio.
- **Avvio locale**: `mvnw.cmd spring-boot:run` (PowerShell; impostare `MAVEN_OPTS=-Djavax.net.ssl.trustStoreType=Windows-ROOT`).

---

## Frontend attuale

- **Stack**: Angular 22 · TypeScript · Vitest · componenti standalone · signals · OnPush · chess.js · Stockfish asm.js.
- **Aree**: `chessboard`, `variants`, `positions`, `studies`, `stats`, `reviews`, `play`, `sections`, `core`.
- **Routing**: `/` → lista studi Aperture; `/studies/new`, `/studies/:id`, `/variants/:id`, training/statistiche/review e `/play` conservano i flussi delle Aperture. La sezione R26 usa `/middlegame`, `/middlegame/studies/new`, `/middlegame/studies/:id`, `/middlegame/positions/new?studyId={id}`, `/middlegame/positions/:id/setup`, `/middlegame/positions/:id/edit` e `/middlegame/positions/:id`; R26.3 change B aggiunge `/middlegame/positions/:id/study` (tentativo manuale) e `/middlegame/studies/:id/study` (configurazione ed esecuzione sequenziale), sotto la feature dedicata `guided-study`. `/endgame` resta sul segnaposto di R20 in attesa di R27.
- **Test**: 711 verdi (`npm test -- --watch=false`, Vitest headless, 45 file), inclusi routing e contesto R26, filtro per fase, CRUD studi/posizioni, analisi nascosta/rivelata/reset, eliminazione dal dettaglio, form contestuali, griglia FEN 8×8, setup editor, classificazione/temi/difficoltà/ordine/riepilogo del Mediogioco (R26.3 change A), route e CTA dello studio guidato, macchina a stati e flussi tattici/strategici, storico tentativi, configurazione/snapshot sequenziale, avanzamento/skip/riepilogo e regressioni Aperture/Finale (R26.3 change B); dai correttivi post-R26.3: raggruppamento della lista per tipologia, pannello «Dati Mediogioco» a scomparsa, contratto del solo albero, en passant filtrato, submit e ordine nel setup posizione.
- **Avvio locale**: `npm start` (frontend su `http://localhost:4200`, con proxy verso `http://localhost:8080`).

---

## Verifiche live e checklist manuale

Verifiche browser superate senza errori console inattesi fino al follow-up R26.2: training, editor, import PGN/Lichess, OAuth, Stockfish, sessioni, statistiche, responsive e flussi posizionali 49–67. Per R26.1 il backend era collegato a `H2_DB_PATH` temporaneo; CRUD, modalità analisi nascosta, errore controllato di eliminazione, regressioni Aperture/Finale e misure geometriche sono stati verificati a 1600/1440/1024/768/375/320px. Dettaglio ed editor condividono lo stesso rettangolo della board e il toggle motore non ne cambia la geometria; sui viewport stretti l'eventuale scroll modifica solo la coordinata relativa alla finestra, non quella nel documento.

R26.2 ha usato lo stesso schema, di nuovo su `H2_DB_PATH` temporaneo: alle sei larghezze il breadcrumb dell'editor posizionale non contiene link né elementi focalizzabili, il pannello destro mantiene l'ordine `nome → Mosse & rami → replay → contatore → [ramo] → azioni → Salva/Annulla` e non si produce overflow orizzontale. Sono stati riverificati replay, badge di ramo, menu azioni con ritorno del focus, creazione di un ramo, guard delle modifiche non salvate, salvataggio con redirect canonico e persistenza di albero/commenti/NAG; il dettaglio conserva il motore e le Aperture restano al comportamento precedente. In quella sessione il pannello browser non componeva frame, quindi le evidenze sono albero di accessibilità, misure DOM e interazioni reali invece di schermate.

Checklist E2E ripetibile: [`docs/checklist-e2e.md`](checklist-e2e.md) — **81 flussi numerati** (più
il sottoflusso 30-bis); i cinque
flussi R26.1 (59–63), i tre R26.2 (64–66), il follow-up 67, i quattro della change modello R26.3
(68–71) e i dieci della change flussi R26.3 (72–81, gate B9) sono tutti completati.

Il follow-up post-R26.2 ha aggiunto il flusso 67 per il setup editor; la verifica browser dedicata
è stata superata il 2026-08-16 su H2 temporaneo, senza toccare il database condiviso.

I flussi 68–71 della change modello R26.3 sono stati verificati il 2026-08-17: backend avviato su
un H2 file temporaneo separato dal database condiviso, con uno studio Mediogioco legacy inserito
via SQL diretto (`study_type` nullo, due posizioni con `position_order` valorizzato e `theme_id`
nullo) per riprodurre lo stato post-backfill. Verificati dal browser: classificazione una tantum e
relativo rifiuto della riclassificazione (`400`), creazione di uno studio tattico e di uno
strategico vuoto, rifiuto della creazione senza tipologia, assenza del campo tipologia per le
Aperture e rifiuto lato API per `OPENING`/`ENDGAME`, catalogo temi filtrato per tipologia (14
tattici, 13 strategici) con assegnazione tema/difficoltà/descrizione/fonte a una posizione legacy
(che passa da «Tema da assegnare» a eleggibile), ordine `N+1` predefinito in creazione e riordino
numerico persistito via `PUT .../variants/order`. Nessun errore in console.

I flussi 72–81 della change flussi R26.3 (gate B9) sono stati verificati il 2026-08-19 su un nuovo
H2 file temporaneo, con la regressione 68–71 rieseguita sullo stesso file (studio legacy e due
posizioni legacy reinserite via SQL diretto). Verificati dal browser: bozza senza mainline come
scacchiera libera esclusa dalle sequenze; mainline tattica completata con risposte automatiche,
validazione server (`POST /attempts` `201`) ed esito `compresa`; deviazione tattica con esito
`errata` e soluzione automatica; deviazione strategica con motore spento (risposta sospesa,
«Attiva il motore per continuare a esplorare») e con motore attivo (una sola risposta reale di
Stockfish, nessuna persistenza, nessuna PV/barra obbligatoria); rivelazione della soluzione
strategica dalla `startingFen` con replay manuale ed esito `compresa`/`non compresa`; tentativi
multipli con storico preservato anche dopo la modifica della mainline; modalità manuale e
sequenziale che alimentano lo stesso riepilogo; configurazione sequenziale con ordine/filtro
obbligatori, «Salta posizione» con conferma se esistono mosse locali e riepilogo finale non
persistito; cascata di eliminazione su posizione e studio senza tentativi orfani (`404` dopo
l'eliminazione). Motore verificato esplicitamente spento, non disponibile (simulato) e con
callback obsoleta ignorata dalla guardia epoch/sequence. Responsive verificato senza overflow
orizzontale a 1600/1440/1024/768/375/320px sulle schermate di tentativo e configurazione
sequenziale; regressioni Aperture e Mediogioco (editor R26.2, dettaglio) verificate senza errori
console. `backend/data/scacchi.mv.db` invariato prima e dopo (dettagli in
[`docs/checklist-e2e.md`](checklist-e2e.md)).

---

## Problemi noti

Nell'implementazione R26.2 la baseline era di 461 test frontend, build Angular e flussi browser 64–66 verdi; il follow-up `f5bbb25` ha portato la suite a 462 e il flusso browser 67 è stato superato il 2026-08-16. Il gate della change modello R26.3 (2026-08-17) porta la suite a 191 backend/503 frontend. Il gate B9 della change flussi R26.3 (2026-08-19) porta la suite a **191 backend/692 frontend**, build Angular verde e i dieci flussi E2E 72–81 completati; con questo gate R26.3 è rilasciata come prodotto. Restano come debito tecnico la race UCI di ISSUE-022 e il ritorno del focus al pulsante «Varianti» alla chiusura del drawer — quest'ultimo ora riguarda le sole Aperture, perché l'editor posizionale non espone più quel comando; i warning di budget CSS/bundle non sono errori di compilazione. **Policy DB**: `backend/data/scacchi.mv.db` è la fonte condivisa versionata e non va ripristinata, sovrascritta o inclusa senza decisione esplicita. Verificata prima e dopo il gate B9 del 2026-08-19: `155648` byte, timestamp `2026-08-16 06:15:50`, SHA-256 `4117D9D8E773D9D871C14775842DF835F62AD60FDA4A7985DE154F20A59C19FF`, invariata; Git non segnala differenze sul file.

### R26.2 — Editor posizionale contestuale (implementata e archiviata)

`issue-016-position-editor-contextual-actions` è implementata, verificata e archiviata in
`openspec/changes/archive/2026-08-14-issue-016-position-editor-contextual-actions/`. I cinque
requisiti sono chiusi nel codice:

- ✅ breadcrumb presente ma non interattivo in modalità modifica, con `aria-current="page"` sulla
  sola pagina corrente e nessun elemento focalizzabile nel percorso;
- ✅ nessuna etichetta «MODIFICA POSIZIONE»;
- ✅ nessun pulsante «Posizioni», senza comando equivalente sostitutivo nel pannello;
- ✅ nessun pulsante «Motore» nell'editor posizionale, che resta invece nel dettaglio;
- ✅ «Mosse & rami» al posto del Motore e nessuna label «posizione iniziale».

Salvataggio, annullamento, guard, replay, azioni del tree, dettaglio con motore e Aperture sono
stati riverificati invariati. R27 dovrà comunque verificare gli stessi cinque requisiti con dati
`ENDGAME` e rotte `/endgame`: il test automatico che applica il contratto a uno studio `ENDGAME`
dimostra solo che la presentazione dipende dalla fase, non chiude il gate del Finale.

### Correttivi R26/R27 verificati in R26.1

I punti seguenti sono implementati, coperti da test automatici e verificati nel browser
multi-viewport nella change `issue-016-positional-study-consolidation`.
Per R27 tutti i punti sono requisiti di accettazione: il riuso delle classi condivise evita
duplicazioni, ma non dimostra da solo la corretta configurazione `ENDGAME`, le rotte `/endgame` o
la geometria del Finale. La futura change dovrà quindi associare a ogni punto test automatici
dedicati e verifica browser ai sei viewport previsti.

- ✅ **R26-UI-01 — CTA duplicata nello stato vuoto della lista studi:** `position-study-list` mostrava
  «Nuovo studio» sia nell'intestazione sia nell'empty state. R26.1 mantiene la CTA
  dell'intestazione e rimuove quella inferiore, lasciando nell'empty state solo il messaggio.
  La stessa regola dovrà essere applicata alla futura lista Finale R27 e coperta da test.
- ✅ **R26-UI-02 — Colore non pertinente negli studi posizionali:** la creazione di uno studio
  Mediogioco non mostra più il campo «Colore» ereditato dal componente condiviso. Per
  Mediogioco e Finale il colore non rappresenta un lato di allenamento e non deve essere richiesto
  o mostrato. R26.1 rende il campo configurabile per contesto e lo nasconde nei
  form posizionali, mantenendo invariato il comportamento delle Aperture; la stessa regola e lo
  stesso contratto dati dovranno essere riusati da R27.
- ✅ **R26-UI-03 — CTA «Nuova posizione» durante la modifica dello studio:** nel dettaglio di uno
  studio la CTA non resta più visibile mentre il form è in modalità «Modifica». R26.1 nasconde
  la CTA e l'eventuale invito operativo collegato finché la modifica è aperta,
  ripristinandoli al ritorno alla modalità di consultazione. La stessa regola dovrà essere
  applicata al dettaglio degli studi Finale R27.
- ✅ **R26-UI-04 — Caselle della scacchiera instabili nell'editor FEN:** durante l'inserimento della
  posizione iniziale gli SVG non possono più alterare bordi e ingombro delle caselle. R26.1 mantiene
  la griglia rigidamente 8×8 con caselle di dimensione invariabile e contiene
  ogni pezzo entro la propria casella con dimensioni esplicite e `object-fit: contain`, senza lasciare
  che l'ingombro intrinseco dell'SVG influenzi il layout. Il vincolo dovrà essere riusato dall'editor
  posizionale di Finale R27 e coperto da un test di rendering/layout.
- ✅ **R26-UI-05 — Eliminazione della posizione dal dettaglio:** il dettaglio di una posizione
  espone ora l'azione distruttiva riusando `DELETE /api/variants/{id}` e `VariantService`.
  La CTA chiede conferma esplicita, invoca il servizio e, dopo esito positivo, torna alla pagina
  principale dello studio padre (`paths.study(studyId)`); il dettaglio resta aperto in caso di
  annullamento o errore. Va riusato e coperto il
  flusso anche per il dettaglio posizionale di Finale R27.
- ✅ **R26-UI-06 — Scacchiera spostata dall'attivazione del motore:** la barra di valutazione è ora
  posizionata fuori dal flusso di `.board-with-eval`; il layout centrato non ne somma più la larghezza.
  La barra compare senza alterare posizione orizzontale, dimensione o allineamento della scacchiera;
  il comportamento deve valere anche per il
  dettaglio posizionale di Finale R27, con test di layout attivo/disattivo.
- ✅ **R26-FUNC-07 — Analisi inizialmente nascosta nelle posizioni di studio:** il dettaglio di una
  posizione `MIDDLEGAME` o `ENDGAME` deve aprirsi sulla `startingFen` con l'analisi salvata nascosta.
  Albero, mosse, rami, commenti, NAG, contatore e controlli di replay non devono essere renderizzati
  finché l'utente non attiva esplicitamente «Mostra analisi»; al cambio posizione o al ricaricamento
  lo stato torna nascosto. Se l'albero è vuoto va mostrato «Nessuna analisi salvata» senza azione di
  rivelazione. Stockfish resta disponibile e inizialmente spento secondo il contratto esistente;
  Aperture, training, review SM-2 e statistiche non cambiano. Suggerimenti progressivi, autoverifica
  interattiva e training posizionale restano fuori perimetro. R26.1 implementa il comportamento
  come stato transitorio locale, resettato al cambio di posizione.
- ✅ **R26-UI-08 — Controlli dell'editor mosse nella colonna destra:** nei layout desktop l'editor
  condiviso colloca ora nell'aside il pulsante Motore e tutti i blocchi successivi. `.board-col`
  contiene soltanto la scacchiera con l'eventuale barra di valutazione;
  `engine-bar`, navigazione delle mosse, contatore, informazioni sul ramo, azioni di modifica e
  conferma di eliminazione sono collocati nell'`aside` destro insieme al pannello dell'albero
  e alle azioni di salvataggio. Sui viewport stretti resta ammessa la disposizione verticale prevista
  dal responsive. Essendo `VariantEditor` condiviso, il layout deve restare coerente per Aperture,
  Mediogioco e Finale R27 senza modificare il comportamento delle funzioni esistenti.
- ✅ **R26-UI-09 — Ancoraggio stabile della scacchiera tra dettaglio ed editor mosse:** passando dal
  dettaglio canonico di una posizione a «Modifica mosse», o tornando al dettaglio dopo il salvataggio,
  la scacchiera usava coordinate diverse perché le due pagine avevano shell differenti. R26.1
  aggiunge breadcrumb e slot geometrico del rail all'editor; dettaglio ed editor condividono così
  una griglia desktop con colonna della scacchiera ancorata. Breadcrumb, rail
  e pannello destro non devono modificarne posizione o dimensione. A parità di viewport, il rettangolo
  della scacchiera (`left`, `top`, `width`, `height`) deve restare invariato nel passaggio fra
  `/positions/{id}` e `/positions/{id}/edit`. La regola deve valere anche per Finale R27 e integrarsi
  con `R26-UI-06` e `R26-UI-08`; sui viewport mobili resta ammesso il layout verticale responsive.
- ✅ **R26-UI-10 — Rimuovere il conteggio mosse dalla navigazione delle posizioni:** in `positionMode`
  rail e drawer non mostrano più «N mosse». Per le posizioni `MIDDLEGAME` e `ENDGAME`
  ogni elemento di `StudyVariantNav` mostra soltanto il titolo, mantenendo un target cliccabile
  accessibile; le varianti `OPENING` conservano badge del colore e conteggio mosse. La regola
  è applicata sia al rail desktop sia al drawer responsive e va riusata da Finale R27.

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
- Sezione completa Finale (oggi ancora sul segnaposto di ISSUE-021), gioco contro il motore da una posizione salvata, tag/categorie — change successive a ISSUE-016 (vedi `docs/roadmap.md`). R27 (`issue-016-endgame-section`) non eredita automaticamente la tipologia tattica/strategica né i flussi guidati introdotti da R26.3: resta una decisione di prodotto futura ed esplicita, non un'estensione implicita del riuso dei componenti.
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

**R26.1** (`issue-016-positional-study-consolidation`) è implementata e verificata:
120 test backend, 455 frontend, build Angular e flussi browser 59–63 verdi; misure geometriche
concluse ai sei viewport e database condiviso invariato rispetto alla baseline del gate. La change
è archiviata in `openspec/changes/archive/2026-08-14-issue-016-positional-study-consolidation/`.

**R26.2** (`issue-016-position-editor-contextual-actions`) è implementata, verificata e archiviata:
baseline di 461 test frontend, build Angular e flussi browser 64–66 verdi ai sei viewport su
database temporaneo, con il database condiviso invariato rispetto alla baseline del gate. La change è archiviata in
`openspec/changes/archive/2026-08-14-issue-016-position-editor-contextual-actions/`.

**R26.3 — Studio guidato del Mediogioco** è **rilasciata**, costruita con due change OpenSpec
sequenziali entrambe implementate, verificate e archiviate. La prima,
`issue-016-middlegame-guided-study-model`, **archiviata il 2026-08-17**: 191 test backend, 503
frontend, build Angular e flussi E2E 68–71 verdi su H2 temporaneo, database condiviso invariato.
La seconda, `issue-016-middlegame-guided-study-flows`, **55/55 task completati e archiviata il
2026-08-19** (gate B9): 191 test backend, 692 frontend, build Angular e flussi E2E 72–81 (inclusa
la regressione 68–71) verdi su H2 temporaneo, database condiviso invariato.

Il prossimo rilascio è **R27** (`issue-016-endgame-section`): renderà reale Finale riusando i
contratti consolidati e ripetendo con dati `ENDGAME` le evidenze R26.1 e R26.2. R27 **non eredita
automaticamente** dalla sezione Mediogioco la tipologia tattica/strategica dello studio né i
flussi guidati di R26.3 — `Study.phase == ENDGAME` resta priva di `studyType` finché una decisione
di prodotto dedicata non estende esplicitamente lo studio guidato al Finale; il riuso dei
componenti condivisi (board, editor, tree) non implica il riuso automatico di questo dominio.

La terza tornata infrastrutturale prosegue poi in quest'ordine:

1. ~~**Liquibase** — migrazioni versionate~~ ✓ fatto (ISSUE-019): schema gestito da Liquibase, baseline in `db/changelog/`.
2. **Supabase PostgreSQL** — migrazione da H2 (il changelog Liquibase usa tipi astratti, portabili).
3. **Supabase Auth + `userId`** — multiutente.
4. **Docker** — containerizzazione FE/BE.
5. **CI/CD** — e rivalutare un runner E2E browser.

Per la roadmap completa con backlog e idee future → [`docs/roadmap.md`](roadmap.md).
