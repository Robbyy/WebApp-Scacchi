## 1. Prerequisito e routing

- [ ] 1.1 Verificare che `issue-016-middlegame-guided-study-model` sia implementata, validata,
  archiviata senza `--skip-specs` e che i relativi contratti API siano disponibili.
- [ ] 1.2 Aggiungere le route canoniche `/middlegame/positions/:id/study` e
  `/middlegame/studies/:id/study` prima delle route dinamiche concorrenti, ereditando il contesto
  `MIDDLEGAME`.
- [ ] 1.3 Creare la feature/componenti `guided-study` separati da `VariantTraining`, riusando board,
  utility del tree, audio e replay senza importare persistenza training/review.
- [ ] 1.4 Implementare il caricamento e il gate di eleggibilità client con gestione controllata di
  fase errata, studio non classificato, tema mancante e bozza; il backend resta autorevole.
- [ ] 1.5 Aggiungere le CTA di accesso manuale e sequenziale soltanto nei contesti eleggibili,
  preservando dettaglio «Mostra analisi», setup ed editor esistenti.

## 2. Stato comune, soluzione e replay

- [ ] 2.1 Implementare la macchina a stati del tentativo con epoch per caricamento, turno utente,
  risposta automatica, deviazione, motore, salvataggio, soluzione ed errore.
- [ ] 2.2 Inizializzare ogni tentativo dalla `startingFen` e dal lato al tratto, bloccando input
  durante risposte automatiche, richieste motore e salvataggi.
- [ ] 2.3 Non renderizzare albero, mainline, rami, commenti, NAG, contatore o replay durante il
  tentativo e verificarne l'assenza dal tab order.
- [ ] 2.4 Implementare lo stato soluzione binario: stop asincroni, ritorno alla FEN, intero albero in
  sola lettura e replay manuale senza autoplay.
- [ ] 2.5 Garantire che mosse utente/motore non chiamino API di modifica variante e non alterino il
  tree autore in memoria condivisa o persistenza.
- [ ] 2.6 Aggiungere test comuni per transizioni, board lock, reset/riprova, due stati di rivelazione,
  replay e separazione dall'authoring.

## 3. Flusso tattico

- [ ] 3.1 Implementare il confronto immediato delle mosse utente con i relativi ply della mainline
  e la raccolta delle sole `userMoves` SAN.
- [ ] 3.2 Applicare automaticamente la risposta avversaria della mainline dopo ogni mossa corretta,
  gestendo anche una mainline che termina con la risposta avversaria.
- [ ] 3.3 Alla deviazione bloccare il tentativo e inviare `userMoves`; mostrare `FAILED` e soluzione
  soltanto dopo la validazione backend.
- [ ] 3.4 Al completamento inviare `userMoves`; mostrare `UNDERSTOOD` e soluzione/replay soltanto
  dopo la validazione backend, senza autoplay.
- [ ] 3.5 Gestire rifiuto API, risposta fuori ordine e dati ricaricati senza inventare un esito o
  creare eventi duplicati lato client.
- [ ] 3.6 Escludere completamente Stockfish, eval bar, PV e rami alternativi dal criterio tattico.
- [ ] 3.7 Aggiungere test frontend/API per successo, errore, ramo alternativo, risposta automatica,
  mainline pari/dispari, errore server, riprova e nessun motore.

## 4. Flusso strategico e Stockfish

- [ ] 4.1 Implementare le risposte dalla mainline prima della deviazione e la segnalazione non
  conclusiva della prima mossa diversa.
- [ ] 4.2 Inizializzare il toggle motore spento a ogni tentativo e impedirgli di generare mosse prima
  della deviazione anche quando viene attivato.
- [ ] 4.3 Con deviazione e motore spento sospendere la risposta, mostrare «Attiva motore per
  continuare» e mantenere disponibili soluzione ed uscita.
- [ ] 4.4 Dopo deviazione usare una sola `requestBestMove` per ogni risposta necessaria, applicare la
  mossa valida e restituire il turno senza persistere la linea esplorativa.
- [ ] 4.5 Implementare guard `attemptEpoch + FEN + requestSequence`, `stop()` e invalidazione su
  toggle off, soluzione, riprova, cambio posizione, uscita e destroy.
- [ ] 4.6 Gestire `null`, errore worker o bestmove non applicabile con «Motore non disponibile» e
  senza fallback, lasciando soluzione ed uscita.
- [ ] 4.7 Implementare `Mostra soluzione` da ogni stato strategico, scartando board esplorativa e
  abilitando soltanto dopo la rivelazione `Compresa`/`Non compresa`.
- [ ] 4.8 Registrare gli esiti strategici, aggiornare il riepilogo solo dopo successo API e
  mantenere retry/uscita in caso di errore.
- [ ] 4.9 Aggiungere test per mainline, deviazione con motore off/on, ciclo esplorativo, toggle,
  motore non disponibile, callback obsoleta, soluzione durante analisi ed esiti manuali.

## 5. Modalità manuale e storico

- [ ] 5.1 Mostrare nel flusso manuale ultimo esito, numero tentativi e ultima comprensione senza
  rivelare la soluzione del nuovo tentativo.
- [ ] 5.2 Implementare `Riprova` per tattica e strategia con reset completo di FEN, albero nascosto,
  mosse locali, motore e stato, creando un nuovo evento soltanto alla conclusione.
- [ ] 5.3 Implementare ritorno allo studio/posizione e uscita senza esito, preservando soltanto gli
  eventi già accettati dal backend.
- [ ] 5.4 Aggiornare lo storico e il riepilogo dopo ogni esito riuscito e gestire risposte HTTP fuori
  ordine rispetto a riprova o navigazione.
- [ ] 5.5 Aggiungere test di tentativi multipli, passaggio da errore/non compresa a compresa, uscita
  senza esito e regressione del dettaglio ordinario.

## 6. Configurazione e snapshot sequenziale

- [ ] 6.1 Implementare la schermata di avvio con scelta obbligatoria e indipendente di ordine
  `AUTHOR|RANDOM` e filtro `ALL|NEVER_ATTEMPTED|TO_REVIEW|UNDERSTOOD`.
- [ ] 6.2 Costruire lo snapshot delle sole posizioni eleggibili usando ordine e riepiloghi backend,
  con le definizioni esatte dell'ultimo esito e senza percentuali.
- [ ] 6.3 Generare l'ordine casuale una sola volta e non ricostruire lo snapshot quando gli esiti
  della sequenza cambiano lo storico.
- [ ] 6.4 Gestire filtro vuoto, reload e accesso diretto tornando alla configurazione senza
  persistere o ricostruire una sessione precedente.
- [ ] 6.5 Aggiungere test per quattro filtri, due ordini, esclusione bozze/incomplete, snapshot
  stabile, stato vuoto e assenza di storage/session API.

## 7. Avanzamento, skip e riepilogo

- [ ] 7.1 Contare una posizione come proposta al primo ingresso e abilitare «Posizione successiva»
  soltanto dopo un esito registrato, senza avanzamento automatico.
- [ ] 7.2 Implementare `Salta posizione` prima dell'esito senza chiamare l'API tentativi, senza
  cambiare lo stato storico e incrementando una sola volta «senza esito».
- [ ] 7.3 Richiedere conferma dello skip quando esistono mosse locali; su annullamento mantenere
  board/stato, su conferma fermare il motore e scartare il tentativo locale.
- [ ] 7.4 Consentire la riprova nella sequenza e classificare la posizione con l'ultimo esito della
  sequenza senza incrementare nuovamente le proposte.
- [ ] 7.5 Mostrare al termine proposte, comprese, non comprese, errate e senza esito come categorie
  mutuamente esclusive e non persistire il riepilogo.
- [ ] 7.6 Gestire uscita anticipata conservando gli eventi già salvati e senza dichiarare conclusa o
  persistere una sessione.
- [ ] 7.7 Aggiungere test per next, skip vuoto/con mosse/annullato, riprova, conteggi, somma delle
  categorie, ultima posizione e uscita anticipata.

## 8. Accessibilità, responsive e regressioni

- [ ] 8.1 Implementare regioni live e gestione focus per deviazione, attesa/errore motore,
  salvataggio, soluzione e riepilogo, mantenendo i controlli raggiungibili da tastiera.
- [ ] 8.2 Integrare board e pannello nel layout posizionale stabile senza overflow e senza spostare la
  geometria nei passaggi di stato o al toggle motore.
- [ ] 8.3 Estendere i test frontend per routing, accessibilità, ordine DOM, assenza di contenuto
  nascosto focalizzabile e regressioni R26.1/R26.2.
- [ ] 8.4 Riverificare lista/import/dettaglio/editor/training/review/statistiche/gioco Aperture e
  assenza delle azioni guidate in Finale.

## 9. Gate R26.3

- [ ] 9.1 Eseguire suite backend e frontend complete e build Angular, registrando conteggi e warning
  realmente osservati.
- [ ] 9.2 Verificare su H2 temporaneo i flussi E2E 72–81 e rieseguire per regressione 68–71,
  includendo i viewport 1600/1440/1024/768/375/320 px, console e rete.
- [ ] 9.3 Verificare esplicitamente i casi motore spento, non disponibile e callback obsoleta senza
  usare il database condiviso.
- [ ] 9.4 Controllare prima e dopo i gate che `backend/data/scacchi.mv.db` non sia stato modificato,
  ripristinato o incluso e rimuovere soltanto dati temporanei creati dal test.
- [ ] 9.5 Aggiornare checklist, stato corrente, piano, backlog, roadmap e README con evidenze e
  conteggi reali; dichiarare R26.3 completa solo dopo entrambe le change.
- [ ] 9.6 Eseguire `openspec validate --all --strict`, verifica semantica e review finale; archiviare
  `issue-016-middlegame-guided-study-flows` senza `--skip-specs` soltanto dopo tutti i gate.
- [ ] 9.7 Confermare nella pianificazione che R27 `issue-016-endgame-section` è il rilascio
  successivo e non eredita automaticamente `studyType` o i flussi guidati senza una decisione futura.
