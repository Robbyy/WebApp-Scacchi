# middlegame-study-section Specification

## Purpose
Definire la sezione Mediogioco reale: studi `MIDDLEGAME` e relative posizioni manuali
navigabili tramite route canoniche, con controllo esatto della fase e riuso dei contratti
FEN/albero, mantenendo fuori dalla sezione le funzioni riservate alle Aperture e a R28.
## Requirements
### Requirement: Middlegame section lists only middlegame studies
Il sistema SHALL sostituire il segnaposto `/middlegame` con una lista degli studi la cui fase e' `MIDDLEGAME`. La lista SHALL ottenere i dati tramite il filtro di fase dell'API e SHALL presentare conteggi e terminologia riferiti alle posizioni, senza mostrare azioni di review o importazione.

#### Scenario: Open the middlegame section
- **WHEN** l'utente apre `/middlegame`
- **THEN** il sistema richiede gli studi con fase `MIDDLEGAME` e mostra soltanto tali studi con il relativo numero di posizioni

#### Scenario: Middlegame has no studies
- **WHEN** l'API non restituisce alcuno studio `MIDDLEGAME`
- **THEN** la sezione mostra uno stato vuoto con un'azione per creare manualmente il primo studio di Mediogioco

#### Scenario: Opening-only actions stay outside the section
- **WHEN** l'utente consulta la lista Mediogioco
- **THEN** il sistema non mostra «Ripeti oggi», import PGN, import o sync Lichess, training o statistiche

### Requirement: Middlegame studies are created manually with an immutable phase
Il sistema SHALL offrire su `/middlegame/studies/new` un flusso manuale per creare uno studio con nome obbligatorio, descrizione e colore facoltativi. La richiesta SHALL assegnare esplicitamente `phase: MIDDLEGAME` e SHALL NOT offrire input o operazioni Lichess.

#### Scenario: Create a middlegame study
- **WHEN** l'utente invia metadati validi dal form di creazione Mediogioco
- **THEN** il sistema crea uno studio `MIDDLEGAME` e apre `/middlegame/studies/{id}`

#### Scenario: Creation form has no Lichess flow
- **WHEN** l'utente apre la creazione di uno studio Mediogioco
- **THEN** il form non mostra link Lichess, anteprima capitoli, connessione OAuth, import o sync

#### Scenario: Invalid study metadata is rejected
- **WHEN** la creazione manuale non contiene un nome valido o il backend rifiuta i metadati
- **THEN** il sistema non crea lo studio e mostra l'errore senza uscire dal form Mediogioco

### Requirement: Middlegame navigation uses canonical section routes
Il sistema SHALL mantenere lista, studi, posizioni ed editor di Mediogioco sotto il prefisso `/middlegame`. Le pagine SHALL usare route canoniche distinte per dettaglio, setup della posizione iniziale ed editing delle mosse, mantenendo il tab Mediogioco attivo e i breadcrumb coerenti.

#### Scenario: Navigate through a middlegame study
- **WHEN** l'utente passa dalla lista a uno studio e poi a una sua posizione
- **THEN** gli URL sono `/middlegame/studies/{studyId}` e `/middlegame/positions/{positionId}` e il tab Mediogioco espone `aria-current="page"`

#### Scenario: Open the starting-position setup
- **WHEN** l'utente sceglie di configurare la posizione iniziale di una posizione esistente
- **THEN** il sistema apre `/middlegame/positions/{positionId}/setup`

#### Scenario: Open the move-tree editor
- **WHEN** l'utente sceglie di modificare le mosse di una posizione esistente
- **THEN** il sistema apre `/middlegame/positions/{positionId}/edit`

#### Scenario: Navigate among sibling positions
- **WHEN** l'utente seleziona un'altra posizione dal rail o dal drawer dello stesso studio
- **THEN** il sistema apre il dettaglio o l'editor equivalente sotto `/middlegame/positions/{id}` senza uscire dalla sezione

### Requirement: Middlegame routes enforce the expected phase
Il sistema SHALL verificare che ogni studio o posizione aperto tramite una route `/middlegame/...` appartenga a uno studio con fase esattamente `MIDDLEGAME`. Un contenuto di fase diversa SHALL NOT essere presentato o modificato come contenuto di Mediogioco.

#### Scenario: Opening study id is used in a middlegame route
- **WHEN** l'utente apre `/middlegame/studies/{id}` con l'identificativo di uno studio `OPENING`
- **THEN** il sistema mostra un errore di sezione e non presenta lo studio come Mediogioco

#### Scenario: Endgame position id is used in a middlegame route
- **WHEN** l'utente apre una route di dettaglio o editor Mediogioco con l'identificativo di una posizione appartenente a uno studio `ENDGAME`
- **THEN** il sistema mostra un errore di sezione e non abilita consultazione o modifica come posizione di Mediogioco

#### Scenario: Opening routes keep their current behavior
- **WHEN** l'utente usa le route esistenti delle Aperture
- **THEN** lista, creazione/import, dettaglio, editor, training, review e statistiche delle Aperture continuano a funzionare con URL e comportamento pre-R26

### Requirement: Middlegame study detail manages positions
Il sistema SHALL mostrare su `/middlegame/studies/{id}` i metadati dello studio, il numero e l'elenco delle sue posizioni, usando la terminologia «posizione/posizioni». Il dettaglio SHALL consentire la modifica dei metadati, la cancellazione dello studio, la creazione di una posizione e la cancellazione di una posizione tramite i contratti esistenti.

#### Scenario: View a middlegame study with positions
- **WHEN** l'utente apre il dettaglio di uno studio `MIDDLEGAME` contenente posizioni
- **THEN** il sistema mostra ciascuna posizione con titolo e numero di mosse e consente di aprirne il dettaglio canonico

#### Scenario: Create a position from its study
- **WHEN** l'utente attiva «Nuova posizione» dal dettaglio dello studio
- **THEN** il sistema apre `/middlegame/positions/new?studyId={studyId}` mantenendo lo studio padre

#### Scenario: Study has no positions
- **WHEN** lo studio `MIDDLEGAME` non contiene posizioni
- **THEN** il dettaglio mostra uno stato vuoto e l'azione «Nuova posizione»

#### Scenario: Opening-only study actions are absent
- **WHEN** l'utente consulta il dettaglio di uno studio `MIDDLEGAME`
- **THEN** il sistema non mostra import PGN, import o sync Lichess, training, review o statistiche dello studio

### Requirement: Middlegame positions have a usable read-only detail
Il sistema SHALL mostrare su `/middlegame/positions/{id}` la scacchiera inizializzata dalla `startingFen` persistita, il titolo, l'albero di mosse con commenti e NAG, i controlli di replay e la navigazione fra posizioni sorelle. Una posizione senza mosse SHALL restare consultabile dalla propria FEN iniziale.

#### Scenario: View a position with a move tree
- **WHEN** l'utente apre una posizione `MIDDLEGAME` con mosse e rami salvati
- **THEN** il sistema parte dalla `startingFen`, consente il replay dell'albero e mostra commenti e NAG senza abilitarne la modifica nel dettaglio

#### Scenario: View a position without moves
- **WHEN** l'utente apre una posizione `MIDDLEGAME` con albero vuoto
- **THEN** il sistema mostra la scacchiera nella `startingFen` e uno stato «Nessuna mossa» senza considerare la posizione non valida

#### Scenario: Open either position editor from the detail
- **WHEN** l'utente consulta il dettaglio di una posizione
- **THEN** il sistema offre azioni distinte per configurare la posizione iniziale e modificare le mosse

### Requirement: Position setup and move editing preserve the R25 contracts
Il sistema SHALL riusare l'editor visuale/FEN per creare o modificare la posizione iniziale e l'editor dell'albero per modificare le continuazioni. Entrambi SHALL operare sulla stessa posizione `Variant`, preservando `studyId`, `startingFen`, albero e validazione backend stabiliti in R25.

#### Scenario: Create and continue editing a position
- **WHEN** l'utente salva una nuova posizione valida da `/middlegame/positions/new?studyId={studyId}`
- **THEN** il sistema associa la posizione allo studio e apre `/middlegame/positions/{id}/edit` per aggiungere le mosse

#### Scenario: Update the starting position
- **WHEN** l'utente salva una FEN modificata da `/middlegame/positions/{id}/setup`
- **THEN** il backend rivalida atomicamente l'albero esistente e, in caso di successo, il sistema apre l'editor delle mosse canonico

#### Scenario: Update the move tree
- **WHEN** l'utente salva mosse e annotazioni valide da `/middlegame/positions/{id}/edit`
- **THEN** il sistema conserva la `startingFen`, persiste l'albero e apre `/middlegame/positions/{id}`

#### Scenario: Cancel position editing
- **WHEN** l'utente annulla la creazione o una modifica senza cambiamenti pendenti
- **THEN** la creazione torna allo studio padre e una modifica torna al dettaglio canonico della posizione

### Requirement: Middlegame excludes opening-only and R28 actions
Il sistema SHALL NOT esporre training, review SM-2, statistiche, import PGN, import o sync Lichess per studi e posizioni `MIDDLEGAME`. Il sistema SHALL mantenere disponibili gli strumenti di analisi Stockfish gia' esistenti, ma SHALL NOT esporre il comando che avvia una partita contro il computer dalla posizione.

#### Scenario: Consult a middlegame position
- **WHEN** l'utente apre il dettaglio di una posizione `MIDDLEGAME`
- **THEN** il sistema non mostra training, review, statistiche o «Gioca contro il computer»

#### Scenario: Analyze a middlegame position
- **WHEN** Stockfish e' disponibile e l'utente attiva il motore nel dettaglio o nell'editor delle mosse
- **THEN** il sistema analizza la FEN corrente e mantiene barra di valutazione e linea migliore nei contesti che gia' le supportano

#### Scenario: Opening variant keeps play action
- **WHEN** l'utente apre il dettaglio o l'editor di una variante `OPENING`
- **THEN** il comando «Gioca contro il computer» e gli altri strumenti delle Aperture restano disponibili come prima di R26

### Requirement: Endgame remains outside R26
Il sistema SHALL lasciare `/endgame` sul segnaposto esistente e SHALL NOT attivare in R26 lista, creazione o route canoniche della sezione Finale.

#### Scenario: Open the endgame section during R26
- **WHEN** l'utente apre `/endgame`
- **THEN** il sistema mostra ancora il segnaposto «In fase di implementazione»
