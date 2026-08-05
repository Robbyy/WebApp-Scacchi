import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StockfishService } from './stockfish.service';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const INFO = 'info depth 12 score cp 35 pv e2e4 e7e5 g1f3';
const INFO_LATE = 'info depth 20 score cp 999 pv d2d4 d7d5';

/**
 * Worker finto: cattura i comandi UCI inviati e permette di iniettare a mano le
 * righe emesse dal motore, comprese quelle che arrivano *dopo* uno `stop`.
 */
class FakeWorker {
  static last: FakeWorker | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  readonly sent: string[] = [];
  terminated = false;

  constructor(readonly url: string) {
    FakeWorker.last = this;
  }

  postMessage(message: string): void {
    this.sent.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  /** Simula una riga emessa dal motore. */
  emit(line: string): void {
    this.onmessage?.({ data: line } as MessageEvent);
  }
}

describe('StockfishService — ciclo spegnimento/riaccensione', () => {
  let originalWorker: unknown;
  let service: StockfishService;

  beforeEach(() => {
    originalWorker = (globalThis as Record<string, unknown>)['Worker'];
    (globalThis as Record<string, unknown>)['Worker'] = FakeWorker;
    FakeWorker.last = null;
    TestBed.configureTestingModule({});
    service = TestBed.inject(StockfishService);
  });

  afterEach(() => {
    (globalThis as Record<string, unknown>)['Worker'] = originalWorker;
    TestBed.resetTestingModule();
  });

  /** Analisi avviata e prima PV ricevuta: stato "pieno" da cui partire. */
  function analysedWithLine(): FakeWorker {
    service.analyse(START);
    const worker = FakeWorker.last!;
    worker.emit(INFO);
    expect(service.evaluation()).not.toBeNull();
    expect(service.bestLine()).toEqual(['e4', 'e5', 'Nf3']);
    return worker;
  }

  it('clears evaluation, best line and thinking on stop()', () => {
    analysedWithLine();
    expect(service.thinking()).toBe(true);

    service.stop();

    expect(service.evaluation()).toBeNull();
    expect(service.bestLine()).toEqual([]);
    expect(service.thinking()).toBe(false);
  });

  it('still tells the worker to stop searching', () => {
    const worker = analysedWithLine();
    worker.sent.length = 0;
    service.stop();
    expect(worker.sent).toContain('stop');
  });

  it('ignores a late info message arriving after stop()', () => {
    const worker = analysedWithLine();
    service.stop();

    worker.emit(INFO_LATE); // coda della ricerca precedente

    expect(service.evaluation()).toBeNull();
    expect(service.bestLine()).toEqual([]);
    expect(service.thinking()).toBe(false);
  });

  it('keeps ignoring late info messages until a new analysis starts', () => {
    const worker = analysedWithLine();
    service.stop();

    worker.emit(INFO_LATE);
    worker.emit('info depth 21 score mate 2 pv a1a8');
    worker.emit(INFO_LATE);

    expect(service.evaluation()).toBeNull();
    expect(service.bestLine()).toEqual([]);
  });

  it('starts the new analysis from an empty, in-progress state', () => {
    const worker = analysedWithLine();
    service.stop();
    worker.emit(INFO_LATE);

    service.analyse(START); // riaccensione

    // Nessun dato della sessione precedente prima che il motore risponda.
    expect(service.evaluation()).toBeNull();
    expect(service.bestLine()).toEqual([]);
    expect(service.thinking()).toBe(true);
  });

  it('shows only data produced by the new analysis after restarting', () => {
    const worker = analysedWithLine();
    service.stop();
    worker.emit(INFO_LATE); // ignorata: motore spento

    service.analyse(START);
    FakeWorker.last!.emit('info depth 8 score cp -20 pv d2d4 d7d5');

    expect(service.evaluation()?.depth).toBe(8);
    expect(service.evaluation()?.scoreCp).toBe(-20);
    expect(service.bestLine()).toEqual(['d4', 'd5']);
  });

  it('ignores late info messages after dispose() too', () => {
    const worker = analysedWithLine();
    service.dispose();
    expect(worker.terminated).toBe(true);

    worker.emit(INFO_LATE);

    expect(service.evaluation()).toBeNull();
    expect(service.bestLine()).toEqual([]);
    expect(service.thinking()).toBe(false);
  });

  it('does not accept info lines before any analysis is requested', () => {
    service.analyse(START);
    const worker = FakeWorker.last!;
    service.stop();
    // Un nuovo consumatore che monta la pagina non deve vedere la coda altrui.
    worker.emit(INFO);
    expect(service.bestLine()).toEqual([]);
  });

  // La pagina "gioca contro il computer" avvia una ricerca valida: il gate si
  // riapre e il callback bestmove continua a funzionare come prima.
  it('reopens the gate for requestBestMove and still delivers the best move', () => {
    service.analyse(START);
    const worker = FakeWorker.last!;
    service.stop();

    let received: string | null | undefined;
    service.requestBestMove(START, 500, (m) => (received = m));
    worker.emit(INFO);
    expect(service.evaluation()?.scoreCp).toBe(35);

    worker.emit('bestmove e2e4 ponder e7e5');
    expect(received).toBe('e2e4');
    expect(service.thinking()).toBe(false);
  });
});
