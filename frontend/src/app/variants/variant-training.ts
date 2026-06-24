import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Chessboard, MoveMade } from '../chessboard/chessboard';
import { VariantService } from '../core/variant.service';
import { MoveNode, Variant } from '../core/variant.model';
import { childrenAt, fenAt, fromLine, remainingMainline } from '../core/move-tree';

type TrainingStatus = 'loading' | 'playing' | 'opponent' | 'wrong' | 'completed' | 'error';

@Component({
  selector: 'app-variant-training',
  imports: [RouterLink, Chessboard],
  templateUrl: './variant-training.html',
  styleUrl: './variant-training.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantTraining implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(VariantService);

  protected readonly variant = signal<Variant | null>(null);
  protected readonly status = signal<TrainingStatus>('loading');
  protected readonly currentPath = signal<number[]>([]);
  protected readonly mistakes = signal(0);
  protected readonly wrongMove = signal<string | null>(null);
  protected readonly showHint = signal(false);

  /** Ritardo (ms) prima della replica avversaria; 0 nei test. */
  replyDelayMs = 450;

  private opponentTimer: ReturnType<typeof setInterval> | null = null;

  protected readonly tree = computed<MoveNode[]>(() => {
    const v = this.variant();
    if (!v) {
      return [];
    }
    return v.tree && v.tree.length ? v.tree : fromLine(v.moves);
  });

  private startingFen(): string {
    return this.variant()?.startingFen ?? '';
  }

  protected readonly boardFen = computed(() =>
    fenAt(this.startingFen(), this.tree(), this.currentPath()),
  );
  protected readonly userColor = computed<'w' | 'b'>(() =>
    this.variant()?.color === 'BLACK' ? 'b' : 'w',
  );
  protected readonly orientation = computed<'white' | 'black'>(() =>
    this.userColor() === 'b' ? 'black' : 'white',
  );
  protected readonly currentChildren = computed<MoveNode[]>(() =>
    childrenAt(this.tree(), this.currentPath()),
  );
  /** Mosse accettabili adesso (più di una se c'è un bivio dal lato dell'utente). */
  protected readonly expectedMoves = computed(() => this.currentChildren().map((c) => c.san));
  protected readonly canPlay = computed(
    () => this.status() === 'playing' || this.status() === 'wrong',
  );
  protected readonly ply = computed(() => this.currentPath().length);
  protected readonly progressPct = computed(() => {
    const done = this.currentPath().length;
    const total = done + remainingMainline(this.tree(), this.currentPath());
    return total > 0 ? Math.round((done / total) * 100) : 0;
  });

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.service.getVariant(id).subscribe({
      next: (v) => {
        this.variant.set(v);
        this.start();
      },
      error: () => this.status.set('error'),
    });
  }

  protected start(): void {
    if (!this.variant()) {
      return;
    }
    this.clearTimer();
    this.mistakes.set(0);
    this.wrongMove.set(null);
    this.showHint.set(false);

    // gioca le eventuali mosse iniziali dell'avversario (es. variante nera: 1.e4)
    const tree = this.tree();
    let path: number[] = [];
    while (true) {
      const kids = childrenAt(tree, path);
      if (kids.length === 0) {
        break;
      }
      const turn = fenAt(this.startingFen(), tree, path).split(' ')[1];
      if (turn === this.userColor()) {
        break;
      }
      path = [...path, this.pickChild(kids)];
    }
    this.currentPath.set(path);
    this.status.set(childrenAt(tree, path).length === 0 ? 'completed' : 'playing');
  }

  protected onUserMove(move: MoveMade): void {
    if (!this.canPlay()) {
      return;
    }
    const kids = this.currentChildren();
    const idx = kids.findIndex((c) => sameMove(c.san, move.san));
    if (idx < 0) {
      this.wrongMove.set(move.san);
      this.mistakes.update((m) => m + 1);
      this.status.set('wrong');
      return;
    }

    const path = [...this.currentPath(), idx];
    this.currentPath.set(path);
    this.wrongMove.set(null);
    this.showHint.set(false);

    if (childrenAt(this.tree(), path).length === 0) {
      this.status.set('completed');
      return;
    }
    this.status.set('opponent');
    this.opponentTimer = setTimeout(() => this.applyOpponentReply(), this.replyDelayMs);
  }

  /** L'avversario sceglie una delle sue varianti e ridà il turno all'utente. */
  protected applyOpponentReply(): void {
    const kids = this.currentChildren();
    if (kids.length === 0) {
      this.status.set('completed');
      return;
    }
    const path = [...this.currentPath(), this.pickChild(kids)];
    this.currentPath.set(path);
    this.status.set(childrenAt(this.tree(), path).length === 0 ? 'completed' : 'playing');
  }

  protected revealHint(): void {
    this.showHint.set(true);
  }

  /** Scelta del ramo avversario (sovrascrivibile nei test); default: casuale. */
  protected pickChild(children: MoveNode[]): number {
    return Math.floor(Math.random() * children.length);
  }

  private clearTimer(): void {
    if (this.opponentTimer) {
      clearTimeout(this.opponentTimer);
      this.opponentTimer = null;
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }
}

/** Confronta due mosse SAN ignorando simboli di scacco/matto e annotazioni. */
function sameMove(a: string, b: string): boolean {
  const normalize = (s: string) => s.replace(/[+#!?]/g, '');
  return normalize(a) === normalize(b);
}
