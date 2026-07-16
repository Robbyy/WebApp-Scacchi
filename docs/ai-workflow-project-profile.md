# Profilo Di Progetto Per Workflow AI

> Profilo operativo locale della WebApp Scacchi per le specifiche normative dell'harness.
> Il punto di ingresso, la revisione selezionata e le regole di risoluzione sono in
> [`ai-workflow-integration.md`](ai-workflow-integration.md). E' un input obbligatorio delle
> run, non una guida generale riutilizzabile da altri repository.

## Identita' E Git

| Chiave | Valore |
|--------|--------|
| Repository prodotto | root del checkout corrente della WebApp Scacchi |
| Branch atteso per run live | `master` |
| Remote atteso | `origin` (`https://github.com/Robbyy/WebApp-Scacchi.git`) |
| Artefatti issue | `docs/work-items/github-issues/` |
| Artefatti OpenSpec | directory della change e relativa `governance/` |
| File locali di run | `*.source.json`, inclusi diagnostici di output non conforme, ignorati da Git |
| `harness_repository` | `Robbyy/ai-harness-lab` |
| `harness_commit` | `c72feb023cadf0f51e9999be5c028e47ce162819` |
| `harness_catalog_path` | `harness/WORKFLOWS.md` |

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

L'harness attivo viene risolto dalla configurazione della sessione e dal catalogo dichiarato
in `ai-workflow-integration.md`. La run verifica che il commit selezionato sia disponibile;
un percorso locale è un dettaglio dell'ambiente, non parte dell'identità del workflow.

## Adapter Di Delega

Il workflow distingue la policy del modello dal client che lo invoca. F0 verifica che ogni
adapter registrato sia raggiungibile e autenticato quando necessario; modello ed effort sono
verificati dall'adapter solo subito prima della fase delegata. Un adapter assente o non
utilizzabile blocca la fase interessata senza fallback automatico.

| ID | Ruoli e mapping | Verifica F0 | Vincoli di invocazione |
|----|-----------------|-------------|------------------------|
| `claude-code-local` | Claude: `Sonnet 5` → `sonnet`; `Haiku 4.5` → `haiku`; `Fable` → `fable`; `Opus 4.8` → `opus` | `claude` raggiungibile e `claude auth status` autenticato | Eseguire dal checkout o worktree della run secondo il contratto operativo sotto; applicare i permessi della fase; non usare `--dangerously-skip-permissions`. |
| `codex-session` | GPT-5.6 Luna, Terra e Sol nelle rispettive sessioni esterne | Il runtime della sessione espone la delega al modello previsto | Usare la sessione esterna effimera prevista dalla V2, con permessi minimi della fase. |

Per `claude-code-local`, alias ed effort sono verificati all'invocazione effettiva. Le fasi
read-only configurano strumenti read-only; F6 riceve scrittura limitata al checkout della run
e allo scope autorizzato. Ultracode non ha un flag CLI assunto dal profilo: quando è utile e
il client lo espone concretamente, l'adapter lo abilita e registra `ultracode: si`; altrimenti
usa l'effort previsto con `ultracode: no` se la fase lo consente.

### Contratto Operativo Di `claude-code-local`

L'adapter riceve l'envelope di §3.5 della V2. Prima di creare il processo legge il prompt
dall'envelope, rifiuta testo assente o composto solo da spazi e verifica che gli input e la
destinazione di output siano consentiti. Il prompt è un argomento posizionale obbligatorio di
Claude Code: non va omesso, sostituito con un flag né incorporato in una stringa da passare a
una shell.

In PowerShell il lancio usa una lista di argomenti, non una stringa interpolata. Per ogni
fase Claude Code emette eventi osservabili; `permissionMode` e `allowedTools` arrivano
dall'envelope. Nelle fasi read-only `permissionMode` deve essere `plan` e l'allowlist non
deve contenere strumenti di scrittura.

```powershell
$promptText = <prompt non vuoto validato dall'envelope>
$arguments = @(
  '-p', '--model', $alias, '--effort', $effort,
  '--output-format', 'stream-json', '--verbose',
  '--include-partial-messages', '--no-session-persistence',
  '--permission-mode', $permissionMode,
  "--allowedTools=$allowedTools"
)
$resultText = $null
$streamEvents = 0
& claude @arguments $promptText | ForEach-Object {
  $event = $_ | ConvertFrom-Json -ErrorAction Stop
  $streamEvents += 1
  if ($event.type -eq 'result') {
    if ($event.result -isnot [string] -or [string]::IsNullOrWhiteSpace($event.result)) {
      throw 'ADAPTER_RESULT_EXTRACTION_FAILED: result field missing or blank'
    }
    $resultText = $event.result
  }
}
$exitCode = $LASTEXITCODE
if ($exitCode -ne 0 -or [string]::IsNullOrWhiteSpace($resultText)) {
  throw 'ADAPTER_RESULT_EXTRACTION_FAILED: no materialized final result'
}
```

L'adapter esegue dal worktree della run, analizza lo stream senza conservarne il contenuto
grezzo e materializza `result` direttamente dall'evento finale in un buffer effimero. Registra
contatore eventi, ultimo timestamp, codice di uscita, `result_materialized`, lunghezza e hash;
passa poi il testo a V-OUT e persiste il solo artefatto previsto dal contratto. Un evento
`result` privo di testo e' `ADAPTER_RESULT_EXTRACTION_FAILED`: non e' un V-OUT e blocca la
fase fino alla correzione dell'adapter e al superamento della fixture locale. Il watchdog viene
rinnovato solo da eventi con stato nuovo; il limite totale resta separato. Per una fase
read-only, l'agente non scrive nel checkout. Un processo non viene avviato se l'envelope non è
valido; questo caso è `ADAPTER_INPUT_INVALID`, non un retry del modello.

Se V-OUT respinge un risultato materializzato, l'adapter salva il diagnostico locale previsto
da §17.13 della V2 prima di applicare il retry o il circuit breaker. `$harnessRoot`,
`$artifactDirectory`, `$base`, `$phase`, `$attempt` e `$runId` provengono dall'envelope/F0;
`--missing-key` viene ripetuto per ogni chiave assente.

```powershell
$resultText | python "$harnessRoot/harness/phase_failure_artifact.py" `
  --destination "$artifactDirectory/$base.$phase.attempt-$attempt.failure.source.json" `
  --run-id $runId --phase $phase --attempt $attempt --adapter 'claude-code-local' `
  --model $model --effort $effort --reason 'V-OUT failed after final result materialization' `
  --missing-key 'fenced_outcome_block' --result-stdin
```

Il diagnostico contiene solo l'output finale materializzato, soggetto a redazione e limite di
dimensione. Non e' uno stream, non viene committato e non entra negli input degli agenti.

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
