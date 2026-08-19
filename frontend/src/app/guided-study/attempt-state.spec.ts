import { AttemptStateMachine } from './attempt-state';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

describe('AttemptStateMachine (R26.3, task 2.1)', () => {
  it('starts LOADING before any attempt begins, locked and without an epoch', () => {
    const m = new AttemptStateMachine();
    expect(m.state()).toBe('LOADING');
    expect(m.epoch()).toBe(0);
    expect(m.locked()).toBe(true);
  });

  it('begins an attempt from the starting FEN, unlocked in USER_TURN', () => {
    const m = new AttemptStateMachine();
    const epoch = m.beginAttempt(START);
    expect(epoch).toBe(1);
    expect(m.epoch()).toBe(1);
    expect(m.state()).toBe('USER_TURN');
    expect(m.startingFen()).toBe(START);
    expect(m.currentFen()).toBe(START);
    expect(m.userMoves()).toEqual([]);
    expect(m.error()).toBeNull();
    expect(m.locked()).toBe(false);
  });

  it('bumps a new epoch on every begin/retry, invalidating the previous one (task 2.1)', () => {
    const m = new AttemptStateMachine();
    const first = m.beginAttempt(START);
    const second = m.beginAttempt(START);
    expect(second).toBe(first + 1);
    const third = m.retry();
    expect(third).toBe(second + 1);
  });

  it('records a user move and updates the current FEN while unlocked (USER_TURN)', () => {
    const m = new AttemptStateMachine();
    m.beginAttempt(START);
    const accepted = m.applyUserMove('e4', AFTER_E4);
    expect(accepted).toBe(true);
    expect(m.userMoves()).toEqual(['e4']);
    expect(m.currentFen()).toBe(AFTER_E4);
    expect(m.state()).toBe('USER_TURN');
  });

  it('accepts a user move during exploration (EXPLORATION_USER_TURN is also unlocked)', () => {
    const m = new AttemptStateMachine();
    m.beginAttempt(START);
    m.enterExplorationUserTurn();
    expect(m.locked()).toBe(false);
    expect(m.applyUserMove('e4', AFTER_E4)).toBe(true);
  });

  it('ignores a user move while locked (auto-reply, engine, saving, deviated-off)', () => {
    const m = new AttemptStateMachine();
    const enters: Array<[string, () => void]> = [
      ['AUTO_REPLY', () => m.enterAutoReply()],
      ['DEVIATED_ENGINE_OFF', () => m.enterDeviatedEngineOff()],
      ['ENGINE_THINKING', () => m.enterEngineThinking()],
      ['SAVING_OUTCOME', () => m.enterSavingOutcome()],
    ];
    for (const [, enter] of enters) {
      m.beginAttempt(START);
      enter();
      expect(m.locked()).toBe(true);
      const accepted = m.applyUserMove('e4', AFTER_E4);
      expect(accepted).toBe(false);
      expect(m.currentFen()).toBe(START);
      expect(m.userMoves()).toEqual([]);
    }
  });

  it('reveals the solution from any state, resetting the board to the starting FEN', () => {
    const m = new AttemptStateMachine();
    m.beginAttempt(START);
    m.applyUserMove('e4', AFTER_E4);
    m.enterEngineThinking();
    m.revealSolution();
    expect(m.state()).toBe('SOLUTION');
    expect(m.currentFen()).toBe(START);
    expect(m.locked()).toBe(true);
  });

  it('enters a controlled error state and keeps the board locked', () => {
    const m = new AttemptStateMachine();
    m.beginAttempt(START);
    m.fail('Errore di rete');
    expect(m.state()).toBe('ERROR');
    expect(m.error()).toBe('Errore di rete');
    expect(m.locked()).toBe(true);
  });

  it('retries from ERROR, clearing the error and unblocking the board', () => {
    const m = new AttemptStateMachine();
    m.beginAttempt(START);
    m.fail('boom');
    const epoch = m.retry();
    expect(epoch).toBe(2);
    expect(m.state()).toBe('USER_TURN');
    expect(m.error()).toBeNull();
    expect(m.userMoves()).toEqual([]);
    expect(m.currentFen()).toBe(START);
  });

  it('retries from SOLUTION, discarding local moves and returning to the starting FEN', () => {
    const m = new AttemptStateMachine();
    m.beginAttempt(START);
    m.applyUserMove('e4', AFTER_E4);
    m.revealSolution();
    const epoch = m.retry();
    expect(epoch).toBe(2);
    expect(m.state()).toBe('USER_TURN');
    expect(m.userMoves()).toEqual([]);
    expect(m.currentFen()).toBe(START);
    expect(m.locked()).toBe(false);
  });

  it('keeps successive attempts on the same instance independent (no leaked moves)', () => {
    const m = new AttemptStateMachine();
    m.beginAttempt(START);
    m.applyUserMove('e4', AFTER_E4);
    m.beginAttempt(START);
    expect(m.userMoves()).toEqual([]);
    expect(m.currentFen()).toBe(START);
  });
});
