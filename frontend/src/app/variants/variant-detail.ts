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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, Observable, merge } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { Chessboard } from '../chessboard/chessboard';
import { EvalBar } from '../chessboard/eval-bar';
import { StudyVariantNav } from './study-variant-nav';
import { VariantService } from '../core/variant.service';
import { MoveSoundService } from '../core/move-sound.service';
import { StockfishService } from '../core/stockfish.service';
import { ReviewService } from '../core/review.service';
import { StudyService } from '../core/study.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { numberedPv } from '../core/uci';
import { MoveNode, Variant } from '../core/variant.model';
import { Study } from '../core/study.model';
import { ReviewSchedule } from '../core/review.model';
import { PositionAttemptsSummary, deriveAttemptsSummary } from '../core/attempt.model';
import { positionGuidedStudyGate } from '../core/guided-study';
import { difficultyLabel, lastOutcomeLabel, themeLabel } from '../core/middlegame-format';
import { sectionContextFrom, sectionLabel, sectionPaths } from '../core/study-sections';
import { formatReviewDate, reviewLabel } from '../reviews/review-format';
import {
  buildTokens,
  childrenAt,
  fenAt,
  fromLine,
  mainline,
  pathsEqual,
} from '../core/move-tree';

/**
 * Dettaglio in consultazione di una variante o di una posizione.
 *
 * Da R26 la stessa pagina serve la route `/middlegame/positions/:id`
 * (ISSUE-016): con il contesto nei `data` accetta soltanto posizioni di uno
 * studio della fase attesa, genera link e navigazione fra sorelle dentro la
 * sezione e non interroga le ripetizioni, che per una posizione non esistono.
 * Senza contesto restano comportamento e URL generici.
 */
@Component({
  selector: 'app-variant-detail',
  imports: [RouterLink, Chessboard, EvalBar, StudyVariantNav],
  templateUrl: './variant-detail.html',
  styleUrl: './variant-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantDetail implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(VariantService);
  private readonly moveSound = inject(MoveSoundService);
  private readonly stockfish = inject(StockfishService);
  private readonly reviews = inject(ReviewService);
  private readonly studyService = inject(StudyService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  /**
   * Stato del motore Stockfish (Prototipo 16): solo aiuto allo studio, mai in
   * allenamento. Il toggle governa da solo anche la barra di valutazione
   * (ISSUE-007): motore acceso ⇒ barra e linea migliore visibili.
   */
  protected readonly engineOn = signal(false);
  protected readonly engineEval = this.stockfish.evaluation;
  protected readonly engineThinking = this.stockfish.thinking;
  protected readonly engineAvailable = this.stockfish.available;
  /** Linea migliore in SAN, numerata dalla posizione analizzata (ISSUE-022). */
  protected readonly engineLine = computed(() =>
    numberedPv(this.currentFen(), this.stockfish.bestLine()),
  );

  /** Contesto di sezione dai `data` della route: `null` sulle route generiche. */
  private readonly context = sectionContextFrom(this.route.snapshot.data);
  /** Percorsi canonici della sezione (o generici senza contesto). */
  protected readonly paths = sectionPaths(this.context);
  /** Etichetta del ritorno: «Studi» fuori sezione, il nome della sezione dentro. */
  protected readonly parentLabel = this.context ? sectionLabel(this.context.section) : 'Studi';
  protected readonly backLabel = this.context ? `torna a ${this.parentLabel}` : 'torna agli studi';
  /** Il breadcrumb di sezione viene mostrato solo sulle route canoniche R26. */
  protected readonly hasSectionContext = this.context !== null;
  /** Lo studio padre deve essere verificato prima di presentare la posizione. */
  protected readonly sectionVerified = signal(!this.context);
  protected readonly sectionChecking = computed(
    () => this.hasSectionContext && !this.sectionVerified(),
  );
  /** Nome dello studio padre, disponibile dopo la verifica della fase. */
  protected readonly studyName = signal('');

  protected readonly variant = signal<Variant | null>(null);
  protected readonly error = signal<string | null>(null);
  /**
   * La variante appartiene a uno studio OPENING (o è legacy, senza studio)? (ISSUE-016)
   * Determina se training, review e statistiche vanno mostrati: per le posizioni di
   * Mediogioco/Finale non si allena e non si ripete con SM-2. Default true finché la
   * fase dello studio non è stata risolta (evita un lampeggio dei controlli).
   */
  protected readonly isOpening = signal(true);
  protected readonly isPosition = computed(() => !this.isOpening());
  /**
   * Solo le posizioni di uno studio `MIDDLEGAME` (R26.3) mostrano tema,
   * difficoltà, descrizioni e storico dei tentativi: il Finale resta fuori
   * scope R26.3 pur condividendo `isPosition()` con il Mediogioco.
   */
  protected readonly isMiddlegamePosition = signal(false);
  protected readonly attemptsSummary = signal<PositionAttemptsSummary | null>(null);
  /**
   * Studio padre completo (R26.3, task 1.5): serve al solo gate della CTA
   * «Studia questa posizione», che richiede anche la classificazione dello
   * studio e non solo la fase — dato non coperto da `isMiddlegamePosition`.
   */
  private readonly parentStudy = signal<Study | null>(null);
  protected readonly guidedStudyEligible = computed(
    () => positionGuidedStudyGate(this.parentStudy(), this.variant()).eligible,
  );
  protected readonly themeLabel = themeLabel;
  protected readonly difficultyLabel = difficultyLabel;
  protected readonly lastOutcomeLabel = lastOutcomeLabel;
  protected readonly formatReviewDate = formatReviewDate;
  /** Nelle sezioni posizionali l'analisi salvata parte nascosta per lo studio attivo. */
  protected readonly analysisRevealed = signal(false);
  protected readonly analysisVisible = computed(
    () => this.isOpening() || this.analysisRevealed(),
  );
  protected readonly deletingPosition = signal(false);
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

  /** Varianti dello studio a cui appartiene quella aperta (ISSUE-010). */
  protected readonly studyVariants = signal<Variant[]>([]);
  /** Drawer varianti aperto (sotto i 1500px, dove non c'è il rail). */
  protected readonly variantsOpen = signal(false);
  /**
   * Il pannello varianti compare solo se serve davvero a navigare: variante
   * legata a uno studio, presente nella risposta dello studio e con almeno
   * un'alternativa (ISSUE-010).
   */
  protected readonly hasVariantNav = computed(() => {
    const id = this.variant()?.id;
    const list = this.studyVariants();
    return id != null && list.length >= 2 && list.some((v) => v.id === id);
  });

  protected readonly tree = computed<MoveNode[]>(() => {
    const v = this.variant();
    if (!v) {
      return [];
    }
    return v.tree && v.tree.length ? v.tree : fromLine(v.moves);
  });
  protected readonly hasSavedAnalysis = computed(() => this.tree().length > 0);

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
    // Angular riusa lo stesso componente quando cambia solo `:id` (cambio
    // variante dal pannello, ISSUE-010): l'ID va letto dal flusso `paramMap`,
    // non una sola volta dallo snapshot. Il caricamento passa da `switchMap`,
    // quindi un cambio di variante annulla le richieste ancora in volo — la
    // risposta della variante precedente non può più sovrascrivere lo stato
    // di quella corrente, nemmeno nelle letture dipendenti (studio, review).
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('id'))),
        tap(() => this.resetTransientState()),
        switchMap((id) => this.load(id)),
        takeUntilDestroyed(),
      )
      .subscribe();
    // Motore acceso → analizza la posizione corrente a ogni cambio. La variante
    // caricata è una dipendenza esplicita: al cambio variante l'analisi riparte
    // (svuotando valutazione e PV) anche quando la FEN iniziale coincide.
    effect(() => {
      const fen = this.currentFen();
      const loaded = this.variant()?.id ?? null;
      if (this.engineOn() && loaded !== null && fen) {
        this.stockfish.analyse(fen);
      }
    });
  }

  /**
   * Azzera tutto lo stato transitorio prima di un (ri)caricamento: percorso
   * mosse, errore, schedule di ripetizione, elenco varianti e drawer.
   */
  private resetTransientState(): void {
    this.variant.set(null);
    this.error.set(null);
    this.review.set(null);
    this.currentPath.set([]);
    this.isOpening.set(true);
    this.isMiddlegamePosition.set(false);
    this.parentStudy.set(null);
    this.attemptsSummary.set(null);
    this.analysisRevealed.set(false);
    this.deletingPosition.set(false);
    this.studyVariants.set([]);
    this.variantsOpen.set(false);
    this.studyName.set('');
    this.sectionVerified.set(!this.context);
  }

  /**
   * Letture della variante della route: dettaglio (con studio a seguire) e
   * schedule di ripetizione. Restituisce un flusso unico perché il `switchMap`
   * del chiamante possa annullarle tutte al cambio di `:id`.
   */
  private load(id: number): Observable<unknown> {
    const variant$ = this.service.getVariant(id).pipe(
      switchMap((v) => {
        if (v.studyId != null) {
          // Sulle route generiche il comportamento resta quello storico: la
          // variante è disponibile subito e la fase viene risolta dopo.
          if (!this.context) {
            this.variant.set(v);
          }
          return this.loadStudy(v.studyId, v);
        }
        // Nella sezione una posizione senza studio padre non è verificabile:
        // non viene presentata come contenuto della sezione (ISSUE-016).
        if (this.context) {
          this.rejectSection('Questa posizione non appartiene a uno studio.');
        } else {
          this.variant.set(v);
        }
        return EMPTY;
      }),
      catchError(() => {
        this.error.set('Variante non trovata.');
        return EMPTY;
      }),
    );
    // Schedule di ripetizione (P19): best-effort, l'assenza non è un errore.
    // Una sezione posizionale non allena e non ripete: la richiesta non serve.
    const review$ = this.context
      ? EMPTY
      : this.reviews.getForVariant(id).pipe(
          tap((r) => this.review.set(r)),
          catchError(() => {
            this.review.set(null);
            return EMPTY;
          }),
        );
    return merge(variant$, review$);
  }

  /** Rifiuta il contenuto nella sezione: niente consultazione né modifica. */
  private rejectSection(message: string): void {
    this.variant.set(null);
    this.studyVariants.set([]);
    this.studyName.set('');
    this.sectionVerified.set(false);
    this.error.set(message);
  }

  /**
   * Fase e varianti sorelle derivate dallo studio padre (ISSUE-016/010):
   * niente denormalizzazione su Variant, nessuna nuova API.
   */
  private loadStudy(studyId: number, pendingVariant: Variant): Observable<unknown> {
    return this.studyService.getStudy(studyId).pipe(
      tap((s) => {
        // Controllo esatto della fase (ISSUE-016): un id valido di un'altra
        // sezione non viene presentato come contenuto di questa.
        if (this.context && s.phase !== this.context.phase) {
          this.rejectSection(`Questa posizione non appartiene alla sezione ${this.parentLabel}.`);
          return;
        }
        this.isOpening.set(s.phase === 'OPENING');
        this.studyVariants.set(s.variants ?? []);
        this.studyName.set(s.name);
        if (s.phase === 'MIDDLEGAME') {
          this.isMiddlegamePosition.set(true);
          this.parentStudy.set(s);
          this.loadAttemptsSummary(pendingVariant.id);
        }
        if (this.context) {
          // Solo ora la posizione diventa presentabile: prima di questo punto
          // fase, contenuto e azioni restano in stato di caricamento.
          this.variant.set(pendingVariant);
          this.sectionVerified.set(true);
        }
      }),
      catchError(() => {
        if (this.context) {
          this.rejectSection('Studio della posizione non trovato.');
          return EMPTY;
        }
        this.isOpening.set(true);
        this.studyVariants.set([]);
        return EMPTY;
      }),
    );
  }

  /**
   * Riepilogo dei tentativi della posizione (R26.3, task 5.6): best-effort,
   * l'assenza non impedisce la consultazione della posizione.
   */
  private loadAttemptsSummary(variantId: number): void {
    this.service.getAttempts(variantId).subscribe({
      next: (attempts) => this.attemptsSummary.set(deriveAttemptsSummary(variantId, attempts)),
      error: () => this.attemptsSummary.set(null),
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

  /** Apre "gioca contro il computer" in una nuova tab con la FEN corrente. */
  protected playVsComputer(): void {
    window.open(`/play?fen=${encodeURIComponent(this.currentFen())}`, '_blank');
  }

  protected toggleVariants(): void {
    this.variantsOpen.update((open) => !open);
  }

  protected closeVariants(): void {
    this.variantsOpen.set(false);
  }

  /**
   * Selezione dal pannello varianti: nel dettaglio non c'è nulla da salvare,
   * quindi si naviga subito al dettaglio della variante scelta.
   */
  protected goToVariant(id: number): void {
    this.variantsOpen.set(false);
    if (id === this.variant()?.id) {
      return;
    }
    // Le sorelle restano dentro la sezione (ISSUE-016).
    void this.router.navigateByUrl(this.paths.position(id));
  }

  protected isCurrent(path: number[] | undefined): boolean {
    return !!path && pathsEqual(path, this.currentPath());
  }

  protected goTo(path: number[] | undefined): void {
    if (!this.analysisVisible() || !path) {
      return;
    }
    this.currentPath.set([...path]);
  }

  protected first(): void {
    if (!this.analysisVisible()) {
      return;
    }
    this.currentPath.set([]);
  }

  protected prev(): void {
    if (!this.analysisVisible()) {
      return;
    }
    this.currentPath.update((p) => p.slice(0, -1));
  }

  protected next(): void {
    if (!this.analysisVisible()) {
      return;
    }
    const kids = childrenAt(this.tree(), this.currentPath());
    if (kids.length > 0) {
      this.currentPath.update((p) => [...p, 0]);
      this.moveSound.play(soundKind(kids[0].san));
    }
  }

  protected last(): void {
    if (!this.analysisVisible()) {
      return;
    }
    let path = [...this.currentPath()];
    let kids = childrenAt(this.tree(), path);
    while (kids.length > 0) {
      path = [...path, 0];
      kids = kids[0].children;
    }
    this.currentPath.set(path);
  }

  @HostListener('window:keydown', ['$event'])
  protected onKey(event: KeyboardEvent): void {
    if (!this.analysisVisible()) {
      return;
    }
    if (event.key === 'ArrowLeft') {
      this.prev();
      event.preventDefault();
    } else if (event.key === 'ArrowRight') {
      this.next();
      event.preventDefault();
    }
  }

  /** Rivela esplicitamente la linea salvata senza persistere stato o progressi. */
  protected revealAnalysis(): void {
    if (this.isPosition() && this.hasSavedAnalysis()) {
      this.currentPath.set([]);
      this.analysisRevealed.set(true);
    }
  }

  /** Elimina la posizione corrente e, solo dopo il successo, torna allo studio padre. */
  protected async removePosition(): Promise<void> {
    const v = this.variant();
    if (!this.isPosition() || !v || v.studyId == null || this.deletingPosition()) {
      return;
    }
    const ok = await this.confirm.ask({
      title: 'Elimina posizione',
      message: `Eliminare definitivamente «${v.name}»? L'operazione non è reversibile.`,
      confirmLabel: 'Elimina',
      danger: true,
    });
    if (!ok) {
      return;
    }
    this.deletingPosition.set(true);
    this.service.deleteVariant(v.id).subscribe({
      next: () => {
        this.deletingPosition.set(false);
        this.toast.success('Posizione eliminata.');
        void this.router.navigateByUrl(this.paths.study(v.studyId!));
      },
      error: () => {
        this.deletingPosition.set(false);
        this.toast.error('Eliminazione non riuscita.');
      },
    });
  }

  ngOnDestroy(): void {
    this.stockfish.dispose();
  }
}

function soundKind(san: string): 'move' | 'capture' {
  return san.includes('x') ? 'capture' : 'move';
}
