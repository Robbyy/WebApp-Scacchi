import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Chess } from 'chess.js';
import { Chessboard } from '../chessboard/chessboard';
import { VariantService } from '../core/variant.service';
import { MoveNode, Variant } from '../core/variant.model';

interface Token {
  kind: 'move' | 'open' | 'close';
  san?: string;
  label?: string;
  path?: number[];
  variation?: boolean;
}

@Component({
  selector: 'app-variant-detail',
  imports: [RouterLink, Chessboard],
  templateUrl: './variant-detail.html',
  styleUrl: './variant-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantDetail implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(VariantService);

  protected readonly variant = signal<Variant | null>(null);
  protected readonly error = signal<string | null>(null);
  /** Percorso (indici di figlio dalla radice) del nodo selezionato; vuoto = posizione iniziale. */
  protected readonly currentPath = signal<number[]>([]);
  protected readonly playing = signal(false);
  private timer: ReturnType<typeof setInterval> | null = null;

  protected readonly tree = computed<MoveNode[]>(() => {
    const v = this.variant();
    if (!v) {
      return [];
    }
    return v.tree && v.tree.length ? v.tree : fromLine(v.moves);
  });

  protected readonly tokens = computed<Token[]>(() => buildTokens(this.tree()));
  protected readonly mainlineLength = computed(() => mainlineLength(this.tree()));
  protected readonly orientation = computed<'white' | 'black'>(() =>
    this.variant()?.color === 'BLACK' ? 'black' : 'white',
  );

  protected readonly currentFen = computed<string>(() => {
    const v = this.variant();
    if (!v) {
      return '';
    }
    const chess = v.startingFen ? new Chess(v.startingFen) : new Chess();
    let nodes = this.tree();
    for (const idx of this.currentPath()) {
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
  });

  protected readonly atStart = computed(() => this.currentPath().length === 0);
  protected readonly atLeaf = computed(() => this.childrenAt(this.currentPath()).length === 0);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.service.getVariant(id).subscribe({
      next: (v) => this.variant.set(v),
      error: () => this.error.set('Variante non trovata.'),
    });
  }

  protected isCurrent(path: number[] | undefined): boolean {
    return !!path && pathsEqual(path, this.currentPath());
  }

  protected goTo(path: number[] | undefined): void {
    if (!path) {
      return;
    }
    this.stop();
    this.currentPath.set([...path]);
  }

  protected first(): void {
    this.stop();
    this.currentPath.set([]);
  }

  protected prev(): void {
    this.stop();
    this.currentPath.update((p) => p.slice(0, -1));
  }

  protected next(): void {
    const kids = this.childrenAt(this.currentPath());
    if (kids.length > 0) {
      this.currentPath.update((p) => [...p, 0]);
    }
  }

  protected last(): void {
    this.stop();
    let path = [...this.currentPath()];
    let kids = this.childrenAt(path);
    while (kids.length > 0) {
      path = [...path, 0];
      kids = kids[0].children;
    }
    this.currentPath.set(path);
  }

  protected togglePlay(): void {
    if (this.playing()) {
      this.stop();
      return;
    }
    if (this.childrenAt(this.currentPath()).length === 0) {
      return;
    }
    this.playing.set(true);
    this.timer = setInterval(() => {
      if (this.childrenAt(this.currentPath()).length === 0) {
        this.stop();
        return;
      }
      this.next();
    }, 900);
  }

  private stop(): void {
    this.playing.set(false);
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Figli del nodo identificato dal percorso (tree se il percorso è vuoto). */
  private childrenAt(path: number[]): MoveNode[] {
    let nodes = this.tree();
    for (const idx of path) {
      const node = nodes[idx];
      if (!node) {
        return [];
      }
      nodes = node.children;
    }
    return nodes;
  }

  @HostListener('window:keydown', ['$event'])
  protected onKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') {
      this.prev();
      event.preventDefault();
    } else if (event.key === 'ArrowRight') {
      this.next();
      event.preventDefault();
    }
  }

  ngOnDestroy(): void {
    this.stop();
  }
}

function fromLine(moves: string[]): MoveNode[] {
  if (!moves.length) {
    return [];
  }
  let node: MoveNode | null = null;
  for (let i = moves.length - 1; i >= 0; i--) {
    node = { san: moves[i], children: node ? [node] : [] };
  }
  return node ? [node] : [];
}

function mainlineLength(tree: MoveNode[]): number {
  let n = 0;
  let level = tree;
  while (level.length > 0) {
    n++;
    level = level[0].children;
  }
  return n;
}

function pathsEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

/** Linearizza l'albero in token PGN (mainline + varianti tra parentesi). */
function buildTokens(tree: MoveNode[]): Token[] {
  const tokens: Token[] = [];

  const label = (ply: number, force: boolean): string => {
    if (ply % 2 === 0) {
      return `${Math.floor(ply / 2) + 1}.`;
    }
    return force ? `${Math.floor(ply / 2) + 1}…` : '';
  };

  const emitMove = (node: MoveNode, ply: number, path: number[], depth: number, force: boolean) => {
    tokens.push({ kind: 'move', san: node.san, label: label(ply, force), path, variation: depth > 0 });
  };

  const renderContinuation = (nodes: MoveNode[], ply: number, prefix: number[], depth: number): void => {
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
