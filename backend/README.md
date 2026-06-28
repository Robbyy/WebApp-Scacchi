# Backend - WebApp Scacchi

Progetto **Spring Boot** (Java 21 LTS, Spring Boot 4.1.0, build Maven).

Questa cartella contiene **esclusivamente** il backend. Non deve contenere
codice o file di build del frontend (nessun `package.json`, nessun
`node_modules/`, nessun progetto Angular).

## Vincolo strutturale

Backend e frontend sono **due progetti fisicamente separati** (vedi
`planning-prototipi-webapp.md`, sezione 1 - "Struttura del repository"):

- build indipendenti (qui Maven, nel frontend npm/Angular CLI);
- nessuna dipendenza di build incrociata;
- la comunicazione avviene **solo** via HTTP (contratto REST), mai per import
  diretto di file tra i due progetti.

## Stato

Scaffold Spring Boot presente e operativo. Parte 1 (Prototipi 0-6) e **Parte 2
(P7-P19)** implementate. Persistenza su **H2 file** (`backend/data/scacchi`,
`ddl-auto=update`, `open-in-view: false`). Suite: **66 test** verdi.

Package principali (sotto `com.scacchi.backend`):

- `ping` — health check (`GET /api/ping`);
- `variant` — varianti/albero mosse, validazione legalità con `chesslib`;
- `study` — studi 1-N con varianti, cascata, import bulk e upsert Lichess;
- `training` — sessioni di allenamento (`POST/GET /api/training-sessions`);
- `stats` — aggregazioni statistiche (`GET /api/stats/...`);
- `review` — spaced repetition SM-2 (`GET /api/reviews/due`, `/variants/{id}`).

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
