## 1. Contratti frontend e routing canonico

- [x] 1.1 Estendere `StudyService` con la lettura degli studi filtrata per `GamePhase`, inviando `phase=MIDDLEGAME` tramite parametri HTTP, e aggiungere il test del contratto senza modificare l'endpoint backend esistente.
- [x] 1.2 Introdurre un contesto/helper condiviso per le route di sezione che descriva fase attesa, base canonica e percorsi di studio/posizione, mantenendo il comportamento predefinito delle route Aperture; coprirlo con test unitari.
- [x] 1.3 Sostituire il segnaposto `/middlegame` e dichiarare, nell'ordine non ambiguo, le route canoniche `studies/new`, `studies/:id`, `positions/new`, `positions/:id`, `positions/:id/setup` e `positions/:id/edit`, lasciando `/endgame` sul segnaposto.
- [x] 1.4 Aggiornare i test di routing e topbar per verificare componenti montati, precedenza delle route statiche, query parameter `studyId`, tab Mediogioco attivo su tutte le sotto-route e regressione delle route Aperture/Finale.

## 2. Lista e creazione manuale degli studi Mediogioco

- [x] 2.1 Implementare la pagina lista Mediogioco usando esclusivamente `GET /api/studies?phase=MIDDLEGAME`, con loading, errore, stato vuoto, conteggi «posizione/posizioni», apertura canonica del dettaglio e cancellazione dello studio.
- [x] 2.2 Mantenere fuori dalla lista Mediogioco il conteggio/CTA «Ripeti oggi» e ogni azione Lichess, PGN, training o statistiche, senza modificare la home Aperture.
- [x] 2.3 Implementare una pagina di creazione manuale riusabile per le sezioni posizionali, riutilizzando `StudyFormFields` ma non la logica di `StudyNew`, e inviare sempre `phase: MIDDLEGAME` con nome obbligatorio, descrizione e colore facoltativi.
- [x] 2.4 Dopo la creazione navigare a `/middlegame/studies/{id}`; mantenere sul form gli errori di validazione e far tornare «Annulla» a `/middlegame`.
- [x] 2.5 Aggiungere test per filtro, loading/error/empty state, cancellazione, payload di creazione, successo/errore, URL risultanti e assenza completa di review e controlli Lichess nelle due pagine Mediogioco.

## 3. Dettaglio dello studio e gestione delle posizioni

- [x] 3.1 Adattare `StudyDetail` al contesto Mediogioco, verificando prima della presentazione che lo studio caricato abbia fase esattamente `MIDDLEGAME` e mostrando un errore di sezione per ID `OPENING` o `ENDGAME`.
- [x] 3.2 Rendere canonici breadcrumb, ritorni e redirect dopo cancellazione dello studio, preservando i percorsi e il comportamento esistenti quando `StudyDetail` e' usato dalle Aperture.
- [x] 3.3 Mostrare metadati, conteggio e card delle posizioni con link `/middlegame/positions/{id}`, stato vuoto e CTA `/middlegame/positions/new?studyId={id}`; conservare modifica metadati e cancellazione di studio/posizione tramite le API esistenti.
- [x] 3.4 Verificare nel template Mediogioco l'assenza di statistiche dello studio, import PGN, import/sync Lichess e terminologia/badge di training non applicabili.
- [x] 3.5 Estendere i test di `StudyDetail` per fase corretta/errata, URL canonici, stato vuoto, azioni CRUD, terminologia posizionale e regressione completa del dettaglio Aperture.

## 4. Setup della posizione iniziale

- [x] 4.1 Adattare `PositionEditor` alle route Mediogioco `positions/new` e `positions/:id/setup`, verificando che lo studio padre della posizione abbia fase esattamente `MIDDLEGAME` anziche' accettare genericamente qualsiasi fase non `OPENING`.
- [x] 4.2 Rendere canonici breadcrumb, destinazione di «Annulla» e redirect dopo salvataggio: creazione annullata verso lo studio, setup annullato verso il dettaglio posizione e setup salvato verso `/middlegame/positions/{id}/edit`.
- [x] 4.3 Preservare senza modifiche funzionali composizione visuale, FEN canonica, `studyId`, albero esistente, guard delle modifiche e validazioni frontend/backend stabilite in R25.
- [x] 4.4 Estendere i test di `PositionEditor` per creazione/setup Mediogioco, redirect, annullamenti, fase `OPENING`/`ENDGAME` rifiutata sulle route R26 e regressione dei contratti FEN R25.

## 5. Dettaglio posizione ed editor delle mosse

- [x] 5.1 Adattare `VariantDetail` al contesto Mediogioco, verificando la fase esatta dello studio padre e mantenendo sotto `/middlegame` breadcrumb, ritorno allo studio e navigazione rail/drawer fra posizioni sorelle.
- [x] 5.2 Nel dettaglio posizione mostrare la scacchiera dalla `startingFen`, replay, rami, commenti/NAG e stato valido con albero vuoto; esporre azioni distinte «Configura posizione iniziale» verso `setup` e «Modifica mosse» verso `edit`.
- [x] 5.3 Mantenere nel dettaglio l'analisi Stockfish e la linea migliore, ma non renderizzare «Gioca contro il computer» per una posizione `MIDDLEGAME`; preservare training, review, statistiche e comando di gioco per le varianti `OPENING`.
- [x] 5.4 Adattare `VariantEditor` alla route `/middlegame/positions/:id/edit`, verificare la fase esatta, mantenere la navigazione fra posizioni sotto il prefisso e, dopo il salvataggio, aprire `/middlegame/positions/{id}` conservando `startingFen`, albero e annotazioni.
- [x] 5.5 Nell'editor mosse mantenere l'analisi Stockfish ma non renderizzare «Gioca contro il computer» per le posizioni; lasciare invariati motore, guard, menu azioni e percorsi delle Aperture.
- [x] 5.6 Estendere i test di dettaglio/editor per albero pieno e vuoto, FEN custom, fase errata, URL canonici, navigazione sorelle, setup/edit distinti, confine Stockfish/R28 e regressione Aperture.

## 6. Verifiche automatiche e manuali

- [x] 6.1 Eseguire i test frontend mirati delle aree modificate e correggere ogni regressione prima delle suite complete.
- [x] 6.2 Eseguire da `frontend/` `npm test -- --watch=false` e `npm run build`, registrando conteggi ed eventuali soli warning preesistenti.
- [x] 6.3 Eseguire da `backend/` `mvnw.cmd test` per verificare filtro di fase, creazione studio, validazione FEN/albero e regressione Aperture, anche se R26 non modifica il backend.
- [x] 6.4 Eseguire la checklist manuale R26 su un database H2 temporaneo e separato a 1600, 1440, 1024, 768, 375 e 320 px, verificando lista/empty state, creazione studio, CRUD e dettaglio posizioni, entrambi gli editor, navigazione sorelle, fase errata, tab attivo, assenza delle azioni fuori scope, console/rete pulite e nessun overflow orizzontale.
- [x] 6.5 Registrare l'hash di `backend/data/scacchi.mv.db` prima e dopo test/preview e confermare che la risorsa persistente condivisa non sia stata avviata, modificata, ripristinata o inclusa nel lavoro R26.

## 7. Documentazione e chiusura tecnica

- [x] 7.1 Aggiungere a `docs/checklist-e2e.md` i flussi R26 realmente verificati e aggiornare conteggi e copertura automatica con i risultati effettivi, senza dichiarare eseguite prove non svolte.
- [x] 7.2 Aggiornare `docs/stato-corrente.md`, `docs/piano-rilasci-evolutivi.md`, `docs/backlog.md`, `docs/backlog/sviluppi-importanti.md`, `docs/roadmap.md` e `README.md` per segnare R26 come implementata solo dopo test e verifica manuale positivi.
- [x] 7.3 Riesaminare proposal, design e spec contro l'implementazione finale, aggiornare gli artefatti solo per eventuali scostamenti approvati ed eseguire `openspec validate "issue-016-middlegame-section" --type change --strict`.
- [x] 7.4 Eseguire il controllo finale Git e documentare file modificati, test, build, evidenze manuali, punti aperti e conferma del database protetto invariato, senza commit, push o archivio OpenSpec non richiesti.
