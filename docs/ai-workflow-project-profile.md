# Profilo Di Progetto Per Workflow AI

> Profilo operativo della WebApp Scacchi per
> [`github-issue-ai-workflow-v2.md`](github-issue-ai-workflow-v2.md) e
> [`openspec-workflow-v2.md`](openspec-workflow-v2.md). E' un input obbligatorio delle run,
> non una guida generale riutilizzabile da altri repository.

## Identita' E Git

| Chiave | Valore |
|--------|--------|
| Repository prodotto | root del checkout corrente della WebApp Scacchi |
| Branch atteso per run live | `master` |
| Remote atteso | `origin` (`https://github.com/Robbyy/WebApp-Scacchi.git`) |
| Artefatti issue | `docs/work-items/github-issues/` |
| Artefatti OpenSpec | directory della change e relativa `governance/` |
| File locali di run | `*.source.json`, ignorati da Git |

Una run live opera sul branch atteso dopo il preflight. Una dry-run usa un worktree o branch
locale isolato, registrato come `branch_run` nel preflight, e non esegue push, commenti o
chiusure. `master` non è un vincolo per la dry-run. Il workflow non crea, riscrive o elimina
branch remoti; staging e commit usano sempre una allowlist esplicita.

## Directory E Permessi

| Area | Accesso consentito |
|------|-------------------|
| Root del repository prodotto | lettura e scrittura limitata allo scope approvato della run |
| Harness attivo | lettura di skill, cataloghi e prompt; scrittura solo per issue che riguardano esplicitamente harness o workflow |
| Adapter di delega dichiarati | esecuzione dei soli client elencati nel profilo; configurazioni e credenziali del client non vengono modificate |
| Altre directory o sistema operativo | vietati salvo decisione esplicita del committente |

L'harness attivo viene risolto dal catalogo di skill disponibile nella sessione. Nel workspace
attuale corrisponde a `C:\Sviluppo\Workspace - AI\AI Stuff`; il percorso non va assunto in
un ambiente copiato o diverso.

## Adapter Di Delega

Il workflow distingue la policy del modello dal client che lo invoca. F0 verifica che ogni
adapter registrato sia raggiungibile e autenticato quando necessario; modello ed effort sono
verificati dall'adapter solo subito prima della fase delegata. Un adapter assente o non
utilizzabile blocca la fase interessata senza fallback automatico.

| ID | Ruoli e mapping | Verifica F0 | Vincoli di invocazione |
|----|-----------------|-------------|------------------------|
| `claude-code-local` | Claude: `Sonnet 5` → `sonnet`; `Haiku 4.5` → `haiku`; `Fable` → `fable`; `Opus 4.8` → `opus` | `claude` raggiungibile e `claude auth status` autenticato | Eseguire dal checkout o worktree della run; comando base `claude -p --model <alias> --effort <livello> <prompt>`; applicare i permessi della fase; non usare `--dangerously-skip-permissions`. |
| `codex-session` | GPT-5.6 Luna, Terra e Sol nelle rispettive sessioni esterne | Il runtime della sessione espone la delega al modello previsto | Usare la sessione esterna effimera prevista dalla V2, con permessi minimi della fase. |

Per `claude-code-local`, alias ed effort sono verificati all'invocazione effettiva. Le fasi
read-only configurano strumenti read-only; F6 riceve scrittura limitata al checkout della run
e allo scope autorizzato. Ultracode non ha un flag CLI assunto dal profilo: quando è utile e
il client lo espone concretamente, l'adapter lo abilita e registra `ultracode: si`; altrimenti
usa l'effort previsto con `ultracode: no` se la fase lo consente.

## Risorse Protette E Dati

| Risorsa | Policy |
|---------|--------|
| `backend/data/scacchi.mv.db` | risorsa persistente protetta; hash al preflight, nei controlli meccanici e nel gate di pubblicazione |
| Database per test, preview o migration | temporaneo e separato dalla risorsa protetta |
| Schema e migration versionati | modificabili e committabili se richiesti dal task |

Il database persistente non deve essere alterato da test, preview o avvio applicativo di
verifica. Puo' entrare nello staging solo quando tutte le condizioni della V2 sono vere:
il task richiede esplicitamente la snapshot condivisa di repertorio o schema, il triage ha
`shared_persistent_data_update: si`, l'hash iniziale e' registrato, la modifica non proviene
dall'ambiente di test e la quality review e' positiva.

Una modifica al DB gia' presente prima della run e' una modifica preesistente: non va
ripristinata, attribuita alla issue o inserita nello staging della run.

## Verifiche

| Area | Comandi o evidenze minime |
|------|----------------------------|
| Backend | da `backend/`: `mvnw.cmd test` |
| Frontend | da `frontend/`: `npm test -- --watch=false`; `npm run build` quando pertinente |
| UI | quando `ui_evidence_required: si`, browser o preview con database temporaneo; registrare in `<base>.verification.source.json` viewport e stato richiesti/effettivi, controlli, overflow, console, rete e screenshot o sonda DOM persistente |

Il triage e il gate dell'analisi possono aggiungere verifiche pertinenti; non possono
dichiarare superati test non eseguiti. Un'evidenza UI e' `passed` solo se la viewport e lo
stato osservati coincidono con quelli richiesti dal criterio; una verifica approssimata o una
cattura non riuscita resta `not_run` o `failed`. Se un'evidenza UI obbligatoria non e'
producibile, una run live passa a `BLOCKED_ENVIRONMENT`; una dry-run non puo' simulare F9
`COMMIT_READY` su quel criterio.

## GitHub, Ricerca E Autonomia

Il canale GitHub deve essere autenticato e verificato dal preflight per la lettura; per una
run live anche per push, commento e chiusura. Credenziali e token non vengono mai salvati in
questo repository, negli artefatti o nei log.

Sono consentite ricerche su documentazione ufficiale e fonti primarie necessarie al task.
Il controller puo' eseguire le operazioni ordinarie previste dalla V2 senza conferme
intermedie. Deve invece entrare in `WAITING_DECISION` per decisioni di prodotto incompatibili,
azioni distruttive, nuove dipendenze o servizi rilevanti, modifiche fuori dalle directory
autorizzate, uso di segreti o alterazione non prevista di dati persistenti.
