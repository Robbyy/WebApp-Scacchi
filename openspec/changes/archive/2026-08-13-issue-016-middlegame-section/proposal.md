## Why

Mediogioco e Finale dispongono gia' del modello a fasi e dell'editor di posizione iniziale, ma la route `/middlegame` mostra ancora un segnaposto e non consente di usare i dati `MIDDLEGAME` gia' supportati dal dominio. R26 trasforma Mediogioco nella prima sezione posizionale utilizzabile, riusando le basi consolidate in R25 prima di estendere lo stesso paradigma al Finale.

## What Changes

- Sostituire il segnaposto di `/middlegame` con la lista degli studi della sola fase `MIDDLEGAME` e il relativo flusso di creazione manuale dello studio.
- Rendere navigabile il dettaglio di uno studio di Mediogioco, con il suo elenco di posizioni e l'azione per creare una nuova posizione nello studio.
- Rendere disponibile il dettaglio in sola consultazione di una posizione di Mediogioco, riusando il modello comune `Variant`, la posizione iniziale `startingFen`, l'albero mosse e le annotazioni gia' stabilizzati.
- Riutilizzare l'editor visuale/FEN esistente per creare e modificare le posizioni, senza ridefinire il modello a fasi o le regole di validazione della FEN e dell'albero.
- Mantenere esplicitamente fuori scope import e sync Lichess, training, review SM-2, statistiche, sezione Finale e gioco contro Stockfish dalla posizione.

## Capabilities

### New Capabilities

- `middlegame-study-section`: consultazione e gestione manuale degli studi `MIDDLEGAME` e delle loro posizioni, dalla lista al dettaglio della posizione.

### Modified Capabilities

Nessuna.

## Impact

- Frontend: route e segnaposto di Mediogioco, viste di lista e dettaglio, terminologia e navigazione sensibili alla fase, con riuso di studi, posizioni e editor esistenti.
- API e dati: lettura e creazione circoscritte agli studi `MIDDLEGAME` e alle relative posizioni; il modello `Study.phase`, `Variant`, `startingFen` e l'albero mosse restano invariati.
- Requisiti esistenti: la capability applica, senza modificarli, `game-phase-study-model` e `custom-starting-fen`.
