# Sviluppi importanti

> Attività di ampiezza o impatto architetturale rilevante (nuove capacità, nuovo modello
> dati, infrastruttura applicativa). **Destinazione: OpenSpec** — ogni scheda è un
> **seme di change OpenSpec** (problema, obiettivo, impatto su dati/API, prerequisiti,
> criteri d'ingresso), pronta a diventare una proposta in `openspec/changes/<id>/`.
>
> **Sequenza:** da affrontare **dopo** la chiusura di bug ed evolutive (decisione utente).
> Prerequisito tecnico comune già soddisfatto: **Liquibase** (ISSUE-019, fatto).
>
> Indice e classificazione: [`../backlog.md`](../backlog.md). ID `ISSUE-0NN` stabili.

| ID | Titolo | Impatto | Stato pre-OpenSpec |
|----|--------|:-------:|--------------------|
| 016 | Tutte le fasi del gioco (mediogioco/finale) | alto | richiede OpenSpec |
| 017 | Menu "Impostazioni" (hub) + parametrizzazione SM-2 | medio-alto | richiede OpenSpec |
| 014 | Personalizzazione parametri motore Stockfish (UCI) | medio | richiede audit + OpenSpec |

---

## ISSUE-016 — Webapp per tutte le fasi del gioco (mediogioco/finale)
**Why (problema):** la webapp allena solo le aperture. L'utente vuole estenderla a
**mediogioco** e **finale**, con una struttura simile (studi → "posizioni").
**What (obiettivo):**
- Tre sezioni in topbar — **Aperture** (esistente), **Mediogioco**, **Finale** — la cui
  *navigazione/scaffold* è anticipata da **ISSUE-021** (segnaposto già pronti da sostituire).
- Mediogioco e Finale: studi e **posizioni** (le "varianti" qui si chiamano posizioni) con
  - **posizione di partenza personalizzata** (FEN custom valido; il campo `startingFen`
    esiste già su `Variant`, manca l'UI per editarlo);
  - **commenti alle mosse** (testo libero + simboli `!`, `?`, `!!`, `??`, `!?`, `?!`);
  - **gioco contro il motore** dalla posizione di partenza (Stockfish, da adattare a FEN custom).
- **Niente training loop** e **niente spaced repetition (SM-2)** per mediogioco/finale: le
  posizioni si studiano e si giocano, non si "ripetono" come linee da memorizzare.
**Impatto modello dati & API:**
- Nuovo concetto "posizione" (riuso/estensione di `Variant` con un campo "fase", oppure
  entità separate — **da decidere in analisi**).
- `MoveNode` oggi **non** ha un campo `comment` → modifica al modello (changeset Liquibase).
- UI di editing del `startingFen` con validazione scacchistica.
**Prerequisiti:** Liquibase (✅), **artefatti OpenSpec**, decisione struttura DB; ISSUE-021
(scaffold) preferibilmente già fatto.
**Criteri d'ingresso (prima di implementare):** esiste una proposta OpenSpec approvata con
specifiche funzionali, contratti API, modello dati e criteri di accettazione.
**Note:** è la visione strategica del prodotto; va spezzata in più change OpenSpec
incrementali (non una singola sessione).

## ISSUE-017 — Menu "Impostazioni" (hub) + parametrizzazione SM-2
**Why (problema):** non esiste un punto centrale di configurazione; i parametri
dell'algoritmo SM-2 sono **costanti hardcoded** in `ReviewScheduler` e non modificabili.
**What (obiettivo):**
- Pulsante **ingranaggio** in topbar → sottomenu → **pagina impostazioni** a sezioni.
  È l'**infrastruttura condivisa** (ingranaggio, pagina, persistenza, endpoint).
- **Sezione SM-2**: parametri editabili e validati. Candidati (oggi costanti in
  `ReviewScheduler`): `INITIAL_EASE` (2.5), `MIN_EASE` (1.3), primo intervallo (1 g),
  secondo intervallo (6 g), soglia errori per esito negativo (3), e il **cap
  `MAX_INTERVAL_DAYS` (6)** introdotto di recente. I coefficienti della formula EF
  (0.1/0.08/0.02) restano fissi in prima battuta.
- **Sezione Motore**: ospita i parametri Stockfish di **ISSUE-014**.
- Il pulsante info **"?"** di **ISSUE-015** è **affiancato** all'ingranaggio (resta distinto).
**Impatto modello dati & API:** se la persistenza è su DB → nuova tabella `app_settings`
(single-row, contesto single-user) + endpoint `GET`/`PUT /api/settings`; refactor di
`ReviewScheduler` da statico a **parametrizzato** (legge i parametri invece delle costanti).
In alternativa persistenza su `localStorage` → niente DB/migrazione.
**Prerequisiti:** Liquibase (✅, se si va su `app_settings`); decisione persistenza
(DB vs localStorage).
**Criteri d'ingresso:** mini-spec OpenSpec che fissi modello `app_settings`, contratto
endpoint e strategia di refactor dello scheduler (con i 66 test BE come rete anti-regressione).
**Vincoli:** le modifiche ai parametri **non** ricalcolano retroattivamente le schedule
esistenti (valgono dai successivi allenamenti) — da esplicitare in UI.
**Note:** non implementare prima di bug+evolutive. Cluster topbar condiviso (ISSUE-011/015).

## ISSUE-014 — Personalizzazione parametri motore Stockfish (UCI)
**Why (problema):** Stockfish gira con parametri fissi (profondità/tempo hardcoded);
l'utente vuole configurarli via protocollo UCI.
**What (obiettivo):** sezione "Motore" (dentro l'hub Impostazioni di ISSUE-017) con i
parametri UCI rilevanti applicati al motore. Candidati da confermare sull'effettiva build:
`Skill Level`, `UCI_LimitStrength`+`UCI_Elo`, `MultiPV`, `Hash`, `Move Overhead`/
`Minimum Thinking Time`/`Slow Mover`, `Contempt`, `UCI_AnalyseMode` (`Threads` fisso a 1).
**Investigazione preliminare obbligatoria:** audit di quali opzioni espone realmente la
build **asm.js single-thread di Stockfish 10** vendorizzata (via `setoption` UCI) — non
tutte le opzioni native sono disponibili. **Da fare prima di disegnare l'UI.**
**Impatto modello dati & API:** dipende dalla persistenza scelta in ISSUE-017 (tabella
`app_settings` → sì DB/migrazione; `localStorage` → no).
**Prerequisiti:** audit UCI; infrastruttura Impostazioni di ISSUE-017 (accesso/persistenza).
**Criteri d'ingresso:** audit documentato delle opzioni disponibili + decisione di
persistenza (ereditata da ISSUE-017).
**Note:** confluisce in ISSUE-017 per accesso e salvataggio; questa scheda copre il
contenuto specifico del motore.
