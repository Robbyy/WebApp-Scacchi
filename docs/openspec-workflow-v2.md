# OpenSpec Workflow V2 — Specifica Operativa

> Specifica operativa e deterministica per la gestione autonoma di una change OpenSpec:
> specifica, implementazione, review, archiviazione e pubblicazione.
>
> - Documento originale (narrativo): [`openspec-workflow.md`](openspec-workflow.md). Resta
>   la fonte per concetti OpenSpec, riferimenti ufficiali, comandi diagnostici e
>   inizializzazione di un nuovo repository. Questa specifica ne è la versione eseguibile.
> - Specifica base: [`github-issue-ai-workflow-v2.md`](github-issue-ai-workflow-v2.md)
>   (di seguito: workflow GitHub V2). Questo documento ne riusa convenzioni, validazione
>   V-OUT, ruoli, confini dell'orchestratore, timeout, protezioni, gestione errori e
>   circuit breaker; qui sono definite solo le parti specifiche di OpenSpec.
> - Stato: workflow operativo adottato il 2026-07-14. Per le nuove change OpenSpec questa
>   specifica prevale sulla guida narrativa; ogni conflitto va registrato come difetto
>   documentale da correggere.

## 1. Oggetto

Una run OpenSpec produce, nell'ordine: una change validata (`proposal → design/specs →
tasks`, schema `spec-driven`), l'implementazione dei task, la quality review,
l'archiviazione della change e — quando previsto — la pubblicazione. La validazione CLI
controlla la struttura; i gate di specifica giudicano il contenuto: nessuna delle due
sostituisce l'altra.

## 2. Modalità Di Esecuzione

| Modalità | Avvio | Pubblicazione |
|----------|-------|---------------|
| Figlia | dal workflow GitHub V2: triage `OPENSPEC` o gate dell'analisi `ROUTE_OPENSPEC` (stato parent: `SPECIFYING`) | nessuna nella figlia: al termine restituisce `SPEC_COMPLETED` al parent, che esegue commit unico, push, commento e chiusura (F9–F11) |
| Standalone | dal backlog, senza issue GitHub | gate di pubblicazione e commit unico + push nella run stessa; termina in `COMPLETED` senza commento né chiusura di issue |

Sessione: la run figlia non apre un nuovo orchestratore. La stessa sessione GPT-5.6 Luna
`xhigh` del parent governa anche la figlia dall'inizio alla fine; cambia solo il workflow
attivo, registrato come stack (parent in `SPECIFYING`, figlia in esecuzione). Gli stati di
sospensione della figlia (`WAITING_DECISION`, `BLOCKED_ENVIRONMENT`, `BLOCKED`) si
riflettono nello stato omologo del parent.

## 3. Ruoli E Modelli

| Ruolo | Esecutore | Note |
|-------|-----------|------|
| Orchestratore | GPT-5.6 Luna `xhigh`, sessione fissa | esegue comandi OpenSpec, controlli meccanici, Git |
| Triage | Sonnet 5 `high` | solo standalone; la figlia riusa il triage della issue |
| Autore OpenSpec | modello dell'analisi deep (politica temporale §3.4 del workflow GitHub V2: Fable fino al 19 luglio 2026 incluso; Opus 4.8 dal 20 luglio 2026), effort massimo | una nuova invocazione effimera per ogni gruppo di artefatti, basata sui file versionati, mai sulla memoria di una sessione precedente |
| Gate di specifica | GPT-5.6 Terra `xhigh` | tre gate distinti: proposal; design+specs; tasks |
| Implementatore, controlli, quality review | come workflow GitHub V2 con parametri deep | fasi F6–F8 richiamate in S9 |

La politica temporale si valuta all'avvio di ogni invocazione di authoring. La verifica di
disponibilità di modelli ed effort (§3.5 del workflow GitHub V2) si applica invariata.

## 4. Artefatti E Change

- Change: `openspec/changes/<change-id>/` con `proposal`, `design`, `specs`, `tasks`
  secondo lo schema `spec-driven` (`design` e `specs` bloccati senza `proposal`; `tasks`
  bloccato senza `design` e `specs`).
- `<change-id>`: breve, specifico, collegato alla fonte quando esiste (convenzione:
  `issue-<numero>-<slug>` per change nate da issue).
- Report di governance (versionati con la change, non interpretati da OpenSpec):

```text
openspec/changes/<change-id>/governance/
  triage.md              solo standalone (contratto §17.4 GitHub V2, esiti OPENSPEC|BLOCKED)
  proposal-gate.md       gate della proposal (§8)
  design-specs-gate.md   gate di design e specs (§8)
  tasks-gate.md          gate dei tasks (§8)
  implementation.md      report dell'implementatore (contratto §17.8 GitHub V2)
  review.md              quality review (contratto §17.9 GitHub V2)
```

- Il V2 non produce `verification.md`: superato dalla quality review unica dopo i controlli
  meccanici dell'orchestratore.
- Ogni report inizia con il blocco esito (§2.1 GitHub V2) e segue le regole di iterazione e
  `Storico` (§6 GitHub V2). Ogni agente scrive solo il proprio report; l'autore scrive solo
  gli artefatti OpenSpec della fase corrente.
- Budget soft dei report di governance: 80 righe (review: 120). Il superamento produce un
  warning, non un blocco.

## 5. Stati, Transizioni E Ripresa

### 5.1 Stati

```text
SPEC_CREATED -> CHANGE_INITIALIZED -> PROPOSAL_WRITTEN -> PROPOSAL_GATED
  -> DESIGN_SPECS_WRITTEN -> DESIGN_SPECS_GATED -> TASKS_WRITTEN -> TASKS_GATED
  -> SPEC_VALIDATED -> IMPLEMENTED -> MECHANICALLY_VERIFIED -> QUALITY_REVIEWED
  -> CHANGE_ARCHIVED -> ARCHIVE_VALIDATED
       -> SPEC_COMPLETED                        (figlia: terminale, ritorno al parent)
       -> COMMIT_READY -> PUBLISHED -> COMPLETED (standalone)
```

Stati di controllo: `WAITING_DECISION`, `BLOCKED_ENVIRONMENT`, `BLOCKED`,
`PUBLISH_FAILED` (solo standalone), `DRY_RUN_COMPLETED` — semantica identica a §7.1 del
workflow GitHub V2.

### 5.2 Transizioni

| Da | Evento / esito | A |
|----|----------------|---|
| avvio | ingresso e preflight superati (S0) | `SPEC_CREATED` |
| `SPEC_CREATED` | change creata e verificata (S1) | `CHANGE_INITIALIZED` |
| `CHANGE_INITIALIZED` | proposal scritta (S2) | `PROPOSAL_WRITTEN` |
| `PROPOSAL_WRITTEN` | gate `READY` (S3) | `PROPOSAL_GATED` |
| `PROPOSAL_GATED` | design e specs scritti (S4) | `DESIGN_SPECS_WRITTEN` |
| `DESIGN_SPECS_WRITTEN` | gate `READY` (S5) | `DESIGN_SPECS_GATED` |
| `DESIGN_SPECS_GATED` | tasks scritti (S6) | `TASKS_WRITTEN` |
| `TASKS_WRITTEN` | gate `READY` (S7) | `TASKS_GATED` |
| ogni gate S3/S5/S7 | `REWORK`, rework disponibile | fase di authoring corrispondente, poi nuovo gate |
| ogni gate S3/S5/S7 | `SPLIT_CHANGE` | `WAITING_DECISION` con proposta di suddivisione; ripresa §5.4 |
| ogni gate S3/S5/S7 | `WAITING_DECISION` | `WAITING_DECISION`; ripresa §5.4 |
| ogni gate S3/S5/S7 | `BLOCKED` | `BLOCKED` o `WAITING_DECISION` per `tipo_blocco` |
| `TASKS_GATED` | `openspec validate --strict` positiva (S8) | `SPEC_VALIDATED` |
| `SPEC_VALIDATED` | implementazione `DONE` (S9 = F6) | `IMPLEMENTED` |
| `IMPLEMENTED` | controlli meccanici superati (S9 = F7) | `MECHANICALLY_VERIFIED` |
| `MECHANICALLY_VERIFIED` | review `APPROVED`/`APPROVED_WITH_NOTES` (S9 = F8) | `QUALITY_REVIEWED` |
| `MECHANICALLY_VERIFIED` | review `CHANGES_REQUESTED`, correzione disponibile | F6 → `IMPLEMENTED` |
| `MECHANICALLY_VERIFIED` | review `REANALYSIS_REQUIRED`, rework residuo | authoring dell'artefatto indicato da `artifact_da_rielaborare` (§8.3), poi gate e ridiscesa; senza rework residuo → `BLOCKED` |
| `QUALITY_REVIEWED` | `openspec archive` eseguito (S10) | `CHANGE_ARCHIVED` |
| `CHANGE_ARCHIVED` | `openspec validate --all` positiva (S11) | `ARCHIVE_VALIDATED` |
| `ARCHIVE_VALIDATED` (figlia) | consegna al parent (S12) | `SPEC_COMPLETED` |
| `ARCHIVE_VALIDATED` (standalone) | gate di pubblicazione superato (S12 = F9) | `COMMIT_READY` |
| `COMMIT_READY` (standalone) | commit e push riusciti (F10) | `PUBLISHED` → `COMPLETED` |
| `COMMIT_READY`/`PUBLISHED` (standalone) | push fallito | `PUBLISH_FAILED` |
| qualunque | prerequisito tecnico mancante | `BLOCKED_ENVIRONMENT` |

### 5.3 Derivazione Dello Stato E Ripresa

Fonti: `openspec status --change "<change-id>"` (completamento artefatti), report di
governance (esiti dei gate), diff e Git (implementazione), `openspec list` e directory
archive (archiviazione), stato remoto (pubblicazione standalone).

Regole: lo stato è il più avanzato interamente supportato dalle fonti; un artefatto scritto
ma senza gate `READY` riprende dal gate; i controlli meccanici (F7) si rieseguono sempre;
contatori dal blocco esito più recente di ogni report; stato non derivabile → `BLOCKED`
senza ricostruzioni inventate. Per la figlia, il parent deriva il proprio stato da quello
della figlia (§2).

### 5.4 Ripresa Dei Gate Da `SPLIT_CHANGE` E `WAITING_DECISION`

Questa sezione si applica agli esiti di S3/S5/S7; il gate sollevante è quello dell'ultimo
report di governance. La decisione del committente viene registrata come `Decisione
ricevuta` secondo §10 del workflow GitHub V2; la ripresa è determinata dalla decisione,
senza scelte semantiche sostitutive dell'orchestratore:

| Esito originario e decisione ricevuta | Ripresa |
|----------------------------------------|---------|
| `WAITING_DECISION`; la decisione non richiede modifiche agli artefatti | rieseguire lo stesso gate con la decisione tra gli input |
| `WAITING_DECISION`; la decisione indica esplicitamente un artefatto corrente o upstream da modificare (S3: `proposal`; S5: `proposal` o `design_specs`; S7: `proposal`, `design_specs` o `tasks`) | rientrare dall'authoring più a monte indicato (S2/S4/S6), poi ridiscendere in ordine gate e fasi successive |
| `SPLIT_CHANGE`; suddivisione rifiutata o prosecuzione esplicita della change corrente senza risagomatura | rieseguire lo stesso gate con la decisione tra gli input |
| `SPLIT_CHANGE`; suddivisione accettata e slice da mantenere nel `<change-id>` corrente identificato | rientrare da S2, riscrivere la proposal con il nuovo scope e ridiscendere S3–S8; gli artefatti e gate downstream precedenti non restano validi |
| `SPLIT_CHANGE`; suddivisione accettata soltanto in nuove change separate | la run corrente non crea né avvia change e resta `WAITING_DECISION`; ogni nuova change richiede una nuova run avviata esplicitamente da S0 e, superato il preflight, S1, con `change-id` e scope autorizzati |

La sola approvazione della proposta di suddivisione non autorizza la creazione delle change
elencate. Se la decisione non identifica senza ambiguità una delle riprese sopra, lo stato
resta `WAITING_DECISION`. L'indicazione di un artefatto downstream rispetto al gate
sollevante non autorizza salti: si riesegue il gate originario e si prosegue nell'ordine
nominale. Dopo un rientro in S2/S4/S6 lo stato diventa il relativo `*_WRITTEN`; gli artefatti
e i report `READY` downstream precedenti sono ignorati finché rigenerati.

La sola riesecuzione post-decisione dell'authoring e dei gate indicati sopra non consuma
rework o correzioni e non azzera i contatori già usati. Ogni successivo `REWORK` e ogni
rientro in F6 restano soggetti a S9 e §9; in particolare, l'implementazione successiva a una
ridiscesa da `REANALYSIS_REQUIRED` consuma la correzione prevista. Nella modalità figlia,
prima di riprendere la figlia il parent torna allo stato `SPECIFYING`.

## 6. Fasi Operative

### S0 — Ingresso E Preflight

- Figlia: eredita preflight, task e triage della run parent. Verifica solo i prerequisiti
  aggiuntivi: CLI `openspec` disponibile; se `openspec/` esiste già, `openspec doctor`
  senza errori bloccanti (mai rilanciare `openspec init` alla cieca); worktree o branch di
  lavoro previsto dal profilo.
- Standalone: preflight completo (F0 del workflow GitHub V2, senza canale issue) + triage
  Sonnet 5 `high` read-only con output `governance/triage.md` (contratto §17.4 GitHub V2).
  Esiti validi: `OPENSPEC` (conferma il percorso, delimita lo scope, indica se la change va
  spezzata prima di creare file) e `BLOCKED` (con `tipo_blocco: decisione` quando il
  percorso corretto è un'altra scelta del committente).
- Transizione: → `SPEC_CREATED`; carenza tecnica → `BLOCKED_ENVIRONMENT`.

### S1 — Creazione Della Change

- Esecutore: orchestratore.
- Azioni: `openspec new change "<change-id>"`; verifica con
  `openspec status --change "<change-id>"` (progresso 0/4, artefatti bloccati secondo lo
  schema). Se la change esiste già con artefatti coerenti → ripresa (§5.3), non
  ricreazione.
- Transizione: → `CHANGE_INITIALIZED`; errore CLI → 1 retry tecnico →
  `BLOCKED_ENVIRONMENT`.

### S2 / S4 / S6 — Authoring (Proposal; Design + Specs; Tasks)

- Esecutore: autore OpenSpec (§3), nuova invocazione per ogni gruppo; scrittura limitata
  agli artefatti OpenSpec della fase.
- Input: fonte (task o voce di backlog), triage, artefatti della change già approvati,
  istruzioni generate da `openspec instructions <artifact> --change "<change-id>" --json`,
  repository in lettura; nei rework anche il report del gate con le richieste puntuali.
- Contenuti minimi:
  - proposal: problema, obiettivo, scope delimitato, criteri di accettazione osservabili,
    decisioni da prendere, slice successivi abilitati;
  - design: decisioni tecniche con alternative considerate e conseguenze su dati, API e
    interfaccia; specs: requisiti e scenari osservabili, senza anticipare gli slice
    successivi;
  - tasks: passi implementativi verificabili, con ordine, dipendenze e test previsti,
    orientati a produrre un incremento verificabile.
- Validazione: V-OUT (§2.2 GitHub V2); nessuna modifica fuori dagli artefatti della fase.
- Transizioni: → `PROPOSAL_WRITTEN` / `DESIGN_SPECS_WRITTEN` / `TASKS_WRITTEN`; output non
  conforme → 1 retry tecnico → `BLOCKED`.

### S3 / S5 / S7 — Gate Di Specifica

- Esecutore: agente Terra `xhigh`, read-only, una nuova sessione per ogni gate; scrive solo
  il proprio report in `governance/`.
- Input: fonte, triage, artefatti della change prodotti finora, repository.
- Esiti, validità e transizioni: §7 e §8.
- Limiti: 1 rework per gate; 1 retry tecnico per invocazione.

### S8 — Validazione CLI Della Change

- Esecutore: orchestratore.
- Azioni: `openspec validate "<change-id>" --type change --strict`.
- Transizione: positiva → `SPEC_VALIDATED`. Fallimento: 1 invocazione di correzione
  formale all'autore (non consuma il rework dei gate: la struttura è difetto di forma, i
  gate hanno già approvato il contenuto); seconda validazione fallita → `BLOCKED`.

### S9 — Implementazione, Controlli E Quality Review

- Richiama le fasi F6, F7 e F8 del workflow GitHub V2 con parametri deep, con questi
  adattamenti:
  - contratto vincolante = tasks approvati (proposal, design e specs come riferimento);
    non esiste `.analysis.md`: la specifica ne fa le veci;
  - output: `governance/implementation.md` e `governance/review.md` (contratti §17.8 e
    §17.9 GitHub V2);
  - lavoro nel branch o worktree isolato previsto dal profilo; protezioni §14 GitHub V2
    invariate (risorse protette, modifiche preesistenti, file non pertinenti);
  - `REANALYSIS_REQUIRED`: la review deve indicare `artifact_da_rielaborare:
    proposal|design_specs|tasks` (§8.3). L'orchestratore rientra nell'authoring indicato e
    nel relativo gate usando il rework residuo di quell'artefatto; se esaurito →
    `BLOCKED`. La successiva implementazione consuma anche 1 correzione.
- Transizioni: come §5.2; limiti §9.

### S10 — Archiviazione

- Esecutore: orchestratore.
- Precondizione: review `APPROVED` o `APPROVED_WITH_NOTES` (mai archiviare sulla sola
  validazione strutturale).
- Azioni: `openspec archive "<change-id>"`. `--skip-specs` è consentito solo per change
  classificate dal triage come puramente documentali o di tooling; vietato per change
  funzionali.
- Transizione: → `CHANGE_ARCHIVED`; errore CLI → 1 retry tecnico → `BLOCKED_ENVIRONMENT`.

### S11 — Validazione Dell'Archivio

- Esecutore: orchestratore.
- Azioni: `openspec validate --all`.
- Transizione: positiva → `ARCHIVE_VALIDATED`; fallimento → 1 retry tecnico con diagnosi →
  `BLOCKED` (registrare lo stato dell'archivio senza tentare annullamenti improvvisati).

### S12 — Uscita

- Figlia: → `SPEC_COMPLETED`. Consegna al parent l'elenco degli elementi da committare:
  codice e test, artefatti della change (inclusa la posizione post-archive), report di
  governance. La figlia non esegue commit, push, commento o chiusura. Il parent riprende
  dal proprio stato `QUALITY_REVIEWED` → F9 (gate di pubblicazione, con le sostituzioni
  previste per il percorso OpenSpec) → F10 → F11, con un unico commit.
- Standalone: gate di pubblicazione F9 del workflow GitHub V2 senza le voci relative alla
  issue → commit unico (codice, change, governance, archivio) → push (F10) → `COMPLETED`.
  Push fallito → `PUBLISH_FAILED` con recovery idempotente.
- Dry-run: S10–S11 consentite solo su branch o worktree isolato; S12 sostituita dalla
  verifica di assenza di effetti remoti → `DRY_RUN_COMPLETED`.

## 7. Gate Di Specifica — Regole Comuni

Esiti ammessi: `READY | REWORK | SPLIT_CHANGE | WAITING_DECISION | BLOCKED`.

| Esito | Significato | Transizione |
|-------|-------------|-------------|
| `READY` | artefatti della fase approvati | stato `*_GATED` |
| `REWORK` | correzioni puntuali necessarie | authoring della fase (1 rework per gate), poi nuovo gate |
| `SPLIT_CHANGE` | la change eccede uno scope gestibile | `WAITING_DECISION` con proposta completa di suddivisione; nessuna creazione autonoma di nuove change; ripresa §5.4 |
| `WAITING_DECISION` | serve una decisione del committente | `WAITING_DECISION` (§5.4 e §10 GitHub V2) |
| `BLOCKED` | impedimento non risolvibile | `BLOCKED` o `WAITING_DECISION` per `tipo_blocco` |

Regole: dopo il rework, un secondo esito `REWORK` dello stesso gate → `BLOCKED` (budget
esaurito); `SPLIT_CHANGE` e `WAITING_DECISION` restano validi in qualunque valutazione. Il
gate valuta contenuto e decisioni; non riscrive gli artefatti e non modifica il codice.

Cosa verifica ciascun gate prima di `READY`:

| Gate | Verifiche minime |
|------|------------------|
| proposal (S3) | problema e obiettivo chiari; scope delimitato e proporzionato (altrimenti `SPLIT_CHANGE`); criteri di accettazione osservabili; decisioni da prendere esplicite; coerenza con fonte e triage |
| design + specs (S5) | decisioni motivate con alternative considerate; coerenza con la proposal; requisiti osservabili e verificabili; impatti su dati, API e interfaccia dichiarati; nessuna anticipazione impropria degli slice successivi |
| tasks (S7) | copertura dei requisiti; incrementi verificabili con test previsti; ordine e dipendenze corretti; scope invariato rispetto a proposal e specs |

## 8. Contratti Dei Report Di Governance

### 8.1 Blocco Esito Comune Dei Gate

```text
fase: proposal-gate | design-specs-gate | tasks-gate
esito: READY | REWORK | SPLIT_CHANGE | WAITING_DECISION | BLOCKED
rework_usato: si | no
tipo_blocco: decisione | tecnico | nessuno
iterazione: <n>
data: <AAAA-MM-GG>
```

### 8.2 Sezioni Obbligatorie Dei Gate

- Verifiche svolte (checklist §7 con riscontri);
- Esito e motivazione (evidenze, non impressioni);
- Richieste di rework (solo `REWORK`: puntuali, verificabili, riferite a sezioni precise);
- Proposta di suddivisione (solo `SPLIT_CHANGE`: elenco delle change proposte con scope,
  dipendenze e ordine);
- Decisione richiesta (solo `SPLIT_CHANGE`, `WAITING_DECISION` o `BLOCKED` con
  `tipo_blocco: decisione`).

Invocazione tipo: sessione Terra `xhigh` read-only; input fonte, triage, artefatti della
change, repository; verificare secondo §7; scrivere soltanto il report del proprio gate in
`governance/`, conforme a §8.

### 8.3 Estensione Della Quality Review

Nelle run OpenSpec il contratto §17.9 del workflow GitHub V2 aggiunge la chiave:

```text
artifact_da_rielaborare: proposal | design_specs | tasks | nessuno
```

Obbligatoria e diversa da `nessuno` quando `esito: REANALYSIS_REQUIRED`. La scelta
dell'artefatto da rielaborare è del reviewer, mai dell'orchestratore.

## 9. Limiti E Circuit Breaker

| Contatore | Valore | All'esaurimento |
|-----------|--------|-----------------|
| Retry tecnico per invocazione | 1 | transizione di errore della fase |
| Rework per artefatto di specifica (proposal; design+specs; tasks) | 1 ciascuno | `BLOCKED` |
| Correzioni dell'implementazione | 3 (deep) | `BLOCKED` |
| Rielaborazione da `REANALYSIS_REQUIRED` | usa il rework residuo dell'artefatto indicato | `BLOCKED` |
| Validazione CLI fallita (S8) | 1 correzione formale | `BLOCKED` |

Arresto anticipato, definizione di progresso e procedura allo scatto: §11 del workflow
GitHub V2, invariati.

## 10. Regole Richiamate Dal Workflow GitHub V2

Si applicano invariati, sostituendo dove serve gli artefatti `<base>.*` con quelli di
governance della change:

- convenzioni, blocco esito e validazione V-OUT (§2);
- sessione fissa dell'orchestratore e confini (§3.1, §4);
- profilo di progetto (§5);
- sospensioni e decisioni (§10);
- timeout e watchdog (§12);
- classificazione dei fallimenti di test (§13);
- protezioni meccaniche: modifiche preesistenti, risorse protette, file non pertinenti,
  segreti (§14);
- gestione degli errori (§15);
- dry-run (§16);
- invarianti (§18).

## 11. Criteri Di Completamento

Run OpenSpec completata solo quando tutte:

- [ ] triage valido (`OPENSPEC`) — della issue (figlia) o di governance (standalone);
- [ ] proposal, design+specs e tasks con gate `READY`;
- [ ] `openspec validate --type change --strict` positiva prima dell'implementazione;
- [ ] implementazione conforme ai tasks, con controlli meccanici superati;
- [ ] quality review `APPROVED` o `APPROVED_WITH_NOTES`, note esplicitamente non bloccanti;
- [ ] `openspec archive` eseguito dopo la review positiva;
- [ ] `openspec validate --all` positiva dopo l'archiviazione;
- [ ] risorse protette e modifiche preesistenti conformi (§14 GitHub V2);
- [ ] figlia: `SPEC_COMPLETED` consegnato al parent con l'elenco degli elementi da
      committare; nessun effetto remoto prodotto dalla figlia;
- [ ] standalone: commit unico e push verificati sul remoto (`COMPLETED`);
- [ ] dry-run: assenza di effetti remoti verificata (`DRY_RUN_COMPLETED`).
