# OpenSpec Workflow

Questa guida descrive il modo in cui usiamo OpenSpec in questo progetto per gestire
attività evolutive che richiedono una specifica prima dell'implementazione.

OpenSpec non sostituisce il backlog: il backlog resta il punto di raccolta e
prioritizzazione delle idee. OpenSpec entra quando una segnalazione va trasformata in una
change implementabile, con proposta, decisioni, specifiche e task.

Gli esempi concreti di questa guida usano `issue-016-phase-domain-model` solo perché è la
prima change OpenSpec aperta nel progetto. Lo stesso flusso vale per qualsiasi altra issue
o evolutiva che decideremo di gestire con OpenSpec.

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

## Esempio pratico corrente

OpenSpec è già inizializzato nel progetto.

L'esempio pratico usato in questa guida è la change aperta per `ISSUE-016`:

```cmd
issue-016-phase-domain-model
```

Questa change serve a decidere il modello di dominio per le fasi del gioco:

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
2. Creare una change OpenSpec.
3. Controllare lo stato della change.
4. Generare/leggere le istruzioni per il prossimo artefatto.
5. Scrivere `proposal`.
6. Scrivere `design` e `specs`.
7. Scrivere `tasks`.
8. Validare la change.
9. Implementare i task.
10. Validare di nuovo.
11. Archiviare la change quando completata.

Con lo schema attuale `spec-driven`, l'ordine degli artefatti è:

```text
proposal -> design/specs -> tasks
```

`design` e `specs` restano bloccati finché non esiste la `proposal`; `tasks` resta
bloccato finché non esistono `design` e `specs`.

## 1. Creare una change

Serve ad aprire una cartella sotto `openspec/changes/<change-id>/`.

Comando generico:

```cmd
openspec new change "<change-id>"
```

Comando per l'esempio corrente:

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

Comando per l'esempio corrente:

```cmd
openspec status --change "issue-016-phase-domain-model"
```

Output già osservato:

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

Comando per la proposal dell'esempio corrente:

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

File per l'esempio corrente:

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

Comandi per l'esempio corrente:

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

Comando per l'esempio corrente:

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

Comando generico per una change:

```cmd
openspec validate "<change-id>" --type change
```

Comando per l'esempio corrente:

```cmd
openspec validate "issue-016-phase-domain-model" --type change
```

Validazione più severa:

```cmd
openspec validate "<change-id>" --type change --strict
```

Per l'esempio corrente:

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

Comando per l'esempio corrente:

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

L'implementazione deve partire solo dopo proposal/design/specs/tasks validati.

Per `ISSUE-016`, la change `issue-016-phase-domain-model` non dovrebbe implementare tutto
Mediogioco/Finale. Deve invece fissare il modello che abilita le change successive:

- `issue-016-custom-starting-fen`;
- `issue-016-move-comments`;
- `issue-016-middlegame-section`;
- `issue-016-endgame-section`;
- `issue-016-play-position-vs-engine`.

## 10. Archiviare una change completata

Quando una change è implementata, validata e accettata, si archivia.

Comando generico:

```cmd
openspec archive "<change-id>"
```

Comando per l'esempio corrente, quando sarà completo:

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

Template disponibili per lo schema corrente:

```cmd
openspec templates
```

Schema disponibili:

```cmd
openspec schemas
```

## Regola pratica per questo progetto

Per ogni nuova change OpenSpec:

1. partire dal backlog;
2. scegliere un ID piccolo e specifico;
3. creare la change;
4. scrivere prima la proposal;
5. non implementare finché design, specs e tasks non sono coerenti;
6. validare prima e dopo l'implementazione;
7. archiviare solo quando la change è davvero chiusa.
