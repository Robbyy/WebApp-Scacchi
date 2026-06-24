import { Chess } from 'chess.js';
import { MoveNode } from './variant.model';

/** Token per il rendering PGN dell'albero (mainline + varianti tra parentesi). */
export interface MoveToken {
  kind: 'move' | 'open' | 'close';
  san?: string;
  label?: string;
  path?: number[];
  variation?: boolean;
}

/** Albero lineare (senza rami) da una lista di mosse SAN. */
export function fromLine(moves: string[]): MoveNode[] {
  if (!moves.length) {
    return [];
  }
  let node: MoveNode | null = null;
  for (let i = moves.length - 1; i >= 0; i--) {
    node = { san: moves[i], children: node ? [node] : [] };
  }
  return node ? [node] : [];
}

/** Linea principale (SAN): primo figlio a ogni livello. */
export function mainline(tree: MoveNode[]): string[] {
  const line: string[] = [];
  let level = tree;
  while (level.length > 0) {
    line.push(level[0].san);
    level = level[0].children;
  }
  return line;
}

export function pathsEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

/** Figli del nodo identificato dal percorso (radice se percorso vuoto). */
export function childrenAt(tree: MoveNode[], path: number[]): MoveNode[] {
  let nodes = tree;
  for (const idx of path) {
    const node = nodes[idx];
    if (!node) {
      return [];
    }
    nodes = node.children;
  }
  return nodes;
}

/** FEN della posizione raggiunta seguendo il percorso dall'inizio. */
export function fenAt(startingFen: string | undefined, tree: MoveNode[], path: number[]): string {
  const chess = startingFen ? new Chess(startingFen) : new Chess();
  let nodes = tree;
  for (const idx of path) {
    const node = nodes[idx];
    if (!node) {
      break;
    }
    try {
      chess.move(node.san);
    } catch {
      break;
    }
    nodes = node.children;
  }
  return chess.fen();
}

function updateChildrenAt(
  tree: MoveNode[],
  path: number[],
  fn: (children: MoveNode[]) => MoveNode[],
): MoveNode[] {
  if (path.length === 0) {
    return fn(tree);
  }
  const [head, ...rest] = path;
  return tree.map((node, i) =>
    i === head ? { ...node, children: updateChildrenAt(node.children, rest, fn) } : node,
  );
}

/** Aggiunge un figlio (mossa SAN) al nodo in `path`; ritorna il nuovo albero e l'indice. */
export function addChild(
  tree: MoveNode[],
  path: number[],
  san: string,
): { tree: MoveNode[]; index: number } {
  const index = childrenAt(tree, path).length;
  const next = updateChildrenAt(tree, path, (kids) => [...kids, { san, children: [] }]);
  return { tree: next, index };
}

/** Rimuove il nodo in `path` (e il suo sottoalbero). */
export function removeNode(tree: MoveNode[], path: number[]): MoveNode[] {
  if (path.length === 0) {
    return tree;
  }
  const parent = path.slice(0, -1);
  const idx = path[path.length - 1];
  return updateChildrenAt(tree, parent, (kids) => kids.filter((_, i) => i !== idx));
}

/** Linearizza l'albero in token PGN (mainline + varianti tra parentesi). */
export function buildTokens(tree: MoveNode[]): MoveToken[] {
  const tokens: MoveToken[] = [];

  const label = (ply: number, force: boolean): string => {
    if (ply % 2 === 0) {
      return `${Math.floor(ply / 2) + 1}.`;
    }
    return force ? `${Math.floor(ply / 2) + 1}…` : '';
  };

  const emitMove = (node: MoveNode, ply: number, path: number[], depth: number, force: boolean) => {
    tokens.push({ kind: 'move', san: node.san, label: label(ply, force), path, variation: depth > 0 });
  };

  const renderContinuation = (
    nodes: MoveNode[],
    ply: number,
    prefix: number[],
    depth: number,
  ): void => {
    if (nodes.length === 0) {
      return;
    }
    const first = nodes[0];
    const firstPath = [...prefix, 0];
    emitMove(first, ply, firstPath, depth, false);
    for (let k = 1; k < nodes.length; k++) {
      tokens.push({ kind: 'open', variation: true });
      renderLineFrom(nodes[k], ply, [...prefix, k], depth + 1);
      tokens.push({ kind: 'close', variation: true });
    }
    renderContinuation(first.children, ply + 1, firstPath, depth);
  };

  const renderLineFrom = (node: MoveNode, ply: number, path: number[], depth: number): void => {
    emitMove(node, ply, path, depth, true);
    renderContinuation(node.children, ply + 1, path, depth);
  };

  renderContinuation(tree, 0, [], 0);
  return tokens;
}
