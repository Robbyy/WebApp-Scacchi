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
import { Variant } from '../core/variant.model';

interface MovePly {
  san: string;
  ply: number;
}

interface MoveRow {
  number: number;
  white?: MovePly;
  black?: MovePly;
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
  /** Indice di replay: 0 = posizione iniziale, N = dopo l'ultima mossa. */
  protected readonly index = signal(0);
  protected readonly playing = signal(false);
  private timer: ReturnType<typeof setInterval> | null = null;

  /** FEN per ogni ply: [0] iniziale, [i] dopo la mossa i-esima. */
  protected readonly fenHistory = computed<string[]>(() => {
    const v = this.variant();
    if (!v) {
      return [];
    }
    const chess = v.startingFen ? new Chess(v.startingFen) : new Chess();
    const fens = [chess.fen()];
    for (const san of v.moves) {
      try {
        chess.move(san);
        fens.push(chess.fen());
      } catch {
        break; // mossa non valida nella variante: si interrompe la ricostruzione
      }
    }
    return fens;
  });

  protected readonly totalMoves = computed(() => Math.max(0, this.fenHistory().length - 1));
  protected readonly currentFen = computed(() => this.fenHistory()[this.index()] ?? '');
  protected readonly orientation = computed<'white' | 'black'>(() =>
    this.variant()?.color === 'BLACK' ? 'black' : 'white',
  );

  protected readonly rows = computed<MoveRow[]>(() => {
    const v = this.variant();
    if (!v) {
      return [];
    }
    const rows: MoveRow[] = [];
    for (let i = 0; i < v.moves.length; i += 2) {
      rows.push({
        number: i / 2 + 1,
        white: { san: v.moves[i], ply: i + 1 },
        black: v.moves[i + 1] ? { san: v.moves[i + 1], ply: i + 2 } : undefined,
      });
    }
    return rows;
  });

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.service.getVariant(id).subscribe({
      next: (v) => this.variant.set(v),
      error: () => this.error.set('Variante non trovata.'),
    });
  }

  protected first(): void {
    this.stop();
    this.index.set(0);
  }

  protected prev(): void {
    this.stop();
    this.index.update((i) => Math.max(0, i - 1));
  }

  protected next(): void {
    this.index.update((i) => Math.min(this.totalMoves(), i + 1));
  }

  protected last(): void {
    this.stop();
    this.index.set(this.totalMoves());
  }

  protected reset(): void {
    this.stop();
    this.index.set(0);
  }

  protected goToPly(ply: number): void {
    this.stop();
    this.index.set(ply);
  }

  protected togglePlay(): void {
    if (this.playing()) {
      this.stop();
      return;
    }
    if (this.index() >= this.totalMoves()) {
      this.index.set(0);
    }
    this.playing.set(true);
    this.timer = setInterval(() => {
      if (this.index() >= this.totalMoves()) {
        this.stop();
        return;
      }
      this.index.update((i) => i + 1);
    }, 900);
  }

  private stop(): void {
    this.playing.set(false);
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
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
