## MODIFIED Requirements

### Requirement: Middlegame section lists only middlegame studies
Il sistema SHALL sostituire il segnaposto `/middlegame` con una lista degli studi la cui fase e' `MIDDLEGAME`. La lista SHALL ottenere i dati tramite il filtro di fase dell'API e SHALL presentare conteggi e terminologia riferiti alle posizioni, senza mostrare colore, azioni di review o importazione. La pagina SHALL esporre una sola azione di creazione nell'intestazione anche quando la lista è vuota.

#### Scenario: Open the middlegame section
- **WHEN** l'utente apre `/middlegame`
- **THEN** il sistema richiede gli studi con fase `MIDDLEGAME` e mostra soltanto tali studi con il relativo numero di posizioni

#### Scenario: Middlegame has no studies
- **WHEN** l'API non restituisce alcuno studio `MIDDLEGAME`
- **THEN** la sezione mostra il messaggio di stato vuoto e la sola azione «Nuovo studio» dell'intestazione

#### Scenario: Positional study color is not presented
- **WHEN** uno studio `MIDDLEGAME` restituito dall'API contiene anche un valore tecnico o legacy di colore
- **THEN** la lista non mostra alcun badge o indicazione di colore

#### Scenario: Opening-only actions stay outside the section
- **WHEN** l'utente consulta la lista Mediogioco
- **THEN** il sistema non mostra «Ripeti oggi», import PGN, import o sync Lichess, training o statistiche

### Requirement: Middlegame studies are created manually with an immutable phase
Il sistema SHALL offrire su `/middlegame/studies/new` un flusso manuale per creare uno studio con nome obbligatorio e descrizione facoltativa. Il form SHALL NOT mostrare un campo colore; la richiesta SHALL assegnare esplicitamente `phase: MIDDLEGAME`, SHALL inviare colore nullo e SHALL NOT offrire input o operazioni Lichess.

#### Scenario: Create a middlegame study
- **WHEN** l'utente invia metadati validi dal form di creazione Mediogioco
- **THEN** il sistema crea uno studio `MIDDLEGAME` senza colore e apre `/middlegame/studies/{id}`

#### Scenario: Creation form has no color or Lichess flow
- **WHEN** l'utente apre la creazione di uno studio Mediogioco
- **THEN** il form non mostra colore, link Lichess, anteprima capitoli, connessione OAuth, import o sync

#### Scenario: Invalid study metadata is rejected
- **WHEN** la creazione manuale non contiene un nome valido o il backend rifiuta i metadati
- **THEN** il sistema non crea lo studio e mostra l'errore senza uscire dal form Mediogioco

### Requirement: Middlegame study detail manages positions
Il sistema SHALL mostrare su `/middlegame/studies/{id}` nome, descrizione, numero ed elenco delle posizioni, usando la terminologia «posizione/posizioni» senza presentare il colore dello studio. Il dettaglio SHALL consentire la modifica di nome e descrizione, la cancellazione dello studio, la creazione di una posizione e la cancellazione di una posizione tramite i contratti esistenti. Durante la modifica dei metadati SHALL NOT presentare la CTA «Nuova posizione» né l'invito operativo dello stato vuoto.

#### Scenario: View a middlegame study with positions
- **WHEN** l'utente apre il dettaglio di uno studio `MIDDLEGAME` contenente posizioni
- **THEN** il sistema mostra ciascuna posizione con titolo e numero di mosse e consente di aprirne il dettaglio canonico senza mostrare il colore dello studio

#### Scenario: Create a position from its study
- **WHEN** l'utente attiva «Nuova posizione» dal dettaglio dello studio in consultazione
- **THEN** il sistema apre `/middlegame/positions/new?studyId={studyId}` mantenendo lo studio padre

#### Scenario: Edit positional study metadata
- **WHEN** l'utente apre il form «Modifica» di uno studio `MIDDLEGAME`
- **THEN** il form mostra nome e descrizione ma non colore, «Nuova posizione» o l'invito ad aggiungerne una

#### Scenario: Study has no positions
- **WHEN** lo studio `MIDDLEGAME` non contiene posizioni ed è in modalità consultazione
- **THEN** il dettaglio mostra uno stato vuoto e l'azione «Nuova posizione»

#### Scenario: Opening-only study actions are absent
- **WHEN** l'utente consulta il dettaglio di uno studio `MIDDLEGAME`
- **THEN** il sistema non mostra import PGN, import o sync Lichess, training, review o statistiche dello studio

### Requirement: Middlegame positions have a usable read-only detail
Il sistema SHALL mostrare su `/middlegame/positions/{id}` la scacchiera inizializzata dalla `startingFen` persistita, il titolo e la navigazione fra posizioni sorelle. Se l'albero è non vuoto, mosse, rami, commenti, NAG, contatore e replay SHALL essere inizialmente nascosti e SHALL diventare visibili insieme tramite «Mostra analisi». Il dettaglio SHALL consentire l'eliminazione confermata della posizione e SHALL mantenere compatta la navigazione posizionale mostrando soltanto i titoli.

#### Scenario: View a position with a move tree
- **WHEN** l'utente apre una posizione `MIDDLEGAME` con mosse e rami salvati
- **THEN** il sistema parte dalla `startingFen` e mostra «Mostra analisi» senza renderizzare il contenuto dell'albero o i controlli di replay

#### Scenario: Reveal a position analysis
- **WHEN** l'utente attiva «Mostra analisi»
- **THEN** il dettaglio mostra l'intero albero, commenti, NAG, contatore e replay in sola lettura partendo dalla `startingFen`

#### Scenario: Change sibling after revealing analysis
- **WHEN** l'utente ha rivelato l'analisi e seleziona un'altra posizione dal rail o dal drawer
- **THEN** il nuovo dettaglio torna sulla propria `startingFen` con analisi nascosta

#### Scenario: View a position without moves
- **WHEN** l'utente apre una posizione `MIDDLEGAME` con albero vuoto
- **THEN** il sistema mostra la scacchiera nella `startingFen` e «Nessuna analisi salvata» senza azione di rivelazione o replay

#### Scenario: Navigate through compact position entries
- **WHEN** il rail o il drawer elenca le posizioni dello studio
- **THEN** ogni voce mostra soltanto il titolo senza colore o conteggio mosse, mantenendo un target cliccabile accessibile

#### Scenario: Delete a position from its detail
- **WHEN** l'utente conferma «Elimina posizione» e l'API completa la cancellazione
- **THEN** il sistema mostra la conferma e apre `/middlegame/studies/{studyId}`

#### Scenario: Cancel or fail position deletion
- **WHEN** l'utente annulla la conferma oppure l'API di eliminazione fallisce
- **THEN** il sistema resta sul dettaglio senza navigare e, in caso di errore, mostra un messaggio

#### Scenario: Open either position editor from the detail
- **WHEN** l'utente consulta il dettaglio di una posizione
- **THEN** il sistema offre azioni distinte per configurare la posizione iniziale e modificare le mosse

### Requirement: Position setup and move editing preserve the R25 contracts
Il sistema SHALL riusare l'editor visuale/FEN per creare o modificare la posizione iniziale e l'editor dell'albero per modificare le continuazioni. Entrambi SHALL operare sulla stessa posizione `Variant`, preservando `studyId`, `startingFen`, albero e validazione backend stabiliti in R25. A parità di viewport desktop, dettaglio ed editor delle mosse SHALL mantenere invariati posizione e dimensioni della scacchiera; nell'editor i controlli operativi SHALL vivere nel pannello destro e non sotto la board.

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

#### Scenario: Keep the board anchored between detail and move editor
- **WHEN** l'utente passa da `/middlegame/positions/{id}` a `/middlegame/positions/{id}/edit` o ritorna dopo il salvataggio allo stesso viewport desktop
- **THEN** il rettangolo della scacchiera conserva gli stessi valori `left`, `top`, `width` e `height` anche in presenza di breadcrumb o rail

#### Scenario: Keep editor operations in the side panel
- **WHEN** l'editor delle mosse è mostrato in un layout desktop
- **THEN** Motore, navigazione, contatore, ramo corrente, azioni sulle mosse e conferma di eliminazione sono nel pannello destro e sotto la scacchiera non resta contenuto operativo

#### Scenario: Use the move editor on a narrow viewport
- **WHEN** l'editor è aperto a 768 pixel o meno
- **THEN** il pannello può disporsi verticalmente senza overflow orizzontale e senza perdere alcuna azione

### Requirement: Middlegame excludes opening-only and R28 actions
Il sistema SHALL NOT esporre training, review SM-2, statistiche, import PGN, import o sync Lichess per studi e posizioni `MIDDLEGAME`. Il sistema SHALL mantenere disponibili gli strumenti di analisi Stockfish gia' esistenti, ma SHALL NOT esporre il comando che avvia una partita contro il computer dalla posizione. L'attivazione del motore SHALL NOT modificare posizione o dimensione della scacchiera.

#### Scenario: Consult a middlegame position
- **WHEN** l'utente apre il dettaglio di una posizione `MIDDLEGAME`
- **THEN** il sistema non mostra training, review, statistiche o «Gioca contro il computer»

#### Scenario: Analyze a middlegame position
- **WHEN** Stockfish e' disponibile e l'utente attiva il motore nel dettaglio o nell'editor delle mosse
- **THEN** il sistema analizza la FEN corrente e mantiene barra di valutazione e linea migliore nei contesti che gia' le supportano senza spostare o ridimensionare la scacchiera

#### Scenario: Opening variant keeps play action
- **WHEN** l'utente apre il dettaglio o l'editor di una variante `OPENING`
- **THEN** il comando «Gioca contro il computer» e gli altri strumenti delle Aperture restano disponibili come prima di R26
