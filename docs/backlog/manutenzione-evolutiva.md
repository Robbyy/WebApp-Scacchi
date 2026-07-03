# Manutenzione evolutiva di funzioni esistenti

> Migliorie e piccoli/medi sviluppi su **funzionalità già presenti** (UX, semplificazioni,
> rifiniture, estensioni contenute). Ogni scheda riporta un campo **`OpenSpec`** per
> tracciare, caso per caso, se l'attività richiederà una specifica formale o potrà essere
> svolta in modo diretto. Decisione finale da prendere in fase di pianificazione.
> Indice e classificazione: [`../backlog.md`](../backlog.md). ID `ISSUE-0NN` stabili.

| ID | Titolo | Effort | Rischio | OpenSpec |
|----|--------|:------:|:-------:|:--------:|
| 021 | Scaffold navigazione 3 sezioni + segnaposto ⭐ | basso | basso | no |
| 007 | "Nascondi barra" ridondante col motore attivo | basso | basso | no |
| 008 | Rimuovere "Auto-play" dalla navigazione | basso | basso | no |
| 009 | Elenco studi su due colonne | basso | basso | no |
| 012 | Modifica nome/descrizione/colore studio | basso | basso | no |
| 015 | Pagina info applicazione + versioni | basso | basso-medio | no |
| 010 | Pannello sinistro varianti nel dettaglio (3 col) | medio | medio | **da decidere** |
| 011 | Unificare creazione studio + import Lichess | medio | medio | **da decidere** |
| 013 | Menu contestuale editor (cancella / promuovi) | medio | medio | **da decidere** |

> Le tre voci "da decidere" sono le più corpose: candidate a una **OpenSpec leggera**
> (mini-spec) se in fase di pianificazione si valuta che il rischio lo giustifichi.

---

## ISSUE-021 — Scaffold navigazione tre sezioni (Aperture/Mediogioco/Finale) ⭐
**OpenSpec:** no · **Effort:** basso · **Rischio:** basso · **Priorità: da fare tra i primi.**
**Scope:** tre controlli nella topbar vicino al brand "WebApp Scacchi": **Aperture**,
**Mediogioco**, **Finale**. Predispone subito la struttura a tre fasi del gioco anche se
due sezioni non sono ancora implementate.
**Comportamento:** Aperture → home studi (`/`); Mediogioco e Finale → pagina segnaposto
«In fase di implementazione».
**Proposta realizzativa:** un unico componente segnaposto riusabile (es. `coming-soon`)
col nome della sezione, montato su due route dedicate (es. `/mediogioco`, `/finale`); la
sezione attiva è evidenziata; stile coerente con la topbar.
**Accettazione:** i tre controlli sono presenti e funzionanti; Aperture apre gli studi; le
altre due aprono il segnaposto; sezione attiva evidenziata.
**Relazione:** è il **primo slice navigazionale di ISSUE-016** (sviluppi importanti), ma
indipendente e a basso costo; ISSUE-016 in seguito sostituisce i segnaposto con le sezioni
vere. **Fuori perimetro:** studi/capitoli reali di Mediogioco/Finale, editor manuale
posizione/FEN tecnico, commenti, gioco vs motore e import Lichess per sezioni non Aperture
(restano in 016).
**Ambiguità:** route esatte; testo del segnaposto; pulsanti vs tab; posizione nel cluster
topbar (suono/«?»/ingranaggio).

## ISSUE-007 — "Nascondi barra" ridondante col motore attivo
**OpenSpec:** no · **Effort:** basso · **Rischio:** basso.
**Scope:** quando il motore è acceso esiste un pulsante separato "Nascondi/Mostra barra"
di valutazione, concettualmente ridondante (motore attivo ⇒ barra sempre utile).
**Accettazione:** eliminato il pulsante separato; il toggle del motore controlla anche la
barra (motore on → barra visibile, off → nascosta). Un unico controllo invece di due.
**Note:** verificare se lo stato "barra nascosta" è persistito da qualche parte. Stessa
sezione motore di ISSUE-002/ISSUE-014.

## ISSUE-008 — Rimuovere "Auto-play" dalla navigazione varianti
**OpenSpec:** no · **Effort:** basso · **Rischio:** basso.
**Scope:** il pulsante "Auto-play" (avanzamento automatico delle mosse) è ritenuto inutile:
la navigazione con frecce ←/→ e i pulsanti inizio/indietro/avanti/fine è sufficiente.
**Accettazione:** pulsante e logica di avanzamento automatico rimossi; restano inizio,
←, →, fine; suite test verde.
**Note:** aggiornare eventuali test che referenziano l'auto-play.

## ISSUE-009 — Elenco studi su due colonne
**OpenSpec:** no · **Effort:** basso · **Rischio:** basso.
**Scope:** le card degli studi sono su una colonna singola; su Full HD lo spazio
orizzontale è sottoutilizzato.
**Accettazione:** griglia a due colonne su Full HD; ricaduta a colonna singola su viewport
stretta (tablet/mobile); stile delle card invariato.
**Note:** stessa home di ISSUE-003/ISSUE-011 (coordinare). Definire il breakpoint.

## ISSUE-012 — Modifica nome/descrizione/colore studio
**OpenSpec:** no · **Effort:** basso · **Rischio:** basso (backend pronto).
**Scope:** non è possibile modificare nome/descrizione/colore di uno studio dopo la
creazione (unica azione disponibile: eliminazione).
**Accettazione:** pulsante "Modifica" (o icona matita) nel dettaglio studio che apre un
form (inline o dialog) precompilato; alla conferma salva e aggiorna la vista.
**Note:** l'endpoint `PUT /api/studies/{id}` esiste già; manca solo l'UI. Riusa il pattern
form di ISSUE-011 (coordinare). Da decidere: inline vs dialog.

## ISSUE-015 — Pagina info applicazione + versioni
**OpenSpec:** no · **Effort:** basso · **Rischio:** basso-medio.
**Scope:** non esiste un punto per consultare info app e versioni deployate di FE/BE.
**Accettazione:** pulsante "?" nella topbar (vicino al toggle suono) che apre una pagina o
dialog con: nome completo, autore, versione frontend (da `package.json`), versione backend
(da endpoint REST).
**Note tecniche:** versione FE iniettata a build time via `environment.ts`; versione BE da
**Spring Boot Actuator** (`/actuator/info`, già dipendenza standard) **oppure** controller
minimale `GET /api/info` — da decidere (vincolo "no nuove librerie senza decisione").
Cluster topbar condiviso con ISSUE-011/017.

## ISSUE-010 — Pannello sinistro varianti nel dettaglio (3 colonne)
**OpenSpec:** **da decidere** (mini-spec se il rischio lo giustifica) · **Effort:** medio · **Rischio:** medio.
**Scope:** nel dettaglio variante non è visibile l'elenco delle altre varianti dello stesso
studio; per cambiarle si deve tornare al dettaglio studio.
**Accettazione:** colonna sinistra con l'elenco delle varianti dello studio corrente (solo
se la variante vi appartiene); variante attiva evidenziata; click su un'altra → naviga al
suo dettaglio. Se in editor con **modifiche non salvate**, click su un'altra variante →
**dialog di conferma** prima di navigare (riusa il guard esistente). Layout risultante a
tre colonne: elenco | scacchiera | mosse/controlli; stile coerente (no estetica Lichess).
**Note:** dati già esposti da `GET /api/studies/{id}`; riusa `confirm.service`/`canLeaveEditor`.
Coordinare con ISSUE-002 (stessa pagina). Verificare tenuta del 3-col su laptop
(cfr. area delicata "responsive scacchiera"). **Solo elenco + navigazione**, nient'altro.

## ISSUE-011 — Unificare creazione studio + import Lichess
**OpenSpec:** **da decidere** (mini-spec consigliata) · **Effort:** medio · **Rischio:** medio.
**Scope:** la creazione studio è un form inline nella home, non allineato con la pagina
dedicata di import Lichess; le due operazioni sono concettualmente la stessa cosa
("voglio un nuovo studio locale").
**Accettazione:** unica pagina dedicata (es. `/studies/new`) che sostituisce form inline e
pagina import: campi studio (nome, descrizione facoltativa, colore) + link Lichess
opzionale. Senza link → studio vuoto; con link → import/upsert (logica esistente). Il
pulsante "Nuovo studio" diventa link a questa pagina; "Importa da Lichess" rimosso dalla
home (integrato). Il blocco **Connetti/Disconnetti Lichess** si sposta nella **topbar**
(visibile globalmente, vicino al toggle suono).
**Note:** usa endpoint esistenti (`createStudy`, `importLichess`); preserva il flusso
`?studyId=…` (import dentro uno studio esistente); anteprima capitoli e upsert notice
invariati. Coordinare con ISSUE-003/009 (home) e ISSUE-015/017 (cluster topbar).

## ISSUE-013 — Menu contestuale editor (cancella sottoalbero / promuovi a mainline)
**OpenSpec:** **da decidere** (mini-spec se si formalizza l'infrastruttura menu) · **Effort:** medio · **Rischio:** medio.
**Scope:** nell'editor manca un modo diretto, dal pannello "Mosse & Varianti", per operare
sull'albero a partire da una mossa.
**Accettazione:** menu contestuale (tasto destro) su ogni mossa con due voci:
- **"Cancella dalla mossa successiva in poi"** (*logica nuova*): elimina tutti i figli del
  nodo (incluse sotto-varianti), rendendolo foglia; richiede **dialog di conferma**.
- **"Promuovi a mainline"** (*riuso* di `promoteToMainline` in `move-tree.ts`): visibile
  solo se la mossa è una sotto-variante (tra parentesi, non `children[0]`).

Il click sinistro (navigazione/selezione) resta invariato; le voci distruttive sono
distinte visivamente; il salvataggio passa per `PUT /api/variants/{id}` (nessun cambio
schema: si modifica il `tree` JSON).
**Note:** il grosso del lavoro è l'infrastruttura del menu (right-click, posizionamento,
dismiss, stile, accessibilità). Verificare coerenza di `moves[]` (mainline derivata) dopo
cancellazione/promozione.
