## Why

Le posizioni di Mediogioco e Finale dispongono già di `startingFen` come base tecnica, ma oggi non esiste un flusso utente per costruire, validare e salvare una posizione iniziale personalizzata. Di conseguenza non è possibile creare in modo affidabile studi che inizino da una posizione concreta diversa da quella standard.

## What Changes

- Introdurre un editor visuale per configurare la posizione iniziale di una posizione appartenente a uno studio `MIDDLEGAME` o `ENDGAME`.
- Validare che la posizione configurata sia legalmente utilizzabile prima del salvataggio.
- Generare la FEN dalla configurazione approvata e salvarla come `startingFen` della posizione.
- Usare la FEN persistita come stato iniziale autorevole per la validazione backend delle mosse della posizione.
- Rifiutare la creazione o l’aggiornamento di posizioni non valide, comprese mosse incompatibili con la relativa FEN iniziale.
- Mantenere invariato il comportamento delle varianti di Apertura: posizione standard, import/sync Lichess e flussi di training/review.
- Conservare la compatibilità dei dati esistenti: le posizioni già salvate continuano a usare il proprio `startingFen`.

## Capabilities

### New Capabilities

- `custom-starting-fen`: consente di configurare visualmente, validare, generare e salvare la FEN iniziale delle posizioni di Mediogioco e Finale; assicura inoltre che le mosse siano validate rispetto a quella posizione iniziale.

### Modified Capabilities

- `game-phase-study-model`: estende la gestione di `startingFen` affinché le posizioni di Mediogioco e Finale possano avere una FEN iniziale custom validata, mentre le Aperture continuano a usare esclusivamente la posizione standard.

## Impact

- Interfaccia di creazione e modifica delle posizioni di Mediogioco e Finale.
- Componenti della scacchiera, modello `Variant`, payload e contratti delle API coinvolte.
- Persistenza e validazione backend della posizione iniziale e dell’albero delle mosse.
- Test frontend e backend relativi a legalità della posizione, FEN e mosse.
- Nessuna modifica funzionale ai flussi delle Aperture, né reinterpretazione dei dati già esistenti.
