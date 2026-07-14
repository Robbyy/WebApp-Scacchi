# Integrazione Con AI Harness

Questa WebApp adotta le specifiche normative dei workflow dal repository
`Robbyy/ai-harness-lab`. Il profilo locale
[`ai-workflow-project-profile.md`](ai-workflow-project-profile.md) dichiara il commit
dell'harness valido per una run.

## Avvio Di Una Nuova Sessione

1. leggere questo documento e il profilo di progetto;
2. risolvere una copia locale dell'harness alla revisione dichiarata nel profilo;
3. leggere `harness/WORKFLOWS.md` nella copia risolta dell'harness;
4. selezionare `github-issue-v2` per issue GitHub o `openspec-v2` per change evolutive;
5. applicare il workflow selezionato insieme al profilo locale.

La run usa una sola revisione dell'harness dall'inizio alla fine. F0 verifica repository,
commit e catalogo dichiarati nel profilo e li registra nel preflight. Se il commit dichiarato
non è disponibile, il preflight termina con `BLOCKED_ENVIRONMENT`: non si sostituisce
automaticamente una revisione diversa.

## Confini Delle Fonti

Le guide [`github-issue-ai-workflow.md`](github-issue-ai-workflow.md) e
[`openspec-workflow.md`](openspec-workflow.md) restano documentazione didattica della WebApp.
I loro esempi e le loro decisioni storiche non modificano stati, contratti, gate o limiti
delle specifiche V2 nell'harness.

I task, le analisi, le review e il backlog restano nel repository della WebApp perché sono
artefatti del prodotto, non componenti riutilizzabili dell'harness.
