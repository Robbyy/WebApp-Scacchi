import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Chess } from 'chess.js';
import { ConfirmService } from '../core/confirm.service';
import { StudyService } from '../core/study.service';
import { ToastService } from '../core/toast.service';
import { VariantService } from '../core/variant.service';
import { PositionThemeService } from '../core/position-theme.service';
import {
  CreateVariantRequest,
  Difficulty,
  DIFFICULTIES,
  MAX_POSITION_DESCRIPTION_LENGTH,
  MAX_POSITION_SOURCE_LENGTH,
  MAX_THEME_DESCRIPTION_LENGTH,
  MoveNode,
  Variant,
  validationMessage,
} from '../core/variant.model';
import { PositionTheme, StudyType } from '../core/position-theme.model';
import { GamePhase } from '../core/study.model';
import { difficultyLabel } from '../core/middlegame-format';
import { fromLine } from '../core/move-tree';
import { sectionContextFrom, sectionLabel, sectionPaths } from '../core/study-sections';
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

/**
 * Editor visuale della FEN iniziale per studi di mediogioco e finale (R25).
 *
 * Da R26 la stessa pagina serve le route di sezione `positions/new` e
 * `positions/:id/setup` (ISSUE-016): con il contesto nei `data` della route
 * accetta soltanto studi della fase attesa e costruisce breadcrumb, «Annulla» e
 * redirect dentro la sezione. Senza contesto restano il comportamento e gli URL
 * generici di R25. Composizione visuale, FEN canonica, albero esistente, guard
 * delle modifiche e validazioni non cambiano.
 */
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
  private readonly themes = inject(PositionThemeService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  /** Contesto di sezione dai `data` della route: `null` sulle route generiche. */
  private readonly context = sectionContextFrom(this.route.snapshot.data);
  /** Percorsi canonici della sezione (o generici R25 senza contesto). */
  private readonly paths = sectionPaths(this.context);
  /** Antenato nei breadcrumb: «Studi» fuori sezione, il nome della sezione dentro. */
  protected readonly parentLabel = this.context ? sectionLabel(this.context.section) : 'Studi';
  /** Ritorno mostrato dall'errore, invariato fuori sezione. */
  protected readonly backLabel = this.context ? `torna a ${this.parentLabel}` : 'torna agli studi';
  /** Lista degli studi della sezione, per breadcrumb ed errore. */
  protected readonly listLink = this.paths.studyList;

  protected readonly studyId = signal<number | null>(null);
  protected readonly editId = signal<number | null>(null);
  protected readonly studyName = signal('');
  protected readonly ready = signal(false);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly dirty = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Fase e tipologia dello studio padre (R26.3), risolte dopo il caricamento. */
  private readonly studyPhase = signal<GamePhase | null>(null);
  private readonly parentStudyType = signal<StudyType | null>(null);
  private readonly existingPositionCount = signal(0);
  /** I metadati di posizione (tema, difficoltà, ordine, ...) valgono solo in Mediogioco. */
  protected readonly isMiddlegame = computed(() => this.studyPhase() === 'MIDDLEGAME');
  /** Mediogioco legacy «Da classificare»: nessun catalogo temi da offrire ancora. */
  protected readonly unclassified = computed(
    () => this.isMiddlegame() && this.parentStudyType() == null,
  );
  /**
   * Pannello «Dati Mediogioco» chiuso all'apertura della pagina: i campi sono
   * facoltativi tranne il tema, e da chiuso i pulsanti del form restano nel
   * viewport senza scorrere. `save()` lo riapre quando manca il tema, altrimenti
   * il messaggio d'errore punterebbe a un controllo non visibile.
   */
  protected readonly metadataOpen = signal(false);
  protected readonly availableThemes = signal<PositionTheme[]>([]);
  protected readonly themeId = signal<number | null>(null);
  protected readonly themeDescription = signal('');
  protected readonly description = signal('');
  protected readonly difficulty = signal<Difficulty | null>(null);
  protected readonly source = signal('');
  protected readonly positionOrder = signal(1);
  protected readonly maxOrder = computed(() => this.existingPositionCount() + 1);
  protected readonly difficulties = DIFFICULTIES;
  protected readonly difficultyLabel = difficultyLabel;
  /** Gli stessi limiti applicati dal backend: qui evitano di digitare oltre. */
  protected readonly maxThemeDescription = MAX_THEME_DESCRIPTION_LENGTH;
  protected readonly maxDescription = MAX_POSITION_DESCRIPTION_LENGTH;
  protected readonly maxSource = MAX_POSITION_SOURCE_LENGTH;

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

  /** Link allo studio padre nei breadcrumb. */
  protected readonly studyLink = computed(() => {
    const id = this.studyId();
    return id === null ? this.paths.studyList : this.paths.study(id);
  });

  /**
   * Destinazione di «Annulla»: nella sezione il setup torna al dettaglio della
   * posizione e la creazione allo studio padre; fuori sezione resta lo studio
   * padre in entrambi i casi, come in R25.
   */
  protected readonly cancelLink = computed(() => {
    const positionId = this.editId();
    if (this.context && positionId !== null) {
      return this.paths.position(positionId);
    }
    return this.studyLink();
  });

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
  /**
   * Bersagli possibili per il lato al tratto: col bianco la casa è in sesta, col
   * nero in terza. Offrirle tutte e sedici significava proporne otto che la
   * validazione avrebbe comunque rifiutato al salvataggio.
   */
  protected readonly enPassantOptions = computed(() => [
    '-',
    ...FILES.map((file) => `${file}${this.sideToMove() === 'w' ? '6' : '3'}`),
  ]);

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
    // Cambiando lato il bersaglio scelto finisce sulla traversa sbagliata:
    // lasciarlo selezionato produrrebbe una FEN che la validazione rifiuta.
    if (!this.enPassantOptions().includes(this.enPassant())) {
      this.enPassant.set('-');
    }
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

  /** Allinea lo stato all'apertura/chiusura decisa dall'utente sulla disclosure. */
  protected onMetadataToggle(event: Event): void {
    this.metadataOpen.set((event.target as HTMLDetailsElement).open);
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
    // L'editor non è mai presentato per una fase non attesa: senza `ready` non
    // esiste nemmeno un percorso di modifica (ISSUE-016).
    if (!this.ready()) {
      return;
    }
    const name = this.name().trim();
    const localError = this.validate(name);
    if (localError) {
      this.error.set(localError);
      // Il tema è l'unico campo obbligatorio del pannello a scomparsa: se manca,
      // riaprirlo evita un errore che rimanda a un controllo fuori vista.
      if (this.missingRequiredTheme()) {
        this.metadataOpen.set(true);
      }
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
    if (this.isMiddlegame()) {
      request.themeId = this.themeId();
      request.themeDescription = this.themeDescription().trim() || null;
      request.description = this.description().trim() || null;
      request.difficulty = this.difficulty();
      request.source = this.source().trim() || null;
      if (!this.isEdit()) {
        // Il riordino successivo passa dal contratto dedicato (task 3.5/5.5):
        // qui solo l'indice di inserimento iniziale.
        request.positionOrder = this.positionOrder();
      }
    }
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
        // l'albero delle mosse nell'editor esistente (task R25 6.2), che nella
        // sezione è `/middlegame/positions/{id}/edit` (ISSUE-016).
        void this.router.navigateByUrl(this.paths.positionEdit(saved.id));
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
        // Metadati Mediogioco (R26.3): ignorati fuori sezione/fase, ma innocui da
        // leggere qui perché il backend li restituisce `null` per Aperture/Finale.
        this.themeId.set(position.themeId ?? null);
        this.themeDescription.set(position.themeDescription ?? '');
        this.description.set(position.description ?? '');
        this.difficulty.set(position.difficulty ?? null);
        this.source.set(position.source ?? '');
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
        // Nella sezione la fase deve corrispondere esattamente (ISSUE-016):
        // un id valido di un'altra fase non apre l'editor. Fuori sezione resta
        // il confine R25 fra Aperture e studi posizionali.
        if (this.context ? study.phase !== this.context.phase : study.phase === 'OPENING') {
          this.error.set(this.phaseError());
          return;
        }
        this.studyPhase.set(study.phase);
        this.parentStudyType.set(study.studyType ?? null);
        this.existingPositionCount.set(study.variantCount);
        // Un Mediogioco «Da classificare» resta consultabile/modificabile nelle
        // sue posizioni esistenti, ma non ammette nuove posizioni (task 2.3/5.2).
        if (study.phase === 'MIDDLEGAME' && study.studyType == null && !this.isEdit()) {
          this.error.set(
            'Classifica lo studio Mediogioco (tattico o strategico) prima di creare posizioni.',
          );
          return;
        }
        if (!this.isEdit()) {
          this.positionOrder.set(study.variantCount + 1);
        }
        if (study.phase === 'MIDDLEGAME' && study.studyType != null) {
          this.loadThemes(study.studyType);
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

  /** Catalogo temi della tipologia dello studio (R26.3), filtrato dal backend. */
  private loadThemes(studyType: StudyType): void {
    this.themes.getThemes(studyType).subscribe({
      next: (list) => this.availableThemes.set(list),
      error: () => this.availableThemes.set([]),
    });
  }

  /** Messaggio di fase errata: di sezione dentro `/middlegame`, R25 fuori. */
  private phaseError(): string {
    if (!this.context) {
      return 'Le posizioni personalizzate sono disponibili solo negli studi di mediogioco o finale.';
    }
    const subject = this.isEdit() ? 'Questa posizione' : 'Questo studio';
    return `${subject} non appartiene alla sezione ${this.parentLabel}.`;
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
    // `sideToMove` è già stato applicato sopra, quindi le opzioni sono quelle giuste.
    this.enPassant.set(this.enPassantOptions().includes(fields[3]) ? fields[3] : '-');
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
    if (this.missingRequiredTheme()) {
      return 'Seleziona un tema per la posizione.';
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

  /**
   * Il tema è obbligatorio solo per una nuova posizione Mediogioco classificata
   * (design.md decisione 4); l'assegnazione a una posizione legacy è facoltativa.
   */
  private missingRequiredTheme(): boolean {
    return this.isMiddlegame() && !this.isEdit() && this.themeId() == null;
  }

  /** Un diritto d'arrocco richiede re e torre del proprio colore sulle case iniziali. */
  private validateCastling(placed: Record<string, PieceCode>): string | null {
    const missing = (right: boolean, side: 'w' | 'b', rook: string) =>
      right && (placed[side === 'w' ? 'e1' : 'e8'] !== `${side}K` || placed[rook] !== `${side}R`);
    if (
      missing(this.whiteKingSide(), 'w', 'h1')
      || missing(this.whiteQueenSide(), 'w', 'a1')
      || missing(this.blackKingSide(), 'b', 'h8')
      || missing(this.blackQueenSide(), 'b', 'a8')
    ) {
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
