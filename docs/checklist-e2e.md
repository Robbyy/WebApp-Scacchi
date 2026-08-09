# Checklist E2E manuale - WebApp Scacchi

> Checklist ripetibile per la validazione manuale end-to-end (aggiornata fino alla candidata
> evolutiva R23, ancora da chiudere dopo la correzione dei P1 documentati nel backlog).
> Eseguibile in pochi minuti dopo ogni rilascio significativo, prima di dichiararlo completato.
> Complementare ai test automatici (vedi sezione "Copertura automatica" in fondo).

## Prerequisiti

1. Backend avviato su `http://localhost:8080`
   - da `backend/`: `mvnw.cmd spring-boot:run`
   - in locale impostare `MAVEN_OPTS=-Djavax.net.ssl.trustStoreType=Windows-ROOT` (TLS) e usare **PowerShell** per i comandi di rete.
2. Frontend avviato su `http://localhost:4200` (`npm start` da `frontend/`).
3. Header dell'app: il badge mostra **«backend online»** (verde). In caso contrario il backend non è raggiungibile.
4. DevTools aperti su Console: **nessun errore** deve comparire durante i flussi.

---

## Flussi core (12)

- [ ] **1. Creare uno studio** — dalla home `Nuovo studio` (si apre la pagina `/studies/new`, R22) → nome «Studio E2E», colore a scelta → `Crea studio`. Compare un **toast** di conferma e si apre il **dettaglio** dello studio creato; tornando alla home lo studio è presente.
- [ ] **2. Creare una variante lineare nello studio** — aprire «Studio E2E» → `Nuova variante` → giocare `1.e4 e5 2.Cf3`, nome «Test E2E», lato Bianco → `Salva variante`. Compare un **toast** di conferma e si apre il dettaglio.
- [ ] **3. Verificarla nello studio** — tornare allo studio: la variante è presente tra i capitoli con badge colore e numero mosse corretti.
- [ ] **4. Replay (R23)** — la barra ha **quattro** controlli: inizio, precedente, successiva, fine (nessun Auto-play/Pausa, ISSUE-008). Usarli tutti e scorrere anche con le frecce `←/→` da tastiera; il contatore «Semimossa n / N» segue la navigazione.
- [ ] **5. Allenarla fino al completamento** — `Allena questa variante` → giocare la linea corretta fino allo stato **«completata»**.
- [ ] **6. Mossa errata in allenamento** — riavviare e giocare una mossa sbagliata: compare il **feedback di errore** e il contatore errori aumenta; la posizione non avanza.
- [ ] **7. Modificarla e salvare** — dal dettaglio `Modifica variante` → cambiare nome/mosse → `Salva modifiche`. Toast di conferma; le modifiche persistono dopo riapertura.
- [ ] **8. Aggiungere una sotto-variante** — nell'editor, da una posizione giocare una mossa **diversa** dalla mainline: si crea una **variante** (mostrata tra parentesi, badge «variante»).
- [ ] **9. Allenare una variante con rami** — allenare una variante che ha più risposte valide dal lato dell'utente: tutte le mosse corrette sono accettate.
- [ ] **10. Importare un PGN breve nello studio** — da «Studio E2E» usare `Importa PGN` → incollare una linea singola → anteprima mosse corretta → `Salva`. Toast di conferma; tornando allo studio la variante importata è presente.
- [ ] **11. Importare un PGN più lungo** — incollare un PGN con molte mosse: anteprima corretta, salvataggio riuscito (`sourcePgn` conservato).
- [ ] **12. Eliminare una variante** — dal dettaglio studio, icona cestino sulla variante → **dialog di conferma** → `Elimina`: toast «Variante eliminata» e la variante sparisce dallo studio.

---

## Flussi aggiunti (Parte 2: P7-P19)

- [ ] **13. Validazione backend (P7)** — tentare di salvare via API un payload con mossa illegale (es. `moves: ["e4","e4"]`): risposta **400** con `{ field, ply, message }`. Nell'editor/import un eventuale errore di validazione viene mostrato come messaggio.
- [ ] **14. Drag and drop pulito (P7)** — trascinare un pezzo: viene trascinato **solo il pezzo** (niente sfondo della casa) e la casa di partenza resta **vuota** durante il trascinamento. La cornice della scacchiera è sottile, coordinate leggibili.
- [ ] **15. Promuovi a mainline (P8)** — nell'editor, posizionarsi su una variante e premere **«Rendi mainline»**: la linea scelta diventa la principale (badge «mainline», `moves` aggiornate).
- [ ] **16. Conferma cancellazione sottoalbero (P8)** — nell'editor, su un nodo con figli premere «Elimina mossa»: compare la **conferma**; `Annulla` lascia intatto, `Elimina sottoalbero` rimuove.
- [ ] **17. Guard modifiche non salvate (P9)** — nell'editor con modifiche non salvate, premere `Annulla`/navigare via: compare il dialog **«Modifiche non salvate»**; `Esci senza salvare` naviga, l'altra opzione resta.
- [ ] **18. Toast esiti (P9)** — salvataggi ed eliminazioni mostrano un **toast** (successo/errore) in basso a destra, con auto-dismiss.
- [ ] **19. Home a studi (P12)** — dalla home si vedono gli studi, il conteggio varianti e il link al dettaglio; il dettaglio mostra breadcrumb e azioni `Nuova variante` / `Importa PGN`.
- [ ] **20. Eliminazione studio a cascata (P12)** — eliminare «Studio E2E»: il dialog avvisa che verranno eliminate anche le varianti; confermando, lo studio sparisce dalla home e le sue varianti non sono più raggiungibili.
- [ ] **21. Suono mossa attivo (P12)** — con toggle audio attivo, eseguire una mossa legale sulla scacchiera: si sente un suono breve e secco.
- [ ] **22. Toggle audio persistente (P12)** — disattivare il toggle audio, eseguire una mossa: nessun suono. Ricaricare la pagina: il toggle resta disattivato; riattivarlo a fine test.
- [ ] **23. Import PGN con varianti annidate (P13)** — `Importa PGN` → incollare un PGN con varianti tra parentesi (es. `1. e4 e5 (1... c5 2. Nf3 d6) 2. Nf3 Nc6 (2... d6 3. d4) 3. Bb5 a6`): l'**anteprima ad albero** mostra mainline + varianti e il riepilogo «N mosse · M varianti». Salvando, nel dettaglio/editor si ritrovano i **rami** (e5/c5 e Nc6/d6 come alternative). Un PGN con commenti `{...}`/NAG non rompe il parsing; una mossa illegale mostra un errore.
- [ ] **24. Import studio Lichess (P14, R22)** — dalla home `Nuovo studio` (`/studies/new`) → incollare l'URL di uno **studio pubblico** (es. `https://lichess.org/study/XXXXXXXX`) → `Anteprima`: compaiono l'elenco capitoli (colore, mosse, varianti) e i campi **nome/colore precompilati** con i suggerimenti Lichess (un valore già digitato **non** viene sovrascritto). `Importa come nuovo studio` crea lo studio locale con una variante per capitolo; aprendo una variante i rami sono presenti e il training funziona.
- [ ] **25. Import singolo capitolo nello studio (P14, R22)** — dal dettaglio di uno studio `Importa da Lichess` (si apre `/studies/new?studyId=…`, senza campi metadati) con un URL di **capitolo** (`/study/{id}/{chapterId}`): l'avviso spiega che i capitoli saranno **aggiunti** (varianti e metadati esistenti invariati) e viene aggiunta **una** variante allo studio corrente.
- [ ] **26. Errori import Lichess (P14, R22)** — URL non valido → messaggio «Link Lichess non valido»; studio inesistente/non pubblico → «non trovato o non pubblico»; con un link incollato ma **senza anteprima** il submit resta disabilitato con l'hint «Usa "Anteprima"…»; nessun dato parziale salvato.
- [ ] **27. Re-import / sync senza duplicati (P15, R22)** — re-importare lo stesso studio pubblico già importato: l'anteprima mostra l'avviso **«già importato … verrà aggiornato»**, i campi metadati si **disabilitano** mostrando i valori locali che resteranno invariati e il pulsante diventa **«Aggiorna lo studio»**. Confermando, lo studio **non** viene duplicato nella home; le sue varianti sono sostituite con quelle correnti.
- [ ] **28. Metadati locali preservati nel sync (P15)** — rinominare/descrivere localmente uno studio importato, poi re-importarlo: nome, descrizione e colore locali **restano invariati**, solo le varianti cambiano.
- [ ] **29. OAuth Lichess per studi privati (P15, R22)** — premere il comando **Lichess** nella **topbar** (vicino al toggle suono), autorizzare su Lichess (login reale), tornare all'app: si riapre la **pagina di partenza** e il comando diventa verde (`aria-pressed`). Importare un proprio studio **privato/unlisted** → i capitoli vengono letti e importati. Ri-premendo il comando ci si disconnette (toast, token di sessione rimosso).
- [ ] **30. Motore + barra di valutazione (P16, R21)** — nel **dettaglio** (o editor) di una variante premere **«Motore»**: compare la **barra di valutazione** con un punteggio (es. «+0.8») e la profondità accanto al pulsante. Il toggle è **l'unico controllo**: non esiste più «Nascondi/Mostra barra» (ISSUE-007); ri-premendo «Motore» si spegne e la barra sparisce.
- [ ] **30-bis. Linea migliore del motore (ISSUE-022, R21)** — nel **dettaglio** variante, acceso il motore: sotto i controlli e **prima** di «Allena questa variante» compare «Linea migliore» con «Analisi in corso…» e poi la linea in **SAN numerata** (es. «1. e4 e5 2. Nf3»), mai in coordinate UCI. Navigando a un'altra posizione la linea viene **sostituita** (nessuna linea obsoleta); spegnendo il motore linea e barra spariscono insieme e, riaccendendolo su un'altra posizione, **non** riappare la linea precedente (si riparte da «Analisi in corso…»). Il testo va a capo nel pannello: nessun contenuto sotto la scacchiera e nessuno scorrimento orizzontale della pagina. Nell'**editor** la linea **non** compare.
- [ ] **31. Gioca contro il computer (P16)** — premere **«Gioca contro il computer»**: si apre una **nuova tab** `/play?fen=...` con la posizione corrente (la tab originale resta invariata). Giocando una mossa legale, il computer risponde; «Ricomincia» riparte dalla posizione iniziale.
- [ ] **32. Niente motore in allenamento (P16)** — avviare un allenamento: **non** devono esserci toggle motore, barra di valutazione né «gioca contro il computer».
- [ ] **33. Registrazione sessione di allenamento (P17)** — completare un allenamento: al termine compare «Sessione registrata ✓». Via API `GET /api/training-sessions?variantId={id}` la sessione è presente con esito, numero errori e conteggio mosse; `GET /api/training-sessions/{id}` mostra le mosse tentate (anche quelle sbagliate). Un allenamento senza alcuna mossa giocata **non** crea sessioni.
- [ ] **34. Statistiche variante (P18)** — dal dettaglio variante → «Statistiche»: dopo qualche allenamento si vedono allenamenti, completati, errori totali/medi, **precisione %**, ultima esecuzione e l'elenco delle **mosse più sbagliate**. Una variante mai allenata mostra l'invito ad allenarla.
- [ ] **35. Statistiche studio (P18)** — dal dettaglio studio → «Statistiche dello studio»: i totali aggregano le varianti dello studio e la tabella per‑variante riporta le metriche (con link alle statistiche di ciascuna variante). L'aggregato somma correttamente le varianti.
- [ ] **36. Pianificazione ripetizione (P19)** — completare un allenamento di una variante **senza errori**: nel dettaglio compare «Prossima ripetizione: <data> (Domani)» e la variante **non** è dovuta oggi. Completare un allenamento con **molti errori** (≥3): l'indicatore diventa «Da ripetere» (evidenziato) e la variante torna dovuta **oggi**. Una variante mai allenata non mostra l'indicatore.
- [ ] **37. Vista «Ripeti oggi» (P19)** — in home compare il link **«Ripeti oggi»** con il **badge** del numero di varianti dovute; aprendolo (`/reviews`) si vede l'elenco delle varianti dovute con studio e stato («Da ripetere oggi» / «In ritardo di N giorni»). Il pulsante **«Allena»** avvia il training della variante. Senza varianti dovute, la vista mostra l'empty-state e il badge sparisce.

---

## Flussi aggiunti (evolutive R22)

- [ ] **38. Pagina unica creazione/import (ISSUE-011, R22)** — la home **non** ha più il form inline né il CTA «Importa da Lichess»: solo `Nuovo studio` (link a `/studies/new`) e «Ripeti oggi». Aprire `/studies/import-lichess?studyId={id}` a mano: reindirizza a `/studies/new?studyId={id}` **conservando** il query param. Con `?studyId` inesistente compare l'errore dedicato «Studio di destinazione non trovato» (niente form). Compilare i campi su `/studies/new`, premere il comando Lichess in topbar (o ricaricare la pagina): al ritorno i campi sono **ripristinati** dalla bozza; navigando via in-app la bozza viene scartata.
- [ ] **39. Modifica studio inline (ISSUE-012, R22)** — nel dettaglio studio premere **«Modifica»**: si espande il form inline precompilato (nome/descrizione/colore, stessi campi della creazione). Salvare: toast, intestazione aggiornata (titolo/descrizione/badge) e varianti intatte; la **fase non compare** e resta invariata. «Annulla» richiude senza modifiche.
- [ ] **40. Griglia home a due colonne (ISSUE-009, R22)** — a larghezza desktop (≥ ~1024px) le card degli studi sono su **due colonne** (mai tre); restringendo sotto ~700px la lista ricade a **una colonna**. Stile e azioni delle card invariati; nessuno scorrimento orizzontale della pagina a 1440/1024/768/320/280px, topbar compresa (sotto ~1040px il comando Lichess è a sola icona; ≤400px lo stato backend è un pallino colorato).

---

## Flussi aggiunti (evolutive R23)

- [ ] **41. Pannello varianti nel dettaglio (ISSUE-010, R23)** — aprire una variante di uno studio con **almeno due** varianti. A **≥1500px** compare la colonna «Varianti» a sinistra della scacchiera (rail ~220px), con nome, badge colore e numero mosse di ogni variante e quella aperta evidenziata; il pulsante «Varianti» **non** compare. Cliccando un'altra voce si apre il suo dettaglio (titolo, badge, mosse e contatore aggiornati) senza passare dal dettaglio studio; la scacchiera **non** cambia dimensione né si sposta e non compare nulla sotto di essa. Aprire poi una variante **senza studio** (legacy) e una in uno studio con **una sola** variante: né rail né pulsante.
- [ ] **42. Drawer varianti sotto i 1500px (ISSUE-010, R23)** — a 1440px o meno il rail sparisce e nel pannello laterale compare il pulsante **«Varianti»** (`aria-expanded`). Premendolo si apre un drawer a sovrapposizione da sinistra: il focus va al pulsante di chiusura, `Esc` e il pulsante «×» lo chiudono, e scegliere una variante naviga **e** richiude il drawer. Con il drawer aperto la scacchiera resta nella stessa posizione e dimensione. Ripetere a 1024/768/375/320px: nessuno scorrimento orizzontale della pagina, il drawer non taglia i nomi.
- [ ] **43. Cambio variante dall'editor (ISSUE-010, R23)** — in `/variants/{id}/edit` c'è il solo pulsante «Varianti» (mai il rail, a nessuna larghezza). **Senza** modifiche, scegliere un'altra variante la carica subito (nome, lato e mosse aggiornati, nessun dialog). **Con** modifiche non salvate, la scelta apre il dialog «Modifiche non salvate»: `Annulla` resta sulla variante corrente **conservando** la modifica e lascia il drawer aperto; `Esci senza salvare` carica la variante scelta — il dialog **non** deve ricomparire una seconda volta.
- [ ] **44. Motore al cambio variante (ISSUE-010/022, R23)** — nel dettaglio, con il **motore acceso** e la «Linea migliore» visibile, passare a un'altra variante: il toggle resta acceso, valutazione e linea si svuotano, compare «Analisi in corso…» e la profondità **riparte dal basso** con una linea nuova. Non deve mai restare visibile la linea della variante precedente.

---

## Pulizia

- [ ] Eliminare studi e varianti di test creati durante la checklist, lasciando i seed di default.

---

## Copertura automatica

Questi flussi sono coperti anche da test automatici (da eseguire prima della checklist manuale):

- **Backend** (`mvnw.cmd test` — **84 test**): CRUD varianti, validazione legalità (mainline e albero, `400` strutturato), round-trip albero `tree → DB → DTO`, `MoveNode`/mainline, CRUD studi (creazione variante nello studio, cancellazione a cascata, import bulk e upsert Lichess), sessioni di allenamento (`TrainingSessionControllerTest`), statistiche (`StatsControllerTest`), spaced repetition (`ReviewSchedulerTest` SM-2 puro + `ReviewControllerTest`).
- **Frontend** (`npm test -- --watch=false` — **279 test**): scacchiera (click, drag, promozione, hide-on-drag, audio), editor (mosse, varianti, promuovi a mainline, conferma cancellazione, guard, creazione in studio), training (mosse corrette/errate, rami, completamento, audio, submit sessione), studi (lista/dettaglio/eliminazione, CTA e modifica inline R22), pagina unica creazione/import R22 (`study-new` — creazione locale, anteprima e suggerimenti, upsert con metadati locali, `?studyId` valido/inesistente/non-Aperture, errore di import parziale, bozza `sessionStorage`; redirect della route storica in `app.routes`), import PGN (anche in studio) e parser `pgn`, import/auth Lichess (`lichess`, `lichess-auth`), comando Lichess in topbar (`app`), motore (`uci` — parsing PV completa, `pvToSan`, `numberedPv` —, `play`, `stockfish.service` — ciclo spegnimento/riaccensione con worker finto e righe `info` tardive), linea migliore e toggle unico del pannello motore R21 (`variant-detail`, `variant-editor`), pannello varianti R23 (`study-variant-nav` — elenco, variante attiva, sola notifica della selezione, focus/Esc del drawer — più i casi senza pannello, il cambio dal dettaglio, il cambio dall'editor pulito/sporco, la reazione al cambio di `:id`, il riavvio dell'analisi e l'assenza di Auto-play in `variant-detail`/`variant-editor`), statistiche (`stats-format`, `stats.service`, `variant-stats`, `study-stats`), ripetizione (`review-format`, `review.service`, `review-due`), navigazione R20 (`app`, `app.routes`, `study-sections`, `coming-soon`), più i servizi `StudyService`/`MoveSoundService` e le utilità `move-tree`.

### Runner E2E browser (rinviato)
Un runner E2E completo (Playwright/Cypress) è **rinviato**: richiede tooling e download aggiuntivi non prioritari in questa fase. La combinazione *test unit/integrazione + questa checklist + verifica live nel preview* copre i percorsi critici. Da rivalutare quando l'app si avvicina all'uso reale o all'integrazione CI/CD (terza tornata).
