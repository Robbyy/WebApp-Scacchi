import { Injectable, signal } from '@angular/core';
import { UciScore, parseBestMove, parseInfoLine, pvToSan } from './uci';

/**
 * Motore Stockfish **client-side** (Prototipo 16). Carica il build asm.js
 * single-thread vendorizzato in `public/stockfish/stockfish.js` in un Web Worker
 * (nessun header COOP/COEP, nessuna dipendenza backend) e ne pilota il protocollo
 * UCI. Usato solo come aiuto allo studio in dettaglio/editor e nella pagina
 * "gioca contro il computer" — **mai** in allenamento (vincolo P16/P17).
 */
@Injectable({ providedIn: 'root' })
export class StockfishService {
  /** false se il worker non è caricabile (file mancante, ambiente senza Worker). */
  readonly available = signal<boolean>(true);
  /** Valutazione corrente dal punto di vista del Bianco, o null. */
  readonly evaluation = signal<UciScore | null>(null);
  /**
   * Linea migliore corrente in SAN (ISSUE-022), a partire dalla posizione in
   * analisi. Vuota finché il motore non ha emesso una `pv`: chi la mostra non
   * deve mai presentare una linea appartenente alla posizione precedente.
   */
  readonly bestLine = signal<string[]>([]);
  readonly thinking = signal<boolean>(false);

  private worker: Worker | null = null;
  private currentFen = '';
  private sideToMove: 'w' | 'b' = 'w';
  private bestMoveCb: ((move: string | null) => void) | null = null;
  /**
   * Il worker può emettere righe `info` anche dopo un `stop`: finché questo flag
   * è false vengono ignorate, così una ricerca conclusa non ripopola i segnali a
   * motore spento. Solo l'avvio di una nuova ricerca lo riapre.
   */
  private acceptingInfo = false;

  /** Avvia l'analisi della posizione; aggiorna `evaluation` man mano. */
  analyse(fen: string, depth = 14): void {
    const worker = this.ensureWorker();
    if (!worker) {
      return;
    }
    this.acceptingInfo = true;
    this.currentFen = fen;
    this.sideToMove = sideToMove(fen);
    this.bestMoveCb = null;
    this.evaluation.set(null);
    this.bestLine.set([]);
    this.thinking.set(true);
    worker.postMessage('stop');
    worker.postMessage(`position fen ${fen}`);
    worker.postMessage(`go depth ${depth}`);
  }

  /**
   * Ferma l'analisi/ricerca in corso e svuota lo stato: a motore spento non deve
   * restare nulla dell'analisi precedente, né poter riaffiorare alla
   * riaccensione tramite una riga `info` tardiva del worker.
   */
  stop(): void {
    this.acceptingInfo = false;
    this.worker?.postMessage('stop');
    this.evaluation.set(null);
    this.bestLine.set([]);
    this.thinking.set(false);
  }

  /**
   * Chiede la mossa migliore (formato UCI, es. "e2e4") per "gioca contro il
   * computer", pensando per {@code movetimeMs} millisecondi.
   */
  requestBestMove(fen: string, movetimeMs: number, cb: (move: string | null) => void): void {
    const worker = this.ensureWorker();
    if (!worker) {
      cb(null);
      return;
    }
    this.acceptingInfo = true;
    this.currentFen = fen;
    this.sideToMove = sideToMove(fen);
    this.bestMoveCb = cb;
    this.bestLine.set([]);
    this.thinking.set(true);
    worker.postMessage('stop');
    worker.postMessage(`position fen ${fen}`);
    worker.postMessage(`go movetime ${movetimeMs}`);
  }

  /** Rilascia il worker (chiamato quando il motore viene spento). */
  dispose(): void {
    this.acceptingInfo = false;
    this.worker?.terminate();
    this.worker = null;
    this.evaluation.set(null);
    this.bestLine.set([]);
    this.thinking.set(false);
    this.bestMoveCb = null;
  }

  private ensureWorker(): Worker | null {
    if (this.worker) {
      return this.worker;
    }
    if (typeof Worker === 'undefined') {
      this.available.set(false);
      return null;
    }
    try {
      const worker = new Worker('/stockfish/stockfish.js');
      worker.onmessage = (event: MessageEvent) => {
        const data: unknown = event.data;
        this.onLine(typeof data === 'string' ? data : String(data ?? ''));
      };
      worker.onerror = () => {
        this.available.set(false);
        this.dispose();
      };
      worker.postMessage('uci');
      worker.postMessage('isready');
      this.worker = worker;
      this.available.set(true);
      return worker;
    } catch {
      this.available.set(false);
      return null;
    }
  }

  private onLine(line: string): void {
    if (!line) {
      return;
    }
    const info = parseInfoLine(line, this.sideToMove);
    if (info) {
      if (!this.acceptingInfo) {
        return; // coda del worker dopo uno `stop`: non ripopola i segnali
      }
      this.evaluation.set(info);
      // Solo le righe che portano una `pv` aggiornano la linea: le altre non
      // devono azzerare quella già calcolata a profondità minore (ISSUE-022).
      if (info.pv.length > 0) {
        this.bestLine.set(pvToSan(this.currentFen, info.pv));
      }
      return;
    }
    if (line.startsWith('bestmove')) {
      this.thinking.set(false);
      const move = parseBestMove(line);
      const cb = this.bestMoveCb;
      this.bestMoveCb = null;
      cb?.(move);
    }
  }
}

function sideToMove(fen: string): 'w' | 'b' {
  return fen.split(' ')[1] === 'b' ? 'b' : 'w';
}
