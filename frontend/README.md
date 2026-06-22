# Frontend - WebApp Scacchi

Progetto **Angular 22.x** (TypeScript 6.x, Node.js 24.15.0, Angular CLI
**locale al progetto** - nessuna CLI globale).

Questa cartella contiene **esclusivamente** il frontend. Non deve contenere
codice o file di build del backend (nessun `pom.xml`, nessun sorgente Java).

## Vincolo strutturale

Backend e frontend sono **due progetti fisicamente separati** (vedi
`planning-prototipi-webapp.md`, sezione 1 - "Struttura del repository"):

- build indipendenti (qui npm/Angular CLI, nel backend Maven);
- nessuna dipendenza di build incrociata;
- la comunicazione avviene **solo** via HTTP (contratto REST), mai per import
  diretto di file tra i due progetti.

## Riferimento visivo

Palette e layout seguono il riferimento Lovable documentato in
`preanalisi-progetto.md` (palette pergamena, case `#f0d9b5` / `#b58863`,
cornice legno, pezzi Staunton SVG, layout a pannelli). Libreria regole/PGN:
`chess.js` (NON `react-chessboard`, legata a React).

## Stato

Cartella predisposta (Prototipo 0). Lo scaffold Angular verrà generato qui con
CLI locale (`npx @angular/cli new ...`).

## Avvio (quando lo scaffold sarà presente)

```
npm start
```

Frontend atteso su `http://localhost:4200`, con proxy verso `http://localhost:8080`.
