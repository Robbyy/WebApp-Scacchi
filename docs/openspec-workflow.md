# OpenSpec Workflow

Questa guida descrive il modo in cui usiamo OpenSpec in questo progetto per gestire
attività evolutive che richiedono una specifica prima dell'implementazione.

OpenSpec non sostituisce il backlog: il backlog resta il punto di raccolta e
prioritizzazione delle idee. OpenSpec entra quando una segnalazione va trasformata in una
change implementabile, con proposta, decisioni, specifiche e task.

Gli esempi concreti di questa guida usano `issue-016-phase-domain-model` come caso pratico
di riferimento. Lo stesso flusso vale per qualsiasi altra issue o evolutiva che decideremo
di gestire con OpenSpec.

## Cos'è OpenSpec

OpenSpec è uno strumento di **spec-driven development** pensato per lavorare con assistenti
AI di coding. L'idea centrale è semplice: prima di scrivere codice, si crea una change
leggibile e versionata che descrive cosa vogliamo cambiare, perché, quali requisiti devono
essere rispettati, quali decisioni tecniche sono state prese e quali task implementativi
vanno eseguiti.

In pratica OpenSpec aggiunge al repository un livello di documentazione viva:

- le `specs` descrivono come il sistema deve comportarsi;
- le `changes` descrivono modifiche proposte o in corso;
- una change contiene artefatti come `proposal`, `design`, `specs` e `tasks`;
- quando una change è completata, viene archiviata e le specifiche stabili vengono
  aggiornate.

Questo è utile soprattutto con un assistente AI perché evita che il contesto resti solo
nella chat. La discussione diventa un set di file versionati, revisionabili e riutilizzabili
anche in sessioni successive.

Nel nostro progetto OpenSpec va usato come guida e memoria decisionale, non come burocrazia:
serve quando aiuta a chiarire scope, requisiti, dati/API, UI e rischi prima di modificare
il codice.

## Orchestrazione Autonoma

Quando una change OpenSpec e' gestita dall'harness, GPT-5.6 Luna con effort `xhigh` resta
il controller fisso dell'intera esecuzione. Luna coordina lo stato della change, invoca gli
agenti, esegue comandi OpenSpec e controlli deterministici, applica timeout e circuit
breaker, gestisce Git e conserva le evidenze. Non decide da sola alternative di dominio,
API, persistenza o architettura.

Le decisioni tecniche sostanziali sono delegate a GPT-5.6 Terra in sessioni esterne:

- il triage Terra `high` decide se una richiesta deve entrare in OpenSpec e ne indica scope,
  rischio e artifact necessari;
- il gate di specifica Terra `xhigh` valuta proposal, design, specs e tasks dopo ogni
  artefatto, con esito `READY`, `REWORK`, `BLOCKED` o `SPLIT_CHANGE`;
- la verifica semantica e la review Terra `xhigh` valutano l'implementazione finale;
- analisi, controanalisi e implementazione mantengono le regole e i modelli definiti nel
  [workflow GitHub](github-issue-ai-workflow.md).

Terra e' scelto per questi gate invece di Sonnet 5 per mantenere indipendente la verifica
dall'implementatore. Sonnet 5 resta il modello di implementazione; Sol resta disponibile
solo nelle attivita' esterne gia' previste dal workflow GitHub.

Ogni agente decisionale scrive un artifact esplicito e non modifica codice o artifact di
altri ruoli. Luna controlla la struttura dell'output e applica il suo esito; se l'output e'
incompleto o contraddittorio, esegue il retry consentito o blocca la change, senza sostituire
il gate con una propria valutazione.

Per una change `<change-id>`, i report dei gate vivono in una directory non interpretata da
OpenSpec, ma versionata insieme alla change:

```text
openspec/changes/<change-id>/governance/
  triage.md
  proposal-gate.md
  design-specs-gate.md
  tasks-gate.md
  verification.md
  review.md
```

Questi report non sostituiscono `proposal`, `design`, `specs` o `tasks`: registrano il
perche' un artifact e' stato accettato, rimandato o bloccato. L'agente di ogni gate scrive
solo il proprio report; Luna controlla struttura, stato Git e coerenza con le transizioni
ammesse.

## Riferimenti ufficiali

- [Sito ufficiale OpenSpec](https://openspec.dev/) — panoramica del prodotto, principi e
  installazione rapida.
- [Repository GitHub Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec) — codice,
  README, release, issue e documentazione sorgente.
- [Documentazione OpenSpec](https://github.com/Fission-AI/OpenSpec/blob/main/docs/README.md)
  — mappa dei documenti ufficiali.
- [Getting Started](https://github.com/Fission-AI/OpenSpec/blob/main/docs/getting-started.md)
  — installazione, inizializzazione e primo flusso end-to-end.
- [Core Concepts at a Glance](https://github.com/Fission-AI/OpenSpec/blob/main/docs/overview.md)
  — concetti principali: specs, changes, deltas, archive.
- [CLI reference](https://github.com/Fission-AI/OpenSpec/blob/main/docs/cli.md) — riferimento
  dei comandi `openspec` da terminale.

## Quando usare OpenSpec

Usare OpenSpec per:

- sviluppi importanti o ad alto impatto architetturale;
- evolutive con modello dati/API/UI da chiarire prima di implementare;
- lavori che conviene spezzare in slice revisionabili;
- decisioni che devono lasciare traccia prima del codice.

Non usarlo, di norma, per:

- bug già identificati e caricati come issue GitHub;
- modifiche dirette piccole e a basso rischio;
- aggiornamenti puramente documentali senza impatto funzionale.

## Inizializzare OpenSpec su un nuovo progetto

Questi passaggi servono solo quando il repository non contiene ancora una cartella
`openspec/`.

Installare OpenSpec globalmente:

```cmd
npm install -g @fission-ai/openspec@latest
```

Entrare nella cartella del progetto:

```cmd
cd <percorso-progetto>
```

Inizializzare OpenSpec:

```cmd
openspec init
```

Esempio con il percorso di questo repository:

```cmd
cd "C:\Sviluppo\Workspace - Intellij\WebApp Scacchi"
openspec init
```

Verificare che l'inizializzazione sia sana:

```cmd
openspec doctor
```

Controllare il contesto risolto da OpenSpec:

```cmd
openspec context
```

Risultato atteso:

- cartella `openspec/` presente nel repository;
- configurazione OpenSpec leggibile;
- `openspec doctor` senza errori bloccanti;
- possibilità di creare change con `openspec new change "<change-id>"`.

Nota: se un repository contiene già `openspec/`, non rilanciare `openspec init` alla cieca. Prima
controllare `openspec doctor`, `openspec context` e lo stato Git.

## Esempio pratico di riferimento

Per rendere i comandi concreti, questa guida usa come esempio la change:

```cmd
issue-016-phase-domain-model
```

In un'altra attività, sostituire questo identificativo con quello della change da gestire,
per esempio:

```cmd
issue-017-settings-hub
```

Nel nostro esempio, `issue-016-phase-domain-model` serve a decidere il modello di dominio
per le fasi del gioco:

- Aperture;
- Mediogioco;
- Finale;
- organizzazione studio -> capitoli/posizioni;
- import Lichess limitato alle Aperture;
- confini rispetto a training, statistiche e ripetizione;
- impatto sulle change successive.

## Sequenza generale

Flusso consigliato:

1. Identificare nel backlog lo slice da lavorare.
2. Far classificare a Terra il routing e lo scope della change.
3. Creare una change OpenSpec.
4. Controllare lo stato della change.
5. Generare/leggere le istruzioni per il prossimo artefatto.
6. Scrivere `proposal`, poi farla valutare dal gate di specifica Terra.
7. Scrivere `design` e `specs`, poi farli valutare dal gate di specifica Terra.
8. Scrivere `tasks`, poi farli valutare dal gate di specifica Terra.
9. Validare la change con OpenSpec.
10. Implementare i task secondo il workflow GitHub.
11. Eseguire verifica semantica e review Terra, oltre alle verifiche OpenSpec.
12. Archiviare la change quando completata.

Con lo schema attuale `spec-driven`, l'ordine degli artefatti è:

```text
proposal -> design/specs -> tasks
```

`design` e `specs` restano bloccati finché non esiste la `proposal`; `tasks` resta
bloccato finché non esistono `design` e `specs`.

## 1. Creare una change

Serve ad aprire una cartella sotto `openspec/changes/<change-id>/`.

Nel workflow autonomo questo passo avviene solo dopo il triage Terra. Il triage deve avere
confermato `OPENSPEC`, delimitato lo scope e indicato se la change va spezzata prima di
creare file o task.

Comando generico:

```cmd
openspec new change "<change-id>"
```

Esempio:

```cmd
openspec new change "issue-016-phase-domain-model"
```

Output atteso: una nuova cartella in `openspec/changes/issue-016-phase-domain-model/`
con il file di configurazione della change.

## 2. Controllare lo stato della change

Serve a vedere quali artefatti sono completi e quali sono ancora bloccati.

Comando generico:

```cmd
openspec status --change "<change-id>"
```

Esempio:

```cmd
openspec status --change "issue-016-phase-domain-model"
```

Output atteso, se la change è stata appena creata e non contiene ancora artefatti:

```text
Change: issue-016-phase-domain-model
Schema: spec-driven
Change root: ...\openspec\changes\issue-016-phase-domain-model
Progress: 0/4 artifacts complete

[ ] proposal
[-] design (blocked by: proposal)
[-] specs (blocked by: proposal)
[-] tasks (blocked by: design, specs)
```

## 3. Chiedere le istruzioni per un artefatto

Serve a farsi guidare da OpenSpec nella scrittura dell'artefatto successivo.

Comando generico:

```cmd
openspec instructions <artifact> --change "<change-id>"
```

Versione JSON, utile se vogliamo copiarla o farla leggere a Codex:

```cmd
openspec instructions <artifact> --change "<change-id>" --json
```

Esempio per la proposal:

```cmd
openspec instructions proposal --change "issue-016-phase-domain-model" --json
```

Artefatti principali:

- `proposal`: spiega problema, obiettivo, scope e criteri di accettazione;
- `design`: registra decisioni tecniche e alternative considerate;
- `specs`: formalizza requisiti e scenari osservabili;
- `tasks`: traduce proposta/spec in passi implementativi.

## 4. Scrivere la proposal

Serve a fissare il perimetro della change prima di discutere dettagli tecnici.

Per `issue-016-phase-domain-model`, la proposal dovrebbe chiarire almeno:

- perché estendere l'app oltre le aperture;
- quali sezioni esistono: Aperture, Mediogioco, Finale;
- che Mediogioco e Finale usano studi con capitoli/posizioni;
- che l'import Lichess resta solo per Aperture;
- che Mediogioco/Finale non hanno training loop né SM-2;
- quali decisioni di dominio sono da prendere;
- quali slice successivi dipendono da questa decisione.

File atteso:

```text
openspec/changes/<change-id>/proposal.md
```

File dell'esempio:

```text
openspec/changes/issue-016-phase-domain-model/proposal.md
```

## 5. Scrivere design e specs

Dopo la proposal, `design` e `specs` servono a separare decisioni tecniche e requisiti.

Comandi generici per ottenere le istruzioni:

```cmd
openspec instructions design --change "<change-id>" --json
openspec instructions specs --change "<change-id>" --json
```

Esempio:

```cmd
openspec instructions design --change "issue-016-phase-domain-model" --json
openspec instructions specs --change "issue-016-phase-domain-model" --json
```

Per `issue-016-phase-domain-model`, il `design` dovrebbe decidere:

- se riusare/estendere `Study` e `Variant` con un campo `phase`;
- oppure introdurre entità dedicate per studi/posizioni di Mediogioco/Finale;
- come isolare import Lichess alle Aperture;
- come evitare che training, statistiche e ripetizione si applichino alle posizioni;
- quali conseguenze ci sono su API, UI e persistenza.

Le `specs` dovrebbero descrivere il comportamento atteso, senza anticipare troppo
l'implementazione degli slice successivi.

## 6. Scrivere tasks

I task arrivano dopo `design` e `specs`.

Comando generico:

```cmd
openspec instructions tasks --change "<change-id>" --json
```

Esempio:

```cmd
openspec instructions tasks --change "issue-016-phase-domain-model" --json
```

Per `issue-016-phase-domain-model`, i task dovrebbero essere orientati a produrre una
decisione verificabile, non ancora l'intera implementazione di Mediogioco/Finale.

Esempi di task possibili:

- analizzare modello dati attuale `Study`/`Variant`;
- mappare impatti API e UI;
- decidere strategia `phase` vs entità dedicate;
- aggiornare specs con la decisione;
- preparare gli slice successivi.

## 7. Validare

Serve a controllare che una change o tutto il repository OpenSpec siano coerenti.

La validazione CLI controlla la struttura OpenSpec; non decide se una scelta di dominio o un
piano tecnico siano validi. Il gate Terra corrispondente deve aver approvato gli artifact
prima di considerare la change pronta per l'implementazione.

Comando generico per una change:

```cmd
openspec validate "<change-id>" --type change
```

Esempio:

```cmd
openspec validate "issue-016-phase-domain-model" --type change
```

Validazione più severa:

```cmd
openspec validate "<change-id>" --type change --strict
```

Esempio con validazione strict:

```cmd
openspec validate "issue-016-phase-domain-model" --type change --strict
```

Validare tutto:

```cmd
openspec validate --all
```

## 8. Consultare change e specs

Serve a vedere lo stato leggibile di una change o di una spec.

Comando generico:

```cmd
openspec show "<item-name>"
```

Esempio:

```cmd
openspec show "issue-016-phase-domain-model"
```

Mostrare in JSON:

```cmd
openspec show "issue-016-phase-domain-model" --json
```

Elencare le change:

```cmd
openspec list
```

Elencare le spec:

```cmd
openspec list --specs
```

## 9. Implementare

L'implementazione deve partire solo dopo proposal/design/specs/tasks validati da OpenSpec e
approvati dai rispettivi gate Terra. Si applicano quindi le fasi di implementazione, verifica
semantica, review, circuit breaker e Git del [workflow GitHub](github-issue-ai-workflow.md),
anche quando la change e' nata direttamente dal backlog.

Per `ISSUE-016`, la change `issue-016-phase-domain-model` non dovrebbe implementare tutto
Mediogioco/Finale. Deve invece fissare il modello che abilita le change successive:

- `issue-016-custom-starting-fen`;
- `issue-016-move-comments`;
- `issue-016-middlegame-section`;
- `issue-016-endgame-section`;
- `issue-016-play-position-vs-engine`.

## 10. Archiviare una change completata

Quando una change è implementata, validata, verificata e accettata, si archivia. Prima
dell'archivio devono essere positivi sia la verifica semantica sia la review Terra; non basta
che OpenSpec accetti la struttura degli artifact.

Comando generico:

```cmd
openspec archive "<change-id>"
```

Esempio, quando la change sarà completa:

```cmd
openspec archive "issue-016-phase-domain-model"
```

Per change puramente documentali o di tooling, OpenSpec permette anche:

```cmd
openspec archive "<change-id>" --skip-specs
```

Non usare `--skip-specs` per change funzionali come `issue-016-phase-domain-model`, a meno
che non sia una decisione consapevole.

## Comandi diagnostici

Verifica generale salute OpenSpec:

```cmd
openspec doctor
```

Contesto risolto da OpenSpec:

```cmd
openspec context
```

Template disponibili per lo schema configurato nel repository:

```cmd
openspec templates
```

Schema disponibili:

```cmd
openspec schemas
```

## Regola pratica

Per ogni nuova change OpenSpec:

1. partire dal backlog;
2. scegliere un ID piccolo e specifico;
3. creare la change;
4. scrivere prima la proposal;
5. non implementare finché design, specs e tasks non sono coerenti;
6. validare prima e dopo l'implementazione;
7. archiviare solo quando la change è davvero chiusa.
