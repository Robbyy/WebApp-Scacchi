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

Cartella predisposta (Prototipo 0). Lo scaffold Spring Boot verrà generato qui.

## Avvio (quando lo scaffold sarà presente)

```
mvn spring-boot:run
```

Backend atteso su `http://localhost:8080`.
