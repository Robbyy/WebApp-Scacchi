# Backend - WebApp Scacchi

Progetto **Spring Boot** (Java 21 LTS, Spring Boot 4.1.0, build Maven).

Questa cartella contiene **esclusivamente** il backend. Non deve contenere
codice o file di build del frontend (nessun `package.json`, nessun
`node_modules/`, nessun progetto Angular).

## Vincolo strutturale

Backend e frontend sono **due progetti fisicamente separati** (vedi
`README.md` e `docs/architettura.md`):

- build indipendenti (qui Maven, nel frontend npm/Angular CLI);
- nessuna dipendenza di build incrociata;
- la comunicazione avviene **solo** via HTTP (contratto REST), mai per import
  diretto di file tra i due progetti.

## Stato

Scaffold Spring Boot presente e operativo. Parte 1 (Prototipi 0-6) e **Parte 2
(P7-P19)** implementate. Persistenza su **H2 file** (`backend/data/scacchi`,
`open-in-view: false`); **schema gestito da Liquibase**, `ddl-auto: none`
(ISSUE-019). Suite: **66 test** verdi.

> **Policy DB:** finché non si migra a Supabase, il file `data/scacchi.mv.db` è
> **versionato su Git** (ri-incluso nel `.gitignore`): è la fonte dei dati del
> repertorio condivisa tra le postazioni. Committarlo dopo modifiche al repertorio o
> allo schema.

Package principali (sotto `com.scacchi.backend`):

- `ping` — health check (`GET /api/ping`);
- `variant` — varianti/albero mosse, validazione legalità con `chesslib`;
- `study` — studi 1-N con varianti, cascata, import bulk e upsert Lichess;
- `training` — sessioni di allenamento (`POST/GET /api/training-sessions`);
- `stats` — aggregazioni statistiche (`GET /api/stats/...`);
- `review` — spaced repetition SM-2 (`GET /api/reviews/due`, `/variants/{id}`).

## Migrazioni di schema (Liquibase)

Lo schema del database è gestito da **Liquibase** (ISSUE-019), non da Hibernate
(`ddl-auto: none`). I changelog stanno in `src/main/resources/db/changelog/`:

- `db.changelog-master.yaml` — master, include i changeset in ordine;
- `changes/0001-baseline.yaml` — baseline (fotografia dello schema iniziale); ha una
  precondizione `MARK_RAN` che, su un DB già popolato (es. il `scacchi.mv.db` di
  esempio committato), la registra come applicata senza rieseguirla.

**Convenzione per una modifica di schema** (nuova colonna/tabella/indice):

1. crea `changes/NNNN-descrizione.yaml` (numero progressivo a 4 cifre, es. `0002-...`);
2. aggiungi un `include` al master, **in coda**;
3. **non modificare mai** un changeset già rilasciato (Liquibase ne traccia il checksum):
   ogni cambiamento è un nuovo changeset;
4. usa tipi astratti Liquibase (`VARCHAR`, `CLOB`, `BIGINT`, `BOOLEAN`, `TIMESTAMP`,
   `DATE`) per restare portabili verso PostgreSQL.

Decisioni e dettagli: [`docs/specs/liquibase.md`](../docs/specs/liquibase.md).

## Avvio

```
mvnw.cmd spring-boot:run
```

In locale impostare `MAVEN_OPTS=-Djavax.net.ssl.trustStoreType=Windows-ROOT`
(intercettazione TLS) e usare **PowerShell** per i comandi di rete/build.
Backend su `http://localhost:8080` (console H2 su `/h2-console`).

## Test

```
mvnw.cmd test
```
