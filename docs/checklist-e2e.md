# Checklist E2E manuale - WebApp Scacchi

> Checklist ripetibile per la validazione manuale end-to-end, verificata fino alla release
> evolutiva R26.2 (2026-08-14).
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

## Flussi aggiunti (evolutiva R25 — verificata)

- [x] **49. Creare una posizione manuale in uno studio Mediogioco/Finale (R25)** — verificato il 2026-08-13 su H2 temporaneo: dal dettaglio `MIDDLEGAME` `Nuova posizione` mantiene lo studio padre, richiede il titolo e salva anche con `moves`/`tree` vuoti; il salvataggio apre `/variants/:id/edit`.
- [x] **50. Configurare e validare la FEN (R25)** — verificati piazzamento, lato al tratto, arrocco ed en-passant; FEN readonly canonica con contatori `0 1`, derivazione del colore tecnico dalla FEN e rifiuti UI per re mancanti, pedone sulla prima traversa, arrocco incoerente ed en-passant incoerente. Verificata anche la cattura `exd6` da en-passant.
- [x] **51. Salvare e rivalidare l'albero dalla FEN custom (R25)** — verificata una continuazione legale (`Ke2`), la persistenza di `startingFen`, `moves` e `tree`, il rifiuto di una mossa incompatibile e il rifiuto atomico quando la modifica della FEN rende illegale l'albero esistente.
- [x] **52. Compatibilità Aperture e terminologia posizionale (R25)** — verificati lista/dettaglio Aperture con `Nuova variante`, training, statistiche, badge e lato di allenamento invariati; Mediogioco usa “posizioni” in home, dettaglio, breadcrumb e navigazione, senza esporre `color` come lato di training. Una FEN custom inviata a uno studio `OPENING` è rifiutata dal backend con `400`.

> Audit conclusivo del 2026-08-13: flussi 49–52 verificati con backend su H2 file temporaneo e frontend
> su `http://localhost:4200`; suite automatica verde (120 backend, 346 frontend). Durante la prova
> `http://127.0.0.1:4200` ha mostrato un limite dell'ambiente Browser Use sulle mutazioni, non riprodotto
> su `localhost`; nessun difetto applicativo è risultato. Il database persistente
> `backend/data/scacchi.mv.db` non è stato usato né modificato.

---

## Flussi aggiunti (evolutiva R26 — verificata)

- [x] **53. Lista e creazione degli studi di Mediogioco (R26)** — verificato il 2026-08-13 su H2 temporaneo: `/middlegame` mostra esclusivamente gli studi `MIDDLEGAME`, passa correttamente da stato vuoto a lista popolata ed elimina uno studio dopo conferma. Da `/middlegame/studies/new` la fase è fissata a Mediogioco, non è modificabile e non sono presenti import o sync Lichess; nome, descrizione e colore restano compilabili.
- [x] **54. Dettaglio studio e CRUD delle posizioni (R26)** — verificati breadcrumb e percorsi canonici `/middlegame/...`, modifica dei metadati senza cambio di fase, elenco vuoto e popolato, creazione ed eliminazione delle posizioni e rientro alla lista di Mediogioco. Un ID appartenente a uno studio di un'altra fase, richiesto tramite una route Mediogioco, viene rifiutato e non espone contenuti o azioni.
- [x] **55. Setup FEN ed editor dell'albero nella sezione (R26)** — verificati creazione della posizione, setup successivo, salvataggio di una FEN personalizzata, aggiunta e persistenza di una mossa e passaggio fra `/middlegame/positions/{id}/setup`, `/edit` e dettaglio. Le funzioni R25 di validazione, orientamento, arrocco, en-passant e conservazione dell'albero restano operative.
- [x] **56. Consultazione e navigazione delle posizioni (R26)** — verificati dettaglio con albero completo e senza mosse, FEN iniziale, replay e navigazione fra posizioni sorelle dal rail/drawer. Breadcrumb, ritorni, annullamento e redirect restano sempre nella sezione `/middlegame`.
- [x] **57. Confini funzionali del Mediogioco (R26)** — verificati il rifiuto di un contenuto di fase errata e l'assenza in UI di import Lichess, training, statistiche, review/SM-2 e gioco contro Stockfish dalla posizione. L'analisi Stockfish nel dettaglio/editor resta disponibile. I casi asincroni e l'assenza di chiamate review sono coperti dalla suite automatica.
- [x] **58. Responsive e regressioni delle altre sezioni (R26)** — verificato a **1600/1440/1024/768/375/320px**: tab Mediogioco attivo su tutte le route figlie, lista/dettaglio/editor senza overflow orizzontale e console senza errori. Le Aperture conservano route e azioni pre-R26, inclusi import, training, statistiche, review e gioco contro il computer; `/endgame` resta sul segnaposto previsto per R27.

> Audit conclusivo del 2026-08-13: flussi 53–58 verificati con backend su H2 file temporaneo
> isolato e frontend su `http://localhost:4200`; creati, modificati ed eliminati studi e posizioni
> di prova, inclusi albero vuoto/completo, FEN custom e navigazione sorelle. Suite automatica
> verde (120 backend, 446 frontend), build Angular riuscita e console browser senza errori.
> Durante l'audit R26 il database persistente `backend/data/scacchi.mv.db` non è stato
> avviato, modificato, ripristinato né incluso nel lavoro R26. Prima e dopo test/preview
> risultavano invariati:
> SHA-256 `447AEE231196E578EF4654B8F46E6DB6E93ECA57D1DE4B4D40FFF15F23883DAA`,
> dimensione `241664` byte e timestamp `2026-08-13 09:41:49`.
>
> Verifica post-audit: un processo Spring Boot avviato separatamente ha poi aperto la
> risorsa versionata e il working tree la segnala modificata (90112 byte, SHA-256
> `9AECC00B8E0E7539FFB27C9311D968F80DD0458FF393F6F3871170CA4C8F5FBD`). Il file è stato
> escluso dallo staging R26; il ripristino al contenuto versionato resta sospeso in attesa
> di autorizzazione esplicita.

---

## Flussi aggiunti (R26.1 — verificata il 2026-08-14)

- [x] **59. Studi posizionali senza duplicazioni o colore (R26.1)** — a 1600/1440/1024/768/375/320px `/middlegame` mostra una sola CTA «Nuovo studio» nello stato vuoto; creazione e modifica non mostrano «Colore» e inviano/conservano `color: null`; durante «Modifica» non compaiono «Nuova posizione» né l'invito operativo. Verificare per contrasto che le Aperture conservino campo e badge colore.
- [x] **60. Griglia FEN invariabile (R26.1)** — nella creazione e configurazione di una posizione, passare da board vuota a posizione standard e collocare/rimuovere pezzi di ogni tipo: le 64 caselle mantengono lo stesso rettangolo e gli SVG restano contenuti senza modificare bordi, righe o colonne; nessun overflow alle sei larghezze.
- [x] **61. Posizione come esercizio di studio ed eliminazione (R26.1)** — il dettaglio apre sulla `startingFen` senza mosse, rami, commenti, NAG, replay o contatore; «Mostra analisi» rivela l'intero albero e il cambio posizione/ricaricamento lo nasconde di nuovo. Un albero vuoto mostra «Nessuna analisi salvata». «Elimina posizione» gestisce annullamento/errore senza navigare e, dopo successo, torna allo studio padre con toast.
- [x] **62. Geometria stabile del dettaglio/editor (R26.1)** — nello stesso viewport misurare con `getBoundingClientRect()` la scacchiera nel dettaglio, dopo accensione del motore e nell'editor: `left`, `top`, `width` e `height` devono restare uguali dove previsto. Nell'editor `.board-col` contiene soltanto board/barra; Motore, replay, contatore, ramo, azioni e conferma sono nell'aside destro. Ripetere almeno a 1600/1440/1024/768/375/320px e verificare assenza di overflow.
- [x] **63. Navigazione posizionale compatta e regressione Aperture (R26.1)** — rail e drawer Mediogioco mostrano per ogni posizione soltanto il titolo, senza «N mosse» né badge colore; selezione, stato corrente, chiusura drawer e percorsi canonici restano operativi. Le voci Aperture conservano colore e conteggio mosse, la home filtra esplicitamente `OPENING`; `/endgame` resta il segnaposto R27.

> Evidenza del 2026-08-14: suite verde (120 backend, 455 frontend), build Angular riuscita e
> flussi 59–63 completati sul backend collegato a `H2_DB_PATH` temporaneo. Nessun errore inatteso
> in console. Le board di dettaglio ed editor hanno lo stesso rettangolo ai sei viewport; il toggle
> motore non ne cambia geometria (sui viewport stretti l'eventuale scroll cambia soltanto le
> coordinate relative alla finestra, non quelle del documento). Il setup mantiene 64 caselle
> uniformi e non produce overflow. Il database condiviso è rimasto invariato durante il gate:
> `86016` byte, timestamp `2026-08-14 01:45:52`, SHA-256
> `144FD67C95C4D0EE886AC7048D56510845CA94899392544B663BD4618561C943`.

## Flussi aggiunti (R26.2 — verificata il 2026-08-14)

- [x] **64. Breadcrumb non interattivo in modifica (R26.2)** — nell'editor `/middlegame/positions/{id}/edit` il breadcrumb resta leggibile ma nessuna voce è link, focalizzabile o navigabile; la pagina corrente è identificabile semanticamente. Verificare anche che Aperture conservi il comportamento precedente.
- [x] **65. Gerarchia contestuale dell'editor (R26.2)** — nell'editor posizionale non compaiono «MODIFICA POSIZIONE», «Posizioni», «Motore» o «posizione iniziale»; «Mosse & rami» occupa la posizione del Motore e precede replay/azioni del tree. Salva, Annulla, guard, replay e azioni sui nodi restano operativi.
- [x] **66. Responsive e preparazione al Finale (R26.2)** — ripetere 64–65 a 1600/1440/1024/768/375/320 px su H2 temporaneo, senza overflow o perdita di focus; il dettaglio conserva il Motore, `/endgame` resta segnaposto e la regressione Aperture è verde.

> Evidenza del 2026-08-14: suite frontend verde (461 test), build Angular riuscita e flussi 64–66
> completati sul backend collegato a `H2_DB_PATH` temporaneo, con uno studio `MIDDLEGAME` di due
> posizioni. Alle sei larghezze il percorso «Mediogioco / Strutture di pedoni / Centro bloccato»
> non contiene link né elementi focalizzabili (`aria-current="page"` sulla sola pagina corrente) e
> l'ordine del pannello destro resta `side-head → nome → Mosse & rami → replay → contatore →
> [ramo] → azioni del tree → Salva/Annulla`, senza overflow orizzontale (`scrollWidth ==
> clientWidth`) e senza errori in console. Verificati replay, badge di ramo, menu azioni con
> ritorno del focus al pulsante di origine, creazione di un ramo dalla scacchiera, guard delle
> modifiche non salvate (rifiuto e permanenza nell'editor), salvataggio con toast e redirect a
> `/middlegame/positions/{id}`, e persistenza di albero, commenti e NAG. Il dettaglio posizionale
> conserva Motore, breadcrumb navigabile, navigazione fra posizioni e analisi inizialmente
> nascosta; non espone «Gioca contro il computer» (R28 non anticipata). Riverificato anche il
> contratto geometrico R26.1: a 1600 e 1024px la scacchiera ha lo stesso rettangolo nel dettaglio e
> nell'editor (`left`/`top`/`width` identici) e il toggle motore del dettaglio non la sposta;
> `.board-col` dell'editor contiene ancora soltanto board e barra. Le Aperture conservano
> kicker, «Varianti» con drawer funzionante, campo colore, barra motore con «Gioca contro il
> computer», label «posizione iniziale» e albero dopo le azioni del tree; `/endgame` resta il
> segnaposto R27. Il database condiviso è rimasto invariato durante il gate: `86016` byte,
> timestamp `2026-08-14 01:45:52`, SHA-256
> `144FD67C95C4D0EE886AC7048D56510845CA94899392544B663BD4618561C943`.
>
> Nota: in questa sessione il pannello browser non era in composizione, quindi non sono state
> acquisite schermate; le evidenze sono albero di accessibilità, misure DOM e interazioni reali.

### Gate futuro R27 — equivalenza Finale obbligatoria

Questa matrice non è eseguibile finché `/endgame` resta un segnaposto e non incrementa il conteggio
dei flussi correnti. Dovrà essere recepita e numerata nella checklist della change R27. Il fatto che
un componente sia condiviso indica che non è attesa una seconda implementazione, non che la prova
`ENDGAME` possa essere omessa.

| Punto ereditato da R26.1 | Evidenza obbligatoria in R27 |
|---|---|
| R26-UI-01 | Stato vuoto di `/endgame` con una sola CTA «Nuovo studio». |
| R26-UI-02 | Creazione/modifica studio `ENDGAME` senza colore e payload con `color: null`; Aperture invariata. |
| R26-UI-03 | «Nuova posizione» e invito operativo assenti durante la modifica di uno studio Finale. |
| R26-UI-04 | Setup FEN Finale con griglia 8×8 invariabile e nessun overflow ai sei viewport. |
| R26-UI-05 | Eliminazione dal dettaglio e redirect riuscito a `/endgame/studies/{id}`; annullamento/errore senza navigazione. |
| R26-UI-06 | Toggle motore senza variazioni del rettangolo della board nel dettaglio Finale. |
| R26-FUNC-07 | Posizione `ENDGAME` con analisi nascosta, rivelazione completa e reset a cambio/reload; nessun training/review/statistica. |
| R26-UI-08 | Editor Finale con board/barra nella colonna scacchiera e controlli operativi nell'aside desktop. |
| R26-UI-09 | Stesse coordinate della board fra dettaglio ed editor Finale, con breadcrumb/rail e alle sei larghezze previste. |
| R26-UI-10 | Rail/drawer Finale con soli titoli; navigazione Aperture ancora completa di colore e conteggio mosse. |

### Gate futuro R27 — editor posizionale contestuale R26.2

| Punto ereditato da R26.2 | Evidenza obbligatoria in R27 |
|---|---|
| R26.2-UI-01 | Editor `ENDGAME` con breadcrumb visibile ma non interattivo e pagina corrente semanticamente identificata. |
| R26.2-UI-02 | Kicker «MODIFICA POSIZIONE» assente nell'editor Finale. |
| R26.2-UI-03 | Pulsante «Posizioni» assente nell'editor Finale, senza comando sostitutivo duplicato. |
| R26.2-UI-04 | Pulsante «Motore» assente dall'editor Finale; «Mosse & rami» nella sua posizione gerarchica. Il Motore resta verificato nel dettaglio. |
| R26.2-UI-05 | Label «posizione iniziale» assente; replay, azioni del tree, Salva, Annulla e guard invariati. |
| R26.2-REG-06 | Aperture e Mediogioco non regrediscono; verifica browser a sei viewport e console senza errori inattesi. |

Il riuso di `VariantEditor` non vale come evidenza per nessuna riga della matrice. R26.2 lascia un
test automatico che applica il contratto a uno studio `ENDGAME`
(`variant-editor.spec.ts`, «applies the same contract to an endgame study»): dimostra che la
presentazione dipende dalla fase e non dalla route, ma non sostituisce la verifica di R27 sulle
rotte `/endgame` ai sei viewport.

---

## Pulizia

- [x] I record di prova R26.1 (due posizioni e lo studio padre) sono stati eliminati dal database
  temporaneo, esterno al workspace. Il database condiviso è rimasto invariato rispetto alla baseline
  del gate e resta escluso da staging, ripristini e sovrascritture.

---

## Copertura automatica

Questi flussi sono coperti anche da test automatici (da eseguire prima della checklist manuale):

- **Backend** (`mvnw.cmd test` — **120 test**): CRUD varianti, validazione legalità (mainline e albero, `400` strutturato), FEN custom R25 (normalizzazione, FEN mancante/vuota, re, pedoni, arrocco, en-passant, lato che ha appena mosso, mosse dalla FEN e aggiornamento atomico), round-trip albero `tree → DB → DTO`, annotazioni R24 (`MoveNodeTest` costruttore a due argomenti e normalizzazione del commento, `TreeConverterTest` lettura di JSON legacy e assenza dei campi per un albero non annotato, `VariantValidatorTest`/`VariantControllerTest` limite del commento e insieme dei NAG), `MoveNode`/mainline, CRUD studi (creazione variante nello studio, cancellazione a cascata, import bulk e upsert Lichess), sessioni di allenamento (`TrainingSessionControllerTest`), statistiche (`StatsControllerTest`), spaced repetition (`ReviewSchedulerTest` SM-2 puro + `ReviewControllerTest`).
- **Frontend** (`npm test` — **461 test**): oltre alla copertura R20–R26, R26.1 verifica CTA e colore contestuali, modalità modifica dello studio, navigazione posizionale compatta, analisi nascosta/rivelata/reset e albero vuoto, cancellazione dal dettaglio con successo/annullamento/errore, griglia FEN strutturale 8×8, breadcrumb, collocazione dei controlli nell'aside e filtro esplicito `OPENING` della home, preservando le regressioni delle Aperture. R26.2 aggiunge sei test sull'editor posizionale contestuale: breadcrumb senza voci focalizzabili con `aria-current`, assenza di kicker/«Posizioni»/motore/label anche con posizioni sorelle disponibili, ordine DOM del pannello con «Mosse & rami» nello slot del motore, replay/badge di ramo/azioni sui nodi/Salva/Annulla ancora operativi, stesso contratto per uno studio `ENDGAME` e ordine invariato dell'editor Aperture. Misure geometriche reali e flussi multi-viewport sono stati completati manualmente nei punti 59–66.

### Runner E2E browser (rinviato)
Un runner E2E completo (Playwright/Cypress) è **rinviato**: richiede tooling e download aggiuntivi non prioritari in questa fase. La combinazione *test unit/integrazione + questa checklist + verifica live nel preview* copre i percorsi critici. Da rivalutare quando l'app si avvicina all'uso reale o all'integrazione CI/CD (terza tornata).
