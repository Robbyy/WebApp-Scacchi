## MODIFIED Requirements

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
