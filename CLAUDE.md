# Istruzioni progetto per Claude

## Workflow AI Per Issue E Change

Per una richiesta di gestione completa di una GitHub issue, usa come procedura canonica
[`docs/github-issue-ai-workflow-v2.md`](docs/github-issue-ai-workflow-v2.md) insieme al
[`docs/ai-workflow-project-profile.md`](docs/ai-workflow-project-profile.md). Il documento
`docs/github-issue-ai-workflow.md` resta una guida narrativa e didattica: non usarlo per
determinare autonomamente stati, transizioni o gate di una nuova run.

Per una change OpenSpec, o quando il triage della issue restituisce `OPENSPEC`, usa
[`docs/openspec-workflow-v2.md`](docs/openspec-workflow-v2.md) insieme allo stesso profilo.
La guida `docs/openspec-workflow.md` resta un riferimento narrativo per concetti e comandi.

Durante una run V2 non usare i comandi sperimentali `/opsx:*` in `.claude/commands/opsx/`:
possono generare o applicare artefatti senza attraversare i gate sequenziali della V2. Restano
disponibili solo per esplorazioni o lavoro manuale esplicitamente fuori da una run V2.

Queste procedure si applicano alle run end-to-end di issue o change. Per una normale richiesta
di analisi o modifica non incardinata nel workflow, leggi solo la documentazione pertinente al
task e non avviare una run per deduzione.

## Ordine di lettura

Per ogni sessione, leggi nell'ordine:

1. `README.md` — panoramica progetto, stack, struttura repo
2. `docs/stato-corrente.md` — cosa esiste oggi, funzionalità, aree delicate
3. Documento specifico per il task:
   - gestione completa di una GitHub issue → `docs/github-issue-ai-workflow-v2.md` + `docs/ai-workflow-project-profile.md`
   - change OpenSpec o triage `OPENSPEC` → `docs/openspec-workflow-v2.md` + `docs/ai-workflow-project-profile.md`
   - architettura / API / dati → `docs/architettura.md` (+ il codice, che è la fonte autorevole)
   - setup e test → `backend/README.md`, `frontend/README.md`, `docs/checklist-e2e.md`
   - decisioni tecniche → `docs/adr/decisioni-tecniche.md` (solo se il task tocca decisioni architetturali)
   - roadmap / pianificazione futura → `docs/roadmap.md`
   - contesto storico → `docs/archive/` (solo se necessario)

## Contesto operativo

- La webapp è un'app personale per l'allenamento delle aperture di scacchi.
- Backend Spring Boot (Java 21) e frontend Angular 22, **fisicamente separati**: build indipendenti, comunicazione solo via HTTP REST.
- Database H2 su file (`backend/data/scacchi`), schema gestito da Liquibase. **Versionato su Git** finché non si migra a Supabase PostgreSQL: è la fonte dei dati del repertorio condivisa tra le postazioni.
- Autenticazione Supabase Auth prevista nella terza tornata.
- Il progetto dovrà restare ordinato e predisposto per la containerizzazione Docker.

## Nota di collaborazione

- A questo progetto lavorano sia Claude sia Codex.
- Prima di modificare file esistenti, controlla sempre lo stato del repository e non sovrascrivere modifiche altrui.

## Disciplina di aggiornamento documentale

- Se cambi la firma di un controller o aggiungi/rimuovi un endpoint → **aggiorna la Panoramica API di `docs/architettura.md`** nello stesso commit (o rigenera l'OpenAPI quando sarà disponibile).
- Se cambi un'entità o una relazione → aggiorna la Mappa entità in `docs/architettura.md`.
- Aggiorna `docs/stato-corrente.md` solo se lo stato reale del progetto è cambiato (nuove funzionalità, test, aree delicate).
- Non aggiornare mai `docs/archive/` come documento vivo: è storico.

## Regole operative

- Non introdurre nuove librerie senza decisione esplicita.
- Non introdurre cambi infrastrutturali (Supabase, Docker, …) senza specifica dedicata (es. Liquibase, ISSUE-019: fatto con spec dedicata).
- Finché non si migra a Supabase, il file del database H2 (`backend/data/scacchi.mv.db`) resta versionato su Git. Nelle run V2 è una risorsa protetta: test e preview non devono alterarlo. Va incluso nel commit solo quando l'issue richiede esplicitamente l'aggiornamento della snapshot condivisa di repertorio o schema, il triage dichiara `shared_persistent_data_update: si` e la review finale lo approva. Per una normale migration si committa la migration, non il DB di prova. In caso di conflitto sul binario, scegli la versione corretta (non rigenerare il file).
- Nessuna modifica incrociata tra backend e frontend (niente import diretti tra i due progetti).
- Stockfish non è mai disponibile in modalità allenamento (vincolo costruttivo — non indebolirlo).
