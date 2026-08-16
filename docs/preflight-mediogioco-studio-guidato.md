# Preflight — R26.3: studio guidato del Mediogioco

> Documento preparatorio per le change OpenSpec di R26.3.
> Non è una specifica implementativa e non autorizza modifiche al codice.
> Decisioni di prodotto consolidate al 2026-08-16: **nessun punto di dominio aperto**.

## 1. Obiettivo e collocazione

Trasformare la sezione Mediogioco da archivio di posizioni e analisi a strumento di studio
guidato. L'utente deve poter aprire una posizione tratta da un libro, riflettere sulle idee,
giocare una continuazione, confrontarla con la soluzione memorizzata e consultare l'analisi
dell'autore. Un minimo di storico deve mostrare se la posizione è stata compresa nel tempo.

L'evolutiva è il rilascio **R26.3 — Studio guidato del Mediogioco**, collocato dopo R26.2 e
prima di R27. È un solo rilascio di prodotto realizzato con due change OpenSpec sequenziali:

1. `issue-016-middlegame-guided-study-model`;
2. `issue-016-middlegame-guided-study-flows`.

R26.3 è completa solo dopo la chiusura di entrambe. R27 Finale viene dopo e non fa parte di
questo perimetro.

## 2. Stato di partenza

R26/R26.1/R26.2 mettono già a disposizione:

- lista e CRUD degli studi `MIDDLEGAME`;
- creazione manuale di posizioni associate a un singolo studio;
- setup visuale e validazione backend della FEN iniziale;
- editor dell'albero delle mosse con mainline, rami, commenti e NAG;
- dettaglio, replay, analisi inizialmente nascosta e navigazione fra posizioni;
- Stockfish nel dettaglio;
- guard delle modifiche non salvate e layout responsive verificato;
- lato tecnico derivato dal lato al tratto della FEN;
- salvataggio di una posizione senza mosse.

Non esistono ancora tipologia tattica/strategica, catalogo dei temi, ordine di dominio,
tentativi persistiti o flussi guidati. Import/sync Lichess, training/SM-2, statistiche delle
Aperture e gioco contro il motore da una posizione restano separati.

## 3. Studio di Mediogioco

- La tipologia riguarda **solo** gli studi `MIDDLEGAME` in R26.3. Non si applica agli studi
  `OPENING` o `ENDGAME`.
- Ogni nuovo studio Mediogioco richiede `studyType = TACTICAL | STRATEGIC`, mostrato in UI
  come «Tattica» o «Strategia».
- La tipologia viene scelta alla creazione ed è immutabile.
- Uno studio può essere creato vuoto.
- Le posizioni ereditano la tipologia dello studio e non ne hanno una propria.
- L'eliminazione dello studio elimina a cascata posizioni e tentativi associati.
- Il solo riepilogo iniziale a livello di studio è il numero totale di posizioni; nessuna
  percentuale complessiva di comprensione.

### 3.1 Studi già esistenti

- Gli studi Mediogioco esistenti dopo la migrazione sono «Da classificare».
- Restano consultabili e modificabili con i flussi già presenti.
- Il flusso guidato rimane disabilitato finché l'utente non sceglie Tattica o Strategia.
- La prima classificazione è consentita una sola volta; da quel momento la tipologia è
  immutabile.

## 4. Catalogo dei temi

Il tema non viene copiato come descrizione nella posizione. La relazione è normalizzata:

- un catalogo persistente contiene un `id` stabile, un codice tecnico, la tipologia dello
  studio, la label visualizzata e l'ordine di presentazione;
- la posizione salva `themeId` e non la label;
- rinominare la label di un tema non modifica i riferimenti delle posizioni;
- il catalogo iniziale è inserito da Liquibase;
- R26.3 non include un'interfaccia CRUD per amministrare il catalogo;
- una posizione può cambiare tema, purché il nuovo tema sia compatibile con la tipologia
  immutabile dello studio;
- non esiste un tema generico «Altro» nella prima versione; la descrizione libera del tema
  resta sempre facoltativa.

### 4.1 Temi tattici iniziali

1. doppio attacco;
2. inchiodatura;
3. infilata;
4. attacco di scoperta;
5. deviazione;
6. adescamento;
7. eliminazione del difensore;
8. sovraccarico;
9. interferenza;
10. sgombero;
11. sacrificio;
12. attacco al re;
13. difesa tattica;
14. combinazione.

### 4.2 Temi strategici iniziali

1. struttura pedonale;
2. case deboli e case forti;
3. colonne e diagonali;
4. attività dei pezzi;
5. pezzo buono e pezzo cattivo;
6. spazio;
7. sviluppo e iniziativa;
8. profilassi;
9. cambi favorevoli;
10. piano di gioco;
11. attacco al re;
12. difesa e controgioco;
13. transizione al finale.

## 5. Posizione e metadati

- Ogni posizione appartiene a un solo studio.
- Una nuova posizione Mediogioco richiede titolo e tema compatibile con lo studio.
- I metadati sono:
  - `titolo`, obbligatorio;
  - `themeId`, obbligatorio per le nuove posizioni e dopo la regolarizzazione delle legacy;
  - `descrizione tema`, libera e facoltativa;
  - `descrizione posizione`, facoltativa;
  - `difficoltà`, facoltativa;
  - `fonte`, campo testuale libero e facoltativo;
  - `ordine nello studio`, obbligatorio e persistito.
- I livelli di difficoltà, modificabili anche in seguito, sono:
  `introduttivo`, `facile`, `intermedio`, `avanzato`, `esperto`.
- I tag liberi sono fuori scope.
- Le posizioni vengono inserite manualmente con gli strumenti già presenti; non è previsto
  import automatico da libri, PGN o cataloghi.

### 5.1 Ordine

- L'ordine è una sequenza contigua nello studio.
- Può essere modificato tramite posizione numerica o drag-and-drop.
- Inserimento, spostamento ed eliminazione rinumerano in modo atomico le posizioni coinvolte.
- Le posizioni esistenti ricevono automaticamente l'ordine che oggi deriva dall'`id`
  crescente, preservando la sequenza visibile corrente.

### 5.2 Posizioni già esistenti

- Dopo la migrazione restano consultabili e modificabili con l'indicazione «Tema da assegnare».
- Sono escluse dal flusso guidato e dalle sequenze finché non ricevono un tema compatibile.
- Una volta classificato lo studio, l'utente può assegnare o cambiare il tema.

### 5.3 Bozza

- Una posizione senza mainline è una `bozza`; lo stato è derivato e non richiede una colonna.
- La bozza si apre come scacchiera libera.
- Non offre risposta automatica, soluzione o comandi di esito.
- Non produce tentativi e viene esclusa automaticamente dalle sequenze.

## 6. Soluzione e albero dell'autore

- Ogni posizione completa contiene una mainline, unica soluzione ufficiale della prima versione.
- L'albero può contenere rami alternativi dell'autore per spiegazioni, confutazioni o idee.
- Mainline, rami, commenti e NAG restano contenuto didattico separato dai tentativi.
- I tentativi non possono modificare né arricchire l'albero.
- Esistono solo due stati di rivelazione nel flusso guidato:
  1. prima della soluzione l'intero albero autore è nascosto;
  2. dopo la soluzione l'intero albero è disponibile in sola lettura.
- Dopo la soluzione l'utente controlla il replay e può esplorare i rami.
- La mainline e la FEN restano modificabili dall'autore; lo storico precedente viene conservato
  senza una versione della soluzione. L'ambiguità storica è accettata consapevolmente in R26.3.
- I tentativi futuri usano sempre FEN e albero correnti.

## 7. Flusso tattico

1. La posizione parte dalla FEN iniziale e l'utente gioca il lato al tratto.
2. L'utente deve seguire esattamente la mainline.
3. Dopo ogni mossa corretta dell'utente l'app risponde con la mossa avversaria memorizzata.
4. Una deviazione interrompe subito il tentativo.
5. Il backend riceve transitoriamente le mosse tentate e valida l'esito contro la mainline
   corrente; nello storico persiste soltanto posizione, istante ed esito.
6. Una deviazione validata registra automaticamente `errata` e mostra la soluzione.
7. Il completamento validato della mainline registra automaticamente `compresa`.
8. Dopo successo o errore il replay della soluzione è disponibile, senza autoplay obbligatorio.
9. L'utente può riprovare; ogni prova è un evento indipendente.

Stockfish, barra di valutazione e rami alternativi non partecipano alla decisione di correttezza.

## 8. Flusso strategico

1. La posizione parte dalla FEN iniziale e l'utente gioca il lato al tratto.
2. Finché l'utente segue la mainline, l'app risponde con la mossa avversaria memorizzata.
3. Il motore è attivabile/disattivabile e parte spento; interviene soltanto dopo una deviazione.
4. La deviazione viene segnalata ma non determina automaticamente un esito.
5. Con motore spento, la risposta automatica si sospende e la UI mostra «Attiva motore per
   continuare»; `Mostra soluzione` e l'uscita restano disponibili.
6. Con motore attivo, Stockfish fornisce una sola migliore mossa di risposta tramite la capacità
   già disponibile; PV ed eval bar non sono requisiti del flusso.
7. Se il motore non è disponibile, la UI segnala il problema e lascia disponibili soluzione e
   uscita.
8. Le mosse del motore non vengono persistite, non diventano rami e non determinano l'esito.
9. `Mostra soluzione` riporta alla FEN iniziale e rende disponibile l'intero albero autore;
   il replay resta sotto il controllo dell'utente.
10. Dopo la soluzione l'utente registra manualmente `compresa` oppure `non compresa`.

## 9. Storico dei tentativi

Ogni tentativo è un evento indipendente. I soli dati persistenti di dominio sono:

- posizione;
- data e ora assegnate dal server;
- esito (`compresa`, `non compresa`, `errata`).

Non vengono persistiti mosse, durata, configurazione della sequenza, sessione, FEN o versione
della soluzione. Non è prevista l'eliminazione manuale del singolo tentativo.

Il riepilogo di posizione mostra:

- ultimo esito;
- numero totale di tentativi;
- data dell'ultima comprensione, se esiste.

La cancellazione della posizione elimina lo storico tramite una relazione referenziale reale;
la cancellazione dello studio propaga la rimozione a posizioni e tentativi.

## 10. Apertura manuale e modalità sequenziale

L'utente può scegliere manualmente una posizione completa dall'elenco oppure avviare una
sequenza. Entrambe le modalità alimentano lo stesso storico.

All'avvio di ogni sequenza l'utente sceglie separatamente:

- ordine dell'autore;
- ordine casuale;
- filtro `Tutte` — tutte le posizioni complete e classificabili;
- filtro `Mai tentate` — nessun evento storico;
- filtro `Da rivedere` — ultimo esito `non compresa` o `errata`;
- filtro `Comprese` — ultimo esito `compresa`.

Lo stato corrente deriva sempre dall'ultimo tentativo. Ordine e filtro non sono impostazioni
persistenti dello studio. Bozze, posizioni senza tema e posizioni di studi «Da classificare» sono
sempre escluse.

Durante la sequenza:

- `Posizione successiva` avanza dopo la conclusione del tentativo;
- `Salta posizione` non salva alcun tentativo, incrementa soltanto il contatore locale «senza
  esito», non altera uno stato storico precedente e passa alla posizione seguente;
- l'uscita anticipata conserva i tentativi già registrati ma non crea una sessione.

Il riepilogo finale non è persistito e mostra posizioni proposte, comprese, non comprese,
errate e senza esito.

## 11. Modello concettuale vincolante per l'analisi

### Studio

- `phase = MIDDLEGAME`, già esistente;
- `studyType = TACTICAL | STRATEGIC`, nullable nello schema per compatibilità ma obbligatorio
  per i nuovi studi Mediogioco e immutabile dopo la prima valorizzazione;
- relazione uno-a-molti verso le posizioni.

### Tema

- nuova entità/catalogo persistente;
- `id`, codice stabile, `studyType`, label, ordine e stato tecnico se necessario;
- dati iniziali inseriti da Liquibase;
- nessun CRUD utente in R26.3.

### Posizione

- riuso di `Variant` come contenitore posizionale;
- `startingFen`, titolo e albero già esistenti;
- `themeId`, `themeDescription`, `description`, `difficulty`, `source`, `positionOrder`;
- bozza derivata dall'assenza di mainline.

### Tentativo

- nuova entità `PositionAttempt` collegata tramite FK reale alla posizione;
- `positionId`, `occurredAt`, `outcome`;
- nessuna copia della mainline, della FEN o delle mosse.

## 12. Invarianti

- Tipologia applicata solo al Mediogioco e immutabile dopo la classificazione.
- Tema referenziato per ID e compatibile con la tipologia dello studio.
- Posizione appartenente a un singolo studio e ordine contiguo.
- Bozza senza esito e fuori dalle sequenze.
- Mainline unica soluzione ufficiale; rami autore mai modificati dai tentativi.
- Due soli stati di rivelazione: albero nascosto oppure intero albero visibile.
- Lato dell'utente uguale al lato al tratto della FEN corrente.
- Deviazione tattica uguale a errore immediato validato dal backend.
- Deviazione strategica segnalata senza esito automatico.
- Motore strategico usato solo dopo deviazione e mai dentro il training Aperture.
- Tentativi indipendenti e storico preservato dopo modifica di FEN/mainline.
- Riepilogo della sequenza derivato e non persistito.
- Aperture e contratti R26.1/R26.2 senza regressioni.

## 13. Perimetro

### Incluso

- tipologia e classificazione legacy degli studi;
- catalogo temi normalizzato e migrazione delle posizioni legacy;
- metadati, difficoltà e ordine;
- bozza;
- storico minimo e riepilogo posizione;
- validazione backend del tentativo tattico;
- flusso tattico e strategico;
- motore esplorativo dopo deviazione;
- apertura manuale, sequenza, filtri, skip e riepilogo finale;
- cascade, test, build, responsive e flussi E2E 68–81.

### Escluso

- Finale R27 e tipologia per studi `ENDGAME`;
- import automatico da libri o PGN;
- tag liberi e tema «Altro»;
- CRUD del catalogo temi;
- spaced repetition, SM-2, percentuali e sessioni persistenti;
- soluzioni tattiche multiple;
- memorizzazione delle mosse tentate o del motore;
- versionamento di FEN, mainline o soluzione;
- cancellazione manuale del singolo tentativo;
- PV/eval bar obbligatorie nel flusso strategico;
- gioco contro il motore dalla posizione (R28);
- multiutente, Supabase e sincronizzazione remota.

## 14. Piano OpenSpec

### Change A — modello

`issue-016-middlegame-guided-study-model` deve specificare e implementare:

- `studyType` e classificazione legacy;
- catalogo temi e seed;
- metadati e ordine delle posizioni;
- compatibilità «Tema da assegnare»;
- `PositionAttempt`, FK/cascade, storico e riepilogo;
- validazione server dei tentativi tattici;
- migrazioni portabili H2/PostgreSQL;
- test di modello/API e regressioni.

### Change B — flussi

`issue-016-middlegame-guided-study-flows`, dopo la chiusura di A, deve specificare e
implementare:

- nuova esperienza guidata separata dal training Aperture;
- flussi tattico e strategico;
- due stati di rivelazione e replay;
- motore strategico dopo deviazione;
- apertura manuale, sequenze, filtri, skip e riepiloghi;
- responsive, accessibilità, regressioni e checklist 68–81.

Le due change OpenSpec sono state create il 2026-08-16. Proposal, design, spec e task sono completi
e validi in strict per entrambe; i requisiti `SHALL` e gli scenari Given/When/Then recepiscono le
decisioni di questo documento. La validazione CLI non sostituisce i report di governance: per
ciascuna change, il triage standalone e i gate indipendenti di proposal, design+specs e tasks
previsti da `openspec-v2` devono precedere il relativo codice. Dopo i relativi esiti `READY`,
l'implementazione deve iniziare dalla change modello; le decisioni non vanno riaperte senza una
nuova evidenza di incompatibilità tecnica o di dominio.

## 15. Criteri minimi di accettazione

R26.3 non è chiusa finché non sono dimostrati almeno:

- nuovi studi tattici/strategici e classificazione una tantum delle legacy;
- catalogo temi referenziato per ID e compatibilità per tipologia;
- posizione legacy consultabile ma esclusa finché priva di tema;
- ordine migrato e riordinamento atomico;
- bozza libera senza esito;
- tattica corretta/errata validata dal backend;
- strategia con deviazione, motore spento/attivo/non disponibile ed esito manuale;
- albero nascosto prima e interamente disponibile dopo la soluzione;
- storico indipendente e preservato dopo modifica di FEN/mainline;
- filtri basati sull'ultimo esito, skip senza evento e riepilogo non persistito;
- cascade referenziale;
- test backend/frontend, build e flussi E2E 68–81 su database temporaneo;
- nessuna regressione Aperture, R26.1 e R26.2;
- nessuna modifica al database condiviso `backend/data/scacchi.mv.db` durante i gate.
