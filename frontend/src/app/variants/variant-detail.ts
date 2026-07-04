import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Chessboard } from '../chessboard/chessboard';
import { EvalBar } from '../chessboard/eval-bar';
import { VariantService } from '../core/variant.service';
import { MoveSoundService } from '../core/move-sound.service';
import { StockfishService } from '../core/stockfish.service';
import { ReviewService } from '../core/review.service';
import { StudyService } from '../core/study.service';
import { MoveNode, Variant } from '../core/variant.model';
import { ReviewSchedule } from '../core/review.model';
import { formatReviewDate, reviewLabel } from '../reviews/review-format';
import {
  buildTokens,
  childrenAt,
  fenAt,
  fromLine,
  mainline,
  pathsEqual,
} from '../core/move-tree';

@Component({
  selector: 'app-variant-detail',
  imports: [RouterLink, Chessboard, EvalBar],
  templateUrl: './variant-detail.html',
  styleUrl: './variant-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantDetail implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(VariantService);
  private readonly moveSound = inject(MoveSoundService);
  private readonly stockfish = inject(StockfishService);
  private readonly reviews = inject(ReviewService);
  private readonly studyService = inject(StudyService);

  /** Stato del motore Stockfish (Prototipo 16): solo aiuto allo studio, mai in allenamento. */
  protected readonly engineOn = signal(false);
  protected readonly showEvalBar = signal(true);
  protected readonly engineEval = this.stockfish.evaluation;
  protected readonly engineThinking = this.stockfish.thinking;
  protected readonly engineAvailable = this.stockfish.available;

  protected readonly variant = signal<Variant | null>(null);
  protected readonly error = signal<string | null>(null);
  /**
   * La variante appartiene a uno studio OPENING (o è legacy, senza studio)? (ISSUE-016)
   * Determina se training, review e statistiche vanno mostrati: per le posizioni di
   * Mediogioco/Finale non si allena e non si ripete con SM-2. Default true finché la
   * fase dello studio non è stata risolta (evita un lampeggio dei controlli).
   */
  protected readonly isOpening = signal(true);
  /** Schedule di ripetizione della variante (P19), null se mai allenata. */
  protected readonly review = signal<ReviewSchedule | null>(null);
  protected readonly reviewLabel = computed(() => {
    const r = this.review();
    return r ? reviewLabel(r.nextReviewDate) : null;
  });
  protected readonly reviewDate = computed(() => {
    const r = this.review();
    return r ? formatReviewDate(r.nextReviewDate) : null;
  });
  /** Percorso (indici di figlio dalla radice) del nodo selezionato; vuoto = posizione iniziale. */
  protected readonly currentPath = signal<number[]>([]);
  protected readonly playing = signal(false);
  private timer: ReturnType<typeof setInterval> | null = null;

  protected readonly tree = computed<MoveNode[]>(() => {
    const v = this.variant();
    if (!v) {
      return [];
    }
    return v.tree && v.tree.length ? v.tree : fromLine(v.moves);
  });

  protected readonly tokens = computed(() => buildTokens(this.tree()));
  protected readonly mainlineLength = computed(() => mainline(this.tree()).length);
  protected readonly orientation = computed<'white' | 'black'>(() =>
    this.variant()?.color === 'BLACK' ? 'black' : 'white',
  );
  protected readonly currentFen = computed<string>(() =>
    fenAt(this.variant()?.startingFen, this.tree(), this.currentPath()),
  );
  protected readonly atStart = computed(() => this.currentPath().length === 0);
  protected readonly atLeaf = computed(
    () => childrenAt(this.tree(), this.currentPath()).length === 0,
  );

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.service.getVariant(id).subscribe({
      next: (v) => {
        this.variant.set(v);
        if (v.studyId != null) {
          // Fase derivata dallo studio padre (ISSUE-016): niente denormalizzazione su Variant.
          this.studyService.getStudy(v.studyId).subscribe({
            next: (s) => this.isOpening.set(s.phase === 'OPENING'),
            error: () => this.isOpening.set(true),
          });
        }
      },
      error: () => this.error.set('Variante non trovata.'),
    });
    // Schedule di ripetizione (P19): best-effort, l'assenza non è un errore.
    this.reviews.getForVariant(id).subscribe({
      next: (r) => this.review.set(r),
      error: () => this.review.set(null),
    });
    // Quando il motore è acceso, analizza la posizione corrente a ogni cambio.
    effect(() => {
      const fen = this.currentFen();
      if (this.engineOn() && fen) {
        this.stockfish.analyse(fen);
      }
    });
  }

  /** Accende/spegne il motore sulla posizione corrente. */
  protected toggleEngine(): void {
    const next = !this.engineOn();
    this.engineOn.set(next);
    if (!next) {
      this.stockfish.stop();
    }
  }

  protected toggleEvalBar(): void {
    this.showEvalBar.update((v) => !v);
  }

  /** Apre "gioca contro il computer" in una nuova tab con la FEN corrente. */
  protected playVsComputer(): void {
    window.open(`/play?fen=${encodeURIComponent(this.currentFen())}`, '_blank');
  }

  protected isCurrent(path: number[] | undefined): boolean {
    return !!path && pathsEqual(path, this.currentPath());
  }

  protected goTo(path: number[] | undefined): void {
    if (!path) {
      return;
    }
    this.stop();
    this.currentPath.set([...path]);
  }

  protected first(): void {
    this.stop();
    this.currentPath.set([]);
  }

  protected prev(): void {
    this.stop();
    this.currentPath.update((p) => p.slice(0, -1));
  }

  protected next(): void {
    const kids = childrenAt(this.tree(), this.currentPath());
    if (kids.length > 0) {
      this.currentPath.update((p) => [...p, 0]);
      this.moveSound.play(soundKind(kids[0].san));
    }
  }

  protected last(): void {
    this.stop();
    let path = [...this.currentPath()];
    let kids = childrenAt(this.tree(), path);
    while (kids.length > 0) {
      path = [...path, 0];
      kids = kids[0].children;
    }
    this.currentPath.set(path);
  }

  protected togglePlay(): void {
    if (this.playing()) {
      this.stop();
      return;
    }
    if (childrenAt(this.tree(), this.currentPath()).length === 0) {
      return;
    }
    this.playing.set(true);
    this.timer = setInterval(() => {
      if (childrenAt(this.tree(), this.currentPath()).length === 0) {
        this.stop();
        return;
      }
      this.next();
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
    this.stockfish.dispose();
  }
}

function soundKind(san: string): 'move' | 'capture' {
  return san.includes('x') ? 'capture' : 'move';
}
