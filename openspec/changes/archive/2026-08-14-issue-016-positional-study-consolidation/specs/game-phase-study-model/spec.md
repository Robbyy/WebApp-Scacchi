## ADDED Requirements

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
