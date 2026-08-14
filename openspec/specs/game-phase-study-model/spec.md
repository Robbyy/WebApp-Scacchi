# game-phase-study-model Specification

## Purpose
Definisce il modello di dominio che organizza gli studi per fase del gioco, distinguendo Aperture, Mediogioco e Finale e chiarendo quali funzionalita' restano limitate alle Aperture.
## Requirements
### Requirement: Study has a game phase
Il sistema SHALL assegnare a ogni studio esattamente una fase di gioco tra `OPENING`, `MIDDLEGAME`, `ENDGAME`.

#### Scenario: Existing studies become opening studies
- **WHEN** il modello a fasi viene applicato agli studi esistenti
- **THEN** ogni studio esistente viene trattato come `OPENING`

#### Scenario: New study is created with a phase
- **WHEN** viene creato un nuovo studio
- **THEN** lo studio persistito espone il valore `phase` nelle risposte di lista e dettaglio

### Requirement: Study phase is the source of truth for its children
Il sistema SHALL derivare la fase di ogni variante o posizione dallo studio padre.

#### Scenario: Opening child is presented as a variant
- **WHEN** un elemento figlio appartiene a uno studio con fase `OPENING`
- **THEN** il sistema lo tratta come variante o capitolo di apertura

#### Scenario: Middlegame or endgame child is presented as a position
- **WHEN** un elemento figlio appartiene a uno studio con fase `MIDDLEGAME` o `ENDGAME`
- **THEN** il sistema lo tratta come posizione dentro quello studio

### Requirement: Study phase is immutable after creation
Il sistema SHALL NOT consentire la modifica della fase di uno studio dopo la creazione.

#### Scenario: Existing study metadata is updated
- **WHEN** vengono aggiornati nome, descrizione o colore di uno studio
- **THEN** lo studio conserva la fase originale

#### Scenario: Client attempts to change phase during update
- **WHEN** una richiesta di aggiornamento contiene una fase diversa per uno studio esistente
- **THEN** il sistema rifiuta la richiesta senza cambiare la fase persistita

### Requirement: Lichess import is limited to opening studies
Il sistema SHALL creare o aggiornare solo studi `OPENING` tramite i flussi di import e sync Lichess.

#### Scenario: Lichess study is imported
- **WHEN** viene importato uno studio o capitolo Lichess
- **THEN** lo studio locale risultante ha fase `OPENING`

#### Scenario: Non-opening study is managed manually
- **WHEN** uno studio ha fase `MIDDLEGAME` o `ENDGAME`
- **THEN** il sistema non espone import o sync Lichess come operazione valida per quello studio

### Requirement: Non-opening studies use manually created positions
Il sistema SHALL rappresentare i contenuti di Mediogioco e Finale come posizioni create manualmente sotto studi con fase `MIDDLEGAME` o `ENDGAME`.

#### Scenario: Position belongs to a middlegame study
- **WHEN** viene creato un elemento figlio in uno studio `MIDDLEGAME`
- **THEN** il sistema lo salva sotto quello studio e lo tratta come posizione

#### Scenario: Position belongs to an endgame study
- **WHEN** viene creato un elemento figlio in uno studio `ENDGAME`
- **THEN** il sistema lo salva sotto quello studio e lo tratta come posizione

### Requirement: Starting FEN remains the technical start position
Il sistema SHALL usare `startingFen` sull'elemento figlio come posizione iniziale tecnica sia per varianti di Apertura sia per posizioni non di apertura. Per le varianti appartenenti a studi `OPENING` e per le varianti legacy senza studio, `startingFen` SHALL essere la posizione iniziale standard degli scacchi. Per una posizione appartenente a uno studio `MIDDLEGAME` o `ENDGAME`, `startingFen` SHALL essere la FEN custom legalmente validata e persistita per quella posizione.

#### Scenario: Opening variant has standard start
- **WHEN** viene creata o aggiornata una variante di Apertura senza posizione iniziale custom
- **THEN** il suo `startingFen` e' la posizione iniziale standard degli scacchi

#### Scenario: Non-opening position uses stored start
- **WHEN** viene aperta una posizione di mediogioco o finale
- **THEN** lo stato della scacchiera deriva dallo `startingFen` di quella posizione

#### Scenario: Non-opening position stores a validated custom start
- **WHEN** viene salvata una posizione in uno studio `MIDDLEGAME` o `ENDGAME` con una configurazione iniziale legalmente valida
- **THEN** il sistema persiste la FEN generata dalla configurazione come `startingFen` della posizione

### Requirement: Training and review are opening-only
Il sistema SHALL consentire sessioni di training e review SM-2 solo per varianti di apertura.

#### Scenario: Training is requested for an opening variant
- **WHEN** viene creata una sessione di training per una variante in uno studio `OPENING` o per una variante legacy senza studio
- **THEN** il sistema registra la sessione e aggiorna la pianificazione review come oggi

#### Scenario: Training is requested for a non-opening position
- **WHEN** viene richiesta una sessione di training per una posizione in uno studio `MIDDLEGAME` o `ENDGAME`
- **THEN** il sistema rifiuta la richiesta senza registrare sessioni di training e senza aggiornare la pianificazione review

### Requirement: Training statistics remain opening statistics
Il sistema SHALL mantenere le statistiche esistenti basate sul training nel perimetro delle sessioni di apertura e SHALL NOT presentarle come statistiche di posizioni di Mediogioco o Finale.

#### Scenario: Stats are requested for an opening study
- **WHEN** vengono richieste statistiche per uno studio `OPENING` con sessioni di training
- **THEN** il sistema restituisce le statistiche esistenti basate sul training

#### Scenario: Stats are requested for a non-opening study
- **WHEN** vengono richieste statistiche per uno studio `MIDDLEGAME` o `ENDGAME`
- **THEN** il sistema non presenta statistiche basate sul training come statistiche di posizione

### Requirement: Tags are not part of this capability
Il sistema SHALL NOT introdurre gestione di tag o categorie come parte della capability `game-phase-study-model`.

#### Scenario: Game phase model is implemented
- **WHEN** viene consegnato il modello a fasi
- **THEN** studi e posizioni sono organizzati per fase senza richiedere tag o categorie

### Requirement: Non-opening positions open in study mode
Il sistema SHALL trattare il dettaglio di ogni posizione appartenente a uno studio `MIDDLEGAME` o
`ENDGAME` come materiale di studio. La `startingFen` e il titolo SHALL essere visibili subito, mentre
l'analisi salvata SHALL NOT essere renderizzata finché l'utente non la rivela esplicitamente. Questo
comportamento SHALL NOT creare sessioni di training, review o statistiche.

#### Scenario: Open a non-opening position with saved analysis
- **WHEN** l'utente apre una posizione `MIDDLEGAME` o `ENDGAME` con un albero non vuoto
- **THEN** il sistema mostra la posizione iniziale e «Mostra analisi» senza renderizzare mosse, rami, commenti, NAG, contatore o replay

#### Scenario: Reveal the complete saved analysis
- **WHEN** l'utente attiva «Mostra analisi»
- **THEN** il sistema rende visibili l'intero albero salvato, commenti, NAG, contatore e controlli di replay senza registrare attività di training

#### Scenario: Reset study mode
- **WHEN** l'utente cambia posizione oppure ricarica il dettaglio
- **THEN** la nuova consultazione riparte con l'analisi nascosta e la scacchiera sulla relativa `startingFen`

#### Scenario: Open a position without saved analysis
- **WHEN** una posizione non di apertura ha albero vuoto
- **THEN** il sistema mostra «Nessuna analisi salvata» e non presenta un'azione di rivelazione

#### Scenario: Opening variant keeps immediate read-only content
- **WHEN** l'utente apre il dettaglio di una variante `OPENING`
- **THEN** il sistema conserva la presentazione immediata delle mosse e tutti i flussi training/review esistenti

### Requirement: Opening study list remains isolated by phase
Il sistema SHALL presentare nella home Aperture esclusivamente studi `OPENING`. La lista SHALL
richiedere esplicitamente la fase `OPENING` e SHALL NOT mostrare studi `MIDDLEGAME` o `ENDGAME`,
anche quando tali studi esistono nel repertorio.

#### Scenario: Positional studies exist while opening the home
- **WHEN** l'utente apre `/` e il repertorio contiene studi di più fasi
- **THEN** la home richiede e mostra soltanto gli studi `OPENING`

### Requirement: Positional study contracts are independent of the non-opening phase
Il sistema SHALL applicare i contratti dell'esperienza posizionale sia agli studi `MIDDLEGAME` sia
agli studi `ENDGAME`: metadati senza colore, azioni contestuali, setup FEN invariabile, analisi
inizialmente nascosta, eliminazione con ritorno allo studio padre, layout stabile e navigazione
compatta. Le azioni e i collegamenti SHALL usare le rotte canoniche della fase corrente e SHALL NOT
esporre import, training, review o statistiche nelle sezioni non `OPENING`.

#### Scenario: Reuse a positional component in the Endgame section
- **WHEN** un componente condiviso viene configurato con uno studio o una posizione `ENDGAME`
- **THEN** il sistema applica lo stesso contratto posizionale usando percorsi canonici `/endgame` e senza esporre comportamenti riservati alle Aperture
