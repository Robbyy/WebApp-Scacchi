import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Chess } from 'chess.js';
import { VariantService } from '../core/variant.service';
import { CreateVariantRequest, VariantColor, validationMessage } from '../core/variant.model';
import { ToastService } from '../core/toast.service';

interface MoveRow {
  number: number;
  white?: string;
  black?: string;
}

type Preview =
  | { state: 'empty' }
  | { state: 'error'; message: string }
  | { state: 'ok'; moves: string[]; suggestedName: string };

@Component({
  selector: 'app-pgn-import',
  imports: [FormsModule, RouterLink],
  templateUrl: './pgn-import.html',
  styleUrl: './pgn-import.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PgnImport {
  private readonly service = inject(VariantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly pgn = signal('');
  protected readonly color = signal<VariantColor>('WHITE');
  protected readonly name = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);

  /** Risultato del parsing del PGN incollato (parsing lato client con chess.js). */
  protected readonly preview = computed<Preview>(() => {
    const text = this.pgn().trim();
    if (!text) {
      return { state: 'empty' };
    }
    try {
      const chess = new Chess();
      chess.loadPgn(text);
      const moves = chess.history();
      if (moves.length === 0) {
        return { state: 'error', message: 'Nessuna mossa trovata nel PGN.' };
      }
      return { state: 'ok', moves, suggestedName: suggestName(text) };
    } catch {
      return { state: 'error', message: 'PGN non valido: controlla il formato.' };
    }
  });

  /** Accessori "piatti" per il template (evitano l'accesso a proprietà dell'union). */
  protected readonly state = computed(() => this.preview().state);
  protected readonly suggestedName = computed(() => {
    const p = this.preview();
    return p.state === 'ok' ? p.suggestedName : '';
  });
  protected readonly errorMessage = computed(() => {
    const p = this.preview();
    return p.state === 'error' ? p.message : '';
  });

  protected readonly rows = computed<MoveRow[]>(() => {
    const p = this.preview();
    if (p.state !== 'ok') {
      return [];
    }
    const rows: MoveRow[] = [];
    for (let i = 0; i < p.moves.length; i += 2) {
      rows.push({ number: i / 2 + 1, white: p.moves[i], black: p.moves[i + 1] });
    }
    return rows;
  });

  protected save(): void {
    const p = this.preview();
    if (p.state !== 'ok') {
      this.error.set('Incolla un PGN valido prima di salvare.');
      return;
    }
    const name = this.name().trim() || p.suggestedName || 'Variante importata';
    this.error.set(null);
    this.saving.set(true);
    const request: CreateVariantRequest = {
      name,
      color: this.color(),
      moves: p.moves,
      sourcePgn: this.pgn().trim(),
    };
    this.service.createVariant(request).subscribe({
      next: (created) => {
        this.toast.success('Variante importata.');
        this.router.navigate(['/variants', created.id]);
      },
      error: (err) => {
        const msg = validationMessage(err) ?? 'Salvataggio non riuscito.';
        this.error.set(msg);
        this.toast.error(msg);
        this.saving.set(false);
      },
    });
  }
}

/** Propone un nome dalla testata PGN: "Bianco - Nero", altrimenti l'Event. */
function suggestName(pgn: string): string {
  const tag = (name: string) =>
    pgn.match(new RegExp('\\[' + name + '\\s+"([^"]*)"\\]'))?.[1]?.trim() ?? '';
  const white = tag('White');
  const black = tag('Black');
  if (white && black) {
    return `${white} - ${black}`;
  }
  return tag('Event');
}
