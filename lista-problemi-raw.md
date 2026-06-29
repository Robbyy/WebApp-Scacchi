# Lista problemi e miglioramenti — raccolta grezza

> File di lavoro temporaneo. I punti sono raggruppati per area omogenea.
> La classificazione formale (bug bloccanti, UX, feature, ecc.) verrà fatta in un
> secondo momento.

---

## 1. Pagina "Gioca contro il computer" — layout completamente errato su Full HD

**Pagina:** `/play`
**Descrizione:** la scacchiera occupa quasi tutta la larghezza della viewport; il
titolo "STOCKFISH / Gioca contro il computer" è sopra la board e la spinge fuori
dall'altezza visibile (scrollbar verticale); i pulsanti di controllo (ricomincia,
ecc.) finiscono sotto la board e sono illeggibili/irraggiungibili; il pannello
destro con i controlli è praticamente invisibile (tagliato a destra).
**Proposta utente:** adottare lo stesso layout a due colonne del dettaglio variante:
board a sinistra, colonna destra con titolo "STOCKFISH", heading "Gioca contro il
computer", pulsanti di controllo (ricomincia, ecc.) e info partita. Nessun testo
sopra o sotto la board. Il pannello destro con i controlli, attualmente tagliato
fuori dalla viewport a destra, deve essere pienamente visibile e allineato
verticalmente con la board.

---

## 2. Pulsanti "Motore" e "Gioca contro il computer" fuori viewport su Full HD

**Pagina:** dettaglio variante (`/variants/:id`)
**Descrizione:** a 1920×1080 con finestra massimizzata, i due pulsanti sotto la
scacchiera ("♦ Motore" e "Gioca contro il computer") spingono il layout oltre
l'altezza visibile, attivando la scrollbar verticale.
**Proposta utente:** spostare i pulsanti nel pannello laterale destro (dove già
stanno "Modifica variante", "Torna allo studio" e i controlli replay), in modo
che la board e il pannello restino entrambi visibili senza scrollbar verticale.

---

## 3. Header home studi: titolo e pulsanti non devono andare a capo

**Pagina:** home studi (`/`)
**Descrizione:** nell'header della home studi il titolo "I tuoi studi" va a capo
su due righe ("I tuoi" / "studi") e i pulsanti ("Ripeti oggi", "Importa da Lichess",
"Nuovo studio") scendono sotto il titolo anziché restare allineati sulla stessa riga.
Il comportamento è visibile su Full HD con finestra massimizzata: il layout si
restringe inutilmente invece di sfruttare lo spazio orizzontale disponibile.
**Proposta utente:** titolo e pulsanti devono stare sulla stessa riga, senza wrap,
su Full HD. Il titolo rimane a sinistra, i pulsanti a destra, in un flex-row che non
collassa.
**Vincoli:** su viewport stretta il wrap è accettabile.

---

## 4. Suono assente sulla prima mossa dopo che il browser riacquista il focus

**Pagina:** tutte (problema generale del sistema audio)
**Descrizione:** se si minimizza il browser (o si passa a un'altra finestra) e poi
si torna alla webapp, la prima mossa eseguita non emette suono. Le mosse successive
funzionano correttamente. Il comportamento è riproducibile su tutte le pagine dove
è previsto il suono di mossa.
**Causa probabile:** i browser sospendono l'`AudioContext` quando la pagina perde
il focus (per policy di risparmio risorse). Al ritorno del focus, l'`AudioContext`
è nello stato `suspended` e la prima riproduzione fallisce silenziosamente prima
che venga ripristinato.
**Proposta:** nel `MoveSoundService` (o dove viene gestito l'`AudioContext`),
intercettare l'evento di ritorno del focus (`visibilitychange` / `focus`) e
chiamare `AudioContext.resume()` in anticipo, oppure chiamare `resume()` prima di
ogni riproduzione e attenderne la risoluzione. La soluzione deve funzionare senza
richiedere interazioni aggiuntive all'utente.

---

## 5. Nessun suono per le mosse del computer in "Gioca contro il computer"

**Pagina:** `/play`
**Descrizione:** quando si gioca contro il computer, le mosse eseguite dall'utente
emettono il suono correttamente, ma le mosse risposte dal motore Stockfish non
producono alcun suono.
**Proposta:** riprodurre il suono di mossa anche quando è il motore a giocare,
coerentemente con il comportamento delle mosse utente e nel rispetto della
preferenza globale del toggle suono (se il suono è disattivato, nessuna mossa —
né utente né motore — deve emetterlo).

---

## 6. Badge "Misto": testo poco leggibile sulla metà scura

**Pagina:** home studi, dettaglio studio, dettaglio variante (ovunque appaia il badge)
**Descrizione:** il badge "Misto" è diviso in due metà (bianca e scura) per
rappresentare visivamente entrambi i colori. La scritta "Misto" appare con colore
scuro su tutta la larghezza del badge, risultando illeggibile sulla metà scura
(scarso contrasto testo/sfondo).
**Proposta:** usare come colore del testo sulla metà scura lo stesso colore dello
sfondo della metà chiara (sinistra) del badge, in modo che la scritta sia leggibile
su entrambe le metà mantenendo coerenza cromatica. La correzione riguarda solo il
colore del testo nella zona scura, non la forma o la struttura del badge.

---

## 7. Pulsante "Nascondi barra" ridondante quando il motore è attivo

**Pagina:** dettaglio variante / editor (sezione motore)
**Descrizione:** quando il motore è acceso esiste un pulsante separato
"Nascondi/Mostra barra" per nascondere la barra di valutazione. Questo controllo
è concettualmente ridondante: se il motore è attivo, la barra di valutazione deve
essere sempre visibile; non ha senso poterla nascondere mantenendo il motore acceso.
**Proposta utente:** eliminare il pulsante "Nascondi barra" separato. Il toggle del
motore (on/off) controlla anche la visibilità della barra: motore on → barra visibile,
motore off → barra nascosta. Un unico controllo invece di due.

---

## 8. Rimuovere il pulsante "Auto-play" dalla navigazione varianti

**Pagina:** dettaglio variante (sezione replay mosse)
**Descrizione:** il pulsante "Auto-play" scorre automaticamente le mosse della
variante. L'utente lo ritiene inutile: la navigazione con i tasti freccia ←/→
(e i pulsanti inizio/indietro/avanti/fine) è sufficiente e più controllata.
**Proposta utente:** eliminare il pulsante "Auto-play" e la relativa logica di
avanzamento automatico. I controlli di navigazione rimangono: inizio, ←, →, fine.

---

## 9. Elenco studi su due colonne nella home

**Pagina:** home studi (`/`)
**Descrizione:** le card degli studi sono disposte su una singola colonna centrata
nella viewport. Su Full HD con finestra massimizzata lo spazio orizzontale è
abbondante e la lista risulta lunga e poco sfruttata.
**Proposta utente:** disporre le card su due colonne (griglia 2-col). Le card
mantengono lo stesso stile attuale (nome, badge colore, conteggio varianti, pulsante
elimina).
**Vincoli:** su viewport stretta (tablet/mobile) la griglia deve ricadere a una
colonna singola. Stile delle card invariato.

---

## 10. Pannello sinistro con elenco varianti dello studio nel dettaglio variante

**Pagina:** dettaglio variante (`/variants/:id`)
**Descrizione:** nella pagina di dettaglio di una variante non è visibile l'elenco
delle altre varianti dello stesso studio. Per passare a un'altra variante occorre
tornare al dettaglio studio. L'utente vuole poter navigare direttamente tra le
varianti senza uscire dalla pagina.
**Proposta utente:** aggiungere una colonna sinistra alla pagina dettaglio variante
che mostra l'elenco delle varianti dello studio corrente (solo se la variante
appartiene a uno studio). La variante attiva è evidenziata. Cliccando su un'altra
variante si naviga direttamente al suo dettaglio.
**Riferimento visivo (descritto):** Lichess mostra un pannello sinistro a larghezza
fissa (~220px) con l'elenco numerato dei capitoli dello studio; il capitolo attivo
è evidenziato con sfondo colorato; ogni voce mostra numero e nome. Il layout
risultante è a tre colonne: pannello capitoli | scacchiera | pannello mosse/controlli.
Lo stile dell'app deve restare coerente con palette e componenti esistenti
(pergamena, marrone, card), senza copiare l'estetica di Lichess.
**Comportamento con modifiche non salvate:** se la variante corrente è in modalità
editor con modifiche non salvate e l'utente clicca su un'altra variante nel
pannello, deve comparire un dialog di conferma ("Modifiche non salvate — uscire
senza salvare?") analogo al guard già esistente nell'editor. La navigazione avviene
solo dopo conferma esplicita.
**Vincoli espliciti:** solo elenco + navigazione, nessuna altra funzionalità
aggiuntiva in questo punto.

---

## 11. Unificare creazione nuovo studio e import da Lichess in un'unica pagina

**Pagine coinvolte:** home studi (form inline attuale) e `/studies/import-lichess`
**Descrizione:** la creazione di un nuovo studio avviene attualmente con un form
espandibile inline nella home studi, che non mostra il campo descrizione nella sua
posizione naturale e non è allineata stilisticamente con la pagina di import Lichess
(che è già una pagina dedicata). Le due operazioni — creazione da zero e import da
Lichess — sono concettualmente la stessa cosa: nascono entrambe da "voglio un nuovo
studio locale".
**Proposta utente:** creare un'unica pagina dedicata (es. `/studies/new`) che
sostituisce sia il form inline della home sia la pagina `/studies/import-lichess`.
In questa pagina si possono compilare tutti i campi dello studio (nome, descrizione
facoltativa, colore) e, facoltativamente, inserire un link a uno studio Lichess per
importarne i capitoli come varianti. Se il link Lichess è assente, viene creato uno
studio vuoto; se è presente, viene eseguito l'import (con logica di upsert esistente
per studi già importati in precedenza). Il pulsante "Nuovo studio" nella home diventa
un link a questa pagina. Il link "Importa da Lichess" nella home viene rimosso (la
funzionalità è integrata nella stessa pagina).
**Spostamento connessione Lichess:** il blocco "Connetti / Disconnetti Lichess"
(attualmente dentro la pagina di import) va spostato nella topbar dell'applicazione,
vicino al pulsante di toggle suono. Deve essere visibile globalmente e non legato
a una singola pagina.
**Vincoli:** lo stile della nuova pagina deve essere coerente con le altre pagine
dedicate esistenti (breadcrumb, kicker, heading). Il flusso di import dentro uno
studio esistente (`?studyId=…`, usato dal dettaglio studio) deve continuare a
funzionare. L'anteprima capitoli e il rilevamento studio già importato (upsert
notice) restano invariati.

---

## 12. Modifica di nome, descrizione e colore di uno studio esistente

**Pagina:** dettaglio studio (`/studies/:id`)
**Descrizione:** non è possibile modificare il nome o la descrizione di uno studio
dopo la creazione. L'unica operazione disponibile sullo studio è l'eliminazione.
**Proposta utente:** aggiungere la possibilità di modificare nome e descrizione
(e colore) di uno studio esistente. L'endpoint `PUT /api/studies/{id}` esiste già
nel backend; manca solo l'UI.
**Proposta UI:** un pulsante "Modifica" (o icona matita) nel dettaglio studio che
apre un form inline o una dialog con i campi nome, descrizione e colore
pre-compilati con i valori attuali. Alla conferma, salva e aggiorna la vista.

---

## 13. Menu contestuale sulle mosse nell'editor — azioni rapide sul nodo

**Pagina:** editor variante (pannello "Mosse & Varianti")
**Descrizione:** nell'editor non esiste un modo diretto, dal pannello mosse, per
operare sull'albero a partire da una mossa: né cancellare la continuazione dopo un
nodo, né promuovere una sotto-variante a mainline. Il comportamento attuale quando
si modifica una mossa già presente è la creazione di una sotto-variante
(comportamento corretto, da NON modificare); serve però poter governare l'albero
risultante.
**Proposta utente:** aggiungere un menu contestuale (tasto destro) su ogni mossa
nel pannello "Mosse & Varianti", con queste voci:

- **"Cancella dalla mossa successiva in poi"** — *logica nuova.* Elimina tutti i
  nodi figli del nodo selezionato (incluse eventuali sotto-varianti), rendendolo
  foglia. Richiede dialog di conferma (coerente col guard già esistente per la
  cancellazione del sottoalbero).
- **"Promuovi a mainline"** — *riusa logica esistente* (`promoteToMainline` in
  `move-tree.ts`, già esposta dal pulsante "Rendi mainline"). Visibile solo se la
  mossa selezionata è una sotto-variante (mostrata tra parentesi, non su
  `children[0]`). Qui è solo un nuovo punto di accesso, non una reimplementazione.

**Nota di pianificazione:** il grosso del lavoro è l'infrastruttura del menu
contestuale (right-click, posizionamento, dismiss su click-fuori, stile coerente,
accessibilità da tastiera). Le due voci sono aggiunte marginali sopra quella base:
per questo restano un unico punto. Asimmetria di costo: la prima voce è logica
nuova + conferma, la seconda è quasi gratuita (riuso).
**Vincoli:** il menu contestuale non deve alterare il comportamento del click
sinistro (navigazione/selezione della mossa). Le voci distruttive vanno distinte
visivamente (colore/icona). Altre voci sono fuori perimetro per questo punto.

---

## 14. Personalizzazione parametri motore Stockfish

> **Accorpamento confermato:** l'UI di configurazione del motore vive come **sezione
> della pagina "Impostazioni"** (punto 17), che fornisce ingranaggio, pagina,
> persistenza ed endpoint. Questo punto resta per il contenuto specifico del motore
> (audit UCI e parametri candidati), non per l'infrastruttura di accesso/salvataggio.

**Pagina:** sezione "Motore" della pagina Impostazioni (punto 17). I parametri
configurati si applicano dove il motore è usato: dettaglio variante / editor /
"Gioca contro il computer".
**Descrizione:** attualmente Stockfish gira con parametri fissi (profondità/tempo di
calcolo hardcoded). L'utente vuole poter personalizzare i parametri esposti via
protocollo UCI.
**Proposta utente:** implementare una sezione di configurazione del motore con i
parametri UCI rilevanti. Da investigare prima dell'implementazione: quali opzioni
espone concretamente la build asm.js single-thread di Stockfish 10 in uso
(da verificare via `setoption` UCI — non tutti i parametri della versione nativa
sono disponibili nel build vendorizzato).
**Parametri UCI candidati da valutare** (da confermare sull'effettiva build):
- `Skill Level` (0–20): forza del motore — utile per "Gioca contro il computer"
- `UCI_LimitStrength` + `UCI_Elo`: limitazione forza a un ELO stimato
- `MultiPV`: numero di linee mostrate nella barra di valutazione
- `Hash`: dimensione tabella di trasposizione (MB)
- `Threads`: fisso a 1 nel build single-thread — probabilmente non esposto
- `Move Overhead`, `Minimum Thinking Time`, `Slow Mover`: controllo tempo
- `Contempt`: aggressività del gioco
- `UCI_AnalyseMode`: modalità analisi pura vs partita
**Nota tecnica:** la build asm.js single-thread (Stockfish 10) potrebbe esporre un
sottoinsieme ridotto rispetto a Stockfish nativo. Va fatto un audit delle opzioni
realmente disponibili prima di costruire l'UI di configurazione.

---

## 15. Pagina informazioni applicazione e versioni

> **Co-locazione confermata:** il pulsante "?" è **affiancato** all'ingranaggio
> "Impostazioni" (punto 17) nello stesso cluster della topbar (a destra, insieme al
> toggle suono). Resta un pulsante distinto — l'info è sola lettura, non una sezione
> di impostazioni editabili — ma vive accanto all'ingranaggio.

**Pagina/area:** topbar globale + nuova pagina (o dialog) info
**Descrizione:** non esiste attualmente un modo per consultare le informazioni
sull'applicazione (nome, autore, versioni deployate). La versione del frontend e del
backend non è esposta in nessun punto dell'UI.
**Proposta utente:** aggiungere un pulsante "?" nella topbar, vicino al toggle suono,
che apre una pagina (o dialog) con le seguenti informazioni:
- Nome completo dell'applicazione
- Autore
- Versione frontend (da `package.json`, iniettata a build time tramite environment
  Angular)
- Versione backend (da `pom.xml`, esposta via endpoint REST — da valutare se
  usare Spring Boot Actuator `/info` o un endpoint dedicato `/api/info`)

**Nota tecnica preliminare:** occorre verificare come ciascuno dei due progetti
espone la propria versione. Il frontend può leggerla da `environment.ts` (popolato
a build time con la versione di `package.json`). Il backend può esporla tramite
Spring Boot Actuator (endpoint `/actuator/info`, da abilitare e configurare) oppure
con un controller minimale `GET /api/info` che legge la versione dal manifest o da
una costante. Da valutare quale approccio sia più coerente con i vincoli del progetto
(no nuove librerie senza decisione esplicita, Actuator è già una dipendenza Spring
Boot standard).
**Posizione pulsante:** topbar, vicino al toggle suono (stesso lato destro).

---

## 16. Direzione strategica: webapp per l'allenamento di tutte le fasi del gioco

**Tipo:** visione strategica — richiede ulteriore chiarimento su alcuni punti aperti
prima di pianificazione e implementazione.
**Descrizione:** la webapp è attualmente focalizzata sull'allenamento delle aperture.
La direzione futura è espandere a tutte le fasi: aperture, mediogioco e finali.

**Navigazione:** aggiungere tre pulsanti/link nella topbar dell'applicazione, vicino
al brand "WebApp Scacchi", che dirigono a tre sezioni distinte:
- **Aperture** → la sezione attuale (studi + varianti + training + spaced repetition)
- **Mediogioco** → nuova sezione
- **Finale** → nuova sezione

**Struttura di Mediogioco e Finale:** architettura simile a quella delle Aperture
(studi → posizioni), con queste differenze rispetto al modello attuale:
- Le varianti si chiamano **posizioni** (terminologia diversa, struttura analoga).
- Ogni posizione ha una **posizione di partenza personalizzata**: l'utente può
  definire un FEN di partenza diverso da quello iniziale (il campo `startingFen`
  esiste già sull'entità `Variant`, ma l'UI per editarlo non è implementata).
  La posizione deve essere valida (validazione scacchistica).
- Le mosse della posizione possono avere **commenti testuali** allegati ai singoli
  nodi (`MoveNode` attualmente non ha un campo `comment` — è una modifica al modello
  dati). I commenti supportano testo libero e simboli di annotazione standard
  (!, ?, !!, ??, !?, ?!).
- È possibile **giocare una posizione contro il motore** partendo dal FEN di
  partenza della posizione (Stockfish già presente, da adattare per FEN custom).

**Chiarimenti ricevuti:**
- **Nessun training loop** per mediogioco e finale: le posizioni si studiano e si
  giocano contro il motore, non si ripetono come linee da memorizzare.
- **Spaced repetition non applicabile:** l'algoritmo SM-2 (usato nelle Aperture per
  lo scheduling automatico del ripasso) non è rilevante per queste sezioni, non
  avendo training loop.
- **Struttura DB:** da definire in fase di analisi (tabelle condivise con campo
  "fase" oppure entità separate).

**Metodologia di sviluppo:** questo punto, per la sua ampiezza e impatto
architetturale, dovrà essere sviluppato con il supporto di strumenti di specifica
formale come **OpenSpec** (o framework equivalente). Prima di procedere alla
pianificazione e all'implementazione dovranno essere prodotti e presenti gli artefatti
previsti da tale framework (es. specifiche funzionali, contratti API, modelli dati,
criteri di accettazione) che guidino in modo strutturato l'analisi, la pianificazione
e l'implementazione progressiva delle feature. Non procedere senza questi artefatti.

**Punto aperto residuo:** nessuno — sufficientemente descritto per la pianificazione
futura, una volta disponibili gli artefatti OpenSpec.

---

## 17. Menu "Impostazioni" (ingranaggio) — hub di configurazione dell'app

**Pagina/area:** topbar globale (pulsante ingranaggio "Impostazioni") + nuova pagina
di impostazioni con sezioni.
**Descrizione:** non esiste un punto centrale per configurare l'app. In particolare i
parametri dell'algoritmo di ripetizione spaziata SM-2 sono **costanti hardcoded** nel
codice e non modificabili dall'utente (vedi [`docs/sm2.md`](docs/sm2.md)). L'utente
vuole un'interfaccia dedicata, accessibile da un classico pulsante a forma di
**ingranaggio**, in cui modificare e salvare le impostazioni in modo persistente.
**Proposta utente:** aggiungere nella topbar un pulsante **ingranaggio** ("Impostazioni")
che apre un sottomenu; da lì si accede a una **pagina di impostazioni** organizzata in
sezioni. Questo punto è l'**infrastruttura condivisa** (ingranaggio, sottomenu, shell
della pagina, meccanismo di persistenza, endpoint REST) che ospita le diverse aree di
configurazione.

**Sezioni della pagina impostazioni:**
- **Ripetizione spaziata (SM-2)** — parametri descritti qui sotto. *Questa sezione è
  il cuore di questo punto.*
- **Motore (Stockfish)** — parametri UCI; il contenuto di dettaglio è nel **punto 14**,
  che confluisce qui per accesso e persistenza.

**Accesso affiancato:** il pulsante info **"?"** (punto 15) è **affiancato**
all'ingranaggio nello stesso cluster della topbar, ma resta distinto (sola lettura).

**Parametri SM-2 candidati alla parametrizzazione** (oggi fissi in `ReviewScheduler`):
- **Fattore di facilità iniziale** (`INITIAL_EASE`, oggi `2.5`)
- **Fattore di facilità minimo** (`MIN_EASE`, oggi `1.3`)
- **Primo intervallo** dopo il primo esito positivo (oggi `1` giorno — valore
  letterale nel metodo `next()`, da estrarre)
- **Secondo intervallo** dopo il secondo esito positivo (oggi `6` giorni — idem)
- **Soglia errori per esito negativo** (oggi: da `3` errori in su l'allenamento è
  "negativo" e fa scattare il relearning)

I coefficienti della formula di aggiornamento del fattore di facilità (`0.1`, `0.08`,
`0.02`) sono parte canonica di SM-2: in prima battuta **non** esporli (restano fissi),
salvo richiesta esplicita.

**Note tecniche preliminari (da approfondire in analisi):**
- **Backend:** `ReviewScheduler` è oggi logica pura statica con costanti e valori
  letterali. Parametrizzare richiede: (a) una sorgente di configurazione persistente
  (nuova entità/tabella `app_settings` o simile, single-row in contesto single-user),
  (b) passare i parametri a `quality(...)`/`next(...)` invece di leggerli da costanti,
  (c) endpoint REST per leggere/salvare le impostazioni (`GET`/`PUT /api/settings`).
  Attenzione ai vincoli del progetto: niente nuove librerie/infrastrutture senza
  decisione; valutare se basta una tabella applicativa.
- **Effetto sui dati esistenti:** modificare i parametri **non** deve ricalcolare
  retroattivamente le schedule già pianificate; i nuovi valori si applicano dai
  successivi allenamenti. Va esplicitato in UI.
- **Validazione:** i valori vanno validati (es. `INITIAL_EASE ≥ MIN_EASE`, intervalli
  e soglie positivi) lato backend e frontend.

**Relazione con altri punti (decisa):** il menu "Impostazioni" è l'infrastruttura
condivisa. **Accorpati** sotto di esso: i parametri del motore Stockfish (punto 14,
come sezione "Motore"). **Affiancato**: il pulsante info "?" (punto 15) nello stesso
cluster topbar, ma come pulsante distinto di sola lettura. La sezione SM-2 è il
contenuto proprio di questo punto.

**Possibili sviluppi futuri della pagina impostazioni** (fuori perimetro ora): toggle
suono, tema scuro, preferenze di visualizzazione. Da valutare quando emergeranno.

**Vincoli:** stile coerente con le pagine dedicate esistenti. Posizione ingranaggio:
topbar, lato destro (insieme a toggle suono e pulsante "?").

---

## 18. Revisione di sicurezza dell'intero progetto

**Tipo:** attività di revisione/audit trasversale (non una feature). Produce un report
con eventuali correzioni da pianificare.
**Descrizione:** serve una revisione di sicurezza dell'intero progetto (backend +
frontend + configurazioni + repository) per evitare che vengano esposti in chiaro
password, dati sensibili, segreti e token di autenticazione (es. il token OAuth verso
Lichess) o informazioni rilevanti.

**Aree da verificare (checklist iniziale, da ampliare in analisi):**
- **Segreti nel repository e nella git history:** assenza di credenziali, client
  secret, API key o token committati (anche in commit passati). Verificare
  `application.properties`/`application.yml`, file `environment*.ts` Angular,
  eventuali file `.env`. Confermare la copertura di `.gitignore`.
- **Token OAuth Lichess:** oggi è in `sessionStorage` lato frontend (mai sul backend,
  per costruzione). Valutare la superficie di esposizione: leggibilità via XSS,
  durata/scadenza, revoca, assenza in log e in messaggi d'errore. Verificare che il
  `client_id` PKCE e i redirect URI siano gestiti correttamente.
- **Database H2 su file:** è un DB di **esempio** e va bene che la versione già
  presente nel repo ci resti (non è una fuga di dati — scelta intenzionale). Verifica
  residua: il DB campione non deve contenere dati reali sensibili (token OAuth reali,
  credenziali, dati personali), ma solo dati di esempio. Verificare inoltre le
  credenziali di accesso H2 e che la console H2 non sia esposta in produzione.
- **Logging:** nessun token, header di autorizzazione, PGN sensibile o dato personale
  loggato in chiaro (backend e console frontend).
- **Risposte d'errore:** niente stack trace o dettagli interni esposti al client
  (verificare il formato errore `{ field, ply, branchPath, message }` e l'handler
  globale).
- **CORS / proxy:** configurazione del proxy frontend→backend e di eventuali header
  CORS coerente e non permissiva oltre il necessario.
- **Dipendenze:** scan vulnerabilità note (npm audit / equivalente Maven), da valutare
  se includere ora o rimandare alla fase CI/CD.
- **Predisposizione futura (Supabase Auth):** definire fin d'ora le pratiche per la
  gestione sicura di password/token quando arriverà l'autenticazione applicativa
  (terza tornata), così da non introdurre debito di sicurezza.

**Nota:** è un punto di **revisione**: l'output è un elenco di criticità classificate
per gravità. Le eventuali correzioni diventeranno punti/azioni a sé. Non implementare
nulla prima del report.

---

## 19. Introduzione Liquibase per le migrazioni del database — PRIORITÀ MASSIMA

> ✅ **FATTO (2026-06-29)** — commit `85b4a54`. Schema gestito da Liquibase, baseline
> versionata, 66 test verdi + avvio dev verificato. Stato e dettagli in
> [`docs/backlog.md`](docs/backlog.md) (ISSUE-019) e [`docs/specs/liquibase.md`](docs/specs/liquibase.md).
> Testo originale della segnalazione qui sotto.

> **⚠️ Priorità massima per la prossima analisi di pianificazione.**
> Questo punto deve essere affrontato prima di qualsiasi altra modifica che tocchi
> il modello dati, e prima di introdurre Supabase PostgreSQL.

**Tipo:** infrastruttura — prerequisito bloccante per lo sviluppo multi-postazione e
per la migrazione futura a PostgreSQL.

**Descrizione del problema:** il database H2 risiede su file locale (`backend/data/scacchi.mv.db`)
e non viene committato nel repository remoto (escluso per convenzione da `.gitignore`).
Lo schema viene gestito da `spring.jpa.hibernate.ddl-auto=update`, che applica in modo
silenzioso e non tracciato le modifiche strutturali solo sulla postazione dove vengono
sviluppate. Il rischio concreto è il seguente: una modifica al modello dati (nuova colonna,
nuova tabella, cambio tipo) viene sviluppata e testata su una postazione; dopo un `git pull`
sull'altra postazione, il backend si avvia ma il database locale è disallineato —
`ddl-auto=update` non sempre è in grado di applicare tutte le modifiche necessarie
(non allarga colonne esistenti, non rimuove colonne obsolete, non gestisce dati preesistenti),
con il risultato che l'applicazione si comporta in modo inconsistente o non si avvia affatto.
Il problema è già emerso in passato (drift su `source_pgn`, corretto manualmente con ALTER).

**Rischio attuale:** ogni modifica al modello dati è potenzialmente rompente per le
postazioni di sviluppo non aggiornate. Più il progetto cresce (punto 16 in particolare
introduce nuove entità) più il rischio si accumula.

**Proposta:** introdurre **Liquibase** come sistema di migrazioni versionate.
Ogni modifica strutturale al database viene codificata in un changelog versionato
e committato nel repository. Al successivo avvio del backend su qualsiasi postazione,
Liquibase applica automaticamente le migrazioni mancanti, garantendo che ogni
ambiente di sviluppo sia sempre allineato allo schema corrente.

**Scope minimo del punto:**
- Aggiungere la dipendenza Liquibase a `pom.xml` (già disponibile nell'ecosistema
  Spring Boot, nessuna libreria esterna di terze parti).
- Disabilitare `ddl-auto=update` (impostare `validate` o `none`).
- Produrre il changelog iniziale che rappresenta lo schema corrente (baseline),
  da cui partire per tutte le migrazioni future.
- Documentare la convenzione per aggiungere nuovi changeset.

**Relazione con altri punti:** prerequisito diretto per il punto 16 (nuove entità
per mediogioco/finale) e per la migrazione a Supabase PostgreSQL (terza tornata).
Va pianificato e completato prima di qualsiasi altro punto che modifichi il modello dati.
