## Context

Il modello attuale ha gia' una struttura `Study -> Variant`: lo studio raggruppa varianti/capitoli, la variante contiene nome, colore, albero mosse, `startingFen`, PGN sorgente e `studyId`.
Training, statistiche e review sono invece costruiti intorno alla `Variant`: una sessione di training denormalizza `studyId` dalla variante e aggiorna la schedule SM-2.

Mediogioco e Finale devono riusare il paradigma utente degli studi, ma con semantica diversa:

- nelle Aperture i capitoli sono varianti importabili da Lichess e allenabili;
- in Mediogioco e Finale i capitoli sono posizioni create manualmente;
- le posizioni possono avere una FEN iniziale custom;
- non devono entrare in training loop, SM-2 o import Lichess.

Il campo `startingFen` esiste gia' su `Variant`, ma oggi viene impostato alla posizione iniziale standard e non e' ancora esposto come input di creazione/modifica.

## Goals / Non-Goals

**Goals:**

- Definire un modello unico per distinguere Aperture, Mediogioco e Finale.
- Conservare il piu' possibile il modello `Study -> Variant`, gia' implementato e testato.
- Stabilire quali funzioni restano solo per Aperture: import Lichess, training, statistiche da training e review SM-2.
- Preparare le change successive senza anticiparne l'implementazione completa.

**Non-Goals:**

- Non implementare in questa change l'editor manuale della posizione.
- Non aggiungere ancora commenti o annotazioni alle mosse.
- Non costruire le viste definitive di Mediogioco e Finale.
- Non integrare ancora il gioco contro Stockfish da una posizione salvata.
- Non migrare lo storico di training/review oltre quanto serve a mantenere compatibili i dati esistenti.

## Decisions

### 1. Aggiungere la fase allo studio

Decisione: introdurre una enum di dominio `GamePhase` con valori `OPENING`, `MIDDLEGAME`, `ENDGAME` e aggiungere un campo `phase` a `Study`.

Razionale:

- lo studio e' il contenitore navigabile che appartiene a una fase del gioco;
- tutte le varianti/posizioni dentro lo stesso studio condividono la stessa fase;
- evita inconsistenze tra uno studio di Mediogioco e una variante marcata come Apertura;
- mantiene semplici lista, dettaglio e filtri per sezione.

Alternative considerate:

- `phase` su `Variant`: scartata perche' permette studi misti difficili da spiegare e impone controlli di coerenza su ogni inserimento.
- Entita' dedicate (`MiddlegameStudy`, `EndgameStudy`, `Position`): scartate per ora perche' duplicano CRUD, API, UI, cancellazione e test pur avendo una struttura molto simile a quella esistente.
- Tre tabelle separate per fase: scartate perche' aumentano il costo di evoluzione e rendono piu' difficile riusare componenti comuni.

### 2. Riusare `Variant` come capitolo/posizione

Decisione: continuare a usare `Variant` come elemento figlio dello studio. Nel linguaggio UI, una `Variant` di uno studio `OPENING` resta una variante/capitolo; una `Variant` di uno studio `MIDDLEGAME` o `ENDGAME` viene presentata come posizione.

Razionale:

- `Variant` contiene gia' `startingFen`, `tree`, `moves`, `sourcePgn` e `studyId`;
- le posizioni possono usare lo stesso albero mosse per linea principale, varianti laterali e sviluppo della posizione;
- evita una migrazione ampia prima di avere conferma sulle necessita' reali di Mediogioco/Finale.

Alternative considerate:

- Creare una nuova entita' `Position`: utile se in futuro le posizioni avranno attributi molto diversi, ma prematuro per questa fase.
- Rinominare `Variant` a livello codice: scartato in questa change perche' produrrebbe un refactor esteso senza cambiare comportamento.

### 3. Trattare `startingFen` come dato tecnico della posizione

Decisione: `startingFen` resta sulla `Variant` e diventa il dato tecnico usato dalle posizioni di Mediogioco/Finale. Per le Aperture resta valorizzato con la posizione iniziale standard.

Razionale:

- il campo esiste gia' e il frontend sa gia' calcolare la FEN corrente a partire da `startingFen` e dall'albero mosse;
- la change successiva `issue-016-custom-starting-fen` potra' estendere i payload di creazione/modifica per accettare e validare FEN custom;
- questa change deve decidere il dominio, non costruire l'editor.

Alternative considerate:

- Spostare la FEN iniziale su una nuova tabella posizione: scartato finche' `Variant` resta l'elemento figlio comune.
- Esporre subito input FEN nei payload: rinviato alla change dedicata all'editor/FEN.

### 4. Limitare import Lichess alle Aperture

Decisione: gli studi importati o sincronizzati da Lichess sono sempre `OPENING`. Le API di import non devono creare studi `MIDDLEGAME` o `ENDGAME`.

Razionale:

- il requisito esclude import Lichess per Mediogioco e Finale;
- i campi `sourceProvider`, `sourceStudyId`, `sourceUrl` e `lastImportedAt` rimangono coerenti con la semantica di apertura;
- il re-import distruttivo delle varianti non deve applicarsi a posizioni create manualmente.

Alternative considerate:

- Consentire import Lichess in ogni fase: scartato perche' fuori scope e potenzialmente ambiguo sul significato dei capitoli importati.
- Duplicare endpoint import per fase: scartato perche' non richiesto.

### 5. Bloccare training e review fuori dalle Aperture

Decisione: training loop e review SM-2 restano validi solo per varianti appartenenti a studi `OPENING` o per varianti legacy senza studio, trattate come Aperture.

Razionale:

- Mediogioco e Finale sono pensati per studio e gioco contro motore, non per memorizzazione ripetuta;
- `TrainingSessionService` e `ReviewService` oggi aggiornano automaticamente lo storico e la schedule: per evitare dati incoerenti, il backend deve rifiutare sessioni su varianti non `OPENING`;
- il frontend deve nascondere o disabilitare entrypoint di training/review nelle sezioni posizionali.

Alternative considerate:

- Permettere training anche sulle posizioni ma non creare review: scartato perche' introduce una semantica ibrida e statistiche difficili da interpretare.
- Consentire tutto e filtrare solo in UI: scartato perche' l'API deve proteggere il dominio anche da chiamate dirette.

### 6. Rinviare tag e categorie tematiche

Decisione: Mediogioco e Finale potranno avere in futuro tag o categorie tematiche, ma non vengono introdotti in questa change.

Razionale:

- i tag sono utili, ma richiedono una decisione distinta su livello di applicazione (`Study`, posizione o entrambi), normalizzazione, filtri e UI;
- per Mediogioco e Finale i tag piu' utili potrebbero essere sulle singole posizioni, non solo sullo studio;
- questa change deve fissare il modello base delle fasi, non progettare una tassonomia.

Alternative considerate:

- Aggiungere tag liberi solo su `Study`: scartato per ora perche' rischia di essere troppo limitato rispetto all'uso reale delle posizioni.
- Aggiungere subito tabelle relazionali per tag: scartato perche' amplia lo scope e richiede API/UI dedicate.

### 7. Rendere la fase non modificabile dopo la creazione

Decisione: la fase dello studio viene scelta alla creazione e non e' modificabile nella prima implementazione.

Razionale:

- cambiare fase puo' cambiare la semantica di import, training, review, statistiche e terminologia UI;
- uno studio `OPENING` importato da Lichess non deve diventare Mediogioco/Finale conservando metadati remoti e capitoli importati;
- una regola immutabile semplifica validazioni e migrazioni iniziali.

Alternative considerate:

- Permettere modifica libera della fase: scartata perche' richiede controlli complessi e casi limite non necessari ora.
- Permettere modifica solo per studi vuoti: possibile evoluzione futura, ma non necessaria per questa decisione di dominio.

### 8. Escludere statistiche Mediogioco/Finale da quelle di training

Decisione: le statistiche attuali restano basate sulle sessioni di training e quindi valgono solo per Aperture. Eventuali statistiche future per Mediogioco/Finale saranno progettate come modello distinto.

Razionale:

- Mediogioco e Finale non producono training session;
- il gioco contro motore, quando arrivera', avra' metriche diverse da errori su una linea memorizzata;
- riusare le statistiche attuali creerebbe dati vuoti o fuorvianti.

Alternative considerate:

- Mostrare statistiche vuote anche per posizioni: scartato perche' suggerisce una funzionalita' inesistente.
- Registrare il gioco contro motore come training: scartato perche' confonde studio libero e allenamento guidato.

## Risks / Trade-offs

- [Rischio] `Variant` resta un nome tecnico orientato alle aperture mentre in UI parleremo di posizioni. -> Mitigazione: accettare il nome tecnico nel backend e usare terminologia di fase nel frontend e nella documentazione.
- [Rischio] Un campo `phase` solo su `Study` richiede join o lookup per capire se una variante e' allenabile. -> Mitigazione: i flussi critici (`TrainingSessionService`, viste frontend) gia' risolvono o possono risolvere la variante/studio; evitare denormalizzazione finche' non serve.
- [Rischio] Le varianti legacy senza `studyId` non hanno fase esplicita. -> Mitigazione: trattarle come `OPENING` per retrocompatibilita'.
- [Rischio] L'upsert Lichess sostituisce varianti dello studio. -> Mitigazione: consentirlo solo per studi `OPENING` con sorgente Lichess.
- [Rischio] Futuri requisiti potrebbero rendere `Position` diversa da `Variant`. -> Mitigazione: questa scelta conserva un confine chiaro; se emergera' una divergenza reale, si potra' introdurre una entita' dedicata con migrazione mirata.
- [Rischio] Rinviare i tag rende meno ricche le prime liste Mediogioco/Finale. -> Mitigazione: mantenere lo scope iniziale su studi e posizioni, poi aprire una change dedicata quando emergera' la tassonomia utile.

## Migration Plan

1. Aggiungere `GamePhase` nel backend e il corrispondente tipo frontend.
2. Aggiungere colonna `phase` alla tabella `study` con default `OPENING` e valore obbligatorio.
3. Aggiornare `Study`, `StudyDto`, `CreateStudyRequest`, servizi e frontend model per esporre la fase.
4. Aggiornare liste/API per poter filtrare gli studi per fase quando verranno introdotte le sezioni dedicate.
5. Vincolare import Lichess a studi `OPENING`.
6. Bloccare la creazione di training session per varianti appartenenti a studi `MIDDLEGAME` o `ENDGAME`.
7. Mantenere le varianti legacy senza studio come `OPENING` implicite.

Rollback: la migrazione e' additiva; in caso di rollback applicativo, la colonna `phase` puo' restare inutilizzata. I dati esistenti restano compatibili perche' tutti gli studi attuali vengono marcati `OPENING`.

## Open Questions

Nessuna domanda aperta bloccante per questa change.
