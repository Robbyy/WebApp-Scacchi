## 1. Schema e migrazione

- [x] 1.1 Registrare nel changelog master i changeset `0004-study-type`, `0005-position-theme`,
  `0006-position-metadata` e `0007-position-attempt` nell'ordine definito dal design.
- [x] 1.2 Aggiungere `study.study_type` nullable senza valorizzare automaticamente studi esistenti,
  verificando database vuoto e schema già popolato.
- [x] 1.3 Creare `position_theme` con vincoli, indici e seed espliciti 1001–1014/2001–2013,
  inclusa la label «case deboli e case forti».
- [x] 1.4 Aggiungere a `variant` le sei colonne dei metadati, la FK tema e il vincolo dell'ordine,
  mantenendo valide Aperture, Finale e righe legacy.
- [x] 1.5 Implementare il backfill `position_order` per le sole posizioni `MIDDLEGAME` in ordine
  `study_id, id`, con numerazione contigua per studio e SQL compatibile H2/PostgreSQL.
- [x] 1.6 Creare `position_attempt`, indice storico e FK reale `ON DELETE CASCADE` verso `variant`.
- [x] 1.7 Aggiungere test di migrazione su H2 temporaneo per database vuoto, dati Mediogioco legacy,
  seed, backfill, vincoli e rollback/fallimento atomico pertinenti.

## 2. Tipologia degli studi e catalogo temi

- [x] 2.1 Estendere entità, enum, DTO e request di `Study` con `studyType`, mantenendo compatibili i
  chiamanti Aperture che non inviano il campo.
- [x] 2.2 Applicare in `StudyService` le regole per nuovi studi Mediogioco, transizione legacy una
  tantum, immutabilità successiva e rifiuto del tipo su `OPENING`/`ENDGAME`.
- [x] 2.3 Bloccare backend e UI di creazione posizione finché uno studio Mediogioco è «Da
  classificare», conservandone view/edit ed eliminazione. Blocco backend in
  `StudyService.createVariant`; blocco UI in A5 (task 5.2/5.3): CTA «Nuova posizione» nascosta
  in `StudyDetail` e `PositionEditor` che rifiuta la creazione mostrando il messaggio di
  classificazione, mantenendo consultazione/modifica/eliminazione delle posizioni esistenti.
- [x] 2.4 Implementare entità/repository/service del catalogo temi e la lettura filtrata/ordinata
  `GET /api/position-themes?studyType=...` senza endpoint di gestione.
- [x] 2.5 Verificare lato backend esistenza, stato attivo e compatibilità del tema con lo
  `studyType` persistito, senza fidarsi del tipo inviato dal client.
- [x] 2.6 Aggiungere test controller/service per creazione tattica/strategica, studio vuoto, legacy,
  immutabilità, fasi escluse, seed/ordine temi e tema incompatibile.

## 3. Metadati e ordine delle posizioni

- [x] 3.1 Estendere `Variant`, DTO/request e mapping con `themeId`, dati tema leggibili,
  `themeDescription`, `description`, `difficulty`, `source` e `positionOrder`.
- [x] 3.2 Applicare l'obbligo di tema e ordine alle nuove posizioni Mediogioco, mantenendo nullable i
  campi per Aperture, Finale e posizioni legacy.
- [x] 3.3 Rappresentare «Tema da assegnare» ed eleggibilità guidata derivata senza aggiungere una
  colonna di stato, preservando view/edit di FEN, albero e altri metadati legacy.
- [x] 3.4 Implementare creazione/inserimento, eliminazione con compattazione e lettura per
  `positionOrder`, sostituendo l'ordinamento per ID soltanto nel contesto Mediogioco.
- [x] 3.5 Implementare `PUT /api/studies/{id}/variants/order` con payload completo, validazione di
  appartenenza/duplicati/completezza e aggiornamento a due fasi nella stessa transazione.
- [x] 3.6 Aggiungere test backend per round-trip metadati, cinque difficoltà, cambio tema compatibile,
  posizione senza tema, backfill/ordine, inserimento, eliminazione e rollback di riordino invalido.

## 4. Storico e validazione dei tentativi

- [x] 4.1 Implementare `PositionAttempt`, enum `AttemptOutcome`, repository e mapping DTO con
  istante server e senza mosse/versioni/sessioni persistite.
- [x] 4.2 Implementare `POST /api/variants/{id}/attempts` discriminando il payload tramite lo
  `studyType` persistito e rifiutando fase, bozza, tema o classificazione non validi.
- [x] 4.3 Implementare la validazione tattica di `userMoves` SAN dalla `startingFen`, applicando le
  risposte avversarie della mainline e derivando solo `UNDERSTOOD` o `FAILED`.
- [x] 4.4 Implementare la registrazione strategica dei soli esiti `UNDERSTOOD` e
  `NOT_UNDERSTOOD`, rifiutando `FAILED`, mosse e payload misti.
- [x] 4.5 Implementare `GET /api/variants/{id}/attempts` ordinato per istante/ID e
  `GET /api/studies/{id}/attempts/summary` con ultimo esito, conteggio e ultima comprensione.
- [x] 4.6 Verificare la cascade su eliminazione posizione/studio e l'assenza di endpoint per
  modificare o eliminare il singolo tentativo.
- [x] 4.7 Aggiungere test per successo/deviazione/prefisso incompleto/SAN illegale tattici, esiti
  strategici, eventi multipli, tie-break dell'ultimo evento, aggregati, cascade e storico preservato
  dopo modifica FEN/mainline.

## 5. UI di classificazione, metadati e riepilogo

- [x] 5.1 Estendere i modelli e service Angular con tipo studio, catalogo temi, metadati posizione,
  ordine, tentativi e riepiloghi, mantenendo opzionali i campi fuori Mediogioco.
- [x] 5.2 Aggiornare creazione/dettaglio studio Mediogioco per scelta obbligatoria del tipo, label
  «Da classificare», classificazione una tantum e numero totale di posizioni senza percentuali.
- [x] 5.3 Aggiornare creazione/modifica posizione con selezione tema per ID filtrata sul tipo,
  descrizioni, difficoltà, fonte e ordine predefinito a fine lista.
- [x] 5.4 Mostrare «Tema da assegnare» sulle posizioni legacy e disabilitare soltanto le azioni
  guidate, senza bloccare consultazione, setup FEN o editor albero.
- [x] 5.5 Implementare riordino numerico e drag-and-drop usando il contratto atomico e ripristinando
  l'ordine precedente se l'API fallisce.
- [x] 5.6 Mostrare nel dettaglio/riepilogo della posizione ultimo esito, numero tentativi e data
  dell'ultima comprensione senza mostrare percentuali o conteggio errori aggiuntivo.
- [x] 5.7 Aggiungere test frontend per classificazione, campi contestuali, temi per ID, difficoltà,
  legacy, ordine/rollback, riepilogo e regressioni Aperture/Finale.

## 6. Gate della change modello

- [x] 6.1 Eseguire suite backend completa e suite frontend completa, correggendo ogni regressione
  in scope e registrando i conteggi reali senza anticipare quelli futuri. **191 test backend**
  (`mvnw.cmd test`, in-memory H2 isolato) e **503 test frontend** (`npm test -- --watch=false`),
  tutti verdi il 2026-08-17; nessuna regressione da correggere.
- [x] 6.2 Eseguire build Angular e verificare che i warning già noti restino non bloccanti e che non
  compaiano nuovi errori. `npm run build` completata senza errori; unico warning nuovo
  (`study-new.css`, +95 byte) eliminato consolidando `.field`/`.field-input` e i chip
  tema/difficoltà in `styles.css` invece di duplicarli per pagina. I warning residui
  (bundle iniziale, `chessboard.css`, `variant-editor.css`, `study-detail.css`,
  `variant-detail.css`) erano già presenti prima della change (confermato con una build sullo
  stash pre-change) e restano non bloccanti.
- [x] 6.3 Verificare su H2 temporaneo i flussi E2E 68–71: classificazione legacy, studi nuovi,
  catalogo/metadati e migrazione/ordine delle posizioni legacy. Verificati il 2026-08-17 su un
  file H2 temporaneo separato (studio legacy `study_type` nullo inserito via SQL diretto per
  riprodurre lo stato post-backfill); dettagli in `docs/checklist-e2e.md`.
- [x] 6.4 Controllare prima e dopo i gate che `backend/data/scacchi.mv.db` non sia stato modificato,
  ripristinato o incluso e che tutti i dati di prova vivano fuori dal database condiviso. Hash
  SHA-256 `4117D9D8E773D9D871C14775842DF835F62AD60FDA4A7985DE154F20A59C19FF` (155648 byte,
  timestamp 2026-08-16 06:15) invariato prima e dopo l'intero gate; `git status` non segnala
  differenze su `backend/data/`.
- [x] 6.5 Aggiornare stato, piano, backlog, roadmap, checklist e README con la change A completata ma
  R26.3 ancora in corso; non dichiarare rilasciato il prodotto prima della change B. Aggiornati
  `docs/stato-corrente.md`, `docs/piano-rilasci-evolutivi.md`, `docs/backlog.md`,
  `docs/roadmap.md`, `docs/checklist-e2e.md` e `README.md`.
- [x] 6.6 Eseguire `openspec validate issue-016-middlegame-guided-study-model --type change --strict`,
  verifica semantica e review; archiviare senza `--skip-specs` soltanto dopo tutti i gate.
  Validazione positiva (anche `openspec validate --all --strict`: 5/5). Verifica semantica
  addizionale via chiamate dirette all'API sul backend temporaneo: rifiuto del tentativo su una
  bozza, esito tattico `UNDERSTOOD`/`FAILED` derivato dalle mosse con rifiuto dell'esito
  dichiarato dal client, esiti strategici `UNDERSTOOD`/rifiuto di `FAILED`/rifiuto di payload
  misto, riepilogo di studio corretto — tutti coerenti con `specs/middlegame-guided-study-model/spec.md`.
- [x] 6.7 Confermare che la spec canonica risultante e le API implementate siano la baseline della
  change `issue-016-middlegame-guided-study-flows` prima di iniziarne i task. Change archiviata in
  `openspec/changes/archive/2026-08-17-issue-016-middlegame-guided-study-model/`, spec canonica in
  `openspec/specs/middlegame-guided-study-model/`; `openspec validate --all --strict` positiva
  (5/5) dopo l'archiviazione. `issue-016-middlegame-guided-study-flows` resta attiva, intatta e
  non è stata avviata.
