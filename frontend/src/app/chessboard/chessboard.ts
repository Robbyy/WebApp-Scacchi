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
  glyph: string;
  selected: boolean;
  legalTarget: boolean;
  rankLabel: string | null;
  fileLabel: string | null;
}

const GLYPHS: Record<string, string> = {
  k: '♚',
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
  p: '♟',
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

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
    const result: BoardSquare[] = [];

    // rank 8 (indice 0) in alto, file a..h da sinistra: orientamento bianco.
    for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
      const rankNumber = 8 - rankIdx;
      for (let fileIdx = 0; fileIdx < 8; fileIdx++) {
        const cell = board[rankIdx][fileIdx];
        const square = `${FILES[fileIdx]}${rankNumber}`;
        result.push({
          square,
          dark: (rankIdx + fileIdx) % 2 === 1,
          piece: cell ? { type: cell.type, color: cell.color } : null,
          glyph: cell ? GLYPHS[cell.type] : '',
          selected: sel === square,
          legalTarget: targets.has(square),
          rankLabel: fileIdx === 0 ? String(rankNumber) : null,
          fileLabel: rankIdx === 7 ? FILES[fileIdx] : null,
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
