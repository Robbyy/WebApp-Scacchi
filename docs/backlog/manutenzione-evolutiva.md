# Manutenzione evolutiva di funzioni esistenti

> Migliorie e piccoli/medi sviluppi su **funzionalità già presenti** (UX, semplificazioni,
> rifiniture, estensioni contenute). Ogni scheda riporta un campo **`OpenSpec`** per
> tracciare, caso per caso, se l'attività richiederà una specifica formale o potrà essere
> svolta in modo diretto. Decisione finale da prendere in fase di pianificazione.
> Indice e classificazione: [`../backlog.md`](../backlog.md). ID `ISSUE-0NN` stabili.

| ID | Titolo | Effort | Rischio | OpenSpec |
|----|--------|:------:|:-------:|:--------:|
| 021 | Scaffold navigazione 3 sezioni + segnaposto ✅ | basso | basso | no |
| 022 | Visualizzazione linea migliore del motore nel pannello laterale ✅ | medio | medio-basso | no |
| 007 | "Nascondi barra" ridondante col motore attivo ✅ | basso | basso | no |
| 008 | Rimuovere "Auto-play" dalla navigazione | basso | basso | no |
| 009 | Elenco studi su due colonne ✅ | basso | basso | no |
| 012 | Modifica nome/descrizione/colore studio ✅ | basso | basso | no |
| 015 | Pagina info applicazione + versioni | basso | basso-medio | no |
| 010 | Pannello sinistro varianti nel dettaglio (3 col) | medio | medio | **da decidere** |
| 011 | Unificare creazione studio + import Lichess ✅ | medio | medio | no — mini-spec R22 |
| 013 | Menu contestuale editor (cancella / promuovi) | medio | medio | **da decidere** |

> Le tre voci "da decidere" sono le più corpose: candidate a una **OpenSpec leggera**
> (mini-spec) se in fase di pianificazione si valuta che il rischio lo giustifichi.

---

## ISSUE-021 — Scaffold navigazione tre sezioni (Aperture/Mediogioco/Finale) ✅
**OpenSpec:** no · **Effort:** basso · **Rischio:** basso · **Stato: ✅ completata (R20, 2026-08-05).**
**Scope:** tre tab di navigazione nella topbar, subito dopo il brand "WebApp Scacchi":
**Aperture**, **Mediogioco**, **Finale**. Predispone subito la struttura a tre fasi del
gioco anche se due sezioni non sono ancora implementate.

**Decisioni UI e routing confermate (2026-08-05):**
- i controlli sono **tab visivi**, implementati semanticamente come link dentro una
  `<nav aria-label="Sezione di studio">`: cambiano route/pagina, quindi non usano il
  ruolo ARIA `tab` riservato ai pannelli nella stessa pagina. La sezione corrente espone
  `aria-current="page"` oltre allo stato visivo attivo;
- Aperture → home studi (`/`); Mediogioco → `/middlegame`; Finale → `/endgame`.
  I nomi inglesi e minuscoli seguono le route tecniche già esistenti (`/studies`,
  `/variants`, `/reviews`, `/play`) e i valori di dominio `MIDDLEGAME`/`ENDGAME`;
- Mediogioco e Finale montano un unico componente segnaposto riusabile (es.
  `coming-soon`) che riceve il nome della sezione e mostra «In fase di implementazione».

**Responsive definito:**
- da **768px** in su, brand, tab e controlli di servizio restano su una sola riga;
- sotto **768px**, la topbar va a due righe: prima riga con brand e controlli di servizio,
  seconda riga con il gruppo tab a tutta larghezza. I tre tab hanno altezza cliccabile
  minima di 44px e larghezza flessibile/equa;
- se la larghezza disponibile non consente di mantenere etichette leggibili e target da
  44px (compresi viewport molto stretti o zoom elevato), il solo gruppo tab scorre
  orizzontalmente senza tagliare testo né comprimere i controlli della prima riga.

**Accettazione:** i tre tab sono presenti e funzionanti; Aperture apre gli studi; le
altre due route aprono il segnaposto; la sezione attiva è evidenziata e annunciata da
`aria-current`; la topbar non genera overflow orizzontale né sovrapposizioni a desktop,
tablet o mobile.
**Relazione:** è il **primo slice navigazionale di ISSUE-016** (sviluppi importanti), ma
indipendente e a basso costo; ISSUE-016 in seguito sostituisce i segnaposto con le sezioni
vere.
**Fuori scope:** contenuti reali di Mediogioco/Finale, filtri dati per fase, editor
posizione/FEN, commenti, gioco contro il motore e import Lichess per le sezioni non
Aperture (restano in ISSUE-016); ridisegno dei controlli di servizio della topbar, che
sarà gestito dalle issue dedicate 011/015/017.

**Esito (R20, 2026-08-05):** tab-link in `app.html` dentro `<nav aria-label="Sezione di
studio">`, con `aria-current="page"` e stato attivo derivato dall'URL
(`core/study-sections.ts`): le pagine di dettaglio delle Aperture (`/studies/:id`,
`/variants/:id`, `/reviews`, `/play`) mantengono evidenziato il tab Aperture. Route
`/middlegame` e `/endgame` montano il segnaposto riusabile `sections/coming-soon`, che
riceve il nome della sezione dalla `data` della route (`withComponentInputBinding`).
Responsive verificato a 1440/1024/768 (una riga) e 767/375/320 (due righe, target 44px);
sotto ~315px scorre orizzontalmente il solo gruppo tab (verificato a 280px), senza
troncare le etichette né comprimere i controlli di servizio, e la topbar non genera mai
overflow orizzontale di pagina. Frontend: 194 test verdi, build ok.

## ISSUE-022 — Visualizzazione linea migliore del motore nel pannello laterale ✅
**OpenSpec:** no · **Effort:** medio · **Rischio:** medio-basso · **Stato: ✅ completata (R21, 2026-08-05).**

**Problema:** nel dettaglio variante, quando Stockfish è acceso, l'interfaccia mostra la
barra di valutazione e la profondità, ma non mostra la linea principale calcolata dal motore
(Principal Variation, PV). La linea sarebbe utile per comprendere il motivo della valutazione
e studiare le mosse consigliate.

**Obiettivo:** mostrare la linea migliore corrente di Stockfish in notazione scacchistica
leggibile, aggiornata mentre l'analisi procede.

**Posizione UI vincolante:** la linea deve vivere nel pannello motore laterale destro del
dettaglio variante (`.engine-panel`), subito sotto i controlli del motore e prima di
«Allena questa variante». Non deve essere aggiunto alcun blocco autonomo sotto la scacchiera;
la `EvalBar` resta accanto alla scacchiera come oggi.

**Accettazione:**
- con il motore acceso compare l'etichetta «Linea migliore» nel pannello laterale;
- la linea è visualizzata in SAN, non come coordinate UCI (`e2e4`), partendo dalla posizione
  corrente analizzata;
- la linea viene aggiornata con l'ultima PV ricevuta dal motore, preferibilmente quella alla
  profondità più recente;
- durante l'avvio dell'analisi è possibile mostrare uno stato «Analisi in corso…» e, in
  assenza di PV, non viene mostrata una linea obsoleta;
- il testo va a capo nel pannello senza creare overflow orizzontale o spostare la scacchiera;
- spegnendo il motore la linea scompare insieme ai dati di analisi;
- la funzionalità resta limitata al dettaglio variante come aiuto allo studio e non entra nel
  flusso di allenamento, nell'editor o nella pagina «Gioca contro il computer».

**Preanalisi tecnica:** `parseInfoLine` oggi intercetta solo il primo token dopo `pv` e lo
salva in `UciScore.pv`; occorre conservare l'intera sequenza UCI. La sequenza va convertita
in SAN usando la FEN corrente e `chess.js`, quindi esposta dal `StockfishService` al pannello
motore. Il backend e il database non sono coinvolti; non serve una nuova impostazione UCI.

**Fuori perimetro:** Multi-PV e visualizzazione di più linee, blunder detection, frecce o
highlight sulla scacchiera, click sulla linea per eseguirla, opening explorer, modifiche al
training e modifica della pagina «Gioca contro il computer».

**Relazioni:** ISSUE-014 può eventualmente configurare `MultiPV` in futuro, ma non è un
prerequisito per questa prima linea singola. Riusa il supporto esistente di `StockfishService`,
`parseInfoLine` ed `EvalBar`. Il perimetro iniziale è il dettaglio variante mostrato nella
schermata di riferimento; l'editor e la pagina «Gioca contro il computer» restano esclusi.

**Esito (R21, 2026-08-05):** `UciScore.pv` conserva ora l'intera sequenza UCI (`string[]`,
vuota se assente) e si ferma al primo token non-mossa, così `multipv` o campi emessi dopo la
linea non la inquinano. `pvToSan` la converte in SAN con `chess.js` a partire dalla FEN
analizzata — fermandosi alla prima mossa non applicabile invece di scartare tutta la linea —
e `numberedPv` la numera (`1. e4 e5 2. Nf3`, oppure `12… Nc6 13. Nf3` se muove il Nero).
`StockfishService.bestLine` espone la linea e viene azzerata da `analyse()`, `stop()` e
`dispose()`: solo le righe `info` con `pv` la aggiornano, quindi vince sempre la profondità
più recente. Allo spegnimento `stop()`
svuota valutazione e linea e chiude un gate interno (`acceptingInfo`), così le righe `info`
che il worker emette *dopo* lo stop non ripopolano i segnali: alla riaccensione la UI riparte
sempre da «Analisi in corso…» e mostra solo dati della nuova analisi. Nel template il blocco
`.engine-line` vive dentro `.engine-panel` del pannello laterale, tra i controlli motore e
«Allena questa variante»; mostra «Analisi in corso…» finché non arriva la prima PV. Verifica
live: worker reale a prof. 14, PV completa in SAN (arrocco e promozione inclusi), pending per
~840ms all'avvio a freddo, scacchiera ferma a `x=64 y=99 w=760` mentre la linea cresce, nessun
overflow orizzontale a 1440/1280/1024/768/375/320 (a 320px la linea scorre in verticale entro
`max-height`). Frontend: 228 test verdi, build ok.

### Punti aperti — correlazione delle ricerche Stockfish

**Race tra due FEN consecutivi (da valutare):** quando l'utente naviga rapidamente da una
posizione A a una posizione B con il motore già acceso, l'app invia `stop`, `position fen B` e
`go` senza aspettare una conferma del worker. Una riga `info ... pv` della ricerca A, già in
coda, può quindi arrivare dopo l'aggiornamento di `currentFen` a B. La PV verrebbe convertita
in SAN usando B e, se le prime mosse sono ancora legali, mostrata temporaneamente come linea di
B. Il gate `acceptingInfo` introdotto in R21 risolve solo il caso **motore spento**: non può
distinguere a quale delle due ricerche appartenga una riga `info` mentre l'analisi resta attiva.

Non è classificata ora come bug né come evolutiva: va prima riprodotta con un test che simuli
messaggi UCI in ritardo fra due chiamate consecutive ad `analyse()`, stimandone frequenza e
impatto nell'uso reale. Se confermata e visibile, aprire una issue bug con priorità legata alla
fuorvianza della linea; se richiederà un riassetto del ciclo di vita UCI per robustezza generale,
valutarla come evolutiva tecnica. Una possibile direzione è serializzare la transizione,
attendendo il `bestmove` di stop prima di accettare i dati della ricerca successiva; non basta un
semplice contatore locale, perché le righe UCI `info` non trasportano l'identificatore della
ricerca.

## ISSUE-007 — "Nascondi barra" ridondante col motore attivo ✅
**OpenSpec:** no · **Effort:** basso · **Rischio:** basso · **Stato: ✅ completata (R21, 2026-08-05).**
**Scope:** quando il motore è acceso esiste un pulsante separato "Nascondi/Mostra barra"
di valutazione, concettualmente ridondante (motore attivo ⇒ barra sempre utile).
**Accettazione:** eliminato il pulsante separato; il toggle del motore controlla anche la
barra (motore on → barra visibile, off → nascosta). Un unico controllo invece di due.
**Note:** verificare se lo stato "barra nascosta" è persistito da qualche parte. Stessa
sezione motore di ISSUE-002/ISSUE-014.

**Esito (R21, 2026-08-05):** verificata l'assenza di persistenza — lo stato viveva solo nel
signal `showEvalBar`, l'unica preferenza in `localStorage` è quella del suono mosse. Signal,
`toggleEvalBar()` e pulsante rimossi da **dettaglio variante ed editor**, che condividevano lo
stesso controllo duplicato: ora `@if (engineOn())` governa da solo la `EvalBar` e la barra
motore espone due soli pulsanti («Motore» e «Gioca contro il computer»). Verifica live su
entrambe le pagine: motore on → barra visibile, off → barra e linea spariscono insieme.

## ISSUE-008 — Rimuovere "Auto-play" dalla navigazione varianti
**OpenSpec:** no · **Effort:** basso · **Rischio:** basso.
**Scope:** il pulsante "Auto-play" (avanzamento automatico delle mosse) è ritenuto inutile:
la navigazione con frecce ←/→ e i pulsanti inizio/indietro/avanti/fine è sufficiente.
**Accettazione:** pulsante e logica di avanzamento automatico rimossi; restano inizio,
←, →, fine; suite test verde.
**Note:** aggiornare eventuali test che referenziano l'auto-play.

## ISSUE-009 — Elenco studi su due colonne ✅
**OpenSpec:** no · **Effort:** basso · **Rischio:** basso · **Stato: ✅ completata (R22, 2026-08-06).**
**Scope:** le card degli studi sono su una colonna singola; su Full HD lo spazio
orizzontale è sottoutilizzato.
**Accettazione:** griglia a due colonne su Full HD; ricaduta a colonna singola su viewport
stretta (tablet/mobile); stile delle card invariato.
**Note:** stessa home di ISSUE-003/ISSUE-011 (coordinare). Definire il breakpoint.

**Esito (R22, 2026-08-06):** contenitore `.list` allargato da 720px a **960px** e
`.study-cards` passata da colonna flex a griglia
`repeat(auto-fit, minmax(min(320px, 100%), 1fr))`, come da mini-spec R22: due colonne
quando entrano card da almeno 320px, una colonna altrimenti — nessun breakpoint fisso.
Il tetto a 960px impedisce la terza colonna (tre card da 320px non entrano mai); il
`min(320px, 100%)` evita l'overflow quando lo spazio utile scende sotto i 320px.
Card, azioni e stile invariati. Verificato live: due colonne da 450px a 1440/1024,
da 354px a 768; colonna singola a 320/280, mai overflow orizzontale.

## ISSUE-012 — Modifica nome/descrizione/colore studio ✅
**OpenSpec:** no · **Effort:** basso · **Rischio:** basso (backend pronto) · **Stato: ✅ completata (R22, 2026-08-06).**
**Scope:** non è possibile modificare nome/descrizione/colore di uno studio dopo la
creazione (unica azione disponibile: eliminazione).
**Accettazione:** pulsante "Modifica" (o icona matita) nel dettaglio studio che apre un
form (inline o dialog) precompilato; alla conferma salva e aggiorna la vista.
**Note:** l'endpoint `PUT /api/studies/{id}` esiste già; manca solo l'UI. Riusa il pattern
form di ISSUE-011 (coordinare). Da decidere: inline vs dialog → deciso **inline
espandibile** nella mini-spec R22.

**Esito (R22, 2026-08-06):** pulsante «Modifica» (icona matita, `aria-expanded`) accanto a
«Elimina studio» nel dettaglio: espande un form inline precompilato che riusa i campi
condivisi `studies/study-form-fields` (stesso modello e controlli della pagina di
creazione/import, come da mini-spec). Il salvataggio usa il `PUT /api/studies/{id}`
esistente **senza inviare `phase`** (scelta alla creazione e mai modificabile, ISSUE-016:
il backend la mantiene quando assente); la vista si aggiorna in place senza perdere
l'elenco varianti già caricato, con toast di esito. «Annulla» richiude senza salvare.
Ai viewport stretti l'intestazione va a capo (pulsanti sotto il titolo) e la riga
nome+meta delle card variante può andare a capo: niente overflow a 320/280px.

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

## ISSUE-011 — Unificare creazione studio + import Lichess ✅
**OpenSpec:** no — mini-spec R22 formalizzata il 2026-08-06 · **Effort:** medio · **Rischio:** medio · **Stato: ✅ completata (R22, 2026-08-06).**
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

### Mini-specifica R22 — ISSUE-011

**Obiettivo.** Riunire in una sola pagina la creazione di uno studio locale e l'import da
Lichess, eliminando i due percorsi concorrenti oggi presenti nella home. ISSUE-012 riuserà
lo stesso modello di form in modalità modifica, ma non cambia il significato della pagina di
creazione/import.

**Route e navigazione.**

- La route canonica è `/studies/new`; deve essere dichiarata prima della route dinamica
  `/studies/:id`.
- Il CTA «Nuovo studio» della home porta a `/studies/new`; il CTA «Importa da Lichess» è
  rimosso dalla home perché confluisce nella stessa pagina.
- La route storica `/studies/import-lichess` viene migrata/reindirizzata a `/studies/new`
  senza perdere gli eventuali query parameter.
- `/studies/new?studyId={id}` conserva il significato attuale: importa una variante per ogni
  capitolo nello studio locale `{id}`. Non aggiorna i metadati, non sostituisce le varianti
  esistenti e non associa automaticamente lo studio alla sorgente Lichess. La pagina verifica
  prima che `{id}` esista e mostra un errore dedicato se non è valido.
- A esito positivo il flusso porta al dettaglio dello studio creato, aggiornato o destinatario.

**Fase e campi del form.** In R22 la pagina crea/importa esclusivamente studi `OPENING`:
la fase non è esposta come scelta e resta il default del contratto. I campi locali sono nome
(obbligatorio), descrizione facoltativa e colore; il link Lichess è facoltativo.

**Flussi utente.**

1. Senza link Lichess il submit usa `createStudy` e crea uno studio vuoto.
2. Con link Lichess valido, «Anteprima» recupera e mostra capitoli e fallimenti prima del
   submit di importazione. Al primo import nome e colore suggeriti da Lichess precompilano il
   form ma restano modificabili; la descrizione resta un metadato locale facoltativo.
3. Se lo stesso `sourceStudyId` è già presente localmente, l'operazione è un upsert: nome,
   descrizione e colore locali restano invariati, mentre le varianti vengono sostituite con
   quelle importate. L'avviso deve renderlo esplicito prima della conferma.
4. Con `studyId` il flusso segue la semantica della route sopra descritta e non applica
   l'upsert per sorgente remota.

**Lichess e OAuth.** Il controllo Connetti/Disconnetti si sposta nella topbar come comando
compatto, con etichetta accessibile e stato leggibile; non introduce una riga o un testo che
rompa la topbar a viewport stretti. Quando l'OAuth parte dalla pagina `/studies/new`, URL
Lichess e bozza dei campi locali sono salvati temporaneamente in `sessionStorage` e ripristinati
al ritorno dal callback; il `returnTo` preserva anche `studyId` quando presente.

**Riutilizzo per ISSUE-012.** Creazione/import e modifica condividono il modello e i controlli
dei metadati, ma non la route: la modifica parte dal dettaglio di `/studies/:id` tramite un
form **inline espandibile** e usa il `PUT` esistente. Non rende modificabile la fase dello
studio.

**Griglia home (ISSUE-009).** La lista studi allarga il proprio contenitore e usa una griglia
guidata dalla larghezza utile delle card (`repeat(auto-fit, minmax(320px, 1fr))` o soluzione
equivalente), non un breakpoint fisso arbitrario: due colonne quando entrano card da almeno
320px, una colonna altrimenti. Card, azioni e stile restano invariati.

**Limite noto dell'import in uno studio esistente.** Il percorso con `studyId` conserva il
contratto attuale: una richiesta di creazione per capitolo, senza nuova API transazionale. In
caso di errore di rete o backend dopo alcune richieste, i capitoli già creati restano nello
studio e l'interfaccia comunica l'errore; la transazionalità dell'intero import è fuori scope di
R22 e potrà diventare un'attività tecnica separata.

**Fuori perimetro.** Nessuna nuova API backend, nessun cambio del parser o del formato PGN,
nessun import Lichess per Mediogioco/Finale, nessuna nuova funzionalità Lichess oltre OAuth,
preview e upsert già disponibili.

**Accettazione e verifica.** Testare creazione locale, URL invalido, anteprima, primo import,
upsert con conservazione dei metadati, `studyId` esistente e inesistente, import con `studyId`,
redirect e ritorno OAuth con bozza ripristinata. Verifica manuale: home senza form/CTA duplicati,
dettaglio dopo ogni esito, form inline di modifica e topbar utilizzabile a 1440px, 1024px,
768px, 320px e 280px. ISSUE-009 completa nello stesso rilascio la griglia a due colonne quando
la larghezza delle card lo consente e a una colonna altrimenti; ISSUE-012 verifica il riuso del
form in modifica. Il caso di fallimento parziale dell'import con `studyId` è coperto come limite
noto, senza promettere rollback.

### Esito R22 — ISSUE-011 (2026-08-06)

Implementata come da mini-spec, solo frontend (nessuna nuova API, parser invariato):

- **Pagina** `studies/study-new` su route `/studies/new`, dichiarata prima di
  `studies/:id`; la route storica `/studies/import-lichess` è un **redirect relativo** che
  preserva i query param (verificato: `?studyId=7` sopravvive al redirect). La vecchia
  pagina `lichess-import` è stata rimossa. Home: «Nuovo studio» è ora un link alla pagina,
  form inline e CTA «Importa da Lichess» eliminati.
- **Campi condivisi** `studies/study-form-fields` (nome/colore/descrizione con `model()`
  two-way): stessi controlli per creazione/import e per la modifica inline di ISSUE-012.
  La fase non è esposta: `createStudy`/`importLichess` non la inviano (default `OPENING`).
- **Flussi**: senza link → `createStudy` e navigazione al dettaglio; con link, «Anteprima»
  obbligatoria prima del submit (pulsante disabilitato + hint se l'URL è compilato senza
  anteprima; un URL diverso invalida l'anteprima precedente). Al primo import nome e colore
  suggeriti precompilano i campi **senza sovrascrivere valori digitati dall'utente**;
  nell'upsert i campi si disabilitano e mostrano i metadati locali che resteranno invariati,
  con l'avviso esplicito prima della conferma. Con `?studyId` la pagina verifica che lo
  studio esista **e sia `OPENING`** (errore dedicato altrimenti), nasconde i campi locali,
  avvisa della semantica additiva e invia una `addVariant` per capitolo; in caso di errore a
  metà il messaggio segnala che alcuni capitoli potrebbero essere già stati aggiunti
  (limite noto, nessun rollback).
- **Topbar**: comando compatto Connetti/Disconnetti Lichess vicino al toggle suono
  (`aria-pressed` + etichetta accessibile; verde quando connesso, palette del badge
  backend). Sotto ~1040px resta la sola icona rotonda (con testo, brand+tab+controlli non
  starebbero su una riga tra 768 e ~1040px); ≤400px lo stato backend diventa un pallino
  colorato per tenere la prima riga intatta a 320/280px. Il `returnTo` è l'URL corrente,
  quindi preserva anche `?studyId`.
- **Bozza OAuth**: `sessionStorage['was.studyNew.draft']` autosalvata a ogni modifica
  (effect), eliminata da `ngOnDestroy`: sopravvive solo agli unload pieni (redirect OAuth,
  refresh) e viene ripristinata al ritorno, solo per lo stesso contesto `studyId`. Default
  di `consumeReturnTo` aggiornato a `/studies/new`.
- **Verifiche**: frontend **249 test verdi** (30 file; sostituita la spec di
  `lichess-import` con `study-new`, aggiornate `study-list`/`study-detail`/`app`/
  `app.routes`/`lichess-auth`), build ok. Live su mock backend locale (il DB H2 condiviso
  non è stato toccato): creazione, anteprima con suggerimenti, import nuovo studio, import
  con `studyId` (una POST per capitolo), errori dedicati, redirect storico, bozza
  ripristinata dopo unload pieno e pulita su navigazione in-app; payload verificati senza
  `phase`. Layout senza overflow a 1440/1024/768/320/280. Nota: dalla rete di sviluppo
  l'API pubblica Lichess ha risposto **401** (restrizione lato Lichess/rete, codice di
  fetch invariato da P14/P15): l'OAuth end-to-end con account reale resta da riverificare
  alla prima occasione, come già fatto in P15.

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
