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
import { StockfishService } from '../core/stockfish.service';

type PlayStatus = 'your-turn' | 'engine' | 'over' | 'invalid';

/**
 * "Gioca contro il computer" (Prototipo 16). Pagina autonoma aperta in una nuova
 * tab con la FEN corrente (`/play?fen=...`): l'utente gioca il lato al tratto, il
 * motore Stockfish risponde. Stato passato via URL, nessuno stato condiviso fra tab.
 */
@Component({
  selector: 'app-play',
  imports: [Chessboard, RouterLink],
  templateUrl: './play.html',
  styleUrl: './play.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayVsComputer implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly engine = inject(StockfishService);

  private chess = new Chess();
  private initialFen = '';
  private userColor: 'w' | 'b' = 'w';

  protected readonly fen = signal('');
  protected readonly status = signal<PlayStatus>('your-turn');
  protected readonly resultText = signal('');
  protected readonly engineUnavailable = computed(() => !this.engine.available());

  protected readonly orientation = computed<'white' | 'black'>(() =>
    this.userColor === 'b' ? 'black' : 'white',
  );
  protected readonly interactive = computed(() => this.status() === 'your-turn');

  constructor() {
    const fenParam = this.route.snapshot.queryParamMap.get('fen');
    try {
      this.chess = fenParam ? new Chess(fenParam) : new Chess();
    } catch {
      this.status.set('invalid');
      return;
    }
    this.initialFen = this.chess.fen();
    this.userColor = this.chess.turn();
    this.fen.set(this.chess.fen());
    this.evaluateGameState();
  }

  protected onUserMove(move: MoveMade): void {
    if (this.status() !== 'your-turn') {
      return;
    }
    try {
      this.chess.move(move.san);
    } catch {
      return;
    }
    this.fen.set(this.chess.fen());
    if (this.evaluateGameState()) {
      return;
    }
    this.playEngineMove();
  }

  protected restart(): void {
    try {
      this.chess = new Chess(this.initialFen);
    } catch {
      this.chess = new Chess();
    }
    this.fen.set(this.chess.fen());
    this.resultText.set('');
    if (!this.evaluateGameState()) {
      // Se l'avversario muove per primo (l'utente gioca il Nero da questa FEN).
      if (this.chess.turn() !== this.userColor) {
        this.playEngineMove();
      }
    }
  }

  private playEngineMove(): void {
    this.status.set('engine');
    this.engine.requestBestMove(this.chess.fen(), 800, (uci) => {
      if (!uci) {
        this.evaluateGameState();
        return;
      }
      try {
        this.chess.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci.length > 4 ? uci[4] : undefined,
        });
      } catch {
        // mossa inattesa dal motore: lascia il turno all'utente
        this.status.set('your-turn');
        return;
      }
      this.fen.set(this.chess.fen());
      this.evaluateGameState();
    });
  }

  /** Aggiorna lo stato; ritorna true se la partita è finita. */
  private evaluateGameState(): boolean {
    if (this.chess.isCheckmate()) {
      const winner = this.chess.turn() === 'w' ? 'Nero' : 'Bianco';
      this.resultText.set(`Scacco matto — vince il ${winner}.`);
      this.status.set('over');
      return true;
    }
    if (this.chess.isDraw() || this.chess.isStalemate() || this.chess.isInsufficientMaterial()) {
      this.resultText.set('Patta.');
      this.status.set('over');
      return true;
    }
    this.status.set(this.chess.turn() === this.userColor ? 'your-turn' : 'engine');
    return false;
  }

  ngOnDestroy(): void {
    this.engine.dispose();
  }
}
