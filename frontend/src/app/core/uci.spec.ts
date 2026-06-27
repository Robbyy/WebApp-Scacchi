import { parseInfoLine, parseBestMove, formatEval } from './uci';

describe('parseInfoLine', () => {
  it('parses a centipawn score from White to move (White POV unchanged)', () => {
    const r = parseInfoLine('info depth 18 seldepth 24 score cp 35 nodes 1000 pv e2e4 e7e5', 'w');
    expect(r).toEqual({ depth: 18, scoreCp: 35, mate: null, pv: 'e2e4' });
  });

  it('negates the score when Black is to move (to White POV)', () => {
    const r = parseInfoLine('info depth 12 score cp 50 pv d7d5', 'b');
    expect(r?.scoreCp).toBe(-50);
  });

  it('parses a mate score and converts it to White POV', () => {
    expect(parseInfoLine('info depth 20 score mate 3 pv a1a8', 'w')?.mate).toBe(3);
    expect(parseInfoLine('info depth 20 score mate 2 pv a1a8', 'b')?.mate).toBe(-2);
  });

  it('returns null for lines without a score', () => {
    expect(parseInfoLine('info depth 1 currmove e2e4', 'w')).toBeNull();
    expect(parseInfoLine('readyok', 'w')).toBeNull();
  });
});

describe('parseBestMove', () => {
  it('extracts the move', () => {
    expect(parseBestMove('bestmove e2e4 ponder e7e5')).toBe('e2e4');
  });

  it('returns null for "(none)" or non-bestmove lines', () => {
    expect(parseBestMove('bestmove (none)')).toBeNull();
    expect(parseBestMove('info depth 1')).toBeNull();
  });
});

describe('formatEval', () => {
  it('formats a positive centipawn advantage', () => {
    const f = formatEval({ depth: 18, scoreCp: 150, mate: null, pv: null });
    expect(f.text).toBe('+1.5');
    expect(f.whiteFraction).toBeGreaterThan(0.5);
  });

  it('formats a negative centipawn advantage', () => {
    const f = formatEval({ depth: 18, scoreCp: -80, mate: null, pv: null });
    expect(f.text).toBe('-0.8');
    expect(f.whiteFraction).toBeLessThan(0.5);
  });

  it('formats mate scores and pins the bar', () => {
    expect(formatEval({ depth: 20, scoreCp: null, mate: 3, pv: null }).text).toBe('#3');
    expect(formatEval({ depth: 20, scoreCp: null, mate: 3, pv: null }).whiteFraction).toBeGreaterThan(0.9);
    expect(formatEval({ depth: 20, scoreCp: null, mate: -2, pv: null }).whiteFraction).toBeLessThan(0.1);
  });

  it('keeps the fraction within [0.02, 0.98]', () => {
    expect(formatEval({ depth: 30, scoreCp: 5000, mate: null, pv: null }).whiteFraction).toBeLessThanOrEqual(0.98);
    expect(formatEval({ depth: 30, scoreCp: -5000, mate: null, pv: null }).whiteFraction).toBeGreaterThanOrEqual(0.02);
  });
});
