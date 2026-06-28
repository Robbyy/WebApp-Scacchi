# Proposta di riorganizzazione documentazione progetto

> Proposta adottata come base per la riorganizzazione documentale del progetto.
> Mantiene gli obiettivi di partenza (niente duplicazioni, documentazione non pesante,
> separazione corrente/storico/ADR/backlog/roadmap, gestibilità con agenti AI) adottando un
> **set documentale minimo** e una regola forte: *il codice e i test sono la fonte di verità,
> i documenti sono panoramiche sottili e puntatori*.

---

## 0. Sintesi delle scelte (approccio snello)

Le scelte di questa proposta, a confronto con un approccio massimalista (molti documenti
"completi" mantenuti a mano):

| Tema | Approccio esteso | Questa proposta |
|------|------------------|-----------------|
| Documenti "vivi" | ~9 nuovi file a mano | **4** file vivi + i 2 README esistenti |
| API e modello dati | `api-contracts.md` + `modello-dati.md` scritti e mantenuti a mano | **Sezioni** di `architettura.md` (panoramica, "il codice è la fonte") + in prospettiva **OpenAPI generato** (springdoc) |
| Setup e test | nuovi `setup-locale.md` + `test-e-validazione.md` | **restano nei README** di backend/frontend (già aggiornati) — niente duplicazione |
| Roadmap e backlog | due file separati, backlog a 6 stati | **un solo** `roadmap.md` leggero; il "Fatto" è il **git log** |
| Documento d'ingresso | `docs/README-progetto.md` | **`README.md` in root** (convenzionale e scopribile) |
| Archiviazione | spostamento "a blocco" dei file storici | **estrazione prima dell'archiviazione** (il contenuto vivo non resta sepolto nell'archivio) |
| Stato corrente | snapshot datati a ogni aggiornamento | **snapshot di milestone** in archive (`stato-avanzamento-2026-06-28.md`, fine Parte 2) **+** `docs/stato-corrente.md` vivo e sfoltito |
| Riferimenti incrociati | "adattare i percorsi" | **step esplicito** di riscrittura (sezioni planning, numeri ADR, path, `CLAUDE.md`, `MEMORY.md`, `.claude/`) |
| Disciplina di aggiornamento | solo prosa | **regola operativa** ("cambi controller → aggiorni la sezione API nello stesso commit"), idealmente un hook |
| OpenSpec | citato come prossimo passo | **posticipato** finché i doc di base non sopravvivono a qualche cambiamento |
| Esecuzione | big-bang | **feature branch + commit piccoli + PR** |
| Pulizia | non citata | **elimina `backend/HELP.md`** (boilerplate), colloca `checklist-e2e.md` |

Criterio di fondo: **la documentazione non deve pesare più del progetto**. Per
un'app personale a sviluppatore singolo, meno file vivi e ben mirati battono molti file
"completi" destinati a divergere dal codice.

---

## 1. Obiettivo della riorganizzazione

Il progetto è passato dalla prototipazione (Parte 1 e Parte 2, P0-P19, completate) a una
fase di manutenzione, consolidamento e infrastruttura. La documentazione attuale ha avuto
valore durante la costruzione, ma oggi mescola storia, pianificazione completata, stato e
idee future.

Obiettivo: separare **documentazione corrente**, **tecnica stabile (ADR)**, **futuro
(roadmap/backlog)** e **storico**, *senza* gonfiare il numero di documenti e *senza*
creare fonti secondarie che il codice rende subito obsolete.

Vincolo aggiuntivo: **ogni nuovo documento vivo deve guadagnarsi il posto.** Se
un'informazione è già nel codice, nei test o nei README, non si duplica: si punta ad essa.

---

## 2. Diagnosi (sintetica)

`planning-prototipi-webapp.md` e `stato-avanzamento-lavori.md` mescolano analisi, roadmap
completata, prototipi chiusi, stato, TODO e rischi. Il problema non è la qualità dei
contenuti ma la loro **funzione attuale**: costringono un agente a distinguere di continuo
tra ciò che è valido, superato o già fatto.

Questa proposta risolve il problema **riducendo** la superficie viva e spostando la storia
in archivio, ma evita l'errore opposto: sostituire due file pesanti con nove file da mantenere.

---

## 3. Principi guida

1. **Un documento = una domanda.**
2. **Peso proporzionato:** pochi documenti vivi, brevi, davvero mantenuti.
3. **Codice e test sono la fonte primaria;** i documenti sono panoramiche e puntatori.
4. **Non scrivere a mano ciò che il codice già codifica** (firme API, campi entità):
   o si genera (OpenAPI), o si tiene una panoramica con disclaimer esplicito.
5. **Estrarre prima di archiviare:** nessun contenuto vivo deve restare sepolto in `archive/`.
6. **La storia vive in git e in `archive/`,** mai nei documenti correnti.

---

## 4. Struttura consigliata (minima)

```text
README.md                         # ingresso progetto: cos'è, stato in 5 righe, indice
CLAUDE.md                         # regole agente + ordine di lettura (aggiornato)
backend/README.md                 # setup + test backend (già esistente, aggiornato)
frontend/README.md                # setup + test frontend (già esistente, aggiornato)
docs/
├── stato-corrente.md             # UNICO documento di stato vivo (ex stato-avanzamento, sfoltito)
├── architettura.md               # architettura + panoramica API + mappa entità
├── roadmap.md                    # futuro + backlog leggero (in un solo file)
├── checklist-e2e.md              # checklist manuale (spostata qui)
├── adr/
│   └── decisioni-tecniche.md     # ADR 0001-0012 (solo spostato)
└── archive/
    ├── preanalisi-progetto.md
    ├── planning-prototipi-webapp.md
    └── stato-avanzamento-2026-06-28.md   # snapshot di milestone (fine Parte 2)
```

- **Vivi e brevi:** `README.md`, `docs/stato-corrente.md`, `docs/architettura.md`,
  `docs/roadmap.md` (più i 2 README di modulo, già presenti).
- **Stabile/append-only:** `docs/adr/decisioni-tecniche.md`.
- **Storico, consultabile ma non guida lo sviluppo:** `docs/archive/`.

Niente `api-contracts.md`, `modello-dati.md`, `setup-locale.md`, `test-e-validazione.md`
**separati**: i loro contenuti vivono come sezioni di `architettura.md` o restano nei
README, evitando quattro superfici in più da sincronizzare.

---

## 5. Ruolo dei documenti

### 5.1 `README.md` (root)

Ingresso del progetto, conventionale e scopribile (oggi un README in root **non esiste**:
ci sono solo quelli di backend/frontend). Breve.

Contiene: nome e scopo dell'app; descrizione sintetica; **stato in 5 righe**; stack;
struttura repo; **indice dei documenti** con ordine di lettura. *Non* contiene cronologia
dei prototipi, dettagli API, ADR, checklist o backlog.

Esempio:

```markdown
# WebApp Scacchi

Webapp personale per l'allenamento delle aperture di scacchi: gestione di studi e
varianti, allenamento su scacchiera con controllo errori, import PGN e studi Lichess,
sessioni di allenamento, statistiche e spaced repetition.

## Stato
Parte 1 e Parte 2 (P0-P19) completate e verificate in locale (backend 66 test,
frontend 168). Prossima fase: infrastruttura (migrazioni, Supabase, Docker, CI/CD).

## Stack
Frontend Angular · Backend Java/Spring Boot · DB locale H2 (futuro: Supabase PostgreSQL,
Auth) · Stockfish client-side · Git.

## Documentazione
- `docs/stato-corrente.md` — cosa esiste oggi
- `docs/architettura.md` — come è fatto + API + dati
- `docs/roadmap.md` — cosa viene dopo
- `docs/adr/decisioni-tecniche.md` — decisioni tecniche
- `backend/README.md`, `frontend/README.md` — avvio e test
```

### 5.2 `docs/stato-corrente.md`

Il documento operativo più importante: **cosa esiste davvero oggi**. **Derivato** dall'attuale
`stato-avanzamento-lavori.md` (già riallineato a fine Parte 2): la fotografia completa al
2026-06-28 si **conserva come copia archiviata** (vedi §6), mentre `stato-corrente.md` ne
mantiene la sola parte viva, **sfoltita** dalla cronologia per-prototipo.

Sezioni: data aggiornamento · sintesi · funzionalità implementate · backend (moduli,
endpoint principali, DB, test) · frontend (aree, servizi, routing, test) · funzionalità
verificate live · problemi noti · aree delicate · non ancora implementato · prossima fase.

**Regola dura:** breve, niente diario cronologico. La storia per-prototipo vive nella copia
archiviata `docs/archive/stato-avanzamento-2026-06-28.md`, in
`docs/archive/planning-prototipi-webapp.md` e nel git log — non in `stato-corrente.md`.

### 5.3 `docs/architettura.md`

Descrive il sistema e **assorbe** la panoramica API e la mappa dati (invece di tenerle in
due file separati). Disclaimer in testa: *questa è una panoramica; la fonte autorevole
sono controller, DTO ed entità JPA, più i test*.

Sezioni:

- **Vista generale:** due app separate (`backend/` Spring Boot, `frontend/` Angular),
  comunicazione solo via REST.
- **Backend:** Java/Spring Boot/Maven/JPA/H2; package `ping`, `variant`, `study`,
  `training`, `stats`, `review`; validazione scacchistica con `chesslib`.
- **Frontend:** Angular standalone/signals; scacchiera custom + `chess.js`; editor,
  training, import PGN, import/OAuth Lichess, Stockfish client-side, statistiche, reviews.
- **Scelte importanti:** scacchiera custom; `chess.js` (frontend) / `chesslib` (backend);
  modello ad albero `MoveNode` (`children[0]` = mainline); Stockfish in Web Worker, mai in
  allenamento; OAuth Lichess solo per leggere gli studi, non per il login applicativo.
- **Vincoli:** frontend/backend separati; niente React nel frontend; niente Supabase/Docker
  finché non pianificati; H2 attuale non è schema definitivo.
- **Panoramica API (sintetica, non contrattuale):** tabella metodo/path/scopo —

  | Metodo | Path | Scopo |
  |--------|------|-------|
  | GET | `/api/ping` | health check |
  | GET/POST/PUT/DELETE | `/api/studies`, `/api/studies/{id}` | CRUD studi |
  | POST | `/api/studies/{id}/variants` | crea variante nello studio |
  | POST | `/api/studies/import`, `/api/studies/import/lichess` | import bulk / upsert Lichess |
  | GET/POST/PUT/DELETE | `/api/variants`, `/api/variants/{id}` | CRUD varianti |
  | POST/GET | `/api/training-sessions`, `/api/training-sessions/{id}` | sessioni (filtri `?variantId`/`?studyId`) |
  | GET | `/api/stats/variants/{id}`, `/api/stats/studies/{id}` | statistiche |
  | GET | `/api/reviews/due`, `/api/reviews/variants/{id}` | spaced repetition (204 se non pianificata) |

  Errore di validazione strutturato: `{ field, ply, branchPath, message }`. **Per
  request/response dettagliate → i controller e i DTO**; in prospettiva, esporre lo schema
  con **springdoc-openapi** e linkare lo Swagger invece di mantenere JSON a mano.
- **Mappa entità (overview, non campo-per-campo):**
  - `Study` 1—N `Variant` (FK `study_id`, **delete a cascata**); campi sorgente Lichess.
  - `Variant`: `moves` (mainline) + `tree` (`MoveNode`, `children[0]` = mainline), `sourcePgn`.
  - `TrainingSession` 1—N `TrainingMove` (cascade); `studyId` denormalizzato; `userId` nullable.
  - `ReviewSchedule`: una per variante (SM-2: `easeFactor`, `intervalDays`, `repetitions`,
    `nextReviewDate`, `lastReviewedAt`).
  - **Campi esatti → entità JPA.** Nota: `ddl-auto=update` non allarga le colonne esistenti
    (drift già emerso su `source_pgn`); prima di PostgreSQL servono migrazioni versionate.

### 5.4 `docs/roadmap.md` (futuro + backlog, un solo file)

Solo il futuro: **non** ripete P0-P19. Unisce roadmap strategica e backlog in liste
leggere; lo storico dei "fatti" è il **git log**, non una tabella da mantenere.

```markdown
# Roadmap e backlog

## Prossimo (terza tornata · infrastruttura)
1. Migrazioni versionate (Liquibase) — prima di lasciare H2
2. Supabase PostgreSQL
3. Supabase Auth + attivazione `userId` (multiutente)
4. Docker
5. CI/CD (qui rivalutare un runner E2E browser)

## Più avanti
- Responsive/UX scacchiera · export PGN · import file `.pgn` · spostamento varianti tra studi

## Da validare / forse
- Sync Lichess periodica · backup/restore · PWA/offline · tema scuro · gamification leggera

## Scartato / rinviato
- (con motivo, una riga ciascuno)
```

Per i cambiamenti grossi, una voce può rimandare a una specifica dedicata (vedi §9).

### 5.5 `docs/adr/decisioni-tecniche.md`

**Invariato** nei contenuti: solo spostato. Resta un unico file (12 ADR oggi); split in
file numerati solo se crescerà molto. Fonte autorevole per le decisioni già prese.
**Le ADR non sono un backlog.**

### 5.6 README di backend e frontend (restano)

`backend/README.md` e `frontend/README.md` (già aggiornati con avvio + test + nota
`MAVEN_OPTS` TLS) **coprono già setup e test**. Non si creano `setup-locale.md` né
`test-e-validazione.md`: si linkano dai README di root/docs. Un'eventuale "regola di
chiusura task" e l'elenco delle verifiche non automatizzabili stanno in `CLAUDE.md` (§8)
o in coda alla checklist.

### 5.7 `docs/checklist-e2e.md`

La checklist manuale (37 flussi) si **sposta sotto `docs/`** per coerenza ed è referenziata
da `README.md` e da `CLAUDE.md`.

---

## 6. Archivio storico (con estrazione esplicita)

I file storici non si eliminano: si spostano in `docs/archive/`. **Ma prima si estrae il
contenuto ancora vivo**, così l'archivio non diventa l'unica fonte di informazioni
necessarie allo sviluppo (la §7 vieta di usarlo come fonte primaria).

- `preanalisi-progetto.md` → `docs/archive/`. Ruolo: visione iniziale, riferimento visivo,
  vincoli di partenza. Non più fonte per le decisioni attuali (vedi ADR).
- `planning-prototipi-webapp.md` → `docs/archive/`. **Prima di archiviare, estrai:**
  - §15 (endpoint REST + DTO) → *Panoramica API* di `architettura.md`;
  - §7 e §15 (modello dati) → *Mappa entità* di `architettura.md`;
  - §16 (rischi) → *Aree delicate* di `stato-corrente.md`;
  - §17-19 (TODO, idee, proposte UX) → `roadmap.md`.
- `stato-avanzamento-lavori.md` → si **conserva come copia archiviata datata**
  `docs/archive/stato-avanzamento-2026-06-28.md` (fotografia di milestone a fine Parte 2,
  per l'audit storico senza ricostruirla dal git log) **e** se ne deriva il nuovo
  `docs/stato-corrente.md` (vivo e sfoltito). Per evitare proliferazione, gli snapshot datati
  si creano **solo a milestone** (fine di una parte/fase), non a ogni aggiornamento: tra un
  milestone e l'altro la storia di dettaglio resta nel git log.

---

## 7. Gerarchia delle fonti

Quando più documenti parlano dello stesso tema, vale questa gerarchia — con **codice e
test sopra i documenti** (è ciò che impedisce ai doc di marcire in bugie):

- **Stato attuale:** `docs/stato-corrente.md` → codice → test → README.
- **Decisione tecnica:** `docs/adr/decisioni-tecniche.md` → codice → test.
- **API:** **controller + DTO** → (eventuale OpenAPI generato) → panoramica in
  `architettura.md` → servizi/test frontend. *(Nota: qui la panoramica è esplicitamente
  secondaria rispetto al codice.)*
- **Modello dati:** **entità JPA** → DTO → mappa in `architettura.md` → test repository.
- **Cosa fare dopo:** `docs/roadmap.md` → (eventuali specifiche dedicate).
- **Percorso storico:** `docs/archive/` → git log.

---

## 8. Regole per agenti AI e disciplina di aggiornamento

Ordine di lettura per un task ordinario:

```text
1. CLAUDE.md
2. README.md
3. docs/stato-corrente.md
4. documento specifico del task:
   - architettura/API/dati → docs/architettura.md (+ codice, autorevole)
   - setup/test → backend/README.md, frontend/README.md, docs/checklist-e2e.md
5. docs/adr/decisioni-tecniche.md solo se il task tocca una decisione architetturale
6. docs/roadmap.md solo se il task riguarda pianificazione futura
```

`docs/archive/` solo se serve contesto storico.

**Disciplina di aggiornamento (meccanismo, non solo prosa)** — da inserire in `CLAUDE.md`:

- se cambi la firma di un controller o aggiungi/rimuovi un endpoint, **aggiorna la
  Panoramica API di `architettura.md` nello stesso commit** (o rigenera l'OpenAPI);
- se cambi un'entità/relazione, aggiorna la *Mappa entità*;
- a fine task aggiorna `stato-corrente.md` solo se lo stato reale è cambiato.

Regole operative di base: niente modifiche fuori perimetro; controllare git
prima di modificare; non sovrascrivere modifiche altrui; niente nuove librerie senza
decisione esplicita; niente cambi infrastrutturali senza specifica dedicata.

*(Opzionale)* un hook che ricordi l'aggiornamento di `architettura.md` quando cambiano i
file dei controller renderebbe la regola effettiva invece che volontaria.

---

## 9. Relazione con OpenSpec (posticipato)

OpenSpec governa i *cambiamenti*, non descrive il progetto: utile, ma **da introdurre
dopo** che il set di base snello è sopravvissuto a qualche modifica reale. Introdurlo ora
aggiungerebbe un terzo strato (doc di base + ADR + spec/delta OpenSpec) con rischio di
sovrapposizione tra `design.md` di OpenSpec e le ADR (entrambi registrano il "perché"):
fissare il confine prima di adottarlo.

Quando lo si adotterà, uso per dimensione del cambiamento: bug piccolo → nessun OpenSpec;
bug medio funzionale → OpenSpec leggero (`proposal` + `tasks`); nuova feature → OpenSpec
completo; cambi infrastrutturali (Liquibase, Supabase, Docker, CI/CD) → OpenSpec con
impatti, rischi, rollback, ordine di migrazione.

---

## 10. Cosa non fare

- Continuare ad aggiornare `planning-prototipi-webapp.md` o `stato-avanzamento-lavori.md`
  come documenti operativi vivi.
- Creare un nuovo mega-documento unico.
- **Creare file che duplicano i README** (setup/test) o che ridescrivono a mano API/entità
  destinate a divergere dal codice.
- **Mantenere una tabella "Fatto"** che duplica il git log.
- Far leggere agli agenti tutta la documentazione storica per ogni task.
- Mischiare bug, roadmap, stato e decisioni nello stesso file.
- Introdurre OpenSpec prima dei doc di base.
- Produrre documentazione più pesante del progetto.
- Trattare i file storici come fonte primaria.

---

## 11. Piano operativo (feature branch · commit piccoli · PR)

> Eseguire su un **feature branch** (es. `docs/riorganizzazione`), non su `master`, così il
> lavoro passa per una **PR** revisionabile. Commit piccoli e reversibili.

- **Step 0 — Branch.** `git switch -c docs/riorganizzazione`.
- **Step 1 — Struttura.** Creare `docs/`, `docs/adr/`, `docs/archive/`.
- **Step 2 — Estrazione (prima dell'archiviazione).** Da `planning` §15/§7/§16/§17-19 →
  `architettura.md` (API + dati), `stato-corrente.md` (aree delicate), `roadmap.md`.
- **Step 3 — Stato corrente.** Conservare la fotografia di milestone:
  `git mv stato-avanzamento-lavori.md docs/archive/stato-avanzamento-2026-06-28.md`; poi
  creare un nuovo `docs/stato-corrente.md` vivo e sfoltito, estraendone dalla copia
  archiviata la sola parte ancora valida.
- **Step 4 — Spostamenti.** `git mv` di `decisioni-tecniche.md` → `docs/adr/`,
  `preanalisi-progetto.md` e `planning-prototipi-webapp.md` → `docs/archive/`,
  `checklist-e2e.md` → `docs/`.
- **Step 5 — Integrità dei riferimenti (step esplicito).** `grep` di: riferimenti a sezioni
  del planning, numeri ADR, link relativi, path nei doc; **aggiornare** `CLAUDE.md`
  (oggi punta a `preanalisi-progetto.md`), `MEMORY.md` e ogni path in `.claude/`.
- **Step 6 — Pulizia.** Eliminare `backend/HELP.md` (boilerplate Spring Initializr).
- **Step 7 — `CLAUDE.md`.** Nuovo ordine di lettura (§8) + regola di disciplina di
  aggiornamento.
- **Step 8 — Anti-duplicazione.** Verificare che: roadmap non ripeta P0-P19; stato-corrente
  non sia un diario; nessun doc duplichi i README; le ADR non siano una task list; la
  Panoramica API resti dichiaratamente secondaria al codice.
- **Step 9 — Commit piccoli + PR.** Messaggio: `docs: riorganizza documentazione progetto`.

---

## 12. Stato desiderato dopo la riorganizzazione

- **Quattro** documenti vivi (più i 2 README di modulo), brevi e davvero mantenuti.
- API e modello dati descritti **una volta sola**, come panoramica, con il codice come
  fonte autorevole (e, in prospettiva, OpenAPI generato).
- ADR conservate come fonte delle decisioni; roadmap+backlog in un file leggero; storia in
  `archive/` e nel git log.
- Istruzioni agenti precise, con una **regola di aggiornamento** che mantiene i doc allineati
  al codice.
- Meno superficie da sincronizzare, meno ambiguità, base pronta (ma non ancora vincolata)
  per OpenSpec.

Criterio finale (perseguito con **meno** documenti):

> un agente deve poter capire rapidamente lo stato reale del progetto e lavorare sul task
> assegnato senza interpretare tutta la storia dei prototipi — e senza fidarsi di doc che
> il codice ha già reso obsoleti.
