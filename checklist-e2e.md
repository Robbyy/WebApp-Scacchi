# Checklist E2E manuale - WebApp Scacchi

> Checklist ripetibile per la validazione manuale end-to-end (aggiornata fino al Prototipo 12).
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

- [ ] **1. Creare uno studio** — dalla home `Nuovo studio` → nome «Studio E2E», colore a scelta → salva. Compare un **toast** di conferma e lo studio appare nella home.
- [ ] **2. Creare una variante lineare nello studio** — aprire «Studio E2E» → `Nuova variante` → giocare `1.e4 e5 2.Cf3`, nome «Test E2E», lato Bianco → `Salva variante`. Compare un **toast** di conferma e si apre il dettaglio.
- [ ] **3. Verificarla nello studio** — tornare allo studio: la variante è presente tra i capitoli con badge colore e numero mosse corretti.
- [ ] **4. Replay** — usare i controlli inizio/indietro/avanti/fine e **Auto-play**; scorrere anche con le frecce `←/→` da tastiera.
- [ ] **5. Allenarla fino al completamento** — `Allena questa variante` → giocare la linea corretta fino allo stato **«completata»**.
- [ ] **6. Mossa errata in allenamento** — riavviare e giocare una mossa sbagliata: compare il **feedback di errore** e il contatore errori aumenta; la posizione non avanza.
- [ ] **7. Modificarla e salvare** — dal dettaglio `Modifica variante` → cambiare nome/mosse → `Salva modifiche`. Toast di conferma; le modifiche persistono dopo riapertura.
- [ ] **8. Aggiungere una sotto-variante** — nell'editor, da una posizione giocare una mossa **diversa** dalla mainline: si crea una **variante** (mostrata tra parentesi, badge «variante»).
- [ ] **9. Allenare una variante con rami** — allenare una variante che ha più risposte valide dal lato dell'utente: tutte le mosse corrette sono accettate.
- [ ] **10. Importare un PGN breve nello studio** — da «Studio E2E» usare `Importa PGN` → incollare una linea singola → anteprima mosse corretta → `Salva`. Toast di conferma; tornando allo studio la variante importata è presente.
- [ ] **11. Importare un PGN più lungo** — incollare un PGN con molte mosse: anteprima corretta, salvataggio riuscito (`sourcePgn` conservato).
- [ ] **12. Eliminare una variante** — dal dettaglio studio, icona cestino sulla variante → **dialog di conferma** → `Elimina`: toast «Variante eliminata» e la variante sparisce dallo studio.

---

## Flussi aggiunti (Parte 2: P7-P17)

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
- [ ] **24. Import studio Lichess (P14)** — dalla home `Importa da Lichess` → incollare l'URL di uno **studio pubblico** (es. `https://lichess.org/study/XXXXXXXX`) → `Anteprima`: compaiono nome studio e l'elenco capitoli (colore, mosse, varianti). `Importa come nuovo studio` crea lo studio locale con una variante per capitolo; aprendo una variante i rami sono presenti e il training funziona.
- [ ] **25. Import singolo capitolo nello studio (P14)** — dal dettaglio di uno studio `Importa da Lichess` con un URL di **capitolo** (`/study/{id}/{chapterId}`): viene aggiunta **una** variante allo studio corrente.
- [ ] **26. Errori import Lichess (P14)** — URL non valido → messaggio «Link Lichess non valido»; studio inesistente/non pubblico → «non trovato o non pubblico»; nessun dato parziale salvato.
- [ ] **27. Re-import / sync senza duplicati (P15)** — re-importare lo stesso studio pubblico già importato: l'anteprima mostra l'avviso **«già importato … verrà aggiornato»** e il pulsante diventa **«Aggiorna lo studio»**. Confermando, lo studio **non** viene duplicato nella home; le sue varianti sono sostituite con quelle correnti.
- [ ] **28. Metadati locali preservati nel sync (P15)** — rinominare/descrivere localmente uno studio importato, poi re-importarlo: nome, descrizione e colore locali **restano invariati**, solo le varianti cambiano.
- [ ] **29. OAuth Lichess per studi privati (P15)** — premere **«Connetti Lichess»**, autorizzare su Lichess (login reale), tornare all'app (badge «Connesso a Lichess»); importare un proprio studio **privato/unlisted** → i capitoli vengono letti e importati. «Disconnetti» rimuove il token di sessione.
- [ ] **30. Motore + barra di valutazione (P16)** — nel **dettaglio** (o editor) di una variante premere **«Motore»**: compare la **barra di valutazione** con un punteggio (es. «+0.8») e la profondità accanto al pulsante. «Nascondi/Mostra barra» funziona; ri-premendo «Motore» si spegne e la barra sparisce.
- [ ] **31. Gioca contro il computer (P16)** — premere **«Gioca contro il computer»**: si apre una **nuova tab** `/play?fen=...` con la posizione corrente (la tab originale resta invariata). Giocando una mossa legale, il computer risponde; «Ricomincia» riparte dalla posizione iniziale.
- [ ] **32. Niente motore in allenamento (P16)** — avviare un allenamento: **non** devono esserci toggle motore, barra di valutazione né «gioca contro il computer».
- [ ] **33. Registrazione sessione di allenamento (P17)** — completare un allenamento: al termine compare «Sessione registrata ✓». Via API `GET /api/training-sessions?variantId={id}` la sessione è presente con esito, numero errori e conteggio mosse; `GET /api/training-sessions/{id}` mostra le mosse tentate (anche quelle sbagliate). Un allenamento senza alcuna mossa giocata **non** crea sessioni.

---

## Pulizia

- [ ] Eliminare studi e varianti di test creati durante la checklist, lasciando i seed di default.

---

## Copertura automatica

Questi flussi sono coperti anche da test automatici (da eseguire prima della checklist manuale):

- **Backend** (`mvnw.cmd test`): CRUD varianti, validazione legalità (mainline e albero, `400` strutturato), round-trip albero `tree → DB → DTO`, `MoveNode`/mainline, CRUD studi, creazione variante nello studio e cancellazione a cascata.
- **Frontend** (`npm test -- --watch=false`): scacchiera (click, drag, promozione, hide-on-drag, audio), editor (mosse, varianti, promuovi a mainline, conferma cancellazione, guard, creazione in studio), training (mosse corrette/errate, rami, completamento, audio), studi (lista/dettaglio/creazione/eliminazione), `MoveSoundService`, utilità `move-tree`, import PGN anche dentro uno studio.

### Runner E2E browser (rinviato)
Un runner E2E completo (Playwright/Cypress) è **rinviato**: richiede tooling e download aggiuntivi non prioritari in questa fase. La combinazione *test unit/integrazione + questa checklist + verifica live nel preview* copre i percorsi critici. Da rivalutare quando l'app si avvicina all'uso reale o all'integrazione CI/CD (terza tornata).
