## ADDED Requirements

### Requirement: Middlegame studies have an immutable study type
Il sistema SHALL associare ai nuovi studi `MIDDLEGAME` esattamente una tipologia tra `TACTICAL` e
`STRATEGIC`, SHALL derivare da essa il trattamento delle posizioni e SHALL renderla immutabile
dopo la creazione o la prima classificazione. Questa tipologia SHALL NOT essere richiesta né
valorizzata per studi `OPENING` o `ENDGAME` in R26.3.

#### Scenario: Create a tactical middlegame study
- **WHEN** l'utente crea uno studio Mediogioco con tipologia `TACTICAL` e metadati validi
- **THEN** il sistema persiste lo studio con fase `MIDDLEGAME`, tipologia `TACTICAL` e nessun colore

#### Scenario: Create a strategic empty study
- **WHEN** l'utente crea uno studio Mediogioco `STRATEGIC` senza posizioni
- **THEN** il sistema crea uno studio vuoto valido e restituisce un conteggio posizioni pari a zero

#### Scenario: Reject a new unclassified middlegame study
- **WHEN** una richiesta crea uno studio `MIDDLEGAME` senza tipologia
- **THEN** il sistema rifiuta la richiesta senza creare lo studio

#### Scenario: Opening and endgame studies do not receive the type
- **WHEN** viene creato o aggiornato uno studio `OPENING` o `ENDGAME`
- **THEN** il sistema non richiede, non deriva e non persiste una tipologia R26.3 per quello studio

#### Scenario: Reject a type change
- **WHEN** un client tenta di cambiare un tipo Mediogioco già valorizzato
- **THEN** il sistema rifiuta la richiesta e conserva il tipo persistito

### Requirement: Legacy middlegame studies can be classified once
Il sistema SHALL mantenere consultabili e modificabili gli studi `MIDDLEGAME` esistenti senza
tipologia, SHALL presentarli come «Da classificare» e SHALL consentire una sola transizione verso
`TACTICAL` o `STRATEGIC`. Finché lo studio non è classificato, il sistema SHALL NOT consentire
nuove posizioni o tentativi guidati.

#### Scenario: Open an unclassified legacy study
- **WHEN** l'utente apre uno studio Mediogioco esistente con tipologia nulla
- **THEN** il sistema mostra «Da classificare» e mantiene disponibili consultazione e modifica dei metadati esistenti

#### Scenario: Classify a legacy study
- **WHEN** l'utente sceglie `TACTICAL` o `STRATEGIC` per uno studio «Da classificare»
- **THEN** il sistema persiste la scelta e da quel momento la tratta come immutabile

#### Scenario: Block creation before classification
- **WHEN** l'utente tenta di creare una posizione o registrare un tentativo in uno studio non classificato
- **THEN** il sistema rifiuta l'operazione senza modificare studio, posizioni o storico

### Requirement: Themes are normalized and compatible with study type
Il sistema SHALL fornire un catalogo persistente di temi con ID e codice stabili, tipologia,
label e ordine. Ogni posizione Mediogioco regolarizzata SHALL referenziare il tema principale per
ID e il sistema SHALL accettare soltanto temi attivi compatibili con la tipologia dello studio.
Il codice SHALL essere univoco soltanto insieme alla tipologia (`code`, `study_type`) e non a
livello globale del catalogo: lo stesso codice può comparire sia nel catalogo `TACTICAL` sia in
quello `STRATEGIC` con ID distinti. L'unico identificativo referenziato dalle posizioni SHALL
essere l'ID del tema.

Il catalogo tattico iniziale SHALL contenere, nell'ordine: doppio attacco, inchiodatura, infilata,
attacco di scoperta, deviazione, adescamento, eliminazione del difensore, sovraccarico,
interferenza, sgombero, sacrificio, attacco al re, difesa tattica, combinazione. Il catalogo
strategico iniziale SHALL contenere, nell'ordine: struttura pedonale, case deboli e case forti,
colonne e diagonali, attività dei pezzi, pezzo buono e pezzo cattivo, spazio, sviluppo e
iniziativa, profilassi, cambi favorevoli, piano di gioco, attacco al re, difesa e controgioco,
transizione al finale.

#### Scenario: List tactical themes
- **WHEN** il client richiede i temi attivi per `TACTICAL`
- **THEN** il sistema restituisce soltanto i quattordici temi tattici nell'ordine del catalogo con ID, codice e label

#### Scenario: Save a theme reference
- **WHEN** viene salvata una posizione di uno studio tattico con l'ID di un tema tattico attivo
- **THEN** il sistema persiste il riferimento all'ID e restituisce i dati leggibili del tema senza copiarne la label nella posizione

#### Scenario: Rename a theme label
- **WHEN** una futura migration modifica la label di un tema mantenendo ID e codice
- **THEN** ogni posizione referenziata mostra la nuova label senza aggiornare il proprio riferimento

#### Scenario: Reject an incompatible theme
- **WHEN** una posizione di uno studio strategico viene salvata con l'ID di un tema tattico, inesistente o inattivo
- **THEN** il sistema rifiuta la richiesta senza modificare la posizione

#### Scenario: Same code exists in both catalogs
- **WHEN** il catalogo tattico e quello strategico contengono entrambi un tema con codice
  `KING_ATTACK` (ID `1012` tattico, ID `2011` strategico)
- **THEN** il sistema mantiene entrambi i temi distinti per ID e non tratta la duplicazione del
  codice come un conflitto

#### Scenario: Theme catalog has no user management flow
- **WHEN** R26.3 espone il catalogo temi
- **THEN** il sistema offre lettura per tipologia ma non offre creazione, rinomina, disattivazione o eliminazione dall'interfaccia utente

### Requirement: Middlegame positions have guided-study metadata
Il sistema SHALL conservare per ogni posizione Mediogioco titolo, tema principale per ID e ordine,
e SHALL consentire descrizione del tema, descrizione della posizione, fonte testuale e difficoltà
facoltative. La difficoltà, quando presente, SHALL essere una tra `INTRODUCTORY`, `EASY`,
`INTERMEDIATE`, `ADVANCED`, `EXPERT` e SHALL restare modificabile.

#### Scenario: Create a complete position with metadata
- **WHEN** l'utente crea una posizione in uno studio classificato con titolo, tema compatibile, ordine e metadati facoltativi validi
- **THEN** il sistema persiste e restituisce tutti i valori associando la posizione al solo studio padre

#### Scenario: Reject a new position without theme
- **WHEN** una nuova posizione Mediogioco viene inviata senza `themeId`
- **THEN** il sistema rifiuta la creazione indicando il campo tema e non crea dati parziali

#### Scenario: Change the position difficulty
- **WHEN** l'utente modifica una posizione esistente scegliendo un altro livello fra i cinque previsti
- **THEN** il sistema salva il nuovo livello senza alterare tema, FEN, albero o storico

#### Scenario: Change to another compatible theme
- **WHEN** l'utente sostituisce il tema con un altro tema attivo compatibile con lo stesso tipo di studio
- **THEN** il sistema aggiorna il riferimento e conserva gli altri metadati e lo storico

#### Scenario: Opening and endgame children keep their contracts
- **WHEN** viene creata o aggiornata una variante `OPENING` o una posizione `ENDGAME`
- **THEN** il sistema non applica gli obblighi di tema, difficoltà e ordine specifici di R26.3

### Requirement: Existing positions remain usable until theme assignment
Il sistema SHALL preservare le posizioni Mediogioco esistenti senza inventare un tema, SHALL
mostrarle come «Tema da assegnare» e SHALL mantenerne consultazione e modifica ordinaria. Una
posizione senza tema SHALL NOT essere eleggibile per tentativi o sequenze guidate.

#### Scenario: Read a legacy position without theme
- **WHEN** l'utente apre una posizione Mediogioco migrata con `themeId` nullo
- **THEN** il sistema mostra la posizione, la FEN e l'analisi esistenti con l'indicazione «Tema da assegnare»

#### Scenario: Edit unrelated legacy metadata
- **WHEN** l'utente modifica titolo, FEN o albero di una posizione legacy senza assegnare ancora il tema
- **THEN** il sistema mantiene il CRUD esistente e conserva `themeId` nullo

#### Scenario: Exclude an incomplete legacy position
- **WHEN** viene richiesta l'eleggibilità guidata di una posizione senza tema
- **THEN** il sistema la dichiara non eleggibile e non registra alcun tentativo

#### Scenario: Assign the missing theme
- **WHEN** lo studio è classificato e l'utente assegna alla posizione un tema compatibile
- **THEN** il sistema rimuove lo stato «Tema da assegnare» e valuta l'eleggibilità anche rispetto alla mainline

### Requirement: Position order is explicit contiguous and transactional
Il sistema SHALL assegnare a ogni posizione Mediogioco un ordine intero contiguo a partire da uno,
SHALL restituire le posizioni in tale ordine e SHALL applicare inserimento, spostamento ed
eliminazione in modo atomico senza ID duplicati, buchi o appartenenze incrociate.

#### Scenario: Backfill preserves current order
- **WHEN** la migration valorizza l'ordine delle posizioni Mediogioco esistenti
- **THEN** assegna `1..N` separatamente per studio seguendo l'ID crescente già usato dalla lettura corrente

#### Scenario: Insert at a selected order
- **WHEN** viene creata una posizione valida a un indice compreso fra uno e `N+1`
- **THEN** il sistema inserisce la posizione a quell'indice e rinumera in modo contiguo le successive nella stessa transazione

#### Scenario: Reorder a complete study list
- **WHEN** il client invia una permutazione completa e senza duplicati degli ID dello studio
- **THEN** il sistema salva l'ordine richiesto in modo atomico e le letture successive lo rispettano

#### Scenario: Reject an invalid reorder
- **WHEN** il payload omette, duplica o aggiunge un ID estraneo allo studio
- **THEN** il sistema rifiuta l'intera operazione e conserva tutti gli ordini precedenti

#### Scenario: Delete and compact
- **WHEN** viene eliminata una posizione intermedia
- **THEN** il sistema elimina la posizione e compatta gli ordini rimasti senza modificare altri studi

### Requirement: Draft state is derived and blocks attempts
Il sistema SHALL trattare come bozza ogni posizione Mediogioco priva di mainline, SHALL consentirne
il salvataggio e la consultazione come scacchiera libera e SHALL NOT duplicare lo stato in una
colonna persistita. Una bozza SHALL NOT produrre esiti né risultare eleggibile per lo studio
guidato.

#### Scenario: Save a draft
- **WHEN** l'utente salva una posizione Mediogioco valida con albero e mainline vuoti
- **THEN** il sistema conserva la posizione e la restituisce come bozza derivata

#### Scenario: Reject an attempt on a draft
- **WHEN** un client tenta di registrare un tentativo per una bozza
- **THEN** il sistema rifiuta la richiesta senza creare un evento storico

#### Scenario: Complete a draft
- **WHEN** l'autore salva una mainline legalmente valida in una bozza con studio classificato e tema assegnato
- **THEN** la posizione non è più bozza e diventa eleggibile per il flusso guidato

### Requirement: Attempts are immutable minimal events with derived summaries
Il sistema SHALL registrare ogni tentativo concluso come evento indipendente contenente posizione,
istante assegnato dal server ed esito tra `UNDERSTOOD`, `NOT_UNDERSTOOD`, `FAILED`. Il sistema
SHALL NOT persistere mosse, durata, configurazione della sequenza, FEN o versione della soluzione e
SHALL derivare ultimo esito, numero tentativi e data dell'ultima comprensione dagli eventi.

#### Scenario: Store multiple attempts
- **WHEN** una posizione riceve un tentativo `FAILED` e successivamente uno `UNDERSTOOD`
- **THEN** lo storico contiene due eventi distinti e il riepilogo riporta `UNDERSTOOD` come ultimo esito e conteggio due

#### Scenario: Derive last understood date
- **WHEN** lo storico contiene uno o più eventi `UNDERSTOOD`
- **THEN** il riepilogo restituisce la data del più recente evento `UNDERSTOOD`

#### Scenario: Position has never been attempted
- **WHEN** una posizione non possiede eventi
- **THEN** il riepilogo la identifica come mai tentata con conteggio zero e nessuna data di comprensione

#### Scenario: Individual attempt cannot be deleted
- **WHEN** un client cerca di eliminare o modificare un singolo tentativo
- **THEN** il sistema non espone un'operazione valida e conserva lo storico immutato

#### Scenario: Position deletion cascades attempts
- **WHEN** viene eliminata una posizione con tentativi
- **THEN** il sistema elimina automaticamente tutti i suoi eventi tramite il vincolo referenziale

#### Scenario: Study deletion cascades through positions
- **WHEN** viene eliminato uno studio Mediogioco con posizioni e tentativi
- **THEN** il sistema elimina posizioni ed eventi associati senza lasciare record orfani

### Requirement: Tactical attempt outcome is validated by the backend
Il sistema SHALL derivare l'esito di un tentativo tattico dalla mainline corrente e dalle sole
mosse SAN dell'utente ricevute transitoriamente. Il client SHALL NOT poter dichiarare direttamente
l'esito tattico e le mosse SHALL NOT essere conservate nell'evento persistito.

#### Scenario: Validate a completed tactical mainline
- **WHEN** il client invia tutte le mosse dell'utente corrispondenti ai relativi ply della mainline corrente
- **THEN** il backend valida legalità e corrispondenza, registra `UNDERSTOOD` e non persiste le mosse

#### Scenario: Validate a tactical deviation
- **WHEN** il client invia una mossa utente legalmente valida diversa dalla mainline al primo punto di deviazione
- **THEN** il backend registra `FAILED` e non accetta rami alternativi come soluzioni aggiuntive

#### Scenario: Reject an incomplete non-failing transcript
- **WHEN** il client invia un prefisso corretto che non completa la mainline e non contiene deviazioni
- **THEN** il backend rifiuta la registrazione perché il tentativo non ha ancora un esito

#### Scenario: Reject a client-declared tactical outcome
- **WHEN** un payload tattico contiene un esito dichiarato invece delle mosse utente verificabili
- **THEN** il backend rifiuta la richiesta senza creare un evento

#### Scenario: Reject a malformed or illegal tactical move
- **WHEN** una mossa SAN non è applicabile dalla FEN e dalle risposte avversarie della mainline
- **THEN** il backend restituisce un errore di validazione senza modificare storico o albero autore

### Requirement: Strategic outcomes obey the persisted study type
Il sistema SHALL consentire per una posizione strategica completa soltanto la registrazione
manuale di `UNDERSTOOD` o `NOT_UNDERSTOOD`, SHALL rifiutare `FAILED` e SHALL derivare il tipo dalla
relazione posizione-studio anziché da un valore dichiarato dal client.

#### Scenario: Record understood strategic outcome
- **WHEN** il client registra `UNDERSTOOD` per una posizione appartenente a uno studio `STRATEGIC` eleggibile
- **THEN** il sistema crea un singolo evento con istante server

#### Scenario: Record not understood strategic outcome
- **WHEN** il client registra `NOT_UNDERSTOOD` per una posizione strategica eleggibile
- **THEN** il sistema crea un singolo evento e aggiorna il riepilogo derivato

#### Scenario: Reject failed strategic outcome
- **WHEN** il client invia `FAILED` per una posizione strategica
- **THEN** il sistema rifiuta l'esito e non crea eventi

#### Scenario: Reject mismatched payload mode
- **WHEN** il payload invia mosse tattiche per uno studio strategico o un esito manuale per uno tattico
- **THEN** il sistema rifiuta la richiesta usando il tipo persistito come fonte di verità

### Requirement: Editing position content preserves unversioned history
Il sistema SHALL consentire la modifica successiva della FEN, della mainline e dei metadati di una
posizione senza cancellare né riscrivere i tentativi precedenti. Gli eventi SHALL continuare a
riferirsi alla posizione logica senza conservare la versione della soluzione e i tentativi futuri
SHALL usare FEN e mainline correnti.

#### Scenario: Change the mainline after attempts
- **WHEN** l'autore modifica e salva la mainline di una posizione con storico
- **THEN** gli eventi esistenti restano invariati e la validazione tattica successiva usa la nuova mainline

#### Scenario: Change the starting FEN after attempts
- **WHEN** l'autore salva una nuova FEN legalmente valida per una posizione con storico
- **THEN** il sistema ricalcola il lato tecnico, conserva gli eventi e usa la nuova FEN nei tentativi futuri

#### Scenario: History does not claim solution versioning
- **WHEN** l'utente consulta eventi precedenti dopo una modifica di FEN o mainline
- **THEN** il sistema li presenta come storico della posizione senza indicare una versione della soluzione non persistita

### Requirement: Guided-study model remains isolated from opening training and endgame
Il sistema SHALL mantenere training, review SM-2 e statistiche esistenti limitati alle Aperture e
SHALL NOT applicare automaticamente tipologia, temi o tentativi R26.3 alla fase `ENDGAME`.

#### Scenario: Opening training remains unchanged
- **WHEN** l'utente allena una variante `OPENING`
- **THEN** il sistema usa sessioni, mosse, errori, statistiche e review esistenti senza creare `PositionAttempt`

#### Scenario: Middlegame attempt does not create training data
- **WHEN** viene registrato un tentativo Mediogioco valido
- **THEN** il sistema crea soltanto `PositionAttempt` e non aggiorna training, statistiche o review

#### Scenario: Endgame remains outside R26.3
- **WHEN** viene aperto o modificato uno studio `ENDGAME`
- **THEN** il sistema mantiene i contratti posizionali esistenti senza richiedere tipo o tema R26.3 e senza esporre tentativi guidati
