# GitHub Issue AI Workflow

> Stato: guida narrativa e didattica locale. Per avviare o riprendere una nuova run usare il
> workflow GitHub V2 dell'harness risolto da [`ai-workflow-integration.md`](ai-workflow-integration.md)
> e il [`profilo di progetto`](ai-workflow-project-profile.md). In caso di conflitto operativo
> prevale la specifica dell'harness; questa guida conserva motivazioni, best practice e
> contesto storico della WebApp.

Questa guida descrive un processo generalizzato per affidare a un orchestratore AI la
gestione completa di una GitHub issue: acquisizione, analisi, implementazione, verifica,
review, pubblicazione e chiusura.

Il documento ha due obiettivi:

- definire una procedura operativa ripetibile e verificabile;
- rendere esplicite le best practice utili a progettare skill, agenti e harness sempre
  piu' autonomi.

Il profilo corrente usa una sessione fissa GPT-5.6 Luna con effort `xhigh` come controller
del workflow. Luna non cambia modello o effort durante l'esecuzione della issue: governa lo
stato, gli strumenti, i timeout e i gate procedurali. Le decisioni che richiedono giudizio
tecnico sono delegate a sessioni esterne, applicando la politica di routing documentata piu'
avanti.

Analisi, controanalisi e implementazione mantengono i rispettivi modelli gia' definiti.
Triage, confronto delle analisi, verifica semantica dell'implementazione e review vengono
invece eseguiti da agenti Terra indipendenti. Questa separazione mantiene economica la
sessione lunga di coordinamento e non chiede al modello che ha implementato il codice di
approvare il proprio lavoro.

## Principi Del Workflow

Il flusso si basa su alcuni principi semplici:

1. La issue e i suoi commenti sono la fonte dei requisiti, ma vanno consolidati in un
   task stabile prima di modificare il codice.
2. Analisi, eventuale controanalisi, implementazione e review sono fasi distinte, con
   artefatti persistenti.
3. Quando eseguita, la controanalisi deve essere indipendente e non deve riscrivere
   direttamente l'analisi primaria.
4. Ogni passaggio ha un criterio di ingresso e uno di uscita: non si procede solo perche'
   il modello precedente ha dichiarato di avere finito.
5. I permessi concessi agli strumenti sono limitati allo scope del progetto e alla fase
   corrente.
6. Test, diff e stato Git sono evidenze; i resoconti prodotti dai modelli non li
   sostituiscono.
7. Una review negativa riapre il ciclo di implementazione, senza allargare implicitamente
   lo scope.
8. La issue viene chiusa solo dopo che il codice verificato e' raggiungibile nel repository
   remoto.
9. I dati persistenti dell'ambiente locale non devono essere usati come ambiente di test.

## Quando Usarlo

Usare questo workflow per:

- bug o task gia' descritti come GitHub issue;
- manutenzioni piccole o medie con uno scope ricostruibile;
- modifiche che possono essere analizzate e verificate direttamente sulla codebase;
- lavori per i quali e' utile lasciare traccia di task, analisi, implementazione e review.

Preferire un processo di specifica, come OpenSpec, quando la issue richiede prima di tutto:

- decisioni di prodotto o di dominio non ancora prese;
- un cambiamento architetturale ampio;
- la progettazione coordinata di modello dati, API e interfaccia;
- una scomposizione in piu' incrementi indipendenti;
- una proposal e specifiche condivise prima del codice.

In questo repository il processo alternativo e' documentato in
[`openspec-workflow.md`](openspec-workflow.md).

Il routing verso OpenSpec e' deciso autonomamente dallo specialista di triage. Non richiede
una conferma preventiva quando i criteri di questa guida sono soddisfatti. La issue GitHub
resta la fonte del lavoro e viene chiusa soltanto dopo il completamento del percorso OpenSpec
e dei normali gate di verifica e pubblicazione.

La presenza di una modifica al database non impone da sola OpenSpec. Una migration piccola
e chiaramente richiesta da una issue puo' essere gestita con questo workflow; una nuova
struttura di dominio ancora da decidere richiede invece una fase di specifica.

## Ruoli

Il workflow distingue i ruoli anche quando sono eseguiti dalla stessa infrastruttura.

| Ruolo | Responsabilita' |
|------|------------------|
| Committente | Seleziona la issue e definisce i confini generali di autonomia. |
| Controller del workflow | Mantiene lo stato, applica regole e timeout, avvia gli agenti, esegue controlli deterministici e governa Git/GitHub. |
| Specialista di triage | Classifica il rischio e sceglie fast path, deep path, OpenSpec o blocco motivato. |
| Analista | Legge task e codebase, raccoglie evidenze e produce il piano tecnico. |
| Controanalista | Esamina in modo indipendente task, codice e analisi primaria per cercare errori, assunzioni fragili e alternative. |
| Gate dell'analisi | Confronta gli artifact di analisi e determina se il piano e' pronto, va corretto, richiede OpenSpec o e' bloccato. |
| Implementatore | Applica il piano, testa la modifica e documenta eventuali deviazioni. |
| Verificatore | Controlla in modo indipendente che il diff, le evidenze e le verifiche dimostrino i criteri di accettazione. |
| Revisore | Valuta il diff e le evidenze in modo indipendente dall'implementatore. |

Nel profilo corrente:

- GPT-5.6 Luna `xhigh` opera come controller fisso della sessione principale;
- GPT-5.6 Terra opera, in sessioni esterne distinte, come specialista di triage, gate
  dell'analisi, verificatore e revisore;
- Claude Code opera come analista e implementatore con i modelli gia' definiti;
- quando richiesta, una seconda sessione Codex con GPT-5.6 Sol opera come controanalista;
- gli artefatti Markdown costituiscono il contratto di passaggio tra i ruoli.

Terra e' preferito a Sonnet 5 per i nuovi gate decisionali. Sonnet resta dedicato
all'implementazione: una review affidata a una famiglia diversa e a una sessione separata
riduce la correlazione con le scelte dell'implementatore. Terra copre i giudizi circoscritti
con un costo inferiore a Sol; Sol resta riservato alla controanalisi gia' prevista per i
casi che la richiedono.

### Confini Del Controller Luna

Luna puo' eseguire autonomamente decisioni meccaniche e controllabili: verificare
precondizioni e schemi degli artifact, applicare la policy di permesso, eseguire comandi di
test autorizzati, controllare diff e stato Git, avviare o arrestare processi verificati,
contare retry e applicare transizioni gia' definite.

Luna non decide da sola il routing del lavoro, la validita' tecnica di un piano, la
risoluzione di divergenze tra analisti, il superamento semantico dell'implementazione o
l'esito della review. Per tali punti avvia l'agente esterno previsto, controlla che il suo
output rispetti il contratto e applica il risultato secondo le regole di questa guida. Se
l'output e' assente, malformato o inconcludente, il controller non lo sostituisce con una
propria interpretazione: esegue il retry consentito oppure blocca il workflow.

Separare i ruoli riduce il rischio che l'implementatore confermi automaticamente le proprie
ipotesi. La separazione e' utile anche se i ruoli usano lo stesso modello: invocazioni
distinte e input espliciti aiutano a ricostruire il ragionamento.

## Profilo Operativo Del Progetto

Le regole generali del workflow devono essere completate da un profilo locale. Per questa
WebApp il profilo e' il seguente.

Directory autorizzate:

```text
C:\Sviluppo\Workspace - Intellij\WebApp Scacchi
C:\Sviluppo\Workspace - AI\AI Stuff
```

La prima contiene il prodotto. La seconda contiene skill, cataloghi, prompt e materiale
dell'harness. Una issue applicativa non autorizza automaticamente modifiche al laboratorio
AI: queste sono ammesse solo quando servono a correggere o migliorare il workflow stesso.

Risorsa persistente da proteggere:

```text
backend/data/scacchi.mv.db
```

Il file e' un database locale con dati persistenti. Non deve essere modificato durante
avvio, test o preview. Questo vincolo non impedisce di cambiare la struttura dati quando la
issue lo richiede: entita', migration, repository, API e test possono essere modificati,
ma devono essere verificati usando un database temporaneo o dedicato ai test.

Accessi esterni normalmente ammessi:

- GitHub, per leggere, commentare e chiudere la issue e per pushare il codice;
- documentazione ufficiale delle tecnologie coinvolte;
- fonti primarie necessarie a verificare un comportamento tecnico;
- registri di pacchetti, solo per consultazione o per dipendenze realmente necessarie.

## Contratto Di Autonomia

Quando il committente assegna una issue, il controller puo' eseguire senza conferme
intermedie tutte le operazioni ordinarie necessarie al workflow.

Operazioni autonome:

- leggere i due repository autorizzati;
- scaricare issue e commenti;
- effettuare ricerche pertinenti;
- creare e aggiornare gli artefatti della issue;
- creare, validare, implementare e archiviare una change OpenSpec quando selezionata dal
  triage;
- invocare analista e implementatore;
- modificare file del progetto pertinenti alla issue;
- eseguire build, test, lint e verifiche locali;
- avviare processi di sviluppo usando configurazioni e dati temporanei;
- revisionare diff, commit o branch;
- ripetere il ciclo implementazione-review;
- creare commit non distruttivi e pusharli sul branch previsto dal repository;
- commentare e chiudere la issue dopo il superamento dei gate finali.

Richieste di permesso provenienti da un agente delegato vengono decise dal controller.
Sono approvabili quando l'azione:

- e' necessaria alla fase in corso;
- resta nelle directory autorizzate;
- e' reversibile oppure coperta da Git;
- non espone segreti;
- non altera dati persistenti locali;
- non modifica stato esterno oltre a quanto previsto dal workflow.

Il controller deve fermarsi e chiedere una decisione quando e' indispensabile:

- scegliere tra comportamenti funzionali incompatibili non risolti dalla issue;
- eseguire un'operazione distruttiva o difficilmente reversibile;
- modificare il sistema operativo o directory esterne al profilo;
- installare software globalmente;
- usare, spostare o pubblicare credenziali e dati sensibili;
- alterare dati persistenti reali;
- introdurre una dipendenza o un servizio con impatto rilevante non giustificato dal task;
- effettuare azioni esterne non implicate dalla issue;
- continuare dopo ripetuti cicli correttivi che non producono progresso verificabile.

L'autonomia non equivale a ignorare i dubbi. Significa risolvere autonomamente quelli
tecnici attraverso codice, documentazione, test e ricerca, e portare al committente solo le
decisioni che cambiano davvero il prodotto o il livello di rischio.

## Skill E Materiale Di Supporto

Le skill riutilizzabili vivono nel laboratorio AI:

```text
C:\Sviluppo\Workspace - AI\AI Stuff
```

Cataloghi principali:

- `skills/catalog.yaml`: indice machine-readable per harness e automazioni;
- `skills/SKILLS.md`: indice leggibile da persone e AI;
- `harness/prompts/github-issue-workflow-prompts.md`: prompt generici per gli agenti.

Le skill usate sono:

| Fase | Skill | Output principale |
|------|-------|-------------------|
| Intake | `github-issue-to-task` | `.source.json`, `.task.md` |
| Analisi | `task-codebase-analysis` | `.analysis.md` |
| Controanalisi | Procedura dedicata | `.counter-analysis.md` |
| Implementazione | `task-implementation` | codice modificato, `.implementation.md` |
| Review | `task-implementation-review` | `.review.md` |

Ogni agente deve leggere il `SKILL.md` della fase. Il catalogo permette di scoprire le
skill, ma non sostituisce le loro istruzioni.

I prompt di invocazione devono restare brevi. Devono indicare quale skill eseguire, quali
input usare e dove scrivere l'output, senza duplicare le regole gia' presenti nella skill.
Questo evita divergenze tra prompt copiati e istruzioni versionate.

## Artefatti E Stato

Gli artefatti della issue stanno in:

```text
docs/work-items/github-issues/
```

Naming:

```text
github-OWNER-REPO-NUMBER.source.json
github-OWNER-REPO-NUMBER.task.md
github-OWNER-REPO-NUMBER.triage.md
github-OWNER-REPO-NUMBER.analysis.md
github-OWNER-REPO-NUMBER.counter-analysis.md
github-OWNER-REPO-NUMBER.analysis-gate.md
github-OWNER-REPO-NUMBER.implementation.md
github-OWNER-REPO-NUMBER.verification.md
github-OWNER-REPO-NUMBER.review.md
github-OWNER-REPO-NUMBER.dry-run.md
```

Regole di versionamento:

- `.source.json`: resta locale e ignorato da Git;
- `.task.md`: committato;
- `.triage.md`: committato;
- `.analysis.md`: committato;
- `.counter-analysis.md`: committato quando prodotto;
- `.analysis-gate.md`: committato;
- `.implementation.md`: committato;
- `.verification.md`: committato;
- `.review.md`: committato.
- `.dry-run.md`: prodotto solo durante una dry run o quando serve documentare il processo,
  non nelle esecuzioni ordinarie.

Il JSON conserva la fonte grezza e permette di rigenerare il task. Il Markdown conserva
l'interpretazione consolidata e revisionabile. Separarli evita di confondere dati acquisiti
con decisioni del workflow.

Stati logici consigliati:

```text
Direct:  ACQUIRED -> TRIAGED -> ANALYZED -> [CHALLENGED] -> ANALYSIS_GATED
                  -> IMPLEMENTED -> VERIFIED -> REVIEWED -> PUBLISHED -> CLOSED
OpenSpec: ACQUIRED -> TRIAGED -> SPECIFYING -> SPEC_VALIDATED -> IMPLEMENTED
                  -> VERIFIED -> REVIEWED -> PUBLISHED -> CLOSED
```

`CHALLENGED` e' obbligatorio nel deep path e condizionale nel fast path.

Una review con modifiche richieste riporta a `IMPLEMENTED`. Un test fallito riporta alla
fase che ha introdotto il difetto. Un blocco reale lascia la issue aperta e produce un
resoconto con evidenze e decisione necessaria.

### Budget Degli Artefatti

Gli artefatti devono contenere decisioni ed evidenze, non ripetere integralmente task,
codice e documenti precedenti. Per il fast path usare come budget indicativo:

| Artefatto | Budget indicativo |
|-----------|-------------------|
| Task | 100 righe |
| Triage | 60 righe |
| Analisi | 120 righe |
| Controanalisi, quando necessaria | 100 righe |
| Gate dell'analisi | 80 righe |
| Report implementazione | 80 righe |
| Verifica semantica | 80 righe |
| Review | 80 righe |

Il budget e' un guardrail, non un criterio di accettazione. Puo' essere superato quando la
complessita' lo richiede, ma non per ricopiare contenuti gia' disponibili. Nel deep path la
lunghezza resta proporzionata ai rischi: non esiste un obbligo di produrre documenti lunghi.

## Profili Di Esecuzione

Uno specialista Terra assegna il profilo prima di invocare modelli costosi. Il controller
Luna applica la decisione e registra l'output in `.triage.md`. Il profilo puo' essere alzato
durante il lavoro soltanto da un gate esterno o da un segnale deterministico di sicurezza,
ma non abbassato per ignorare un rischio gia' emerso.

### Fast Path

Usarlo quando tutte le condizioni seguenti sono vere:

- issue chiara, senza decisioni di prodotto aperte;
- modifica locale e reversibile;
- nessun cambiamento di schema, contratto API o architettura;
- pochi file plausibilmente coinvolti;
- rischio basso e test/verifica facilmente identificabili.

Nel fast path:

- analisi primaria concisa;
- controanalisi solo se attivata da un segnale di rischio;
- implementazione con Sonnet 5 senza Ultracode;
- artefatti entro i budget indicativi;
- test e verifica proporzionati ai criteri di accettazione.

Segnali che attivano la controanalisi o fanno passare al deep path:

- analisi basata su stime non misurate o assunzioni non verificate;
- piu' cause plausibili;
- impatto condiviso tra moduli;
- dati persistenti, sicurezza, concorrenza o migrazioni;
- criteri di accettazione ambigui;
- piano che introduce dipendenze o cambia piu' aree del previsto;
- primo ciclo di implementazione o test che contraddice l'analisi.

### Deep Path

Usarlo per modifiche a rischio medio-alto, multi-modulo, architetturali, difficili da
verificare o con decisioni tecniche controverse. Nel deep path la controanalisi e'
obbligatoria e l'implementazione puo' usare Ultracode.

Una issue che richiede decisioni di prodotto o specifiche ancora da costruire deve passare
a OpenSpec invece di usare il deep path come sostituto della specifica.

### OpenSpec Path

Lo specialista di triage seleziona OpenSpec quando la issue richiede di costruire una
specifica prima del codice, per esempio:

- nuovo concetto di dominio o relazione tra entita';
- decisioni coordinate tra dati, API e interfaccia;
- cambiamento architetturale con piu' alternative valide;
- scomposizione obbligatoria in piu' incrementi dipendenti;
- requisiti osservabili da formalizzare prima dell'implementazione.

Non scegliere OpenSpec soltanto perche' il lavoro e' difficile, coinvolge molti file o
contiene una migration. Se requisiti e design sono gia' determinati, il deep path puo'
essere sufficiente.

Quando selezionato:

1. registrare nel task la motivazione del routing;
2. creare o riprendere una change con ID collegato alla issue;
3. seguire [`openspec-workflow.md`](openspec-workflow.md) per proposal, design, specs e
   tasks;
4. validare gli artefatti prima del codice;
5. implementare e verificare i task nel branch o worktree isolato;
6. eseguire review e cicli correttivi;
7. archiviare la change solo quando completata e validata;
8. tornare ai gate GitHub per commit, push, commento e chiusura della issue.

Il percorso resta autonomo finche' issue, commenti, codebase e ricerca permettono di
risolvere le decisioni. Il controller chiede input soltanto quando lo specialista identifica
comportamenti di prodotto incompatibili e nessuna fonte autorizzata consente di scegliere.

## Procedura End-To-End

### 1. Preflight

Prima di acquisire la issue:

1. identificare repository, branch e remote;
2. eseguire `git status --short`;
3. registrare le modifiche preesistenti e non attribuirle alla issue;
4. verificare che le credenziali GitHub siano disponibili senza stamparle;
5. verificare gli strumenti necessari alla build e ai test;
6. controllare che il database persistente non entri nell'ambiente di verifica.

Un working tree non pulito non blocca automaticamente il lavoro. Il controller deve
pero' sapere quali modifiche erano gia' presenti, evitare di sovrascriverle e costruire il
commit con una selezione esplicita dei file.

### 2. Acquisizione Della Issue

Usare `github-issue-to-task` per scaricare:

- titolo, stato, label e corpo;
- commenti in ordine cronologico;
- aggiornamenti che integrano o sostituiscono il requisito iniziale.

Output:

- `.source.json` ignorato;
- `.task.md` committabile.

Il task deve distinguere:

- comportamento richiesto;
- criteri di accettazione;
- vincoli;
- chiarimenti successivi;
- conflitti risolti dalla discussione;
- domande ancora realmente aperte.

L'ordine temporale e' importante: un commento successivo puo' correggere o sostituire il
corpo originale. Non deve pero' essere interpretato come cambio di requisito se e' solo una
discussione o un'ipotesi.

### 3. Triage E Ricerca

Prima dell'analisi tecnica, il controller avvia una sessione Terra di triage in sola lettura.
Riceve task consolidato, commenti, profilo operativo e repository locale. Scrive solo:

```text
<task-base-name>.triage.md
```

Il triage deve classificare il lavoro:

- bug, manutenzione o evolutiva;
- frontend, backend, dati, infrastruttura o combinazione;
- rischio e ampiezza stimati;
- routing al fast path, al deep path oppure all'OpenSpec path.

L'output deve inoltre indicare evidenze, controlli obbligatori, agenti da invocare e uno dei
seguenti esiti: `FAST`, `DEEP`, `OPENSPEC` o `BLOCKED`. Il controller accetta solo un output
completo e coerente con le regole di routing; non sostituisce un triage incompleto con una
propria valutazione tecnica.

Le ricerche devono rispondere a domande concrete emerse dalla issue o dalla codebase.
Preferire fonti primarie e documentazione ufficiale. Le conclusioni che influenzano
l'implementazione devono essere riportate nell'analisi con il relativo riferimento; la
cronologia del browser o della chat non e' un artefatto sufficiente.

Non introdurre strumenti o dipendenze solo perche' trovati durante la ricerca. Ogni nuova
componente deve risolvere un requisito e rispettare i pattern del repository.

### 4. Analisi Della Codebase

Invocare l'analista in modalita' read-only usando `task-codebase-analysis`. Il modello da
usare e' determinato dalla politica temporale definita nella sezione sulla gestione di
Claude Code.

Input minimi:

- task consolidato;
- repository locale;
- eventuali documenti di progetto direttamente pertinenti.

Output:

```text
<task-base-name>.analysis.md
```

L'analisi deve contenere:

- comprensione del comportamento corrente e atteso;
- mappa dei file e dei flussi rilevanti;
- causa supportata da riferimenti al codice;
- aree di modifica probabili;
- piano di implementazione;
- piano di test e verifica;
- rischi, dipendenze e fuori scope;
- domande aperte residue.

L'analista non deve modificare il codice. Il controller verifica che il working tree non
contenga modifiche inattese prodotte durante questa fase.

Nel fast path l'analisi deve restare concentrata sulla causa, sul diff probabile e sulle
verifiche necessarie. Alternative speculative e ricostruzioni storiche entrano nel
documento solo se cambiano una decisione.

### 5. Controanalisi Indipendente

Nel deep path la controanalisi e' obbligatoria. Nel fast path viene eseguita soltanto quando
il triage o l'analisi mostrano uno dei segnali di rischio definiti nei profili di
esecuzione.

Quando richiesta, avviare una seconda sessione Codex con GPT-5.6 Sol. La sessione deve
ricevere:

- task consolidato;
- analisi primaria;
- repository locale in sola lettura;
- istruzione di scrivere esclusivamente il file di controanalisi.

Output:

```text
<task-base-name>.counter-analysis.md
```

La controanalisi deve cercare in modo mirato:

- affermazioni non supportate dal codice;
- requisiti ignorati o interpretati in modo fragile;
- cause alternative;
- aree della codebase rilevanti ma non considerate;
- rischi di regressione, dati o sicurezza;
- test e stati applicativi mancanti;
- soluzioni piu' semplici o piu' coerenti con i pattern esistenti;
- punti sui quali analisi e task non consentono una decisione affidabile.

Il controanalista non modifica codice, test o analisi primaria. La separazione degli output
preserva la provenienza delle osservazioni e impedisce che il dissenso venga cancellato
prima della valutazione del gate dell'analisi.

Il controller attende la conclusione della sessione, verifica che sia stato creato solo
l'artefatto previsto e considera fallita la fase se la controanalisi non contiene evidenze
verificabili.

La controanalisi deve riportare prima i finding che possono cambiare causa, piano o test.
Non deve riscrivere l'intera analisi primaria quando la maggior parte e' confermata.

### 6. Sintesi Critica E Gate Dell'Analisi

Il controller avvia una sessione Terra separata come gate dell'analisi. Riceve task,
triage, analisi primaria, eventuale controanalisi e repository in sola lettura. Non modifica
gli artifact precedenti e scrive soltanto:

```text
<task-base-name>.analysis-gate.md
```

Il gate non sceglie il risultato per maggioranza e non assume che il modello piu' potente
abbia automaticamente ragione. Ogni divergenza materiale viene risolta attraverso
evidenze, test, documentazione o ricerca pertinente.

Prima di dichiarare il piano pronto verifica che:

- le affermazioni principali siano confermate dal codice;
- gli eventuali finding validi della controanalisi siano stati recepiti;
- gli eventuali finding infondati siano stati scartati con una motivazione verificabile;
- il piano soddisfi i criteri di accettazione;
- lo scope non sia stato ampliato senza motivo;
- test e rischi siano proporzionati alla modifica;
- eventuali ricerche siano pertinenti e supportate da fonti affidabili;
- le domande tecniche risolvibili siano state chiuse;
- le vere decisioni di prodotto siano state identificate.

L'output del gate deve essere uno fra `READY`, `REWORK_ANALYSIS`, `ROUTE_OPENSPEC` e
`BLOCKED`, con finding accettati o scartati, piano consolidato, test richiesti e motivazioni
verificabili. L'implementatore riceve task, analisi primaria, eventuale controanalisi e gate
dell'analisi; non deve ricostruire la discussione tra gli analisti.

Con `REWORK_ANALYSIS`, il controller rilancia soltanto la fase necessaria entro i limiti del
workflow. Con `ROUTE_OPENSPEC` segue il percorso OpenSpec. Con `BLOCKED` non inizia
modifiche speculative.

### 7. Implementazione

Invocare l'implementatore usando `task-implementation`, in una nuova invocazione che usa
task, analisi e gate dell'analisi come contratto. Nel fast path usare Sonnet 5 senza
Ultracode. Nel deep path Ultracode e' ammesso quando la decomposizione multi-agente porta un
vantaggio concreto.

Input:

- task;
- analisi primaria e gate dell'analisi;
- eventuale controanalisi;
- repository;
- eventuale review precedente durante un ciclo correttivo.

Output:

- modifiche al codice e ai test;
- `<task-base-name>.implementation.md`.

L'implementatore deve:

- seguire i pattern esistenti;
- modificare solo i file necessari;
- aggiungere test in proporzione al rischio;
- spiegare ogni deviazione materiale dall'analisi;
- non incorporare modifiche preesistenti nel proprio resoconto;
- non eseguire commit o azioni GitHub, salvo configurazione esplicita del workflow.

Il report di implementazione deve indicare file modificati, comportamento ottenuto, test
eseguiti, verifiche non eseguite, deviazioni e rischi residui.

### 8. Verifica Indipendente

Il controller non assume che i test dichiarati nel report siano stati eseguiti
correttamente. Esegue direttamente i controlli meccanici:

1. `git status --short` e diff completo;
2. file estranei o generati accidentalmente;
3. test automatici pertinenti;
4. build, type-check o lint quando utili;
5. comportamento manuale o browser per UI e interazioni;
6. compatibilita' con i criteri di accettazione;
7. stato del database persistente.

Con diff e risultati disponibili, il controller avvia una sessione Terra di verifica
semantica in sola lettura. Riceve task, triage, gate dell'analisi, report di implementazione,
diff e risultati dei controlli. Scrive soltanto:

```text
<task-base-name>.verification.md
```

Il verificatore stabilisce se criteri di accettazione, copertura delle prove e limiti
dichiarati sono coerenti con il codice effettivo. Restituisce `PASSED`, `FAILED` o `BLOCKED`.
`FAILED` riporta all'implementazione; `BLOCKED` sospende il workflow. Luna non trasforma un
esito negativo o inconcludente in un passaggio positivo.

Con `FAILED`, l'implementatore riceve anche `.verification.md`, corregge soltanto i finding
pertinenti e il controller riesegue controlli meccanici, verifica semantica e review. Un
esito `PASSED` e' necessario ma non sostituisce la review indipendente.

Le verifiche vanno scelte in base al rischio, non per abitudine. Una modifica condivisa tra
piu' moduli richiede una rete piu' ampia di una correzione locale.

Per i bug di layout documentare almeno viewport, stato UI, visibilita' dei controlli,
overflow e principali stati condizionali. Per modifiche backend verificare contratti API,
errori, persistenza e compatibilita'. Per modifiche al modello dati verificare migration in
avanti e, quando previsto dal progetto, rollback o compatibilita' con dati esistenti.

### 9. Review

Il controller invoca un revisore Terra separato con `task-implementation-review`, su una
sorgente esplicita:

- `working tree`, prima del commit;
- `commit <hash>`, dopo un commit locale;
- `diff <base>..<head>`, per un intervallo;
- `branch <name>`, per confrontare un ramo.

Output:

```text
<task-base-name>.review.md
```

La review deve cercare prima di tutto bug, regressioni, violazioni dei requisiti, rischi di
dati e test mancanti. Esiti:

- `APPROVED`: nessun problema materiale;
- `APPROVED_WITH_NOTES`: pronto, con note non bloccanti;
- `CHANGES_REQUESTED`: correzioni necessarie.

Il revisore deve basarsi sul diff e sul codice, non solo su task, analisi, report e
verifica. Gli artefatti spiegano l'intento; il codice determina il comportamento reale.

### 10. Ciclo Correttivo

Con `CHANGES_REQUESTED`:

1. passare la review all'implementatore;
2. correggere solo i finding pertinenti;
3. rieseguire i test influenzati;
4. aggiornare il report di implementazione;
5. produrre una nuova review sul diff aggiornato.

Se un finding rivela che la causa o il requisito erano stati compresi male, tornare anche
all'analisi. Non forzare una correzione locale quando e' il piano a essere sbagliato.

Il controller puo' ripetere il ciclo finche' c'e' progresso verificabile. Deve fermarsi
quando lo stesso blocco persiste, quando le correzioni si contraddicono o quando emerge una
decisione funzionale non delegabile.

#### Circuit Breaker

Il ciclo e' sempre finito. L'implementazione iniziale non conta come correzione; conta ogni
nuovo giro completato dopo una verifica `FAILED` o una review `CHANGES_REQUESTED` e arrivato
a una nuova verifica o review. Una verifica negativa non crea quindi un percorso alternativo
privo di limite.

| Profilo | Correzioni massime |
|---------|--------------------|
| Fast | 2 |
| Deep | 3 |

Una promozione da fast a deep puo' avvenire una sola volta e non azzera il contatore. Il
limite complessivo diventa quello deep, includendo le correzioni gia' eseguite.

Promuovere immediatamente al deep path quando un finding dimostra che rischio, causa o
scope erano stati sottostimati. Non usare la promozione soltanto per ottenere altri cicli.

Interrompere prima del limite quando:

- lo stesso finding bloccante compare in due review consecutive senza nuova evidenza;
- lo stesso test continua a fallire nello stesso modo dopo due correzioni;
- una correzione reintroduce un problema appena risolto;
- il diff cresce senza avvicinarsi ai criteri di accettazione;
- numero o severita' dei finding bloccanti non diminuiscono;
- le correzioni richiedono decisioni di prodotto incompatibili non risolvibili dalle fonti.

Per progresso verificabile si intende almeno uno di questi risultati:

- finding bloccanti eliminati o ridotti di severita';
- test prima falliti ora superati;
- criteri di accettazione prima non dimostrati ora supportati da evidenze;
- piano corretto sulla base di una nuova evidenza della codebase.

Modificare file, aumentare il diff o riscrivere il report non costituisce da solo progresso.

Quando il circuit breaker scatta:

1. interrompere le invocazioni automatiche;
2. lasciare issue, push e chiusura invariati;
3. aggiornare implementation report, verifica e review con tentativi ed evidenze;
4. dichiarare il workflow bloccato e indicare la decisione o condizione necessaria.

I retry tecnici causati da timeout o errori di invocazione seguono il budget separato del
watchdog e non contano come correzioni se non producono un nuovo diff revisionabile.

### 11. Gate Di Pubblicazione

Prima del commit devono essere vere tutte le condizioni seguenti:

- criteri di accettazione soddisfatti;
- test obbligatori superati;
- verifica semantica `PASSED`;
- review `APPROVED` o `APPROVED_WITH_NOTES`;
- note residue esplicitamente non bloccanti;
- diff limitato allo scope;
- nessun segreto o dato locale incluso;
- database persistente non alterato dalla verifica;
- artefatti della issue coerenti con il codice finale.

Controlli minimi:

```cmd
git status --short
git diff --stat
git diff
```

Lo staging deve essere esplicito. Evitare comandi che includono automaticamente tutto il
working tree quando sono presenti modifiche preesistenti.

### 12. Commit E Push

Il commit include normalmente:

- codice e test della correzione;
- `.task.md`;
- `.triage.md`;
- `.analysis.md`;
- `.counter-analysis.md`, quando prodotta;
- `.analysis-gate.md`;
- `.implementation.md`;
- `.verification.md`;
- `.review.md`.

Il report `.dry-run.md` viene incluso soltanto nelle simulazioni che lo prevedono.

Non include normalmente:

- `.source.json`;
- database locali;
- output temporanei;
- file non correlati;
- modifiche preesistenti dell'utente.

Una migration richiesta dalla issue e' codice di progetto e deve essere committata. Il
file di database sul quale e' stata provata non deve esserlo.

Dopo il commit verificare:

```cmd
git log -1 --oneline
git status --short
```

Il push va eseguito sul branch previsto dalla politica del repository. Il workflow non
deve creare, cambiare o riscrivere branch implicitamente. Rebase forzati, reset distruttivi
e force-push non sono operazioni ordinarie del flusso autonomo.

### 13. Chiusura Della Issue

La issue si chiude solo dopo un push riuscito. Il commento conclusivo deve permettere a chi
legge GitHub di capire cosa e' stato consegnato senza consultare la chat.

Contenuti:

- sintesi del comportamento corretto;
- commit o pull request rilevante;
- test e verifiche principali;
- esito della review;
- eventuali note non bloccanti;
- dichiarazione di chiusura come completata.

Template:

```md
Risolta su `<branch>`.

Implementazione:
- <punto principale>;
- <punto principale>.

Commit principale:
- `<hash>` - <messaggio commit>.

Verifiche:
- <test automatici>;
- <verifiche manuali>;
- review finale: `<APPROVED | APPROVED_WITH_NOTES>`.

Note residue non bloccanti:
- <nota oppure "nessuna">.

Chiudo la issue come completata.
```

Se il push fallisce, i test non sono riproducibili o la review non e' positiva, la issue
resta aperta.

## Politica Di Routing Dei Modelli

Il profilo corrente usa il seguente routing:

| Fase | Profilo | Periodo | Modello | Effort / modalita' |
|------|---------|---------|---------|--------------------|
| Controller | Tutti | Sempre | GPT-5.6 Luna | XHigh, fisso per l'intera sessione |
| Triage | Tutti | Sempre | GPT-5.6 Terra | High |
| Analisi | Fast | Fino al 19 luglio 2026 incluso | Fable | High |
| Analisi | Deep | Fino al 19 luglio 2026 incluso | Fable | Massimo |
| Analisi | Fast | Dal 20 luglio 2026 | Opus 4.8 | High |
| Analisi | Deep | Dal 20 luglio 2026 | Opus 4.8 | Massimo |
| Controanalisi | Fast, solo su trigger | Sempre | GPT-5.6 Sol | High |
| Controanalisi | Deep | Sempre | GPT-5.6 Sol | Ultra |
| Gate dell'analisi | Fast | Sempre | GPT-5.6 Terra | High |
| Gate dell'analisi | Deep e OpenSpec | Sempre | GPT-5.6 Terra | XHigh |
| Implementazione | Fast | Sempre | Sonnet 5 | High, senza Ultracode |
| Implementazione | Deep | Sempre | Sonnet 5 | Massimo, Ultracode quando utile |
| Verifica semantica | Fast | Sempre | GPT-5.6 Terra | High |
| Verifica semantica | Deep e OpenSpec | Sempre | GPT-5.6 Terra | XHigh |
| Review | Fast | Sempre | GPT-5.6 Terra | High |
| Review | Deep e OpenSpec | Sempre | GPT-5.6 Terra | XHigh |

La data va valutata all'inizio della fase di analisi, usando la data locale dell'ambiente
di orchestrazione. Un'analisi gia' iniziata non cambia modello a meta' esecuzione se supera
la mezzanotte; un nuovo tentativo avviato il giorno successivo applica invece la politica
valida in quel momento. Luna resta sempre Luna `xhigh`: una delega a Terra o Sol apre una
nuova sessione esterna e non modifica il modello della sessione orchestratrice.

Prima di ogni invocazione il controller verifica che modello ed effort siano disponibili
nell'ambiente che deve eseguirli: Claude Code per analisi e implementazione, Codex per
controanalisi e gate Terra. Se non lo sono, non sceglie automaticamente un modello diverso:
sospende la fase e segnala l'incompatibilita'.

In Claude Code, `ultracode` non e' un valore dell'opzione `--effort`. Quando il deep path lo
richiede, usare il modello Sonnet 5 con effort massimo e attivare la modalita' Ultracode nel
prompt secondo la sintassi supportata dal client installato. Non simulare la modalita'
passando `--effort ultracode`.

## Gestione Sicura Di Claude Code

Il controller avvia Claude Code dalla root del repository interessato e specifica il
modello in modo esplicito.

Forma generale dell'invocazione:

```powershell
$prompt | claude -p `
  --model <modello-previsto> `
  --effort <effort-previsto> `
  --add-dir "<directory-skill>" `
  --output-format stream-json `
  --include-partial-messages `
  --no-session-persistence
```

Passare il prompt via standard input. In questo modo opzioni variadiche come `--tools` o
`--add-dir` non possono assorbire accidentalmente il prompt multilinea.

Quando la skill vive fuori dal repository target, concedere con `--add-dir` soltanto la
directory della skill richiesta. Non autorizzare l'intero laboratorio AI per comodita'.

Usare `stream-json` per osservare avanzamento, tool call, errori e richieste di permesso.
Il controller deve sintetizzare gli eventi di stato e non riversare l'intero stream nel
contesto o negli artefatti: l'osservabilita' serve a governare il processo, non a duplicarne
ogni token.

Le opzioni effettive dipendono dalla fase:

- analisi: accesso in lettura al repository e scrittura del solo artefatto di analisi;
- implementazione: lettura e modifica dei file del repository, piu' comandi di test;
- nessuna fase delegata richiede normalmente accesso autonomo a commit, push o GitHub;
- la persistenza della sessione e gli strumenti abilitati vanno ridotti al minimo utile.

Per i comandi shell preferire allowlist mirate, per esempio stato Git e test pertinenti.
Il controller ripete comunque le verifiche che costituiscono gate di pubblicazione.

Non usare un'opzione di bypass generale dei permessi come scorciatoia. Le richieste vengono
gestite dal controller in base al contratto di autonomia. Un comando legittimo per la
build puo' essere approvato; una scrittura fuori repository o una modifica globale viene
rifiutata.

L'invocazione non interattiva deve produrre un output osservabile e un codice di uscita. Se
il processo termina senza l'artefatto previsto, dichiara test non eseguiti come eseguiti o
modifica file fuori fase, il controller considera la fase fallita anche se il messaggio
finale afferma il contrario.

### Timeout E Watchdog

Separare due limiti:

- timeout di inattivita': scatta quando non arrivano messaggi, tool call, risultati o
  modifiche osservabili;
- timeout massimo: limita la durata complessiva anche quando esiste avanzamento.

Valori iniziali indicativi:

| Profilo | Inattivita' | Durata massima |
|---------|-------------|----------------|
| Fast | 2-3 minuti | 10 minuti |
| Deep | 5 minuti | 30 minuti |

Questi valori sono configurazione dell'harness, non requisiti delle skill. Un evento reale
di avanzamento rinnova il watchdog di inattivita'; messaggi ripetitivi privi di nuovo stato
non devono mantenerlo vivo indefinitamente.

Quando un limite scatta:

1. identificare il processo della sola invocazione e i suoi discendenti;
2. verificare eseguibile, working directory e ora di avvio prima di terminarlo;
3. ispezionare diff e artefatti gia' prodotti;
4. accettare l'output solo se completo e verificabile;
5. altrimenti rilanciare una sola volta con compito o strumenti piu' stretti;
6. non lasciare processi orfani e non eseguire retry ciechi identici.

Il timeout non sostituisce la verifica. Un comando puo' superare il limite dopo avere gia'
scritto un output valido, oppure terminare correttamente lasciando un artefatto incompleto.

## Gestione Della Controanalisi Codex

La controanalisi viene eseguita in una nuova sessione Codex, distinta dalla sessione del
controller. Il modello e' `gpt-5.6-sol`; se l'ambiente non lo rende disponibile,
non viene sostituito automaticamente.

La nuova sessione deve lavorare sullo stesso checkout o su uno stato che includa gli
artefatti non ancora committati. Creare un worktree dal branch remoto senza trasferire task
e analisi produrrebbe una controanalisi priva degli input necessari.

Permessi della sessione:

- leggere task, analisi e codebase;
- effettuare ricerche pertinenti quando necessarie;
- scrivere esclusivamente `<task-base-name>.counter-analysis.md`;
- non modificare codice, test, configurazioni o analisi primaria;
- non eseguire commit, push o azioni sulla issue GitHub.

Il controller invia un prompt breve che identifica gli input e l'output, poi monitora la
sessione fino al completamento. Al termine controlla stato Git, file creati e contenuto
della controanalisi prima di iniziare la sintesi critica.

L'indipendenza richiede che la nuova sessione non riceva le conclusioni private del
controller ne' istruzioni per confermare l'analisi primaria. Deve poter dissentire,
ma ogni finding deve essere collegato a evidenze controllabili.

## Gestione Dei Gate Terra

Triage, gate dell'analisi, verifica semantica e review sono quattro invocazioni Terra
separate. Non riutilizzare una loro sessione per un altro ruolo: l'indipendenza deriva anche
dal non trasportare conclusioni implicite fra gate diversi.

| Gate | Scrittura consentita | Esiti ammessi |
|------|----------------------|---------------|
| Triage | `<task-base-name>.triage.md` | `FAST`, `DEEP`, `OPENSPEC`, `BLOCKED` |
| Gate dell'analisi | `<task-base-name>.analysis-gate.md` | `READY`, `REWORK_ANALYSIS`, `ROUTE_OPENSPEC`, `BLOCKED` |
| Verifica semantica | `<task-base-name>.verification.md` | `PASSED`, `FAILED`, `BLOCKED` |
| Review | `<task-base-name>.review.md` | `APPROVED`, `APPROVED_WITH_NOTES`, `CHANGES_REQUESTED` |

Ogni invocazione ha accesso in lettura al checkout e solo in scrittura al proprio artifact.
Non puo' modificare codice, test, configurazione, altri artifact, Git o GitHub. Il
controller passa input espliciti, controlla codice di uscita, file creati, formato e stato
Git prima di accettare l'esito.

Per efficienza i gate fast usano Terra `high`. I gate deep e OpenSpec usano Terra `xhigh`.
Non usare Sonnet 5 per questi gate: resta l'implementatore e non deve diventare il controllore
semantico del proprio diff. Non usare Sol come sostituto generalizzato di Terra: il suo costo
e' giustificato solo dalla controanalisi indipendente gia' richiesta dal profilo.

## Sicurezza Del Database

Distinguere sempre tre elementi:

| Elemento | Gestione |
|----------|----------|
| Modello e migration versionati | Modificabili e committabili quando richiesti. |
| Database temporaneo di test | Creabile, modificabile e eliminabile nella directory prevista. |
| Database persistente locale | Protetto; non deve essere alterato dalle verifiche. |

Prima di avviare backend o test di integrazione, verificare quale URL e profilo database
verranno usati. Preferire una configurazione scratch esplicita. Al termine, arrestare i
processi avviati e controllare nuovamente lo stato Git del file persistente.

Se il file era gia' modificato prima del lavoro, non tentare di ripristinarlo. Registrare
lo stato iniziale e assicurarsi che non venga incluso nel commit.

## Gestione Degli Errori

Un workflow autonomo deve fallire in modo leggibile.

| Evento | Azione |
|--------|--------|
| Download issue fallito | Conservare gli output validi, diagnosticare autenticazione o rete, non inventare il task. |
| Triage o gate decisionale senza evidenze | Rilanciare una sola volta; poi bloccare senza sostituirlo con il giudizio di Luna. |
| Analisi senza evidenze | Correggere o rilanciare l'analisi. |
| Modifica inattesa durante analisi | Fermare la fase e ispezionare il diff. |
| Skill esterna non leggibile | Rilanciare con `--add-dir` limitato alla directory della skill. |
| Prompt non ricevuto dal CLI | Passarlo via standard input e verificare le opzioni variadiche. |
| Timeout con output presente | Ispezionare diff e artefatti; non scartarli ne' accettarli automaticamente. |
| Timeout senza avanzamento | Terminare solo il processo verificato, controllare eventuali discendenti e fare al massimo un retry ristretto. |
| Processo delegato rimasto attivo | Verificare PID, eseguibile, working directory e ora di avvio prima di arrestarlo. |
| Test fallito per la modifica | Tornare all'implementazione. |
| Test fallito per ambiente | Diagnosticare e documentare; non dichiarare il test superato. |
| Review con finding | Avviare il ciclo correttivo. |
| Push fallito | Lasciare la issue aperta e riprovare solo con una soluzione non distruttiva. |
| Chiusura GitHub fallita | Conservare commit e commento, verificare lo stato remoto e riprovare senza duplicazioni. |

Ogni retry deve essere idempotente quando possibile: prima di riscaricare, ricreare,
commentare o chiudere, verificare lo stato gia' raggiunto.

## Criteri Di Completamento

Il lavoro e' completato soltanto quando:

- il task rappresenta correttamente issue e commenti;
- il triage esterno ha assegnato un percorso valido;
- il gate dell'analisi ha dichiarato il piano `READY`;
- la controanalisi indipendente e' stata completata quando richiesta dal profilo;
- le eventuali divergenze materiali sono state risolte dal gate dell'analisi;
- l'implementazione soddisfa i criteri di accettazione;
- test e verifiche sono stati eseguiti o le limitazioni sono state rese esplicite;
- la verifica semantica e' positiva;
- la review finale e' positiva;
- il diff non contiene modifiche estranee;
- commit e push sono riusciti;
- il commento conclusivo e' presente su GitHub;
- la issue e' chiusa come completata;
- eventuali modifiche locali preesistenti sono rimaste separate.

"Codice scritto" non e' quindi sinonimo di "issue completata".

In una dry run, `PUBLISHED` e `CLOSED` sono sostituiti da una verifica esplicita che push,
commento e chiusura non siano avvenuti. Il commit puo' restare locale sul branch isolato.

## Miglioramento Continuo

Dopo ogni esecuzione, valutare il processo oltre al risultato tecnico:

- quali informazioni mancavano nel task;
- quali parti dell'analisi sono state realmente utili;
- quali permessi erano necessari e quali superflui;
- quali test hanno intercettato problemi;
- se la review era sufficientemente indipendente;
- dove si sono verificati retry o interventi manuali;
- se il profilo fast/deep scelto era proporzionato al task;
- se un modello o una modalita' hanno prodotto latenza senza valore aggiunto;
- quali artefatti hanno duplicato informazioni gia' disponibili;
- quali regole possono diventare skill o controlli automatici.

Aggiornare questa guida quando emerge una regola generale. Aggiornare una skill quando
cambia il comportamento di una fase. Aggiornare un prompt solo quando cambia il modo di
invocare la skill. Gli esempi e le decisioni specifiche di una issue restano nei suoi
artefatti, non nella procedura generale.

## Anti-Pattern Da Evitare

- Implementare direttamente dal testo della issue senza consolidare i commenti.
- Chiedere al controanalista di confermare l'analisi invece di metterla alla prova.
- Lasciare che il controanalista riscriva l'analisi primaria cancellando il dissenso.
- Lasciare che Luna sostituisca con una propria decisione un triage o un gate esterno
  inconcludente.
- Eseguire sempre controanalisi `ultra` indipendentemente dal rischio.
- Usare Ultracode per una modifica locale che non beneficia di decomposizione multi-agente.
- Trattare `ultracode` come valore di `--effort` senza verificare il client installato.
- Attendere un processo non osservabile fino al timeout massimo senza watchdog di inattivita'.
- Rilanciare lo stesso comando dopo un timeout senza controllare processi, diff e artefatti.
- Riversare l'intero stream del modello nel contesto invece di sintetizzare gli eventi.
- Azzerare il contatore delle correzioni promuovendo artificiosamente il profilo.
- Considerare qualunque modifica al codice come progresso del ciclo correttivo.
- Usare il report dell'implementatore come unica prova dei test.
- Affidare review e correzione alla stessa invocazione senza un nuovo controllo.
- Concedere accesso globale al filesystem per evitare richieste di permesso.
- Inserire nel prompt regole gia' presenti nella skill.
- Ampliare il task per sistemare problemi incontrati ma non necessari.
- Committare con staging indiscriminato in un working tree non pulito.
- Usare il database persistente per una preview rapida.
- Chiudere la issue prima che il commit sia disponibile sul remoto.
- Confondere una limitazione dell'ambiente con un test superato.

## Schema Riassuntivo

```text
GitHub issue + commenti
          |
          v
   task consolidato
          |
          v
 triage Terra esterno
       /      \
fast/deep    OpenSpec
    |           |
    v           v
 analisi     proposal/design/specs/tasks
    |           |
    v           v
[controanalisi] validazione specifica
    |           |
    v           |
 gate analisi Terra
    |           |
    +-----+-----+
          |
          v
 implementazione --[decisione necessaria]--> sospensione motivata
          |
          v
 verifica Terra + controlli Luna
          |
          v
 review Terra --[approved]--> commit -> push -> commento -> close
          |
          +--[changes requested, entro budget]--> implementazione -> verifica -> review
          |
          +--[circuit breaker]--> bloccato
```

Il risultato atteso e' un flusso nel quale il committente assegna una issue e riceve il
resoconto finale, mentre il controller gestisce autonomamente strumenti, permessi, agenti,
verifiche e cicli correttivi entro confini dichiarati e controllabili.
