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
locale isolato e non produce push, commenti o chiusure. Il workflow non crea, riscrive o
elimina branch remoti; staging e commit usano sempre una allowlist esplicita.

## Directory E Permessi

| Area | Accesso consentito |
|------|-------------------|
| Root del repository prodotto | lettura e scrittura limitata allo scope approvato della run |
| Harness attivo | lettura di skill, cataloghi e prompt; scrittura solo per issue che riguardano esplicitamente harness o workflow |
| Altre directory o sistema operativo | vietati salvo decisione esplicita del committente |

L'harness attivo viene risolto dal catalogo di skill disponibile nella sessione. Nel workspace
attuale corrisponde a `C:\Sviluppo\Workspace - AI\AI Stuff`; il percorso non va assunto in
un ambiente copiato o diverso.

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
| UI | quando `ui_evidence_required: si`, browser o preview con database temporaneo; registrare viewport, stato, controlli richiesti, overflow, console e rete |

Il triage e il gate dell'analisi possono aggiungere verifiche pertinenti; non possono
dichiarare superati test non eseguiti. Se un'evidenza UI obbligatoria non e' producibile,
una run live passa a `BLOCKED_ENVIRONMENT`.

## GitHub, Ricerca E Autonomia

Il canale GitHub deve essere autenticato e verificato dal preflight per la lettura; per una
run live anche per push, commento e chiusura. Credenziali e token non vengono mai salvati in
questo repository, negli artefatti o nei log.

Sono consentite ricerche su documentazione ufficiale e fonti primarie necessarie al task.
Il controller puo' eseguire le operazioni ordinarie previste dalla V2 senza conferme
intermedie. Deve invece entrare in `WAITING_DECISION` per decisioni di prodotto incompatibili,
azioni distruttive, nuove dipendenze o servizi rilevanti, modifiche fuori dalle directory
autorizzate, uso di segreti o alterazione non prevista di dati persistenti.
