import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Chess } from 'chess.js';
import { Chessboard, MoveMade } from '../chessboard/chessboard';
import { VariantService } from '../core/variant.service';
import { Variant } from '../core/variant.model';

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
  protected readonly index = signal(0);
  protected readonly mistakes = signal(0);
  protected readonly wrongMove = signal<string | null>(null);
  protected readonly showHint = signal(false);
  protected readonly boardFen = signal('');

  /** Ritardo (ms) prima della replica avversaria; 0 nei test. */
  replyDelayMs = 450;

  private game = new Chess();
  private opponentTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly userColor = computed<'w' | 'b'>(() =>
    this.variant()?.color === 'BLACK' ? 'b' : 'w',
  );
  protected readonly orientation = computed<'white' | 'black'>(() =>
    this.userColor() === 'b' ? 'black' : 'white',
  );
  protected readonly total = computed(() => this.variant()?.moves.length ?? 0);
  protected readonly progressPct = computed(() =>
    this.total() === 0 ? 0 : Math.round((this.index() / this.total()) * 100),
  );
  /** Scacchiera interattiva solo quando tocca all'utente. */
  protected readonly canPlay = computed(
    () => this.status() === 'playing' || this.status() === 'wrong',
  );
  /** Mossa attesa adesso (per il suggerimento). */
  protected readonly expectedMove = computed(() => {
    const v = this.variant();
    return v && this.index() < v.moves.length ? v.moves[this.index()] : null;
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

  /** Avvia/riavvia la sessione di allenamento. */
  protected start(): void {
    const v = this.variant();
    if (!v) {
      return;
    }
    this.clearTimer();
    this.game = v.startingFen ? new Chess(v.startingFen) : new Chess();
    this.index.set(0);
    this.mistakes.set(0);
    this.wrongMove.set(null);
    this.showHint.set(false);

    // gioca le eventuali mosse iniziali dell'avversario (es. variante nera: 1.e4)
    while (this.index() < v.moves.length && this.game.turn() !== this.userColor()) {
      this.game.move(v.moves[this.index()]);
      this.index.update((i) => i + 1);
    }
    this.boardFen.set(this.game.fen());
    this.status.set(this.index() >= v.moves.length ? 'completed' : 'playing');
  }

  protected onUserMove(move: MoveMade): void {
    const v = this.variant();
    if (!v || !this.canPlay()) {
      return;
    }
    const expected = v.moves[this.index()];
    if (!sameMove(move.san, expected)) {
      this.wrongMove.set(move.san);
      this.mistakes.update((m) => m + 1);
      this.status.set('wrong');
      return;
    }

    // mossa corretta dell'utente
    this.game.move(expected);
    this.index.update((i) => i + 1);
    this.wrongMove.set(null);
    this.showHint.set(false);
    this.boardFen.set(this.game.fen());

    if (this.index() >= v.moves.length) {
      this.status.set('completed');
      return;
    }
    // replica avversaria
    this.status.set('opponent');
    this.opponentTimer = setTimeout(() => this.applyOpponentReply(), this.replyDelayMs);
  }

  /** Applica la mossa dell'avversario e ridà il turno all'utente. */
  protected applyOpponentReply(): void {
    const v = this.variant();
    if (!v || this.index() >= v.moves.length) {
      return;
    }
    this.game.move(v.moves[this.index()]);
    this.index.update((i) => i + 1);
    this.boardFen.set(this.game.fen());
    this.status.set(this.index() >= v.moves.length ? 'completed' : 'playing');
  }

  protected revealHint(): void {
    this.showHint.set(true);
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
