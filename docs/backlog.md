# Backlog tecnico — punti 1-20

> Derivato dalla raccolta grezza `lista-problemi-raw.md` (input non strutturato).
> Questo file è il **backlog controllabile**: schede per issue, classificazione,
> dipendenze, rischi e sequenza consigliata. Aggiornare qui lo stato man mano che le
> issue vengono lavorate. Gli ID (`ISSUE-0NN`) sono **stabili** e non vanno riusati.

---

## ✓ Nota di coerenza (RISOLTA con ISSUE-019)

> Risolta il 2026-06-29. Il `scacchi.mv.db` è confermato **tracciato di proposito**
> (`.gitignore` lo ri-include con `!backend/data/*.mv.db`) come DB di esempio. La
> baseline Liquibase usa una precondizione `MARK_RAN` per convivere col DB committato;
> il DB è stato ri-committato una volta con `DATABASECHANGELOG`. `architettura.md` e
> `stato-corrente.md` sono stati allineati. Dettagli in [`specs/liquibase.md`](specs/liquibase.md).

Storico del problema (per memoria): il punto 19 assumeva che il file *"non venisse
committato (escluso da `.gitignore`)"*, mentre era tracciato di proposito; i doc
dicevano erroneamente "non viene committato".

---

## Schede per issue

### ISSUE-001 — Layout `/play` errato su Full HD
- **Tipo:** bug · **Area:** frontend · **R.tecnico:** basso · **Impatto:** medio
- **Dipendenze:** pattern "layout 2 colonne" condiviso con ISSUE-002 · **Prerequisiti:** nessuno
- **Dati:** no · **Migrazione:** no · **Test automatici:** no (verifica visiva) · **1 sessione:** sì
- **Accettazione:** a 1920×1080 massimizzato nessuna scrollbar verticale; titolo/heading/pulsanti nella colonna destra; pannello destro interamente visibile.
- **Ambiguità:** enumerare i pulsanti esatti leggendo il componente (testo illeggibile nello screenshot).

### ISSUE-002 — Pulsanti motore fuori viewport (dettaglio variante)
- **Tipo:** bug · **Area:** frontend · **R.tecnico:** basso · **Impatto:** medio
- **Dipendenze:** stessa pagina di ISSUE-010; pattern affine a ISSUE-001 · **Prerequisiti:** nessuno
- **Dati:** no · **Migrazione:** no · **Test:** no · **1 sessione:** sì
- **Accettazione:** i due pulsanti nel pannello destro; nessuna scrollbar verticale a 1080p.
- **Ambiguità:** nessuna rilevante.

### ISSUE-003 — Header home: titolo/pulsanti non vanno a capo
- **Tipo:** bug/UX · **Area:** frontend · **R.tecnico:** basso · **Impatto:** basso
- **Dipendenze:** stessa home/header di ISSUE-009 e ISSUE-011 · **Prerequisiti:** nessuno
- **Dati:** no · **Migrazione:** no · **Test:** no · **1 sessione:** sì
- **Accettazione:** a Full HD titolo e pulsanti su una riga; wrap solo a viewport stretta.
- **Ambiguità:** nessuna.

### ISSUE-004 — Suono assente sulla prima mossa dopo ritorno focus
- **Tipo:** bug · **Area:** audio (frontend) · **R.tecnico:** medio · **Impatto:** basso-medio
- **Dipendenze:** stesso `MoveSoundService` di ISSUE-005 · **Prerequisiti:** nessuno
- **Dati:** no · **Migrazione:** no · **Test:** sì consigliato (`AudioContext.resume` difficile in headless) · **1 sessione:** sì
- **Accettazione:** dopo minimizza/ripristina, la prima mossa suona; rispetta il toggle.
- **Ambiguità:** testabilità automatica reale in jsdom/Vitest.

### ISSUE-005 — Nessun suono per le mosse del computer (`/play`)
- **Tipo:** bug · **Area:** audio/motore (frontend) · **R.tecnico:** basso · **Impatto:** basso-medio
- **Dipendenze:** stesso servizio di ISSUE-004; vive in `/play` (ISSUE-001) · **Prerequisiti:** nessuno
- **Dati:** no · **Migrazione:** no · **Test:** sì consigliato · **1 sessione:** sì
- **Accettazione:** la mossa del motore emette suono; rispetta il toggle globale.
- **Ambiguità:** nessuna.

### ISSUE-006 — Badge "Misto": contrasto testo metà scura
- **Tipo:** bug (UI/accessibilità) · **Area:** frontend · **R.tecnico:** basso · **Impatto:** basso
- **Dipendenze:** nessuna · **Prerequisiti:** nessuno
- **Dati:** no · **Migrazione:** no · **Test:** no · **1 sessione:** sì
- **Accettazione:** testo leggibile su entrambe le metà (colore testo metà scura = sfondo metà chiara).
- **Ambiguità:** nessuna.

### ISSUE-007 — "Nascondi barra" ridondante con motore attivo
- **Tipo:** UX/refactoring-UI · **Area:** frontend (motore) · **R.tecnico:** basso · **Impatto:** basso
- **Dipendenze:** stessa sezione motore di ISSUE-002/ISSUE-014 · **Prerequisiti:** nessuno
- **Dati:** no · **Migrazione:** no · **Test:** sì consigliato (logica toggle) · **1 sessione:** sì
- **Accettazione:** rimosso il pulsante separato; toggle motore controlla la barra (on→visibile, off→nascosta).
- **Ambiguità:** verificare se lo stato "barra nascosta" è persistito.

### ISSUE-008 — Rimuovere "Auto-play"
- **Tipo:** UX/refactoring · **Area:** frontend · **R.tecnico:** basso · **Impatto:** basso
- **Dipendenze:** nessuna · **Prerequisiti:** nessuno
- **Dati:** no · **Migrazione:** no · **Test:** aggiornare eventuali test che lo coprono · **1 sessione:** sì
- **Accettazione:** pulsante e logica rimossi; navigazione inizio/←/→/fine intatta; suite verde.
- **Ambiguità:** presenza di test esistenti che referenziano auto-play.

### ISSUE-009 — Elenco studi su due colonne
- **Tipo:** UX · **Area:** frontend · **R.tecnico:** basso · **Impatto:** basso-medio
- **Dipendenze:** stessa home di ISSUE-003/ISSUE-011 · **Prerequisiti:** nessuno
- **Dati:** no · **Migrazione:** no · **Test:** no · **1 sessione:** sì
- **Accettazione:** griglia 2-col a Full HD, 1-col a viewport stretta, stile card invariato.
- **Ambiguità:** breakpoint esatto.

### ISSUE-010 — Pannello sinistro varianti nel dettaglio (3 colonne)
- **Tipo:** feature · **Area:** frontend + routing · **R.tecnico:** medio · **Impatto:** medio-alto
- **Dipendenze:** riusa il guard editor (`confirm.service`/`canLeaveEditor`); stessa pagina di ISSUE-002 · **Prerequisiti:** nessuno (dati già esposti da `GET /api/studies/{id}`)
- **Dati:** no · **Migrazione:** no · **Test:** sì · **1 sessione:** sì (borderline)
- **Accettazione:** colonna varianti dello studio (solo se la variante vi appartiene); attiva evidenziata; click naviga; in editor con modifiche non salvate → dialog conferma prima di navigare.
- **Ambiguità:** comportamento se la variante non appartiene a studio; tenuta del 3-col su laptop (cfr. area delicata "responsive board").

### ISSUE-011 — Unificare creazione studio + import Lichess
- **Tipo:** feature/refactoring-flow · **Area:** frontend + routing · **R.tecnico:** medio · **Impatto:** medio
- **Dipendenze:** endpoint esistenti (`createStudy`, `importLichess`); sposta la connessione Lichess in topbar (cluster di ISSUE-015/017); home di ISSUE-003/009 · **Prerequisiti:** nessuno backend
- **Dati:** no · **Migrazione:** no · **Test:** sì · **1 sessione:** sì (borderline — il più pesante del gruppo "subito")
- **Accettazione:** pagina unica `/studies/new` con campi studio + link Lichess opzionale; senza link → studio vuoto; con link → import/upsert; CTA home aggiornate; connessione Lichess in topbar; flusso `?studyId` ancora funzionante.
- **Ambiguità:** posizione esatta della connessione Lichess nel cluster topbar.

### ISSUE-012 — Modifica nome/descrizione/colore studio
- **Tipo:** feature (piccola) · **Area:** frontend (backend pronto) · **R.tecnico:** basso · **Impatto:** medio
- **Dipendenze:** `PUT /api/studies/{id}` esiste; riusa pattern form di ISSUE-011 · **Prerequisiti:** nessuno
- **Dati:** no · **Migrazione:** no · **Test:** sì · **1 sessione:** sì
- **Accettazione:** pulsante Modifica nel dettaglio studio; form precompilato; salva e aggiorna la vista.
- **Ambiguità:** inline vs dialog.

### ISSUE-013 — Menu contestuale editor (cancella sottoalbero / promuovi a mainline)
- **Tipo:** feature · **Area:** frontend · **R.tecnico:** medio · **Impatto:** medio
- **Dipendenze:** riusa `promoteToMainline` (`move-tree.ts`) e `confirm.service`; salva via `PUT /api/variants/{id}` · **Prerequisiti:** nessuno
- **Dati:** no (manipola il `tree` JSON, nessun cambio schema) · **Migrazione:** no · **Test:** sì (logica cancellazione, pura) · **1 sessione:** sì
- **Accettazione:** right-click su mossa → menu; "Cancella dalla successiva in poi" elimina i figli con conferma; "Promuovi a mainline" solo su sotto-varianti; click sinistro invariato; voci distruttive distinte.
- **Ambiguità:** accessibilità da tastiera; coerenza di `moves[]` (mainline derivata) dopo l'operazione.

### ISSUE-014 — Personalizzazione parametri motore Stockfish (UCI)
- **Tipo:** feature + investigazione · **Area:** motore (frontend) · **R.tecnico:** medio-alto · **Impatto:** medio
- **Dipendenze:** confluisce nell'infrastruttura di ISSUE-017 (accesso/persistenza) · **Prerequisiti:** audit UCI del build asm.js; ISSUE-017 (se persistenza su DB); ISSUE-019 (se `app_settings`)
- **Dati:** dipende (DB se `app_settings`, no se localStorage) · **Migrazione:** dipende · **Test:** sì · **1 sessione:** no
- **Accettazione:** audit documentato delle opzioni UCI realmente esposte; UI per i parametri supportati; valori applicati al motore; persistenza.
- **Ambiguità:** quali opzioni il build espone davvero; dove persistere.

### ISSUE-015 — Pagina info applicazione + versioni
- **Tipo:** feature (piccola) · **Area:** frontend + backend (endpoint versione) · **R.tecnico:** basso-medio · **Impatto:** basso
- **Dipendenze:** cluster topbar (ISSUE-011/017) · **Prerequisiti:** decisione su come esporre la versione backend
- **Dati:** no · **Migrazione:** no · **Test:** sì (endpoint + componente) · **1 sessione:** sì
- **Accettazione:** pulsante "?" topbar; mostra nome, autore, versione FE (da `package.json`), versione BE (da endpoint).
- **Ambiguità:** Actuator `/actuator/info` vs `GET /api/info` (vincolo "no nuove librerie"); iniezione versione FE a build time.

### ISSUE-016 — Direzione strategica: tutte le fasi del gioco (mediogioco/finale)
- **Tipo:** visione strategica · **Area:** prodotto (FE+BE+DB) · **R.tecnico:** alto · **Impatto:** alto
- **Dipendenze:** ISSUE-019 (Liquibase) per le nuove entità; commenti-mosse si sovrappongono al campo `comment` su `MoveNode` · **Prerequisiti:** artefatti **OpenSpec**, ISSUE-019, decisione struttura DB
- **Dati:** sì (posizioni, campo `comment` su MoveNode, FEN custom) · **Migrazione:** sì · **Test:** sì · **1 sessione:** no
- **Accettazione:** non definibile finché non esistono gli artefatti OpenSpec approvati (criterio d'ingresso, non d'uscita).
- **Ambiguità:** struttura DB (condivisa con tag-fase vs separata) e altre — da risolvere via OpenSpec.

### ISSUE-017 — Menu "Impostazioni" (hub) + parametrizzazione SM-2
- **Tipo:** feature + infrastruttura UI · **Area:** frontend + backend + database · **R.tecnico:** medio-alto · **Impatto:** medio
- **Dipendenze:** ISSUE-019 (tabella `app_settings`, se persistenza su DB); ospita ISSUE-014, affianca ISSUE-015; tocca `ReviewScheduler` (oggi statico) · **Prerequisiti:** ISSUE-019; decisione persistenza (DB vs localStorage)
- **Dati:** sì se `app_settings` · **Migrazione:** sì se `app_settings` · **Test:** sì (refactor scheduler parametrizzato + endpoint) · **1 sessione:** no
- **Accettazione:** ingranaggio topbar → pagina impostazioni; sezione SM-2 con parametri editabili e validati; salvataggio persistente; valori applicati dai successivi allenamenti (non retroattivi); lo scheduler legge i parametri.
- **Ambiguità:** persistenza DB vs localStorage (se localStorage → niente Dati/Migrazione e nessuna dipendenza da ISSUE-019).

### ISSUE-018 — Revisione di sicurezza dell'intero progetto
- **Tipo:** audit · **Area:** sicurezza (trasversale) · **R.tecnico:** basso · **Impatto:** basso diretto / potenzialmente alto se emergono falle
- **Dipendenze:** nessuna; supportabile dalla skill `/security-review` · **Prerequisiti:** nessuno
- **Dati:** no · **Migrazione:** no · **Test:** no (produce report) · **1 sessione:** sì
- **Accettazione:** report con criticità per gravità; conferma assenza segreti/token in repo+history; valutazione token Lichess; verifica logging/errori/CORS.
- **Ambiguità:** profondità dello scan dipendenze (ora vs CI/CD).

### ISSUE-019 — Introduzione Liquibase (PRIORITÀ MASSIMA)
> ✅ **FATTO (2026-06-29).** Commit `85b4a54`. Schema gestito da Liquibase (`spring-boot-liquibase`),
> baseline `0001-baseline.yaml` con precondizione `MARK_RAN`, `ddl-auto: none`. 66 test verdi;
> avvio dev sul DB committato verificato (MARK_RAN, dati intatti). Spec: [`specs/liquibase.md`](specs/liquibase.md).
> **Sblocca:** ISSUE-016, ISSUE-017, ISSUE-014 (persistenza su DB).
- **Tipo:** infrastruttura · **Area:** database/backend · **R.tecnico:** medio · **Impatto:** basso diretto / alto per stabilità multi-postazione
- **Dipendenze:** nessuna a monte; **prerequisito** di ISSUE-016, ISSUE-017, ISSUE-014(se DB) · **Prerequisiti:** risolvere prima l'incoerenza DB-esempio/`.gitignore` (vedi nota in apertura); **specifica dedicata** (vincolo CLAUDE.md: nessun cambio infrastrutturale senza spec)
- **Dati:** no (cattura lo schema attuale come baseline) · **Migrazione:** sì (introduce framework + baseline) · **Test:** sì (avvio applica changelog) · **1 sessione:** sì (scope minimo)
- **Accettazione:** dipendenza in `pom.xml`; `ddl-auto=validate|none`; changelog baseline = schema corrente; il backend si avvia applicando le migrazioni; convenzione changeset documentata.
- **Ambiguità:** baseline generata dall'H2 corrente vs scritta a mano; convivenza tra DB di esempio committato (che includerà `DATABASECHANGELOG`) e changelog.

### ISSUE-020 — Allenamento: sotto-varianti annidate mai proposte
- **Tipo:** bug (funzionale) · **Area:** frontend (training loop `variant-training`); da verificare se coinvolge anche il backend (validazione mosse) · **R.tecnico:** medio · **Impatto:** medio-alto (linee memorizzate non allenabili)
- **Dipendenze:** nessuna; tocca il traversal del modello `MoveNode` (non lo schema) · **Prerequisiti:** nessuno
- **Dati:** no (l'albero è salvato correttamente; è un bug di enumerazione/traversal) · **Migrazione:** no · **Test:** sì (caso pronto: variante 293 / PGN nella raccolta grezza) · **1 sessione:** sì
- **Accettazione:** durante l'allenamento ogni linea dell'albero, a qualunque profondità di annidamento, è proponibile; in particolare `11…Nxa1 12.Qd5+ Ke7 13.Qxe5+ Kd7 14.Qe6#` su `/variants/293`.
- **Ambiguità:** se è solo frontend (`variant-training`) o coinvolge la validazione backend delle mosse attese; come l'allenamento enumera i rami allenabili (sotto-varianti di primo livello vs annidate, eventuale limite di profondità).

---

## Tabella riassuntiva

| ID | Titolo | Tipo | Area | R.tec | Imp | Dati | Migr | Test | 1-sess | Quando |
|----|--------|------|------|:-----:|:---:|:----:|:----:|:----:|:------:|--------|
| 001 | Layout `/play` | bug | FE | basso | medio | no | no | no | sì | subito |
| 002 | Pulsanti motore fuori viewport | bug | FE | basso | medio | no | no | no | sì | subito |
| 003 | Header home wrap | bug/UX | FE | basso | basso | no | no | no | sì | subito |
| 004 | Suono dopo focus | bug | audio | medio | b-m | no | no | sì* | sì | subito |
| 005 | Suono mosse computer | bug | audio | basso | b-m | no | no | sì | sì | subito |
| 006 | Badge "Misto" contrasto | bug | FE | basso | basso | no | no | no | sì | subito |
| 007 | "Nascondi barra" ridondante | UX | FE | basso | basso | no | no | sì | sì | subito |
| 008 | Rimuovere "Auto-play" | UX | FE | basso | basso | no | no | sì | sì | subito |
| 009 | Studi due colonne | UX | FE | basso | b-m | no | no | no | sì | subito |
| 010 | Pannello varianti 3-col | feature | FE/rout | medio | m-a | no | no | sì | sì° | subito |
| 011 | Unifica crea+import | feature | FE/rout | medio | medio | no | no | sì | sì° | subito |
| 012 | Modifica studio | feature | FE | basso | medio | no | no | sì | sì | subito |
| 013 | Menu contestuale editor | feature | FE | medio | medio | no | no | sì | sì | subito |
| 014 | Parametri Stockfish | feature | motore | m-alto | medio | dip. | dip. | sì | no | spec separata |
| 015 | Info + versioni | feature | FE/BE | b-m | basso | no | no | sì | sì | subito |
| 016 | Direzione multi-fase | visione | prodotto | alto | alto | sì | sì | sì | no | non ancora |
| 017 | Impostazioni + SM-2 | feat/infra | FE/BE/DB | m-alto | medio | sì† | sì† | sì | no | dopo Liquibase |
| 018 | Revisione sicurezza | audit | sicurezza | basso | b/alto‡ | no | no | no | sì | subito |
| 019 | Liquibase | infra | DB | medio | alto‡ | no | sì | sì | sì | ✅ fatto |
| 020 | Sotto-varianti annidate in allenamento | bug | FE | medio | m-a | no | no | sì | sì | subito |

<sub>\* difficile in headless · ° borderline · † solo se persistenza su DB · ‡ impatto su stabilità/sicurezza, non UX</sub>

---

## Raggruppamenti

**1. Fattibili subito** (no schema, no spec, rischio basso/medio, singola sessione):
ISSUE-001, 002, 003, 004, 005, 006, 007, 008, 009, 010, 011, 012, 013, 015, 018, **020** (019 ✅ già fatto).

**2. Solo dopo Liquibase (ISSUE-019)** (toccano schema / nuove tabelle):
ISSUE-017 (`app_settings`), ISSUE-016 (nuove entità + campo `comment`), ISSUE-014 *condizionale* (se i parametri motore sono persistiti su DB).
→ Se ISSUE-017/014 usano `localStorage` invece di `app_settings`, escono da questo gruppo e diventano "subito".

**3. Richiedono specifica separata:**
ISSUE-016 (OpenSpec obbligatorio), ISSUE-014 (audit UCI preliminare), ISSUE-017 (mini-spec per `app_settings` + refactor `ReviewScheduler`), **ISSUE-019 (spec dedicata richiesta da CLAUDE.md)**.

**4. Da non implementare ancora:**
ISSUE-016 (bloccata da OpenSpec + Liquibase). ISSUE-017 e ISSUE-014 bloccate *solo per la parte di persistenza DB* finché non c'è Liquibase.

---

## Dipendenze

- **ISSUE-019 → blocca →** ISSUE-016, ISSUE-017, ISSUE-014 (se DB). *Radice della catena dati.*
- **ISSUE-016 → richiede →** artefatti OpenSpec + ISSUE-019.
- **ISSUE-017 → ospita →** ISSUE-014 (sezione "Motore"); **→ affianca →** ISSUE-015 (cluster topbar); **→ tocca →** `ReviewScheduler`.
- **ISSUE-013 → riusa →** `promoteToMainline` (`move-tree.ts`) + `confirm.service`.
- **ISSUE-010 → riusa →** guard editor (`confirm.service` / `canLeaveEditor`).
- **ISSUE-011 → sposta →** connessione Lichess in topbar; usa endpoint esistenti.
- **Coppie da coordinare (stessa zona di codice):** 001↔002 · 004↔005 (`MoveSoundService`) · 002↔010 (dettaglio variante) · 003↔009↔011 (home/header) · 011↔012 (form studio) · 011↔015↔017 (cluster topbar).

---

## Rischi principali

1. **Incoerenza DB-esempio/`.gitignore` (ISSUE-019)** — presupposto errato; il DB di esempio è tracciato di proposito. Rischio di baseline Liquibase mal progettata. **Da risolvere prima di tutto.**
2. **ISSUE-016** — scope ampio, modello dati nuovo; senza OpenSpec rischio di sovra-ingegnerizzazione.
3. **ISSUE-014** — incertezza sulle opzioni UCI realmente esposte dal build asm.js. Mitigazione: audit prima della UI.
4. **ISSUE-017** — refactor di `ReviewScheduler` da statico a parametrizzato tocca logica testata (66 test BE): rischio regressione SM-2.
5. **ISSUE-004** — `AudioContext` browser-dipendente, difficile da coprire in headless.
6. **Cluster topbar affollato** (suono · "?" · ⚙ · Lichess) — rischio UX e di conflitti di merge tra ISSUE-011/015/017.

---

## Sequenza consigliata

1. ~~**Sciogliere l'incoerenza del punto 19**~~ ✅ fatto — DB di esempio confermato tracciato, doc allineati.
2. ~~**ISSUE-019 (Liquibase)**~~ ✅ fatto (commit `85b4a54`): catena dati sbloccata.
3. **In parallelo, indipendenti da Liquibase:** batch layout/UX (001, 002, 003, 006, 007, 008, 009), batch audio (004, 005) e il bug allenamento **020** (sotto-varianti annidate, caso di test pronto). ← *prossimo naturale*
4. **Anticipare ISSUE-018 (security audit):** indipendente, basso costo, alto valore (skill `/security-review`).
5. **Ora sbloccati da Liquibase:** ISSUE-017 (decidendo `app_settings` vs `localStorage`), poi ISSUE-014.
6. **ISSUE-016 solo dopo** gli artefatti OpenSpec.
