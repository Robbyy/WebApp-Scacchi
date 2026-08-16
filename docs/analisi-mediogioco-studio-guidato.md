# Analisi — R26.3: studio guidato del Mediogioco

> Analisi tecnica preparatoria alle change OpenSpec di R26.3.
> Non è una specifica implementativa e non autorizza modifiche al codice.
> Fonte vincolante delle decisioni di dominio:
> [`preflight-mediogioco-studio-guidato.md`](preflight-mediogioco-studio-guidato.md).
> Data: 2026-08-16 · baseline: commit `064211c`, branch `master` allineato a `origin/master`.

## 1. Esito dell'analisi

R26.3 è compatibile con l'architettura attuale, ma non è un'estensione solo frontend. Richiede:

- un'estensione compatibile del modello `Study`;
- un catalogo temi normalizzato e referenziato per ID;
- sei nuove colonne posizionali, compreso l'ordine;
- una nuova entità per lo storico dei tentativi;
- migrazioni e trattamento esplicito dei dati Mediogioco esistenti;
- validazione backend autorevole dei tentativi tattici;
- nuovi flussi frontend separati dal training Aperture;
- test e gate E2E dedicati.

Le decisioni di prodotto sono chiuse. Le scelte tecniche di dettaglio sono state formalizzate nei
`design.md` delle due change OpenSpec; nessuna richiede una decisione del committente. Prima di
iniziare il codice restano tuttavia, per ciascuna change, il triage standalone e i tre gate
indipendenti di governance previsti dal workflow normativo `openspec-v2`.

Il rilascio è **R26.3 — Studio guidato del Mediogioco**, prima di R27. Deve essere realizzato con
due change sequenziali:

1. `issue-016-middlegame-guided-study-model`;
2. `issue-016-middlegame-guided-study-flows`.

## 2. Metodo e stato verificato

L'analisi ha confrontato il preflight con entità, service, repository, controller, DTO, changelog
Liquibase, modelli e routing Angular, componenti di scacchiera/albero/motore, test e documenti di
pianificazione. Non sono stati avviati backend o frontend e non è stato toccato il database.

| Verifica | Esito al momento dell'analisi |
|---|---|
| Branch | `master` |
| Allineamento | `0 0` rispetto a `origin/master` |
| Ultimo commit | `064211c chore: capture project state after E2E 67` |
| Change OpenSpec attive | Due: `issue-016-middlegame-guided-study-model` e `issue-016-middlegame-guided-study-flows` |
| Baseline backend | 120 test |
| Baseline frontend | 462 test su 36 file spec |
| Checklist manuale completata | 67 flussi |

Il preflight e questa analisi sono documenti nuovi non ancora committati. Le due change R26.3
contengono ciascuna proposal, design, spec e task completi; entrambe superano la validazione strict.

## 3. Evidenze nel codice esistente

### 3.1 Modello backend

`Study` ([Study.java](../backend/src/main/java/com/scacchi/backend/study/Study.java)) contiene già
`phase`, immutabile dopo la creazione, ma non una tipologia tattica/strategica.

`Variant` ([Variant.java](../backend/src/main/java/com/scacchi/backend/variant/Variant.java)) è il
contenitore comune di varianti Apertura e posizioni. Conserva nome, colore tecnico, `moves`,
`tree`, `startingFen`, sorgente PGN e relazione logica con lo studio, ma non tema, difficoltà,
fonte didattica, descrizioni o ordine esplicito.

`MoveNode` ([MoveNode.java](../backend/src/main/java/com/scacchi/backend/variant/MoveNode.java))
conserva SAN, figli, commento e NAG. `children[0]` rappresenta la mainline; gli altri figli sono
rami dell'autore. Questo modello può restare la fonte unica della soluzione.

Non esiste un'entità equivalente a `PositionAttempt`. `TrainingSession` non è riutilizzabile:
`TrainingSessionService.ensureOpeningPhase`
([TrainingSessionService.java](../backend/src/main/java/com/scacchi/backend/training/TrainingSessionService.java#L102))
rifiuta le posizioni non-Apertura per contratto.

### 3.2 Tre capacità già presenti

1. **Lato dell'utente già derivato dalla FEN.** Per gli studi non-Apertura il backend ricalcola
   `Variant.color` dal campo side-to-move della FEN
   ([VariantService.java](../backend/src/main/java/com/scacchi/backend/variant/VariantService.java#L151)).
   Non serve un nuovo campo “lato utente”.
2. **Bozza già persistibile.** La validazione posizionale usa `allowEmptyTree = true`
   ([VariantService.java](../backend/src/main/java/com/scacchi/backend/variant/VariantService.java#L154)).
   Lo stato bozza può essere derivato dall'assenza della mainline.
3. **Ordine corrente identificato.** Le posizioni sono lette con
   `findByStudyIdOrderByIdAsc`
   ([VariantService.java](../backend/src/main/java/com/scacchi/backend/variant/VariantService.java#L98)).
   La migrazione può preservare l'ordine visibile assegnando `positionOrder` secondo l'ID.

### 3.3 API e cancellazione

Le API esistenti coprono CRUD di studi/posizioni e filtro per fase. Non esistono endpoint per
catalogo temi, tentativi, riepiloghi o riordino atomico.

La cancellazione di uno studio passa da `StudyService.delete` e da
`VariantService.deleteByStudyId`
([StudyService.java](../backend/src/main/java/com/scacchi/backend/study/StudyService.java#L172));
la cancellazione della posizione passa da `VariantService.delete`
([VariantService.java](../backend/src/main/java/com/scacchi/backend/variant/VariantService.java#L88)).
La nuova FK dei tentativi deve rendere sicuri entrambi i percorsi.

### 3.4 Frontend

La route strutturale `middlegame` in
[app.routes.ts](../frontend/src/app/app.routes.ts) usa `SectionRouteContext` e percorsi canonici.
È possibile aggiungere rotte guidate senza duplicare il contesto di sezione.

Componenti riutilizzabili:

| Componente/capacità | Uso in R26.3 |
|---|---|
| `chessboard` | input mosse e replay |
| utility `move-tree` | lettura mainline/rami; mai scrittura dal tentativo |
| `variant-detail` | riferimento per soluzione e replay, non flusso completo |
| `study-variant-nav` | navigazione ordinata delle posizioni |
| `position-editor` / `variant-editor` | authoring di FEN, metadati e albero |
| `StockfishService.requestBestMove` | singola risposta esplorativa dopo deviazione strategica |

Il nuovo flusso non deve essere implementato dentro `variant-training`: quel componente non usa
Stockfish e rappresenta il training delle Aperture. R26.3 richiede un componente/feature separato.

## 4. Gap funzionali

| # | Capacità richiesta | Stato attuale | Intervento |
|---|---|---|---|
| G-01 | Tipologia Tattica/Strategia | assente | campo, migrazione, classificazione legacy e immutabilità |
| G-02 | Temi per ID | assenti | catalogo, seed, FK e API lettura |
| G-03 | Metadati didattici | assenti | campi DTO/entità/form e validazione |
| G-04 | Ordine di dominio | ID crescente | campo, backfill, riordino transazionale e query |
| G-05 | Bozza | già salvabile | derivazione, label e gate dei flussi |
| G-06 | Lato utente | già derivato | nessun campo nuovo |
| G-07 | Storico | assente | tabella, repository, service e API |
| G-08 | Tattica autorevole | assente | flusso client e validazione backend delle mosse |
| G-09 | Strategia esplorativa | assente | flusso nuovo e singola risposta Stockfish |
| G-10 | Soluzione protetta | dettaglio tutto/niente già presente | due stati nella nuova rotta guidata |
| G-11 | Sequenza/filtri/skip | assenti | stato transitorio client e riepilogo derivato |
| G-12 | Compatibilità legacy | nessun nuovo obbligo oggi | stati transitori e gate espliciti |

Non servono tre livelli di rivelazione. Il contratto corretto è binario: albero interamente
nascosto prima della soluzione e interamente disponibile in sola lettura dopo.

## 5. Modello dati proposto

### 5.1 `Study.studyType`

```text
study_type VARCHAR(16) NULL  -- TACTICAL | STRATEGIC
```

- `NULL` per Aperture, Finale e studi Mediogioco legacy non ancora classificati.
- Obbligatorio per ogni nuovo studio `MIDDLEGAME`.
- Consentita una sola transizione `NULL → TACTICAL|STRATEGIC` per le legacy.
- Ogni cambio successivo viene rifiutato, come già avviene per `phase`.
- Nuove posizioni non possono essere create in uno studio ancora «Da classificare», perché non
  sarebbe possibile scegliere un tema compatibile.

### 5.2 `PositionTheme`

Nuova tabella di catalogo:

```text
id             BIGINT PRIMARY KEY
code           VARCHAR(64) NOT NULL UNIQUE
study_type     VARCHAR(16) NOT NULL
display_label  VARCHAR(128) NOT NULL
display_order  INT NOT NULL
active         BOOLEAN NOT NULL DEFAULT TRUE
```

`active` è un dettaglio tecnico utile per non eliminare temi già referenziati; non introduce un
CRUD utente. I seed devono usare ID e codici stabili. La posizione conserva `theme_id`, quindi una
futura modifica di `display_label` non cambia i riferimenti.

Il seed iniziale è quello del preflight §4, compresa la label strategica «case deboli e case forti».

### 5.3 Estensione di `Variant`

Sei nuove colonne per le posizioni:

```text
theme_id          BIGINT NULL      -- FK verso position_theme
theme_description TEXT NULL
description       TEXT NULL
difficulty        VARCHAR(16) NULL -- INTRODUCTORY|EASY|INTERMEDIATE|ADVANCED|EXPERT
source            TEXT NULL
position_order    INT NULL
```

Sono nullable nello schema condiviso perché le varianti Apertura non le usano e le posizioni
Mediogioco legacy attraversano una fase di regolarizzazione. A livello applicativo:

- nuove posizioni Mediogioco: `themeId` e `positionOrder` obbligatori;
- legacy: `themeId` può restare nullo mentre la posizione resta consultabile/modificabile, ma il
  flusso guidato è disabilitato;
- il tema deve appartenere allo stesso `studyType` dello studio;
- `positionOrder` è sempre valorizzato per le posizioni esistenti dal backfill;
- Aperture e Finale non sono soggetti ai nuovi obblighi di R26.3.

Il titolo resta `Variant.name`, la FEN resta `startingFen` e `bozza` resta uno stato derivato.

### 5.4 `PositionAttempt`

```text
id           BIGINT PRIMARY KEY IDENTITY
variant_id   BIGINT NOT NULL
outcome      VARCHAR(24) NOT NULL -- UNDERSTOOD | NOT_UNDERSTOOD | FAILED
occurred_at  TIMESTAMP NOT NULL
```

- FK reale `variant_id → variant.id` con `ON DELETE CASCADE`.
- Istante assegnato dal server.
- Nessuna mossa, durata, sessione, FEN o versione della soluzione.
- Nessuna cancellazione manuale del singolo evento.

La cascata dello studio continua a eliminare le posizioni; la FK elimina quindi i tentativi.

## 6. Migrazioni e compatibilità

Suddivisione proposta dei changeset della change A:

| Changeset | Contenuto |
|---|---|
| `0004-study-type` | aggiunta nullable di `study.study_type` |
| `0005-position-theme` | tabella catalogo, indici e seed con ID/codici stabili |
| `0006-position-metadata` | sei colonne su `variant`, FK tema e backfill dell'ordine per studio/ID |
| `0007-position-attempt` | tabella tentativi, indice storico e FK con cascade |

Vincoli di migrazione:

- usare costrutti Liquibase portabili fra H2 e PostgreSQL;
- preservare l'ordine attuale `study_id, id` nel backfill;
- non inventare automaticamente una tipologia per gli studi esistenti;
- non assegnare automaticamente un tema semantico alle posizioni esistenti;
- mantenere leggibili e modificabili le righe legacy;
- eseguire i gate su `H2_DB_PATH` temporaneo, mai sul database condiviso.

La sostituzione dell'ordinamento `id` con `positionOrder` è un cambiamento osservabile, anche se
preserva inizialmente lo stesso ordine. I test e i client che dipendono dall'ordine devono essere
aggiornati nello stesso incremento: non va descritta come modifica “senza rotture” in assoluto.

## 7. Contratti API proposti

I nomi definitivi vanno fissati nella spec, ma la responsabilità deve restare questa.

### 7.1 Estensioni esistenti

- `StudyDto` e request di creazione/modifica: `studyType`.
- `VariantDto` e request posizionali: `themeId`, dati tema in lettura, `themeDescription`,
  `description`, `difficulty`, `source`, `positionOrder`, stato derivato `draft` se utile alla UI.
- La validazione è contestuale alla fase e alla condizione legacy, non globale sulla tabella.

### 7.2 Nuova superficie

| Metodo | Rotta indicativa | Responsabilità |
|---|---|---|
| `GET` | `/api/position-themes?studyType=` | catalogo attivo ordinato per tipologia |
| `PUT` | `/api/studies/{id}/variants/order` | riordino contiguo e transazionale |
| `POST` | `/api/variants/{id}/attempts/tactical` | riceve transitoriamente le mosse, valida mainline/FEN e deriva l'esito |
| `POST` | `/api/variants/{id}/attempts/strategic` | accetta il solo esito manuale consentito |
| `GET` | `/api/variants/{id}/attempts` | storico discendente della posizione |
| `GET` | `/api/studies/{id}/attempts/summary` | stato aggregato per filtri e riepiloghi |

La separazione tattico/strategico può essere realizzata anche con un endpoint discriminato, ma il
backend deve impedire che un client dichiari arbitrariamente `compresa` per una tattica. Le mosse
ricevute per la verifica non entrano in `PositionAttempt`.

Rifiuti obbligatori:

- tentativo su bozza, posizione senza tema o studio non classificato;
- tentativo su una fase diversa da `MIDDLEGAME`;
- endpoint tattico su studio strategico e viceversa;
- tema incompatibile con lo `studyType`;
- riordino con ID estranei, duplicati o insieme incompleto;
- modifica della tipologia dopo la prima classificazione.

Nessun endpoint viene aggiunto sotto `/api/training-sessions`, `/api/stats` o `/api/reviews`.

## 8. Flussi frontend

### 8.1 Authoring e dati legacy

- Il form dei nuovi studi Mediogioco richiede Tattica/Strategia.
- Lo studio legacy mostra «Da classificare» e consente una scelta una tantum.
- Finché non classificato, mantiene view/edit ma disabilita nuova posizione e studio guidato.
- Il form posizione carica i temi compatibili e invia `themeId`.
- La posizione legacy mostra «Tema da assegnare» e resta nel CRUD ordinario, non nel guidato.
- Riordino numerico o drag-and-drop invia l'intera sequenza al backend.

### 8.2 Rotta guidata

Il flusso deve vivere sotto il contesto `/middlegame`, in componenti nuovi e distinti da
`variant-training`. La spec deve scegliere URL canonici coerenti per posizione manuale e sequenza.

Stati comuni:

1. tentativo: FEN iniziale, albero autore nascosto;
2. soluzione: ritorno alla FEN iniziale, intero albero autore in sola lettura e replay manuale.

La bozza usa la scacchiera libera ma non entra in questi stati e non mostra esiti.

### 8.3 Tattica

- Confronto immediato con la mainline per la risposta UI.
- Risposta avversaria automatica dalla mainline dopo una mossa corretta.
- Invio al backend delle mosse tentate per l'esito autorevole.
- Errore: interruzione, `FAILED`, soluzione automatica.
- Completamento: `UNDERSTOOD`, soluzione/replay disponibile senza autoplay.
- Nessun motore, eval bar o ramo accettato come seconda soluzione.

### 8.4 Strategia

- Risposte automatiche dalla mainline finché l'utente la segue.
- Deviazione segnalata senza esito automatico.
- Motore inizialmente spento e usato solo dopo deviazione.
- Se spento: sospendere la risposta e mostrare «Attiva motore per continuare».
- Se attivo: usare una singola `requestBestMove`; nessuna PV/eval bar obbligatoria.
- Se non disponibile: messaggio controllato, soluzione e uscita ancora accessibili.
- Soluzione dalla FEN iniziale; esito manuale `UNDERSTOOD`/`NOT_UNDERSTOOD`.
- Nessuna mossa esplorativa persistita.

### 8.5 Sequenza

- Ordine autore o casuale scelto a ogni avvio.
- Filtri: Tutte, Mai tentate, Da rivedere, Comprese.
- Stato derivato dall'ultimo tentativo.
- Esclusione automatica di bozze, posizioni senza tema e studi non classificati.
- `Posizione successiva` dopo un esito.
- `Salta posizione`: nessun evento, contatore locale «senza esito», stato storico invariato.
- Riepilogo finale non persistito e nessuna sessione.

## 9. Requisiti recepiti in OpenSpec

Le due change trasformano questi requisiti in `SHALL` e scenari Given/When/Then.

### RF-01 — Tipologia Mediogioco

- Nuovo studio tattico/strategico valido.
- Nuovo studio Mediogioco senza tipo rifiutato.
- Studio legacy classificabile una volta.
- Seconda modifica del tipo rifiutata.
- Aperture e Finale senza obbligo.

### RF-02 — Catalogo e metadati

- Tema selezionato per ID e compatibile con il tipo.
- Rinomina della label senza modifica del riferimento.
- Nuova posizione senza tema rifiutata.
- Posizione legacy senza tema ancora modificabile ma non guidabile.
- Difficoltà a cinque livelli e campi facoltativi round-trip.
- Cambio tema consentito solo entro il catalogo compatibile.

### RF-03 — Ordine e bozza

- Backfill che preserva l'ordine per ID.
- Inserimento/spostamento/eliminazione con ordine contiguo e atomico.
- Bozza salvabile e scacchiera libera.
- Bozza senza tentativi e fuori dalle sequenze.

### RF-04 — Tattica

- Mossa corretta e risposta automatica.
- Mainline completa e `UNDERSTOOD` derivato dal server.
- Deviazione, `FAILED` derivato dal server e soluzione automatica.
- Riprova come evento nuovo.
- Rami alternativi non accettati come soluzione.

### RF-05 — Strategia

- Mainline seguita con risposte automatiche.
- Deviazione segnalata senza esito.
- Motore spento con invito all'attivazione.
- Singola risposta motore dopo deviazione, non persistita.
- Motore indisponibile con uscita/soluzione disponibili.
- Soluzione e valutazione manuale.

### RF-06 — Rivelazione e separazione

- Intero albero nascosto durante il tentativo.
- Intero albero in sola lettura dopo la soluzione.
- Replay controllato dall'utente.
- Tentativi e motore incapaci di modificare tree, commenti o NAG.

### RF-07 — Storico

- Eventi indipendenti con tre soli dati di dominio.
- Ultimo esito, conteggio e ultima comprensione derivati.
- FEN/mainline modificabili con storico preservato e non versionato.
- Cascade su posizione e studio.
- Nessuna cancellazione del singolo evento.

### RF-08 — Sequenza

- Quattro filtri e due ordini combinabili.
- Scelte non persistenti.
- Avanzamento esplicito e skip senza evento.
- Riepilogo finale non persistito.
- Uscita anticipata senza perdita degli eventi già registrati.

## 10. Rischi e mitigazioni

| # | Rischio | Mitigazione vincolante |
|---|---|---|
| R-01 | Dati legacy senza tipo/tema | stati «Da classificare»/«Tema da assegnare», view/edit preservato, guided disabilitato |
| R-02 | Storico ambiguo dopo cambio FEN/mainline | comportamento accettato e documentato; nessun versionamento in R26.3 |
| R-03 | Esito tattico falsificabile dal client | invio transitorio delle mosse e validazione backend autorevole |
| R-04 | Confusione con training Aperture | feature/rotte separate; nessun riuso di `TrainingSession` o `variant-training` |
| R-05 | Backfill non portabile | changeset Liquibase indipendente da SQL specifico H2, test anche pensando a PostgreSQL |
| R-06 | Riordino parziale o duplicato | payload completo, transazione e validazione dell'insieme |
| R-07 | Tema rinominato o ritirato | FK per ID, codice stabile e disattivazione invece di cancellazione |
| R-08 | Risposta Stockfish obsoleta | lifecycle/cancellazione della richiesta; non mostrare una mossa per una FEN precedente |
| R-09 | Motore non disponibile | stato di errore controllato con soluzione/uscita disponibili |
| R-10 | Perimetro troppo ampio | due change sequenziali e un solo gate di rilascio dopo entrambe |

La race UCI fra FEN consecutive resta tracciata sotto ISSUE-022. R26.3 non deve risolvere tutta
la race generale, ma il proprio flusso deve impedire l'applicazione di una risposta riferita a una
posizione non più corrente.

## 11. Piano di test

### 11.1 Change A — backend e migrazioni

- creazione/classificazione/immutabilità di `studyType`;
- Aperture e Finale non impattati;
- seed e lettura dei temi per tipo, ID stabile e label modificabile;
- validazione tema compatibile;
- round-trip dei sei campi posizionali;
- backfill dell'ordine per più studi;
- riordino valido/duplicato/estraneo/incompleto e rollback atomico;
- posizione legacy senza tema consultabile/modificabile ma esclusa dal guidato;
- tentativi tattici corretti/errati validati dalla mainline;
- esiti strategici consentiti;
- storico ordinato, aggregati e cascade FK;
- FEN/mainline modificate senza cancellare eventi.

### 11.2 Change B — frontend

- form studio e classificazione legacy;
- catalogo temi e metadati posizione;
- ordine numerico/drag-and-drop;
- bozza libera e gate dei flussi;
- tattica corretta, errata, risposta automatica, soluzione e riprova;
- strategia prima/dopo deviazione, motore spento/attivo/non disponibile;
- due stati di rivelazione e replay;
- storico e riepilogo posizione;
- quattro filtri, due ordini, skip, uscita e riepilogo finale;
- accessibilità, responsive e routing canonico;
- regressioni Aperture, R26.1 e R26.2.

### 11.3 E2E manuali

La baseline resta **67 flussi completati**. R26.3 propone i flussi **68–81**, già riportati nella
[checklist E2E](checklist-e2e.md#gate-futuro-r263--studio-guidato-del-mediogioco):

| # | Copertura |
|---|---|
| 68–71 | classificazione, studi nuovi, catalogo/metadati e migrazione legacy |
| 72 | bozza |
| 73–74 | tattica corretta/errata con validazione server |
| 75–77 | strategia, motore e soluzione |
| 78–79 | storico e apertura manuale |
| 80 | sequenza, filtri, skip e riepilogo |
| 81 | cascade, responsive e regressioni |

Tutti i gate che mutano dati devono usare H2 temporaneo. Il file condiviso
`backend/data/scacchi.mv.db` resta escluso da ripristini, sovrascritture, staging e test.

## 12. Scope e dipendenze

### In scope

Tipologia Mediogioco · catalogo temi · metadati e ordine · compatibilità legacy · bozza · storico
minimo · validazione tattica backend · flusso tattico · flusso strategico · singola risposta motore
dopo deviazione · soluzione/replay · modalità manuale e sequenziale · filtri/skip/riepiloghi ·
migrazioni · cascade · test e flussi 68–81.

### Fuori scope

Finale R27 · tipo per `ENDGAME` · import libri/PGN · tag · CRUD temi · SM-2 · percentuali ·
sessioni persistenti · soluzioni tattiche multiple · persistenza mosse · versionamento soluzione ·
cancellazione singoli tentativi · PV/eval bar obbligatorie · R28 gioco da posizione · multiutente,
Supabase e sincronizzazione remota.

### Dipendenze

- R26.1/R26.2 sono baseline e contratti di regressione.
- La change B dipende dalla change A completata e sincronizzata nelle spec canoniche.
- R27 dipende dalla chiusura di R26.3 per la sequenza di rilascio, ma R26.3 non applica il nuovo
  tipo agli studi Finale.
- Le migrazioni devono restare portabili verso la futura adozione di PostgreSQL.

## 13. Piano OpenSpec definitivo

### A — `issue-016-middlegame-guided-study-model`

Contiene proposal, design, spec e task per:

- modello e migrazioni;
- compatibilità legacy;
- catalogo temi;
- ordine;
- storico, riepiloghi, cascade e API;
- validazione tattica backend;
- test della capability dati.

La change deve prima ottenere i gate di governance `READY`; quindi deve essere implementata,
validata e chiusa prima di implementare B. La UI già esistente può essere arricchita per
classificazione e metadati, ma non deve anticipare il flusso guidato.

### B — `issue-016-middlegame-guided-study-flows`

Contiene proposal, design, spec e task per:

- rotte e componenti guidati separati dal training;
- tattica e strategia;
- motore esplorativo;
- rivelazione/soluzione/replay;
- apertura manuale, sequenza, filtri, skip e riepiloghi;
- accessibilità, responsive, regressioni ed E2E 68–81.

R26.3 può essere dichiarata rilasciata soltanto dopo entrambe le change, test automatici verdi,
build riuscita, checklist completata e documentazione di stato aggiornata.

## 14. Conclusione

Il codice esistente offre una base solida: FEN e lato al tratto sono già validati, la bozza è già
rappresentabile, la mainline è identificabile nell'albero e Stockfish espone già una singola mossa.
Il lavoro non è tuttavia un semplice adattamento del dettaglio: introduce dati persistenti, regole
di compatibilità e una nuova esperienza di studio.

L'authoring OpenSpec evita quattro errori dell'analisi iniziale: non salva il tema in chiaro, non
usa tre livelli di rivelazione, non affida al solo client l'esito tattico e non rende invalide le
righe Mediogioco esistenti. Tutte le decisioni necessarie sono chiuse; la change A diventa
implementabile soltanto dopo la governance indipendente prevista dal workflow.
