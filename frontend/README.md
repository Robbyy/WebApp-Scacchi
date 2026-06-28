# Frontend - WebApp Scacchi

Progetto **Angular 22.x** (TypeScript 6.x, Node.js 24.15.0, Angular CLI
**locale al progetto** - nessuna CLI globale).

Questa cartella contiene **esclusivamente** il frontend. Non deve contenere
codice o file di build del backend (nessun `pom.xml`, nessun sorgente Java).

## Vincolo strutturale

Backend e frontend sono **due progetti fisicamente separati** (vedi
`README.md` e `docs/architettura.md`):

- build indipendenti (qui npm/Angular CLI, nel backend Maven);
- nessuna dipendenza di build incrociata;
- la comunicazione avviene **solo** via HTTP (contratto REST), mai per import
  diretto di file tra i due progetti.

## Riferimento visivo

Palette e layout seguono il riferimento Lovable documentato in
`docs/archive/preanalisi-progetto.md` (palette pergamena, case `#f0d9b5` / `#b58863`,
cornice legno, pezzi Staunton SVG, layout a pannelli). Libreria regole/PGN:
`chess.js` (NON `react-chessboard`, legata a React).

## Stato

Scaffold Angular presente e operativo (componenti **standalone**, signals,
`OnPush`). Parte 1 (Prototipi 0-6) e **Parte 2 (P7-P19)** implementate. Suite:
**168 test** (Vitest) verdi.

Aree principali (sotto `src/app`):

- `chessboard` — scacchiera custom (click/drag/promozione) + barra valutazione;
- `variants` — lista/dettaglio/editor/training/import PGN;
- `studies` — home a studi, dettaglio, import e OAuth Lichess;
- `stats` — viste statistiche variante/studio;
- `reviews` — vista «Ripeti oggi» (spaced repetition);
- `play` — gioca contro il computer (Stockfish client-side);
- `core` — servizi e modelli (varianti, studi, training, stats, review, motore).

## Avvio

```
npm start
```

Frontend su `http://localhost:4200`, con proxy verso `http://localhost:8080`.

## Test

```
npm test -- --watch=false
```
