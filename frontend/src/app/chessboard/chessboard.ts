import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { Chess, type Square as ChessSquare } from 'chess.js';

/** Evento emesso a ogni mossa legale completata sulla scacchiera. */
export interface MoveMade {
  san: string;
  from: string;
  to: string;
  fen: string;
}

interface BoardSquare {
  square: string;
  dark: boolean;
  piece: { type: string; color: 'w' | 'b' } | null;
  pieceSrc: string | null;
  pieceAlt: string;
  selected: boolean;
  legalTarget: boolean;
  rankLabel: string | null;
  fileLabel: string | null;
}

/** Codice file del set di pezzi (cburnett Staunton): es. pedone bianco = wP. */
const TYPE_CODE: Record<string, string> = {
  k: 'K',
  q: 'Q',
  r: 'R',
  b: 'B',
  n: 'N',
  p: 'P',
};

const TYPE_NAME: Record<string, string> = {
  k: 're',
  q: 'donna',
  r: 'torre',
  b: 'alfiere',
  n: 'cavallo',
  p: 'pedone',
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

function pieceSrc(color: 'w' | 'b', type: string): string {
  return `/pieces/${color}${TYPE_CODE[type]}.svg`;
}

function pieceAlt(color: 'w' | 'b', type: string): string {
  return `${color === 'w' ? 'bianco' : 'nero'} ${TYPE_NAME[type]}`;
}

/**
 * Scacchiera renderizzata (Prototipo 1). Il rendering è custom (CSS grid +
 * glifi), mentre la legalità delle mosse, il SAN e la FEN sono delegati a
 * chess.js. Vedi decisione 0001 in decisioni-tecniche.md.
 */
@Component({
  selector: 'app-chessboard',
  templateUrl: './chessboard.html',
  styleUrl: './chessboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Chessboard {
  /** Posizione iniziale come FEN; vuoto = posizione di partenza standard. */
  readonly position = input<string>('');
  /** Se false la scacchiera è di sola visualizzazione (nessuna mossa). */
  readonly interactive = input<boolean>(true);
  /** Orientamento: 'white' = bianco in basso, 'black' = nero in basso. */
  readonly orientation = input<'white' | 'black'>('white');
  /** Emesso a ogni mossa legale. */
  readonly moveMade = output<MoveMade>();

  private readonly chess = new Chess();
  private readonly fen = signal<string>(this.chess.fen());
  private readonly selected = signal<string | null>(null);

  constructor() {
    effect(() => {
      const pos = this.position();
      if (!pos) {
        return;
      }
      try {
        this.chess.load(pos);
        this.selected.set(null);
        this.fen.set(this.chess.fen());
      } catch {
        // FEN non valida: si ignora, la posizione corrente resta invariata.
      }
    });
  }

  private readonly legalTargets = computed<Set<string>>(() => {
    this.fen();
    const sel = this.selected();
    if (!sel) {
      return new Set<string>();
    }
    const moves = this.chess.moves({ square: sel as ChessSquare, verbose: true });
    return new Set(moves.map((m) => m.to));
  });

  protected readonly squares = computed<BoardSquare[]>(() => {
    this.fen();
    const sel = this.selected();
    const targets = this.legalTargets();
    const board = this.chess.board();
    const flip = this.orientation() === 'black';
    const result: BoardSquare[] = [];

    // vr/vf = riga/colonna visiva (0 in alto a sinistra). Con orientamento nero
    // si invertono gli indici reali della scacchiera. board[rankIdx][fileIdx]:
    // rankIdx 0 = traversa 8, fileIdx 0 = colonna a.
    for (let vr = 0; vr < 8; vr++) {
      for (let vf = 0; vf < 8; vf++) {
        const rankIdx = flip ? 7 - vr : vr;
        const fileIdx = flip ? 7 - vf : vf;
        const rankNumber = 8 - rankIdx;
        const cell = board[rankIdx][fileIdx];
        const square = `${FILES[fileIdx]}${rankNumber}`;
        result.push({
          square,
          dark: (rankIdx + fileIdx) % 2 === 1,
          piece: cell ? { type: cell.type, color: cell.color } : null,
          pieceSrc: cell ? pieceSrc(cell.color, cell.type) : null,
          pieceAlt: cell ? pieceAlt(cell.color, cell.type) : '',
          selected: sel === square,
          legalTarget: targets.has(square),
          rankLabel: vf === 0 ? String(rankNumber) : null,
          fileLabel: vr === 7 ? FILES[fileIdx] : null,
        });
      }
    }
    return result;
  });

  /** Lato che deve muovere: 'w' o 'b'. */
  protected readonly turn = computed<'w' | 'b'>(() => {
    this.fen();
    return this.chess.turn();
  });

  protected onSquareClick(square: string): void {
    if (!this.interactive()) {
      return;
    }
    const sel = this.selected();

    if (sel === null) {
      this.selectIfOwnPiece(square);
      return;
    }
    if (sel === square) {
      this.selected.set(null);
      return;
    }

    try {
      const move = this.chess.move({ from: sel, to: square, promotion: 'q' });
      this.selected.set(null);
      this.fen.set(this.chess.fen());
      this.moveMade.emit({
        san: move.san,
        from: move.from,
        to: move.to,
        fen: this.chess.fen(),
      });
    } catch {
      // Mossa illegale: se ho cliccato un mio pezzo cambio selezione, altrimenti annullo.
      this.selectIfOwnPiece(square);
    }
  }

  private selectIfOwnPiece(square: string): void {
    const piece = this.chess.get(square as ChessSquare);
    this.selected.set(piece && piece.color === this.chess.turn() ? square : null);
  }

  /** API pubblica minima: FEN corrente. */
  currentFen(): string {
    return this.fen();
  }

  /** API pubblica minima: ripristina la posizione iniziale. */
  reset(): void {
    this.chess.reset();
    this.selected.set(null);
    this.fen.set(this.chess.fen());
  }
}
