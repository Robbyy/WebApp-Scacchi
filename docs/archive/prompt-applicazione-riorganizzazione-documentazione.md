# Goal

Applica la riorganizzazione documentale del progetto seguendo il file:

`proposta-riorganizzazione-documentazione.md`

Quel file è la specifica ufficiale da applicare.

L'obiettivo è trasformare la documentazione attuale da documentazione storica/prototipale a documentazione snella e operativa, adatta a:

* manutenzione;
* bugfix;
* nuove feature;
* lavoro con agenti AI;
* futura introduzione di specifiche più formali solo quando serviranno.

# Fonte principale

Prima di fare qualsiasi modifica, leggi integralmente:

`proposta-riorganizzazione-documentazione.md`

Usalo come fonte principale.

Non reinterpretare la proposta in senso più esteso.

Non creare documenti aggiuntivi rispetto a quelli previsti dalla proposta.

Non creare file separati per API, modello dati, setup, test o backlog.

# Principi da rispettare

La riorganizzazione deve rispettare questi principi:

* pochi documenti vivi;
* documentazione corrente breve;
* documenti storici archiviati;
* ADR conservate;
* codice e test come fonte di verità;
* documenti come panoramiche e puntatori;
* nessuna duplicazione inutile;
* estrazione del contenuto ancora vivo prima dell'archiviazione;
* niente OpenSpec in questa fase;
* niente nuove librerie;
* niente modifiche al codice applicativo.

# Modalità di lavoro

Lavora in due fasi.

## Fase 1 — Analisi e piano, senza modifiche

Non modificare file nella Fase 1.

Prima di proporre il piano:

1. controlla lo stato Git;
2. indica il branch corrente;
3. verifica se il working tree è pulito;
4. ispeziona la struttura attuale del repository;
5. individua i file documentali esistenti;
6. verifica se esistono almeno questi file o cartelle:

   * `README.md`
   * `CLAUDE.md`
   * `MEMORY.md`
   * `.claude/`
   * `backend/README.md`
   * `frontend/README.md`
   * `backend/HELP.md`
   * `checklist-e2e.md`
   * `preanalisi-progetto.md`
   * `planning-prototipi-webapp.md`
   * `stato-avanzamento-lavori.md`
   * `decisioni-tecniche.md`
   * `proposta-riorganizzazione-documentazione.md`

Poi restituisci un piano operativo con:

* file da creare;
* file da spostare con `git mv`;
* file da modificare;
* file da archiviare;
* file da eliminare;
* file non trovati;
* riferimenti da aggiornare;
* eventuali rischi o ambiguità.

Non applicare modifiche prima della mia conferma esplicita.

## Fase 2 — Applicazione dopo conferma

Solo dopo conferma esplicita, applica la riorganizzazione.

Se non sei già su un branch dedicato, proponi prima di creare:

```text
docs/riorganizzazione
```

Non cambiare branch senza conferma.

Non fare commit senza conferma esplicita.

# Struttura finale desiderata

La struttura finale deve seguire la proposta ufficiale:

```text
README.md
CLAUDE.md
backend/README.md
frontend/README.md
docs/
├── stato-corrente.md
├── architettura.md
├── roadmap.md
├── checklist-e2e.md
├── adr/
│   └── decisioni-tecniche.md
└── archive/
    ├── preanalisi-progetto.md
    ├── planning-prototipi-webapp.md
    └── stato-avanzamento-2026-06-28.md
```

# Regole sui documenti

## README.md root

Crea `README.md` in root se non esiste.

Deve essere breve.

Deve contenere:

* nome del progetto;
* scopo dell'app;
* stato sintetico in poche righe;
* stack principale;
* struttura repository;
* indice della documentazione;
* ordine consigliato di lettura.

Non deve contenere:

* cronologia completa dei prototipi;
* dettagli completi API;
* dettagli completi modello dati;
* backlog lungo;
* contenuti duplicati dalle ADR;
* contenuti duplicati dai README di backend/frontend.

## docs/stato-corrente.md

Crea `docs/stato-corrente.md`.

Deve essere derivato da `stato-avanzamento-lavori.md`, ma sfoltito.

Deve descrivere cosa esiste davvero oggi.

Deve contenere:

* data ultimo aggiornamento;
* sintesi;
* funzionalità implementate;
* backend attuale;
* frontend attuale;
* test disponibili;
* verifiche live/manuali;
* problemi noti;
* aree delicate;
* cose non ancora implementate;
* prossima fase consigliata.

Non deve essere un diario cronologico.

Non deve ripetere tutta la sequenza P0-P19.

La cronologia dettagliata deve restare nello snapshot archiviato.

## Snapshot storico

Conserva la fotografia completa dello stato avanzamento come snapshot storico.

Se esiste:

```text
stato-avanzamento-lavori.md
```

spostalo con `git mv` in:

```text
docs/archive/stato-avanzamento-2026-06-28.md
```

Poi crea un nuovo:

```text
docs/stato-corrente.md
```

estraendo dallo snapshot solo la parte ancora utile come stato vivo.

Non creare altri snapshot datati.

## docs/architettura.md

Crea `docs/architettura.md`.

Questo file deve essere una panoramica tecnica, non un contratto completo.

Inserisci chiaramente il principio:

```text
Il codice, i controller, i DTO, le entità JPA e i test sono la fonte autorevole.
Questo documento è una panoramica operativa.
```

Deve contenere:

* vista generale;
* backend;
* frontend;
* scelte tecniche importanti;
* vincoli;
* panoramica API sintetica;
* mappa entità sintetica;
* nota su H2;
* nota su `ddl-auto=update`;
* nota sulla necessità futura di migrazioni versionate;
* riferimento alle ADR.

Non creare:

* `api-contracts.md`;
* `modello-dati.md`.

API e modello dati devono stare solo come sezioni sintetiche in `docs/architettura.md`.

Non introdurre OpenAPI o springdoc in questa fase.

Puoi solo citarli come possibile evoluzione futura.

## docs/roadmap.md

Crea `docs/roadmap.md`.

Deve contenere solo futuro e backlog leggero.

Non deve ripetere P0-P19 come cose fatte.

Deve includere almeno:

* migrazioni versionate / Liquibase;
* Supabase PostgreSQL;
* Supabase Auth;
* attivazione `userId`;
* Docker;
* CI/CD;
* runner E2E browser da rivalutare;
* responsive/UX scacchiera;
* export PGN;
* import file `.pgn`;
* spostamento varianti tra studi;
* sync Lichess periodica;
* backup/restore;
* PWA/offline;
* tema scuro;
* gamification leggera.

Usa una struttura leggera, ad esempio:

* prossimo;
* più avanti;
* da validare / forse;
* scartato / rinviato.

Non creare `backlog.md`.

## ADR

Se esiste:

```text
decisioni-tecniche.md
```

spostalo con `git mv` in:

```text
docs/adr/decisioni-tecniche.md
```

Non riscrivere le ADR.

Non spezzare le ADR in file separati.

Non trasformare le ADR in backlog.

## Archivio storico

Sposta con `git mv`:

```text
preanalisi-progetto.md       → docs/archive/preanalisi-progetto.md
planning-prototipi-webapp.md → docs/archive/planning-prototipi-webapp.md
```

Prima di archiviare, estrai dal planning il contenuto ancora vivo:

* endpoint/API principali → panoramica API in `docs/architettura.md`;
* modello dati → mappa entità in `docs/architettura.md`;
* rischi ancora aperti → aree delicate in `docs/stato-corrente.md`;
* TODO, idee e proposte UX future → `docs/roadmap.md`.

I file in `docs/archive/` sono storici.

Non devono guidare lo sviluppo quotidiano.

## Checklist E2E

Se esiste:

```text
checklist-e2e.md
```

spostalo con `git mv` in:

```text
docs/checklist-e2e.md
```

Aggiorna eventuali riferimenti in:

* `README.md`;
* `CLAUDE.md`;
* altri documenti Markdown che lo citano.

## README backend/frontend

Verifica:

```text
backend/README.md
frontend/README.md
```

Non creare:

* `setup-locale.md`;
* `test-e-validazione.md`.

Setup e test devono restare nei README di backend/frontend.

Se i README di backend/frontend sono insufficienti rispetto alla proposta ufficiale, proponi modifiche mirate.

Non duplicare quei contenuti in altri file.

## backend/HELP.md

Se esiste `backend/HELP.md`, leggilo.

La proposta ufficiale prevede di eliminarlo se è boilerplate Spring Initializr.

Procedi così:

1. verifica il contenuto;
2. se è solo boilerplate generato e non contiene note progettuali utili, includi la sua eliminazione nel piano;
3. se contiene informazioni utili, non eliminarlo automaticamente: proponi dove integrare quelle informazioni.

## CLAUDE.md

Aggiorna `CLAUDE.md` secondo la proposta ufficiale.

Deve indicare il nuovo ordine di lettura:

1. `README.md`
2. `docs/stato-corrente.md`
3. documento specifico del task:

   * architettura/API/dati → `docs/architettura.md` + codice;
   * setup/test → `backend/README.md`, `frontend/README.md`, `docs/checklist-e2e.md`;
   * decisioni tecniche → `docs/adr/decisioni-tecniche.md`;
   * roadmap futura → `docs/roadmap.md`;
   * storico → `docs/archive/`, solo se serve.

Aggiungi anche la disciplina di aggiornamento:

* se cambi la firma di un controller o aggiungi/rimuovi endpoint, aggiorna la panoramica API in `docs/architettura.md` nello stesso commit;
* se cambi un'entità o una relazione, aggiorna la mappa entità in `docs/architettura.md`;
* aggiorna `docs/stato-corrente.md` solo se cambia lo stato reale del progetto;
* controlla sempre lo stato Git prima di modificare;
* non sovrascrivere modifiche altrui;
* non introdurre nuove librerie senza decisione esplicita;
* non introdurre cambi infrastrutturali senza specifica dedicata.

## MEMORY.md e .claude

Se esiste `MEMORY.md`, controlla e aggiorna eventuali riferimenti ai vecchi path.

Se esiste `.claude/`, controlla e aggiorna eventuali riferimenti ai vecchi path.

Se non esistono, segnala che non sono presenti.

Non creare questi file se non esistono.

# Divieti espliciti

Non creare:

* `api-contracts.md`;
* `modello-dati.md`;
* `setup-locale.md`;
* `test-e-validazione.md`;
* `backlog.md`;
* altri documenti vivi non previsti dalla proposta ufficiale.

Non modificare:

* codice backend;
* codice frontend;
* test;
* dipendenze;
* configurazioni applicative;
* file runtime;
* database H2;
* file generati.

Non introdurre:

* OpenSpec;
* springdoc;
* OpenAPI;
* nuove librerie;
* nuovi tool;
* nuove convenzioni non richieste.

Non trasformare:

* ADR in backlog;
* roadmap in cronologia;
* stato corrente in diario;
* architettura in contratto API dettagliato.

# Controlli anti-duplicazione

Prima di concludere, verifica che:

* `docs/roadmap.md` non ripeta la roadmap P0-P19;
* `docs/stato-corrente.md` non sia un diario cronologico;
* `docs/architettura.md` non duplichi controller, DTO ed entità campo per campo;
* nessun file duplichi setup/test già presenti nei README di backend/frontend;
* le ADR siano solo spostate e non riscritte;
* la checklist sia solo spostata;
* i file storici siano in `docs/archive/`;
* `proposta-riorganizzazione-documentazione.md` resti consultabile oppure venga archiviato solo se lo segnali esplicitamente nel piano.

# Output finale richiesto

Alla fine della Fase 2 mostra:

```text
git status
git diff --stat
```

Poi fornisci un riepilogo con:

* file creati;
* file spostati;
* file modificati;
* file eliminati;
* file non trovati;
* riferimenti aggiornati;
* controlli anti-duplicazione eseguiti;
* eventuali punti da verificare manualmente.

# Done when

Il lavoro è completato quando:

* la struttura documentale rispetta `proposta-riorganizzazione-documentazione.md`;
* esiste `README.md` in root;
* esiste `docs/stato-corrente.md`;
* esiste `docs/architettura.md`;
* esiste `docs/roadmap.md`;
* `checklist-e2e.md`, se presente, è sotto `docs/`;
* `decisioni-tecniche.md` è sotto `docs/adr/`;
* `preanalisi-progetto.md` è sotto `docs/archive/`;
* `planning-prototipi-webapp.md` è sotto `docs/archive/`;
* `stato-avanzamento-lavori.md` è conservato come `docs/archive/stato-avanzamento-2026-06-28.md`;
* `CLAUDE.md` punta al nuovo ordine di lettura;
* eventuali riferimenti a vecchi path sono stati aggiornati;
* non sono stati creati documenti extra non previsti;
* non sono stati modificati codice, test, dipendenze o configurazioni applicative.
