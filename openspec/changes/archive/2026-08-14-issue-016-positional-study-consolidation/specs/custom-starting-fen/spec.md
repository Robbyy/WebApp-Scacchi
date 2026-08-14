## ADDED Requirements

### Requirement: The visual setup board keeps invariant square geometry
Il sistema SHALL renderizzare l'editor visuale della posizione iniziale come una griglia esattamente
8×8 le cui caselle mantengono dimensioni e bordi invariati quando un pezzo viene inserito, sostituito
o rimosso. Ogni immagine di pezzo SHALL essere contenuta nella propria casella senza influenzare i
track della griglia.

#### Scenario: Place pieces with different SVG bounds
- **WHEN** l'utente colloca nell'editor FEN pezzi con ingombri SVG differenti
- **THEN** tutte le 64 caselle conservano la stessa larghezza e altezza e nessun bordo viene spostato

#### Scenario: Clear and restore the setup board
- **WHEN** l'utente svuota la scacchiera o ripristina la posizione standard
- **THEN** il rettangolo e i track della griglia restano invariati rispetto allo stato precedente

#### Scenario: Use the setup board on a narrow viewport
- **WHEN** l'editor FEN è aperto a 375 o 320 pixel di larghezza
- **THEN** pezzi e caselle restano contenuti senza produrre overflow orizzontale

#### Scenario: Use the setup board in either positional phase
- **WHEN** l'editor FEN condiviso viene aperto per una posizione `MIDDLEGAME` o `ENDGAME`
- **THEN** applica la stessa geometria 8×8 invariabile senza dipendere dalla fase dello studio
