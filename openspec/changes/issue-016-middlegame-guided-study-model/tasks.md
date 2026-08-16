## 1. Schema e migrazione

- [ ] 1.1 Registrare nel changelog master i changeset `0004-study-type`, `0005-position-theme`,
  `0006-position-metadata` e `0007-position-attempt` nell'ordine definito dal design.
- [ ] 1.2 Aggiungere `study.study_type` nullable senza valorizzare automaticamente studi esistenti,
  verificando database vuoto e schema già popolato.
- [ ] 1.3 Creare `position_theme` con vincoli, indici e seed espliciti 1001–1014/2001–2013,
  inclusa la label «case deboli e case forti».
- [ ] 1.4 Aggiungere a `variant` le sei colonne dei metadati, la FK tema e il vincolo dell'ordine,
  mantenendo valide Aperture, Finale e righe legacy.
- [ ] 1.5 Implementare il backfill `position_order` per le sole posizioni `MIDDLEGAME` in ordine
  `study_id, id`, con numerazione contigua per studio e SQL compatibile H2/PostgreSQL.
- [ ] 1.6 Creare `position_attempt`, indice storico e FK reale `ON DELETE CASCADE` verso `variant`.
- [ ] 1.7 Aggiungere test di migrazione su H2 temporaneo per database vuoto, dati Mediogioco legacy,
  seed, backfill, vincoli e rollback/fallimento atomico pertinenti.

## 2. Tipologia degli studi e catalogo temi

- [ ] 2.1 Estendere entità, enum, DTO e request di `Study` con `studyType`, mantenendo compatibili i
  chiamanti Aperture che non inviano il campo.
- [ ] 2.2 Applicare in `StudyService` le regole per nuovi studi Mediogioco, transizione legacy una
  tantum, immutabilità successiva e rifiuto del tipo su `OPENING`/`ENDGAME`.
- [ ] 2.3 Bloccare backend e UI di creazione posizione finché uno studio Mediogioco è «Da
  classificare», conservandone view/edit ed eliminazione.
- [ ] 2.4 Implementare entità/repository/service del catalogo temi e la lettura filtrata/ordinata
  `GET /api/position-themes?studyType=...` senza endpoint di gestione.
- [ ] 2.5 Verificare lato backend esistenza, stato attivo e compatibilità del tema con lo
  `studyType` persistito, senza fidarsi del tipo inviato dal client.
- [ ] 2.6 Aggiungere test controller/service per creazione tattica/strategica, studio vuoto, legacy,
  immutabilità, fasi escluse, seed/ordine temi e tema incompatibile.

## 3. Metadati e ordine delle posizioni

- [ ] 3.1 Estendere `Variant`, DTO/request e mapping con `themeId`, dati tema leggibili,
  `themeDescription`, `description`, `difficulty`, `source` e `positionOrder`.
- [ ] 3.2 Applicare l'obbligo di tema e ordine alle nuove posizioni Mediogioco, mantenendo nullable i
  campi per Aperture, Finale e posizioni legacy.
- [ ] 3.3 Rappresentare «Tema da assegnare» ed eleggibilità guidata derivata senza aggiungere una
  colonna di stato, preservando view/edit di FEN, albero e altri metadati legacy.
- [ ] 3.4 Implementare creazione/inserimento, eliminazione con compattazione e lettura per
  `positionOrder`, sostituendo l'ordinamento per ID soltanto nel contesto Mediogioco.
- [ ] 3.5 Implementare `PUT /api/studies/{id}/variants/order` con payload completo, validazione di
  appartenenza/duplicati/completezza e aggiornamento a due fasi nella stessa transazione.
- [ ] 3.6 Aggiungere test backend per round-trip metadati, cinque difficoltà, cambio tema compatibile,
  posizione senza tema, backfill/ordine, inserimento, eliminazione e rollback di riordino invalido.

## 4. Storico e validazione dei tentativi

- [ ] 4.1 Implementare `PositionAttempt`, enum `AttemptOutcome`, repository e mapping DTO con
  istante server e senza mosse/versioni/sessioni persistite.
- [ ] 4.2 Implementare `POST /api/variants/{id}/attempts` discriminando il payload tramite lo
  `studyType` persistito e rifiutando fase, bozza, tema o classificazione non validi.
- [ ] 4.3 Implementare la validazione tattica di `userMoves` SAN dalla `startingFen`, applicando le
  risposte avversarie della mainline e derivando solo `UNDERSTOOD` o `FAILED`.
- [ ] 4.4 Implementare la registrazione strategica dei soli esiti `UNDERSTOOD` e
  `NOT_UNDERSTOOD`, rifiutando `FAILED`, mosse e payload misti.
- [ ] 4.5 Implementare `GET /api/variants/{id}/attempts` ordinato per istante/ID e
  `GET /api/studies/{id}/attempts/summary` con ultimo esito, conteggio e ultima comprensione.
- [ ] 4.6 Verificare la cascade su eliminazione posizione/studio e l'assenza di endpoint per
  modificare o eliminare il singolo tentativo.
- [ ] 4.7 Aggiungere test per successo/deviazione/prefisso incompleto/SAN illegale tattici, esiti
  strategici, eventi multipli, tie-break dell'ultimo evento, aggregati, cascade e storico preservato
  dopo modifica FEN/mainline.

## 5. UI di classificazione, metadati e riepilogo

- [ ] 5.1 Estendere i modelli e service Angular con tipo studio, catalogo temi, metadati posizione,
  ordine, tentativi e riepiloghi, mantenendo opzionali i campi fuori Mediogioco.
- [ ] 5.2 Aggiornare creazione/dettaglio studio Mediogioco per scelta obbligatoria del tipo, label
  «Da classificare», classificazione una tantum e numero totale di posizioni senza percentuali.
- [ ] 5.3 Aggiornare creazione/modifica posizione con selezione tema per ID filtrata sul tipo,
  descrizioni, difficoltà, fonte e ordine predefinito a fine lista.
- [ ] 5.4 Mostrare «Tema da assegnare» sulle posizioni legacy e disabilitare soltanto le azioni
  guidate, senza bloccare consultazione, setup FEN o editor albero.
- [ ] 5.5 Implementare riordino numerico e drag-and-drop usando il contratto atomico e ripristinando
  l'ordine precedente se l'API fallisce.
- [ ] 5.6 Mostrare nel dettaglio/riepilogo della posizione ultimo esito, numero tentativi e data
  dell'ultima comprensione senza mostrare percentuali o conteggio errori aggiuntivo.
- [ ] 5.7 Aggiungere test frontend per classificazione, campi contestuali, temi per ID, difficoltà,
  legacy, ordine/rollback, riepilogo e regressioni Aperture/Finale.

## 6. Gate della change modello

- [ ] 6.1 Eseguire suite backend completa e suite frontend completa, correggendo ogni regressione
  in scope e registrando i conteggi reali senza anticipare quelli futuri.
- [ ] 6.2 Eseguire build Angular e verificare che i warning già noti restino non bloccanti e che non
  compaiano nuovi errori.
- [ ] 6.3 Verificare su H2 temporaneo i flussi E2E 68–71: classificazione legacy, studi nuovi,
  catalogo/metadati e migrazione/ordine delle posizioni legacy.
- [ ] 6.4 Controllare prima e dopo i gate che `backend/data/scacchi.mv.db` non sia stato modificato,
  ripristinato o incluso e che tutti i dati di prova vivano fuori dal database condiviso.
- [ ] 6.5 Aggiornare stato, piano, backlog, roadmap, checklist e README con la change A completata ma
  R26.3 ancora in corso; non dichiarare rilasciato il prodotto prima della change B.
- [ ] 6.6 Eseguire `openspec validate issue-016-middlegame-guided-study-model --type change --strict`,
  verifica semantica e review; archiviare senza `--skip-specs` soltanto dopo tutti i gate.
- [ ] 6.7 Confermare che la spec canonica risultante e le API implementate siano la baseline della
  change `issue-016-middlegame-guided-study-flows` prima di iniziarne i task.
