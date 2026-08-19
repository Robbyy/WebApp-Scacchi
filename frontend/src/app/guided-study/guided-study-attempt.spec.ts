import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { Observable, Subject, of, throwError } from 'rxjs';
import { Chess } from 'chess.js';
import { GuidedStudyAttempt } from './guided-study-attempt';
import { StockfishService } from '../core/stockfish.service';
import { Variant } from '../core/variant.model';
import { PositionAttempt, RecordAttemptRequest } from '../core/attempt.model';
import { StudyType } from '../core/position-theme.model';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const OTHER_FEN = '4k3/8/8/3pP3/8/8/8/4K3 w - - 0 1';

function eligiblePosition(overrides: Partial<Variant> = {}): Variant {
  return {
    id: 41,
    name: 'Combinazione decisiva',
    color: 'WHITE',
    moves: ['e4', 'e5'],
    tree: [
      {
        san: 'e4',
        comment: 'Apertura di re',
        nag: '!',
        children: [{ san: 'e5', children: [] }],
      },
    ],
    startingFen: START,
    studyId: 6,
    themeId: 1001,
    eligibleForGuidedStudy: true,
    ...overrides,
  };
}

/** FEN dopo una sequenza di mosse SAN legali dalla posizione di partenza standard. */
function fenAfter(moves: string[]): string {
  const chess = new Chess();
  for (const san of moves) {
    chess.move(san);
  }
  return chess.fen();
}

function attemptResult(overrides: Partial<PositionAttempt> = {}): PositionAttempt {
  return {
    id: 501,
    variantId: 41,
    outcome: 'UNDERSTOOD',
    occurredAt: '2026-08-17T10:00:00Z',
    ...overrides,
  };
}

/**
 * Motore fittizio (pattern di `play.spec.ts`): `available` è un vero segnale
 * Angular, non solo una funzione statica, così l'effect di rilevamento
 * "errore worker" (task 4.6) può reagire a un `.set(false)` durante un test.
 */
function mockEngine(overrides: Partial<StockfishService> = {}): Partial<StockfishService> {
  return {
    available: signal(true) as unknown as StockfishService['available'],
    requestBestMove: () => {},
    stop: () => {},
    dispose: () => {},
    ...overrides,
  };
}

interface SetupOptions {
  studyType?: StudyType;
  recordAttempt?: (request: RecordAttemptRequest) => Observable<PositionAttempt>;
  /** Se assente, TestBed fornisce il vero `StockfishService` (root-provided, inerte senza Worker). */
  engine?: Partial<StockfishService>;
}

/**
 * `studyType` di default a `STRATEGIC`: i test del gruppo 2 (infrastruttura
 * comune) esercitano fixture con mainline tattiche solo per riuso della board,
 * senza volere il confronto/invio dei gruppi 3/4, che qui resterebbero inerti
 * (task 3.6/4.2, regressione B2). I test dei gruppi 3/4 impostano
 * esplicitamente `studyType: 'TACTICAL'`/`'STRATEGIC'` con le proprie opzioni.
 */
function setup(variant: Variant = eligiblePosition(), options: SetupOptions = {}) {
  TestBed.configureTestingModule({
    imports: [GuidedStudyAttempt],
    providers: options.engine ? [{ provide: StockfishService, useValue: options.engine }] : [],
  });
  const fixture = TestBed.createComponent(GuidedStudyAttempt);
  fixture.componentRef.setInput('variant', variant);
  fixture.componentRef.setInput('studyType', options.studyType ?? 'STRATEGIC');
  fixture.componentRef.setInput(
    'recordAttempt',
    options.recordAttempt ?? ((_: RecordAttemptRequest) => of(attemptResult())),
  );
  const cmp = fixture.componentInstance as any;
  return { fixture, cmp, el: fixture.nativeElement as HTMLElement };
}

function clickSquare(el: HTMLElement, square: string): void {
  (el.querySelector(`[data-square="${square}"]`) as HTMLButtonElement).click();
}

function playMove(fixture: ComponentFixture<unknown>, el: HTMLElement, from: string, to: string): void {
  clickSquare(el, from);
  fixture.detectChanges();
  clickSquare(el, to);
  fixture.detectChanges();
}

function playE4(fixture: ComponentFixture<unknown>, el: HTMLElement): void {
  playMove(fixture, el, 'e2', 'e4');
}

describe('GuidedStudyAttempt (R26.3, task 2.1/2.2)', () => {
  it('starts LOADING before the first change detection, then USER_TURN on the starting FEN', () => {
    const { fixture, cmp } = setup();
    expect(cmp.state()).toBe('LOADING');
    fixture.detectChanges();
    expect(cmp.state()).toBe('USER_TURN');
    expect(cmp.attemptFen()).toBe(START);
    expect(cmp.locked()).toBe(false);
  });

  it('starts a fresh attemptEpoch on mount', () => {
    const { fixture, cmp } = setup();
    fixture.detectChanges();
    expect(cmp.machine.epoch()).toBe(1);
  });
});

describe('GuidedStudyAttempt — board lock (task 2.2)', () => {
  it('accepts a legal user move while unlocked, without validating it against the mainline', () => {
    const { fixture, cmp, el } = setup();
    fixture.detectChanges();

    playE4(fixture, el);

    expect(cmp.machine.userMoves()).toEqual(['e4']);
    // studyType di default STRATEGIC (gruppo 4 non ancora implementato): nessun
    // confronto con la mainline qui, lo stato resta USER_TURN.
    expect(cmp.state()).toBe('USER_TURN');
  });

  it('locks the board during AUTO_REPLY and blocks user moves', () => {
    const { fixture, cmp, el } = setup();
    fixture.detectChanges();
    cmp.machine.enterAutoReply();
    fixture.detectChanges();

    playE4(fixture, el);

    expect(cmp.machine.userMoves()).toEqual([]);
    expect(cmp.machine.currentFen()).toBe(START);
  });

  it('locks the board during ENGINE_THINKING', () => {
    const { fixture, cmp, el } = setup();
    fixture.detectChanges();
    cmp.machine.enterEngineThinking();
    fixture.detectChanges();

    playE4(fixture, el);

    expect(cmp.machine.userMoves()).toEqual([]);
  });

  it('locks the board during SAVING_OUTCOME', () => {
    const { fixture, cmp, el } = setup();
    fixture.detectChanges();
    cmp.machine.enterSavingOutcome();
    fixture.detectChanges();

    playE4(fixture, el);

    expect(cmp.machine.userMoves()).toEqual([]);
  });

  it('unlocks the board again in EXPLORATION_USER_TURN', () => {
    const { fixture, cmp, el } = setup();
    fixture.detectChanges();
    cmp.machine.enterExplorationUserTurn();
    fixture.detectChanges();

    playE4(fixture, el);

    expect(cmp.machine.userMoves()).toEqual(['e4']);
  });
});

describe('GuidedStudyAttempt — separazione dall’authoring (task 2.3/2.5)', () => {
  it('renders no mainline, branches, comments, NAG, counter or replay during the attempt', () => {
    const { fixture, el } = setup();
    fixture.detectChanges();

    expect(el.querySelector('.pgn')).toBeNull();
    expect(el.querySelector('.move')).toBeNull();
    expect(el.querySelector('.move-comment')).toBeNull();
    expect(el.querySelector('.move-nag')).toBeNull();
    expect(el.querySelector('.move-counter')).toBeNull();
    expect(el.querySelector('.controls')).toBeNull();
  });

  it('still hides the author content after a local user move', () => {
    const { fixture, el } = setup();
    fixture.detectChanges();
    playE4(fixture, el);
    expect(el.querySelector('.move')).toBeNull();
    expect(el.querySelector('.controls')).toBeNull();
  });

  it('never mutates the author variant (tree/moves) from local exploration', () => {
    const v = eligiblePosition();
    const originalTree = JSON.stringify(v.tree);
    const originalMoves = JSON.stringify(v.moves);
    const { fixture, cmp, el } = setup(v);
    fixture.detectChanges();
    playE4(fixture, el);
    cmp.revealSolution();
    fixture.detectChanges();
    expect(JSON.stringify(v.tree)).toBe(originalTree);
    expect(JSON.stringify(v.moves)).toBe(originalMoves);
  });
});

describe('GuidedStudyAttempt — stato SOLUTION (task 2.4)', () => {
  it('reveals the solution, returning the board to the starting FEN and discarding exploratory moves', () => {
    const { fixture, cmp, el } = setup();
    fixture.detectChanges();
    playE4(fixture, el);
    expect(cmp.machine.userMoves()).toEqual(['e4']);

    cmp.revealSolution();
    fixture.detectChanges();

    expect(cmp.state()).toBe('SOLUTION');
    expect(cmp.boardFen()).toBe(START);
    expect(cmp.locked()).toBe(true);
  });

  it('shows the full author tree read-only once in SOLUTION', () => {
    const { fixture, cmp, el } = setup();
    fixture.detectChanges();
    cmp.revealSolution();
    fixture.detectChanges();

    expect(el.querySelector('.move')?.textContent).toContain('e4');
    expect(el.querySelector('.move-nag')?.textContent).toContain('!');
    expect(el.querySelector('.move-comment')?.textContent).toContain('Apertura di re');
    expect(el.querySelector('.controls')).not.toBeNull();
  });

  it('keeps the solution board locked: no piece can be moved during replay', () => {
    const { fixture, cmp, el } = setup();
    fixture.detectChanges();
    cmp.revealSolution();
    fixture.detectChanges();

    playE4(fixture, el);

    expect(cmp.machine.userMoves()).toEqual([]);
  });

  it('navigates the solution manually, with no autoplay', () => {
    const { fixture, cmp } = setup();
    fixture.detectChanges();
    cmp.revealSolution();
    fixture.detectChanges();

    expect(cmp.atStart()).toBe(true);
    expect(cmp.boardFen()).toBe(START);

    cmp.next();
    fixture.detectChanges();
    expect(cmp.solutionPath()).toEqual([0]);
    expect(cmp.boardFen()).not.toBe(START);

    cmp.last();
    fixture.detectChanges();
    expect(cmp.atLeaf()).toBe(true);

    cmp.first();
    fixture.detectChanges();
    expect(cmp.boardFen()).toBe(START);
  });

  it('reveals the solution from a locked, non-USER_TURN state too', () => {
    const { fixture, cmp } = setup();
    fixture.detectChanges();
    cmp.machine.enterEngineThinking();
    fixture.detectChanges();

    cmp.revealSolution();
    fixture.detectChanges();

    expect(cmp.state()).toBe('SOLUTION');
  });
});

describe('GuidedStudyAttempt — reset/riprova ed errore (task 2.1/2.6)', () => {
  it('retry resets the attempt entirely: board, local moves and solution all clear', () => {
    const { fixture, cmp, el } = setup();
    fixture.detectChanges();
    playE4(fixture, el);
    cmp.revealSolution();
    fixture.detectChanges();
    cmp.next();
    fixture.detectChanges();

    cmp.retry();
    fixture.detectChanges();

    expect(cmp.state()).toBe('USER_TURN');
    expect(cmp.machine.userMoves()).toEqual([]);
    expect(cmp.attemptFen()).toBe(START);
    expect(cmp.solutionPath()).toEqual([]);
    expect(el.querySelector('.move')).toBeNull();
  });

  it('bumps a new epoch on retry, invalidating the previous attempt', () => {
    const { fixture, cmp } = setup();
    fixture.detectChanges();
    const firstEpoch = cmp.machine.epoch();
    cmp.retry();
    fixture.detectChanges();
    expect(cmp.machine.epoch()).toBe(firstEpoch + 1);
  });

  it('shows a controlled error state, locks the board and recovers with retry', () => {
    const { fixture, cmp, el } = setup();
    fixture.detectChanges();
    cmp.machine.fail('Errore di test');
    fixture.detectChanges();

    expect(cmp.locked()).toBe(true);
    expect(el.textContent).toContain('Errore di test');
    expect(el.querySelector('[role="alert"]')).not.toBeNull();

    cmp.retry();
    fixture.detectChanges();

    expect(cmp.state()).toBe('USER_TURN');
    expect(cmp.error()).toBeNull();
  });
});

describe('GuidedStudyAttempt — cambio posizione (task 2.1, riuso futuro in sequenza)', () => {
  it('restarts the attempt with a new epoch when the input variant changes', () => {
    const { fixture, cmp, el } = setup();
    fixture.detectChanges();
    playE4(fixture, el);
    const firstEpoch = cmp.machine.epoch();
    expect(cmp.machine.userMoves()).toEqual(['e4']);

    const other = eligiblePosition({
      id: 42,
      name: 'Altra posizione',
      startingFen: OTHER_FEN,
      moves: ['Ke2'],
      tree: [{ san: 'Ke2', children: [] }],
    });
    fixture.componentRef.setInput('variant', other);
    fixture.detectChanges();

    expect(cmp.machine.epoch()).toBe(firstEpoch + 1);
    expect(cmp.machine.userMoves()).toEqual([]);
    expect(cmp.attemptFen()).toBe(OTHER_FEN);
    expect(cmp.state()).toBe('USER_TURN');
  });
});

describe('GuidedStudyAttempt — nessuna chiamata API (task 2.1/2.5)', () => {
  it('mounts and operates with zero injected HTTP services', () => {
    // Nessun provider oltre ai default: se il componente iniettasse un
    // servizio HTTP o di persistenza, la creazione fallirebbe qui.
    const { fixture, cmp, el } = setup();
    fixture.detectChanges();
    playE4(fixture, el);
    cmp.revealSolution();
    fixture.detectChanges();
    cmp.retry();
    fixture.detectChanges();
    expect(cmp.state()).toBe('USER_TURN');
  });
});

describe('GuidedStudyAttempt — flusso tattico: mainline e risposta automatica (task 3.1/3.2)', () => {
  it('accepts a correct move, applies the mainline reply automatically and returns the turn', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5', 'Nf3', 'Nc6'], tree: undefined });
    const recordAttempt = vi.fn((_: RecordAttemptRequest) => of(attemptResult()));
    const { fixture, cmp, el } = setup(variant, { studyType: 'TACTICAL', recordAttempt });
    fixture.detectChanges();

    playMove(fixture, el, 'e2', 'e4');

    expect(cmp.machine.userMoves()).toEqual(['e4']);
    expect(cmp.state()).toBe('USER_TURN');
    expect(cmp.attemptFen()).toBe(fenAfter(['e4', 'e5']));
    expect(recordAttempt).not.toHaveBeenCalled();
  });

  it('completes an even mainline (ends after the automatic reply) and submits only userMoves', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5', 'Nf3', 'Nc6'], tree: undefined });
    const recordAttempt = vi.fn((_: RecordAttemptRequest) => of(attemptResult({ outcome: 'UNDERSTOOD' })));
    const { fixture, cmp, el } = setup(variant, { studyType: 'TACTICAL', recordAttempt });
    fixture.detectChanges();

    playMove(fixture, el, 'e2', 'e4');
    playMove(fixture, el, 'g1', 'f3');

    expect(recordAttempt).toHaveBeenCalledTimes(1);
    expect(recordAttempt).toHaveBeenCalledWith({ userMoves: ['e4', 'Nf3'] });
    expect(cmp.state()).toBe('SOLUTION');
    expect(cmp.lastOutcome()).toBe('UNDERSTOOD');
    expect(cmp.boardFen()).toBe(variant.startingFen);
  });

  it('completes an odd mainline (ends right after the user move) without an extra reply', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5', 'Nf3'], tree: undefined });
    const recordAttempt = vi.fn((_: RecordAttemptRequest) => of(attemptResult({ outcome: 'UNDERSTOOD' })));
    const { fixture, cmp, el } = setup(variant, { studyType: 'TACTICAL', recordAttempt });
    fixture.detectChanges();

    playMove(fixture, el, 'e2', 'e4');
    playMove(fixture, el, 'g1', 'f3');

    expect(recordAttempt).toHaveBeenCalledTimes(1);
    expect(recordAttempt).toHaveBeenCalledWith({ userMoves: ['e4', 'Nf3'] });
    expect(cmp.state()).toBe('SOLUTION');
  });
});

describe('GuidedStudyAttempt — deviazione tattica (task 3.3)', () => {
  it('blocks the attempt immediately on a legal deviation and sends only userMoves', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'], tree: undefined });
    const recordAttempt = vi.fn((_: RecordAttemptRequest) => of(attemptResult({ outcome: 'FAILED' })));
    const { fixture, cmp, el } = setup(variant, { studyType: 'TACTICAL', recordAttempt });
    fixture.detectChanges();

    // "d4" è legale dalla FEN ma diverge da "e4" atteso al ply 1.
    playMove(fixture, el, 'd2', 'd4');

    expect(recordAttempt).toHaveBeenCalledTimes(1);
    expect(recordAttempt).toHaveBeenCalledWith({ userMoves: ['d4'] });
    expect(cmp.state()).toBe('SOLUTION');
    expect(cmp.lastOutcome()).toBe('FAILED');
  });

  it('treats a move matching an alternative author branch as a deviation, not a tactical solution', () => {
    const variant = eligiblePosition({
      moves: ['e4', 'e5'],
      tree: [
        { san: 'e4', children: [{ san: 'e5', children: [] }] },
        { san: 'd4', children: [] }, // ramo alternativo dell'autore, non la mainline
      ],
    });
    const recordAttempt = vi.fn((_: RecordAttemptRequest) => of(attemptResult({ outcome: 'FAILED' })));
    const { fixture, cmp, el } = setup(variant, { studyType: 'TACTICAL', recordAttempt });
    fixture.detectChanges();

    playMove(fixture, el, 'd2', 'd4');

    expect(recordAttempt).toHaveBeenCalledWith({ userMoves: ['d4'] });
    expect(cmp.state()).toBe('SOLUTION');
  });
});

describe('GuidedStudyAttempt — errore backend e riprova (task 3.5)', () => {
  it('shows a controlled error when the backend rejects the transcript, without inventing an outcome', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'], tree: undefined });
    const recordAttempt = vi.fn((_: RecordAttemptRequest) =>
      throwError(() => ({ error: { field: 'userMoves', message: 'Il tentativo non è ancora concluso.' } })),
    );
    const { fixture, cmp, el } = setup(variant, { studyType: 'TACTICAL', recordAttempt });
    fixture.detectChanges();

    playMove(fixture, el, 'd2', 'd4');

    expect(cmp.state()).toBe('ERROR');
    expect(cmp.error()).toBe('Il tentativo non è ancora concluso.');
    expect(cmp.lastOutcome()).toBeNull();
  });

  it('recovers from a backend error with retry, resetting the local mainline progress', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'], tree: undefined });
    const recordAttempt = vi
      .fn((_: RecordAttemptRequest) => of(attemptResult({ outcome: 'UNDERSTOOD' })))
      .mockImplementationOnce(() => throwError(() => ({ error: { message: 'Errore di rete.' } })));
    const { fixture, cmp, el } = setup(variant, { studyType: 'TACTICAL', recordAttempt });
    fixture.detectChanges();

    playMove(fixture, el, 'e2', 'e4'); // corretto, risposta e5 automatica, mainline pari esaurita: 1° invio (errore)
    expect(cmp.state()).toBe('ERROR');

    cmp.retry();
    fixture.detectChanges();
    expect(cmp.state()).toBe('USER_TURN');
    expect(cmp.machine.userMoves()).toEqual([]);

    playMove(fixture, el, 'e2', 'e4'); // riprovato: stessa sequenza, 2° invio (successo)
    expect(cmp.state()).toBe('SOLUTION');
    expect(cmp.lastOutcome()).toBe('UNDERSTOOD');
    expect(recordAttempt).toHaveBeenCalledTimes(2);
  });
});

describe('GuidedStudyAttempt — risposte fuori ordine ed epoch (task 3.5/3.6)', () => {
  it('ignores a stale backend response after a retry started before it resolved', () => {
    const variant = eligiblePosition({ moves: ['e4'], tree: undefined });
    const pending = new Subject<PositionAttempt>();
    const recordAttempt = vi.fn((_: RecordAttemptRequest) => pending.asObservable());
    const { fixture, cmp, el } = setup(variant, { studyType: 'TACTICAL', recordAttempt });
    fixture.detectChanges();

    playMove(fixture, el, 'e2', 'e4'); // corretto, mainline dispari esaurita subito: invio in corso
    expect(cmp.state()).toBe('SAVING_OUTCOME');

    cmp.retry();
    fixture.detectChanges();
    expect(cmp.state()).toBe('USER_TURN');

    pending.next(attemptResult({ outcome: 'UNDERSTOOD' }));
    pending.complete();
    fixture.detectChanges();

    // La risposta appartiene all'epoch precedente: nessun evento duplicato, nessuno stato inventato.
    expect(cmp.state()).toBe('USER_TURN');
    expect(cmp.lastOutcome()).toBeNull();
  });

  it('ignores a stale backend error after the position changes mid-request', () => {
    const variant = eligiblePosition({ id: 41, moves: ['e4'], tree: undefined, startingFen: START });
    const pending = new Subject<PositionAttempt>();
    const recordAttempt = vi.fn((_: RecordAttemptRequest) => pending.asObservable());
    const { fixture, cmp, el } = setup(variant, { studyType: 'TACTICAL', recordAttempt });
    fixture.detectChanges();

    playMove(fixture, el, 'e2', 'e4');
    expect(cmp.state()).toBe('SAVING_OUTCOME');

    const other = eligiblePosition({ id: 42, moves: ['Ke2'], tree: undefined, startingFen: OTHER_FEN });
    fixture.componentRef.setInput('variant', other);
    fixture.detectChanges();
    expect(cmp.state()).toBe('USER_TURN');
    expect(cmp.attemptFen()).toBe(OTHER_FEN);

    pending.error({ error: { message: 'Errore tardivo' } });
    fixture.detectChanges();

    expect(cmp.state()).toBe('USER_TURN');
    expect(cmp.attemptFen()).toBe(OTHER_FEN);
  });
});

describe('GuidedStudyAttempt — soluzione tattica non anticipabile (task 3.3/3.4)', () => {
  it('does not reveal the solution manually before the backend confirms an outcome', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5', 'Nf3', 'Nc6'], tree: undefined });
    const { fixture, cmp, el } = setup(variant, { studyType: 'TACTICAL' });
    fixture.detectChanges();

    playMove(fixture, el, 'e2', 'e4'); // corretto, mainline non ancora esaurita

    cmp.revealSolution();
    fixture.detectChanges();

    expect(cmp.state()).not.toBe('SOLUTION');
    expect(el.querySelector('.move')).toBeNull();
  });

  it('hides the manual "Mostra soluzione" control for a tactical position before an outcome', () => {
    const { fixture, el } = setup(eligiblePosition(), { studyType: 'TACTICAL' });
    fixture.detectChanges();

    const labels = Array.from(el.querySelectorAll('button')).map((b) => b.textContent?.trim());
    expect(labels).not.toContain('Mostra soluzione');
  });

  it('does not reveal the solution manually while a submission is pending (SAVING_OUTCOME)', () => {
    const variant = eligiblePosition({ moves: ['e4'], tree: undefined });
    const pending = new Subject<PositionAttempt>();
    const { fixture, cmp, el } = setup(variant, {
      studyType: 'TACTICAL',
      recordAttempt: () => pending.asObservable(),
    });
    fixture.detectChanges();

    playMove(fixture, el, 'e2', 'e4');
    expect(cmp.state()).toBe('SAVING_OUTCOME');

    cmp.revealSolution();
    fixture.detectChanges();

    expect(cmp.state()).toBe('SAVING_OUTCOME');
  });
});

describe('GuidedStudyAttempt — nessun motore nel flusso tattico (task 3.6/3.7)', () => {
  it('runs a full tactical sequence with no service beyond the plain recordAttempt function', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'], tree: undefined });
    const { fixture, cmp, el } = setup(variant, { studyType: 'TACTICAL' });
    fixture.detectChanges();

    playMove(fixture, el, 'e2', 'e4');
    fixture.detectChanges();

    expect(cmp.state()).toBe('SOLUTION');
  });

  it('never renders engine, evaluation bar or PV controls for a tactical position', () => {
    const { fixture, el } = setup(eligiblePosition(), { studyType: 'TACTICAL' });
    fixture.detectChanges();

    expect(el.textContent?.toLowerCase()).not.toContain('motore');
    expect(el.querySelector('[class*="engine"]')).toBeNull();
    expect(el.querySelector('[class*="eval"]')).toBeNull();
  });
});

describe('GuidedStudyAttempt — regressione B2: studi non tattici restano passivi senza deviazione', () => {
  it('never calls recordAttempt for a STRATEGIC study, even when the user plays the exact mainline', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'], tree: undefined });
    const recordAttempt = vi.fn((_: RecordAttemptRequest) => of(attemptResult()));
    const { fixture, cmp, el } = setup(variant, { studyType: 'STRATEGIC', recordAttempt });
    fixture.detectChanges();

    playMove(fixture, el, 'e2', 'e4');

    expect(recordAttempt).not.toHaveBeenCalled();
    expect(cmp.state()).toBe('USER_TURN');
    expect(cmp.machine.userMoves()).toEqual(['e4']);
  });
});

describe('GuidedStudyAttempt — flusso strategico: mainline finché seguita (task 4.1)', () => {
  it('applies mainline replies without ever assigning an outcome, even when the mainline ends', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'], tree: undefined });
    const recordAttempt = vi.fn((_: RecordAttemptRequest) => of(attemptResult()));
    const { fixture, cmp, el } = setup(variant, { studyType: 'STRATEGIC', recordAttempt });
    fixture.detectChanges();

    playMove(fixture, el, 'e2', 'e4');

    expect(recordAttempt).not.toHaveBeenCalled();
    expect(cmp.state()).toBe('USER_TURN');
    expect(cmp.lastOutcome()).toBeNull();
    expect(cmp.attemptFen()).toBe(fenAfter(['e4', 'e5']));
  });

  it('has no effect toggling the engine before any deviation, even when the mainline move is played', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'], tree: undefined });
    const requestBestMove = vi.fn();
    const engine = mockEngine({ requestBestMove });
    const { fixture, cmp, el } = setup(variant, { studyType: 'STRATEGIC', engine });
    fixture.detectChanges();

    cmp.toggleEngine();
    fixture.detectChanges();
    expect(requestBestMove).not.toHaveBeenCalled();
    expect(cmp.state()).toBe('USER_TURN');

    playMove(fixture, el, 'e2', 'e4');

    expect(requestBestMove).not.toHaveBeenCalled();
    expect(cmp.state()).toBe('USER_TURN');
    expect(cmp.attemptFen()).toBe(fenAfter(['e4', 'e5']));
  });
});

describe('GuidedStudyAttempt — deviazione strategica (task 4.2/4.3)', () => {
  it('signals the deviation without an outcome and suspends when the engine is off', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'], tree: undefined });
    const recordAttempt = vi.fn((_: RecordAttemptRequest) => of(attemptResult()));
    const { fixture, cmp, el } = setup(variant, { studyType: 'STRATEGIC', recordAttempt });
    fixture.detectChanges();

    playMove(fixture, el, 'd2', 'd4'); // legale, diverge da "e4" atteso al ply 1

    expect(cmp.state()).toBe('DEVIATED_ENGINE_OFF');
    expect(recordAttempt).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Attiva il motore');
  });
});

describe('GuidedStudyAttempt — esplorazione con motore attivo (task 4.4)', () => {
  it('requests exactly one best move after enabling the engine post-deviation and returns the turn', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'], tree: undefined });
    const requestBestMove = vi.fn((_fen: string, ms: number, cb: (m: string | null) => void) => {
      expect(ms).toBe(800);
      cb('e7e5');
    });
    const engine = mockEngine({ requestBestMove });
    const { fixture, cmp, el } = setup(variant, { studyType: 'STRATEGIC', engine });
    fixture.detectChanges();

    playMove(fixture, el, 'd2', 'd4');
    cmp.toggleEngine();
    fixture.detectChanges();

    expect(requestBestMove).toHaveBeenCalledTimes(1);
    expect(requestBestMove.mock.calls[0][0]).toBe(fenAfter(['d4']));
    expect(cmp.state()).toBe('EXPLORATION_USER_TURN');
    expect(cmp.attemptFen()).toBe(fenAfter(['d4', 'e5']));
  });

  it('requests a new single reply for each further exploratory move while the engine stays on', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'], tree: undefined });
    const requestBestMove = vi.fn((_fen: string, _ms: number, cb: (m: string | null) => void) => cb('e7e5'));
    const engine = mockEngine({ requestBestMove });
    const { fixture, cmp, el } = setup(variant, { studyType: 'STRATEGIC', engine });
    fixture.detectChanges();

    playMove(fixture, el, 'd2', 'd4');
    cmp.toggleEngine();
    fixture.detectChanges();
    expect(cmp.state()).toBe('EXPLORATION_USER_TURN');

    requestBestMove.mockImplementationOnce((_fen: string, _ms: number, cb: (m: string | null) => void) =>
      cb('b8c6'),
    );
    playMove(fixture, el, 'g1', 'f3'); // seconda mossa esplorativa dell'utente

    expect(requestBestMove).toHaveBeenCalledTimes(2);
    expect(requestBestMove.mock.calls[1][0]).toBe(fenAfter(['d4', 'e5', 'Nf3']));
    expect(cmp.state()).toBe('EXPLORATION_USER_TURN');
    expect(cmp.attemptFen()).toBe(fenAfter(['d4', 'e5', 'Nf3', 'Nc6']));
  });

  it('never persists the exploratory line into the author tree or moves', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'], tree: undefined });
    const requestBestMove = vi.fn((_fen: string, _ms: number, cb: (m: string | null) => void) => cb('e7e5'));
    const engine = mockEngine({ requestBestMove });
    const originalMoves = [...variant.moves];
    const { fixture, el } = setup(variant, { studyType: 'STRATEGIC', engine });
    fixture.detectChanges();

    playMove(fixture, el, 'd2', 'd4');

    expect(variant.moves).toEqual(originalMoves);
  });

  it('suspends at the next required response after disabling the engine mid-exploration', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'], tree: undefined });
    const requestBestMove = vi.fn((_fen: string, _ms: number, cb: (m: string | null) => void) => cb('e7e5'));
    const engine = mockEngine({ requestBestMove });
    const { fixture, cmp, el } = setup(variant, { studyType: 'STRATEGIC', engine });
    fixture.detectChanges();

    playMove(fixture, el, 'd2', 'd4');
    cmp.toggleEngine();
    fixture.detectChanges();
    expect(cmp.state()).toBe('EXPLORATION_USER_TURN');

    cmp.toggleEngine(); // spegne durante l'esplorazione: nessun effetto immediato (task 4.2)
    fixture.detectChanges();
    expect(cmp.state()).toBe('EXPLORATION_USER_TURN');
    expect(requestBestMove).toHaveBeenCalledTimes(1);

    playMove(fixture, el, 'g1', 'f3'); // servirebbe una risposta, ma il motore è spento

    expect(requestBestMove).toHaveBeenCalledTimes(1);
    expect(cmp.state()).toBe('DEVIATED_ENGINE_OFF');
  });
});

describe('GuidedStudyAttempt — motore non disponibile (task 4.6)', () => {
  it('shows "Motore non disponibile" when the engine returns no move, without a fallback', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'], tree: undefined });
    const requestBestMove = vi.fn((_fen: string, _ms: number, cb: (m: string | null) => void) => cb(null));
    const engine = mockEngine({ requestBestMove });
    const { fixture, cmp, el } = setup(variant, { studyType: 'STRATEGIC', engine });
    fixture.detectChanges();

    playMove(fixture, el, 'd2', 'd4');
    cmp.toggleEngine();
    fixture.detectChanges();

    expect(requestBestMove).toHaveBeenCalledTimes(1);
    expect(cmp.state()).toBe('ERROR');
    expect(cmp.error()).toBe('Motore non disponibile.');
  });

  it('shows "Motore non disponibile" when the returned UCI move is not applicable to the requested FEN', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'], tree: undefined });
    const requestBestMove = vi.fn((_fen: string, _ms: number, cb: (m: string | null) => void) => cb('a1a8'));
    const engine = mockEngine({ requestBestMove });
    const { fixture, cmp, el } = setup(variant, { studyType: 'STRATEGIC', engine });
    fixture.detectChanges();

    playMove(fixture, el, 'd2', 'd4');
    cmp.toggleEngine();
    fixture.detectChanges();

    expect(cmp.state()).toBe('ERROR');
    expect(cmp.error()).toBe('Motore non disponibile.');
  });

  it('shows "Motore non disponibile" when the worker fails mid-request (available flips false)', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'], tree: undefined });
    const available = signal(true);
    const requestBestMove = vi.fn(() => {}); // non richiama mai la callback: worker caduto
    const engine = mockEngine({ available: available as unknown as StockfishService['available'], requestBestMove });
    const { fixture, cmp, el } = setup(variant, { studyType: 'STRATEGIC', engine });
    fixture.detectChanges();

    playMove(fixture, el, 'd2', 'd4');
    cmp.toggleEngine();
    fixture.detectChanges();
    expect(cmp.state()).toBe('ENGINE_THINKING');

    available.set(false);
    fixture.detectChanges();

    expect(cmp.state()).toBe('ERROR');
    expect(cmp.error()).toBe('Motore non disponibile.');
  });

  it('leaves "Mostra soluzione" and "Riprova" available after an engine error', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'], tree: undefined });
    const requestBestMove = vi.fn((_fen: string, _ms: number, cb: (m: string | null) => void) => cb(null));
    const engine = mockEngine({ requestBestMove });
    const { fixture, cmp, el } = setup(variant, { studyType: 'STRATEGIC', engine });
    fixture.detectChanges();

    playMove(fixture, el, 'd2', 'd4');
    cmp.toggleEngine();
    fixture.detectChanges();

    const labels = Array.from(el.querySelectorAll('button')).map((b) => b.textContent?.trim());
    expect(labels).toContain('Mostra soluzione');
    expect(labels).toContain('Riprova');
  });
});

describe('GuidedStudyAttempt — callback obsolete ed epoch (task 4.5)', () => {
  it('ignores a stale engine reply superseded by a newer request', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'], tree: undefined });
    const callbacks: Array<(m: string | null) => void> = [];
    const requestBestMove = vi.fn((_fen: string, _ms: number, cb: (m: string | null) => void) => {
      callbacks.push(cb);
    });
    const engine = mockEngine({ requestBestMove });
    const { fixture, cmp, el } = setup(variant, { studyType: 'STRATEGIC', engine });
    fixture.detectChanges();

    playMove(fixture, el, 'd2', 'd4');
    cmp.toggleEngine(); // 1a richiesta
    fixture.detectChanges();
    expect(cmp.state()).toBe('ENGINE_THINKING');

    cmp.toggleEngine(); // spegne: invalida la 1a richiesta e sospende
    fixture.detectChanges();
    expect(cmp.state()).toBe('DEVIATED_ENGINE_OFF');

    cmp.toggleEngine(); // riaccende: 2a richiesta
    fixture.detectChanges();
    expect(requestBestMove).toHaveBeenCalledTimes(2);

    callbacks[0]('e7e5'); // risposta tardiva della 1a richiesta, ormai invalidata
    fixture.detectChanges();
    expect(cmp.state()).toBe('ENGINE_THINKING'); // ancora in attesa della 2a

    callbacks[1]('e7e6');
    fixture.detectChanges();
    expect(cmp.state()).toBe('EXPLORATION_USER_TURN');
    expect(cmp.attemptFen()).toBe(fenAfter(['d4', 'e6']));
  });

  it('ignores a stale engine reply after a retry started before it resolved', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'], tree: undefined });
    const callbacks: Array<(m: string | null) => void> = [];
    const requestBestMove = vi.fn((_fen: string, _ms: number, cb: (m: string | null) => void) => {
      callbacks.push(cb);
    });
    const engine = mockEngine({ requestBestMove });
    const { fixture, cmp, el } = setup(variant, { studyType: 'STRATEGIC', engine });
    fixture.detectChanges();

    playMove(fixture, el, 'd2', 'd4');
    cmp.toggleEngine();
    fixture.detectChanges();
    expect(cmp.state()).toBe('ENGINE_THINKING');

    cmp.retry();
    fixture.detectChanges();
    expect(cmp.state()).toBe('USER_TURN');

    callbacks[0]('e7e5');
    fixture.detectChanges();

    expect(cmp.state()).toBe('USER_TURN');
    expect(cmp.attemptFen()).toBe(START);
  });

  it('ignores a stale engine reply after the position changes mid-request', () => {
    const variant = eligiblePosition({ id: 41, moves: ['e4', 'e5'], tree: undefined, startingFen: START });
    const callbacks: Array<(m: string | null) => void> = [];
    const requestBestMove = vi.fn((_fen: string, _ms: number, cb: (m: string | null) => void) => {
      callbacks.push(cb);
    });
    const engine = mockEngine({ requestBestMove });
    const { fixture, cmp, el } = setup(variant, { studyType: 'STRATEGIC', engine });
    fixture.detectChanges();

    playMove(fixture, el, 'd2', 'd4');
    cmp.toggleEngine();
    fixture.detectChanges();
    expect(cmp.state()).toBe('ENGINE_THINKING');

    const other = eligiblePosition({ id: 42, moves: ['Ke2'], tree: undefined, startingFen: OTHER_FEN });
    fixture.componentRef.setInput('variant', other);
    fixture.detectChanges();
    expect(cmp.state()).toBe('USER_TURN');

    callbacks[0]('e7e5');
    fixture.detectChanges();

    expect(cmp.state()).toBe('USER_TURN');
    expect(cmp.attemptFen()).toBe(OTHER_FEN);
  });

  it('stops and invalidates the engine when the solution is revealed while it is thinking', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'], tree: undefined });
    const callbacks: Array<(m: string | null) => void> = [];
    const requestBestMove = vi.fn((_fen: string, _ms: number, cb: (m: string | null) => void) => {
      callbacks.push(cb);
    });
    const stop = vi.fn();
    const engine = mockEngine({ requestBestMove, stop });
    const { fixture, cmp, el } = setup(variant, { studyType: 'STRATEGIC', engine });
    fixture.detectChanges();

    playMove(fixture, el, 'd2', 'd4');
    cmp.toggleEngine();
    fixture.detectChanges();
    expect(cmp.state()).toBe('ENGINE_THINKING');

    cmp.revealSolution();
    fixture.detectChanges();

    expect(cmp.state()).toBe('SOLUTION');
    expect(stop).toHaveBeenCalled();

    callbacks[0]('e7e5');
    fixture.detectChanges();

    expect(cmp.state()).toBe('SOLUTION'); // la risposta tardiva non altera la soluzione
    expect(cmp.boardFen()).toBe(START);
  });
});

describe('GuidedStudyAttempt — arresto del motore su ogni transizione (task 4.5)', () => {
  it('calls stop() when the component is destroyed', () => {
    const stop = vi.fn();
    const engine = mockEngine({ stop });
    const { fixture } = setup(eligiblePosition({ moves: ['e4', 'e5'], tree: undefined }), {
      studyType: 'STRATEGIC',
      engine,
    });
    fixture.detectChanges();
    stop.mockClear();

    fixture.destroy();

    expect(stop).toHaveBeenCalled();
  });

  it('calls stop() on retry and on position change', () => {
    const stop = vi.fn();
    const engine = mockEngine({ stop });
    const variant = eligiblePosition({ moves: ['e4', 'e5'], tree: undefined });
    const { fixture, cmp } = setup(variant, { studyType: 'STRATEGIC', engine });
    fixture.detectChanges();
    stop.mockClear(); // ignora la chiamata dell'avvio del primo tentativo

    cmp.retry();
    fixture.detectChanges();
    expect(stop).toHaveBeenCalledTimes(1);

    const other = eligiblePosition({ id: 42, moves: ['Ke2'], tree: undefined, startingFen: OTHER_FEN });
    fixture.componentRef.setInput('variant', other);
    fixture.detectChanges();
    expect(stop).toHaveBeenCalledTimes(2);
  });
});

describe('GuidedStudyAttempt — soluzione strategica ed esito manuale (task 4.7/4.8)', () => {
  it('shows "Mostra soluzione" from any strategic state, stopping the engine and returning to the starting FEN', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'], tree: undefined });
    const stop = vi.fn();
    const requestBestMove = vi.fn((_fen: string, _ms: number, cb: (m: string | null) => void) => cb('e7e5'));
    const engine = mockEngine({ requestBestMove, stop });
    const { fixture, cmp, el } = setup(variant, { studyType: 'STRATEGIC', engine });
    fixture.detectChanges();

    playMove(fixture, el, 'd2', 'd4');
    cmp.toggleEngine();
    fixture.detectChanges();
    expect(cmp.state()).toBe('EXPLORATION_USER_TURN');
    stop.mockClear();

    cmp.revealSolution();
    fixture.detectChanges();

    expect(cmp.state()).toBe('SOLUTION');
    expect(cmp.boardFen()).toBe(START); // scarta la mossa esplorativa, torna alla FEN iniziale
    expect(stop).toHaveBeenCalled();
    expect(el.querySelector('.move')).not.toBeNull(); // intero albero rivelato
  });

  it('does not call recordAttempt when the solution is only revealed but no outcome is chosen', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'], tree: undefined });
    const recordAttempt = vi.fn((_: RecordAttemptRequest) => of(attemptResult()));
    const { fixture, cmp } = setup(variant, { studyType: 'STRATEGIC', recordAttempt });
    fixture.detectChanges();
    cmp.revealSolution();
    fixture.detectChanges();

    expect(recordAttempt).not.toHaveBeenCalled();
    expect(cmp.lastOutcome()).toBeNull();
  });

  it('ignores chooseStrategicOutcome before the solution is revealed', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'], tree: undefined });
    const recordAttempt = vi.fn((_: RecordAttemptRequest) => of(attemptResult()));
    const { fixture, cmp } = setup(variant, { studyType: 'STRATEGIC', recordAttempt });
    fixture.detectChanges();

    cmp.chooseStrategicOutcome('UNDERSTOOD');

    expect(recordAttempt).not.toHaveBeenCalled();
  });

  it('records UNDERSTOOD via the rendered "Compresa" control and updates the panel', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'], tree: undefined });
    const recordAttempt = vi.fn((_: RecordAttemptRequest) => of(attemptResult({ outcome: 'UNDERSTOOD' })));
    const { fixture, cmp, el } = setup(variant, { studyType: 'STRATEGIC', recordAttempt });
    fixture.detectChanges();

    const labelsBefore = Array.from(el.querySelectorAll('button')).map((b) => b.textContent?.trim());
    expect(labelsBefore).not.toContain('Compresa');

    cmp.revealSolution();
    fixture.detectChanges();

    const understood = Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Compresa',
    ) as HTMLButtonElement;
    expect(understood).toBeTruthy();
    understood.click();
    fixture.detectChanges();

    expect(recordAttempt).toHaveBeenCalledWith({ outcome: 'UNDERSTOOD' });
    expect(cmp.state()).toBe('SOLUTION');
    expect(cmp.lastOutcome()).toBe('UNDERSTOOD');
    expect(el.textContent).toContain('compresa');
  });

  it('records NOT_UNDERSTOOD via chooseStrategicOutcome', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'], tree: undefined });
    const recordAttempt = vi.fn((_: RecordAttemptRequest) => of(attemptResult({ outcome: 'NOT_UNDERSTOOD' })));
    const { fixture, cmp } = setup(variant, { studyType: 'STRATEGIC', recordAttempt });
    fixture.detectChanges();
    cmp.revealSolution();
    fixture.detectChanges();

    cmp.chooseStrategicOutcome('NOT_UNDERSTOOD');
    fixture.detectChanges();

    expect(recordAttempt).toHaveBeenCalledWith({ outcome: 'NOT_UNDERSTOOD' });
    expect(cmp.lastOutcome()).toBe('NOT_UNDERSTOOD');
  });

  it('keeps SOLUTION and the choice available when the outcome API fails, without a false summary update', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'], tree: undefined });
    const recordAttempt = vi.fn((_: RecordAttemptRequest) =>
      throwError(() => ({ error: { message: 'Errore di rete.' } })),
    );
    const { fixture, cmp } = setup(variant, { studyType: 'STRATEGIC', recordAttempt });
    fixture.detectChanges();
    cmp.revealSolution();
    fixture.detectChanges();

    cmp.chooseStrategicOutcome('UNDERSTOOD');
    fixture.detectChanges();

    expect(cmp.state()).toBe('SOLUTION'); // mai ERROR: l'albero deve restare visibile
    expect(cmp.lastOutcome()).toBeNull();
    expect(cmp.outcomeError()).toBe('Errore di rete.');
    expect(cmp.strategicSaving()).toBe(false);
  });

  it('retries the outcome choice after a failed submission', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'], tree: undefined });
    const recordAttempt = vi
      .fn((_: RecordAttemptRequest) => of(attemptResult({ outcome: 'UNDERSTOOD' })))
      .mockImplementationOnce(() => throwError(() => ({ error: { message: 'Errore di rete.' } })));
    const { fixture, cmp } = setup(variant, { studyType: 'STRATEGIC', recordAttempt });
    fixture.detectChanges();
    cmp.revealSolution();
    fixture.detectChanges();

    cmp.chooseStrategicOutcome('UNDERSTOOD');
    fixture.detectChanges();
    expect(cmp.outcomeError()).toBeTruthy();

    cmp.chooseStrategicOutcome('UNDERSTOOD');
    fixture.detectChanges();

    expect(recordAttempt).toHaveBeenCalledTimes(2);
    expect(cmp.lastOutcome()).toBe('UNDERSTOOD');
    expect(cmp.outcomeError()).toBeNull();
  });

  it('does not enable Compresa/Non compresa for a tactical position even once SOLUTION is reached', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'], tree: undefined });
    const recordAttempt = vi.fn((_: RecordAttemptRequest) => of(attemptResult({ outcome: 'UNDERSTOOD' })));
    const { fixture, cmp, el } = setup(variant, { studyType: 'TACTICAL', recordAttempt });
    fixture.detectChanges();

    playMove(fixture, el, 'e2', 'e4'); // corretto, esaurisce la mainline pari: rivelata dal backend

    expect(cmp.state()).toBe('SOLUTION');
    const labels = Array.from(el.querySelectorAll('button')).map((b) => b.textContent?.trim());
    expect(labels).not.toContain('Compresa');
    expect(labels).not.toContain('Non compresa');
  });
});

// --- Gruppo 8: accessibilità, layout e ordine DOM ----------------------------

/** Elementi realmente raggiungibili con il tab (esclude `tabindex="-1"`). */
function tabbable(el: HTMLElement): HTMLElement[] {
  return Array.from(
    el.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]'),
  ).filter((node) => (node.getAttribute('tabindex') ?? '0') !== '-1');
}

/** Comandi del pannello laterale, escluse le 64 caselle della board. */
function panelButtons(el: HTMLElement): HTMLButtonElement[] {
  return Array.from(el.querySelectorAll<HTMLButtonElement>('.side button'));
}

function statusText(el: HTMLElement): string {
  return el.querySelector('.attempt-status')?.textContent?.trim() ?? '';
}

function alertText(el: HTMLElement): string {
  return el.querySelector('.attempt-alert')?.textContent?.trim() ?? '';
}

describe('GuidedStudyAttempt — regioni live (R26.3, task 8.1)', () => {
  it('keeps both live regions in the DOM from the first render, before any state change', () => {
    const { fixture, el } = setup();
    fixture.detectChanges();

    const status = el.querySelector('.attempt-status')!;
    const alert = el.querySelector('.attempt-alert')!;
    // Presenti già in USER_TURN: un `role` inserito insieme al testo non
    // verrebbe annunciato in modo affidabile dagli screen reader.
    expect(status.getAttribute('role')).toBe('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(alert.getAttribute('role')).toBe('alert');
    expect(alertText(el)).toBe('');
    expect(alert.classList.contains('attempt-alert--empty')).toBe(true);
  });

  it('announces the deviation and the suspended engine wait in the same region', () => {
    const variant = eligiblePosition({ moves: ['d4'], tree: undefined });
    const { fixture, cmp, el } = setup(variant, { studyType: 'STRATEGIC' });
    fixture.detectChanges();
    const region = el.querySelector('.attempt-status');

    playE4(fixture, el); // devia dalla mainline con il motore spento

    expect(cmp.state()).toBe('DEVIATED_ENGINE_OFF');
    expect(statusText(el)).toContain('Attiva il motore');
    // Stesso nodo di prima: cambia solo il testo, così l'annuncio parte.
    expect(el.querySelector('.attempt-status')).toBe(region);
  });

  it('announces the engine wait without moving the focus', () => {
    const variant = eligiblePosition({ moves: ['d4'], tree: undefined });
    const engine = mockEngine({ requestBestMove: () => {} });
    const { fixture, cmp, el } = setup(variant, { studyType: 'STRATEGIC', engine });
    fixture.detectChanges();
    playE4(fixture, el);
    cmp.toggleEngine();
    fixture.detectChanges();

    expect(cmp.state()).toBe('ENGINE_THINKING');
    expect(statusText(el)).toContain('motore sta pensando');
    // Attesa: il focus non viene rubato mentre l'utente è sulla board.
    expect(document.activeElement).not.toBe(el.querySelector('.attempt-status'));
  });

  it('announces the pending submission while the backend validates the transcript', () => {
    const pending = new Subject<PositionAttempt>();
    const variant = eligiblePosition({ moves: ['e4', 'e5'], tree: undefined });
    const { fixture, cmp, el } = setup(variant, {
      studyType: 'TACTICAL',
      recordAttempt: () => pending.asObservable(),
    });
    fixture.detectChanges();

    playE4(fixture, el);

    expect(cmp.state()).toBe('SAVING_OUTCOME');
    expect(statusText(el)).toContain('Verifica della sequenza');
  });

  it('keeps the engine error in the assertive region and out of the polite one', () => {
    const variant = eligiblePosition({ moves: ['d4'], tree: undefined });
    const engine = mockEngine({ requestBestMove: (_f: string, _t: number, cb: (u: string | null) => void) => cb(null) });
    const { fixture, cmp, el } = setup(variant, { studyType: 'STRATEGIC', engine });
    fixture.detectChanges();
    playE4(fixture, el);
    cmp.toggleEngine();
    fixture.detectChanges();

    expect(cmp.state()).toBe('ERROR');
    expect(alertText(el)).toBe('Motore non disponibile.');
    expect(statusText(el)).toBe('');
  });

  it('stops announcing a previous engine error once the solution is revealed', () => {
    const variant = eligiblePosition({ moves: ['d4'], tree: undefined });
    const engine = mockEngine({ requestBestMove: (_f: string, _t: number, cb: (u: string | null) => void) => cb(null) });
    const { fixture, cmp, el } = setup(variant, { studyType: 'STRATEGIC', engine });
    fixture.detectChanges();
    playE4(fixture, el);
    cmp.toggleEngine();
    fixture.detectChanges();
    expect(alertText(el)).toBe('Motore non disponibile.');

    cmp.revealSolution();
    fixture.detectChanges();

    expect(cmp.state()).toBe('SOLUTION');
    expect(alertText(el)).toBe('');
    expect(statusText(el)).toContain('Soluzione rivelata');
  });
});

describe('GuidedStudyAttempt — gestione del focus (R26.3, task 8.1)', () => {
  it('moves the focus to the solution when the tactical outcome reveals it', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'] });
    const { fixture, cmp, el } = setup(variant, { studyType: 'TACTICAL' });
    fixture.detectChanges();

    playE4(fixture, el);

    expect(cmp.state()).toBe('SOLUTION');
    const solution = el.querySelector('.attempt-solution')!;
    expect(document.activeElement).toBe(solution);
    // Raggiungibile solo via `focus()`: mai inserita nel tab order.
    expect(solution.getAttribute('tabindex')).toBe('-1');
  });

  it('moves the focus to the solution when the strategic user reveals it manually', () => {
    const { fixture, cmp, el } = setup(eligiblePosition(), { studyType: 'STRATEGIC' });
    fixture.detectChanges();

    cmp.revealSolution();
    fixture.detectChanges();

    expect(document.activeElement).toBe(el.querySelector('.attempt-solution'));
  });

  it('moves the focus to the alert when the engine fails', () => {
    const variant = eligiblePosition({ moves: ['d4'], tree: undefined });
    const engine = mockEngine({ requestBestMove: (_f: string, _t: number, cb: (u: string | null) => void) => cb(null) });
    const { fixture, cmp, el } = setup(variant, { studyType: 'STRATEGIC', engine });
    fixture.detectChanges();
    playE4(fixture, el);
    cmp.toggleEngine();
    fixture.detectChanges();

    expect(document.activeElement).toBe(el.querySelector('.attempt-alert'));
    expect(el.querySelector('.attempt-alert')?.getAttribute('tabindex')).toBe('-1');
  });

  it('moves the focus to the alert when the backend refuses the transcript', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'], tree: undefined });
    const { fixture, cmp, el } = setup(variant, {
      studyType: 'TACTICAL',
      recordAttempt: () => throwError(() => new Error('500')),
    });
    fixture.detectChanges();

    playE4(fixture, el);

    expect(cmp.state()).toBe('ERROR');
    expect(document.activeElement).toBe(el.querySelector('.attempt-alert'));
  });

  it('moves the focus to the status region when the recorded outcome removes the choice buttons', () => {
    const { fixture, cmp, el } = setup(eligiblePosition(), { studyType: 'STRATEGIC' });
    fixture.detectChanges();
    cmp.revealSolution();
    fixture.detectChanges();
    const understood = panelButtons(el).find((b) => b.textContent?.trim() === 'Compresa')!;
    understood.focus();

    understood.click();
    fixture.detectChanges();

    // «Compresa»/«Non compresa» spariscono: senza spostamento il focus
    // resterebbe orfano sul body.
    expect(panelButtons(el).map((b) => b.textContent?.trim())).not.toContain('Compresa');
    expect(document.activeElement).toBe(el.querySelector('.attempt-status'));
    expect(statusText(el)).toContain('compresa');
  });

  it('does not move the focus for a failed outcome submission, keeping the choice usable', () => {
    const { fixture, cmp, el } = setup(eligiblePosition(), {
      studyType: 'STRATEGIC',
      recordAttempt: () => throwError(() => new Error('500')),
    });
    fixture.detectChanges();
    cmp.revealSolution();
    fixture.detectChanges();
    const understood = panelButtons(el).find((b) => b.textContent?.trim() === 'Compresa')!;
    understood.focus();

    understood.click();
    fixture.detectChanges();

    expect(alertText(el)).toBeTruthy();
    // Il pulsante è ancora lì per il retry: il focus non deve spostarsi.
    expect(document.activeElement).toBe(understood);
  });

  it('does not steal the focus when retrying after a solution', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'] });
    const { fixture, cmp, el } = setup(variant, { studyType: 'TACTICAL' });
    fixture.detectChanges();
    playE4(fixture, el);
    expect(document.activeElement).toBe(el.querySelector('.attempt-solution'));

    const retry = panelButtons(el).find((b) => b.textContent?.trim() === 'Riprova')!;
    retry.focus();
    retry.click();
    fixture.detectChanges();

    expect(cmp.state()).toBe('USER_TURN');
    // Nessuna richiesta pendente del tentativo precedente viene riapplicata.
    expect(document.activeElement).toBe(retry);
  });

  it('moves the focus again when a second attempt reaches the solution', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'] });
    // Risposta asincrona come in produzione: il ciclo di change detection fra
    // mossa e rivelazione lascia la board risincronizzarsi sulla FEN iniziale.
    const pending: Subject<PositionAttempt>[] = [];
    const recordAttempt = () => {
      const subject = new Subject<PositionAttempt>();
      pending.push(subject);
      return subject.asObservable();
    };
    const { fixture, cmp, el } = setup(variant, { studyType: 'TACTICAL', recordAttempt });
    fixture.detectChanges();

    playE4(fixture, el);
    pending[0].next(attemptResult({ outcome: 'UNDERSTOOD' }));
    fixture.detectChanges();
    expect(document.activeElement).toBe(el.querySelector('.attempt-solution'));

    cmp.retry();
    fixture.detectChanges();
    playE4(fixture, el);
    pending[1].next(attemptResult({ outcome: 'UNDERSTOOD' }));
    fixture.detectChanges();

    expect(cmp.state()).toBe('SOLUTION');
    expect(document.activeElement).toBe(el.querySelector('.attempt-solution'));
  });
});

describe('GuidedStudyAttempt — tastiera e contenuto nascosto (R26.3, task 8.2/8.3)', () => {
  it('exposes no focusable author content before the solution', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'] });
    const { fixture, el } = setup(variant, { studyType: 'TACTICAL' });
    fixture.detectChanges();

    // L'albero non è nascosto via CSS: non è proprio renderizzato (design
    // decisione 4), quindi non può finire nel tab order.
    expect(el.querySelector('.attempt-solution')).toBeNull();
    expect(el.querySelector('.pgn')).toBeNull();
    expect(el.querySelectorAll('.move').length).toBe(0);
    expect(el.querySelectorAll('.ctrl').length).toBe(0);
    expect(el.querySelector('.move-counter')).toBeNull();
    expect(tabbable(el).some((node) => node.classList.contains('move'))).toBe(false);
  });

  it('keeps the live regions out of the tab order while staying focusable programmatically', () => {
    const { fixture, el } = setup();
    fixture.detectChanges();

    const regions = ['.attempt-status', '.attempt-alert'];
    for (const selector of regions) {
      expect(el.querySelector(selector)?.getAttribute('tabindex')).toBe('-1');
    }
    expect(tabbable(el).some((node) => regions.some((s) => node.matches(s)))).toBe(false);
  });

  it('reaches every panel command with the keyboard and never uses a positive tabindex', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'] });
    const { fixture, el } = setup(variant, { studyType: 'STRATEGIC' });
    fixture.detectChanges();

    const commands = panelButtons(el).map((b) => b.textContent?.trim());
    expect(commands).toEqual(['Mostra soluzione', 'Attiva motore', 'Riprova']);
    for (const button of panelButtons(el)) {
      expect(button.getAttribute('type')).toBe('button');
      expect(button.disabled).toBe(false);
      expect(button.getAttribute('tabindex')).toBeNull();
    }
    expect(
      Array.from(el.querySelectorAll('[tabindex]')).every(
        (node) => node.getAttribute('tabindex') === '-1',
      ),
    ).toBe(true);
  });

  it('keeps the solution replay controls keyboard operable once revealed', () => {
    const { fixture, cmp, el } = setup(eligiblePosition(), { studyType: 'STRATEGIC' });
    fixture.detectChanges();
    cmp.revealSolution();
    fixture.detectChanges();

    const controls = Array.from(el.querySelectorAll<HTMLButtonElement>('.ctrl'));
    expect(controls.map((b) => b.getAttribute('aria-label'))).toEqual([
      "Vai all'inizio",
      'Mossa precedente',
      'Mossa successiva',
      'Vai alla fine',
    ]);
    // Il replay è manuale: il pulsante «avanti» risponde al click da tastiera.
    controls[2].click();
    fixture.detectChanges();
    expect(cmp.solutionPath()).toEqual([0]);
  });

  it('marks the engine toggle with its pressed state', () => {
    const variant = eligiblePosition({ moves: ['d4'], tree: undefined });
    const { fixture, cmp, el } = setup(variant, { studyType: 'STRATEGIC' });
    fixture.detectChanges();
    const toggle = panelButtons(el).find((b) => b.getAttribute('aria-pressed') !== null)!;

    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    toggle.click();
    fixture.detectChanges();

    expect(cmp.engineEnabled()).toBe(true);
    expect(
      panelButtons(el)
        .find((b) => b.getAttribute('aria-pressed') !== null)
        ?.getAttribute('aria-pressed'),
    ).toBe('true');
  });
});

describe('GuidedStudyAttempt — layout e geometria (R26.3, task 8.2)', () => {
  it('lays out board and panel as the positional two-column layout of R26.1', () => {
    const { fixture, el } = setup();
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    // Board e pannello sono figli diretti dell'host: è l'host stesso il
    // contenitore flex, altrimenti resterebbero impilati in flusso normale.
    expect(Array.from(host.children).map((c) => c.className)).toEqual(['board-col', 'side']);
    expect(el.querySelector('.board-col app-chessboard')).not.toBeNull();
    // Nessun wrapper `.detail` annidato: il contenitore posizionale è uno solo.
    expect(el.querySelector('.detail')).toBeNull();
  });

  it('keeps the board before the panel in DOM order, and the panel in reading order', () => {
    const variant = eligiblePosition({ moves: ['e4', 'e5'] });
    const { fixture, cmp, el } = setup(variant, { studyType: 'STRATEGIC' });
    fixture.detectChanges();
    cmp.revealSolution();
    fixture.detectChanges();

    const order = Array.from(
      el.querySelectorAll(
        'app-chessboard, .side-head, .attempt-status, .attempt-alert, .attempt-actions, .attempt-solution',
      ),
    ).map((node) => node.tagName.toLowerCase());
    expect(order).toEqual([
      'app-chessboard',
      'header', // intestazione della posizione
      'p', // regione live di stato
      'p', // regione live assertiva
      'div', // esito strategico manuale
      'div', // comandi del tentativo
      'div', // soluzione rivelata
    ]);
    expect(el.querySelector('.attempt-solution .pgn')).not.toBeNull();
  });

  it('does not change the set or order of the rendered commands when the engine is toggled', () => {
    const variant = eligiblePosition({ moves: ['d4'], tree: undefined });
    const engine = mockEngine({ requestBestMove: () => {} });
    const { fixture, cmp, el } = setup(variant, { studyType: 'STRATEGIC', engine });
    fixture.detectChanges();
    const before = panelButtons(el).length;

    cmp.toggleEngine();
    fixture.detectChanges();
    expect(panelButtons(el).length).toBe(before);
    cmp.toggleEngine();
    fixture.detectChanges();

    // Solo l'etichetta cambia: numero e ordine dei comandi restano fissi, e la
    // classe a larghezza minima evita che il pannello si riassesti.
    expect(panelButtons(el).map((b) => b.textContent?.trim())).toEqual([
      'Mostra soluzione',
      'Attiva motore',
      'Riprova',
    ]);
    expect(
      panelButtons(el).filter((b) => b.classList.contains('attempt-action--wide')).length,
    ).toBe(2);
  });

  it('keeps the status region present across every attempt state', () => {
    const variant = eligiblePosition({ moves: ['d4'], tree: undefined });
    const engine = mockEngine({ requestBestMove: () => {} });
    const { fixture, cmp, el } = setup(variant, { studyType: 'STRATEGIC', engine });
    fixture.detectChanges();
    const region = el.querySelector('.attempt-status');
    expect(statusText(el)).toBeTruthy();

    playE4(fixture, el);
    expect(el.querySelector('.attempt-status')).toBe(region);
    cmp.toggleEngine();
    fixture.detectChanges();
    expect(el.querySelector('.attempt-status')).toBe(region);
    cmp.revealSolution();
    fixture.detectChanges();

    // Stesso nodo dall'inizio alla soluzione: nessun blocco che compare o
    // sparisce sopra i comandi durante i passaggi di stato.
    expect(el.querySelector('.attempt-status')).toBe(region);
    expect(statusText(el)).toBeTruthy();
  });
});
