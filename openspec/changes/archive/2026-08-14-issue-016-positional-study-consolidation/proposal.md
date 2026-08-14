## Why

R26 ha reso utilizzabile il Mediogioco, ma la verifica sul prodotto reale ha evidenziato
incoerenze nei form, nelle azioni e nella geometria condivisa di dettaglio ed editor. Prima
di riusare gli stessi componenti per il Finale occorre consolidare l'esperienza posizionale e
trattare l'albero salvato come analisi di studio inizialmente nascosta.

## What Changes

- Eliminare le CTA duplicate o non pertinenti e non mostrare il colore nei form degli studi
  posizionali, preservando i metadati e i flussi delle Aperture.
- Consentire l'eliminazione di una posizione dal proprio dettaglio, con conferma e ritorno allo
  studio contenitore dopo il successo.
- Rendere stabile la griglia dell'editor FEN: i pezzi non modificano dimensioni o bordi delle
  caselle.
- Stabilizzare la geometria della scacchiera fra dettaglio, motore acceso ed editor delle mosse;
  nei layout desktop i controlli operativi dell'editor vivono nel pannello destro e non sotto la
  board.
- Rendere più compatta la navigazione delle posizioni mostrando soltanto il titolo, senza il
  conteggio mosse, sia nel rail sia nel drawer.
- Aprire le posizioni non `OPENING` con l'analisi salvata nascosta e rivelarla integralmente solo
  tramite un'azione esplicita; il cambio posizione e il reload ripristinano lo stato nascosto.
- Mantenere `/endgame` sul segnaposto: R26.1 consolida i contratti condivisi, mentre R27 attiverà
  e verificherà la sezione Finale.
- Rendere i dieci correttivi R26.1 un input vincolante per R27: il riuso dei componenti comuni
  riduce l'implementazione attesa, ma la change Finale dovrà dimostrare ogni comportamento con
  dati `ENDGAME`, rotte `/endgame` e regressioni Aperture/Mediogioco prima di poter essere chiusa.
- Mantenere la home Aperture isolata per fase: ora che esistono studi posizionali, `/` deve
  richiedere esplicitamente gli studi `OPENING` e non presentare studi `MIDDLEGAME`/`ENDGAME`.
- Non introdurre training posizionale, suggerimenti progressivi, autoverifica, statistiche,
  review/SM-2, nuove API o modifiche alla persistenza.

## Capabilities

### New Capabilities

- Nessuna.

### Modified Capabilities

- `middlegame-study-section`: corregge lista, form e azioni degli studi/posizioni e modifica il
  dettaglio Mediogioco affinché l'analisi sia nascosta inizialmente e il layout resti stabile.
- `custom-starting-fen`: aggiunge il requisito visuale di una griglia 8×8 invariabile durante il
  posizionamento dei pezzi.
- `game-phase-study-model`: definisce per tutte le posizioni non `OPENING` la modalità studio con
  analisi inizialmente nascosta, senza estendere training, review o statistiche.

## Impact

L'impatto è principalmente frontend e riguarda i componenti condivisi di lista/creazione/dettaglio
studio, editor FEN, dettaglio posizione, editor dell'albero, navigazione fra elementi e relativi CSS
e test. I contratti HTTP e il modello `Study`/`Variant` restano invariati; l'eliminazione riusa
`DELETE /api/variants/{id}`. Sono richieste regressioni automatiche di Aperture e verifiche browser
responsive/geometriche, usando un database H2 temporaneo e lasciando invariato quello condiviso.
La futura change R27 dovrà riportare nei propri artefatti una matrice di accettazione dei correttivi
R26.1: nessun requisito potrà essere considerato soddisfatto per il solo fatto che la classe
frontend o il contratto backend siano condivisi.
