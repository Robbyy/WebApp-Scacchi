import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { PlayVsComputer } from './play';
import { StockfishService } from '../core/stockfish.service';
import { MoveMade } from '../chessboard/chessboard';

function move(san: string): MoveMade {
  return { san, from: '', to: '', fen: '' };
}

function setup(engine: Partial<StockfishService>, fen?: string) {
  TestBed.configureTestingModule({
    imports: [PlayVsComputer],
    providers: [
      provideRouter([]),
      { provide: StockfishService, useValue: engine },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: convertToParamMap(fen ? { fen } : {}) } },
      },
    ],
  });
  const fixture = TestBed.createComponent(PlayVsComputer);
  fixture.detectChanges();
  return { fixture, cmp: fixture.componentInstance as any };
}

const baseEngine = (): Partial<StockfishService> => ({
  available: (() => true) as any,
  requestBestMove: () => {},
  dispose: () => {},
});

describe('PlayVsComputer', () => {
  it('starts from the standard position when no FEN is given', () => {
    const { cmp } = setup(baseEngine());
    expect(cmp.status()).toBe('your-turn');
    expect(cmp.orientation()).toBe('white');
  });

  it('marks an invalid FEN', () => {
    const { cmp } = setup(baseEngine(), 'not-a-fen');
    expect(cmp.status()).toBe('invalid');
  });

  it('applies the user move then asks the engine to reply', () => {
    let askedFen: string | null = null;
    const engine: Partial<StockfishService> = {
      available: (() => true) as any,
      dispose: () => {},
      requestBestMove: (fen: string, _ms: number, cb: (m: string | null) => void) => {
        askedFen = fen;
        cb('e7e5'); // l'avversario risponde 1...e5
      },
    };
    const { cmp } = setup(engine);
    cmp.onUserMove(move('e4'));
    expect(askedFen).toContain(' b '); // dopo 1.e4 tocca al Nero (il motore)
    expect(cmp.fen()).toContain('w'); // dopo la risposta 1...e5 torna al Bianco
    expect(cmp.status()).toBe('your-turn');
  });

  it('orients the board for Black when Black is to move in the FEN', () => {
    const { cmp } = setup(
      baseEngine(),
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    );
    expect(cmp.orientation()).toBe('black');
  });

  it('renders title and controls inside the side panel (two-column layout)', () => {
    // Regressione ISSUE-001: nessun testo sopra la board, tutto nel pannello destro.
    const { fixture } = setup(baseEngine());
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.play > .play-head')).toBeNull();
    expect(el.querySelector('.play-side .play-title')?.textContent).toContain(
      'Gioca contro il computer',
    );
    expect(el.querySelector('.play-side .play-btn')).not.toBeNull();
  });

  it('ignores user moves when it is not the user turn', () => {
    let called = false;
    const engine: Partial<StockfishService> = {
      available: (() => true) as any,
      dispose: () => {},
      requestBestMove: () => { called = true; },
    };
    const { cmp } = setup(engine);
    cmp.status.set('engine');
    cmp.onUserMove(move('e4'));
    expect(called).toBe(false);
  });
});
