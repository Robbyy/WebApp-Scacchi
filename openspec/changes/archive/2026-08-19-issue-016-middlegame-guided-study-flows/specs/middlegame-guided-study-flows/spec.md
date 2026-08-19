## ADDED Requirements

### Requirement: Guided study uses dedicated middlegame routes and eligibility
Il sistema SHALL offrire lo studio guidato tramite rotte dedicate sotto `/middlegame`, separate
dal dettaglio posizionale e dal training Aperture. SHALL consentire un tentativo soltanto per una
posizione `MIDDLEGAME` appartenente a uno studio classificato, con tema assegnato e mainline non
vuota.

#### Scenario: Open one position manually
- **WHEN** l'utente sceglie di studiare una posizione eleggibile dall'elenco dello studio
- **THEN** il sistema apre `/middlegame/positions/{id}/study` e prepara un nuovo tentativo senza creare una sessione persistente

#### Scenario: Open sequential study
- **WHEN** l'utente sceglie lo studio sequenziale da uno studio Mediogioco classificato
- **THEN** il sistema apre `/middlegame/studies/{id}/study` e mostra la configurazione di ordine e filtro

#### Scenario: Reject a direct route for an ineligible position
- **WHEN** una route guidata identifica una bozza, una posizione senza tema, uno studio non classificato o una fase diversa da `MIDDLEGAME`
- **THEN** il sistema mostra uno stato controllato, non abilita mosse/esiti e offre il ritorno allo studio corretto

#### Scenario: Draft remains a free board outside guided study
- **WHEN** l'utente apre nel dettaglio ordinario una posizione Mediogioco senza mainline
- **THEN** il sistema mantiene la scacchiera libera senza soluzione, risposta automatica o comandi di esito

#### Scenario: Opening training remains separate
- **WHEN** l'utente apre `/variants/{id}/train` per una variante Apertura
- **THEN** il sistema conserva il training, i rami accettabili, le sessioni e la review esistenti senza usare il flusso guidato o Stockfish

### Requirement: Author content has two reveal states
Il sistema SHALL mantenere l'intero albero dell'autore nascosto durante ogni tentativo guidato e
SHALL renderlo interamente disponibile in sola lettura soltanto nello stato soluzione. Non SHALL
esistere uno stato intermedio che rivela la sola mainline.

#### Scenario: Start a guided attempt
- **WHEN** una posizione eleggibile entra nello stato di tentativo
- **THEN** il sistema mostra la FEN iniziale e non renderizza mainline, rami, commenti, NAG, contatore o replay

#### Scenario: Reveal the solution
- **WHEN** il flusso entra nello stato soluzione
- **THEN** il sistema torna alla FEN iniziale e mostra insieme mainline, rami, commenti, NAG, contatore e replay in sola lettura

#### Scenario: User controls solution replay
- **WHEN** la soluzione viene mostrata per successo, errore o richiesta manuale
- **THEN** il replay resta fermo sulla posizione iniziale finché l'utente non usa i controlli e non parte alcun autoplay

#### Scenario: Attempt cannot mutate author content
- **WHEN** l'utente gioca mosse o Stockfish risponde durante un tentativo
- **THEN** nessuna mossa viene aggiunta, modificata o eliminata da mainline, rami, commenti o NAG persistiti

#### Scenario: Hidden author content is not focusable
- **WHEN** il tentativo è in corso
- **THEN** nessun controllo o testo dell'albero nascosto è presente nel tab order o annunciato come contenuto disponibile

### Requirement: Tactical study follows the exact mainline
Il sistema SHALL trattare la mainline come unica soluzione tattica, SHALL rispondere
automaticamente con le mosse avversarie memorizzate e SHALL interrompere il tentativo alla prima
mossa utente diversa. Stockfish e i rami alternativi SHALL NOT influire sulla correttezza.

#### Scenario: Play a correct tactical move
- **WHEN** l'utente gioca la mossa prevista al proprio ply della mainline
- **THEN** il sistema accetta la mossa e, se prevista, applica automaticamente la successiva mossa avversaria della mainline prima di restituire il turno

#### Scenario: Complete the tactical mainline
- **WHEN** tutte le mosse richieste all'utente corrispondono alla mainline e la continuazione è terminata
- **THEN** il sistema invia le mosse utente al backend, attende la validazione e registra `UNDERSTOOD` soltanto dopo la risposta positiva

#### Scenario: Deviate from the tactical mainline
- **WHEN** l'utente gioca una mossa legale diversa da quella prevista
- **THEN** il sistema blocca immediatamente il tentativo, invia le mosse al backend e, dopo la conferma `FAILED`, mostra automaticamente la soluzione

#### Scenario: Alternative author branch is not a tactical solution
- **WHEN** la mossa utente coincide con un ramo alternativo ma non con `children[0]` della mainline
- **THEN** il sistema la tratta come deviazione e richiede al backend l'esito `FAILED`

#### Scenario: Tactical success reveals replay without autoplay
- **WHEN** il backend conferma `UNDERSTOOD`
- **THEN** il sistema entra automaticamente in soluzione dalla FEN iniziale e rende disponibile il replay senza avviarlo

#### Scenario: Backend rejects the tactical transcript
- **WHEN** l'API rifiuta le mosse per illegalità, dati cambiati o tentativo non concluso
- **THEN** il sistema non inventa né mostra come salvato un esito e offre errore controllato, ricaricamento o uscita

#### Scenario: Tactical flow has no engine controls
- **WHEN** l'utente studia una posizione di uno studio `TACTICAL`
- **THEN** il sistema non renderizza toggle Stockfish, barra di valutazione, PV o comandi equivalenti

### Requirement: Strategic study follows the authored line until deviation
Il sistema SHALL rispondere con la mainline memorizzata finché l'utente la segue in una posizione
strategica e SHALL segnalare una deviazione senza assegnare automaticamente un esito.

#### Scenario: Follow a strategic mainline move
- **WHEN** l'utente gioca la mossa prevista al proprio ply prima di una deviazione
- **THEN** il sistema applica automaticamente la successiva risposta avversaria della mainline e mantiene il tentativo aperto

#### Scenario: Deviate in strategic study
- **WHEN** l'utente gioca una mossa legale diversa dalla mainline
- **THEN** il sistema segnala la deviazione, non registra `FAILED` e passa alla modalità esplorativa

#### Scenario: Deviation occurs with engine off
- **WHEN** il tentativo strategico devia mentre il motore è disattivato
- **THEN** il sistema sospende la risposta automatica e mostra «Attiva motore per continuare» mantenendo disponibili «Mostra soluzione» ed uscita

#### Scenario: Engine was enabled before deviation
- **WHEN** il toggle motore è attivo ma l'utente non ha ancora deviato
- **THEN** il sistema continua a usare soltanto le risposte della mainline e non richiede mosse a Stockfish

#### Scenario: Mainline ends without a tactical verdict
- **WHEN** l'utente arriva alla fine della mainline in uno studio strategico
- **THEN** il sistema non assegna automaticamente un esito e rende disponibile la soluzione con valutazione manuale

### Requirement: Strategic engine responds only after deviation
Il sistema SHALL usare Stockfish soltanto dopo una deviazione strategica e SHALL richiedere una
singola migliore mossa per ogni risposta esplorativa necessaria. Le risposte SHALL restare
transitorie e SHALL NOT richiedere PV, MultiPV o barra di valutazione.

#### Scenario: Enable engine after deviation
- **WHEN** l'utente attiva il motore nello stato di deviazione sospesa
- **THEN** il sistema richiede una sola migliore mossa per la FEN corrente, blocca temporaneamente l'input e applica la risposta valida prima di restituire il turno

#### Scenario: Continue exploration with engine active
- **WHEN** dopo la prima risposta Stockfish l'utente gioca un'altra mossa legale con motore attivo
- **THEN** il sistema richiede una nuova singola risposta per la nuova FEN senza persistere la linea esplorativa

#### Scenario: Disable engine during exploration
- **WHEN** l'utente spegne il motore e poi gioca una mossa per cui servirebbe una risposta
- **THEN** il sistema sospende il ciclo e ripresenta l'invito all'attivazione senza avviare automaticamente Stockfish

#### Scenario: Engine is unavailable
- **WHEN** Stockfish restituisce nessuna mossa, un errore o una mossa non applicabile
- **THEN** il sistema mostra «Motore non disponibile», non inventa una risposta e lascia disponibili soluzione ed uscita

#### Scenario: Stale engine response arrives
- **WHEN** arriva una callback riferita a un tentativo, una posizione o una FEN non più corrente
- **THEN** il sistema ignora la risposta e non modifica board, stato o storico

#### Scenario: Reveal solution while engine is thinking
- **WHEN** l'utente richiede la soluzione durante un'analisi Stockfish
- **THEN** il sistema ferma/invalida la richiesta, torna alla FEN iniziale e impedisce a callback tardive di alterare la soluzione

### Requirement: Strategic outcome is manual after solution
Il sistema SHALL consentire all'utente di registrare `UNDERSTOOD` o `NOT_UNDERSTOOD` per una
posizione strategica soltanto dopo avere mostrato la soluzione. Uscire prima della scelta SHALL
lasciare il tentativo senza esito e senza evento persistito.

#### Scenario: Show strategic solution
- **WHEN** l'utente sceglie «Mostra soluzione» prima o dopo una deviazione
- **THEN** il sistema ferma il motore, scarta le mosse esplorative dalla board, torna alla FEN iniziale e rivela l'intero albero autore

#### Scenario: Mark strategic position understood
- **WHEN** nello stato soluzione l'utente sceglie «Compresa» e l'API accetta la richiesta
- **THEN** il sistema registra `UNDERSTOOD`, aggiorna il riepilogo e mostra la conferma

#### Scenario: Mark strategic position not understood
- **WHEN** nello stato soluzione l'utente sceglie «Non compresa» e l'API accetta la richiesta
- **THEN** il sistema registra `NOT_UNDERSTOOD`, aggiorna il riepilogo e mostra la conferma

#### Scenario: Leave before choosing an outcome
- **WHEN** l'utente esce dal tentativo strategico senza selezionare un esito
- **THEN** il sistema non chiama l'API tentativi e non modifica lo storico

#### Scenario: Outcome API fails
- **WHEN** il salvataggio dell'esito manuale fallisce
- **THEN** il sistema non aggiorna il riepilogo come se fosse riuscito e mantiene scelta, retry ed uscita disponibili

### Requirement: Manual study supports independent retries and history summary
Il sistema SHALL usare lo stesso storico per apertura manuale e sequenziale, SHALL mostrare ultimo
esito, numero totale di tentativi e data dell'ultima comprensione e SHALL registrare ogni riprova
conclusa come evento indipendente.

#### Scenario: Open a previously attempted position
- **WHEN** l'utente apre manualmente una posizione con storico
- **THEN** il sistema mostra ultimo esito, conteggio e ultima comprensione senza rivelare la soluzione del nuovo tentativo

#### Scenario: Retry a tactical position
- **WHEN** dopo un esito tattico l'utente sceglie «Riprova»
- **THEN** il sistema riparte dalla FEN con albero nascosto e il tentativo successivo può creare un nuovo evento senza sovrascrivere il precedente

#### Scenario: Retry a strategic position
- **WHEN** dopo un esito strategico l'utente sceglie «Riprova»
- **THEN** il sistema riparte con motore spento, albero nascosto e nessuna mossa esplorativa precedente

#### Scenario: History reflects a later understanding
- **WHEN** un nuovo tentativo `UNDERSTOOD` segue un esito precedente diverso
- **THEN** il riepilogo mostra `UNDERSTOOD` come ultimo esito, incrementa il conteggio e aggiorna l'ultima comprensione

### Requirement: Sequential study combines an order and a status filter
Il sistema SHALL richiedere a ogni avvio della sequenza un ordine tra autore e casuale e un filtro
tra `ALL`, `NEVER_ATTEMPTED`, `TO_REVIEW`, `UNDERSTOOD`. SHALL costruire uno snapshot locale delle
posizioni eleggibili e SHALL NOT persistere ordine, filtro o sessione.

#### Scenario: Start in author order
- **WHEN** l'utente sceglie ordine autore e un filtro
- **THEN** il sistema seleziona le posizioni eleggibili del filtro e le propone per `positionOrder` crescente

#### Scenario: Start in random order
- **WHEN** l'utente sceglie ordine casuale
- **THEN** il sistema mescola una sola volta lo snapshot delle posizioni eleggibili e conserva quell'ordine fino alla fine o all'uscita

#### Scenario: Filter all positions
- **WHEN** l'utente sceglie `ALL`
- **THEN** il sistema include tutte le posizioni complete con studio classificato e tema compatibile, escludendo bozze e incomplete

#### Scenario: Filter never attempted positions
- **WHEN** l'utente sceglie `NEVER_ATTEMPTED`
- **THEN** il sistema include soltanto le posizioni eleggibili con conteggio tentativi zero

#### Scenario: Filter positions to review
- **WHEN** l'utente sceglie `TO_REVIEW`
- **THEN** il sistema include soltanto le posizioni eleggibili il cui ultimo esito è `FAILED` o `NOT_UNDERSTOOD`

#### Scenario: Filter understood positions
- **WHEN** l'utente sceglie `UNDERSTOOD`
- **THEN** il sistema include soltanto le posizioni eleggibili il cui ultimo esito è `UNDERSTOOD`

#### Scenario: New attempts do not rebuild the snapshot
- **WHEN** un tentativo durante la sequenza cambia lo stato storico di una posizione
- **THEN** il sistema aggiorna il riepilogo ma non aggiunge, rimuove o riordina le altre posizioni dello snapshot corrente

#### Scenario: Reload sequential route
- **WHEN** l'utente ricarica la route dello studio sequenziale
- **THEN** il sistema ritorna alla scelta di ordine e filtro senza ricostruire una sessione precedente

#### Scenario: Filter has no eligible positions
- **WHEN** ordine e filtro producono uno snapshot vuoto
- **THEN** il sistema mostra uno stato vuoto e non crea tentativi o sessioni

### Requirement: Sequential navigation is explicit and supports skipping
Il sistema SHALL avanzare soltanto tramite un comando esplicito dopo un esito o tramite
`Salta posizione` prima dell'esito. Lo skip SHALL NOT creare eventi e SHALL NOT modificare lo stato
storico precedente della posizione.

#### Scenario: Advance after an outcome
- **WHEN** la posizione corrente ha un esito registrato e l'utente sceglie «Posizione successiva»
- **THEN** il sistema apre la posizione seguente dello snapshot con FEN iniziale e albero nascosto

#### Scenario: Skip before playing
- **WHEN** l'utente sceglie «Salta posizione» prima di ottenere un esito
- **THEN** il sistema non chiama l'API tentativi, conta localmente una posizione senza esito e avanza

#### Scenario: Skip after local moves
- **WHEN** l'utente sceglie «Salta posizione» dopo avere giocato mosse locali ma prima di un esito
- **THEN** il sistema chiede conferma e, se confermata, ferma il motore, scarta le mosse, non registra eventi e avanza

#### Scenario: Cancel skip confirmation
- **WHEN** l'utente annulla la conferma di skip con mosse locali
- **THEN** il sistema mantiene posizione, board, stato del tentativo e storico invariati

#### Scenario: Retry inside a sequence
- **WHEN** dopo un esito l'utente riprova la stessa posizione e ottiene un nuovo esito
- **THEN** il sistema conserva entrambi gli eventi ma classifica la posizione nel riepilogo della sequenza usando l'ultimo esito ottenuto nella sequenza

#### Scenario: Leave sequence early
- **WHEN** l'utente abbandona una sequenza prima della fine
- **THEN** gli eventi già accettati dal backend restano nello storico e nessuna sessione o configurazione viene persistita

### Requirement: Sequential summary is derived and not persisted
Il sistema SHALL mostrare al termine della sequenza un riepilogo locale con posizioni proposte,
comprese, non comprese, errate e senza esito. Ogni posizione proposta SHALL appartenere a una sola
categoria finale e il riepilogo SHALL NOT diventare una fonte di verità persistente.

#### Scenario: Count a proposed position once
- **WHEN** una posizione viene mostrata per la prima volta nello snapshot
- **THEN** il sistema incrementa `proposte` una volta anche se la posizione viene riprovata

#### Scenario: Complete a mixed sequence
- **WHEN** la sequenza termina con posizioni comprese, non comprese, errate e saltate
- **THEN** il sistema mostra i cinque conteggi e la somma delle quattro categorie finali coincide con le posizioni proposte

#### Scenario: Last retry outcome determines category
- **WHEN** una posizione produce più esiti nella stessa sequenza
- **THEN** il riepilogo la assegna alla categoria dell'ultimo esito della sequenza senza aumentare il numero di proposte

#### Scenario: Summary does not create a resource
- **WHEN** il riepilogo finale viene mostrato o chiuso
- **THEN** il sistema non invia né conserva un'entità sessione e lascia persistiti soltanto i singoli tentativi già registrati

### Requirement: Guided study is accessible responsive and regression safe
Il sistema SHALL mantenere il flusso guidato utilizzabile da tastiera e ai viewport
1600/1440/1024/768/375/320 px, SHALL annunciare i cambi di stato rilevanti e SHALL preservare i
contratti di Aperture e delle posizioni R26.1/R26.2.

#### Scenario: State change is announced
- **WHEN** il tentativo entra in deviazione, attesa motore, errore, soluzione o riepilogo
- **THEN** il sistema annuncia lo stato con semantica accessibile e sposta il focus soltanto quando serve a continuare il flusso

#### Scenario: Responsive guided layout
- **WHEN** l'utente usa uno dei sei viewport di accettazione
- **THEN** board, pannello, controlli e soluzione restano utilizzabili senza overflow orizzontale o contenuti focalizzabili fuori vista

#### Scenario: Positional detail and editors remain unchanged
- **WHEN** l'utente usa dettaglio, setup FEN o editor mosse fuori dalle nuove rotte guidate
- **THEN** analisi nascosta, geometria, breadcrumb, azioni e navigazione mantengono i contratti R26.1/R26.2

#### Scenario: Opening flows do not regress
- **WHEN** l'utente usa lista, import, dettaglio, editor, training, review, statistiche o gioco delle Aperture
- **THEN** il sistema conserva route, persistenza e comportamento esistenti senza mostrare controlli dello studio guidato Mediogioco

#### Scenario: Endgame remains outside guided study
- **WHEN** l'utente apre `/endgame` o una posizione `ENDGAME`
- **THEN** il sistema non espone le nuove rotte o azioni guidate di R26.3 e mantiene il perimetro pianificato di R27
