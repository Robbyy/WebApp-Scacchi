# Stockfish (motore di scacchi)

`stockfish.js` è il build **asm.js single-thread** di **Stockfish 10**, preso dal
pacchetto npm [`stockfish.js`](https://github.com/niklasf/stockfish.js) v10.0.2
(autore: Niklas Fiekas).

- È vendorizzato qui (servito a `/stockfish/stockfish.js`) e caricato in un Web
  Worker dal frontend (Prototipo 16). Build single-thread: **non** richiede
  `SharedArrayBuffer` né gli header COOP/COEP.
- **Licenza: GPL v3** (vedi `Copying.txt`). Stockfish è software libero GPLv3;
  ridistribuendo l'app occorre rispettarne i termini (codice sorgente disponibile,
  avviso di licenza). Per uso personale/locale non ci sono adempimenti aggiuntivi.

Sorgente upstream Stockfish: https://stockfishchess.org/
