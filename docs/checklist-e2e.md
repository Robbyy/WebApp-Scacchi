# Checklist E2E manuale - WebApp Scacchi

> Checklist ripetibile per la validazione manuale end-to-end, verificata fino alla release
> evolutiva R24 (2026-08-10), con i flussi R25 aggiunti e ancora in verifica.
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

- [x] **41. Pannello varianti nel dettaglio (ISSUE-010, R23)** — verificato il 2026-08-10 su studio reale con sette varianti: rail a 1600px, variante attiva e cambio dettaglio corretti; nessun contenuto sotto la scacchiera.
- [x] **42. Drawer varianti sotto i 1500px (ISSUE-010, R23)** — verificato il 2026-08-10 a 1440/1024/768/375/320px: drawer, focus iniziale, Esc, × e selezione funzionanti; nessun overflow orizzontale e board invariata.
- [x] **43. Cambio variante dall'editor (ISSUE-010, R23)** — verificato il 2026-08-10: solo drawer anche a 1600px; cambio pulito immediato e guard sporco con Annulla/Esci senza salvare senza doppio dialog.
- [x] **44. Motore al cambio variante (ISSUE-010/022, R23)** — verificato il 2026-08-10: toggle preservato e nuova analisi avviata nel dettaglio e nell'editor; la suite copre deterministicamente anche risposte HTTP fuori ordine e FEN identica.

---

## Flussi aggiunti (evolutive R24)

- [x] **45. Menu azioni per mossa (ISSUE-013, R24)** — verificato il 2026-08-10 su una variante reale di 48 nodi: ogni mossa del pannello «Mosse & varianti» ha il pulsante `⋮` («Azioni per &lt;SAN&gt;», `aria-haspopup="menu"`, bersaglio 24×24px) e il tasto destro sulla mossa apre lo **stesso** menu senza navigare. Il menu ha semantica `role="menu"`, prende il focus sulla prima voce, usa ↑/↓ e `Home`/`End` per percorrere le voci, si chiude con `Esc`/click esterno/scelta di un comando e restituisce il focus al controllo di origine; dopo la promozione lo restituisce alla mossa promossa nel tree riordinato. «Promuovi a mainline» compare **solo** per una sotto-variante.
- [x] **46. Annotazione di una mossa (`issue-016-move-comments`, R24)** — verificato il 2026-08-10: «Annota la mossa» apre un dialog modale (`aria-modal="true"`, focus nella textarea, Tab intrappolato) con i sei NAG; selezionarne un secondo sostituisce il primo, riattivare quello scelto lo rimuove, il contatore rispetta il limite di 1.000 caratteri. Dopo «Salva» la mossa mostra il NAG accanto al SAN e il commento come nota sotto; «Annulla»/`Esc` non modificano l'albero. Salvata la variante, `GET /api/variants/{id}` riporta `comment`/`nag` e le mosse non annotate restano `{san, children}`.
- [x] **47. Promozione ed eliminazione dal menu (ISSUE-013, R24)** — verificato il 2026-08-10: «Promuovi a mainline» sposta la linea sul percorso di soli zeri **conservando** NAG, commento e sotto-varianti (badge «mainline»); «Elimina mossa» su una foglia rimuove subito, su un nodo con figli chiede conferma nominando la mossa e non tocca nulla finché non si conferma. In entrambi i casi la selezione torna al nodo padre.
- [x] **48. Annotazioni in sola lettura e responsive (R24)** — verificato il 2026-08-10 a **1600/1440/1024/768/375/320px** su editor e dettaglio: nel dettaglio le annotazioni si vedono con la stessa rappresentazione ma senza pulsante azioni né menu/dialog; i commenti lunghi vanno a capo, il pannello mosse non scorre in orizzontale e la pagina non ha overflow; menu e dialog restano sovrapposti e interamente nel viewport, con la scacchiera invariata per larghezza e posizione. Rifiuto backend verificato dal browser: commento oltre 1.000 caratteri e NAG fuori insieme rispondono `400` con `branchPath`. Console senza errori.

---

## Flussi aggiunti (evolutiva R25 — in verifica)

- [ ] **49. Creare una posizione manuale in uno studio Mediogioco/Finale (R25)** — dal dettaglio di uno studio `MIDDLEGAME` o `ENDGAME` premere `Nuova posizione`; l'editor apre la scacchiera di configurazione, mantiene il `studyId` dello studio padre, richiede il titolo e permette di salvare una posizione valida anche senza mosse.
- [ ] **50. Configurare e validare la FEN (R25)** — piazzare/rimuovere pezzi, cambiare il lato al tratto, arrocco ed en-passant; verificare FEN readonly canonica con contatori `0 1`, errori per re/pedoni/arrocco/en-passant non validi e derivazione del colore tecnico dal lato al tratto.
- [ ] **51. Salvare e rivalidare l'albero dalla FEN custom (R25)** — verificare una continuazione legale dalla posizione custom, il rifiuto di una mossa incompatibile e il rifiuto atomico quando la modifica della FEN rende illegale l'albero esistente. Il flusso UI per aggiungere/modificare l'albero resta da decidere nel task aperto 6.2.
- [ ] **52. Compatibilità Aperture e terminologia posizionale (R25)** — verificare che Aperture, import Lichess, training, review e varianti legacy restino invariati; nelle liste, breadcrumb e navigazione di Mediogioco/Finale usare “posizione” e non mostrare il campo tecnico `color` come lato di training.

> Audit preliminare del 2026-08-13: l'accesso all'editor e la navigazione tra posizioni sono stati
> verificati su H2 in memoria; l'audit ha confermato i tre punti aperti 6.1–6.3 della change
> OpenSpec. Il database persistente `backend/data/scacchi.mv.db` non fa parte della checklist.

---

## Pulizia

- [ ] Eliminare studi e varianti di test creati durante la checklist, lasciando i seed di default.

---

## Copertura automatica

Questi flussi sono coperti anche da test automatici (da eseguire prima della checklist manuale):

- **Backend** (`mvnw.cmd test` — **117 test**): CRUD varianti, validazione legalità (mainline e albero, `400` strutturato), FEN custom R25 (normalizzazione, re, pedoni, arrocco, en-passant, lato che ha appena mosso, mosse dalla FEN e aggiornamento atomico), round-trip albero `tree → DB → DTO`, annotazioni R24 (`MoveNodeTest` costruttore a due argomenti e normalizzazione del commento, `TreeConverterTest` lettura di JSON legacy e assenza dei campi per un albero non annotato, `VariantValidatorTest`/`VariantControllerTest` limite del commento e insieme dei NAG), `MoveNode`/mainline, CRUD studi (creazione variante nello studio, cancellazione a cascata, import bulk e upsert Lichess), sessioni di allenamento (`TrainingSessionControllerTest`), statistiche (`StatsControllerTest`), spaced repetition (`ReviewSchedulerTest` SM-2 puro + `ReviewControllerTest`).
- **Frontend** (`npm test -- --watch=false` — **343 test**): scacchiera (click, drag, promozione, hide-on-drag, audio), editor posizione R25 (setup visuale, FEN, arrocco, en-passant, salvataggio senza mosse, errori backend e guard di fase), editor varianti (mosse, varianti, promuovi a mainline, conferma cancellazione, guard, creazione in studio), training (mosse corrette/errate, rami, completamento, audio, submit sessione), studi (lista/dettaglio/eliminazione, CTA e modifica inline R22), pagina unica creazione/import R22 (`study-new` — creazione locale, anteprima e suggerimenti, upsert con metadati locali, `?studyId` valido/inesistente/non-Aperture, errore di import parziale, bozza `sessionStorage`; redirect della route storica in `app.routes`), import PGN (anche in studio) e parser `pgn`, import/auth Lichess (`lichess`, `lichess-auth`), comando Lichess in topbar (`app`), motore (`uci` — parsing PV completa, `pvToSan`, `numberedPv` —, `play`, `stockfish.service` — ciclo spegnimento/riaccensione con worker finto e righe `info` tardive), linea migliore e toggle unico del pannello motore R21 (`variant-detail`, `variant-editor`), pannello varianti R23 (`study-variant-nav` — incluso il caricamento cancellabile, le risposte fuori ordine, il riavvio a FEN identica, drawer/editor e assenza di Auto-play), azioni e annotazioni per mossa R24 (`move-actions-menu`, incluso il ciclo ↑/↓/`Home`/`End`, `move-annotation-dialog`, il blocco «menu azioni e annotazioni» di `variant-editor` e la lettura in sola lettura in `variant-detail`), statistiche (`stats-format`, `stats.service`, `variant-stats`, `study-stats`), ripetizione (`review-format`, `review.service`, `review-due`), navigazione R20 (`app`, `app.routes`, `study-sections`, `coming-soon`), più i servizi `StudyService`/`MoveSoundService` e le utilità `move-tree`.

### Runner E2E browser (rinviato)
Un runner E2E completo (Playwright/Cypress) è **rinviato**: richiede tooling e download aggiuntivi non prioritari in questa fase. La combinazione *test unit/integrazione + questa checklist + verifica live nel preview* copre i percorsi critici. Da rivalutare quando l'app si avvicina all'uso reale o all'integrazione CI/CD (terza tornata).
