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
| 016 | Tutte le fasi del gioco (mediogioco/finale) | alto | spezzata in change OpenSpec incrementali |
| 017 | Menu "Impostazioni" (hub) + parametrizzazione SM-2 | medio-alto | richiede OpenSpec |
| 014 | Personalizzazione parametri motore Stockfish (UCI) | medio | richiede audit + OpenSpec |

---

## ISSUE-016 — Webapp per tutte le fasi del gioco (mediogioco/finale)
**Why (problema):** la webapp allena solo le aperture. L'utente vuole estenderla a
**mediogioco** e **finale**, mantenendo l'organizzazione già nota delle aperture:
studi con capitoli/posizioni.
**What (obiettivo):**
- Tre sezioni in topbar — **Aperture** (esistente), **Mediogioco**, **Finale** — la cui
  *navigazione/scaffold* è anticipata da **ISSUE-021** (segnaposto già pronti da sostituire).
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
- Nuovo concetto "posizione" dentro una struttura **studio -> capitoli/posizioni**
  analoga alle aperture (riuso/estensione di `Study`/`Variant` con un campo "fase",
  oppure entità separate — **da decidere in analisi**).
- `MoveNode` oggi **non** ha un campo `comment` → modifica al modello (changeset Liquibase).
- UI dedicata di composizione posizione: editor scacchiera, generazione/validazione del
  `startingFen`, gestione colore al tratto e orientamento scacchiera se salvato come dato
  della posizione o preferenza UI. La validazione deve bloccare il salvataggio delle
  posizioni impossibili lato UI e deve essere confermata anche lato backend/API.
- Import Lichess: resta legato alle aperture; per Mediogioco/Finale non è richiesto.
**Prerequisiti:** Liquibase (✅), **artefatti OpenSpec**, decisione struttura DB; ISSUE-021
(scaffold) preferibilmente già fatto.
**Criteri d'ingresso (prima di implementare):** esiste una proposta OpenSpec approvata con
specifiche funzionali, contratti API, modello dati e criteri di accettazione.
**Note:** è la visione strategica del prodotto; va spezzata in più change OpenSpec
incrementali (non una singola sessione). Materiale di supporto per l'editor posizione:
[`assets/ISSUE-016/position-editor/`](assets/ISSUE-016/position-editor/).

### Scomposizione OpenSpec proposta

`ISSUE-016` resta il contenitore strategico. L'implementazione va gestita con change
OpenSpec piccole, ordinate e revisionabili:

| Change OpenSpec | Obiettivo | Dipende da | Output atteso |
|-----------------|-----------|------------|---------------|
| `issue-016-phase-domain-model` | Decidere il modello di dominio per fasi del gioco: riuso/estensione di `Study`/`Variant` con campo `phase` oppure entità dedicate per studi/posizioni. | Liquibase ✅ | Decisione dati/API, organizzazione studio -> capitoli/posizioni, confini tra aperture e sezioni posizionali, import Lichess limitato alle aperture, impatto su training/statistiche/review. |
| `issue-016-navigation-scaffold` | Introdurre la navigazione Aperture/Mediogioco/Finale e i segnaposto, se **ISSUE-021** non è già stato completato come lavoro diretto. | Nessuna; preferito prima degli slice funzionali. | Route e topbar pronte senza nuovo modello dati. |
| `issue-016-custom-starting-fen` | Consentire la creazione manuale della posizione iniziale tramite editor scacchiera; il FEN è il formato tecnico salvato/validato, non il flusso primario. | `issue-016-phase-domain-model` | Creazione/modifica da editor scacchiera: palette pezzi a destra, selezione pezzo e click sulla casa in stile Fritz/ChessBase, cursore con miniatura del pezzo solo dentro la scacchiera quando un pezzo è selezionato, sostituzione se la casa contiene un pezzo diverso, rimozione se contiene lo stesso pezzo dello stesso colore, spostamento/rimozione pezzi, pulizia scacchiera, colore al tratto, orientamento bianco/nero, apertura automatica dell'editor alla creazione di una posizione Mediogioco/Finale, salvataggio come FEN valido solo quando la posizione è legalmente possibile; salvataggio disabilitato per posizioni impossibili e validazione confermata lato backend. Copia/incolla FEN secondario; esclusi ASCII, Bianco/Nero, Re/Donna, aiuto dedicato e numero mossa UI. |
| `issue-016-move-comments` | Aggiungere commenti e annotazioni alle mosse (`!`, `?`, `!!`, `??`, `!?`, `?!`). | `issue-016-phase-domain-model` | Estensione `MoveNode`, migration se necessaria, UI di lettura/modifica commenti. |
| `issue-016-middlegame-section` | Rendere reale la sezione Mediogioco: studi con capitoli/posizioni navigabili, senza import Lichess, training né SM-2. | Modello deciso + editor posizione/FEN minimo. | Vista lista/dettaglio/editor per studi e posizioni di mediogioco. |
| `issue-016-endgame-section` | Rendere reale la sezione Finale riusando il modello e le componenti definite per Mediogioco. | `issue-016-middlegame-section` o componenti condivise già estratte. | Vista lista/dettaglio/editor per studi e posizioni di finale, senza import Lichess. |
| `issue-016-play-position-vs-engine` | Avviare il gioco contro Stockfish dalla posizione salvata. | FEN custom + sezioni reali. | Integrazione con `/play?fen=...` o flusso equivalente, senza introdurre training/review. |

La prima change da aprire è `issue-016-phase-domain-model`: deve produrre una proposta
approvata prima di creare tabelle, endpoint o UI definitive. Gli slice successivi non
devono ridecidere il dominio, ma applicare la decisione presa lì.

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
