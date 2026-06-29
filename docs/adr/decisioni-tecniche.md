# Decisioni tecniche (ADR log)

Registro sintetico delle decisioni architetturali rilevanti. Ogni voce è una
mini-ADR. Le decisioni qui prese non sostituiscono `preanalisi-progetto.md` né
`planning-prototipi-webapp.md`, ma ne tracciano l'attuazione.

---

## 0001 — Rendering scacchiera: componente custom + chess.js (T1.1)

**Data:** 2026-06-23 · **Stato:** Accettata · **Contesto:** Prototipo 1, rischi R1/R12.

### Decisione
La scacchiera è un **componente Angular custom** (CSS grid + glifi/SVG dei pezzi),
con **`chess.js` come unico motore di regole** (legalità, SAN, FEN, in futuro PGN).
Nessuna libreria di rendering scacchiera di terze parti.

### Alternative valutate
- **cm-chessboard** (rendering) + chess.js (regole): ottimo accoppiamento con
  chess.js e buon controllo CSS, ma introduce una pipeline di asset (sprite SVG,
  CSS del pacchetto) e interop ESM la cui resa va verificata visivamente — rischio
  più alto in una sessione non presidiata.
- **ngx-chess-board**: nativo Angular e semplice da integrare, ma include un
  **proprio motore di mosse**, in conflitto con il principio dell'analisi di tenere
  `chess.js` come unica fonte delle regole; inoltre controllo visivo (cornice legno,
  coordinate, token esatti) più limitato.

### Motivazioni
1. **Fedeltà visiva esatta** al riferimento Lovable (case `#f0d9b5`/`#b58863`,
   cornice legno `repeating-linear-gradient`, coordinate, palette ottone): un
   componente custom garantisce controllo pixel-level, che è proprio il criterio
   con cui l'analisi sceglie la soluzione (preanalisi righe 58-63).
2. **`chess.js` unica fonte delle regole** (principio dell'analisi): evita il doppio
   motore che `ngx-chess-board` comporterebbe.
3. **Rischio di integrazione minimo** in sessione non presidiata: niente asset
   esterni da caricare a runtime, comportamento deterministico e testabile.
4. La preanalisi **sanziona esplicitamente** la scacchiera custom Angular/CSS/SVG
   quando il fattore decisivo è il controllo visivo/di interazione (riga 63).

### Conseguenze
- Separazione netta: il componente rende e cattura input; `chess.js` valida e
  produce SAN/FEN. Coerente con la separazione "rendering vs regole" dell'analisi.
- I pezzi usano **asset SVG Staunton** serviti da `frontend/public/pieces`, in linea
  con il riferimento visivo fissato nella preanalisi.
- L'interazione utente supporta sia click su origine/destinazione sia drag and
  drop nativo HTML; entrambi passano dalla stessa logica `chess.js` di legalita',
  SAN/FEN e promozione.
- Resta possibile, in futuro, sostituire il rendering con una libreria senza toccare
  chess.js, se emergessero esigenze non coperte.

---

## 0002 — Modello mosse ad albero con mainline derivata

**Data:** 2026-06-24 · **Stato:** Accettata · **Contesto:** Estensione anticipata post-Prototipo 5, rischio R11.

### Decisione
La variante non e' piu' solo una lista lineare di SAN: puo' contenere un albero di
mosse (`MoveNode`). Ogni nodo contiene:

- `san`: la mossa in notazione SAN;
- `children`: i seguiti possibili.

La convenzione e': `children[0]` e' la continuazione principale (**mainline**);
gli altri figli sono sotto-varianti alternative.

Il campo `moves` resta nel DTO e nel modello persistito, ma rappresenta la
mainline derivata da `tree`. Se `tree` e' assente o vuoto, viene costruito un
albero lineare da `moves` per compatibilita' con varianti gia' lineari.

### Motivazioni
1. Permette di anticipare il supporto a sotto-varianti senza introdurre nuove
   tabelle o un modello di repertorio completo.
2. Mantiene semplice il consumo frontend: le viste lineari possono usare `moves`,
   mentre dettaglio, editor e training avanzato possono usare `tree`.
3. Conserva retrocompatibilita' con il contratto dei prototipi precedenti.
4. Evita una normalizzazione prematura delle mosse in entita' separate finche' il
   dominio non richiede query complesse sui singoli ply.

### Conseguenze
- Backend e frontend devono trattare `tree` come fonte completa quando presente.
- `moves` non e' piu' il dato completo della variante: e' la mainline.
- Il training puo' accettare piu' mosse corrette quando dal nodo corrente partono
  piu' figli.

### Stato del consolidamento (P7-P8)
- **Vincolo ufficiale confermato:** `children.get(0)` e' la mainline a ogni livello;
  la derivazione di `moves` segue sempre il primo figlio (test `MoveNodeTest`).
- **Round-trip garantito da test:** `tree -> DB (JSON text) -> DTO` con rami multipli e
  profondi (test `VariantControllerTest.treeWithBranchesSurvivesRoundTrip`).
- **Promozione di un ramo a mainline (P8):** risolta lato client riordinando i
  `children` lungo il percorso corrente (`promoteToMainline` in `move-tree.ts`) e
  ri-salvando con `PUT`; nessun nuovo endpoint.
- **Validazione legalita' dell'intero albero (P7):** ora lato backend (vedi ADR 0004).
- **Protezione cancellazioni (P8):** l'editor chiede conferma prima di eliminare un
  nodo con figli (sottoalbero).
- Restano da consolidare: import/export PGN complesso e UX di editing avanzato.

---

## 0003 — Modifica di varianti esistenti via PUT

**Data:** 2026-06-24 · **Stato:** Accettata · **Contesto:** Estensione anticipata post-Prototipo 5.

### Decisione
La modifica di una variante esistente e' stata anticipata rispetto al planning
iniziale. Il contratto REST include:

```
PUT /api/variants/{id}
```

Il payload e' lo stesso usato per la creazione (`CreateVariantRequest`): nome,
colore, `moves`, `tree` opzionale e `sourcePgn` opzionale.

### Motivazioni
1. L'editor mossa-per-mossa del Prototipo 5 e' naturalmente riusabile anche per
   correggere o ampliare una variante gia' salvata.
2. Evita workflow scomodi del tipo elimina + ricrea.
3. Permette di far evolvere varianti create/importate senza aspettare una fase
   post-MVP separata.

### Conseguenze
- Il dettaglio variante espone un link di modifica.
- Il frontend usa `VariantService.updateVariant`.
- Il backend aggiorna nome, colore, albero/mainline e `sourcePgn`; `startingFen` e
  `createdAt` restano invariati.
- Servono ancora miglioramenti UX: conferma modifiche non salvate, feedback errori
  piu' specifici e protezione da cancellazioni accidentali di sottoalberi.

---

## 0004 — Validazione scacchistica lato backend con chesslib (P7, R13)

**Data:** 2026-06-25 · **Stato:** Accettata · **Contesto:** Prototipo 7 (Parte 2), rischio R13.

### Decisione
Il backend valida la **legalita' scacchistica** di mainline e albero prima di
persistere una variante. La libreria scelta e' **`chesslib`**
(`com.github.bhlangonijr:chesslib:1.3.4`), disponibile **solo via JitPack**
(aggiunto il repository `https://jitpack.io` al `pom.xml`), non su Maven Central.

### Alternative valutate
- **Legalita' solo lato client** (API "best effort"): scartata perche' svuota P7 di
  significato — l'API resterebbe falsificabile da chiamate dirette.
- **Validatore scacchistico scritto a mano** in Java: scartato perche' reimplementare
  le regole (inchiodature, scacco, arrocco, en passant, promozione) e' costoso e
  fragile, e duplicherebbe il motore (contrario al principio "una sola fonte di regole").

### Note di implementazione
- `chesslib.MoveList.loadFromSan` e' un **decoder SAN→mossa che NON verifica la
  legalita'** (puo' produrre mosse illegali, es. decodifica il "e4" del Nero come
  `e7e4`). La legalita' e' quindi controllata esplicitamente con
  `board.legalMoves().contains(move)` nella posizione corrente.
- L'albero e' validato in profondita': ogni nodo nella posizione del padre, a
  partire da `START_FEN`.
- Gli errori producono `400` con corpo strutturato `ValidationError`
  (`field`, `ply`, `branchPath`, `message`), gestito da `@ExceptionHandler` nel
  controller. Il frontend (editor/import) mostra il `message`.

### Conseguenze
- Nessuna variante con mosse illegali puo' entrare in DB tramite l'API.
- Dipendenza da JitPack per la build del backend (richiede rete; il workaround TLS
  `MAVEN_OPTS=-Djavax.net.ssl.trustStoreType=Windows-ROOT` resta necessario in locale).
- Le varianti partono dalla posizione iniziale standard; per future posizioni di
  partenza custom (`startingFen`) la validazione andra' estesa a partire da quella FEN.

---

## 0005 — Modello Studi e cancellazione a cascata (P11, R14)

**Data:** 2026-06-25 · **Stato:** Accettata · **Contesto:** Prototipo 11 (Parte 2), rischio R14.

### Decisione
Le varianti si raggruppano in **Studi** (sul modello degli *studies* di Lichess).
La relazione `Study → Variant` e' **1-N** modellata con una colonna
`study_id` **nullable** sulla `Variant` (FK verso `study`). L'eliminazione di uno
studio e' **a cascata**: cancella anche tutte le sue varianti; le varianti **non**
vengono mai riassegnate ad altri studi.

### Alternative valutate
- **Relazione JPA bidirezionale** (`@OneToMany`/`@ManyToOne` con `orphanRemoval`):
  scartata per non accoppiare l'entita' `Variant` (e il suo DTO/serializzazione
  gia' consolidati in P4-P8) al ciclo di vita dello studio. Si e' preferita una
  **FK semplice** + cascata **esplicita** nel service, piu' leggibile e testabile.
- **Riassegnazione delle varianti** a uno studio "orfani" all'eliminazione:
  scartata — l'utente si aspetta che eliminare uno studio elimini il suo contenuto
  (comportamento Lichess); evita accumulo di varianti senza contesto.
- **Spostamento varianti tra studi** in questo giro: rinviato (sezione 19 · TODO
  del planning).

### Note di implementazione
- `study_id` nullable garantisce retrocompatibilita': le varianti legacy senza
  studio restano valide. Il seed (`StudyDataInitializer`, `@Order(2)` dopo
  `VariantDataInitializer`) crea lo studio di default **"Repertorio"** e vi
  aggancia (idempotente) tutte le varianti con `study_id == null`.
- La cascata e' implementata in `StudyService.delete` (`@Transactional`):
  `variantService.deleteByStudyId(id)` e poi `studyRepository.deleteById(id)`.
- `StudyDto` espone `variantCount` in lista e l'elenco completo `variants` nel
  dettaglio. `VariantDto` espone `studyId` (nullable).
- Errori di payload (es. nome vuoto, colore non valido) → `400` riusando il
  formato `ValidationError` gia' adottato in P7, via `InvalidStudyException`.

### Conseguenze
- Un'unica fonte per il raggruppamento; nessuna variante "orfana" inattesa dopo
  una delete di studio.
- Lo studio di colore puo' essere `MIXED` (oltre a `WHITE`/`BLACK`), a differenza
  della singola variante che resta `WHITE`/`BLACK`.
- La UI degli studi (lista/dettaglio, crea/elimina) arriva in P12.

---

## 0006 — Import studio Lichess pubblico da URL (P14, R20)

**Data:** 2026-06-25 · **Stato:** Accettata e implementata (P14) · **Contesto:** Prototipo 14 (Parte 2), rischio R20.

> **Implementazione (2026-06-26).** Fetch frontend diretto dell'API pubblica
> Lichess (`LichessService`), parsing in `core/lichess.ts` (URL `parseLichessStudyUrl`,
> split multi-capitolo `splitPgnGames`, mappatura `parseLichessStudyPgn` che riusa
> `parsePgnTree` di P13 e l'`[Orientation]` per il colore). Persistenza tramite il
> nuovo endpoint **transazionale** `POST /api/studies/import` (studio + varianti in
> blocco, validate da `VariantValidator`, rollback se un capitolo è illegale).
> L'import di un singolo capitolo dentro uno studio aperto riusa
> `POST /api/studies/{id}/variants`. I capitoli non parsabili (es. posizione di
> partenza non standard) finiscono in un elenco "saltati", senza bloccare gli altri.

### Decisione
L'app supportera' l'import di **studi pubblici Lichess** partendo dai link copiati
dal browser:

- `https://lichess.org/study/{studyId}` → importa tutti i capitoli pubblici
  disponibili nello studio;
- `https://lichess.org/study/{studyId}/{chapterId}` → importa solo il capitolo
  corrente.

Il recupero remoto usa gli endpoint PGN ufficiali Lichess:

- `GET https://lichess.org/api/study/{studyId}.pgn`
- `GET https://lichess.org/api/study/{studyId}/{chapterId}.pgn`

In Parte 2 l'import e' **solo pubblico e senza OAuth**: niente token Lichess nel
frontend e niente accesso a studi privati/unlisted. Il parser PGN avanzato di P13
resta l'unica sorgente per costruire `MoveNode[]`.

### Alternative valutate
- **OAuth Lichess (`study:read`) gia' in P14:** rinviato. Aumenta molto il
  perimetro (login, gestione token, sicurezza) e non serve per importare studi
  pubblici.
- **Proxy backend obbligatorio verso Lichess:** rinviato come fallback. Per il
  primo rilascio si usa fetch frontend diretto verso l'API pubblica; se emergono
  limiti CORS o requisiti infrastrutturali, il proxy puo' diventare una modifica
  successiva.
- **Import come sequenza `POST /studies` + molti `POST /variants`:** possibile
  ma scartato come scelta principale per gli studi completi, per evitare import
  parziali se un capitolo fallisce.

### Note di implementazione
- Il frontend valida il link e accetta solo path `/study/{studyId}` e
  `/study/{studyId}/{chapterId}` (eventuali query/slash finali vengono ignorati).
- Parametri Lichess consigliati: `comments=true`, `variations=true`,
  `orientation=true`, `clocks=false`.
- Lo studio Lichess completo restituisce un PGN multi-capitolo: il frontend lo
  divide in capitoli e passa ogni blocco al parser di P13.
- La persistenza locale consigliata e' `POST /api/studies/import`, endpoint
  transazionale che crea uno studio locale e tutte le varianti gia' parse; se un
  capitolo non supera la validazione backend, l'intero import viene annullato.
- Il link al capitolo, quando usato dal dettaglio di uno studio locale, puo'
  riusare `POST /api/studies/{id}/variants`.

### Conseguenze
- Gli studi Lichess diventano materiale allenabile locale senza introdurre
  multiutente, cloud o autenticazione.
- L'import e' una fotografia: non c'e' sincronizzazione con modifiche successive
  dello studio su Lichess.
- Errori remoti (`404`, studio non pubblico, `429` rate limit, rete) devono avere
  messaggi espliciti e non lasciare dati parziali.

---

## 0007 — Parsing PGN avanzato lato frontend (P13, R15)

**Data:** 2026-06-26 · **Stato:** Accettata · **Contesto:** Prototipo 13 (Parte 2), rischio R15.

### Decisione
L'import PGN con **varianti annidate** e' gestito da un parser **lato frontend**
dedicato (`core/pgn.ts`, `parsePgnTree`), non da `chess.js` ne' dal backend.
`chess.js` resta il motore di **regole** (legalita' e SAN canonico), ma non come
parser PGN: il suo `loadPgn` appiattisce le varianti e ne restituisce solo la
linea principale (`history()`), inadatto a costruire l'albero `MoveNode[]`.

### Alternative valutate
- **`chess.js.loadPgn` + `history()` (com'era in P6):** scartato — perde tutte le
  sotto-varianti tra parentesi, proprio l'oggetto di P13.
- **Parsing lato backend con libreria Java (chesslib):** scartato per coerenza con
  P6 (parsing client) e per tenere il backend semplice; la validazione di legalita'
  dell'albero importato resta comunque server-side (P7, riusata al salvataggio).

### Note di implementazione
- Tokenizer: rimuove testate `[...]`, commenti `{...}`/`; ...`, NAG `$n`, numeri di
  mossa e risultati; normalizza l'arrocco con zeri (`0-0`→`O-O`); isola le
  parentesi di variante.
- Semantica PGN delle parentesi: una `( ... )` e' **alternativa all'ultima mossa**.
  L'albero si costruisce con uno **stack di percorsi**: a `(` si torna alla
  posizione del padre (i figli diventano fratelli), a `)` si ripristina. Riusa
  `addChild` di `core/move-tree`.
- Pass di validazione/normalizzazione: replay ramo per ramo con `chess.js` dalla
  FEN del padre; ogni SAN viene riscritto nella forma canonica e una mossa
  illegale produce un errore leggibile nell'anteprima.
- L'anteprima mostra l'albero (mainline + varianti tra parentesi) riusando
  `buildTokens`, piu' un riepilogo "N mosse · M varianti".
- Il salvataggio invia `tree` (oltre a `moves` = mainline) e riusa
  `POST /api/variants` o `POST /api/studies/{id}/variants`; il backend valida e
  persiste l'albero (round-trip verificato live).

### Conseguenze
- I PGN ramificati diventano varianti ad albero allenabili, con i rami ritrovati
  nel dettaglio/editor.
- Il parser e' una base riusabile per l'import studio Lichess (P14, ADR 0006), che
  divide il PGN multi-capitolo e passa ogni blocco a `parsePgnTree`.
- Restano fuori (P13): PGN multi-partita in un singolo blocco, upload di file
  `.pgn` (solo incolla), e la conservazione di commenti/NAG (per ora scartati).

---

## 0008 — Sync studi Lichess: riferimento remoto + upsert + OAuth PKCE (P15)

**Data:** 2026-06-26 · **Stato:** Accettata e implementata (P15) · **Contesto:** Prototipo 15 (Parte 2), estende ADR 0006.

### Decisione
Gli studi importati da Lichess portano un **riferimento remoto persistente**
(`sourceProvider`, `sourceStudyId`, `sourceUrl`, `lastImportedAt` su `Study`).
Il re-import è un **upsert** per coppia `(sourceProvider, sourceStudyId)`: se lo
studio remoto è già presente localmente lo **aggiorna** sostituendo le varianti e
preservando i metadati locali (`name/description/color`); altrimenti lo crea. Gli
studi **privati/unlisted** si leggono via **OAuth Authorization Code + PKCE**
(client pubblico, scope `study:read`), col token tenuto **solo lato frontend**
(`sessionStorage`), mai persistito nel backend.

### Alternative valutate
- **Dedup per nome studio:** scartato — i nomi non sono univoci e l'utente può
  rinominare localmente; il riferimento remoto è stabile.
- **Aggiornare anche i metadati locali al re-import:** scartato — l'utente può aver
  rinominato/descritto lo studio localmente; il sync tocca solo le varianti.
- **Sostituzione varianti con diff puntuale:** scartato per il prototipo —
  delete+reinsert in transazione è semplice e sufficiente (atomico, niente stato
  parziale). Da rivalutare se servirà preservare progressi/allenamento per variante.
- **OAuth con client secret / proxy backend per il token:** non necessario per un
  client pubblico PKCE; eviterebbe di esporre il flusso ma aggiunge backend e
  segreti. Rinviato salvo necessità (es. refresh token server-side).
- **Endpoint generico `/import` riusato con upsert:** si è preferito un endpoint
  dedicato `POST /api/studies/import/lichess` per non cambiare la semantica
  "create-only" di `/import` (P14).

### Note di implementazione
- `StudyRepository.findBySourceProviderAndSourceStudyId` individua il duplicato.
  `StudyService.importLichess` (`@Transactional`) ritorna un `ImportResult`
  (studio + flag `created`); il controller risponde `201` (create) o `200` (update).
- Upsert: `variantService.deleteByStudyId` poi reinserimento dei capitoli correnti;
  la validazione scacchistica di ogni capitolo avviene **prima** (nel controller),
  così un capitolo illegale fallisce con `400` senza toccare le varianti esistenti.
- `LichessAuthService`: PKCE S256 con Web Crypto; `client_id` arbitrario
  (`webapp-scacchi`), `redirect_uri = origin + /lichess/callback`; token e PKCE
  verifier/state in `sessionStorage`. `LichessService` aggiunge `Authorization:
  Bearer` quando connesso; gli studi pubblici restano leggibili senza token.
- Frontend: anteprima con avviso create-vs-update (rileva il duplicato via
  `getStudies`), pulsante «Connetti/Disconnetti Lichess».

### Conseguenze
- Uno studio Lichess è ri-sincronizzabile senza duplicati, conservando le
  modifiche locali ai metadati.
- Il token Lichess vive solo nella sessione del browser; chiudendo la sessione va
  ri-autorizzato. Nessun segreto nel backend.
- Restano fuori (P15): sync automatico periodico, refresh token, multi-account,
  diff fine delle varianti, export verso Lichess.
- Verifica OAuth end-to-end richiede un account Lichess reale (login interattivo):
  non automatizzabile nei test né nel preview headless. **Verificata dall'utente il
  2026-06-26**: il flusso PKCE (autorizzazione su Lichess → callback → token →
  lettura studio) funziona.

---

## 0009 — Stockfish client-side (WASM/asm.js in Web Worker), perimetro limitato (P16, R18)

**Data:** 2026-06-27 · **Stato:** Accettata e implementata (P16) · **Contesto:** Prototipo 16 (Parte 2), rischio R18.

### Decisione
Stockfish gira **interamente lato client** in un **Web Worker**, senza alcuna
dipendenza backend né nuovi endpoint. Si usa il build **asm.js single-thread**
(`stockfish.js` di Stockfish 10, vendorizzato in `frontend/public/stockfish/`),
che **non** richiede `SharedArrayBuffer` né gli header di cross-origin isolation
(**COOP/COEP**). Il motore è disponibile **solo** come aiuto allo studio in
**dettaglio/editor** (toggle motore, barra di valutazione, "gioca contro il
computer" in una nuova tab) ed è **assente in allenamento**.

### Alternative valutate
- **`stockfish.wasm` multi-thread:** più veloce, ma richiede `SharedArrayBuffer`
  e quindi header COOP/COEP sul server — vincolo infrastrutturale non desiderato
  per un'app personale/locale. Scartato (fallback single-thread, come da R18).
- **`stockfish` v18 (NNUE):** più forte ma con file NNUE da decine di MB; eccessivo
  per una barra di valutazione e un avversario da studio. Scartato.
- **Motore lato backend (processo UCI o servizio):** contrario al principio
  "regole/motore lato client" e alla separazione FE/BE; introdurrebbe stato e
  risorse server. Scartato.
- **Build asm.js vs wasm single-thread:** scelto l'**asm.js single-file** (1.5MB)
  per massima robustezza: nessun file `.wasm` companion da fetchare, nessun
  problema di MIME/percorso; basta `new Worker('/stockfish/stockfish.js')`.

### Note di implementazione
- `StockfishService` (root): crea il worker in modo lazy, pilota l'UCI (`uci`,
  `isready`, `position fen ...`, `go depth/movetime`), espone `evaluation`,
  `thinking`, `available` (false se il worker non è caricabile → UI degrada).
- Parsing UCI puro e testato in `core/uci.ts` (`parseInfoLine`, `parseBestMove`,
  `formatEval`): lo score è convertito al punto di vista del Bianco e mappato su
  una frazione 0..1 per la barra.
- `EvalBar` (presentazionale) affiancata alla scacchiera in dettaglio/editor.
- "Gioca contro il computer": `window.open('/play?fen=...', '_blank')` → componente
  `PlayVsComputer` autonomo (stato passato via URL, nessuno stato condiviso fra tab);
  l'utente gioca il lato al tratto, il motore risponde con `go movetime`.
- **Vincolo invariante:** in allenamento non c'è alcun controllo del motore (per
  costruzione: `variant-training` non importa né `EvalBar` né `StockfishService`).
- Asset Stockfish (GPLv3) vendorizzato con `Copying.txt`/`ATTRIBUTION.md`.

### Conseguenze
- Nessun lavoro né dipendenza backend; la separazione FE/BE resta invariata.
- Funziona senza header speciali su qualunque hosting statico; più lento del
  multi-thread, ma adeguato a eval bar e avversario da studio.
- Verifica live (2026-06-27): in dettaglio il motore raggiunge prof. 14 con eval
  reale (es. +0.8); barra mostra/nascondi e on/off ok; in `/play` l'utente gioca
  1.e4 e il motore risponde (1...d5); in allenamento nessun controllo motore.
- Vincolo GPL da rispettare in caso di ridistribuzione dell'app (vedi attribution).
- Fuori perimetro (per scelta): suggerimento "mossa migliore", blunder detection,
  multi-PV, opening explorer — da valutare solo se emergeranno necessità reali.

---

## 0010 — Persistenza sessioni di allenamento (P17)

**Data:** 2026-06-27 · **Stato:** Accettata e implementata (P17) · **Contesto:** Prototipo 17 (Parte 2).

### Decisione
Ogni allenamento concluso viene registrato come **`TrainingSession`** (variante,
esito, numero errori, durata, `userId` nullable predisposto) con le singole mosse
tentate in **`TrainingMove`** (ply, mossa attesa, mossa giocata, corretta). Le
mosse sono figlie della sessione (`@OneToMany` con cascata e `orphanRemoval`):
si creano e si leggono insieme alla sessione. Endpoint `POST /api/training-sessions`
(registra) e `GET` (storico riepilogativo / dettaglio con mosse). Lo `studyId`
viene **denormalizzato** sulla sessione, risolto dalla variante al salvataggio,
per le future statistiche per studio (P18).

### Alternative valutate
- **FK semplice `session_id` + cascata manuale nel service** (come Study→Variant):
  scartata qui — le `TrainingMove` sono figlie naturali della sessione (non
  aggregati indipendenti), quindi `@OneToMany(cascade=ALL, orphanRemoval=true)` è
  più diretto e idiomatico.
- **Calcolo `studyId` a runtime con join variante→studio:** scartato — la variante
  potrebbe cambiare studio in futuro; denormalizzare lo studio al momento
  dell'allenamento fotografa il contesto reale ed è più semplice da filtrare.
- **Sessione senza mosse (solo conteggi):** scartata — salvare le singole mosse
  (incl. i tentativi sbagliati) abilita statistiche più ricche in P18 (mosse più
  problematiche) senza nuove tabelle.

### Note di implementazione
- `open-in-view: false` (scelta dell'app): le collezioni LAZY **non** sono
  accessibili fuori da una transazione. I metodi di lettura del service sono quindi
  `@Transactional(readOnly = true)`, altrimenti la mappatura del DTO (che tocca
  `moves`) solleva `LazyInitializationException`. Bug emerso in **verifica live**
  (i test lo mascheravano per via del `@Transactional` a livello di classe) e
  corretto.
- Lista = riepilogo (`moves` null, `moveCount`); dettaglio (`GET /{id}`) = con mosse.
- `POST` rifiuta payload senza variante o con esito non valido (`400`,
  `ValidationError`); variante inesistente → `404`.
- Frontend: il componente di allenamento registra il log delle mosse (tentativi
  inclusi) e invia la sessione a completamento, **una sola volta** e solo se è stata
  giocata almeno una mossa.

### Conseguenze
- Base dati pronta per statistiche (P18) e spaced repetition (P19).
- **Vincolo invariante ribadito (P16/P17):** in allenamento nessun aiuto del motore
  (niente barra di valutazione, niente gioca-vs-computer). L'allenamento serve solo
  a memorizzare le mosse.
- Verifica live (2026-06-27): completando l'allenamento di una variante, la sessione
  è registrata (`moveCount=8`, `studyId` risolto, mosse con ply corretti) e
  rileggibile via `GET` (lista filtrata e dettaglio).

---

## 0011 — Statistiche di allenamento aggregate lato server (P18)

**Data:** 2026-06-28 · **Stato:** Accettata e implementata (P18) · **Contesto:** Prototipo 18 (Parte 2).

### Decisione
Le metriche di allenamento (per variante e aggregate per studio) sono calcolate
**lato server** da `StatsService` sopra le sessioni P17, ed esposte da
`GET /api/stats/variants/{id}` e `GET /api/stats/studies/{id}`. Una variante/studio
senza allenamenti risponde **200 con metriche a zero** (non 404).

### Alternative valutate
- **Calcolo lato frontend dai dati grezzi delle sessioni:** scartato — la lista
  sessioni è un riepilogo (senza mosse), quindi le "mosse più sbagliate"
  richiederebbero N fetch di dettaglio (N+1). L'aggregazione server è più efficiente
  e centralizza la logica.
- **Query SQL aggregate (JPQL/native):** rinviate — per la scala personale, aggregare
  in Java dalle sessioni caricate (in transazione di lettura) è semplice e
  sufficiente; ottimizzabili se i dati cresceranno.
- **Tabella di metriche precalcolate:** non necessaria ora (i dati grezzi bastano,
  come previsto in sezione 7 del planning).

### Note di implementazione
- Metriche per variante: `sessionCount`, `completedCount`, `totalMistakes`,
  `avgMistakes`, `accuracy` (mosse corrette / totali, null se nessuna mossa),
  `lastTrainedAt`, `topMistakes` (mosse attese più spesso sbagliate, top 5).
- Studio: i totali sommano le sessioni con quello `studyId`; `variants[]` dà il
  dettaglio per variante. La validazione "lo studio somma le sue varianti" è
  garantita perché entrambi derivano dalle stesse sessioni.
- Letture `@Transactional(readOnly=true)` (mosse LAZY, vedi ADR 0010).
- Frontend: viste `/variants/:id/stats` e `/studies/:id/stats` (card metriche +
  evidenza mosse sbagliate + tabella per-variante); il nome variante nella tabella
  studio è risolto dal dettaglio studio già caricato (il backend stats resta
  name-free). Helper di formattazione puri e testati (`stats-format.ts`).

### Conseguenze
- L'utente vede metriche utili e corrette sui propri allenamenti, per variante e
  per studio, con evidenza delle mosse problematiche.
- Verifica live (2026-06-28): con 3 sessioni su una variante reale, la vista mostra
  3 allenamenti, 80% di precisione e "Nf3 3× sbagliata"; l'aggregato di studio somma
  correttamente la variante.
- Fuori perimetro (per scelta): analisi qualitativa col motore, confronto tra utenti
  (single-user), grafici complessi.

---

## 0012 — Spaced repetition con SM-2 semplificato e relearning "oggi" (P19)

**Data:** 2026-06-28 · **Stato:** Accettata e implementata (P19) · **Contesto:** Prototipo 19 (Parte 2), ultimo della roadmap.

### Decisione
La pianificazione delle ripetizioni usa una variante semplificata di **SM-2** (SuperMemo),
con una sola schedule per variante (`ReviewSchedule`: `easeFactor`, `intervalDays`,
`repetitions`, `nextReviewDate`, `lastReviewedAt`). L'esito di **ogni** allenamento concluso
aggiorna la schedule, dentro la stessa transazione che salva la sessione (P17). Endpoint:
`GET /api/reviews/due` (varianti dovute, con nome variante/studio risolti) e
`GET /api/reviews/variants/{id}` (schedule singola; **204** se la variante non è ancora
pianificata, così il frontend non genera errori in console).

### Voto di qualità e relearning
- Il voto SM-2 (0..5) è derivato dall'allenamento: sessione interrotta → 1; completata →
  `5 - errori`, con minimo 2. Soglia di promozione: qualità ≥ 3 (da **3 errori** in su l'esito
  è "negativo").
- Esito **positivo**: intervalli SM-2 classici (1 giorno, poi 6, poi `intervallo * easeFactor`),
  con tetto pratico a **6 giorni**; `easeFactor` aggiornato e mai sotto **1.3**.
- Esito **negativo** (adattamento "relearning"): azzera `repetitions` e imposta l'intervallo a
  **0**, cioè ripeti **oggi**. Così una variante appena sbagliata rientra subito nella lista
  "Ripeti oggi" (e la validazione "molti errori accorciano l'intervallo" è dimostrabile senza
  attendere giorni).

### Alternative valutate
- **Algoritmo più ricco (SM-2+ / FSRS):** sovradimensionato per uso personale single-user;
  SM-2 semplificato è trasparente, testabile e sufficiente.
- **Intervallo minimo 1 anche sui fallimenti (SM-2 puro):** scartato — avrebbe reso la coda
  "Ripeti oggi" sempre vuota subito dopo l'allenamento, poco utile come ripasso immediato e
  difficile da verificare. Il relearning a 0 giorni risolve entrambi.
- **Campi sulla `Variant` invece di una tabella dedicata:** scartato — `ReviewSchedule`
  separata (come previsto in sezione 7 del planning) tiene la variante pulita e isola lo stato
  di apprendimento.

### Note di implementazione
- `ReviewScheduler` è **logica pura** (niente Spring/JPA): `quality(...)` e `next(...)` con
  unit test dedicati; il servizio si limita a persistere l'esito.
- `studyId` denormalizzato sulla schedule (come per le sessioni P17), utile per future viste.
- Le schedule **orfane** (variante eliminata) sono ignorate in lettura, coerentemente con
  sessioni/statistiche che non sono cancellate a cascata (scelta pragmatica single-user).
- Frontend: vista `/reviews` ("Ripeti oggi" con avvio rapido del training), badge conteggio
  in home, e indicatore "prossima ripetizione" nel dettaglio variante; helper di formattazione
  puri e testati (`review-format.ts`).
- Aggiornamento 2026-06-29: `ReviewScheduler.MAX_INTERVAL_DAYS = 6` garantisce che anche
  molte ripetizioni corrette consecutive non spostino la prossima ripetizione oltre 6 giorni.
  Il changeset Liquibase `0002-cap-review-schedules` normalizza anche le schedule gia'
  persistite con intervalli o date future fuori limite.

### Conseguenze
- Il ciclo di ripetizione spaziata funziona end-to-end in locale single-user (criterio P19).
- Verifica live (2026-06-28): variante non allenata → 204; sessione completata con 4 errori →
  schedule a 0 giorni, dovuta oggi (`easeFactor` 2.5→2.18) e presente in "Ripeti oggi"; sessione
  pulita su un'altra variante → ripetizione a domani (`easeFactor` 2.5→2.6), non dovuta. Le viste
  mostrano badge "Ripeti oggi 1", la card "Da ripetere oggi" e l'indicatore di dettaglio.
- Fuori perimetro (per scelta): notifiche push/email, sincronizzazione multi-dispositivo (cloud,
  terza tornata).

---

## 0013 — Migrazioni di schema versionate con Liquibase (ISSUE-019)

**Data:** 2026-06-29 · **Stato:** Accettata e implementata · **Contesto:** prima issue della terza tornata (infrastruttura), prerequisito per PostgreSQL e per ogni modifica al modello dati.

### Decisione
Lo schema del database è gestito da **Liquibase**, non più da Hibernate `ddl-auto`. Changelog in `backend/src/main/resources/db/changelog/` (`db.changelog-master.yaml` con `include` espliciti; baseline `changes/0001-baseline.yaml` = fotografia delle 5 tabelle attuali). `ddl-auto: none` su dev e test. Specifica e decisioni di dettaglio (D1–D6): [`docs/specs/liquibase.md`](../specs/liquibase.md).

### Punti chiave
- **Precondizione `MARK_RAN`** sul baseline (`not tableExists variant`): un solo changelog vale sia su DB nuovo (esegue e crea lo schema) sia sul `scacchi.mv.db` di esempio committato / DB dev esistenti (lo registra come applicato senza rieseguirlo). Il DB di esempio è stato ri-committato una volta con `DATABASECHANGELOG`.
- **`ddl-auto: none` (non `validate`):** su H2 le colonne `columnDefinition="text"` diventano `CLOB` mentre Hibernate validate si aspetta `VARCHAR` (attrito noto sul keyword `text`). Liquibase è la sola fonte dello schema; i 66 test CRUD fanno da rete.
- **Modulo `spring-boot-liquibase`:** in Spring Boot 4 l'auto-config Liquibase è in un modulo dedicato, non più in `spring-boot-autoconfigure`; il solo `liquibase-core` non attiva nulla.
- **Tipi astratti** nel changelog (`VARCHAR`, `CLOB`, `BIGINT`, `BOOLEAN`, `TIMESTAMP`, `DATE`) per la portabilità verso PostgreSQL.

### Alternative valutate
- **Mantenere `ddl-auto=update`:** scartata — drift silenzioso e non ripetibile tra postazioni (già emerso su `source_pgn`, vedi area delicata).
- **Flyway:** equivalente; Liquibase scelto per i changelog dichiarativi (YAML) e le precondizioni, comode per la convivenza col DB di esempio.
- **Smettere di tracciare il DB di esempio:** scartata — si perderebbero i dati di esempio ricchi; il `MARK_RAN` permette di tenerli.

### Conseguenze
- Schema ripetibile e versionato su ogni postazione; baseline pronta per la migrazione a PostgreSQL.
- Ogni modifica di schema è un nuovo changeset (`NNNN-*.yaml`), mai un ALTER manuale o la modifica di un changeset rilasciato. Convenzione in [`backend/README.md`](../../backend/README.md).
- Verifica (2026-06-29): 66 test backend verdi (baseline eseguito su H2 in-memory); avvio dev sul DB committato → log `MARK_RAN`, nessuna ricreazione, 11 studi intatti.
