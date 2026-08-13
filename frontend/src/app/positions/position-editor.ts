import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Chess } from 'chess.js';
import { ConfirmService } from '../core/confirm.service';
import { StudyService } from '../core/study.service';
import { ToastService } from '../core/toast.service';
import { VariantService } from '../core/variant.service';
import { CreateVariantRequest, MoveNode, Variant, validationMessage } from '../core/variant.model';
import { fromLine } from '../core/move-tree';
import { CanComponentDeactivate } from '../variants/can-deactivate.guard';

type PieceCode = 'wK' | 'wQ' | 'wR' | 'wB' | 'wN' | 'wP' | 'bK' | 'bQ' | 'bR' | 'bB' | 'bN' | 'bP';

interface SetupSquare {
  square: string;
  dark: boolean;
  piece: PieceCode | null;
  rankLabel: string | null;
  fileLabel: string | null;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];
const PIECE_CODES = new Set<PieceCode>([
  'wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP',
]);

/** Editor visuale della FEN iniziale per studi di mediogioco e finale (R25). */
@Component({
  selector: 'app-position-editor',
  imports: [FormsModule, RouterLink],
  templateUrl: './position-editor.html',
  styleUrl: './position-editor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PositionEditor implements CanComponentDeactivate {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly studies = inject(StudyService);
  private readonly variants = inject(VariantService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly studyId = signal<number | null>(null);
  protected readonly editId = signal<number | null>(null);
  protected readonly studyName = signal('');
  protected readonly ready = signal(false);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly dirty = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly name = signal('');
  protected readonly selectedPiece = signal<PieceCode | null>('wK');
  protected readonly pieces = signal<Record<string, PieceCode>>({});
  protected readonly sideToMove = signal<'w' | 'b'>('w');
  protected readonly whiteKingSide = signal(false);
  protected readonly whiteQueenSide = signal(false);
  protected readonly blackKingSide = signal(false);
  protected readonly blackQueenSide = signal(false);
  protected readonly enPassant = signal('-');
  /** Le mosse esistenti non vengono scartate modificando solo la posizione. */
  private readonly tree = signal<MoveNode[]>([]);

  protected readonly isEdit = computed(() => this.editId() !== null);
  protected readonly piecesPalette = [
    { code: 'wK' as const, label: 'Re bianco' },
    { code: 'wQ' as const, label: 'Donna bianca' },
    { code: 'wR' as const, label: 'Torre bianca' },
    { code: 'wB' as const, label: 'Alfiere bianco' },
    { code: 'wN' as const, label: 'Cavallo bianco' },
    { code: 'wP' as const, label: 'Pedone bianco' },
    { code: 'bK' as const, label: 'Re nero' },
    { code: 'bQ' as const, label: 'Donna nera' },
    { code: 'bR' as const, label: 'Torre nera' },
    { code: 'bB' as const, label: 'Alfiere nero' },
    { code: 'bN' as const, label: 'Cavallo nero' },
    { code: 'bP' as const, label: 'Pedone nero' },
  ];
  protected readonly enPassantOptions = [
    '-',
    ...FILES.map((file) => `${file}3`),
    ...FILES.map((file) => `${file}6`),
  ];

  protected readonly squares = computed<SetupSquare[]>(() => {
    const placed = this.pieces();
    const squares: SetupSquare[] = [];
    for (let rankIndex = 0; rankIndex < RANKS.length; rankIndex++) {
      const rank = RANKS[rankIndex];
      for (let fileIndex = 0; fileIndex < FILES.length; fileIndex++) {
        const file = FILES[fileIndex];
        const square = `${file}${rank}`;
        squares.push({
          square,
          dark: (rankIndex + fileIndex) % 2 === 1,
          piece: placed[square] ?? null,
          rankLabel: fileIndex === 0 ? String(rank) : null,
          fileLabel: rankIndex === RANKS.length - 1 ? file : null,
        });
      }
    }
    return squares;
  });

  /** FEN normalizzata: i contatori non sono parte della configurazione dell'editor. */
  protected readonly startingFen = computed(() => {
    const rights = [
      this.whiteKingSide() ? 'K' : '',
      this.whiteQueenSide() ? 'Q' : '',
      this.blackKingSide() ? 'k' : '',
      this.blackQueenSide() ? 'q' : '',
    ].join('') || '-';
    return `${this.placement()} ${this.sideToMove()} ${rights} ${this.enPassant()} 0 1`;
  });

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    const studyParam = this.route.snapshot.queryParamMap.get('studyId');
    if (idParam) {
      this.editId.set(Number(idParam));
      this.loadPosition(Number(idParam));
    } else if (studyParam && Number(studyParam) > 0) {
      this.studyId.set(Number(studyParam));
      this.loadStudy(Number(studyParam));
    } else {
      this.loading.set(false);
      this.error.set('Apri l’editor dallo studio di mediogioco o finale a cui deve appartenere la posizione.');
    }
  }

  protected selectPiece(piece: PieceCode | null): void {
    this.selectedPiece.set(piece);
  }

  protected placeOn(square: string): void {
    const selected = this.selectedPiece();
    this.pieces.update((current) => {
      const next = { ...current };
      if (selected) {
        next[square] = selected;
      } else {
        delete next[square];
      }
      return next;
    });
    this.dirty.set(true);
  }

  protected useStandardPosition(): void {
    this.applyFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    this.dirty.set(true);
  }

  protected clearBoard(): void {
    this.pieces.set({});
    this.sideToMove.set('w');
    this.whiteKingSide.set(false);
    this.whiteQueenSide.set(false);
    this.blackKingSide.set(false);
    this.blackQueenSide.set(false);
    this.enPassant.set('-');
    this.dirty.set(true);
  }

  protected onNameChange(value: string): void {
    this.name.set(value);
    this.dirty.set(true);
  }

  protected onSideChange(value: 'w' | 'b'): void {
    this.sideToMove.set(value);
    this.dirty.set(true);
  }

  protected onRightsChange(right: 'K' | 'Q' | 'k' | 'q', checked: boolean): void {
    ({ K: this.whiteKingSide, Q: this.whiteQueenSide, k: this.blackKingSide, q: this.blackQueenSide })[right].set(checked);
    this.dirty.set(true);
  }

  protected onEnPassantChange(value: string): void {
    this.enPassant.set(value);
    this.dirty.set(true);
  }

  canDeactivate(): boolean | Promise<boolean> {
    if (!this.dirty()) {
      return true;
    }
    return this.confirm.ask({
      title: 'Modifiche non salvate',
      message: 'Hai modifiche non salvate. Vuoi uscire senza salvarle?',
      confirmLabel: 'Esci senza salvare',
      danger: true,
    });
  }

  protected save(): void {
    const name = this.name().trim();
    const localError = this.validate(name);
    if (localError) {
      this.error.set(localError);
      return;
    }
    const studyId = this.studyId();
    if (studyId === null || this.saving()) {
      return;
    }
    this.error.set(null);
    this.saving.set(true);
    const request: CreateVariantRequest = {
      name,
      moves: this.mainline(),
      tree: this.tree(),
      startingFen: this.startingFen(),
    };
    const id = this.editId();
    const request$ = id === null
      ? this.studies.addVariant(studyId, request)
      : this.variants.updateVariant(id, request);
    request$.subscribe({
      next: (saved) => {
        this.dirty.set(false);
        this.saving.set(false);
        this.toast.success(this.isEdit() ? 'Posizione aggiornata.' : 'Posizione salvata.');
        // Dopo il setup della FEN l'utente può completare o correggere
        // l'albero delle mosse nell'editor esistente (task R25 6.2).
        this.router.navigate(['/variants', saved.id, 'edit']);
      },
      error: (err) => {
        const message = validationMessage(err) ?? 'Salvataggio non riuscito.';
        this.error.set(message);
        this.toast.error(message);
        this.saving.set(false);
      },
    });
  }

  private loadPosition(id: number): void {
    this.variants.getVariant(id).subscribe({
      next: (position) => {
        if (position.studyId == null) {
          this.loading.set(false);
          this.error.set('La posizione non appartiene a uno studio.');
          return;
        }
        this.studyId.set(position.studyId);
        this.name.set(position.name);
        this.tree.set(position.tree && position.tree.length ? position.tree : fromLine(position.moves));
        this.applyFen(position.startingFen);
        this.loadStudy(position.studyId);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Posizione non trovata.');
      },
    });
  }

  private loadStudy(id: number): void {
    this.studies.getStudy(id).subscribe({
      next: (study) => {
        this.loading.set(false);
        if (study.phase === 'OPENING') {
          this.error.set('Le posizioni personalizzate sono disponibili solo negli studi di mediogioco o finale.');
          return;
        }
        this.studyName.set(study.name);
        this.ready.set(true);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Studio non trovato.');
      },
    });
  }

  private applyFen(fen: string): void {
    const fields = fen.trim().split(/\s+/);
    if (fields.length < 4) {
      return;
    }
    const parsed: Record<string, PieceCode> = {};
    const ranks = fields[0].split('/');
    for (let rankIndex = 0; rankIndex < ranks.length; rankIndex++) {
      let fileIndex = 0;
      for (const symbol of ranks[rankIndex]) {
        if (/^[1-8]$/.test(symbol)) {
          fileIndex += Number(symbol);
          continue;
        }
        const code = `${symbol === symbol.toUpperCase() ? 'w' : 'b'}${symbol.toUpperCase()}` as PieceCode;
        if (PIECE_CODES.has(code) && fileIndex < FILES.length) {
          parsed[`${FILES[fileIndex]}${8 - rankIndex}`] = code;
        }
        fileIndex++;
      }
    }
    this.pieces.set(parsed);
    this.sideToMove.set(fields[1] === 'b' ? 'b' : 'w');
    const rights = fields[2];
    this.whiteKingSide.set(rights.includes('K'));
    this.whiteQueenSide.set(rights.includes('Q'));
    this.blackKingSide.set(rights.includes('k'));
    this.blackQueenSide.set(rights.includes('q'));
    this.enPassant.set(this.enPassantOptions.includes(fields[3]) ? fields[3] : '-');
  }

  private placement(): string {
    const placed = this.pieces();
    return RANKS.map((rank) => {
      let empty = 0;
      let row = '';
      for (const file of FILES) {
        const piece = placed[`${file}${rank}`];
        if (!piece) {
          empty++;
          continue;
        }
        if (empty > 0) {
          row += empty;
          empty = 0;
        }
        const letter = piece[1];
        row += piece[0] === 'w' ? letter : letter.toLowerCase();
      }
      return `${row}${empty || ''}`;
    }).join('/');
  }

  private mainline(): string[] {
    const moves: string[] = [];
    let nodes = this.tree();
    while (nodes.length > 0) {
      moves.push(nodes[0].san);
      nodes = nodes[0].children;
    }
    return moves;
  }

  private validate(name: string): string | null {
    if (!name) {
      return 'Inserisci un titolo per la posizione.';
    }
    const placed = this.pieces();
    const whiteKing = Object.entries(placed).filter(([, p]) => p === 'wK').map(([s]) => s);
    const blackKing = Object.entries(placed).filter(([, p]) => p === 'bK').map(([s]) => s);
    if (whiteKing.length !== 1 || blackKing.length !== 1) {
      return 'La posizione deve contenere esattamente un re bianco e un re nero.';
    }
    if (Object.entries(placed).some(([square, piece]) => piece.endsWith('P') && (square.endsWith('1') || square.endsWith('8')))) {
      return 'Un pedone non può essere collocato in prima o ottava traversa.';
    }
    if (this.kingsTouch(whiteKing[0], blackKing[0])) {
      return 'I due re non possono essere adiacenti.';
    }
    const rightError = this.validateCastling(placed);
    if (rightError) {
      return rightError;
    }
    const epError = this.validateEnPassant(placed);
    if (epError) {
      return epError;
    }
    try {
      new Chess(this.startingFen());
    } catch {
      return 'La configurazione non produce una FEN valida.';
    }
    return null;
  }

  private validateCastling(placed: Record<string, PieceCode>): string | null {
    const missing = (right: boolean, king: string, rook: string) => right && (placed[king] !== (king[0] === 'e' && king.endsWith('1') ? 'wK' : 'bK') || placed[rook] !== (rook.endsWith('1') ? 'wR' : 'bR'));
    if (missing(this.whiteKingSide(), 'e1', 'h1') || missing(this.whiteQueenSide(), 'e1', 'a1') || missing(this.blackKingSide(), 'e8', 'h8') || missing(this.blackQueenSide(), 'e8', 'a8')) {
      return 'I diritti di arrocco richiedono il re e la torre corrispondenti sulle case iniziali.';
    }
    return null;
  }

  private validateEnPassant(placed: Record<string, PieceCode>): string | null {
    const target = this.enPassant();
    if (target === '-') {
      return null;
    }
    const file = target[0];
    const whiteToMove = this.sideToMove() === 'w';
    const expectedTargetRank = whiteToMove ? '6' : '3';
    const pawnSquare = `${file}${whiteToMove ? '5' : '4'}`;
    const originSquare = `${file}${whiteToMove ? '7' : '2'}`;
    const pawn = whiteToMove ? 'bP' : 'wP';
    const capturer = whiteToMove ? 'wP' : 'bP';
    const adjacentFiles = [FILES.indexOf(file) - 1, FILES.indexOf(file) + 1]
      .filter((index) => index >= 0 && index < FILES.length)
      .map((index) => `${FILES[index]}${whiteToMove ? '5' : '4'}`);
    if (target[1] !== expectedTargetRank || placed[target] || placed[pawnSquare] !== pawn || placed[originSquare] || !adjacentFiles.some((square) => placed[square] === capturer)) {
      return 'Il bersaglio en passant deve derivare dall’immediata doppia mossa di un pedone ed essere catturabile.';
    }
    return null;
  }

  private kingsTouch(white: string, black: string): boolean {
    return Math.abs(FILES.indexOf(white[0]) - FILES.indexOf(black[0])) <= 1
      && Math.abs(Number(white[1]) - Number(black[1])) <= 1;
  }
}
