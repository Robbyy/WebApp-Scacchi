import { Chess } from 'chess.js';
import { MoveNode } from './variant.model';
import { addChild, mainline } from './move-tree';

/**
 * Parsing avanzato del PGN (Prototipo 13): legge il movetext con **varianti
 * annidate** `( ... )`, commenti `{ ... }`/`; ...` e NAG `$n`, e costruisce
 * l'albero {@link MoveNode}[] (mainline + sotto-varianti).
 *
 * Decisione R15: parsing lato frontend, coerente con P6. La legalità di ogni
 * mossa è verificata con `chess.js` ricostruendo la posizione per ogni ramo; il
 * SAN viene normalizzato alla forma canonica di `chess.js`.
 */
export interface PgnTree {
  tree: MoveNode[];
  mainline: string[];
  nodeCount: number;
  /** Numero di rami alternativi oltre la mainline (somma dei figli extra). */
  variationCount: number;
}

export type PgnParseResult =
  | { ok: true; value: PgnTree }
  | { ok: false; error: string };

/** Punto di ingresso: dal testo PGN all'albero, oppure un errore leggibile. */
export function parsePgnTree(pgn: string): PgnParseResult {
  const tokens = tokenize(pgn);
  if (tokens.length === 0) {
    return { ok: false, error: 'Nessuna mossa trovata nel PGN.' };
  }

  const raw = buildRawTree(tokens);
  if (!raw.ok) {
    return raw;
  }

  // Verifica legalità e normalizza il SAN ramo per ramo dalla posizione iniziale.
  const validated = validateTree(raw.tree, new Chess().fen());
  if (!validated.ok) {
    return validated;
  }

  return {
    ok: true,
    value: {
      tree: validated.tree,
      mainline: mainline(validated.tree),
      nodeCount: countNodes(validated.tree),
      variationCount: countVariations(validated.tree),
    },
  };
}

/**
 * Tokenizza il movetext: rimuove tag di testata, commenti, NAG, numeri di mossa
 * e risultati; normalizza l'arrocco con zeri; isola le parentesi di variante.
 */
function tokenize(pgn: string): string[] {
  let text = pgn;
  text = text.replace(/\[[^\]]*\]/g, ' '); // tag di testata [Key "Value"]
  text = text.replace(/\{[^}]*\}/g, ' '); // commenti tra graffe
  text = text.replace(/;[^\n]*/g, ' '); // commenti di riga
  text = text.replace(/\$\d+/g, ' '); // NAG
  text = text.replace(/0-0-0/g, 'O-O-O').replace(/0-0/g, 'O-O'); // arrocco con zeri
  text = text.replace(/\b(1-0|0-1|1\/2-1\/2)\b/g, ' ').replace(/\*/g, ' '); // risultati
  text = text.replace(/\d+\.+/g, ' '); // numeri di mossa: 1. 12. 1...
  text = text.replace(/\.\.\./g, ' '); // ellissi residue
  text = text.replace(/\(/g, ' ( ').replace(/\)/g, ' ) '); // isola le parentesi

  const tokens: string[] = [];
  for (const t of text.split(/\s+/)) {
    if (!t) {
      continue;
    }
    if (t === '(' || t === ')') {
      tokens.push(t);
      continue;
    }
    // Rimuove le annotazioni (!, ?, +, #): il SAN canonico è ricalcolato dopo.
    const cleaned = t.replace(/[!?]+$/g, '').replace(/[+#]+$/g, '');
    if (cleaned) {
      tokens.push(cleaned);
    }
  }
  return tokens;
}

/**
 * Costruisce l'albero di SAN (non ancora validati) dai token. Le parentesi
 * aprono una **variante alternativa all'ultima mossa**: si torna alla posizione
 * del padre e i suoi figli diventano fratelli. Uno stack gestisce l'annidamento.
 */
function buildRawTree(
  tokens: string[],
): { ok: true; tree: MoveNode[] } | { ok: false; error: string } {
  let tree: MoveNode[] = [];
  let path: number[] = [];
  const stack: number[][] = [];

  for (const tok of tokens) {
    if (tok === '(') {
      if (path.length === 0) {
        return { ok: false, error: 'Variante senza una mossa di riferimento.' };
      }
      stack.push(path);
      path = path.slice(0, -1); // posizione prima dell'ultima mossa
    } else if (tok === ')') {
      const restored = stack.pop();
      if (!restored) {
        return { ok: false, error: 'Parentesi di variante non bilanciate.' };
      }
      path = restored;
    } else {
      const { tree: next, index } = addChild(tree, path, tok);
      tree = next;
      path = [...path, index];
    }
  }

  if (stack.length !== 0) {
    return { ok: false, error: 'Parentesi di variante non bilanciate.' };
  }
  return { ok: true, tree };
}

/** Replay per ramo: valida la legalità e normalizza il SAN dalla `parentFen`. */
function validateTree(
  nodes: MoveNode[],
  parentFen: string,
): { ok: true; tree: MoveNode[] } | { ok: false; error: string } {
  const out: MoveNode[] = [];
  for (const node of nodes) {
    const chess = new Chess(parentFen);
    let san: string | null = null;
    try {
      san = chess.move(node.san).san;
    } catch {
      san = null;
    }
    if (!san) {
      return { ok: false, error: `Mossa non valida nel PGN: "${node.san}".` };
    }
    const child = validateTree(node.children, chess.fen());
    if (!child.ok) {
      return child;
    }
    out.push({ san, children: child.tree });
  }
  return { ok: true, tree: out };
}

function countNodes(tree: MoveNode[]): number {
  return tree.reduce((acc, n) => acc + 1 + countNodes(n.children), 0);
}

/** Rami alternativi oltre la mainline: a ogni livello conta i figli oltre il primo. */
function countVariations(tree: MoveNode[]): number {
  let count = 0;
  const walk = (nodes: MoveNode[]): void => {
    if (nodes.length > 1) {
      count += nodes.length - 1;
    }
    nodes.forEach((n) => walk(n.children));
  };
  walk(tree);
  return count;
}
