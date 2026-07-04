## Why

L'applicazione oggi modella e allena principalmente le aperture; per estenderla a Mediogioco e Finale serve prima una decisione di dominio esplicita, cosi' le nuove sezioni non crescono come modelli paralleli e incoerenti.
Questa change chiarisce il modello comune per fasi del gioco, studi, capitoli e posizioni prima di introdurre nuove tabelle, endpoint o UI definitive.

## What Changes

- Viene definito il perimetro funzionale delle tre fasi: Aperture, Mediogioco e Finale.
- Viene chiarito come rappresentare Mediogioco e Finale con un'organizzazione tipo studio -> capitoli/posizioni.
- Viene deciso se riusare/estendere le entita' esistenti `Study` e `Variant` oppure introdurre entita' dedicate per le sezioni posizionali.
- Vengono fissati i confini tra contenuti di apertura e contenuti posizionali: l'import Lichess resta legato alle Aperture, mentre Mediogioco e Finale usano posizioni create manualmente.
- Viene escluso, per Mediogioco e Finale, l'uso del training loop e della ripetizione SM-2: le posizioni si studiano e si giocano contro il motore.
- Vengono identificati gli impatti minimi su dati, API, frontend e slice OpenSpec successive.

## Capabilities

### New Capabilities

- `game-phase-study-model`: modello di dominio per organizzare contenuti scacchistici per fase del gioco, distinguendo Aperture, Mediogioco e Finale e chiarendo il rapporto tra studi, capitoli/varianti e posizioni.

### Modified Capabilities

- Nessuna capability esistente: `openspec/specs/` non contiene ancora spec stabili da modificare.

## Impact

- Dominio backend: decisione su riuso/estensione di `Study`/`Variant` o introduzione di entita' dedicate.
- Persistenza dati: possibili changeset Liquibase futuri per fase del gioco, posizione di partenza e relazioni tra studi e posizioni.
- API: separazione dei flussi Aperture rispetto ai futuri flussi Mediogioco/Finale.
- Frontend: base concettuale per navigazione a tre sezioni e viste dedicate a studi/posizioni.
- Funzionalita' correlate: import Lichess, training, statistiche e review devono restare applicati solo dove coerenti con la fase Aperture.
- Change successive: `issue-016-custom-starting-fen`, `issue-016-move-comments`, `issue-016-middlegame-section`, `issue-016-endgame-section` e `issue-016-play-position-vs-engine` dipendono dalla decisione prodotta qui.
