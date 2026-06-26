import { parsePgnTree } from './pgn';
import { mainline } from './move-tree';

/** Helper: estrae il valore o fallisce il test con il messaggio d'errore. */
function ok(pgn: string) {
  const r = parsePgnTree(pgn);
  if (!r.ok) {
    throw new Error(`parsing fallito: ${r.error}`);
  }
  return r.value;
}

describe('parsePgnTree', () => {
  it('parses a simple mainline', () => {
    const v = ok('1. e4 e5 2. Nf3 Nc6');
    expect(v.mainline).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
    expect(v.variationCount).toBe(0);
    expect(v.nodeCount).toBe(4);
  });

  it('parses a single nested variation as a sibling of the move it replaces', () => {
    // 1...c5 è alternativa a 1...e5 → entrambe figlie di e4.
    const v = ok('1. e4 e5 (1... c5 2. Nf3) 2. Nf3 Nc6');
    expect(v.mainline).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
    const e4 = v.tree[0];
    expect(e4.san).toBe('e4');
    expect(e4.children.map((c) => c.san)).toEqual(['e5', 'c5']);
    // la variante prosegue con Nf3
    expect(e4.children[1].children[0].san).toBe('Nf3');
    expect(v.variationCount).toBe(1);
  });

  it('handles multiple variations at the same point', () => {
    const v = ok('1. e4 e5 (1... c5) (1... e6) 2. Nf3');
    const e4 = v.tree[0];
    expect(e4.children.map((c) => c.san)).toEqual(['e5', 'c5', 'e6']);
    expect(v.variationCount).toBe(2);
  });

  it('handles deeply nested variations', () => {
    // dentro la variante c5, e6 è alternativa a Nf3
    const v = ok('1. e4 e5 (1... c5 2. Nf3 (2. c3)) 2. Bc4');
    const e4 = v.tree[0];
    const c5 = e4.children[1];
    expect(c5.san).toBe('c5');
    expect(c5.children.map((c) => c.san)).toEqual(['Nf3', 'c3']);
  });

  it('ignores comments and NAGs', () => {
    const v = ok('1. e4 {ottima} e5 $1 2. Nf3 ; commento di riga\n Nc6');
    expect(v.mainline).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
  });

  it('ignores headers and the result', () => {
    const v = ok('[Event "Test"]\n[White "A"]\n\n1. e4 e5 2. Nf3 1-0');
    expect(v.mainline).toEqual(['e4', 'e5', 'Nf3']);
  });

  it('normalizes castling written with zeros and strips check glyphs', () => {
    const v = ok('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7');
    expect(v.mainline).toContain('O-O');
  });

  it('rejects an illegal move', () => {
    const r = parsePgnTree('1. e4 e4');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain('e4');
    }
  });

  it('rejects unbalanced parentheses', () => {
    const r = parsePgnTree('1. e4 e5 (1... c5');
    expect(r.ok).toBe(false);
  });

  it('rejects a variation with no anchor move', () => {
    const r = parsePgnTree('(1. e4)');
    expect(r.ok).toBe(false);
  });

  it('reports empty movetext', () => {
    const r = parsePgnTree('[Event "X"]');
    expect(r.ok).toBe(false);
  });

  it('round-trips the derived mainline through move-tree', () => {
    const v = ok('1. d4 d5 (1... Nf6 2. c4) 2. c4 e6');
    expect(mainline(v.tree)).toEqual(v.mainline);
    expect(v.mainline).toEqual(['d4', 'd5', 'c4', 'e6']);
  });
});
