## ADDED Requirements

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
Il sistema SHALL usare `startingFen` sull'elemento figlio come posizione iniziale tecnica sia per varianti di apertura sia per posizioni non di apertura.

#### Scenario: Opening variant has standard start
- **WHEN** viene creata una variante di apertura senza posizione iniziale custom
- **THEN** il suo `startingFen` e' la posizione iniziale standard degli scacchi

#### Scenario: Non-opening position uses stored start
- **WHEN** viene aperta una posizione di mediogioco o finale
- **THEN** lo stato della scacchiera deriva dallo `startingFen` di quella posizione

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
