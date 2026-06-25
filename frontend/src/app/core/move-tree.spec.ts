import {
  addChild,
  buildTokens,
  childrenAt,
  fenAt,
  fromLine,
  isOnMainline,
  lineSans,
  mainline,
  pathsEqual,
  promoteToMainline,
  remainingMainline,
  removeNode,
} from './move-tree';
import { MoveNode } from './variant.model';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** Albero di riferimento: e4 ( e5 -> Nf3 ; c5 ). */
function sample(): MoveNode[] {
  return [
    {
      san: 'e4',
      children: [
        { san: 'e5', children: [{ san: 'Nf3', children: [] }] },
        { san: 'c5', children: [] },
      ],
    },
  ];
}

describe('move-tree', () => {
  describe('fromLine / mainline', () => {
    it('builds a linear chain and reads its mainline', () => {
      expect(mainline(fromLine(['e4', 'e5', 'Nf3']))).toEqual(['e4', 'e5', 'Nf3']);
    });

    it('handles an empty line', () => {
      expect(fromLine([])).toEqual([]);
      expect(mainline([])).toEqual([]);
    });

    it('mainline follows the first child at every level', () => {
      expect(mainline(sample())).toEqual(['e4', 'e5', 'Nf3']);
    });
  });

  describe('childrenAt / remainingMainline', () => {
    it('returns the children at a path', () => {
      const t = sample();
      expect(childrenAt(t, []).map((c) => c.san)).toEqual(['e4']);
      expect(childrenAt(t, [0]).map((c) => c.san)).toEqual(['e5', 'c5']);
      expect(childrenAt(t, [0, 1]).map((c) => c.san)).toEqual([]);
    });

    it('returns [] for an out-of-range path', () => {
      expect(childrenAt(sample(), [5])).toEqual([]);
    });

    it('counts the remaining mainline plies from a path', () => {
      expect(remainingMainline(sample(), [])).toBe(3); // e4 e5 Nf3
      expect(remainingMainline(sample(), [0])).toBe(2); // e5 Nf3
      expect(remainingMainline(sample(), [0, 1])).toBe(0); // foglia c5
    });
  });

  describe('addChild', () => {
    it('appends a child and returns its index', () => {
      const t = fromLine(['e4']);
      const first = addChild(t, [0], 'e5');
      expect(first.index).toBe(0);
      expect(childrenAt(first.tree, [0]).map((c) => c.san)).toEqual(['e5']);
      const second = addChild(first.tree, [0], 'c5');
      expect(second.index).toBe(1);
      expect(childrenAt(second.tree, [0]).map((c) => c.san)).toEqual(['e5', 'c5']);
    });

    it('does not mutate the original tree', () => {
      const t = fromLine(['e4']);
      addChild(t, [0], 'e5');
      expect(childrenAt(t, [0])).toEqual([]);
    });
  });

  describe('removeNode', () => {
    it('removes a node and its subtree', () => {
      const r = removeNode(sample(), [0, 0]); // rimuove e5 (e il suo Nf3)
      expect(childrenAt(r, [0]).map((c) => c.san)).toEqual(['c5']);
    });

    it('returns the tree unchanged for an empty path', () => {
      const t = fromLine(['e4']);
      expect(removeNode(t, [])).toBe(t);
    });
  });

  describe('promoteToMainline / isOnMainline', () => {
    it('promotes a branch so its line becomes the mainline', () => {
      const r = promoteToMainline(sample(), [0, 1]); // promuove c5
      expect(childrenAt(r, [0]).map((c) => c.san)).toEqual(['c5', 'e5']);
      expect(mainline(r)).toEqual(['e4', 'c5']);
    });

    it('is a no-op for an empty path', () => {
      const t = fromLine(['e4', 'e5']);
      expect(promoteToMainline(t, [])).toBe(t);
    });

    it('recognises mainline paths', () => {
      expect(isOnMainline([])).toBe(true);
      expect(isOnMainline([0, 0, 0])).toBe(true);
      expect(isOnMainline([0, 1])).toBe(false);
    });
  });

  describe('lineSans / pathsEqual', () => {
    it('lists the SANs along a path', () => {
      expect(lineSans(sample(), [0, 1])).toEqual(['e4', 'c5']);
      expect(lineSans(sample(), [])).toEqual([]);
    });

    it('compares paths', () => {
      expect(pathsEqual([0, 1], [0, 1])).toBe(true);
      expect(pathsEqual([0], [0, 0])).toBe(false);
    });
  });

  describe('fenAt', () => {
    it('computes the FEN after following a path', () => {
      const fen = fenAt(START, fromLine(['e4', 'e5']), [0, 0]);
      expect(fen.startsWith('rnbqkbnr/pppp1ppp')).toBe(true);
      expect(fen.split(' ')[1]).toBe('w'); // dopo 1.e4 e5 muove il Bianco
    });

    it('falls back to the standard start when startingFen is empty', () => {
      const fen = fenAt('', fromLine(['e4']), [0]);
      expect(fen.split(' ')[1]).toBe('b'); // dopo 1.e4 muove il Nero
    });
  });

  describe('buildTokens', () => {
    it('linearises the tree with the variation in parentheses', () => {
      const tokens = buildTokens(sample());
      const sans = tokens.filter((t) => t.kind === 'move').map((t) => t.san);
      expect(sans).toEqual(expect.arrayContaining(['e4', 'e5', 'Nf3', 'c5']));
      expect(tokens.some((t) => t.kind === 'open')).toBe(true);
      expect(tokens.some((t) => t.kind === 'close')).toBe(true);
    });
  });
});
