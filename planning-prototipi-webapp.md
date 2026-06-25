# Planning prototipi - WebApp Scacchi

> Documento di planning operativo per lo sviluppo incrementale della webapp.
> Fonti di contesto: `preanalisi-progetto.md` (obiettivo, stack, versioni, vincoli) e `CLAUDE.md` (contesto operativo e collaborazione).
> Questo documento **non** ridefinisce stack o versioni: li dà per acquisiti e li usa come base.

---

## 1. Strategia generale

La strategia è costruire la webapp per **prototipi incrementali, piccoli e verificabili**, ciascuno funzionante in locale e validabile a mano in pochi minuti.

Principi guida:

- **Sviluppo locale prima di tutto.** H2 in memoria + Angular dev server. Nessun deploy, nessuna autenticazione, nessun servizio esterno nei primi prototipi.
- **Due workstream paralleli + uno di integrazione.** Backend e frontend avanzano in parallelo grazie a contratti API concordati in anticipo (sezione 6). Il frontend non aspetta il backend: parte con mock e li sostituisce quando l'endpoint reale è pronto.
- **Integrazione progressiva.** Ogni prototipo ha un momento esplicito in cui il mock frontend viene sostituito dalla chiamata reale.
- **Validazione manuale a ogni step.** Ogni prototipo si chiude solo quando un test manuale concreto passa.
- **Rinvio consapevole.** Spaced repetition, reportistica, import PGN robusto, Supabase (DB e Auth) e Docker sono progettati *come direzione* ma non implementati finché il nucleo "allena una variante" non funziona.
- **No over-engineering.** Niente astrazioni premature, niente layer inutili. Si introduce complessità solo quando un prototipo la richiede.

Logica di fondo: arrivare presto al loop minimo *"ho una variante → la visualizzo → la alleno → l'app mi dice se la mossa è giusta → completo la variante"*. Tutto il resto è successivo.

### Struttura del repository — vincolo non negoziabile

**Frontend e backend risiedono in due cartelle/progetti distinti e non vanno mai mescolati.**

- Due alberi di progetto separati, ciascuno con il proprio sistema di build:
  - `backend/` → progetto Maven Spring Boot (`pom.xml`, `src/main/java`, ...).
  - `frontend/` → progetto Angular (`package.json`, `angular.json`, `src/app`, ...).
- Nessuna dipendenza di build incrociata: il backend non costruisce il frontend e viceversa. Nessun `package.json` dentro `backend/`, nessun `pom.xml` dentro `frontend/`.
- I due progetti comunicano **solo** via HTTP (contratto REST della sezione 6), mai per import diretto di file.
- Le dipendenze restano isolate: `node_modules` solo lato frontend, dipendenze Maven solo lato backend.
- Questa separazione è la stessa che renderà naturale, in futuro, una containerizzazione Docker con due immagini distinte (vedi rischio R10). Non va compromessa per comodità nei prototipi.

> Nota: la struttura esatta (mono-repo con due cartelle vs due repository git separati) è una decisione aperta; in entrambi i casi i **progetti** restano fisicamente separati. Per lo sviluppo locale incrementale un mono-repo con `backend/` e `frontend/` affiancati è il default consigliato.

---

## 2. Roadmap per prototipi

Sequenza ordinata. Ogni prototipo è un passo piccolo che abilita il successivo.

| # | Prototipo | Obiettivo sintetico | Valore prodotto |
|---|-----------|---------------------|-----------------|
| 0 | **Scaffolding & hello-world** | Backend e frontend partono e si parlano | Fondamenta verificabili (CORS, ping) |
| 1 | **Scacchiera renderizzata** | Mostrare una scacchiera e muovere i pezzi (solo legalità) | UI scacchistica funzionante, nessuna logica di variante |
| 2 | **Variante hardcoded visualizzata** | Backend espone 1 variante, frontend la mostra | Prima variante reale che attraversa lo stack |
| 3 | **Training loop (PRIMO MVP)** | Allenare la variante: verifica mossa giusta/sbagliata, completa la linea | Loop di allenamento completo end-to-end |
| 4 | **Persistenza varianti (CRUD)** | Creare/elencare/cancellare varianti su H2 | Varianti non più hardcoded, gestione dati reale |
| 5 | **Inserimento variante mossa-per-mossa** | Creare una variante muovendo sulla scacchiera | Input manuale delle aperture |
| 6 | **Import PGN base** | Creare una variante da una stringa PGN | Secondo metodo di input previsto dal progetto |
| 7+ | **Consolidamento + Studi + Apprendimento + Motore** | Validazione albero, studi/gruppi, statistiche, spaced repetition, Stockfish | Pianificati nella **Parte 2** (sezioni 11-19) |

**Dettaglio per prototipo:**

### Prototipo 0 - Scaffolding & hello-world
- **Obiettivo:** avere i due progetti che compilano, partono e comunicano.
- **Valore:** elimina subito i rischi infrastrutturali (porte, CORS, build).
- **Provabile:** `GET /api/ping` risponde `pong`; la home Angular mostra il risultato del ping.
- **Dipendenze:** nessuna.
- **Escluso:** qualsiasi logica scacchistica.

### Prototipo 1 - Scacchiera renderizzata
- **Obiettivo:** integrare una libreria scacchiera nel frontend e muovere pezzi legalmente.
- **Valore:** la parte UI più rischiosa è risolta presto.
- **Provabile:** trascino un pedone, la mossa illegale viene rifiutata.
- **Dipendenze:** P0 (solo per avere il progetto Angular pronto).
- **Escluso:** comunicazione col backend, concetto di "variante".

### Prototipo 2 - Variante hardcoded visualizzata
- **Obiettivo:** il backend serve una variante fissa; il frontend la carica e la mostra (es. lista mosse + scacchiera alla posizione iniziale).
- **Valore:** primo dato che attraversa tutto lo stack tramite il contratto API reale.
- **Provabile:** apro la pagina, vedo nome variante e sequenza mosse arrivate da `GET /api/variants/1`.
- **Dipendenze:** P0 (stack), P1 (scacchiera).
- **Escluso:** persistenza, training, creazione.

### Prototipo 3 - Training loop (PRIMO MVP)
- **Obiettivo:** avviare una sessione di allenamento sulla variante e verificare ogni mossa contro la linea attesa.
- **Valore:** il cuore dell'app. Loop completo.
- **Provabile:** avvio training, muovo; se la mossa coincide con la linea attesa avanza, altrimenti segnala errore; al termine la variante è "completata".
- **Dipendenze:** P2.
- **Escluso:** persistenza dei risultati, spaced repetition, statistiche.

### Prototipo 4 - Persistenza varianti (CRUD)
- **Obiettivo:** spostare le varianti da hardcoded a H2 con CRUD minimo.
- **Valore:** dati reali e gestibili.
- **Provabile:** creo una variante via API/UI, la rileggo dalla lista, la cancello.
- **Dipendenze:** P2 (contratto variante già definito).
- **Escluso:** validazione legale lato backend avanzata, import PGN.

### Prototipo 5 - Inserimento variante mossa-per-mossa
- **Obiettivo:** costruire una variante muovendo sulla scacchiera e salvandola.
- **Valore:** primo metodo di input previsto dal progetto.
- **Provabile:** entro in "nuova variante", gioco 1.e4 e5 2.Cf3..., salvo, la ritrovo nella lista e la posso allenare.
- **Dipendenze:** P1 (scacchiera), P4 (persistenza).
- **Escluso:** import PGN, editing avanzato (sotto-varianti/alberi).

### Prototipo 6 - Import PGN base
- **Obiettivo:** creare una variante incollando una stringa PGN di una singola linea principale.
- **Valore:** secondo metodo di input.
- **Provabile:** incollo un PGN semplice, l'app crea la variante allenabile.
- **Dipendenze:** P4 (persistenza), P5 (modello mosse consolidato).
- **Escluso:** PGN con varianti annidate, commenti, NAG, header complessi.

### Prototipo 7+ - Avanzate (solo direzione)
Spaced repetition, statistiche/report, multi-utente con Supabase Auth, migrazione a Supabase PostgreSQL, Docker. Pianificati nelle sezioni 7-8, **non** nei prototipi attivi.

---

## 3. Planning dettagliato di ogni prototipo

### Prototipo 0 - Scaffolding & hello-world

#### Obiettivo
Due progetti **fisicamente separati** (`backend/` Spring Boot, `frontend/` Angular — vedi vincolo struttura repository in sezione 1) che partono in locale e comunicano via HTTP, con CORS configurato per l'ambiente di sviluppo.

#### Risultato funzionante atteso
Backend su `http://localhost:8080`, frontend su `http://localhost:4200`. La home Angular chiama `GET /api/ping` e mostra `pong`. Le due cartelle hanno build indipendenti e nessuna dipendenza incrociata.

#### Backend workstream
- Progetto Spring Boot (Java 21, Spring Boot 4.1.0) generato nella cartella `backend/` via start.spring.io o Maven archetype. Dipendenze: `spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `h2`.
- `PingController` con `GET /api/ping` → `{ "status": "pong" }`.
- Configurazione CORS dev per `http://localhost:4200`.
- H2 in memoria configurata in `application.yml` (anche se non ancora usata), console H2 abilitata.
- Nessuna entità ancora.

#### Frontend workstream
- Progetto Angular 22.x generato nella cartella `frontend/` con **CLI locale al progetto** (via `npx @angular/cli new ...`), nessuna CLI globale.
- Servizio `ApiService` con metodo `ping()`.
- Componente home che mostra l'esito del ping.
- Configurazione `proxy.conf.json` o base URL ambiente per puntare a `:8080`.
- (Opzionale, anticipabile) impostare i **token visivi** del riferimento Lovable (vedi preanalisi: palette pergamena, colori case `#f0d9b5`/`#b58863`, token legno/ottone) come variabili CSS globali, così da averli pronti per il Prototipo 1.

#### Integration workstream
- Contratto: `GET /api/ping` → `{ status: string }`.
- Verifica CORS reale (no mock): la chiamata parte dal browser, non da curl.

#### Validazione del prototipo
1. Avvio backend (`mvn spring-boot:run`), verifico log "Started".
2. Apro `http://localhost:8080/api/ping` → vedo `pong`.
3. Avvio frontend (`npm start`), apro `http://localhost:4200`.
4. La pagina mostra `pong` (nessun errore CORS in console).
5. Apro la console H2 e verifico la connessione al DB in memoria.

#### Criteri di completamento
Entrambi i progetti partono con un comando, il ping passa dal browser senza errori CORS, i repository sono in git.

#### Cosa non fare ancora
Nessuna entità, nessuna scacchiera, nessuna libreria scacchi, nessun layout/UX curato.

---

### Prototipo 1 - Scacchiera renderizzata

#### Obiettivo
Integrare nel frontend una libreria scacchiera + un motore di regole, e permettere mosse legali sulla posizione iniziale.

#### Risultato funzionante atteso
Una scacchiera interattiva: i pezzi si muovono via drag/click, le mosse illegali sono rifiutate, lo stato (FEN) è leggibile.

#### Backend workstream
- **Nessuna attività obbligatoria.** Il prototipo è puramente frontend. (Workstream backend libero di avanzare su P2 in parallelo: vedi note dipendenze.)

> **Indicazioni già fissate dalla preanalisi** (sezione "Riferimento frontend iniziale"), che riducono il rischio R1:
> - **Regole/PGN:** usare `chess.js` (confermato come dipendenza frontend).
> - **Rendering:** in prima fase **una libreria scacchiera compatibile con Angular** (NON `react-chessboard`, legata a React), che permetta controllo di FEN, orientamento, stile case e pezzi. Scacchiera custom Angular/CSS/SVG come possibile evoluzione futura se la libreria non desse abbastanza controllo visivo.
> - **Pezzi:** stile classico Staunton via asset SVG, per avvicinarsi ai pezzi predefiniti del prototipo.
> - **Aspetto:** applicare i token visivi (case `#f0d9b5`/`#b58863`, cornice legno, palette pergamena/ottone) definiti nella preanalisi.

#### Frontend workstream
- Integrazione `chess.js` come motore di regole/legalità e parsing (scelta confermata dalla preanalisi).
- Scelta attuata per il rendering: componente custom Angular/CSS/SVG, documentato in `decisioni-tecniche.md`. Criteri coperti: controllo di FEN/orientamento, stile case configurabile, pezzi SVG Staunton, click, drag and drop e promozione.
- Componente `ChessboardComponent` riusabile: input posizione (FEN), output evento `moveMade` (mossa in formato SAN + FEN risultante).
- Applicare i **token visivi** del riferimento Lovable: colori case `#f0d9b5` (chiare) / `#b58863` (scure), cornice effetto legno, coordinate `a-h`/`1-8` come nello screenshot.
- Stato locale minimo dentro il componente (istanza del motore di gioco).

#### Integration workstream
- Nessuna integrazione col backend. Si **definisce però** il formato mossa che useremo ovunque (decisione: sezione 8, rischio R2): scelta consigliata **SAN** per leggibilità + FEN per la posizione.

#### Validazione del prototipo
1. Apro la pagina scacchiera.
2. La scacchiera ha l'aspetto del riferimento (case crema/marrone, cornice legno, coordinate).
3. Muovo e2-e4: accettata.
4. Provo una mossa illegale (es. Re1-e3): rifiutata.
5. Verifico che il componente emetta SAN corretto (`e4`) e FEN aggiornata.

#### Criteri di completamento
La scacchiera renderizza con l'aspetto del riferimento Lovable, accetta solo mosse legali ed emette mossa SAN + FEN. Componente isolato e riusabile.

#### Cosa non fare ancora
Nessun collegamento alle varianti, nessun training, nessuna persistenza, niente promozione/scelta pezzo elaborata oltre il default a Donna (se la libreria lo gestisce di default va bene). Il layout completo a pannelli (lista mosse + PGN + controlli replay) arriva nel Prototipo 2.

---

### Prototipo 2 - Variante hardcoded visualizzata

#### Obiettivo
Il backend espone una variante fissa; il frontend la carica e la mostra usando il contratto API definitivo.

#### Risultato funzionante atteso
Pagina che mostra nome variante e lista mosse, con scacchiera alla posizione iniziale, dati provenienti da `GET /api/variants/{id}`.

#### Backend workstream
- DTO `VariantDto` (vedi sezione 6): `id`, `name`, `moves[]` (lista SAN), campi predisposti `color`, `startingFen` (default posizione iniziale).
- `VariantController` con `GET /api/variants` (lista) e `GET /api/variants/{id}` (dettaglio).
- `VariantService` che restituisce **1 variante hardcoded** (es. Italiana: e4 e5 Cf3 Cc6 Ac4).
- Nessun repository/DB ancora (dati in memoria nel service).

#### Frontend workstream
- Modello TypeScript `Variant` allineato a `VariantDto`.
- `VariantService` Angular con `getVariants()` e `getVariant(id)`.
- Pagina/lista varianti + pagina dettaglio che usa `ChessboardComponent` (da P1) in sola visualizzazione.
- **Layout a pannelli del riferimento Lovable** (vedi screenshot/preanalisi): scacchiera grande a sinistra, pannello "Mosse" a destra con la lista numerata, controlli di navigazione/replay sotto la scacchiera (inizio, indietro, auto-play, avanti, fine, reset) con navigazione anche da tastiera (← →). Il pannello "Carica PGN" può essere predisposto come segnaposto, ma l'import vero arriva nel Prototipo 6.
- Ricostruzione dello storico posizioni come lista di FEN (via `chess.js`) per permettere lo scorrimento mossa-per-mossa, come nel componente di riferimento.
- Mock iniziale opzionale: il frontend può partire con un JSON mock identico al DTO, **da sostituire** con la chiamata reale entro fine prototipo.

#### Integration workstream
- Endpoint coinvolti: `GET /api/variants`, `GET /api/variants/{id}`.
- DTO scambiato: `VariantDto`.
- Mock → reale: si parte dal mock JSON, si sostituisce con `HttpClient` quando il controller risponde.

#### Validazione del prototipo
1. Avvio backend, chiamo `GET /api/variants/1` (browser/curl) → JSON corretto.
2. Avvio frontend, apro lista → vedo la variante.
3. Apro dettaglio → vedo nome + lista mosse nel pannello + scacchiera, con l'aspetto del riferimento.
4. Uso i controlli di replay (avanti/indietro/auto-play) e la tastiera per scorrere le mosse.
5. Verifico in Network tab che i dati arrivino dal backend, non dal mock.

#### Criteri di completamento
La variante hardcoded attraversa tutto lo stack e si vede nel frontend tramite il contratto reale, con il layout a pannelli e i controlli di replay del riferimento Lovable funzionanti.

#### Cosa non fare ancora
Niente persistenza, niente training, niente creazione/modifica varianti.

---

### Prototipo 3 - Training loop (PRIMO MVP)

#### Obiettivo
Allenare la variante: l'app propone di giocare la linea, valida ogni mossa contro quella attesa, segnala errore/correttezza e riconosce il completamento.

#### Risultato funzionante atteso
L'utente avvia il training, gioca le mosse; mossa corretta → avanza (ed eventualmente l'app risponde con la mossa avversaria automatica); mossa sbagliata → feedback di errore senza avanzare; fine linea → "variante completata".

#### Backend workstream
Due opzioni, **scelta consigliata: validazione lato frontend** per il MVP (più semplice, la linea attesa è già nota al client). Backend opzionale:
- (Consigliato MVP) Nessuna nuova logica backend: la linea attesa è nel `VariantDto` già scaricato, il frontend confronta.
- (Alternativa, se si vuole logica server) `POST /api/variants/{id}/training/check` con `{ moveIndex, move }` → `{ correct, expectedMove?, finished }`. Da rimandare se non necessario.

#### Frontend workstream
- `TrainingComponent` che gestisce lo stato della sessione: indice mossa corrente, lista attesa, esito.
- Logica di confronto mossa giocata (SAN da `ChessboardComponent`) vs mossa attesa.
- Risposta automatica della mossa avversaria quando la mossa dell'utente è corretta (training "dal lato del bianco" o del nero).
- Feedback UI: evidenzia mossa giusta/sbagliata, contatore progresso, stato "completata".
- Gestione stato minima: stato di sessione tenuto nel componente/servizio, **niente persistenza**.

#### Integration workstream
- Se validazione lato frontend: nessun nuovo endpoint, si riusa `GET /api/variants/{id}`.
- Predisposizione: il contratto `training/check` è documentato (sezione 6) ma implementato solo se serve.
- Quando in futuro si vorrà tracciare i risultati, si aggiungerà `POST /api/training-sessions` (rinviato).

#### Validazione del prototipo
1. Apro la variante, premo "Allena".
2. Gioco la prima mossa corretta → avanza, l'app risponde con la mossa avversaria.
3. Gioco una mossa sbagliata → feedback di errore, non avanza.
4. Completo tutta la linea → messaggio "variante completata".
5. Riavvio il training → riparte da capo.

#### Criteri di completamento
Il loop completo "avvia → muovi → verifica → completa" funziona in locale end-to-end. **Questo chiude il primo MVP (sezione 4).**

#### Cosa non fare ancora
Niente salvataggio risultati, niente spaced repetition, niente statistiche, niente gestione di linee multiple/alberi.

---

### Prototipo 4 - Persistenza varianti (CRUD)

#### Obiettivo
Spostare le varianti da hardcoded a H2 con CRUD minimo, mantenendo invariato il contratto API verso il frontend.

#### Risultato funzionante atteso
Creazione, elenco, lettura e cancellazione di varianti persistite in H2; il frontend continua a funzionare senza modifiche al contratto.

#### Backend workstream
- Entità JPA `Variant` (vedi sezione 7, modello MVP): `id`, `name`, `color`, `moves` come mainline serializzata e `tree` come albero serializzato.
- `VariantRepository` (Spring Data JPA).
- `VariantService` rifattorizzato per usare il repository al posto del dato hardcoded.
- `VariantController`: aggiunti `POST /api/variants` e `DELETE /api/variants/{id}`.
- Seed iniziale: caricare 1-2 varianti di default all'avvio (data initializer) così la lista non è mai vuota.
- Validazioni minime: `name` non vuoto, `moves` non vuota.

#### Frontend workstream
- `VariantService` Angular: aggiunti `createVariant()` e `deleteVariant()`.
- UI lista: pulsante elimina + (semplice) form/azione di creazione di test (anche solo JSON per ora; l'editor visuale arriva in P5).
- Nessun cambio ai modelli TS (il DTO resta lo stesso).

#### Integration workstream
- Endpoint: `GET/POST /api/variants`, `GET/DELETE /api/variants/{id}`.
- DTO invariato (`VariantDto`); per la creazione si introduce `CreateVariantRequest` (vedi sezione 6).
- Il mock non serve più: tutto reale.

#### Validazione del prototipo
1. Avvio backend → seed presente, `GET /api/variants` mostra le varianti di default.
2. `POST /api/variants` con una nuova variante → 201 + id.
3. Riavvio frontend → la nuova variante compare nella lista.
4. Apro la console H2 → vedo la riga nella tabella.
5. `DELETE` della variante → sparisce dalla lista.
6. Il training (P3) funziona su una variante caricata da DB.

#### Criteri di completamento
Le varianti vivono in H2, il CRUD funziona, il training gira su dati persistiti, il contratto verso il frontend è invariato.

#### Cosa non fare ancora
Niente Supabase, niente migrazioni Flyway (rimandabili), niente import PGN, niente editor visuale completo.

---

### Prototipo 5 - Inserimento variante mossa-per-mossa

#### Obiettivo
Creare una nuova variante muovendo i pezzi sulla scacchiera e salvandola su H2.

#### Risultato funzionante atteso
Modalità "nuova variante": l'utente gioca una sequenza legale, dà un nome, sceglie il colore, salva; la variante diventa subito allenabile.

#### Backend workstream
- Nessuna nuova entità (riusa P4). Eventuale rafforzamento validazioni: sequenza mosse non vuota, nome univoco (opzionale).
- (Opzionale, rimandabile) Validazione legalità lato server della sequenza ricevuta — di default ci si fida del frontend nel MVP.

#### Frontend workstream
- `VariantEditorComponent`: usa `ChessboardComponent` in modalità "registrazione", accumula le mosse SAN man mano che vengono giocate.
- Controlli: undo ultima mossa, reset, campo nome, scelta colore di allenamento.
- `VariantService.createVariant()` (da P4) per salvare.
- Stato locale: lista mosse in costruzione.

#### Integration workstream
- Endpoint: `POST /api/variants` con `CreateVariantRequest` (name, color, moves[]).
- Nessun mock: integrazione diretta sul CRUD di P4.

#### Validazione del prototipo
1. Entro in "Nuova variante".
2. Gioco 1.e4 e5 2.Cf3 Cc6 3.Ac4, uso undo per correggere una mossa.
3. Inserisco nome "Italiana base", colore bianco, salvo.
4. La variante compare in lista.
5. La apro e la alleno (P3) con successo.

#### Criteri di completamento
Si può creare una variante interamente dalla scacchiera e allenarla subito, dati persistiti.

#### Cosa non fare ancora
Niente import PGN, niente alberi/sotto-varianti, niente editing di una variante esistente (solo creazione).

---

### Prototipo 6 - Import PGN base

#### Obiettivo
Creare una variante incollando una stringa PGN di una singola linea principale.

#### Risultato funzionante atteso
Campo "incolla PGN" → parsing → variante allenabile salvata su H2.

#### Backend workstream
Due opzioni (decisione sezione 8, rischio R5):
- (Consigliato) Parsing PGN **lato frontend** con la libreria già presente (`chess.js` carica PGN), poi invio della lista mosse SAN al solito `POST /api/variants`. Backend invariato.
- (Alternativa) Endpoint `POST /api/variants/import-pgn` che fa il parsing server-side. Da preferire solo se si vuole logica condivisa; rimandabile.

#### Frontend workstream
- `PgnImportComponent`: textarea PGN, anteprima mosse parse-ate, nome (auto da header PGN se presente), salva.
- Uso del motore di regole per validare/normalizzare il PGN in lista SAN.
- Gestione errori: PGN non valido → messaggio chiaro.

#### Integration workstream
- Endpoint: `POST /api/variants` (riuso) con le mosse derivate dal PGN.
- Predisposizione campo `sourcePgn` nel DTO/entità per conservare l'originale (utile in futuro).

#### Validazione del prototipo
1. Incollo un PGN semplice (sola linea principale).
2. Vedo l'anteprima mosse corretta.
3. Salvo → variante in lista.
4. La alleno con successo.
5. Incollo un PGN malformato → errore gestito, nessun crash.

#### Criteri di completamento
Una variante può nascere da PGN base ed essere allenata.

#### Cosa non fare ancora
Niente PGN con varianti annidate, commenti, NAG o multi-partita; niente import di file `.pgn`; niente alberi.

---

## 4. Primo MVP consigliato

**Il primo MVP coincide con il Prototipo 3 (Training loop).**

- **Funzionalità incluse:**
  - Una (o poche) variante di apertura disponibile (hardcoded nel backend).
  - Visualizzazione della variante (nome + mosse + scacchiera).
  - Avvio sessione di allenamento.
  - Inserimento mossa sulla scacchiera (drag/click) con sola legalità garantita.
  - Verifica della mossa contro la linea attesa (giusta/sbagliata).
  - Completamento della variante con feedback finale.
- **Funzionalità escluse:** persistenza dei risultati, CRUD varianti, inserimento manuale, import PGN, spaced repetition, statistiche, autenticazione, Docker, Supabase.
- **Dati usati:** 1 variante **hardcoded** nel `VariantService` backend (es. Italiana). Nessun DB necessario per il loop.
- **Livello di persistenza:** **nessuno** per i risultati; la variante è in memoria lato backend. (H2 è già configurata da P0 ma non indispensabile per questo MVP.)
- **Interazione utente:** apre la variante → "Allena" → muove i pezzi → riceve feedback → completa.
- **Validazione manuale:** sequenza di test del Prototipo 3 (mossa giusta avanza, mossa sbagliata segnala, completamento riconosciuto).
- **Perché è il miglior primo traguardo:** dimostra il **valore centrale dell'app** (allenare una variante con controllo automatico degli errori) attraversando tutto lo stack reale (backend → API → frontend → scacchiera), ma con il minimo di complessità: nessuna persistenza, nessun input complesso. Tutto ciò che viene dopo (CRUD, input manuale, PGN, ripetizione) è un'estensione di un nucleo già funzionante e validato.

---

## 5. Sequenza operativa dei task

Task piccoli (~1 ora), assegnabili ad agenti AI. Legenda area: **BE** backend, **FE** frontend, **INT** integrazione, **DOC** documentazione, **REV** review.

### Prototipo 0
| ID | Titolo | Area | Scopo | Input | Output | Dipendenze | Validazione | Parallelo |
|----|--------|------|-------|-------|--------|------------|-------------|-----------|
| T0.1 | Scaffold backend Spring Boot in `backend/` | BE | Progetto base + H2 + CORS (cartella separata) | preanalisi (versioni) | progetto che parte su :8080 | — | `mvn spring-boot:run` ok, nessun file FE in `backend/` | con T0.2 |
| T0.2 | Scaffold frontend Angular in `frontend/` (CLI locale) | FE | Progetto base + proxy (cartella separata) | preanalisi (versioni) | progetto che parte su :4200 | — | `npm start` ok, nessun file BE in `frontend/` | con T0.1 |
| T0.3 | Endpoint `/api/ping` | BE | Ping di salute | T0.1 | controller + risposta | T0.1 | `pong` da browser | no |
| T0.4 | Home con chiamata ping | FE | Verifica integrazione | T0.2 | ApiService + home | T0.2 | pagina mostra pong | no |
| T0.5 | Verifica CORS end-to-end | INT | Confermare comunicazione | T0.3, T0.4 | ping dal browser ok | T0.3, T0.4 | no errori CORS | no |

### Prototipo 1
| ID | Titolo | Area | Scopo | Input | Output | Dipendenze | Validazione | Parallelo |
|----|--------|------|-------|-------|--------|------------|-------------|-----------|
| T1.1 | Scelta board Angular (regole già = `chess.js`) | REV/DOC | Scegliere *quale* board Angular vs token visivi | sezione 8 R1/R12 + preanalisi | decisione scritta | T0.2 | decisione approvata | no |
| T1.2 | `ChessboardComponent` rendering + token visivi | FE | Mostrare scacchiera in stile riferimento | T1.1 | componente | T1.1 | scacchiera con case `#f0d9b5`/`#b58863` e cornice legno | no |
| T1.3 | Integrazione motore regole (legalità) | FE | Mosse legali + SAN/FEN | T1.2 | mosse validate, eventi | T1.2 | illegale rifiutata | no |

### Prototipo 2
| ID | Titolo | Area | Scopo | Input | Output | Dipendenze | Validazione | Parallelo |
|----|--------|------|-------|-------|--------|------------|-------------|-----------|
| T2.1 | Definire `VariantDto` + contratto | INT/DOC | Concordare API | sezione 6 | DTO documentato | T0.5 | contratto approvato | con T1.* |
| T2.2 | `VariantController` + service hardcoded | BE | Servire 1 variante | T2.1 | GET list/detail | T2.1 | JSON corretto | con T2.3 |
| T2.3 | `VariantService` Angular + modello TS | FE | Consumare API | T2.1 | service + modello | T2.1 | mock funziona | con T2.2 |
| T2.4 | Pagina dettaglio + layout a pannelli | FE | Visualizzare in stile riferimento | T2.3, T1.3 | pagina con pannello Mosse + controlli replay | T2.3, T1.3 | variante mostrata, replay/tastiera ok | no |
| T2.5 | Sostituire mock con chiamata reale | INT | Integrazione reale | T2.2, T2.4 | dati da backend | T2.2, T2.4 | Network = backend | no |

### Prototipo 3 (MVP)
| ID | Titolo | Area | Scopo | Input | Output | Dipendenze | Validazione | Parallelo |
|----|--------|------|-------|-------|--------|------------|-------------|-----------|
| T3.1 | `TrainingComponent` stato sessione | FE | Gestire indice/esito | T2.5 | componente | T2.5 | sessione avviabile | no |
| T3.2 | Logica confronto mossa attesa | FE | Validare mossa | T3.1, T1.3 | giusta/sbagliata | T3.1 | feedback corretto | no |
| T3.3 | Risposta automatica avversario | FE | Avanzare linea | T3.2 | auto-move | T3.2 | linea avanza | no |
| T3.4 | Feedback UI + completamento | FE | UX training | T3.3 | stati visivi | T3.3 | "completata" ok | no |
| T3.5 | Validazione manuale MVP | REV | Confermare MVP | T3.4 | checklist passata | T3.4 | sezione 3 P3 | no |

### Prototipo 4
| ID | Titolo | Area | Scopo | Input | Output | Dipendenze | Validazione | Parallelo |
|----|--------|------|-------|-------|--------|------------|-------------|-----------|
| T4.1 | Entità + repository `Variant` | BE | Persistenza H2 | sezione 7 | entità/repo | T2.2 | salva/legge | no |
| T4.2 | Refactor service su repository + seed | BE | Dati da DB | T4.1 | service DB + seed | T4.1 | seed visibile | no |
| T4.3 | `POST`/`DELETE` varianti + `CreateVariantRequest` | BE | CRUD | T4.2, sezione 6 | endpoint | T4.2 | crea/elimina ok | con T4.4 |
| T4.4 | UI crea/elimina (base) | FE | Gestione lista | T2.4 | azioni UI | T2.4 | lista aggiornata | con T4.3 |
| T4.5 | Verifica CRUD end-to-end | INT | Integrazione | T4.3, T4.4 | flusso completo | T4.3, T4.4 | H2 + UI coerenti | no |

### Prototipo 5
| ID | Titolo | Area | Scopo | Input | Output | Dipendenze | Validazione | Parallelo |
|----|--------|------|-------|-------|--------|------------|-------------|-----------|
| T5.1 | `ChessboardComponent` modalità registrazione | FE | Accumulare mosse | T1.3 | modalità record | T1.3 | mosse raccolte | no |
| T5.2 | `VariantEditorComponent` (nome/colore/undo/salva) | FE | Creare variante | T5.1, T4.3 | editor | T5.1, T4.3 | salvataggio ok | no |
| T5.3 | Validazione manuale creazione+training | REV | Confermare flusso | T5.2 | checklist | T5.2 | sezione 3 P5 | no |

### Prototipo 6
| ID | Titolo | Area | Scopo | Input | Output | Dipendenze | Validazione | Parallelo |
|----|--------|------|-------|-------|--------|------------|-------------|-----------|
| T6.1 | Decisione parsing PGN (FE vs BE) | REV/DOC | Scegliere approccio | sezione 8 R5 | decisione | T5.3 | decisione approvata | no |
| T6.2 | `PgnImportComponent` + parsing + anteprima | FE | Import PGN | T6.1 | componente | T6.1 | PGN→mosse ok | no |
| T6.3 | Gestione errori PGN + campo `sourcePgn` | FE/BE | Robustezza | T6.2 | errori gestiti | T6.2 | malformato gestito | no |
| T6.4 | Validazione manuale import | REV | Confermare flusso | T6.3 | checklist | T6.3 | sezione 3 P6 | no |

**Task trasversali (ricorrenti):** `DOC.x` aggiornamento documentazione a fine prototipo; `REV.x` code review prima del merge. Non vanno svolti in parallelo con la modifica che revisionano.

---

## 6. Contratti frontend/backend

Contratto attuale, aggiornato allo stato implementato dei prototipi 0-6 e delle estensioni anticipate (modifica variante e albero mosse). Base URL: `/api`.

### Endpoint REST principali
| Metodo | Path | Scopo | Introdotto in |
|--------|------|-------|---------------|
| GET | `/api/ping` | Health/integrazione | P0 |
| GET | `/api/variants` | Lista varianti | P2 |
| GET | `/api/variants/{id}` | Dettaglio variante | P2 |
| POST | `/api/variants` | Crea variante | P4 |
| PUT | `/api/variants/{id}` | Aggiorna variante esistente | Extra post-P5 anticipato |
| DELETE | `/api/variants/{id}` | Elimina variante | P4 |
| POST | `/api/variants/{id}/training/check` | (Opzionale) validazione mossa server-side | P3 se necessario |
| POST | `/api/variants/import-pgn` | (Opzionale) import PGN server-side | P6 se scelto BE |

### DTO principali

**`VariantDto`** (risposta)
```
id: number
name: string
color: "WHITE" | "BLACK"      // lato da allenare; predisposto
moves: string[]                // mainline in SAN, derivata da tree
tree?: MoveNode[]              // albero completo: mainline + sotto-varianti
startingFen: string            // default posizione iniziale; predisposto per future posizioni custom
sourcePgn?: string             // predisposto, valorizzato dall'import PGN (P6)
createdAt?: string             // predisposto per ordinamento/storico
```

**`CreateVariantRequest`** (richiesta, P4+; usata anche per `PUT`)
```
name: string                   // obbligatorio, non vuoto
color: "WHITE" | "BLACK"
moves: string[]                // mainline in SAN; usata se tree e' assente
tree?: MoveNode[]              // opzionale; se presente e' la fonte autorevole
sourcePgn?: string             // opzionale (import PGN), salvato come testo lungo
```

**`MoveNode`** (albero mosse)
```
san: string                    // mossa in SAN
children: MoveNode[]           // children[0] = continuazione principale; altri figli = sotto-varianti
```

**`TrainingCheckRequest` / `TrainingCheckResponse`** (opzionali, solo se validazione server-side)
```
// request:  { moveIndex: number, move: string }
// response: { correct: boolean, expectedMove?: string, finished: boolean }
```

### Responsabilità del backend
- Esporre varianti (hardcoded → H2).
- Persistere e validare i dati minimi (nome non vuoto, colore valido, almeno `moves` o `tree` non vuoto).
- Mantenere `moves` come mainline derivata da `tree` quando l'albero e' presente.
- (Opzionale) validare la legalità della sequenza e/o le mosse di training.
- Mantenere stabile il contratto DTO mentre cambia l'implementazione interna.

### Responsabilità del frontend
- Rendering scacchiera e garanzia di legalità delle mosse (motore client).
- Gestione dello stato della sessione di training.
- Confronto mossa-attesa (nel MVP) e feedback UX.
- Creazione/modifica visuale di varianti lineari e ramificate.
- Parsing PGN client-side (se si sceglie l'opzione FE).

### Dati minimi scambiati
Per il MVP lineare basta `VariantDto` con `name` + `moves[]`. Nello stato attuale `tree` e' gia' disponibile per sotto-varianti, mentre `moves[]` resta la mainline per retrocompatibilita' e viste semplici.

### Campi predisposti per evoluzioni future
- `color`, `startingFen` → posizioni/lati custom.
- `sourcePgn` → tracciabilità import.
- `createdAt` → storico e ordinamento.
- (Futuro) `userId` → multi-utente con Supabase Auth (vedi sezione 7).

---

## 7. Evoluzione del modello dati

Modello **progressivo**: si aggiunge solo ciò che serve al prototipo corrente.

### Modello minimo (Prototipo 1-3, MVP)
Nessuna entità persistita. Variante in memoria:
```
Variant { id, name, moves: string[] }
```

### Modello MVP / persistenza (Prototipo 4-6)
Entità `Variant` su H2:
```
Variant {
  id: Long (PK)
  name: String (not null)
  color: enum WHITE/BLACK
  moves: String[]      // mainline serializzata come JSON in colonna text
  tree: MoveNode[]     // albero serializzato come JSON in colonna text
  startingFen: String (default initial)
  sourcePgn: String (nullable, colonna text)
  createdAt: timestamp
}
```
> Decisione attuata: nei prototipi le mosse sono salvate come JSON in colonne `text`. `tree` e' la fonte completa quando presente; `moves` resta la mainline derivata per compatibilita' e semplicità di consumo.

### Modello per gestione completa aperture/varianti (post-MVP)
- Possibile entità `Opening`/`Repertoire` che raggruppa più `Variant`.
- Supporto a `startingFen` non standard.
- Struttura ad albero gia' introdotta a livello di singola variante; restano da consolidare UX avanzata, promozione rami a mainline, export/import PGN complesso e validazione completa.

### Dati futuri - storico allenamenti
```
TrainingSession { id, variantId, startedAt, completedAt, result, mistakesCount, userId? }
TrainingMove   { id, sessionId, ply, expectedSan, playedSan, correct }
```
Non implementare finché il loop MVP non è stabile.

### Dati futuri - spaced repetition
Campi su `Variant` o tabella dedicata `ReviewSchedule`:
```
{ variantId, easeFactor, intervalDays, repetitions, nextReviewDate, lastReviewedAt }
```
Aggiungere solo quando si implementa la ripetizione (Prototipo 7+).

### Dati futuri - reportistica
Derivabili da `TrainingSession`/`TrainingMove` (aggregazioni). Nessuna tabella nuova necessaria all'inizio: prima si raccolgono i dati grezzi.

### Predisposizione utente/autenticazione (futuro)
- Campo `userId` (nullable ora) su `Variant` e `TrainingSession`.
- In locale single-user resta null/utente di default.
- Con Supabase Auth diventerà l'ID utente; nessuna ristrutturazione necessaria se il campo è previsto da subito **ma lasciato inattivo**.

> Principio: aggiungere colonne/nullable è economico; ristrutturare relazioni è costoso. Si predispongono i campi chiave (`userId`, `createdAt`) presto, si rimanda tutto il resto.

---

## 8. Rischi tecnici e decisioni da prendere

| ID | Rischio | Descrizione | Impatto | Quando affrontarlo | Rimandabile? | Decisione minima ora |
|----|---------|-------------|---------|--------------------|--------------|----------------------|
| R1 | **Libreria scacchiera frontend** | Risolto: rendering custom Angular/CSS con pezzi SVG Staunton; regole = `chess.js`; interazione click + drag and drop. | Basso (era Alto) | Prototipo 1 | No | Mantenere separati rendering e regole; rivalutare libreria esterna solo se emergono requisiti non coperti. |
| R2 | **Rappresentazione mosse** | SAN vs LAN vs UCI; come salvarle. Coerente con `chess.js`/PGN della preanalisi. | Medio (era Alto) | P1 (formato), P4/P5 (storage + albero) | No per il formato | Usare **SAN** nel contratto e in UI; salvare `tree` come JSON in colonna `text`; mantenere `moves` come mainline derivata. |
| R3 | **Validazione mosse legali** | Chi garantisce la legalità: client, server o entrambi | Medio | P1 (client), P5 (eventuale server) | Sì per il server | Legalità lato **client** nei prototipi; validazione server opzionale e rimandata. |
| R4 | **Validazione training (giusto/sbagliato)** | Confronto mossa attesa lato client o server | Medio | P3 | Sì (server) | **Client** nel MVP; predisporre endpoint `training/check` ma non implementarlo subito. |
| R5 | **Import PGN** | Parsing robusto, varianti annidate, commenti. La preanalisi conferma `chess.js` (`Chess().loadPgn(...)`) come strumento. | Medio | P6 | Sì (robustezza) | Parsing **client** con `chess.js` su PGN a linea singola; PGN complessi rimandati. |
| R6 | **Gestione stato training** | Dove vive lo stato di sessione | Basso/Medio | P3 | Sì | Stato nel componente/servizio Angular; nessuna persistenza nel MVP. |
| R7 | **Sincronizzazione FE/BE** | Drift tra DTO e modello TS | Medio | Continuo da P2 | No | Contratto scritto (sezione 6) come fonte unica; aggiornarlo prima del codice. |
| R8 | **Migrazione H2 → Supabase PostgreSQL** | Differenze SQL, persistenza, connessione | Medio | Post-MVP | Sì | Restare su JPA standard, evitare feature H2-specifiche; valutare Flyway al passaggio. |
| R9 | **Autenticazione Supabase** | Identità utente, sicurezza endpoint | Alto (ma futuro) | Fase dedicata | Sì | Solo predisporre `userId` nullable; nessuna logica auth ora. |
| R10 | **Containerizzazione Docker** | Build, networking FE/BE, immagini | Medio | Post-MVP | Sì | Mantenere `backend/` e `frontend/` come progetti **fisicamente separati** (vedi sezione 1) e config via env; nessun Dockerfile ora. La separazione abilita due immagini distinte in futuro. |
| R11 | **Modello a albero/sotto-varianti** | Aperture reali sono alberi, non liste | Medio/Alto | Anticipato dopo P5 | Parzialmente | Introdotto `MoveNode`: `children[0]` = mainline, altri figli = sotto-varianti. Restano da consolidare validazione, UX avanzata, import/export PGN complesso. |
| R12 | **Scelta specifica board Angular** | Risolto con board custom Angular/CSS/SVG, scelta documentata in ADR 0001. | Basso | Prototipo 1 | No | Continuare con board custom finche' soddisfa rendering, FEN/orientamento, click, drag and drop e promozione. |

**Decisioni minime prese:** R1/R12 (board custom Angular + `chess.js`), R2 (SAN + JSON in colonne `text`, con `tree` e mainline `moves`), R7 (contratto scritto e aggiornato). Le decisioni successive restano da prendere quando si affrontano PGN complessi, reportistica, autenticazione e database online.

**Chiuse dalla preanalisi:** scelta del motore regole/PGN (`chess.js`), esclusione di `react-chessboard`, formato pezzi (Staunton SVG), token visivi e layout (palette pergamena, case `#f0d9b5`/`#b58863`, cornice legno, layout a pannelli, controlli replay).

---

## 9. Coordinamento agenti

Modello di collaborazione: **Claude/Opus** operativo, **Codex** analisi/review, **ChatGPT** coordinatore/prompt, **sviluppatore umano** decisore ed esecutore locale.

### Ripartizione dei task
- **Claude/Opus (operativo):** scaffolding, scrittura di controller/service/entità, componenti Angular, integrazione, refactor, stesura DTO e contratti. È l'agente che produce il codice dei task della sezione 5.
- **Codex (analisi/review/verifica):** review dei diff prodotti da Claude, controllo coerenza FE/BE vs contratto, verifica legalità mosse/parsing, second opinion su decisioni tecniche (R1-R11), individuazione bug.
- **ChatGPT (coordinatore/revisore prompt):** trasformare i task in prompt eseguibili, mantenere la roadmap aggiornata, mediare tra output di Claude e Codex, preparare i prompt successivi (sezione 10).
- **Sviluppatore umano (decisore/esecutore):** prende le decisioni aperte (R1, R2, R11...), esegue avvii locali e validazioni manuali, fa commit/merge, approva i passaggi di prototipo.

### Come evitare conflitti sui file
- **Separazione netta per workstream:** backend e frontend sono progetti/cartelle distinti → conflitti minimi tra agenti che lavorano su lati diversi.
- **Un task = un'area** (sezione 5). Non assegnare a due agenti lo stesso file nello stesso momento.
- **Regola del repository (da CLAUDE.md):** controllare sempre lo stato git prima di modificare; non sovrascrivere modifiche altrui.
- **Il contratto (sezione 6) è la fonte unica:** ogni cambio di API si fa prima nel documento contratto, poi nel codice, per evitare drift FE/BE.

### Quando fare review
- Dopo ogni task `BE`/`FE` significativo, prima del merge → review Codex.
- Sempre a fine prototipo (`REV.x`), prima di dichiararlo completato.
- Su ogni decisione tecnica aperta (R1-R11) → second opinion prima di procedere.

### Quando aggiornare la documentazione
- A fine di ogni prototipo: aggiornare lo stato nel planning e, **se** è stata presa una decisione architetturale rilevante, aggiornare la documentazione progettuale (coerente con la nota in `CLAUDE.md`).
- Ogni modifica al contratto FE/BE va riflessa subito nella sezione 6 (o nel suo successore).

### Come mantenere allineati frontend e backend
- Contratto scritto e versionato come riferimento condiviso.
- Mock frontend **identici** ai DTO reali, sostituiti appena l'endpoint è pronto (passaggio esplicito in ogni prototipo).
- Endpoint `/api/ping` e i test manuali end-to-end come canarino dell'integrazione.

---

## 10. Prompt successivi consigliati

Bozze sintetiche, da espandere al momento dell'uso.

1. **Analisi stato reale repo:** "Analizza lo stato attuale del repository (file, struttura, git) e dimmi cosa esiste già e cosa manca rispetto al Prototipo 0 del planning."
2. **Definizione primo prototipo:** "Dettaglia il Prototipo 0 in task eseguibili con comandi concreti per scaffolding backend e frontend, rispettando versioni e CLI locale."
3. **Implementazione backend primo prototipo:** "Implementa lo scaffold Spring Boot con H2, CORS dev e endpoint `/api/ping` secondo il contratto della sezione 6."
4. **Implementazione frontend primo prototipo:** "Crea lo scaffold Angular (CLI locale) con `ApiService` e home che consuma `/api/ping`, con proxy verso :8080."
5. **Integrazione FE/BE:** "Verifica e correggi l'integrazione end-to-end del ping dal browser (CORS, proxy) e documenta l'esito."
6. **Review del codice prodotto:** "Esegui una review (ruolo Codex) dei diff del Prototipo 0 cercando bug, problemi di config e scostamenti dal contratto."
7. **Validazione manuale locale:** "Elenca ed esegui i test manuali del Prototipo 0 e riporta gli esiti passo per passo."
8. **Aggiornamento documentazione:** "Aggiorna lo stato del prototipo nel planning e annota eventuali decisioni architetturali prese."
9. **Preparazione prototipo successivo:** "Sulla base dello stato attuale, prepara i task del Prototipo 1 (scacchiera) inclusa la decisione sulla libreria (R1)."

---

# PARTE 2 — Consolidamento e organizzazione in studi

> Seconda tornata di pianificazione. Riprende lo stile e i principi della Parte 1 (prototipi piccoli, verificabili, validati a mano).
> Fonti: `stato-avanzamento-lavori.md` (cosa risulta mancante, sezione 5), questo planning (sezioni 1-10), `preanalisi-progetto.md`.
> **Esclusioni esplicite di questa Parte 2** (rinviate alla terza tornata, sezione 18): multiutente, autenticazione Supabase, migrazioni versionate (Liquibase/Flyway), Supabase PostgreSQL, Docker. Restano gli ultimissimi passi.
> **Precedenza:** prima il **consolidamento** dell'applicativo (Fase A), poi gli **studi/gruppi** (Fase B), poi import/export e apprendimento (Fasi C-D).

---

## 11. Strategia della Parte 2

L'app ha già un MVP esteso funzionante (prototipi 0-6 + estensioni: editing, alberi, training su rami). Prima di aggiungere superficie nuova, la Parte 2 **stabilizza il nucleo** e poi introduce l'organizzazione delle varianti in **studi**, sul modello degli *studies* di Lichess.

Principi (in continuità con la sezione 1):

- **Consolidare prima di espandere.** Le funzionalità anticipate fuori roadmap (albero, editing) vanno rese affidabili con validazione e test prima di costruirci sopra.
- **Integrità dei dati a difesa del backend.** Oggi l'API si fida del frontend; la Parte 2 sposta la validazione di legalità anche lato server (rischio R3/R13).
- **Studi = aggregato di varianti.** Uno **Studio** raggruppa più **Varianti** (mappatura: Studio ≈ *study/repertorio* Lichess, Variante ≈ *chapter*). Dentro uno studio si crea o si elimina una variante.
- **Retrocompatibilità.** Le varianti esistenti non si perdono: vengono assegnate a uno studio di default; `studyId` è introdotto come campo nullable.
- **Separazione `backend/` ↔ `frontend/` invariata** (vincolo non negoziabile della sezione 1).
- **Niente over-engineering verso il multiutente.** I campi `userId` restano predisposti ma inattivi (sezione 7); nessuna logica auth in Parte 2.

Logica di fondo: arrivare a *"i miei repertori sono organizzati in studi, ogni mossa salvata è legale e verificata, posso allenarli e vedere i miei progressi"* — senza ancora toccare cloud, autenticazione o deploy.

---

## 12. Roadmap Parte 2 (prototipi 7+)

| # | Prototipo | Fase | Obiettivo sintetico | Valore prodotto |
|---|-----------|------|---------------------|-----------------|
| 7 | **Validazione scacchistica lato backend** + fix scacchiera | A · Consolidamento | Backend valida legalità di mainline/albero; correzioni drag-and-drop e cornice board | Integrità dati + scacchiera più curata |
| 8 | **Consolidamento del modello ad albero** | A · Consolidamento | Round-trip `tree`, "promuovi a mainline", protezione sottoalberi | Albero affidabile e usabile |
| 9 | **Robustezza interazioni e azioni distruttive** | A · Consolidamento | Conferme, guard "modifiche non salvate", feedback errori | Niente perdite dati accidentali |
| 10 | **Suite test automatici + checklist E2E** | A · Consolidamento | Test su flussi completi, checklist ripetibile | Regressioni sotto controllo |
| 11 | **Modello Studi (backend)** | B · Studi | Entità `Study` + relazione 1-N con `Variant` + CRUD + **cancellazione a cascata** + studio di default | Raggruppamento varianti |
| 12 | **UI Studi + audio mosse** | B · Studi | **Crea/elimina studio**; crea/elimina variante dentro lo studio; aggiunge suono mossa sulla scacchiera | Organizzazione tipo Lichess + feedback sonoro scacchistico |
| 13 | **Import PGN avanzato** | C · PGN | Varianti annidate → `tree`; commenti/NAG di base | Import realistico |
| 14 | **Import studio Lichess pubblico** | C · PGN | Da link studio/capitolo Lichess pubblico importa capitoli come varianti locali | Repertori esterni riusabili |
| 15 | **Persistenza sessioni di allenamento** | D · Progresso | Salva `TrainingSession`/`TrainingMove` | Base dati per stats e ripetizione |
| 16 | **Statistiche e reportistica** | D · Progresso | Report errori/completamenti per variante e studio | Feedback sull'allenamento |
| 17 | **Spaced repetition** | D · Progresso | Scheduling delle ripetizioni per variante | Memorizzazione efficace |
| 18 | **Integrazione Stockfish** | E · Motore | Toggle motore + barra valutazione su dettaglio/editor; gioca vs computer in nuova tab | Analisi e aiuto allo studio |

Ordine consigliato di esecuzione: **7 → 8 → 9 → 10** (consolidamento), poi **11 → 12** (studi + audio mosse), poi **13 → 14** (import PGN e import da studio Lichess pubblico), poi **15 → 16 → 17** (apprendimento), infine **18** (motore Stockfish) come **ultimo rilascio pianificato** della Parte 2. Le fasi C e D sono indipendenti tra loro e possono essere riordinate in base alle priorità del momento; la Fase E resta l'ultima.

> **Fuori dai rilasci pianificati** (vedi sezione 19 · TODO da validare): l'**export PGN** e lo **spostamento di varianti tra studi** sono stati rimossi dalla roadmap e tenuti come note da validare quando emergerà il bisogno reale.

---

## 13. Dettaglio dei prototipi 7+

### Prototipo 7 - Validazione scacchistica lato backend

#### Obiettivo
Il backend non si fida più ciecamente del frontend: valida la **legalità** della sequenza mosse (mainline) e, ricorsivamente, di ogni ramo dell'albero, rifiutando payload incoerenti con `400` e messaggio utile.

#### Risultato funzionante atteso
`POST`/`PUT /api/variants` con SAN illegale o albero incoerente → `400 Bad Request` con dettaglio (quale ply, quale ramo). Payload validi → invariati nel comportamento.

#### Backend workstream
- Decisione tecnica (R13): introdurre una **libreria scacchi Java** (candidata: `chesslib`) per ricostruire la posizione e validare ogni SAN, **oppure** mantenere validazione minima e formalizzare che la legalità resta responsabilità del client. Scelta consigliata: validazione server con libreria, per integrità reale.
- `VariantValidator`: ricostruisce la posizione da `startingFen` e verifica che ogni mossa della mainline sia legale; per `tree`, visita in profondità validando ogni figlio dal nodo padre.
- Mappare gli errori di validazione a `400` con corpo strutturato (`{ field, ply, message }`).
- Test: mainline valida/invalida, albero con ramo illegale, FEN di partenza non standard.

#### Frontend workstream
- Gestione del `400` strutturato: messaggio chiaro nell'editor/import (quale mossa è stata rifiutata).
- Nessun cambio al flusso felice.

#### Correzioni scacchiera incluse in questo rilascio (frontend)
Tre difetti visivi del componente `Chessboard` rilevati durante l'uso, da correggere in questo primo rilascio della Parte 2:

1. **Il drag non deve trascinare lo sfondo della casa.** Oggi l'immagine trascinata (drag ghost) include anche lo sfondo/cornice della casa di partenza (evidenza rossa nello screenshot). Deve essere trascinato **solo il pezzo**, su sfondo trasparente. *Indirizzo tecnico (non vincolante):* impostare un drag image custom con la sola immagine del pezzo (es. `dataTransfer.setDataImage`/un elemento immagine dedicato) invece di lasciare che il browser catturi l'intero quadrato.
2. **Il pezzo non deve restare nella casa di partenza durante il trascinamento.** Oggi, mentre si trascina, il pezzo resta visibile anche sulla casa d'origine (evidenza gialla nello screenshot, casa e2). Durante il drag il pezzo d'origine va **nascosto** (la casa di partenza resta vuota finché la mossa non è confermata o annullata). *Indirizzo tecnico:* nascondere il pezzo sulla casa con `dragging() === square` (classe/stile dedicato), ripristinandolo su `dragend`/drop annullato.
3. **Cornice della scacchiera più stretta.** Ridurre lo spessore della cornice/bordo legno (oggi `padding` 10px + gutter coordinate 1.6rem in `chessboard.css`), per una cornice un po' più sottile mantenendo la leggibilità delle coordinate.

> Queste correzioni sono **decise** (non semplici proposte): vanno implementate nel rilascio. Le restanti idee estetiche restano nella sezione 17, subordinate a validazione.

#### Integration workstream
- Contratto `400` arricchito (sezione 15). DTO di richiesta invariati.

#### Validazione del prototipo
1. Creo via API una variante con SAN illegale → `400` con messaggio.
2. Creo un albero con un ramo illegale → `400` che indica il ramo.
3. Creo una variante valida → `201` come prima.
4. L'editor mostra l'errore in modo leggibile.
5. Trascino un pezzo: viene trascinato **solo il pezzo** (nessuno sfondo della casa) e la casa di partenza resta **vuota** durante il drag.
6. La cornice della scacchiera risulta visibilmente più stretta, con coordinate ancora leggibili.

#### Criteri di completamento
Nessuna variante con mosse illegali può entrare in DB via API; gli errori sono comprensibili lato UI.

#### Cosa non fare ancora
Niente validazione semantica "di apertura" (non si giudica se la linea è *buona*, solo se è *legale*).

---

### Prototipo 8 - Consolidamento del modello ad albero

#### Obiettivo
Rendere l'albero (`MoveNode`) affidabile e gestibile: round-trip dati garantito, comandi espliciti per gestire i rami, protezione dalle cancellazioni accidentali.

#### Risultato funzionante atteso
Posso creare rami multipli dall'editor, salvare, riaprire e ritrovarli identici; posso **promuovere un ramo a mainline**; cancellare un sottoalbero chiede conferma.

#### Backend workstream
- Test di round-trip `tree → DB (JSON text) → DTO → tree`, inclusi rami multipli e profondi.
- Confermare come **vincolo ufficiale** `children[0] = mainline` (già in ADR 0002); derivazione `moves` sempre coerente dopo ogni update.
- Endpoint/azione per "promuovi ramo a mainline" (può essere risolto lato client riordinando `children` e rifacendo `PUT`).

#### Frontend workstream
- Editor: UX chiara per distinguere **mainline** e **varianti** (già stili `move--variation`); comando "rendi mainline" sul nodo corrente.
- Conferma prima di cancellare un nodo che ha figli (sottoalbero).
- Visualizzazione path/ramo corrente più esplicita.

#### Integration workstream
- Nessun nuovo endpoint obbligatorio (riuso `PUT`); il riordino dei `children` è la primitiva per "promuovi a mainline".

#### Validazione del prototipo
1. Creo `1.e4 e5` con due risposte alternative del Nero, salvo, riapro → entrambe presenti.
2. Promuovo la variante a mainline → `moves` derivata aggiornata.
3. Cancello un sottoalbero → conferma richiesta, poi rimosso.
4. Alleno una variante con rami → tutte le risposte valide sono accettate.

#### Criteri di completamento
Albero stabile, round-trip garantito da test, gestione rami esplicita e protetta.

#### Cosa non fare ancora
Niente import PGN dei rami (arriva in P13); l'export PGN è rinviato (sezione 19 · TODO da validare); niente commenti/NAG.

---

### Prototipo 9 - Robustezza interazioni e azioni distruttive

#### Obiettivo
Eliminare le perdite di dati accidentali e rendere il feedback degli errori esplicito.

#### Risultato funzionante atteso
Eliminare una variante o una mossa chiede conferma; uscire dall'editor con modifiche non salvate avvisa; gli errori API mostrano un messaggio (toast) invece di fallire in silenzio.

#### Backend workstream
- Nessuna nuova logica obbligatoria; rifinire i messaggi d'errore (`400`/`404`) già esistenti.

#### Frontend workstream
- Dialog di conferma per: elimina variante (lista/dettaglio), elimina mossa/sottoalbero (editor).
- Route guard `canDeactivate` sull'editor: avviso se ci sono modifiche non salvate.
- Sistema di **toast/snackbar** per esiti (salvato, errore di rete, `404`/`400`).
- Stati di `loading`/`saving` su pulsanti e liste; disabilitazione durante le chiamate.

#### Integration workstream
- Mappatura coerente codici HTTP → messaggi utente.

#### Validazione del prototipo
1. Elimino una variante → conferma → eliminata; annullo → resta.
2. Modifico l'editor e provo a uscire → avviso "modifiche non salvate".
3. Spengo il backend e salvo → toast d'errore, nessun crash.

#### Criteri di completamento
Nessuna azione distruttiva senza conferma; ogni errore ha feedback visibile.

#### Cosa non fare ancora
Niente restyle grafico complessivo (le proposte estetiche restano nella sezione 17, da validare a parte).

---

### Prototipo 10 - Suite test automatici + checklist E2E

#### Obiettivo
Trasformare le verifiche manuali in test ripetibili e in una checklist formale (sezione 5.5 dello stato avanzamento).

#### Risultato funzionante atteso
Una suite che copre i flussi completi (crea → dettaglio → training → modifica → ramo → import → delete) e una checklist manuale documentata.

#### Backend workstream
- Test di integrazione sui controller `Variant` (e futuri `Study`): CRUD, validazione, round-trip albero.

#### Frontend workstream
- Test dei componenti chiave già presenti; aggiungere test sui flussi editor/training con rami.
- (Opzionale, valutare) un runner E2E leggero per i percorsi principali.

#### Integration workstream
- Checklist E2E scritta (riprendere la lista a 12 punti della sezione 5.5 dello stato avanzamento).

#### Validazione del prototipo
1. La suite passa in locale (backend e frontend).
2. La checklist manuale è eseguibile in pochi minuti e documentata.

#### Criteri di completamento
Flussi critici coperti da test automatici + checklist ripetibile versionata.

#### Cosa non fare ancora
Niente CI/CD (richiede infrastruttura, rinviato con Docker/Supabase alla terza tornata).

---

### Prototipo 11 - Modello Studi (backend)

#### Obiettivo
Introdurre l'entità **Study** che raggruppa più varianti, con CRUD completo, mantenendo la retrocompatibilità delle varianti esistenti.

#### Risultato funzionante atteso
`GET /api/studies` elenca gli studi con il conteggio varianti; `GET /api/studies/{id}` restituisce lo studio con le sue varianti; creo/rinomino/elimino studi via API.

#### Backend workstream
- Entità `Study` (sezione 15): `id`, `name`, `description?`, `color?` (WHITE/BLACK/MIXED, opzionale), `createdAt`.
- Relazione **1-N** `Study → Variant`: su `Variant` si aggiunge `studyId` (FK **nullable**, per eventuali varianti legacy create fuori da uno studio).
- `StudyRepository`, `StudyService`, `StudyController`: `GET` lista/dettaglio, `POST`, `PUT`, `DELETE`.
- **Politica di cancellazione studio (R14): cancellazione a cascata.** Eliminando uno studio si eliminano **automaticamente anche le varianti associate**; le varianti **non** vengono spostate altrove.
- **Studio di default deployato in questo prototipo:** il seed crea uno studio di default "Repertorio" e vi **aggancia le varianti esistenti** (questa è la migrazione delle varianti preesistenti — non c'è un prototipo separato dedicato).

#### Frontend workstream
- Modello TS `Study`; `StudyService` con i metodi CRUD.
- (UI vera e propria in P12.)

#### Integration workstream
- Nuovi endpoint `/api/studies` (sezione 15). `VariantDto` arricchito con `studyId` (nullable).

#### Validazione del prototipo
1. `GET /api/studies` → studio di default con le varianti seed agganciate.
2. `POST` nuovo studio → `201`.
3. `DELETE` di uno studio non vuoto → lo studio **e tutte le sue varianti** vengono eliminati (cascata); nessuna variante resta orfana o spostata.
4. Test backend su CRUD studi, relazione e cancellazione a cascata.

#### Criteri di completamento
Gli studi vivono in DB, il CRUD funziona, lo studio di default raccoglie le varianti esistenti, la delete cancella a cascata.

#### Cosa non fare ancora
Niente UI studi (P12); niente **spostamento di varianti tra studi** (sezione 19 · TODO da validare); niente condivisione/esportazione studi (terza tornata).

---

### Prototipo 12 - UI Studi + audio mosse

#### Obiettivo
Portare gli studi nel frontend: navigare gli studi, **crearne** ed **eliminarne**, aprire uno studio e gestirne le varianti (crea/elimina) dall'interno, sul modello degli *studies* di Lichess. In questo stesso rilascio si introduce anche il **suono di mossa** della scacchiera, perché P12 è il primo rilascio frontend disponibile dopo i prototipi già completati fino al 10.

#### Risultato funzionante atteso
La home mostra gli **studi** e permette di **creare un nuovo studio** o **eliminarne** uno; aprendo uno studio vedo le sue varianti (i "capitoli"); dentro lo studio posso **creare una nuova variante** o **eliminarne** una esistente. Quando una mossa viene eseguita sulla scacchiera, l'app riproduce un suono breve e secco, con target percettivo uguale a quello usato da Fritz/ChessBase.

#### Backend workstream
- `POST /api/studies/{id}/variants` (crea variante già agganciata allo studio) — oppure riuso di `POST /api/variants` con `studyId` nel body. Scelta consigliata: endpoint nidificato per chiarezza.
- `POST`/`DELETE /api/studies/{id}` già esistenti (P11), riusati dalla UI.
- `DELETE /api/variants/{id}` già esistente (riuso).

#### Frontend workstream
- Nuova `StudyList` (home a studi) con azione **"Nuovo studio"** ed **"Elimina studio"**, e `StudyDetail` (intestazione studio + lista varianti/capitoli + azioni).
- **Crea studio:** form/modale con nome (e descrizione/colore opzionali).
- **Elimina studio:** azione con **conferma esplicita** che avvisa che verranno eliminate **anche tutte le varianti dello studio** (cascata da P11).
- Da dentro lo studio: pulsante "Nuova variante" (apre l'editor pre-agganciato allo studio) e "Importa PGN" nello studio; azione "Elimina" per ogni variante.
- Aggiornare routing: `/` → studi, `/studies/:id` → dettaglio studio; le rotte variante restano (`/variants/:id`, `/edit`, `/train`).
- Breadcrumb Studio → Variante per orientarsi.
- `MoveSoundService` o equivalente frontend centralizzato: riproduce il suono quando il componente scacchiera conferma una mossa legale, sia in editor/dettaglio/training sia nella futura pagina "gioca contro il computer".
- Il suono deve essere disattivabile da impostazione frontend locale, con default **attivo**.
- Target audio: suono di mossa stile Fritz/ChessBase. Se l'asset originale non è disponibile con licenza/permesso d'uso, produrre o usare un asset equivalente per timbro, durata e percezione, senza copiare file proprietari.

#### Integration workstream
- Endpoint studi (CRUD) + creazione variante nello studio.
- Nessuna integrazione backend per l'audio: asset e preferenza locale restano frontend.

#### Validazione del prototipo
1. Apro la home → vedo gli studi.
2. **Creo un nuovo studio** → compare nella home.
3. Apro uno studio → vedo le sue varianti.
4. Creo una variante dentro lo studio → compare nello studio.
5. Elimino una variante dello studio → conferma (da P9) → rimossa.
6. **Elimino uno studio** → conferma (avviso cascata) → spariscono studio **e** sue varianti.
7. Eseguo una mossa legale sulla scacchiera in dettaglio/editor/training → sento il suono mossa.
8. Disattivo il suono dalle impostazioni locali → muovendo i pezzi non viene riprodotto audio.

#### Criteri di completamento
Gli studi si creano/eliminano e si gestiscono le varianti dall'interno, end-to-end; la delete dello studio rispetta la cascata. Il suono mossa è integrato in modo centralizzato sul componente scacchiera, attivo di default e disattivabile.

#### Cosa non fare ancora
Niente **spostamento di varianti tra studi** (sezione 19 · TODO da validare); niente riordino avanzato; niente condivisione. Niente libreria audio complessa o mixer: serve solo un effetto mossa breve, locale e controllabile.

---

### Prototipo 13 - Import PGN avanzato

#### Obiettivo
Superare l'import "solo linea principale": leggere PGN con **varianti annidate** e mapparle sull'albero `tree`; gestire commenti/NAG di base.

#### Risultato funzionante atteso
Incollo un PGN con varianti tra parentesi → l'app costruisce l'albero corretto (mainline + sotto-varianti) e lo salva.

#### Backend workstream
- Decisione (R15): parsing avanzato lato **frontend** con `chess.js` (che gestisce varianti) o lato backend con libreria Java. Consigliato: continuare lato frontend, coerente con P6.
- Eventuale validazione dell'albero importato riusando `VariantValidator` (P7).

#### Frontend workstream
- Estendere `PgnImport`: dal PGN con varianti, costruire `MoveNode[]` (parentesi → `children` alternativi).
- Gestione di base di commenti `{...}` e NAG (`$n`): almeno non rompere il parsing; opzionale conservarli.
- Anteprima ad albero del PGN importato prima del salvataggio.

#### Integration workstream
- Riuso `POST /api/variants` / endpoint studio con `tree` popolato.

#### Validazione del prototipo
1. Importo un PGN con 2-3 varianti annidate → albero corretto in anteprima.
2. Salvo → ritrovo i rami nel dettaglio/editor.
3. Importo un PGN con commenti → nessun crash.

#### Criteri di completamento
PGN ramificati diventano varianti ad albero allenabili.

#### Cosa non fare ancora
Niente PGN multi-partita in un file; niente import di file `.pgn` (solo incolla testo); gestione NAG completa rinviata.

---

### Prototipo 14 - Import studio Lichess pubblico

#### Obiettivo
Importare uno **studio pubblico Lichess** partendo da un link copiato dal browser:

- link allo studio: `https://lichess.org/study/OR3CU5Je`
- link al capitolo corrente: `https://lichess.org/study/OR3CU5Je/dUBaUslK`

Il modello locale resta invariato: uno **Study** locale raggruppa più **Variant**, e ogni capitolo Lichess diventa una variante locale.

#### Risultato funzionante atteso
Incollo un link Lichess pubblico nell'app:

- se il link è allo **studio**, l'app importa tutti i capitoli pubblici disponibili e crea uno studio locale con una variante per capitolo;
- se il link è al **capitolo**, l'app importa solo quel capitolo come singola variante, agganciandola allo studio corrente oppure creando uno studio locale con un solo capitolo se il flusso parte dalla home.

Le varianti importate conservano `sourcePgn` e `tree` come negli import PGN; sono quindi navigabili, modificabili e allenabili come le varianti create localmente.

#### Backend workstream
- Endpoint locale consigliato: `POST /api/studies/import`, transazionale, per creare uno studio e tutte le sue varianti in un'unica operazione. Payload: metadati dello studio + lista di varianti gia' parse dal frontend (`tree`, `moves`, `sourcePgn`, `color`, `startingFen`).
- Riuso di `POST /api/studies/{id}/variants` quando si importa **un solo capitolo** dentro uno studio gia' aperto.
- Riuso del `VariantValidator` (P7) per validare ogni variante importata prima del commit.
- In caso di errore su un capitolo nel bulk import: rollback dell'intero import, con messaggio che indichi il capitolo problematico.

#### Frontend workstream
- Nuova azione **"Importa da Lichess"** nella home studi e nel dettaglio studio.
- Parser URL robusto per accettare:
  - `https://lichess.org/study/{studyId}`
  - `https://lichess.org/study/{studyId}/{chapterId}`
  - eventuale slash finale o query string, ignorate in modo sicuro.
- Fetch PGN dagli endpoint pubblici Lichess:
  - `GET https://lichess.org/api/study/{studyId}.pgn`
  - `GET https://lichess.org/api/study/{studyId}/{chapterId}.pgn`
- Query consigliate: `comments=true`, `variations=true`, `orientation=true`, `clocks=false`.
- Split del PGN multi-capitolo restituito da Lichess in singoli capitoli; ogni blocco viene passato al parser PGN avanzato di P13.
- Anteprima prima del salvataggio: nome studio, numero capitoli, lista capitoli/varianti, eventuali errori di parsing.
- Stati UI: loading, progress import, errore `404`/non pubblico, errore `429` rate limit, errore di rete.

#### Integration workstream
- Dipendenza diretta da P13: l'import Lichess non introduce un secondo parser, ma riusa il parser PGN→`MoveNode[]`.
- Nessun OAuth nella Parte 2: si importano **solo studi/capitoli pubblici** leggibili senza autenticazione. Studi privati o non pubblici restano fuori.
- Le API Lichess vanno chiamate con parsimonia: una richiesta per volta; su `429` mostrare un messaggio e invitare a riprovare dopo.
- Se in futuro emergessero limiti CORS o requisiti di autenticazione, valutare un proxy backend e/o OAuth in una tornata successiva; non sono necessari per il P14 pubblico.

#### Validazione del prototipo
1. Incollo `https://lichess.org/study/OR3CU5Je` → l'app recupera il PGN dello studio, mostra i capitoli in anteprima, salva uno studio locale con varianti multiple.
2. Incollo `https://lichess.org/study/OR3CU5Je/dUBaUslK` da dentro uno studio locale → viene importata una sola variante nello studio corrente.
3. Apro una variante importata → rami e mainline sono presenti; il training funziona.
4. Link non valido o studio non pubblico → errore leggibile, nessun dato parziale salvato.
5. Rate limit Lichess (`429`) → messaggio dedicato e nessun retry aggressivo.

#### Criteri di completamento
Uno studio Lichess pubblico o un suo capitolo possono essere importati da URL, trasformati in varianti locali ad albero e salvati in modo coerente e validato.

#### Cosa non fare ancora
Niente import di studi privati/unlisted tramite OAuth; niente sincronizzazione con Lichess dopo l'import; niente aggiornamento incrementale dei capitoli; niente export verso Lichess; niente gestione completa di commenti/NAG oltre quanto gia' previsto in P13.

---

### Prototipo 15 - Persistenza sessioni di allenamento

#### Obiettivo
Salvare l'esito degli allenamenti, creando la base dati per statistiche e ripetizione (entità già previste in sezione 7).

#### Risultato funzionante atteso
Completando un training, l'app registra la sessione (variante, esito, numero errori, durata) e le singole mosse.

#### Backend workstream
- Entità `TrainingSession` e `TrainingMove` (sezione 7), `userId` nullable (predisposto, inattivo).
- `POST /api/training-sessions` per registrare una sessione conclusa; `GET` per leggerle.

#### Frontend workstream
- Al termine del training, inviare la sessione al backend.
- Stato/loading minimo; nessuna UI statistiche ancora (P16).

> **Vincolo della modalità allenamento (invariante per tutta la Parte 2):** l'allenamento serve **solo a memorizzare le mosse**. In questa modalità **non** deve comparire la barra di valutazione e **non** deve esserci la possibilità di giocare la posizione contro il computer. Stockfish (P18) **non è mai disponibile** durante le sessioni di allenamento.

#### Integration workstream
- Nuovi endpoint `training-sessions` (sezione 15).

#### Validazione del prototipo
1. Completo un training → la sessione compare via `GET`.
2. Una sessione con errori registra il conteggio corretto.

#### Criteri di completamento
Le sessioni di allenamento sono persistite e rileggibili.

#### Cosa non fare ancora
Niente aggregazioni/grafici (P16); niente scheduling ripetizioni (P17); nessun aiuto del motore in allenamento.

---

### Prototipo 16 - Statistiche e reportistica

#### Obiettivo
Mostrare all'utente come sta andando l'allenamento, per variante e per studio, derivando dai dati di P15.

#### Risultato funzionante atteso
Una vista con: completamenti, percentuale di errore, mosse più sbagliate, ultima esecuzione — per variante e aggregato per studio.

#### Backend workstream
- Endpoint di aggregazione (`GET /api/stats/...`) o calcolo lato frontend dai dati grezzi delle sessioni. Consigliato: aggregazioni server per efficienza.

#### Frontend workstream
- Vista statistiche (variante e studio): contatori, eventuali grafici semplici.
- Evidenza delle mosse più problematiche.

#### Integration workstream
- Endpoint stats o consumo dei dati `training-sessions`.

#### Validazione del prototipo
1. Dopo alcuni training, le statistiche riflettono i dati.
2. L'aggregato di studio somma correttamente le sue varianti.

#### Criteri di completamento
L'utente vede metriche utili e corrette sui propri allenamenti.

#### Cosa non fare ancora
Niente analisi qualitativa con motore; niente confronto tra utenti (single-user).

---

### Prototipo 17 - Spaced repetition

#### Obiettivo
Programmare le ripetizioni delle varianti nel tempo, per favorire la memorizzazione (obiettivo storico del progetto, preanalisi).

#### Risultato funzionante atteso
Dopo un training, l'app pianifica la prossima ripetizione della variante; una vista "da ripetere oggi" propone le varianti dovute.

#### Backend workstream
- Campi/tabella `ReviewSchedule` (sezione 7): `easeFactor`, `intervalDays`, `repetitions`, `nextReviewDate`, `lastReviewedAt`.
- Algoritmo di scheduling (es. SM-2 semplificato) aggiornato a fine sessione.
- `GET /api/reviews/due` per le varianti dovute.

#### Frontend workstream
- Vista "Ripeti oggi" con le varianti in scadenza; avvio rapido del training da lì.
- Indicatore prossima ripetizione nel dettaglio variante.

#### Integration workstream
- Endpoint reviews + aggiornamento schedule a fine training.

#### Validazione del prototipo
1. Completo un training → `nextReviewDate` impostata.
2. La vista "Ripeti oggi" elenca le varianti dovute.
3. Un esito con molti errori accorcia l'intervallo.

#### Criteri di completamento
Il ciclo di ripetizione spaziata funziona end-to-end in locale single-user.

#### Cosa non fare ancora
Niente notifiche push/email; niente sincronizzazione multi-dispositivo (richiede cloud → terza tornata).

---

### Prototipo 18 - Integrazione Stockfish

> **Ultimo rilascio pianificato della Parte 2.** Aggiunge il motore come aiuto allo studio durante l'inserimento/navigazione delle varianti, **mai** in allenamento.

#### Obiettivo
Integrare **Stockfish** con un perimetro **strettamente limitato** alle sole funzionalità seguenti:

1. **attivare/disattivare il motore** sulla posizione corrente durante l'**inserimento** o la **navigazione** delle varianti;
2. **mostrare/nascondere la barra di valutazione**;
3. **giocare la posizione corrente contro il computer aprendo una seconda tab del browser**, così da non perdere nella prima tab la situazione corrente.

Nessun'altra integrazione del motore è prevista in questa tornata.

#### Risultato funzionante atteso
Nel **dettaglio/editor** di una variante posso accendere/spegnere Stockfish sulla posizione corrente, mostrare/nascondere la barra di valutazione, e lanciare "gioca contro il computer" che apre una **nuova tab** con la posizione corrente, lasciando intatta la tab originale.

#### Backend workstream
- Decisione (R18): eseguire Stockfish **client-side via WebAssembly** (`stockfish.wasm` in un Web Worker) — **consigliato**: nessuna dipendenza server, coerente col principio "regole/motore lato client" e con la separazione FE/BE.
- **Nessun lavoro backend obbligatorio** (motore interamente client-side).

#### Frontend workstream
- Caricamento di `stockfish.wasm` in un **Web Worker**; wrapper minimale del protocollo **UCI** (`position fen ...`, `go depth/movetime`, parsing di `info score cp/mate`).
- **Toggle "Motore on/off"** sulla posizione corrente in **dettaglio/editor** (non in allenamento).
- **Toggle "Barra di valutazione"** (mostra/nascondi).
- Azione **"Gioca contro il computer"**: apre una **seconda tab** (es. una rotta dedicata `/play?fen=...`) inizializzata con la FEN corrente; la tab originale resta invariata.

#### Integration workstream
- Client-side: **nessun endpoint nuovo**. Attenzione: la versione **multi-thread** di Stockfish WASM richiede `SharedArrayBuffer` e quindi gli header di **cross-origin isolation** (COOP/COEP); se non configurabili, usare la versione **single-thread** (più lenta ma senza vincoli sugli header).
- La "seconda tab" passa lo stato via URL (FEN), così non serve stato condiviso tra tab.

#### Vincolo: niente motore in allenamento
- Stockfish **non deve mai** essere disponibile nelle **sessioni di allenamento**: niente toggle motore, **niente barra di valutazione**, **niente "gioca contro il computer"** in quella modalità (coerente col vincolo di P15).

#### Validazione del prototipo
1. In dettaglio/editor accendo il motore → compare la valutazione sulla posizione corrente.
2. Mostro/nascondo la barra di valutazione → funziona.
3. "Gioca contro il computer" → si apre una **nuova tab** con la posizione corrente; la prima tab resta com'era.
4. Avvio un allenamento → **nessuna** funzione del motore è presente.
5. La separazione `backend/` ↔ `frontend/` resta invariata.

#### Criteri di completamento
Le tre funzioni previste (toggle motore, barra valutazione, gioca-vs-computer in nuova tab) funzionano in dettaglio/editor; in allenamento il motore è del tutto assente.

#### Cosa non fare ancora
Niente suggerimento "mossa migliore", niente rilevamento blunder, niente *opening explorer*/database online, niente analisi multi-PV. **Eventuali ulteriori integrazioni Stockfish saranno valutate dopo questa tornata**, quando l'app sarà stata usata con costanza e saranno emerse necessità reali.

---

## 14. Sequenza operativa dei task (Parte 2)

Task piccoli (~1 ora), assegnabili ad agenti AI, sullo stesso modello della sezione 5 (Parte 1). Legenda area: **BE** backend, **FE** frontend, **INT** integrazione, **DOC** documentazione, **REV** review. La numerazione dei task segue quella dei prototipi (`T7.x` … `T18.x`). Le dipendenze tra prototipi rispettano l'ordine consigliato della sezione 12; i riferimenti a contratti/modello dati puntano alla sezione 15, ai rischi alla sezione 16.

### Prototipo 7 - Validazione backend + fix scacchiera
| ID | Titolo | Area | Scopo | Input | Output | Dipendenze | Validazione | Parallelo |
|----|--------|------|-------|-------|--------|------------|-------------|-----------|
| T7.1 | Decisione validazione (R13) + libreria scacchi Java | REV/DOC | Scegliere libreria (es. `chesslib`) o legalità solo client | sez. 16 R13 | decisione scritta | — | decisione approvata | con T7.5 |
| T7.2 | `VariantValidator` mainline + albero | BE | Validare legalità ricostruendo la posizione | T7.1 | validatore + unit test | T7.1 | mossa illegale rifiutata | no |
| T7.3 | Errori `400` strutturati | BE | Messaggi utili su payload non validi | T7.2 | corpo `{field,ply,message}` | T7.2 | `400` con dettaglio | no |
| T7.4 | Gestione `400` in editor/import | FE | Mostrare l'errore in UI | T7.3 | messaggio leggibile | T7.3 | errore visibile | no |
| T7.5 | Fix drag ghost: trascinare solo il pezzo | FE | Niente sfondo della casa nel drag | bug (screenshot) | drag image custom | — | trascina solo pezzo | con T7.1 |
| T7.6 | Nascondere il pezzo sulla casa d'origine durante il drag | FE | Casa di partenza vuota nel drag | bug (screenshot) | stile/classe `dragging` | T7.5 | origine vuota nel drag | no |
| T7.7 | Cornice scacchiera più stretta | FE | Bordo più sottile, coordinate leggibili | `chessboard.css` | cornice ridotta | — | cornice più stretta | con T7.6 |
| T7.8 | Validazione manuale P7 | REV | Confermare prototipo | T7.4, T7.6, T7.7 | checklist passata | tutte | sez. 13 P7 | no |

### Prototipo 8 - Consolidamento del modello ad albero
| ID | Titolo | Area | Scopo | Input | Output | Dipendenze | Validazione | Parallelo |
|----|--------|------|-------|-------|--------|------------|-------------|-----------|
| T8.1 | Test round-trip `tree` (DB↔DTO↔UI) | BE | Garantire integrità dell'albero | sez. 15 | test verdi | T7.2 | round-trip ok | con T8.3 |
| T8.2 | Formalizzare `children[0]=mainline` + derivazione `moves` | BE/DOC | Vincolo ufficiale e coerenza | ADR 0002 | regola + test | — | mainline coerente | no |
| T8.3 | Comando "promuovi a mainline" | FE | Riordinare i `children` del nodo | T8.2 | azione editor | T8.2 | ramo promosso | con T8.1 |
| T8.4 | Conferma cancellazione sottoalbero | FE | Evitare perdite accidentali | T8.3 | conferma su nodo con figli | T8.3 | conferma richiesta | no |
| T8.5 | Visualizzazione path/ramo corrente | FE | Distinguere mainline/varianti | — | UI ramo esplicita | — | ramo evidente | con T8.4 |
| T8.6 | Validazione manuale P8 | REV | Confermare prototipo | T8.* | checklist passata | tutte | sez. 13 P8 | no |

### Prototipo 9 - Robustezza interazioni e azioni distruttive
| ID | Titolo | Area | Scopo | Input | Output | Dipendenze | Validazione | Parallelo |
|----|--------|------|-------|-------|--------|------------|-------------|-----------|
| T9.1 | Dialog di conferma riusabile | FE | Conferme uniformi | — | componente | — | dialog funziona | con T9.4 |
| T9.2 | Conferme su delete variante/mossa | FE | Azioni distruttive protette | T9.1 | conferme collegate | T9.1 | annulla/conferma ok | no |
| T9.3 | Route guard `canDeactivate` sull'editor | FE | Avviso modifiche non salvate | — | guard | — | avviso all'uscita | con T9.1 |
| T9.4 | Servizio toast/snackbar | FE | Feedback esiti/errori | — | servizio toast | — | toast mostrato | con T9.1 |
| T9.5 | Stati loading/saving | FE | Disabilitare durante le chiamate | T9.4 | stati UI | T9.4 | niente doppio invio | no |
| T9.6 | Rifinire messaggi d'errore BE | BE | `400`/`404` chiari | — | messaggi | — | messaggi utili | con T9.5 |
| T9.7 | Validazione manuale P9 | REV | Confermare prototipo | T9.* | checklist passata | tutte | sez. 13 P9 | no |

### Prototipo 10 - Suite test automatici + checklist E2E
| ID | Titolo | Area | Scopo | Input | Output | Dipendenze | Validazione | Parallelo |
|----|--------|------|-------|-------|--------|------------|-------------|-----------|
| T10.1 | Test integrazione controller `Variant` | BE | Coprire CRUD/validazione/round-trip | T7-T9 | test verdi | T8 | suite passa | con T10.2 |
| T10.2 | Test flussi editor/training con rami | FE | Coprire i percorsi critici | T8 | test verdi | T8 | flussi coperti | con T10.1 |
| T10.3 | Checklist E2E scritta | INT/DOC | Verifiche ripetibili | sez. 5.5 stato avanz. | checklist | — | checklist eseguibile | no |
| T10.4 | (Opz.) runner E2E leggero | FE | Automatizzare i percorsi | T10.3 | smoke E2E | T10.3 | percorso verde | no |
| T10.5 | Validazione manuale P10 | REV | Confermare prototipo | T10.* | esito | tutte | sez. 13 P10 | no |

### Prototipo 11 - Modello Studi (backend)
| ID | Titolo | Area | Scopo | Input | Output | Dipendenze | Validazione | Parallelo |
|----|--------|------|-------|-------|--------|------------|-------------|-----------|
| T11.1 | Entità `Study` + repository | BE | Persistenza studi | sez. 15 | entità/repo | — | salva/legge | con T11.5 |
| T11.2 | Relazione `Study→Variant` + `studyId` + cascata | BE | 1-N con delete a cascata | T11.1 | mapping + cascade | T11.1 | cascade ok | no |
| T11.3 | `StudyService`/`StudyController` CRUD | BE | API studi | T11.2 | GET/POST/PUT/DELETE | T11.2 | CRUD ok | con T11.4 |
| T11.4 | Seed studio default + aggancio varianti esistenti | BE | Migrazione retrocompatibile | T11.2 | seed idempotente | T11.2 | varianti agganciate | con T11.3 |
| T11.5 | Modello TS `Study` + `StudyService` (FE) | FE | Consumare API studi | sez. 15 | servizio/modello | — | metodi CRUD | con T11.1 |
| T11.6 | Contratto studi documentato | INT/DOC | Allineare FE/BE | sez. 15 | contratto aggiornato | T11.3 | contratto approvato | no |
| T11.7 | Test CRUD studi + cascata | BE | Prevenire regressioni | T11.3, T11.4 | test verdi | T11.3 | cascade testata | no |
| T11.8 | Validazione manuale P11 | REV | Confermare prototipo | T11.* | esito | tutte | sez. 13 P11 | no |

### Prototipo 12 - UI Studi + audio mosse
| ID | Titolo | Area | Scopo | Input | Output | Dipendenze | Validazione | Parallelo |
|----|--------|------|-------|-------|--------|------------|-------------|-----------|
| T12.1 | Endpoint `POST /studies/{id}/variants` | BE | Crea variante nello studio | T11.3 | endpoint | T11.3 | variante agganciata | con T12.2 |
| T12.2 | `StudyList` (home) + crea/elimina studio | FE | Navigare e gestire studi | T11.5 | componente | T11.5 | studi listati, crea/elimina | con T12.1 |
| T12.3 | `StudyDetail` + lista varianti + azioni | FE | Gestire varianti nello studio | T12.2 | componente | T12.2 | varianti gestibili | no |
| T12.4 | Conferma elimina studio (avviso cascata) | FE | Protezione + chiarezza | T9.1, T12.2 | conferma con avviso | T12.2 | avviso cascata | no |
| T12.5 | Routing `/`→studi, `/studies/:id` + breadcrumb | FE | Navigazione studi/varianti | T12.2, T12.3 | rotte | T12.3 | navigazione ok | no |
| T12.6 | `MoveSoundService` + asset suono mossa | FE | Riprodurre suono stile Fritz/ChessBase a ogni mossa legale | componente scacchiera + asset licenziato/equivalente | servizio audio + asset | T12.3 | suono udibile su mossa legale | con T12.5 |
| T12.7 | Toggle/preferenza locale audio | FE | Rendere il suono disattivabile | T12.6 | impostazione locale | T12.6 | audio on/off persistente localmente | no |
| T12.8 | Integrazione home a studi (sostituire lista varianti) | INT | Reale end-to-end | T12.1, T12.5, T12.7 | flusso completo | T12.5, T12.7 | crea/elimina studio+variante + audio verificato | no |
| T12.9 | Validazione manuale P12 | REV | Confermare prototipo | T12.* | esito | tutte | sez. 13 P12 | no |

### Prototipo 13 - Import PGN avanzato
| ID | Titolo | Area | Scopo | Input | Output | Dipendenze | Validazione | Parallelo |
|----|--------|------|-------|-------|--------|------------|-------------|-----------|
| T13.1 | Decisione parsing PGN avanzato (R15) | REV/DOC | FE vs BE | sez. 16 R15 | decisione | — | decisione approvata | no |
| T13.2 | Parser PGN→`MoveNode[]` (varianti annidate) | FE | Costruire l'albero dai rami | T13.1 | parser + test | T13.1 | rami corretti | con T13.3 |
| T13.3 | Gestione commenti `{}`/NAG `$n` di base | FE | Non rompere il parsing | T13.2 | parsing robusto | T13.2 | nessun crash | no |
| T13.4 | Anteprima ad albero del PGN | FE | Verifica pre-salvataggio | T13.2 | anteprima | T13.2 | albero mostrato | con T13.3 |
| T13.5 | Salvataggio `tree` da import | INT | Persistere l'import | T13.2, T11.3 | salvataggio | T13.4 | rami ritrovati | no |
| T13.6 | Validazione manuale P13 | REV | Confermare prototipo | T13.* | esito | tutte | sez. 13 P13 | no |

### Prototipo 14 - Import studio Lichess pubblico
| ID | Titolo | Area | Scopo | Input | Output | Dipendenze | Validazione | Parallelo |
|----|--------|------|-------|-------|--------|------------|-------------|-----------|
| T14.1 | Parser URL Lichess study/chapter | FE | Estrarre `studyId` e `chapterId?` | link utente | parser + test | — | URL validi/invalidi | con T14.2 |
| T14.2 | Fetch PGN pubblico da Lichess | FE | Scaricare PGN studio/capitolo | T14.1 | client fetch | T14.1 | PGN ricevuto / errori gestiti | no |
| T14.3 | Split PGN multi-capitolo | FE | Separare capitoli dello studio | T13.2, T14.2 | lista capitoli | T13.2 | capitoli riconosciuti | no |
| T14.4 | Anteprima import Lichess | FE | Mostrare studio/capitoli prima del salvataggio | T14.3 | preview | T14.3 | preview corretta | con T14.5 |
| T14.5 | Endpoint `POST /studies/import` | BE | Salvare studio+varianti in transazione | sez. 15 | endpoint bulk | T11.3, T13.5 | rollback su errore | no |
| T14.6 | Salvataggio studio/capitolo importato | INT | Persistenza locale dell'import | T14.4, T14.5 | studio/varianti locali | T14.5 | varianti agganciate | no |
| T14.7 | Gestione errori Lichess (`404`/`429`/rete) | FE | Feedback chiaro | T14.2 | messaggi UI | T14.2 | errori leggibili | con T14.4 |
| T14.8 | Validazione manuale P14 | REV | Confermare prototipo | T14.* | esito | tutte | sez. 13 P14 | no |

### Prototipo 15 - Persistenza sessioni di allenamento
| ID | Titolo | Area | Scopo | Input | Output | Dipendenze | Validazione | Parallelo |
|----|--------|------|-------|-------|--------|------------|-------------|-----------|
| T15.1 | Entità `TrainingSession`/`TrainingMove` | BE | Persistere le sessioni | sez. 15 / sez. 7 | entità/repo | — | salva sessione | con T15.3 |
| T15.2 | Endpoint `POST`/`GET /training-sessions` | BE | Registrare/leggere | T15.1 | endpoint | T15.1 | sessione rileggibile | no |
| T15.3 | Invio sessione a fine training | FE | Registrare l'esito | T15.2 | chiamata FE | T15.2 | sessione creata | no |
| T15.4 | Nota vincolo "niente motore in allenamento" | DOC | Allineare con P18 | — | nota | — | vincolo documentato | con T15.3 |
| T15.5 | Validazione manuale P15 | REV | Confermare prototipo | T15.* | esito | tutte | sez. 13 P15 | no |

### Prototipo 16 - Statistiche e reportistica
| ID | Titolo | Area | Scopo | Input | Output | Dipendenze | Validazione | Parallelo |
|----|--------|------|-------|-------|--------|------------|-------------|-----------|
| T16.1 | Endpoint aggregazione `GET /stats/...` | BE | Metriche dalle sessioni | T15.2 | endpoint | T15.2 | dati corretti | con T16.2 |
| T16.2 | Vista statistiche per variante | FE | Mostrare le metriche | T16.1 | vista | T16.1 | metriche viste | no |
| T16.3 | Aggregato per studio | FE/BE | Somma per studio | T16.1 | aggregato | T16.1 | somma corretta | con T16.2 |
| T16.4 | Evidenza mosse più sbagliate | FE | Insight di studio | T16.2 | UI evidenza | T16.2 | mosse evidenziate | no |
| T16.5 | Validazione manuale P16 | REV | Confermare prototipo | T16.* | esito | tutte | sez. 13 P16 | no |

### Prototipo 17 - Spaced repetition
| ID | Titolo | Area | Scopo | Input | Output | Dipendenze | Validazione | Parallelo |
|----|--------|------|-------|-------|--------|------------|-------------|-----------|
| T17.1 | `ReviewSchedule` + algoritmo SM-2 semplificato | BE | Calcolo delle ripetizioni | sez. 7 | schema + algoritmo | T15.1 | intervallo calcolato | con T17.4 |
| T17.2 | Aggiornare lo schedule a fine sessione | BE | Persistere la prossima review | T17.1, T15.2 | update | T17.1 | `nextReviewDate` impostata | no |
| T17.3 | Endpoint `GET /reviews/due` | BE | Varianti dovute | T17.2 | endpoint | T17.2 | dovute corrette | con T17.4 |
| T17.4 | Vista "Ripeti oggi" + avvio training | FE | Proporre le varianti dovute | T17.3 | vista | T17.3 | elenco dovute | no |
| T17.5 | Indicatore prossima ripetizione nel dettaglio | FE | Visibilità dello schedule | T17.2 | indicatore | T17.2 | data mostrata | con T17.4 |
| T17.6 | Validazione manuale P17 | REV | Confermare prototipo | T17.* | esito | tutte | sez. 13 P17 | no |

### Prototipo 18 - Integrazione Stockfish
| ID | Titolo | Area | Scopo | Input | Output | Dipendenze | Validazione | Parallelo |
|----|--------|------|-------|-------|--------|------------|-------------|-----------|
| T18.1 | Caricare `stockfish.wasm` in Web Worker + wrapper UCI | FE | Motore client-side | sez. 16 R18 | worker + wrapper | — | valutazione ottenuta | no |
| T18.2 | Toggle motore on/off (dettaglio/editor) | FE | Attivare sulla posizione corrente | T18.1 | toggle | T18.1 | on/off ok | con T18.3 |
| T18.3 | Barra di valutazione mostra/nascondi | FE | Visualizzare/nascondere l'eval | T18.1 | barra | T18.1 | barra toggle | con T18.2 |
| T18.4 | "Gioca contro il computer" → nuova tab `/play?fen=` | FE | Giocare la posizione corrente | T18.1 | rotta + azione | T18.1 | nuova tab, prima intatta | no |
| T18.5 | Garantire assenza del motore in allenamento | FE | Rispettare il vincolo | T18.2, T18.3, T18.4 | guardia UI | T15.4 | nessun motore in training | no |
| T18.6 | Header COOP/COEP o fallback single-thread | INT | Far girare il WASM | T18.1 | config/fallback | T18.1 | motore funziona | con T18.5 |
| T18.7 | Validazione manuale P18 | REV | Confermare prototipo | T18.* | esito | tutte | sez. 13 P18 | no |

**Task trasversali (ricorrenti):** `DOC.x` aggiornamento documentazione a fine prototipo; `REV.x` code review prima del merge. Non vanno svolti in parallelo con la modifica che revisionano. Come nella Parte 1, ogni prototipo si chiude solo quando la sua riga di validazione manuale (`REV`) passa.

---

## 15. Contratti e modello dati della Parte 2

> Estende la sezione 6 (contratto attuale) e la sezione 7 (modello dati). Base URL `/api`.

### Nuovi endpoint REST (Parte 2)
| Metodo | Path | Scopo | Introdotto in |
|--------|------|-------|---------------|
| GET | `/api/studies` | Lista studi (con conteggio varianti) | P11 |
| GET | `/api/studies/{id}` | Dettaglio studio + sue varianti | P11 |
| POST | `/api/studies` | Crea studio | P11 |
| PUT | `/api/studies/{id}` | Aggiorna studio (nome/descrizione) | P11 |
| DELETE | `/api/studies/{id}` | Elimina studio **e le sue varianti (cascata)** | P11 |
| POST | `/api/studies/{id}/variants` | Crea variante dentro lo studio | P12 |
| POST | `/api/studies/import` | Crea uno studio con piu' varianti in transazione (import bulk) | P14 |
| POST | `/api/training-sessions` | Registra una sessione di allenamento conclusa | P15 |
| GET | `/api/training-sessions` | Storico sessioni (filtri per variante/studio) | P15 |
| GET | `/api/stats/...` | Aggregazioni statistiche (variante/studio) | P16 |
| GET | `/api/reviews/due` | Varianti dovute per spaced repetition | P17 |

> Lo **spostamento di varianti tra studi** (`PUT /api/variants/{id}/study`) è stato **rimosso** dai rilasci: vedi sezione 19 · TODO da validare. Stockfish (P18) è client-side e non introduce endpoint.

### Endpoint esterni Lichess usati in P14

| Metodo | URL | Scopo | Note |
|--------|-----|-------|------|
| GET | `https://lichess.org/api/study/{studyId}.pgn` | Esporta tutti i capitoli pubblici di uno studio in PGN | Parametri consigliati: `comments=true`, `variations=true`, `orientation=true`, `clocks=false` |
| GET | `https://lichess.org/api/study/{studyId}/{chapterId}.pgn` | Esporta un singolo capitolo pubblico in PGN | `studyId` e `chapterId` sono gli 8 caratteri letti dal link Lichess |

> Le API Lichess sono usate **senza autenticazione** in Parte 2: quindi si importano solo studi/capitoli pubblici. Per studi privati/unlisted servirebbe OAuth (`study:read`), rinviato fuori dal P14.

### Nuovi DTO

**`StudyDto`** (risposta)
```
id: number
name: string
description?: string
color?: "WHITE" | "BLACK" | "MIXED"   // opzionale: repertorio per colore
variantCount: number                  // nel dettaglio: variants[] completo
createdAt?: string
```

**`CreateStudyRequest`** (richiesta)
```
name: string                          // obbligatorio, non vuoto
description?: string
color?: "WHITE" | "BLACK" | "MIXED"
```

**`VariantDto` — campi aggiunti**
```
studyId?: number | null               // studio di appartenenza (null solo per varianti legacy senza studio)
```

**`ImportStudyRequest`** (P14, richiesta)
```
name: string
description?: string
sourceUrl?: string                    // link Lichess originale, se presente
variants: CreateVariantRequest[]      // varianti gia' parse; il backend valida e salva in transazione
```

**Errore di validazione (P7)** — corpo del `400`
```
{ field: string, ply?: number, branchPath?: number[], message: string }
```

### Modello dati — estensioni

**Entità `Study`** (nuova)
```
Study {
  id: Long (PK)
  name: String (not null)
  description: String (nullable, text)
  color: enum WHITE/BLACK/MIXED (nullable)
  createdAt: timestamp
}
```

**Entità `Variant`** — campi aggiunti
```
studyId: Long (FK -> Study, nullable)   // null solo per varianti legacy senza studio
```
> La relazione `Study → Variant` è configurata con **cancellazione a cascata**: eliminando lo `Study` si eliminano le sue `Variant` (es. `ON DELETE CASCADE` / `orphanRemoval`). Le varianti **non** vengono riassegnate.

**Entità `TrainingSession` / `TrainingMove`** (P15, già abbozzate in sezione 7) e **`ReviewSchedule`** (P17, sezione 7): si attivano solo nelle rispettive fasi.

> Principio invariato (sezione 7): aggiungere colonne nullable è economico. `studyId` garantisce la retrocompatibilità; al deploy del modello Studi (P11) le varianti esistenti vengono agganciate a uno studio di default dal seed.

---

## 16. Rischi aggiornati (Parte 2)

| ID | Rischio | Descrizione | Impatto | Quando | Decisione minima |
|----|---------|-------------|---------|--------|------------------|
| R13 | **Validazione scacchistica lato backend** | Servono regole scacchistiche in Java per validare albero/mainline | Medio | P7 | Valutare libreria Java (es. `chesslib`); alternativa: legalità solo client e API "best effort". Consigliato: libreria. |
| R14 | **Modello Studi e cancellazione** | Cardinalità Study↔Variant; cosa fare alla delete dello studio; migrazione esistenti | Medio | P11 | 1-N con `studyId`; **delete studio cancella a cascata le sue varianti** (non spostate); studio di default seedato in P11 con aggancio delle varianti esistenti. |
| R15 | **Import PGN ramificato** | Mapping PGN → `tree` con varianti annidate, commenti, NAG | Medio | P13 | Parsing lato frontend con `chess.js`; commenti/NAG di base, resto rinviato. (L'export PGN è fuori dai rilasci: sezione 19.) |
| R16 | **Scalabilità/responsive scacchiera** | La board resta 720px tra ~800-1280px e il pannello finisce sotto la piega (vedi sezione 17) | Medio (UX) | Trasversale | La correzione è una **proposta grafica da validare** (sezione 17), non un rilascio finché l'utente non approva. |
| R17 | **Persistenza dati di apprendimento** | Sessioni/stats/scheduling fanno crescere lo schema H2 locale | Basso/Medio | P15-P17 | Tabelle dedicate, `userId` nullable inattivo; migrazioni versionate rinviate alla terza tornata. |
| R18 | **Integrazione Stockfish** | Esecuzione del motore (WASM in Web Worker), threading/`SharedArrayBuffer` (header COOP/COEP), performance su client deboli | Medio | P18 | Stockfish **WASM client-side** in Web Worker; perimetro limitato (toggle motore, barra valutazione, gioca-vs-computer in nuova tab); **mai in allenamento**; versione **single-thread** se gli header cross-origin non sono disponibili. |
| R19 | **Asset audio mossa** | Il suono richiesto deve avere target percettivo Fritz/ChessBase; l'asset originale potrebbe essere proprietario/non disponibile | Medio (licenza + fedeltà) | P12 | Usare asset originale solo se fornito con licenza/permesso d'uso; altrimenti creare/usare un effetto equivalente, breve e secco, senza copiare file proprietari. Audio locale frontend, default attivo e disattivabile. |
| R20 | **Import studio Lichess pubblico** | URL non valido, studio non pubblico, rate limit `429`, CORS/API esterna, PGN multi-capitolo | Medio | P14 | Supportare solo link pubblici senza OAuth; usare endpoint PGN ufficiali Lichess; una richiesta alla volta; messaggi dedicati per `404`/`429`; salvataggio locale transazionale via `POST /api/studies/import`. |

> I rischi R8/R9/R10 (Supabase DB, Auth, Docker) restano **aperti e rinviati** alla terza tornata per scelta esplicita.

---

## 17. Validazione UX e proposte grafiche — DA VALIDARE, fuori dai rilasci

> Esito della validazione dell'apparenza grafica eseguita sul frontend in esecuzione (home, dettaglio, training; desktop 1400px, laptop 1024px, mobile 375px; nessun errore in console).
> **Queste proposte NON sono inserite nei prototipi 7-18:** vanno approvate dall'utente prima di diventare task. Sono ordinate per priorità.

### Cosa funziona già bene
- Palette pergamena/legno coerente col riferimento; scacchiera con cornice mogano e coordinate fedele.
- Mobile (375px): la board scala a ~90vw e i pannelli si impilano in modo pulito.
- Desktop largo (≥~1300px): board e pannello affiancati correttamente.
- Nessun errore in console su nessuna delle pagine provate.

### Proposte (da validare)

1. **[ALTA] Scalabilità responsive della scacchiera.** *Problema osservato:* tra ~800px e ~1280px la board resta fissa a 720px (`min(90vw, 720px)`) e il pannello "Mosse & varianti" + i controlli vanno **sotto la piega** (a 1024px la pagina è alta ~1403px, controlli nascosti). *Proposta:* layout a griglia in cui la board si ridimensiona per condividere la riga col pannello — es. larghezza board `clamp(320px, calc(100vw - 380px - gap), 720px)` — e stack verticale **solo** sotto un vero breakpoint mobile (~720px). Effetto: board+pannello sempre affiancati e visibili su laptop/tablet landscape.

2. **[MEDIA] Composizione e spazi vuoti su schermi larghi.** *Problema:* il blocco dettaglio/training è ancorato in alto a sinistra, con ampie aree vuote a destra e sotto. *Proposta:* centrare orizzontalmente (e bilanciare verticalmente) il contenuto; valutare un cap della board (~560-640px) per equilibrarla col pannello, o arricchire il pannello (commento mossa corrente, mini-statistiche della variante).

3. **[MEDIA] Densità e gerarchia della lista.** *Problema:* lista a colonna singola, `max-width 720px`, percepita sparsa; poca gerarchia oltre nome+badge. *Proposta:* griglia di card responsive con anteprima delle prime mosse; (si integra naturalmente con il raggruppamento per **studio** dei prototipi P11-P12); badge colore con contrasto verificato.

4. **[MEDIA] Accessibilità e focus da tastiera.** *Proposta:* stati `:focus-visible` evidenti su move-buttons e controlli replay; verifica contrasto del testo "muted" su pergamena (target WCAG AA); `aria-live` per il feedback del training (mossa giusta/sbagliata); etichette aria sui controlli complessi.

5. **[MEDIA] Feedback e stati.** *Proposta:* sistema **toast/snackbar** (si lega a P9) per salvataggi/errori; skeleton di caricamento al posto del testo "Caricamento…"; empty-state curato (illustrazione + call-to-action) quando non ci sono varianti/studi.

6. **[BASSA/MEDIA] Affordance sulla scacchiera.** *Proposta:* evidenziare l'**ultima mossa**, evidenziare lo **scacco**, pulsante "**ruota scacchiera**" nel dettaglio/editor, hover sulle case di destinazione legali.

7. **[BASSA] Tema scuro.** I token sono già variabili CSS: predisporre una variante dark con toggle, utile in sessioni serali.

8. **[BASSA] Micro-interazioni residue.** Animazione morbida del movimento pezzo; transizioni coerenti. Il suono mossa non è più una proposta opzionale: è stato promosso a requisito del Prototipo 12.

---

## 18. Idee per la terza tornata di analisi

> Da pianificare in una sessione futura, **dopo** la Parte 2. Comprende gli "ultimissimi passi" esplicitamente rinviati e ulteriori spunti emersi.

### Ultimissimi passi (già rinviati per scelta)
- **Multiutente:** attivare `userId` (oggi predisposto e nullable) su varianti, studi, sessioni.
- **Autenticazione Supabase Auth:** identità e protezione endpoint (rischio R9).
- **Migrazioni versionate (Liquibase/Flyway):** schema ripetibile e versionato, prerequisito per ambienti non-locali (sezione 5.7 stato avanzamento).
- **Supabase PostgreSQL:** migrazione da H2 file → Postgres; verifica compatibilità colonne `text`, converter JSON e modello `tree` (rischio R8).
- **Docker/containerizzazione:** due immagini distinte FE/BE (la separazione di progetto è già pronta, rischio R10).

### Altri spunti emersi (da valutare)
- **Condivisione/esportazione studi** in stile Lichess (link/JSON/PGN di intero studio).
- **Tag e ricerca** trasversali alle varianti/studi (full-text su nome e mosse).
- **Import file `.pgn` locale** e PGN multi-partita non proveniente da Lichess; gestione NAG/commenti completa.
- **Backup/restore** del repertorio locale (export/import dell'intero DB applicativo).
- **PWA/offline** e, più avanti, app mobile dedicata.
- **Gamification leggera** (streak di ripetizione) a supporto della spaced repetition.
- **Sincronizzazione multi-dispositivo** (dipende da Supabase, terza tornata).

---

## 19. TODO da validare (fuori dai rilasci pianificati)

> Funzionalità **rimosse dalla roadmap della Parte 2** e tenute solo come nota: non è chiaro se serviranno davvero. Vanno **validate dall'utente** prima di rientrare in un eventuale rilascio. Non sono task attivi.

- **Export PGN** (di una variante e/o di un intero studio). *Motivo del rinvio:* non è una feature rilevante al momento. *Se servirà:* generazione lato frontend dell'albero `tree` → PGN con varianti tra parentesi, con verifica di round-trip rispetto all'import avanzato (P13).
- **Spostamento di varianti tra studi** (riassegnazione `studyId`, es. `PUT /api/variants/{id}/study`, + eventuale riordino dentro lo studio). *Motivo del rinvio:* incertezza sull'effettiva utilità. *Se servirà:* UI "sposta in studio" dal dettaglio/lista variante e relativo endpoint; valutare anche il riordino (`orderIndex`).

---

*Fine del planning. Documento di sola pianificazione: nessun codice applicativo incluso. I file `preanalisi-progetto.md` e `CLAUDE.md` restano la fonte autorevole per obiettivo, stack e versioni. La Parte 2 (sezioni 11-19) estende la Parte 1 senza sostituirla; le proposte grafiche della sezione 17 e i TODO della sezione 19 restano subordinati alla validazione dell'utente.*
