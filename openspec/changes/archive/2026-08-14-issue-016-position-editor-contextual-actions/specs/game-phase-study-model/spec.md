## ADDED Requirements

### Requirement: Positional move editor uses contextual edit mode
Il sistema SHALL presentare l'editor delle mosse in modo contestuale per le posizioni appartenenti
a studi `MIDDLEGAME` o `ENDGAME`. In modalità modifica il breadcrumb SHALL restare visibile come
orientamento ma SHALL NOT contenere link attivi; il kicker «MODIFICA POSIZIONE», il comando
«Posizioni», il pulsante «Motore» e la label «posizione iniziale» SHALL NOT essere renderizzati.
La sezione «Mosse & rami» SHALL occupare la posizione gerarchica del controllo Motore e SHALL
restare il primo blocco operativo dopo il nome. Salvataggio, annullamento, guard, replay e azioni
sui nodi SHALL restare disponibili secondo i contratti esistenti.

#### Scenario: Positional editor keeps a non-interactive breadcrumb
- **WHEN** l'utente apre l'editor di una posizione `MIDDLEGAME` o `ENDGAME`
- **THEN** il breadcrumb mostra il percorso corrente come testo non focalizzabile e senza
  navigazione attiva, con la pagina corrente identificabile semanticamente

#### Scenario: Positional editor hides redundant navigation and labels
- **WHEN** l'utente consulta il pannello dell'editor posizionale in modalità modifica
- **THEN** non compaiono «MODIFICA POSIZIONE», «Posizioni» o «posizione iniziale» e il flusso di
  modifica non offre un comando equivalente duplicato per la navigazione tra posizioni

#### Scenario: Move tree replaces the engine control in positional editing
- **WHEN** l'utente apre l'editor delle mosse di una posizione di studio
- **THEN** il pulsante «Motore» non viene renderizzato nell'editor e «Mosse & rami» compare nella
  sua posizione gerarchica, prima dei controlli di replay e delle azioni sui nodi

#### Scenario: Opening editor remains unchanged
- **WHEN** l'utente apre l'editor di una variante `OPENING`
- **THEN** breadcrumb, navigazione, kicker, motore, struttura del tree e label mantengono il
  comportamento precedente a R26.2

#### Scenario: Positional editor retains editing operations
- **WHEN** l'utente modifica una posizione e usa Salva, Annulla, replay o un'azione del tree
- **THEN** guard, validazione, persistenza dell'albero, ritorni canonici e layout responsive
  restano invariati rispetto ai contratti R25/R26.1
