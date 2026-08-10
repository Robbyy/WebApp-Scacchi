import {
  addChild,
  buildTokens,
  childrenAt,
  fenAt,
  fromLine,
  isOnMainline,
  lineSans,
  mainline,
  nodeAt,
  pathsEqual,
  promoteToMainline,
  remainingMainline,
  removeNode,
  setAnnotation,
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

/** Stesso albero, con annotazioni su e4, e5 e c5 (R24). */
function annotated(): MoveNode[] {
  return [
    {
      san: 'e4',
      comment: 'Apertura di re',
      nag: '!',
      children: [
        { san: 'e5', comment: 'Simmetrica', children: [{ san: 'Nf3', children: [] }] },
        { san: 'c5', nag: '!?', children: [] },
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

    it('carries the annotations of each move on its token (R24)', () => {
      const tokens = buildTokens(annotated()).filter((t) => t.kind === 'move');
      const e4 = tokens.find((t) => t.san === 'e4');
      expect(e4?.nag).toBe('!');
      expect(e4?.comment).toBe('Apertura di re');
      expect(tokens.find((t) => t.san === 'c5')?.nag).toBe('!?');
      expect(tokens.find((t) => t.san === 'Nf3')?.nag).toBeUndefined();
      expect(tokens.find((t) => t.san === 'Nf3')?.comment).toBeUndefined();
    });
  });

  // R24: le annotazioni sono un'estensione del nodo, non una struttura a parte.
  describe('nodeAt', () => {
    it('returns the node at a path', () => {
      expect(nodeAt(annotated(), [0, 1])?.san).toBe('c5');
      expect(nodeAt(annotated(), [0])?.comment).toBe('Apertura di re');
    });

    it('returns null for the root or an unknown path', () => {
      expect(nodeAt(sample(), [])).toBeNull();
      expect(nodeAt(sample(), [0, 9])).toBeNull();
    });
  });

  describe('setAnnotation', () => {
    it('adds a comment and a NAG to a move', () => {
      const t = setAnnotation(sample(), [0, 1], { comment: 'Siciliana', nag: '!?' });
      expect(nodeAt(t, [0, 1])?.comment).toBe('Siciliana');
      expect(nodeAt(t, [0, 1])?.nag).toBe('!?');
    });

    it('replaces the previous annotation instead of merging it', () => {
      const t = setAnnotation(annotated(), [0], { nag: '??' });
      expect(nodeAt(t, [0])?.nag).toBe('??');
      expect(nodeAt(t, [0])?.comment).toBeUndefined();
    });

    it('drops the fields when comment and NAG are cleared', () => {
      const t = setAnnotation(annotated(), [0], {});
      const node = nodeAt(t, [0])!;
      expect('comment' in node).toBe(false);
      expect('nag' in node).toBe(false);
    });

    it('trims the comment and ignores a blank one', () => {
      const t = setAnnotation(sample(), [0], { comment: '  Spazi  ' });
      expect(nodeAt(t, [0])?.comment).toBe('Spazi');
      const blank = setAnnotation(annotated(), [0], { comment: '   ' });
      expect('comment' in nodeAt(blank, [0])!).toBe(false);
    });

    it('keeps the subtree and the rest of the tree untouched', () => {
      const t = setAnnotation(annotated(), [0, 0], { nag: '!' });
      expect(mainline(t)).toEqual(['e4', 'e5', 'Nf3']);
      expect(nodeAt(t, [0, 0, 0])?.san).toBe('Nf3');
      expect(nodeAt(t, [0, 1])?.nag).toBe('!?');
      expect(nodeAt(t, [0])?.comment).toBe('Apertura di re');
    });

    it('does not mutate the original tree', () => {
      const t = annotated();
      setAnnotation(t, [0], { comment: 'Altro' });
      expect(nodeAt(t, [0])?.comment).toBe('Apertura di re');
    });

    it('is a no-op for an empty path', () => {
      const t = sample();
      expect(setAnnotation(t, [], { nag: '!' })).toBe(t);
    });
  });

  // Criterio di uscita R24: le operazioni sull'albero non perdono i metadati
  // dei nodi che restano.
  describe('metadati preservati dalle operazioni sull\'albero', () => {
    it('promoteToMainline keeps comments, NAGs and sub-variations', () => {
      const t = promoteToMainline(annotated(), [0, 1]); // promuove c5
      expect(mainline(t)).toEqual(['e4', 'c5']);
      expect(nodeAt(t, [0])?.comment).toBe('Apertura di re');
      expect(nodeAt(t, [0])?.nag).toBe('!');
      expect(nodeAt(t, [0, 0])?.nag).toBe('!?'); // c5, ora mainline
      expect(nodeAt(t, [0, 1])?.comment).toBe('Simmetrica'); // e5, ora variante
      expect(nodeAt(t, [0, 1, 0])?.san).toBe('Nf3');
    });

    it('addChild keeps the annotations of the existing nodes', () => {
      const { tree, index } = addChild(annotated(), [0, 0], 'Nc3');
      expect(index).toBe(1);
      expect(nodeAt(tree, [0])?.comment).toBe('Apertura di re');
      expect(nodeAt(tree, [0, 0])?.comment).toBe('Simmetrica');
      expect(nodeAt(tree, [0, 0, 1])?.san).toBe('Nc3');
      expect(nodeAt(tree, [0, 0, 1])?.comment).toBeUndefined();
    });

    it('removeNode keeps the annotations of the nodes left in place', () => {
      const t = removeNode(annotated(), [0, 0]); // rimuove e5 e il suo Nf3
      expect(nodeAt(t, [0])?.comment).toBe('Apertura di re');
      expect(nodeAt(t, [0])?.nag).toBe('!');
      expect(nodeAt(t, [0, 0])?.san).toBe('c5');
      expect(nodeAt(t, [0, 0])?.nag).toBe('!?');
    });
  });
});
