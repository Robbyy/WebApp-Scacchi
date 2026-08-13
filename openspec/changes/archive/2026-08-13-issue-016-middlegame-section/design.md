## Context

Il dominio e la persistenza necessari a R26 esistono gia'. `Study.phase` distingue `OPENING`, `MIDDLEGAME` ed `ENDGAME`; `Variant` e' l'elemento figlio comune e usa `startingFen` come posizione iniziale tecnica. R25 ha inoltre consegnato due editor distinti per i contenuti posizionali: `PositionEditor` configura la posizione iniziale/FEN, mentre `VariantEditor` modifica l'albero di mosse dalla FEN salvata.

Il backend espone gia' `GET /api/studies?phase=MIDDLEGAME`, `POST /api/studies` con fase esplicita, il dettaglio dello studio con i suoi figli e il percorso nidificato `POST /api/studies/{id}/variants`. La validazione della posizione e dell'albero risolve gia' la fase dello studio padre. Non sono quindi necessari nuovi endpoint, entita', colonne o changeset Liquibase.

Il frontend, invece, monta ancora un segnaposto su `/middlegame`. Le viste generiche di studio e posizione sono parzialmente sensibili alla fase, ma producono URL senza prefisso (`/studies/...`, `/variants/...`, `/positions/...`). Poiche' la topbar deriva la sezione attiva esclusivamente dall'URL, tali percorsi accendono il tab Aperture. Inoltre la pagina `/studies/new` incorpora intenzionalmente il flusso Aperture/Lichess e non e' adatta alla creazione manuale di uno studio posizionale.

Esiste infine un confine di rilascio da rendere esplicito: il toggle di analisi Stockfish e la linea migliore sono strumenti di consultazione gia' disponibili nel componente condiviso, mentre l'avvio di una partita dalla FEN salvata appartiene a R28. Il pulsante «Gioca contro il computer» e' oggi renderizzato senza distinguere la fase e deve essere escluso dalle posizioni in R26.

## Goals / Non-Goals

**Goals:**

- Rendere `/middlegame` una sezione completa per elencare, creare e consultare studi `MIDDLEGAME`.
- Consentire dal dettaglio dello studio la consultazione e la gestione manuale delle sue posizioni.
- Offrire URL canonici sotto `/middlegame` per lista, studi, dettaglio posizione e i due editor, mantenendo attivo il tab Mediogioco.
- Riutilizzare API, modello `Study -> Variant`, validazione FEN/albero, annotazioni, replay e navigazione fra posizioni gia' esistenti.
- Applicare un controllo esatto della fase sulle route di Mediogioco, affinche' contenuti `OPENING` o `ENDGAME` non siano presentati come `MIDDLEGAME`.
- Preservare i flussi e gli URL esistenti delle Aperture.

**Non-Goals:**

- Implementare o rendere navigabile la sezione Finale.
- Modificare il modello a fasi, `Variant`, `startingFen`, le regole FEN o la validazione dell'albero.
- Aggiungere endpoint, migration o dipendenze.
- Esporre import o sync Lichess, import PGN, training, review SM-2 o statistiche nelle posizioni di Mediogioco.
- Avviare `/play` da una posizione di Mediogioco; questa capacita' resta in R28.
- Introdurre tag, categorie o ricerca.

## Decisions

### 1. Usare il filtro backend di fase gia' disponibile

Decisione: la lista Mediogioco richiede `GET /api/studies?phase=MIDDLEGAME`. Il client estende `StudyService` per inviare il parametro di fase in modo esplicito; non carica tutti gli studi per filtrarli localmente.

Razionale:

- l'API e il repository supportano gia' il filtro e restituiscono il conteggio dei soli figli dello studio;
- la fase e' un confine di dominio, non una preferenza di visualizzazione;
- il filtro server-side evita che studi di altre fasi entrino transitoriamente nello stato della pagina.

Alternative considerate:

- Chiamare `GET /api/studies` e filtrare in Angular: scartato, perche' duplica una regola gia' disponibile nel backend e rende piu' facile mostrare dati della fase sbagliata.
- Aggiungere un endpoint `/api/middlegame/studies`: scartato, perche' duplicherebbe il contratto comune senza introdurre un nuovo modello.

### 2. Adottare route canoniche con prefisso Mediogioco

Decisione: R26 usa le seguenti route canoniche:

| Route | Componente/uso |
|---|---|
| `/middlegame` | lista degli studi `MIDDLEGAME` |
| `/middlegame/studies/new` | creazione manuale di uno studio `MIDDLEGAME` |
| `/middlegame/studies/:id` | dettaglio dello studio e lista delle posizioni |
| `/middlegame/positions/new?studyId=:id` | configurazione FEN di una nuova posizione |
| `/middlegame/positions/:id` | dettaglio in consultazione della posizione |
| `/middlegame/positions/:id/setup` | modifica della posizione iniziale/FEN |
| `/middlegame/positions/:id/edit` | modifica dell'albero di mosse |

Le route tecniche restano in inglese, come quelle esistenti. I percorsi generici pre-R26 restano disponibili per Aperture e compatibilita'; tutti i link e redirect generati dalla sezione Mediogioco usano pero' il prefisso canonico.

Ogni route prefissata dichiara il contesto atteso `MIDDLEGAME`. Dopo avere caricato lo studio padre, il componente verifica la fase prima di presentare o modificare il contenuto. Uno studio o una posizione di fase diversa produce un errore di sezione e non viene mostrato come contenuto di Mediogioco.

Razionale:

- `sectionFromUrl` riconosce gia' qualunque sotto-route `/middlegame/...`, e i test esistenti anticipano percorsi come `/middlegame/positions/4`;
- URL distinti rendono stabile lo stato `aria-current` della topbar anche nei dettagli e negli editor;
- il controllo esatto della fase impedisce che un ID valido ma appartenente a un'altra sezione aggiri il filtro della lista.

Alternative considerate:

- Continuare a usare soltanto `/studies/:id` e `/variants/:id`: scartato, perche' la topbar li classifica come Aperture e breadcrumb/ritorni uscirebbero dalla sezione.
- Determinare la sezione globale caricando i dati dal componente root: scartato, perche' accoppierebbe la topbar alle chiamate API delle pagine e introdurrebbe stati transitori piu' complessi.
- Usare una sola route `positions/:id/edit`: scartato, perche' R25 distingue configurazione FEN e albero mosse e la route non indicherebbe quale editor aprire.

### 3. Separare la creazione posizionale dal flusso Aperture/Lichess

Decisione: la pagina di creazione per Mediogioco e' un flusso manuale dedicato e riusabile dalle future sezioni posizionali. Riusa `StudyFormFields` per nome, descrizione e colore, ma invia sempre `phase: MIDDLEGAME` e non importa logica, servizi, bozza OAuth o controlli Lichess da `StudyNew`.

La lista Mediogioco non richiede il conteggio «Ripeti oggi» e non mostra azioni di review. La presentazione delle card puo' riusare stili o una parte presentazionale condivisa, mantenendo separato il comportamento specifico delle Aperture.

Razionale:

- `StudyNew` contiene molte responsabilita' proprie delle Aperture: preview, upsert, OAuth, `sessionStorage` e import in uno studio esistente;
- parametrizzare quel componente aumenterebbe il rischio di esporre accidentalmente Lichess nelle sezioni posizionali;
- un controller posizionale configurato dalla fase puo' essere riusato in R27 senza attivare oggi il Finale.

Alternative considerate:

- Aggiungere un parametro `phase` a `/studies/new`: scartato, perche' un query parameter controllato dal browser non deve trasformare il flusso Lichess in un creatore di studi non `OPENING`.
- Duplicare anche i campi del form: scartato, perche' `StudyFormFields` e' gia' il confine condiviso corretto.

### 4. Riutilizzare le viste complesse con un contesto di route esplicito

Decisione: `StudyDetail`, `PositionEditor`, `VariantDetail` e `VariantEditor` restano i componenti funzionali comuni. Quando sono montati sotto `/middlegame`, ricevono dai dati di route un contesto con fase attesa e base canonica, usato per:

- verificare `study.phase === MIDDLEGAME`;
- costruire breadcrumb, annullamenti, ritorni e redirect di salvataggio;
- navigare fra posizioni sorelle senza uscire dal prefisso;
- scegliere i link ai due editor corretti.

Il comportamento senza contesto prefissato resta quello esistente, cosi' le route Aperture non cambiano contratto.

Razionale:

- dettaglio, replay, albero, annotazioni, guard e navigazione fra figli sono gia' implementati e testati;
- duplicare questi componenti creerebbe rapidamente divergenze tra Aperture, Mediogioco e il futuro Finale;
- il contesto di route separa la terminologia/URL dal modello tecnico comune `Variant`.

Alternative considerate:

- Creare copie `MiddlegameStudyDetail` e `MiddlegamePositionDetail`: scartato, perche' duplicherebbero logica asincrona, replay, accessibilita' e gestione dell'albero.
- Inferire sempre il percorso dalla sola fase caricata: scartato come unica strategia, perche' durante il caricamento non esiste ancora una fase e le route generiche devono conservare il comportamento storico.

### 5. Rendere distinti setup FEN ed editor delle mosse

Decisione: il dettaglio posizione espone azioni non ambigue per «Configura posizione iniziale» (`.../:id/setup`) e «Modifica mosse» (`.../:id/edit`). La creazione e il setup usano `PositionEditor`; l'editing delle mosse usa `VariantEditor` a partire dalla `startingFen` persistita.

Dopo il salvataggio del setup si apre l'editor delle mosse. Dopo il salvataggio dell'albero si apre il dettaglio della posizione. Annullare la creazione torna allo studio; annullare una modifica torna al dettaglio della posizione. Tutte queste transizioni restano sotto `/middlegame`.

Razionale:

- rende visibili le due responsabilita' gia' separate da R25;
- consente di modificare solo le continuazioni senza passare obbligatoriamente dal setup;
- preserva la rivalidazione atomica dell'albero quando cambia la FEN.

Alternative considerate:

- Unificare i due editor in R26: scartato, perche' sarebbe una modifica non necessaria al flusso stabilizzato in R25.
- Conservare un solo comando «Modifica posizione» che attraversa sempre entrambi: scartato, perche' rende onerosa la modifica delle sole mosse e non chiarisce quale stato viene cambiato.

### 6. Separare analisi Stockfish e gioco contro il computer

Decisione: nelle posizioni di Mediogioco restano disponibili il toggle di analisi Stockfish, la barra di valutazione e, nel dettaglio, la linea migliore gia' fornita dal componente condiviso. Il comando «Gioca contro il computer» non viene invece renderizzato per una posizione, ne' nel dettaglio ne' nell'editor delle mosse. Per le varianti `OPENING` tutto resta invariato.

Razionale:

- l'analisi e' uno strumento di studio gia' capace di lavorare dalla FEN corrente e non avvia una partita;
- R28 identifica esplicitamente come nuova capability l'apertura di `/play?fen=...` da una posizione salvata;
- nascondere il solo comando di gioco corregge il confine di rilascio senza rimuovere strumenti di consultazione gia' riusabili.

Alternative considerate:

- Nascondere tutto Stockfish nelle posizioni: scartato, perche' confonderebbe analisi e gioco e toglierebbe un ausilio di studio gia' funzionante.
- Lasciare visibile il comando di gioco perche' tecnicamente gia' operativo: scartato, perche' anticiperebbe R28 senza i suoi criteri di accettazione e verifica.

## Risks / Trade-offs

- [I componenti condivisi possono generare accidentalmente un URL generico] -> Centralizzare nel contesto di sezione la costruzione dei link e coprire tutte le transizioni con test di routing.
- [Un ID di un'altra fase viene aperto sotto `/middlegame`] -> Verificare la fase dello studio padre prima di mostrare dati o abilitare azioni; testare studio `OPENING` e posizione `ENDGAME` sulle route Mediogioco.
- [Il riuso dei dettagli introduce regressioni nelle Aperture] -> Mantenere il comportamento di default delle route esistenti e aggiungere test di regressione per CTA, Lichess, training, review, statistiche e URL Aperture.
- [La creazione posizionale duplica parte della pagina `StudyNew`] -> Condividere i campi e gli stili presentazionali, non la logica Lichess/OAuth.
- [Due editor possono confondere l'utente] -> Usare etichette e route distinte per posizione iniziale e mosse, con redirect coerenti dopo il salvataggio.
- [L'analisi Stockfish viene scambiata per la capability R28] -> Specificare e testare che l'analisi resta disponibile ma il comando che apre `/play` e' assente nelle posizioni.

## Migration Plan

1. Estendere il client degli studi con il filtro opzionale di fase, senza cambiare il contratto backend.
2. Sostituire il segnaposto `/middlegame` e aggiungere le route canoniche, lasciando invariata `/endgame`.
3. Introdurre lista e creazione manuale posizionale configurate per `MIDDLEGAME`.
4. Rendere i componenti condivisi consapevoli del contesto di route e aggiornare link, redirect e controllo esatto della fase.
5. Separare le azioni setup/mosse e rimuovere il comando di gioco dalle posizioni, preservando l'analisi.
6. Eseguire test frontend mirati, suite complete, build e checklist manuale su database temporaneo.

Rollback: le modifiche sono frontend e non migrano dati. Il rollback consiste nel ripristinare il segnaposto e le route/componenti precedenti; API, schema e record persistiti restano compatibili.

## Open Questions

Nessuna decisione aperta per l'avvio dell'implementazione. Eventuali variazioni della struttura canonica delle route, del confine con R28 o del riuso dei componenti richiedono una revisione esplicita di design e spec prima di modificare il codice.
