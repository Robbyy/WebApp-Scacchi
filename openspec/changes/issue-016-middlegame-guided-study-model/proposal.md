## Why

La sezione Mediogioco conserva già posizioni, FEN e analisi dell'autore, ma non distingue studi
tattici e strategici e non possiede metadati didattici, ordine esplicito o uno storico minimo dei
tentativi. R26.3 deve introdurre prima una base dati e API coerente, migrabile e compatibile con il
repertorio esistente, così che i successivi flussi guidati non affidino regole di dominio al solo
client.

## What Changes

- aggiungere agli studi `MIDDLEGAME` la tipologia `TACTICAL`/`STRATEGIC`, obbligatoria per i nuovi
  studi e valorizzabile una sola volta per gli studi esistenti «Da classificare»;
- introdurre un catalogo persistente di temi tattici e strategici con ID/codici stabili, seed
  Liquibase e riferimenti delle posizioni tramite `themeId`, senza copiare la label;
- aggiungere alle posizioni descrizione del tema, descrizione della posizione, difficoltà a cinque
  livelli, fonte e ordine esplicito nello studio;
- preservare le posizioni esistenti come «Tema da assegnare», assegnando automaticamente l'ordine
  corrente per ID e mantenendo view/edit, ma escludendole dallo studio guidato finché incomplete;
- introdurre eventi `PositionAttempt` con posizione, istante server ed esito, riepiloghi derivati e
  cancellazione a cascata;
- rendere il backend autorevole sull'esito tattico ricevendo le mosse solo per la validazione e
  senza persisterle nello storico;
- aggiungere API di lettura temi, storico/riepiloghi e riordino transazionale;
- mantenere invariati Aperture, Finale, training, review, statistiche e database condiviso durante
  le verifiche.

La change modifica in modo osservabile il contratto di creazione degli studi/posizioni Mediogioco
e l'ordinamento delle posizioni, ma mantiene leggibili e modificabili i dati legacy.

## Capabilities

### New Capabilities

- `middlegame-guided-study-model`: definisce tipologia degli studi Mediogioco, catalogo temi,
  metadati/ordine delle posizioni, compatibilità legacy, storico minimo e validazione backend dei
  tentativi tattici.

### Modified Capabilities

- Nessuna. I contratti R26/R26.1/R26.2 restano validi; la nuova capability aggiunge regole
  specifiche dello studio guidato senza modificare il dettaglio posizionale esistente.

## Impact

- **Backend:** `Study`, `Variant`, DTO/request, service/repository/controller; nuove entità tema e
  tentativo; validazione della mainline tattica; riordino atomico.
- **Database:** nuovi changeset Liquibase portabili H2/PostgreSQL, seed temi, backfill ordine e FK
  reali per tema/tentativi.
- **Frontend:** modelli/API client e UI minima di classificazione, metadati, stato legacy, ordine e
  riepilogo; nessun flusso di esercizio in questa change.
- **Test:** migrazioni, backend/API, compatibilità legacy, regressioni Aperture/Finale e gate su H2
  temporaneo.
- **Dipendenza:** abilita `issue-016-middlegame-guided-study-flows`; entrambe formano R26.3.
