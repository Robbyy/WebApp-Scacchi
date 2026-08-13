## Context

Il modello introdotto da `issue-016-phase-domain-model` riusa `Study -> Variant` per tutte le fasi: negli studi `OPENING` il figlio è una variante allenabile, mentre negli studi `MIDDLEGAME` e `ENDGAME` è presentato come una posizione. `Variant` possiede già la colonna persistita `starting_fen`, ma il backend la inizializza sempre alla FEN standard e il payload non consente di impostarla.

Il frontend calcola già la posizione corrente a partire da `startingFen` e dall'albero delle mosse. La scacchiera condivisa, però, è una scacchiera di gioco: consente soltanto mosse legali del lato al tratto e non offre un modo per piazzare o rimuovere pezzi.

Il validatore backend controlla già le mosse SAN con chesslib, ma le ricostruisce sempre dalla FEN standard. Per R25 il contesto dello studio deve essere risolto prima della validazione: solo le posizioni in studi `MIDDLEGAME` o `ENDGAME` possono usare una FEN iniziale custom. Aperture e varianti legacy senza `studyId` continuano a usare la FEN standard.

Vincoli confermati:

- una posizione appartiene sempre a uno studio di Mediogioco o Finale;
- l'editor definisce disposizione dei pezzi, lato al tratto, diritti d'arrocco ed en-passant;
- una posizione può essere salvata senza mosse;
- il titolo è obbligatorio; una descrizione della singola posizione è fuori scope.

## Goals / Non-Goals

**Goals:**

- Consentire la creazione e modifica di una posizione manuale dentro uno studio `MIDDLEGAME` o `ENDGAME`.
- Generare e salvare una FEN canonica come `startingFen`, includendo lato al tratto, arrocco ed en-passant; i contatori iniziali sono `0 1`.
- Validare lato client per il feedback immediato e lato backend come autorità, prima di persistere la posizione.
- Validare tutte le mosse dell'albero a partire dalla FEN candidata o già persistita, consentendo un albero vuoto per le sole posizioni non di apertura.
- Conservare dati e flussi delle Aperture, inclusi import/sync Lichess, training, review e FEN standard.

**Non-Goals:**

- Introdurre una nuova entità o tabella `Position`, oppure migrare i dati esistenti.
- Consentire una FEN custom per Aperture o varianti legacy senza studio.
- Aggiungere una descrizione, tag, categorie, import PGN/Lichess o training/review alle posizioni non di apertura.
- Offrire l'inserimento testuale libero della FEN; la FEN è generata dall'editor visuale.
- Dimostrare la raggiungibilità storica completa di una posizione: la validazione garantisce che sia utilizzabile legalmente per iniziare il gioco, non ricostruisce l'intera partita precedente.

## Decisions

### 1. Riutilizzare `Variant` e `startingFen` senza migrazione di schema

Decisione: una posizione resta una `Variant` tecnica collegata da `studyId` allo studio padre. Il titolo usa il campo esistente `name`; `startingFen`, `tree`, `moves`, `sourcePgn`, `studyId` e `createdAt` restano gli altri dati persistiti. Per una posizione manuale `sourcePgn` è assente, mentre `tree` e `moves` possono essere vuoti.

Il campo tecnico `color`, obbligatorio nel modello esistente, viene derivato dal lato al tratto della FEN (`WHITE` per `w`, `BLACK` per `b`) e non viene presentato come «lato da allenare» nell'editor delle posizioni.

Razionale:

- la change precedente ha già scelto `Variant` come elemento figlio comune;
- la colonna `starting_fen` esiste ed è non nulla;
- non introdurre una migrazione protegge i dati persistenti e mantiene compatibili le varianti esistenti.

Alternative considerate:

- Nuova entità `Position`: scartata, perché duplicherebbe struttura, CRUD e persistenza senza una necessità di dominio nuova.
- Campo `color` scelto manualmente: scartato, perché nelle posizioni non esiste un lato da allenare e duplicherebbe l'informazione autorevole già presente nella FEN.

### 2. Usare un editor di posizionamento dedicato

Decisione: introdurre un componente frontend dedicato alla configurazione della posizione, separato dalla `Chessboard` usata per giocare le mosse. L'editor consente di scegliere e piazzare/rimuovere i pezzi, impostare il lato al tratto, attivare/disattivare i quattro diritti d'arrocco e indicare la casa en-passant quando applicabile. Produce la FEN candidata, con contatori `0 1`.

Razionale:

- la scacchiera condivisa consente esclusivamente mosse legali del lato al tratto e non può rappresentare una disposizione transitoria anche se non ancora valida;
- mantenere distinti piazzamento e gioco evita di alterare i flussi già testati di Aperture, training e analisi;
- tutti i campi rilevanti per le mosse future sono visibili e non derivati in modo implicito.

Alternative considerate:

- Aggiungere una modalità di setup alla `Chessboard`: scartata, perché mescolerebbe stato di configurazione e stato di gioco nello stesso componente.
- Campo testuale FEN: scartato, perché non soddisfa l'obiettivo dell'editor visuale e aumenta gli errori di inserimento.

### 3. Rendere il backend autorevole per FEN e contesto di fase

Decisione: il comando backend che crea o aggiorna un figlio di studio risolve prima lo studio padre e la sua fase, poi valida il payload e persiste il risultato. Il controller non deve più validare in anticipo l'albero assumendo la FEN standard.

Per `MIDDLEGAME` e `ENDGAME`, il payload di creazione/modifica include la FEN generata dall'editor. Il backend la analizza e normalizza, verifica che la posizione sia utilizzabile per il gioco e valida l'albero dalla stessa FEN. Per `OPENING` e varianti legacy, il backend continua a imporre `START_FEN`; una FEN custom viene rifiutata invece di essere ignorata silenziosamente.

La validazione della posizione copre almeno: sintassi e caricamento della FEN, presenza di un solo re per colore, pedoni fuori da prima e ottava traversa, re non adiacenti, coerenza di arrocco/en-passant e impossibilità che il lato che ha appena mosso lasci il proprio re sotto scacco. Non richiede di dimostrare che ogni pezzo abbia una storia di mosse raggiungibile.

Razionale:

- l'attuale `VariantValidator` parte sempre da `VariantService.START_FEN`, quindi non può proteggere una posizione custom;
- solo il backend dispone del contesto autorevole di studio, fase e posizione esistente;
- rifiutare una FEN custom nelle Aperture evita di aggirare i vincoli di dominio tramite API dirette.

Alternative considerate:

- Fidarsi della validazione `chess.js` nel browser: scartato, perché un client può essere aggirato e la persistenza deve restare coerente.
- Validare sempre nei controller: scartato, perché la fase dello studio e la FEN già salvata non sono disponibili in modo uniforme per creazioni e aggiornamenti.
- Accettare una FEN custom per qualunque `Variant`: scartato, perché violerebbe la semantica delle Aperture definita dalla change precedente.

### 4. Validare l'albero dalla FEN iniziale effettiva

Decisione: il validatore delle mosse riceve la FEN iniziale effettiva e visita ogni ramo dell'albero applicando le mosse SAN in profondità. Per una posizione non di apertura un albero vuoto è valido; se contiene mosse, anche una sola mossa incompatibile con la FEN provoca il rifiuto atomico del salvataggio.

Quando viene modificata la FEN di una posizione esistente, l'intero albero viene rivalidato contro la nuova FEN nella stessa operazione. Non vengono mantenute mosse incompatibili né persistenze parziali.

Razionale:

- la FEN e l'albero sono un unico stato logico;
- una validazione parziale permetterebbe di salvare posizioni non riproducibili;
- permettere l'albero vuoto rende possibile salvare il diagramma iniziale prima di studiarne le continuazioni.

Alternative considerate:

- Consentire il cambio FEN e cancellare automaticamente le mosse: scartato, perché sarebbe una perdita silenziosa di contenuto.
- Mantenere l'obbligo di almeno una mossa: scartato, perché una posizione iniziale è già un contenuto valido di Mediogioco o Finale.

### 5. Mantenere i flussi di Apertura invariati e rendere esplicita la terminologia UI

Decisione: dal dettaglio di uno studio `MIDDLEGAME` o `ENDGAME` l'azione di creazione apre l'editor di posizione e salva tramite il percorso nidificato dello studio, assegnando il suo `studyId`. Per `OPENING` restano l'editor «Nuova variante» e i relativi import. Liste, breadcrumb e messaggi usano «posizione» fuori dalle Aperture, pur conservando `Variant` come nome tecnico.

Razionale:

- l'associazione allo studio è un vincolo di dominio, non un valore controllato dal browser;
- il dettaglio dello studio è il punto di ingresso naturale per i suoi figli;
- evitare terminologia di Apertura nelle posizioni previene ambiguità per l'utente.

Alternative considerate:

- Posizioni create da una pagina globale senza studio: scartato, perché contraddice il modello `Study -> Variant`.
- Riutilizzare indistintamente il bottone «Nuova variante»: scartato, perché richiederebbe mosse e lato da allenare, concetti non applicabili alle posizioni.

## Risks / Trade-offs

- [Validazione scacchistica più restrittiva di una semplice FEN sintattica] → Messaggi di errore specifici per campo e controlli frontend preventivi; il backend resta autorevole.
- [La libreria backend può accettare FEN sintatticamente valide ma semanticamente discutibili] → Aggiungere controlli espliciti di legalità della posizione oltre al semplice caricamento della FEN.
- [Cambio della FEN rende illegali mosse già salvate] → Rivalidare l'intero albero e rifiutare il salvataggio in modo atomico, senza cancellare mosse automaticamente.
- [Il campo tecnico `color` può creare ambiguità] → Derivarlo dal lato al tratto e nasconderne la semantica di training nelle posizioni.
- [I componenti di Mediogioco/Finale non sono ancora sezioni complete] → Limitare R25 al flusso di studio e alla creazione/modifica della posizione, mantenendo riutilizzabili routing e componenti per le change di sezione successive.

## Migration Plan

1. Estendere i contratti API e frontend per trasportare `startingFen` solo nel flusso delle posizioni non di apertura.
2. Introdurre l'editor visuale e i relativi controlli di validazione.
3. Rendere contestuale la validazione backend di FEN e albero mosse, risolvendo prima studio e fase.
4. Conservare `START_FEN` per Aperture e varianti legacy; non aggiornare né reinterpretare righe esistenti.
5. Aggiungere test di creazione, aggiornamento, FEN illegali, mosse incompatibili, albero vuoto e regressione Aperture.

Rollback: non essendoci migrazioni di schema o trasformazioni dati, un rollback applicativo lascia invariato il database. Le FEN custom già create restano dati testuali nella colonna esistente; una versione precedente può leggerle come `startingFen`, anche se non ne espone l'editor.

## Open Questions

Nessuna domanda aperta bloccante per questa change.
