import { parseInfoLine, parseBestMove, formatEval, pvToSan, numberedPv } from './uci';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('parseInfoLine', () => {
  it('parses a centipawn score from White to move (White POV unchanged)', () => {
    const r = parseInfoLine('info depth 18 seldepth 24 score cp 35 nodes 1000 pv e2e4 e7e5', 'w');
    expect(r).toEqual({ depth: 18, scoreCp: 35, mate: null, pv: ['e2e4', 'e7e5'] });
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

  // ISSUE-022: serve l'intera linea, non solo la prima mossa.
  it('keeps the whole principal variation, promotions included', () => {
    const r = parseInfoLine('info depth 22 score cp 12 pv e2e4 e7e5 g1f3 b8c6 f1b5 a7b8q', 'w');
    expect(r?.pv).toEqual(['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'a7b8q']);
  });

  it('is not confused by multipv and stops at the first non-move token', () => {
    const r = parseInfoLine('info depth 9 multipv 1 score cp 20 pv e2e4 e7e5 string extra', 'w');
    expect(r?.pv).toEqual(['e2e4', 'e7e5']);
  });

  it('reports an empty pv when the info line has none', () => {
    expect(parseInfoLine('info depth 4 score cp 10 nodes 500', 'w')?.pv).toEqual([]);
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

describe('pvToSan', () => {
  it('converts UCI coordinates to SAN from the analysed position', () => {
    expect(pvToSan(START, ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5'])).toEqual([
      'e4',
      'e5',
      'Nf3',
      'Nc6',
      'Bb5',
    ]);
  });

  it('starts from a mid-game FEN with Black to move', () => {
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2';
    expect(pvToSan(fen, ['b8c6', 'g1f3'])).toEqual(['Nc6', 'Nf3']);
  });

  it('renders castling and promotion in SAN', () => {
    const castle = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1';
    expect(pvToSan(castle, ['e1g1'])).toEqual(['O-O']);
    const promo = '8/P6k/8/8/8/8/6K1/8 w - - 0 1';
    expect(pvToSan(promo, ['a7a8q'])).toEqual(['a8=Q']);
  });

  it('keeps the moves it can apply and stops at the first illegal one', () => {
    expect(pvToSan(START, ['e2e4', 'e7e5', 'a1a8'])).toEqual(['e4', 'e5']);
  });

  it('returns an empty line for an empty pv or an invalid FEN', () => {
    expect(pvToSan(START, [])).toEqual([]);
    expect(pvToSan('', ['e2e4'])).toEqual([]);
    expect(pvToSan('not-a-fen', ['e2e4'])).toEqual([]);
  });
});

describe('numberedPv', () => {
  it('numbers a line that starts with White to move', () => {
    expect(numberedPv(START, ['e4', 'e5', 'Nf3'])).toBe('1. e4 e5 2. Nf3');
  });

  it('marks the half move when the line starts with Black to move', () => {
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 12';
    expect(numberedPv(fen, ['Nc6', 'Nf3', 'Bc5'])).toBe('12… Nc6 13. Nf3 Bc5');
  });

  it('returns an empty string when there is no line', () => {
    expect(numberedPv(START, [])).toBe('');
  });

  it('falls back to move 1 when the FEN has no full move counter', () => {
    expect(numberedPv('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w', ['e4'])).toBe('1. e4');
  });
});

describe('formatEval', () => {
  it('formats a positive centipawn advantage', () => {
    const f = formatEval({ depth: 18, scoreCp: 150, mate: null, pv: [] });
    expect(f.text).toBe('+1.5');
    expect(f.whiteFraction).toBeGreaterThan(0.5);
  });

  it('formats a negative centipawn advantage', () => {
    const f = formatEval({ depth: 18, scoreCp: -80, mate: null, pv: [] });
    expect(f.text).toBe('-0.8');
    expect(f.whiteFraction).toBeLessThan(0.5);
  });

  it('formats mate scores and pins the bar', () => {
    expect(formatEval({ depth: 20, scoreCp: null, mate: 3, pv: [] }).text).toBe('#3');
    expect(formatEval({ depth: 20, scoreCp: null, mate: 3, pv: [] }).whiteFraction).toBeGreaterThan(0.9);
    expect(formatEval({ depth: 20, scoreCp: null, mate: -2, pv: [] }).whiteFraction).toBeLessThan(0.1);
  });

  it('keeps the fraction within [0.02, 0.98]', () => {
    expect(formatEval({ depth: 30, scoreCp: 5000, mate: null, pv: [] }).whiteFraction).toBeLessThanOrEqual(0.98);
    expect(formatEval({ depth: 30, scoreCp: -5000, mate: null, pv: [] }).whiteFraction).toBeGreaterThanOrEqual(0.02);
  });
});
