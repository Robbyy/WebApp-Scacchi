## Context

Questa è la change B di R26.3 e dipende dalla chiusura di
`issue-016-middlegame-guided-study-model`. La change A consegna tipologia dello studio, temi,
eleggibilità, ordine, storico/riepiloghi e un endpoint di tentativo che valida in modo autorevole
la tattica. Questa change costruisce l'esperienza utente sopra quei contratti senza introdurre
nuove tabelle.

Il dettaglio posizionale R26.1 resta una modalità di consultazione con «Mostra analisi»; il
training Aperture registra `TrainingSession`, usa rami accettabili e non integra Stockfish. Il
nuovo studio guidato richiede invece mainline unica per la tattica, valutazione manuale per la
strategia e motore esplorativo soltanto dopo una deviazione. Deve quindi vivere in rotte e
componenti dedicati.

## Goals / Non-Goals

**Goals:**

- offrire accesso manuale e sequenziale alle posizioni Mediogioco eleggibili;
- nascondere l'intero albero autore durante il tentativo e rivelarlo dopo la soluzione;
- applicare due flussi distinti derivati dal tipo persistito dello studio;
- registrare esiti tramite le API autorevoli della change A;
- usare Stockfish come singola risposta esplorativa dopo deviazione strategica;
- consentire filtri, ordine, skip, riprova e riepilogo non persistito;
- mantenere accessibilità, responsive e contratti R26.1/R26.2.

**Non-Goals:**

- modificare schema, catalogo temi o modello dei tentativi;
- riusare o estendere `TrainingSession`, review SM-2 o statistiche Aperture;
- accettare rami alternativi come soluzioni tattiche;
- persistere mosse, sequenze, configurazioni o risposte Stockfish;
- aggiungere PV, MultiPV, eval bar obbligatoria o impostazioni motore;
- applicare il flusso al Finale;
- modificare l'albero dell'autore durante un tentativo;
- introdurre percentuali di comprensione.

## Decisions

### 1. Rotte guidate separate preservano dettaglio e training

Vengono aggiunte sotto il contesto `MIDDLEGAME`, prima delle route dinamiche generiche:

```text
/middlegame/positions/:id/study  -- tentativo manuale della posizione
/middlegame/studies/:id/study    -- configurazione ed esecuzione sequenziale
```

La UI usa una feature dedicata, indicativamente `guided-study`, composta da un container di
sequenza e un componente riusabile di tentativo. Non si aggiunge logica a `VariantTraining` e non
si cambia `/middlegame/positions/:id`, che conserva «Mostra analisi».

Alternative scartate:

- trasformare il dettaglio in tentativo: mescola consultazione e valutazione e regredisce R26.1;
- riusare `/variants/:id/train`: viola routing, terminologia e persistenza Opening-only;
- route generica `/play`: R28 ha uno scopo differente.

### 2. L'eleggibilità viene verificata sia dal client sia dal backend

Una posizione è eleggibile quando:

- appartiene a uno studio `MIDDLEGAME` classificato;
- possiede un tema compatibile;
- non è bozza e contiene una mainline valida.

Il client usa questo stato per mostrare/nascondere CTA e filtrare sequenze; il backend lo rivalida
quando registra il tentativo. Una bozza resta consultabile come scacchiera libera nel dettaglio
ordinario, senza comandi di esito. Una route guidata aperta direttamente su contenuto non eleggibile
mostra uno stato controllato con ritorno allo studio e non crea eventi.

### 3. Il tentativo usa una macchina a stati esplicita

Stati principali:

| Stato | Albero autore | Input utente | Motore | Esiti |
|---|---|---|---|---|
| `LOADING` | assente | bloccato | spento | assenti |
| `USER_TURN` | nascosto | abilitato | spento/inattivo | assenti |
| `AUTO_REPLY` | nascosto | bloccato | inattivo | assenti |
| `DEVIATED_ENGINE_OFF` | nascosto | bloccato | spento | assenti |
| `ENGINE_THINKING` | nascosto | bloccato | attivo | assenti |
| `EXPLORATION_USER_TURN` | nascosto | abilitato | configurabile | assenti |
| `SAVING_OUTCOME` | nascosto o soluzione richiesta | bloccato | fermo | in invio |
| `SOLUTION` | interamente visibile | solo replay | fermo | registrato o selezionabile |
| `ERROR` | coerente con stato precedente | controllato | fermo | non duplicati |

Ogni caricamento, riprova o cambio posizione crea un `attemptEpoch`. Callback asincrone e risposte
HTTP vengono applicate soltanto se epoch, posizione e FEN corrente coincidono. La board resta
bloccata mentre l'applicazione o Stockfish devono rispondere.

### 4. Esistono due soli stati di rivelazione

Durante `USER_TURN`, deviazione ed esplorazione, mainline, rami, commenti, NAG, contatore e replay
non vengono renderizzati nel DOM. Il contenuto può essere già presente nella risposta API: il
vincolo è una protezione didattica UX, non un confine di sicurezza.

Entrando in `SOLUTION` la board torna sempre alla `startingFen`, l'intero albero autore diventa
visibile in sola lettura e i controlli di replay restano manuali. Non esiste autoplay e non esiste
uno stato intermedio «solo mainline».

### 5. La tattica segue la mainline unica e il backend chiude l'esito

Il componente mantiene l'elenco delle sole mosse SAN dell'utente.

1. L'utente gioca una mossa legale.
2. Il client la confronta con la mossa della mainline allo stesso ply per feedback immediato.
3. Se coincide e la mainline continua, il client applica automaticamente la risposta avversaria
   salvata e restituisce il turno.
4. Se diverge, l'input si blocca e il client invia subito `userMoves` all'endpoint tentativo.
5. Se tutte le mosse utente richieste sono corrette e la mainline termina, il client invia
   `userMoves` per la conferma `UNDERSTOOD`.
6. Soltanto la risposta backend crea l'evento e determina la label finale.

Esito `FAILED` o `UNDERSTOOD` porta automaticamente a `SOLUTION`; il replay parte dalla FEN ma non
si avvia da solo. Se il backend rifiuta per dati cambiati o payload incoerente, la UI non inventa un
esito: mostra l'errore, ricarica posizione/riepilogo su richiesta e consente uscita o nuovo tentativo.

I rami dell'autore non sono consultati per decidere correttezza. Stockfish non viene istanziato nel
flusso tattico.

### 6. La strategia usa la mainline finché esiste e il motore solo dopo deviazione

Prima della deviazione il client confronta la mossa utente con la mainline:

- se coincide, applica automaticamente la risposta avversaria salvata;
- se diverge, segnala la deviazione ma non assegna esito e passa alla modalità esplorativa.

Il toggle motore parte spento a ogni tentativo e può essere attivato/disattivato. Prima della
deviazione non genera mosse anche se l'utente lo ha attivato. Dopo la deviazione:

- se spento, la board resta sospesa in `DEVIATED_ENGINE_OFF` e mostra «Attiva motore per
  continuare»;
- se già attivo o appena attivato, viene richiesta una singola migliore mossa per la FEN corrente;
- dopo la risposta motore torna il turno all'utente; ogni successiva mossa utente esplorativa
  richiede una nuova singola risposta se il motore è attivo;
- se il motore viene spento, il ciclo si sospende alla successiva risposta necessaria.

`Mostra soluzione` e `Esci` sono sempre disponibili dopo la deviazione, anche con motore spento,
in errore o non disponibile. Le mosse esplorative restano nello stato locale della board e non
entrano nell'albero o nell'API dei tentativi.

### 7. Stockfish usa `requestBestMove` con protezione dalla race

Si riusa `StockfishService.requestBestMove(fen, movetime, callback)` con il budget fisso già
adottato dall'app; R26.3 non aggiunge impostazioni UCI. Il componente conserva il trio
`attemptEpoch + fenRequested + requestSequence` e ignora ogni callback che non coincide con lo
stato corrente. Su spegnimento, soluzione, riprova, cambio posizione o destroy chiama `stop()` e
invalida la sequenza.

La mossa UCI restituita viene validata/applicata con `chess.js` sulla FEN richiesta. `null`, errore
worker o mossa non applicabile producono «Motore non disponibile» senza fallback automatico e
senza attivare eval bar/PV.

Questa protezione è obbligatoria per il flusso R26.3; la race UCI generale fra analisi consecutive
resta tracciata separatamente sotto ISSUE-022.

### 8. La soluzione strategica precede sempre la valutazione manuale

`Mostra soluzione` ferma il motore, scarta le mosse esplorative dalla board, torna alla FEN e
rivela l'intero albero. Solo in questo stato vengono abilitati `Compresa` e `Non compresa`.
La scelta invia rispettivamente `UNDERSTOOD` o `NOT_UNDERSTOOD`; dopo successo aggiorna storico e
riepilogo. `FAILED` non è presentato nella strategia.

L'uscita prima della scelta non registra un evento. Un errore API mantiene la scelta visibile per
un retry esplicito e non aggiorna il riepilogo localmente come se fosse riuscita.

### 9. Modalità manuale e sequenziale condividono lo stesso tentativo

La modalità manuale apre una posizione scelta dall'elenco. Dopo un esito offre `Riprova` e ritorno
allo studio; ogni riprova conclusa crea un evento distinto.

La modalità sequenziale costruisce all'avvio uno snapshot locale degli ID eleggibili usando:

- ordine `AUTHOR` (`positionOrder ASC`) o `RANDOM`;
- filtro `ALL`, `NEVER_ATTEMPTED`, `TO_REVIEW`, `UNDERSTOOD`.

Definizioni:

| Filtro | Inclusione |
|---|---|
| `ALL` | tutte le posizioni eleggibili |
| `NEVER_ATTEMPTED` | nessun evento |
| `TO_REVIEW` | ultimo esito `FAILED` o `NOT_UNDERSTOOD` |
| `UNDERSTOOD` | ultimo esito `UNDERSTOOD` |

L'ultimo esito deriva dal riepilogo backend. L'ordine casuale viene generato una sola volta; lo
snapshot non viene ricalcolato quando un tentativo cambia lo stato durante la sequenza. Ordine e
filtro non vengono salvati. Un reload o accesso diretto alla route studio riparte dalla schermata
di configurazione.

### 10. Avanzamento, riprova, skip e riepilogo hanno semantica deterministica

Una posizione conta come `proposta` quando viene mostrata per la prima volta nella sequenza.
Dopo un esito, `Posizione successiva` avanza; non esiste avanzamento automatico. `Riprova` resta
disponibile e può creare più eventi per la stessa posizione, ma il riepilogo della sequenza
classifica quella posizione con l'ultimo esito ottenuto nella sequenza e la conta una sola volta.

`Salta posizione` è disponibile soltanto prima di un esito per la posizione corrente:

- non chiama l'API tentativi;
- scarta le mosse locali e ferma il motore;
- incrementa `senza esito` una sola volta;
- non modifica l'eventuale stato storico precedente;
- avanza alla posizione seguente;
- se esistono mosse locali, chiede conferma prima di scartarle.

Al termine, il riepilogo locale mostra proposte, comprese, non comprese, errate e senza esito. Le
quattro categorie di esito sono mutuamente esclusive per posizione e sommano alle proposte. Se il
filtro non produce posizioni, viene mostrato uno stato vuoto senza creare una sequenza persistente.
L'uscita anticipata conserva solo gli eventi già accettati dal backend e non mostra come completata
una sessione inesistente.

### 11. Accessibilità e responsive seguono i contratti posizionali

La board mantiene la geometria R26.1 e il pannello operativo usa lo slot laterale già stabilizzato.
Messaggi di deviazione, salvataggio e motore sono annunciati con regioni live non intrusive; il
focus passa a soluzione, errore o riepilogo quando lo stato cambia. I controlli restano azionabili
da tastiera e nessun contenuto nascosto dell'albero è focalizzabile.

La verifica usa 1600, 1440, 1024, 768, 375 e 320 px, senza overflow orizzontale. Aperture,
dettaglio posizionale, setup ed editor R26.1/R26.2 restano regressioni obbligatorie.

## Risks / Trade-offs

- **[Albero disponibile nella risposta ma nascosto solo in UI]** → limite dichiarato: protezione
  didattica, non sicurezza; nessun rendering o focus prima della soluzione.
- **[Esito client e backend divergono]** → il backend è autorevole; la UI non registra localmente
  finché la risposta non riesce.
- **[Callback Stockfish obsoleta]** → epoch/FEN/sequence guard e `stop()` su ogni transizione.
- **[Motore assente blocca l'esplorazione]** → soluzione e uscita sempre disponibili; nessun
  fallback che inventi una risposta.
- **[Reload perde la sequenza]** → comportamento intenzionale perché la sessione non è persistita;
  gli eventi già salvati restano.
- **[Riprova altera i conteggi]** → riepilogo per posizione, ultimo esito della sequenza, proposta
  contata una volta.
- **[API outcome fallisce dopo feedback UI]** → stato di salvataggio esplicito e nessuna conferma
  definitiva prima della risposta server.
- **[Componente guidato duplica logica scacchistica]** → riuso di board, tree utility e
  `chess.js`, con state machine isolata e testata anziché modificare training.

## Migration Plan

Nessuna migration di schema in questa change. Il rollout richiede la change modello già applicata
e verificata. Le nuove rotte possono essere rimosse in rollback senza perdere tentativi già
registrati; le API e il modello della change A restano compatibili. Test e preview usano H2
temporaneo e non il database condiviso.

## Open Questions

Nessuna. Label minori, durata fissa della singola richiesta motore e composizione CSS possono
seguire i pattern esistenti purché non cambino stati, persistenza, filtri o criteri di accettazione.
