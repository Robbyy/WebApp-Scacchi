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
  /**
   * Modalità controllata: dopo una mossa la scacchiera emette l'evento ma annulla
   * internamente la mossa, lasciando al componente genitore il controllo della
   * posizione autoritativa tramite l'input `position`. Usata nel training, dove
   * la mossa va accettata/rifiutata e seguita dall'eventuale replica avversaria.
   */
  readonly controlled = input<boolean>(false);
  /** Orientamento: 'white' = bianco in basso, 'black' = nero in basso. */
  readonly orientation = input<'white' | 'black'>('white');
  /** Emesso a ogni mossa legale. */
  readonly moveMade = output<MoveMade>();

  private readonly chess = new Chess();
  private readonly fen = signal<string>(this.chess.fen());
  private readonly selected = signal<string | null>(null);
  /** Promozione in attesa di scelta del pezzo (from/to + colore che promuove). */
  protected readonly pendingPromotion = signal<{ from: string; to: string; color: 'w' | 'b' } | null>(
    null,
  );

  /** Pezzi selezionabili per la promozione. */
  protected readonly promoPieces = [
    { code: 'q', label: 'Donna' },
    { code: 'r', label: 'Torre' },
    { code: 'b', label: 'Alfiere' },
    { code: 'n', label: 'Cavallo' },
  ] as const;

  constructor() {
    effect(() => {
      const pos = this.position();
      if (!pos) {
        return;
      }
      try {
        this.chess.load(pos);
        this.selected.set(null);
        this.pendingPromotion.set(null);
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
    if (!this.interactive() || this.pendingPromotion()) {
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

    // Mossa di promozione: chiedi quale pezzo prima di applicare.
    if (this.isPromotion(sel, square)) {
      this.pendingPromotion.set({ from: sel, to: square, color: this.chess.turn() });
      this.selected.set(null);
      return;
    }

    this.applyMove(sel, square, 'q');
  }

  /** Conferma la promozione con il pezzo scelto. */
  protected choosePromotion(piece: 'q' | 'r' | 'b' | 'n'): void {
    const promo = this.pendingPromotion();
    if (!promo) {
      return;
    }
    this.pendingPromotion.set(null);
    this.applyMove(promo.from, promo.to, piece);
  }

  /** Annulla la promozione in corso. */
  protected cancelPromotion(): void {
    this.pendingPromotion.set(null);
    this.selected.set(null);
  }

  /** URL dell'asset del pezzo per il selettore di promozione. */
  protected promoSrc(code: string): string {
    const promo = this.pendingPromotion();
    return promo ? `/pieces/${promo.color}${code.toUpperCase()}.svg` : '';
  }

  private isPromotion(from: string, to: string): boolean {
    return this.chess
      .moves({ square: from as ChessSquare, verbose: true })
      .some((m) => m.to === to && m.promotion);
  }

  private applyMove(from: string, to: string, promotion: 'q' | 'r' | 'b' | 'n'): void {
    try {
      const move = this.chess.move({ from, to, promotion });
      const fenAfterMove = this.chess.fen();
      this.selected.set(null);
      if (this.controlled()) {
        // ripristina la posizione: la decide il genitore tramite `position`.
        this.chess.undo();
      }
      this.fen.set(this.chess.fen());
      this.moveMade.emit({
        san: move.san,
        from: move.from,
        to: move.to,
        fen: fenAfterMove,
      });
    } catch {
      // Mossa illegale: se ho cliccato un mio pezzo cambio selezione, altrimenti annullo.
      this.selectIfOwnPiece(to);
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
