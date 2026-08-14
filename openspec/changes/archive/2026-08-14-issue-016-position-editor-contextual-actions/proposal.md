## Why

La verifica visuale successiva a R26.1 ha mostrato che l'editor delle mosse posizionali conserva
breadcrumb e controlli pensati per la navigazione generale o per le Aperture. In modalità modifica
questi elementi competono con l'albero «Mosse & rami» e rendono ambiguo il contesto operativo.
Prima di attivare il Finale in R27 conviene chiudere questo blocco UX sul componente condiviso.

## What Changes

- mantenere il breadcrumb posizionale visibile ma non interattivo durante la modifica;
- rimuovere l'etichetta «MODIFICA POSIZIONE»;
- rimuovere il comando «Posizioni» dall'editor in modifica;
- rimuovere il pulsante «Motore» dall'editor posizionale e portare «Mosse & rami» nella stessa
  posizione gerarchica;
- rimuovere l'etichetta «posizione iniziale» sopra le azioni del tree;
- preservare integralmente Aperture, dettaglio posizione, salvataggio/annullamento, guard, replay,
  azioni sui nodi e responsive;
- rendere i cinque correttivi vincolanti anche per l'editor `ENDGAME` di R27.

Non sono previste nuove API, migration, modifiche al modello a fasi o cambiamenti al database.
La sezione `/endgame` resta sul segnaposto fino a R27.

## Capabilities

### New Capabilities

- Nessuna.

### Modified Capabilities

- `game-phase-study-model`: definisce il contratto di presentazione contestuale dell'editor per
  gli studi `MIDDLEGAME` e `ENDGAME`, separandolo dai flussi `OPENING`.

## Impact

Il delta atteso riguarda principalmente template, accessibilità, stile e test frontend di
`VariantEditor` e della navigazione contestuale. Il comportamento backend e il modello
`Study`/`Variant` restano invariati. La change deve essere verificata su H2 temporaneo e con una
regressione completa delle Aperture; nessun record o file del database condiviso entra nel gate.
