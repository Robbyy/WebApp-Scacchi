# Sviluppi importanti

> Attività di ampiezza o impatto architetturale rilevante (nuove capacità, nuovo modello
> dati, infrastruttura applicativa). **Destinazione: OpenSpec** — ogni scheda è un
> **seme di change OpenSpec** (problema, obiettivo, impatto su dati/API, prerequisiti,
> criteri d'ingresso), pronta a diventare una proposta in `openspec/changes/<id>/`.
>
> **Sequenza:** da affrontare **dopo** la chiusura di bug ed evolutive (decisione utente).
> Prerequisito tecnico comune già soddisfatto: **Liquibase** (ISSUE-019, fatto).
>
> Indice e classificazione: [`../backlog.md`](../backlog.md). ID `ISSUE-0NN` stabili.

| ID | Titolo | Impatto | Stato pre-OpenSpec |
|----|--------|:-------:|--------------------|
| 016 | Tutte le fasi del gioco (mediogioco/finale) | alto | R26 implementata; restano Finale e gioco da posizione |
| 017 | Menu "Impostazioni" (hub) + parametrizzazione SM-2 | medio-alto | richiede OpenSpec |
| 014 | Personalizzazione parametri motore Stockfish (UCI) | medio | richiede audit + OpenSpec |

---

## ISSUE-016 — Webapp per tutte le fasi del gioco (mediogioco/finale)
**Why (problema):** la webapp allena solo le aperture. L'utente vuole estenderla a
**mediogioco** e **finale**, mantenendo l'organizzazione già nota delle aperture:
studi con capitoli/posizioni.
**What (obiettivo):**
- Tre sezioni in topbar — **Aperture**, **Mediogioco**, **Finale** — la cui
  *navigazione/scaffold* è stata realizzata da **ISSUE-021 (R20)**. R26 ha sostituito
  il segnaposto del Mediogioco con la sezione reale; quello del Finale resta fino a R27.
- Mediogioco e Finale: **studi con capitoli/posizioni**, sullo stesso paradigma utente già
  adottato per le aperture. In queste sezioni non serve l'importazione da Lichess: le
  posizioni vengono create manualmente.
- Le **posizioni** di Mediogioco/Finale (le "varianti" qui si chiamano posizioni) hanno:
  - **posizione di partenza personalizzata** (solo Mediogioco/Finale, non Aperture):
    il flusso primario è ricostruire sulla scacchiera una posizione vista su libro o
    altra fonte esterna, prendendo i pezzi da una palette laterale. L'editor deve offrire
    scacchiera vuota/pulibile, elenco pezzi a destra e composizione in stile
    Fritz/ChessBase: selezione di un pezzo dalla colonna laterale, spostamento del mouse
    sulla scacchiera e click sulla casa di destinazione. Quando un pezzo è selezionato,
    e solo dentro l'area della scacchiera, il cursore deve assumere l'aspetto del pezzo
    selezionato in formato ridotto. Se si clicca una casa occupata, un pezzo diverso
    (anche solo per colore) viene sostituito dal pezzo selezionato; se invece il pezzo
    presente è identico e dello stesso colore, la casa viene liberata. L'editor deve
    consentire anche spostamento e rimozione pezzi, pulizia completa, scelta del colore al tratto e
    rotazione/orientamento bianco-nero. Alla creazione di una posizione deve aprirsi
    automaticamente la videata di inserimento posizione. L'editor salva un FEN custom
    valido nel campo `startingFen`, che esiste già su `Variant`. Non deve essere possibile
    salvare posizioni impossibili: ad esempio più di otto pedoni dello stesso colore,
    assenza di uno o entrambi i re, più re dello stesso colore, re a contatto o altri stati
    non legalmente rappresentabili. Finché la posizione non è valida, l'azione di
    salvataggio deve restare disabilitata;
  - **FEN come formato tecnico**, non come interfaccia principale: copia/incolla FEN può
    essere previsto come supporto secondario, ma la creazione ordinaria deve avvenire
    componendo manualmente la scacchiera. Non sono richiesti copia/incolla ASCII, scambio
    Bianco/Nero, scambio Re/Donna, aiuto dedicato o campo "numero mossa" esposto in UI;
  - **commenti alle mosse** (testo libero + simboli `!`, `?`, `!!`, `??`, `!?`, `?!`);
  - **gioco contro il motore** dalla posizione di partenza (Stockfish, da adattare a FEN custom).
- **Niente training loop** e **niente spaced repetition (SM-2)** per mediogioco/finale: le
  posizioni si studiano e si giocano, non si "ripetono" come linee da memorizzare.
**Impatto modello dati & API:**
- Il modello è deciso e implementato: `Study.phase` distingue `OPENING`, `MIDDLEGAME` ed
  `ENDGAME` ed è immutabile; `Variant` resta l'elemento figlio comune, chiamato posizione
  nelle sezioni posizionali. Non sono state introdotte entità dedicate.
- `MoveNode` supporta `comment` e `nag` opzionali nello stesso JSON `tree` in modo
  retrocompatibile; R24 non ha richiesto una migration relazionale.
- UI dedicata di composizione posizione: editor scacchiera, generazione/validazione del
  `startingFen`, gestione colore al tratto e orientamento scacchiera se salvato come dato
  della posizione o preferenza UI. La validazione deve bloccare il salvataggio delle
  posizioni impossibili lato UI e deve essere confermata anche lato backend/API.
- Import Lichess: resta legato alle aperture; per Mediogioco/Finale non è richiesto.
**Prerequisiti:** Liquibase (✅), decisione struttura DB (✅), ISSUE-021/scaffold (✅ R20),
editor posizione/FEN (✅ R25) e artefatti OpenSpec della slice interessata.
**Criteri d'ingresso (prima di implementare):** proposta, design, specifiche e task OpenSpec
approvati con contratti, confini funzionali e criteri di accettazione; soddisfatto per R26.
**Note:** è la visione strategica del prodotto; va spezzata in più change OpenSpec
incrementali (non una singola sessione). Materiale di supporto per l'editor posizione:
[`assets/ISSUE-016/position-editor/`](assets/ISSUE-016/position-editor/).

### Scomposizione OpenSpec proposta

`ISSUE-016` resta il contenitore strategico. L'implementazione va gestita con change
OpenSpec piccole, ordinate e revisionabili:

| Change OpenSpec | Obiettivo | Dipende da | Output atteso |
|-----------------|-----------|------------|---------------|
| `issue-016-phase-domain-model` ✅ | Decidere il modello di dominio per fasi del gioco: riuso/estensione di `Study`/`Variant` con campo `phase` oppure entità dedicate per studi/posizioni. | Liquibase ✅ | Decisione dati/API, organizzazione studio -> capitoli/posizioni, confini tra aperture e sezioni posizionali, import Lichess limitato alle aperture, impatto su training/statistiche/review. |
| `issue-016-navigation-scaffold` ✅ | Navigazione Aperture/Mediogioco/Finale e segnaposto, già realizzati come lavoro diretto in **ISSUE-021 / R20**. | Nessuna | Route `/`, `/middlegame`, `/endgame`, topbar accessibile e segnaposto `sections/coming-soon`. Non richiede una change OpenSpec separata. |
| `issue-016-custom-starting-fen` ✅ *(rilasciata 2026-08-13)* | Consentire la creazione manuale della posizione iniziale tramite editor scacchiera; il FEN è il formato tecnico salvato/validato, non il flusso primario. | `issue-016-phase-domain-model` | Implementazione verificata: editor visuale, palette e piazzamento/rimozione pezzi, lato al tratto, arrocco, en-passant, FEN canonica, associazione allo studio, validazione backend della posizione/albero e flussi E2E 49–52 su H2 temporaneo. |
| `issue-016-move-comments` ✅ | Aggiungere commenti e annotazioni alle mosse (`!`, `?`, `!!`, `??`, `!?`, `?!`). | `issue-016-phase-domain-model` | Estensione retrocompatibile di `MoveNode` nel JSON `tree`, senza migration relazionale, e UI di lettura/modifica. Completata in R24 con mini-spec. |
| `issue-016-middlegame-section` ✅ *(implementata e verificata 2026-08-13)* | Rendere reale la sezione Mediogioco: studi con capitoli/posizioni navigabili, senza import Lichess, training né SM-2. | Modello deciso + editor posizione/FEN minimo. | Lista e CRUD studi, dettaglio e CRUD posizioni, setup/editor/dettaglio/navigazione canonici, controllo esatto della fase; 446 test frontend, 120 backend e flussi E2E 53–58 verdi. |
| `issue-016-positional-study-consolidation` ✅ *(implementata, verificata e archiviata 2026-08-14)* | Consolidare il paradigma posizionale prima del Finale: UX studi, modalità analisi nascosta ed ancoraggio stabile della board. | R26 verificata. | 455 frontend, 120 backend, build, flussi browser 59–63, misure geometriche e gate DB verdi; change archiviata senza `--skip-specs`. |
| `issue-016-position-editor-contextual-actions` ✅ *(R26.2 implementata, verificata e archiviata 2026-08-14)* | Rifinire il contesto dell'editor posizionale prima del Finale: breadcrumb non interattivo, gerarchia «Mosse & rami» e rimozione di comandi/etichette ridondanti. | R26.1 chiusa e archiviata. | Cinque contratti chiusi e verificati in Mediogioco (461 test frontend, flussi 64–66 ai sei viewport); il Finale dovrà ridimostrarli con dati `ENDGAME`. Change archiviata senza `--skip-specs`. Follow-up `f5bbb25` sul setup editor: suite a 462 test, flusso browser 67 pendente. |
| `issue-016-endgame-section` | Rendere reale la sezione Finale riusando il modello e le componenti definite per Mediogioco. | R26.2 e R26.1 archiviate. | Vista lista/dettaglio/editor per studi e posizioni di finale, senza import Lichess; matrice completa R26.1/R26.2 verificata con dati `ENDGAME`, rotte `/endgame`, sei viewport e regressioni Aperture/Mediogioco. Il riuso non sostituisce i test. |
| `issue-016-play-position-vs-engine` | Avviare il gioco contro Stockfish dalla posizione salvata. | FEN custom + sezioni reali. | Integrazione con `/play?fen=...` o flusso equivalente, senza introdurre training/review. |

La prima change `issue-016-phase-domain-model` è stata completata il 2026-07-04 e ha
fissato il modello di dominio prima della UI definitiva. `issue-016-custom-starting-fen` è
stata implementata e rilasciata dopo la verifica dei flussi E2E 49–52; `issue-016-move-comments`
è stata completata in R24 come estensione limitata del tree. R26 ha applicato queste
decisioni alla prima sezione reale e ha verificato il riuso con i flussi E2E 53–58.
R26.1 ha consolidato e verificato il comportamento comune alle sezioni posizionali ed è archiviata.
R26.2 ha chiuso la gerarchia contestuale dell'editor prima di R27;
le slice successive non devono ridecidere il dominio.
R27 dovrà recepire esplicitamente tutti i dieci correttivi R26.1 e i cinque R26.2 nei propri
artefatti e produrre evidenza dedicata `ENDGAME`, anche quando l'implementazione è già ereditata
da classi condivise.
La navigazione iniziale è stata
consegnata con ISSUE-021/R20.

**`issue-016-phase-domain-model` implementata (2026-07-04):** `Study.phase` (`OPENING`/`MIDDLEGAME`/`ENDGAME`, immutabile), `Variant` riusata come elemento figlio comune, import/sync Lichess e training/review/statistiche limitati alle Aperture. **`issue-016-navigation-scaffold` è stata soddisfatta da ISSUE-021/R20 (2026-08-05).** Decisione e alternative in [ADR 0014](../adr/decisioni-tecniche.md). `issue-016-move-comments` è stata completata in R24; `issue-016-custom-starting-fen` è integrata e verificata; `issue-016-middlegame-section` è implementata, verificata e archiviata in R26; `issue-016-positional-study-consolidation` è archiviata; `issue-016-position-editor-contextual-actions` è implementata, verificata e archiviata in R26.2. Le slice funzionali residue sono `issue-016-endgame-section` e `issue-016-play-position-vs-engine`, ciascuna con la propria change OpenSpec.

## ISSUE-017 — Menu "Impostazioni" (hub) + parametrizzazione SM-2
**Why (problema):** non esiste un punto centrale di configurazione; i parametri
dell'algoritmo SM-2 sono **costanti hardcoded** in `ReviewScheduler` e non modificabili.
**What (obiettivo):**
- Pulsante **ingranaggio** in topbar → sottomenu → **pagina impostazioni** a sezioni.
  È l'**infrastruttura condivisa** (ingranaggio, pagina, persistenza, endpoint).
- **Sezione SM-2**: parametri editabili e validati. Candidati (oggi costanti in
  `ReviewScheduler`): `INITIAL_EASE` (2.5), `MIN_EASE` (1.3), primo intervallo (1 g),
  secondo intervallo (6 g), soglia errori per esito negativo (3), e il **cap
  `MAX_INTERVAL_DAYS` (6)** introdotto di recente. I coefficienti della formula EF
  (0.1/0.08/0.02) restano fissi in prima battuta.
- **Sezione Motore**: ospita i parametri Stockfish di **ISSUE-014**.
- Il pulsante info **"?"** di **ISSUE-015** è **affiancato** all'ingranaggio (resta distinto).
**Impatto modello dati & API:** se la persistenza è su DB → nuova tabella `app_settings`
(single-row, contesto single-user) + endpoint `GET`/`PUT /api/settings`; refactor di
`ReviewScheduler` da statico a **parametrizzato** (legge i parametri invece delle costanti).
In alternativa persistenza su `localStorage` → niente DB/migrazione.
**Prerequisiti:** Liquibase (✅, se si va su `app_settings`); decisione persistenza
(DB vs localStorage).
**Criteri d'ingresso:** mini-spec OpenSpec che fissi modello `app_settings`, contratto
endpoint e strategia di refactor dello scheduler (con i 66 test BE come rete anti-regressione).
**Vincoli:** le modifiche ai parametri **non** ricalcolano retroattivamente le schedule
esistenti (valgono dai successivi allenamenti) — da esplicitare in UI.
**Note:** non implementare prima di bug+evolutive. Cluster topbar condiviso (ISSUE-011/015).

## ISSUE-014 — Personalizzazione parametri motore Stockfish (UCI)
**Why (problema):** Stockfish gira con parametri fissi (profondità/tempo hardcoded);
l'utente vuole configurarli via protocollo UCI.
**What (obiettivo):** sezione "Motore" (dentro l'hub Impostazioni di ISSUE-017) con i
parametri UCI rilevanti applicati al motore. Candidati da confermare sull'effettiva build:
`Skill Level`, `UCI_LimitStrength`+`UCI_Elo`, `MultiPV`, `Hash`, `Move Overhead`/
`Minimum Thinking Time`/`Slow Mover`, `Contempt`, `UCI_AnalyseMode` (`Threads` fisso a 1).
**Investigazione preliminare obbligatoria:** audit di quali opzioni espone realmente la
build **asm.js single-thread di Stockfish 10** vendorizzata (via `setoption` UCI) — non
tutte le opzioni native sono disponibili. **Da fare prima di disegnare l'UI.**
**Impatto modello dati & API:** dipende dalla persistenza scelta in ISSUE-017 (tabella
`app_settings` → sì DB/migrazione; `localStorage` → no).
**Prerequisiti:** audit UCI; infrastruttura Impostazioni di ISSUE-017 (accesso/persistenza).
**Criteri d'ingresso:** audit documentato delle opzioni disponibili + decisione di
persistenza (ereditata da ISSUE-017).
**Note:** confluisce in ISSUE-017 per accesso e salvataggio; questa scheda copre il
contenuto specifico del motore.

**Relazione con ISSUE-022:** `MultiPV` resta un possibile parametro configurabile di questa
issue, mentre la visualizzazione della singola linea principale nel pannello motore è
tracciata separatamente in **ISSUE-022** e non richiede la configurazione MultiPV.
