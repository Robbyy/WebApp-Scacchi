## ADDED Requirements

### Requirement: Non-opening positions are created with a visual starting-position editor
Il sistema SHALL offrire un editor visuale per creare e modificare una posizione appartenente a uno studio `MIDDLEGAME` o `ENDGAME`. L'editor SHALL consentire di piazzare e rimuovere pezzi, impostare il lato al tratto, configurare i diritti d'arrocco e configurare una casa en-passant. Il flusso SHALL associare la posizione allo studio da cui è avviato.

#### Scenario: Create a middlegame position from its study
- **WHEN** l'utente avvia la creazione di una posizione dal dettaglio di uno studio `MIDDLEGAME`
- **THEN** il sistema mostra l'editor visuale e salva la posizione con l'identificativo di quello studio

#### Scenario: Configure all FEN-relevant state visually
- **WHEN** l'utente configura una posizione nell'editor
- **THEN** il sistema consente di definire disposizione dei pezzi, lato al tratto, diritti d'arrocco e casa en-passant senza richiedere l'inserimento testuale della FEN

#### Scenario: Opening study keeps its variant flow
- **WHEN** l'utente visualizza uno studio `OPENING`
- **THEN** il sistema conserva il flusso di creazione della variante di Apertura e non espone l'editor di posizione custom

### Requirement: The editor generates and persists a canonical starting FEN
Il sistema SHALL generare dalla configurazione visuale una FEN canonica e persistirla come `startingFen` della posizione. La FEN SHALL includere disposizione dei pezzi, lato al tratto, diritti d'arrocco e casa en-passant; i contatori iniziali SHALL essere `0 1`. La posizione SHALL conservare il titolo obbligatorio e il proprio `studyId`.

#### Scenario: Save a position without moves
- **WHEN** l'utente fornisce un titolo e una posizione iniziale valida ma non aggiunge mosse
- **THEN** il sistema salva la posizione con `moves` e `tree` vuoti e con la FEN configurata come `startingFen`

#### Scenario: Save a position with a move tree
- **WHEN** l'utente salva una posizione valida che contiene un albero di mosse
- **THEN** il sistema persiste il titolo, lo studio padre, la FEN iniziale e l'intero albero delle mosse

#### Scenario: Derive technical color from the side to move
- **WHEN** il sistema salva una posizione non di apertura con una FEN valida
- **THEN** il campo tecnico `color` è derivato dal lato al tratto della FEN e non richiede una scelta di lato da allenare

### Requirement: The configured starting position is legally usable
Il sistema SHALL rifiutare il salvataggio di una posizione la cui FEN non rappresenti una posizione iniziale legalmente utilizzabile. La validazione backend SHALL essere autorevole e SHALL verificare almeno la sintassi e il caricamento della FEN, l'esistenza di un solo re per colore, l'assenza di pedoni sulla prima o ottava traversa, la non adiacenza dei re, la coerenza dei diritti d'arrocco, la coerenza della casa en-passant e che il lato che ha appena mosso non abbia lasciato il proprio re sotto scacco.

#### Scenario: Reject malformed or structurally illegal position
- **WHEN** l'utente tenta di salvare una configurazione con FEN malformata, re mancanti o multipli, pedoni sulla prima o ottava traversa oppure re adiacenti
- **THEN** il backend rifiuta la richiesta e non persiste alcuna posizione

#### Scenario: Reject incoherent castling rights
- **WHEN** l'utente configura un diritto d'arrocco ma re o torre corrispondenti non sono sulle rispettive case iniziali
- **THEN** il backend rifiuta la richiesta e indica che i diritti d'arrocco non sono coerenti con la disposizione dei pezzi

#### Scenario: Accept coherent initial en-passant right
- **WHEN** l'utente configura una casa en-passant coerente con un doppio passo immediatamente precedente, il lato al tratto e i pedoni interessati
- **THEN** il sistema salva la FEN con quel diritto en-passant e la prima mossa dell'albero può usarlo legalmente

#### Scenario: Reject incoherent en-passant right
- **WHEN** l'utente configura una casa en-passant che non può derivare dal doppio passo immediatamente precedente di un pedone
- **THEN** il backend rifiuta la richiesta e non persiste alcuna posizione

### Requirement: Position move trees are validated from the effective starting FEN
Il sistema SHALL validare ogni mossa SAN dell'albero di una posizione `MIDDLEGAME` o `ENDGAME` a partire dalla sua `startingFen` effettiva e SHALL validare ricorsivamente ogni ramo dalla posizione del proprio nodo padre. Un albero vuoto SHALL essere valido per una posizione non di apertura.

#### Scenario: Accept a legal continuation from custom FEN
- **WHEN** una posizione ha una FEN iniziale custom e tutte le mosse del suo albero sono legali da quella FEN
- **THEN** il sistema salva la posizione e il suo albero

#### Scenario: Reject a move incompatible with custom FEN
- **WHEN** una mossa dell'albero non è legale dalla FEN iniziale custom o dalla posizione del proprio nodo padre
- **THEN** il backend rifiuta l'intera richiesta senza persistere modifiche parziali

#### Scenario: Revalidate tree after changing the starting FEN
- **WHEN** l'utente modifica la FEN iniziale di una posizione esistente che contiene mosse
- **THEN** il backend rivalida l'intero albero rispetto alla nuova FEN e rifiuta l'aggiornamento se una mossa non è compatibile

### Requirement: Custom starting FEN is restricted to non-opening studies
Il sistema SHALL accettare una FEN iniziale custom solo per una posizione collegata a uno studio `MIDDLEGAME` o `ENDGAME`. Gli endpoint e i flussi di Apertura SHALL continuare a usare la posizione iniziale standard; una richiesta che tenta di impostare una FEN custom per uno studio `OPENING` o per una variante legacy senza studio SHALL essere rifiutata.

#### Scenario: Opening variant keeps standard start
- **WHEN** viene creata o aggiornata una variante in uno studio `OPENING`
- **THEN** il sistema conserva la FEN iniziale standard degli scacchi come `startingFen`

#### Scenario: Reject custom FEN outside a non-opening study
- **WHEN** una richiesta per una variante di Apertura o legacy contiene una FEN diversa dalla posizione iniziale standard
- **THEN** il backend rifiuta la richiesta senza modificare o creare la variante
