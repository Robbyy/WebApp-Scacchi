import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Chess } from 'chess.js';
import { Chessboard, MoveMade } from '../chessboard/chessboard';
import { VariantService } from '../core/variant.service';
import { CreateVariantRequest, VariantColor } from '../core/variant.model';

interface MoveRow {
  number: number;
  white?: string;
  black?: string;
}

@Component({
  selector: 'app-variant-editor',
  imports: [FormsModule, RouterLink, Chessboard],
  templateUrl: './variant-editor.html',
  styleUrl: './variant-editor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantEditor {
  private readonly service = inject(VariantService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly name = signal('');
  protected readonly color = signal<VariantColor>('WHITE');
  protected readonly moves = signal<string[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);

  /** Id della variante in modifica; null in creazione. */
  protected readonly editId = signal<number | null>(null);
  protected readonly isEdit = computed(() => this.editId() !== null);

  private game = new Chess();
  protected readonly fen = signal(this.game.fen());

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = Number(idParam);
      this.editId.set(id);
      this.service.getVariant(id).subscribe({
        next: (v) => {
          const game = v.startingFen ? new Chess(v.startingFen) : new Chess();
          for (const san of v.moves) {
            try {
              game.move(san);
            } catch {
              break;
            }
          }
          this.game = game;
          this.moves.set([...v.moves]);
          this.fen.set(game.fen());
          this.name.set(v.name);
          this.color.set(v.color);
        },
        error: () => this.error.set('Variante non trovata.'),
      });
    }
  }

  protected readonly orientation = computed<'white' | 'black'>(() =>
    this.color() === 'BLACK' ? 'black' : 'white',
  );
  protected readonly turn = computed<'w' | 'b'>(() => {
    this.fen();
    return this.game.turn();
  });
  protected readonly rows = computed<MoveRow[]>(() => {
    const m = this.moves();
    const rows: MoveRow[] = [];
    for (let i = 0; i < m.length; i += 2) {
      rows.push({ number: i / 2 + 1, white: m[i], black: m[i + 1] });
    }
    return rows;
  });

  /** Mossa legale giocata sulla scacchiera: la accoda alla linea in costruzione. */
  protected onMove(move: MoveMade): void {
    this.game.move(move.san);
    this.moves.update((list) => [...list, move.san]);
    this.fen.set(this.game.fen());
  }

  protected undo(): void {
    if (this.moves().length === 0) {
      return;
    }
    this.game.undo();
    this.moves.update((list) => list.slice(0, -1));
    this.fen.set(this.game.fen());
  }

  protected reset(): void {
    this.game.reset();
    this.moves.set([]);
    this.fen.set(this.game.fen());
  }

  protected save(): void {
    const name = this.name().trim();
    if (!name) {
      this.error.set('Inserisci un nome per la variante.');
      return;
    }
    if (this.moves().length === 0) {
      this.error.set('Gioca almeno una mossa sulla scacchiera.');
      return;
    }
    this.error.set(null);
    this.saving.set(true);
    const request: CreateVariantRequest = {
      name,
      color: this.color(),
      moves: this.moves(),
    };
    const id = this.editId();
    const save$ = id !== null
      ? this.service.updateVariant(id, request)
      : this.service.createVariant(request);
    save$.subscribe({
      next: (saved) => this.router.navigate(['/variants', saved.id]),
      error: () => {
        this.error.set('Salvataggio non riuscito.');
        this.saving.set(false);
      },
    });
  }
}
