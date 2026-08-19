import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { VariantDetail } from './variant-detail';
import { VariantService } from '../core/variant.service';
import { ReviewService } from '../core/review.service';
import { StockfishService } from '../core/stockfish.service';
import { StudyService } from '../core/study.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { UciScore } from '../core/uci';
import { Variant } from '../core/variant.model';
import { Study } from '../core/study.model';
import { ReviewSchedule } from '../core/review.model';
import { MIDDLEGAME_SECTION_CONTEXT, SECTION_CONTEXT_DATA } from '../core/study-sections';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const linear: Variant = {
  id: 1,
  name: 'Lineare',
  color: 'WHITE',
  moves: ['e4', 'e5', 'Nf3', 'Nc6'],
  startingFen: START,
};

const branched: Variant = {
  id: 2,
  name: 'Con varianti',
  color: 'WHITE',
  moves: ['e4', 'e5'],
  startingFen: START,
  tree: [
    {
      san: 'e4',
      children: [
        { san: 'e5', children: [] },
        { san: 'c5', children: [{ san: 'Nf3', children: [] }] },
      ],
    },
  ],
};

/** Variante con annotazioni sulle mosse (R24). */
const annotatedVariant: Variant = {
  id: 3,
  name: 'Annotata',
  color: 'WHITE',
  moves: ['e4', 'e5'],
  startingFen: START,
  tree: [
    {
      san: 'e4',
      comment: 'Apertura di re',
      nag: '!',
      children: [{ san: 'e5', children: [] }],
    },
  ],
};

/**
 * Doppio del motore: niente Web Worker nei test, segnali pilotabili a mano.
 * `analyse`/`stop` replicano il contratto reale di `StockfishService` — entrambi
 * svuotano valutazione e linea, così la UI non può mostrare dati di un'analisi
 * precedente.
 */
function fakeEngine() {
  return {
    available: signal(true),
    evaluation: signal<UciScore | null>(null),
    bestLine: signal<string[]>([]),
    thinking: signal(false),
    analysed: [] as string[],
    stopped: 0,
    analyse(fen: string) {
      this.analysed.push(fen);
      this.evaluation.set(null);
      this.bestLine.set([]);
      this.thinking.set(true);
    },
    stop() {
      this.stopped++;
      this.evaluation.set(null);
      this.bestLine.set([]);
      this.thinking.set(false);
    },
    dispose() {},
  };
}

function setup(
  v: Variant,
  studyService: Partial<StudyService> = {},
  engine = fakeEngine(),
  variantService: Partial<VariantService> = { getVariant: () => of(v) },
  reviewService: Partial<ReviewService> = { getForVariant: () => of(null) },
  /** `data` della route: con il contesto il dettaglio è quello di sezione. */
  data: Record<string, unknown> = {},
  ui: {
    confirmResult?: boolean;
    success?: (text: string) => void;
    error?: (text: string) => void;
  } = {},
) {
  const paramMap = new BehaviorSubject(convertToParamMap({ id: String(v.id) }));
  // Una posizione Mediogioco chiede sempre lo storico dei tentativi al
  // caricamento (R26.3, task 5.6): stub di default innocuo, sovrascrivibile.
  const finalVariantService: Partial<VariantService> = { getAttempts: () => of([]), ...variantService };
  TestBed.configureTestingModule({
    imports: [VariantDetail],
    providers: [
      provideRouter([]),
      { provide: VariantService, useValue: finalVariantService },
      { provide: ReviewService, useValue: reviewService },
      { provide: StockfishService, useValue: engine },
      { provide: StudyService, useValue: studyService },
      {
        provide: ConfirmService,
        useValue: { ask: () => Promise.resolve(ui.confirmResult ?? true) },
      },
      {
        provide: ToastService,
        useValue: {
          success: (text: string) => ui.success?.(text),
          error: (text: string) => ui.error?.(text),
        },
      },
      {
        provide: ActivatedRoute,
        useValue: { paramMap, snapshot: { paramMap: paramMap.value, data } },
      },
    ],
  });
  const fixture = TestBed.createComponent(VariantDetail);
  fixture.detectChanges();
  /** Simula il cambio di `:id` con lo stesso componente riusato da Angular. */
  const navigateTo = (id: number) => {
    paramMap.next(convertToParamMap({ id: String(id) }));
    fixture.detectChanges();
  };
  return { fixture, cmp: fixture.componentInstance as any, engine, navigateTo };
}

describe('VariantDetail', () => {
  it('derives a linear tree from moves and lists the mainline', () => {
    const { cmp } = setup(linear);
    expect(cmp.mainlineLength()).toBe(4);
    const moves = cmp.tokens().filter((t: any) => t.kind === 'move').map((t: any) => t.san);
    expect(moves).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
  });

  it('navigates forward, to the end, back and to the start', () => {
    const { cmp } = setup(linear);
    expect(cmp.currentPath()).toEqual([]);
    cmp.next();
    expect(cmp.currentPath()).toEqual([0]);
    cmp.last();
    expect(cmp.currentPath()).toEqual([0, 0, 0, 0]);
    cmp.prev();
    expect(cmp.currentPath()).toEqual([0, 0, 0]);
    cmp.first();
    expect(cmp.currentPath()).toEqual([]);
  });

  it('renders variation tokens (parentheses) for a branched tree', () => {
    const { cmp } = setup(branched);
    const kinds = cmp.tokens().map((t: any) => t.kind);
    expect(kinds).toContain('open');
    expect(kinds).toContain('close');
    const variationMove = cmp.tokens().find((t: any) => t.kind === 'move' && t.variation);
    expect(variationMove.san).toBe('c5');
  });

  it('jumps to a variation node and updates the position', () => {
    const { cmp } = setup(branched);
    cmp.goTo([0, 1]); // 1.e4 c5
    expect(cmp.currentPath()).toEqual([0, 1]);
    expect(cmp.currentFen().split(' ')[1]).toBe('w'); // due semimosse: muove il bianco
  });

  it('orients the board for the black side', () => {
    const { cmp } = setup({ ...linear, color: 'BLACK' });
    expect(cmp.orientation()).toBe('black');
  });

  it('shows training/review/stats for a legacy variant without a study (ISSUE-016)', () => {
    const { cmp } = setup(linear);
    expect(cmp.isOpening()).toBe(true);
  });

  // R24: la stessa rappresentazione dell'editor, ma in sola lettura.
  it('shows NAG and comment of an annotated move, without action controls', () => {
    const { fixture } = setup(annotatedVariant);
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('.move-nag')!.textContent?.trim()).toBe('!');
    expect(el.querySelector('.move-comment')!.textContent?.trim()).toBe('Apertura di re');
    expect(el.querySelector('.move-actions')).toBeNull();
    expect(el.querySelector('app-move-annotation-dialog')).toBeNull();
  });

  it('reads a legacy tree without annotations exactly as before', () => {
    const { fixture, cmp } = setup(branched);
    expect(fixture.nativeElement.querySelector('.move-nag')).toBeNull();
    expect(fixture.nativeElement.querySelector('.move-comment')).toBeNull();
    expect(cmp.tokens().every((t: any) => t.nag === undefined)).toBe(true);
  });

  it('shows training/review/stats for a variant in an opening study', () => {
    const study: Study = { id: 5, name: 'Repertorio', phase: 'OPENING', variantCount: 1 };
    const { cmp } = setup(
      { ...linear, studyId: 5 },
      { getStudy: () => of(study) },
    );
    expect(cmp.isOpening()).toBe(true);
  });

  it('hides training/review/stats for a position in a middlegame study', () => {
    const study: Study = { id: 6, name: 'Mediogioco', phase: 'MIDDLEGAME', variantCount: 1 };
    const { cmp } = setup(
      { ...linear, studyId: 6 },
      { getStudy: () => of(study) },
    );
    expect(cmp.isOpening()).toBe(false);
  });

  it('labels a non-opening child as a position and splits its two editors', () => {
    const study: Study = { id: 6, name: 'Mediogioco', phase: 'MIDDLEGAME', variantCount: 1 };
    const { fixture } = setup(
      { ...linear, studyId: 6 },
      { getStudy: () => of(study) },
    );
    const element: HTMLElement = fixture.nativeElement;
    const links = Array.from(
      element.querySelectorAll<HTMLAnchorElement>('.detail-actions a.edit-link'),
    );

    expect(element.querySelector('.side-kicker')?.textContent?.trim()).toBe('Posizione');
    // R25 distingue posizione iniziale e albero: due azioni non ambigue.
    expect(links.map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['Configura posizione iniziale', '/positions/1/edit'],
      ['Modifica mosse', '/variants/1/edit'],
    ]);
  });

  // ISSUE-007: il toggle del motore governa da solo anche la barra.
  it('has no separate show/hide button for the evaluation bar', () => {
    const { fixture, cmp } = setup(linear);
    cmp.toggleEngine();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const labels = Array.from(el.querySelectorAll('.engine-bar button')).map((b) =>
      b.textContent?.trim(),
    );
    expect(labels.some((t) => t?.includes('barra'))).toBe(false);
    expect(cmp.showEvalBar).toBeUndefined();
  });

  it('shows the evaluation bar with the engine on and removes it when off', () => {
    const { fixture, cmp } = setup(linear);
    expect(fixture.nativeElement.querySelector('app-eval-bar')).toBeNull();
    cmp.toggleEngine();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-eval-bar')).not.toBeNull();
    cmp.toggleEngine();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-eval-bar')).toBeNull();
  });
});

// ISSUE-022: la linea migliore vive nel pannello laterale, in SAN.
describe('VariantDetail — linea migliore del motore', () => {
  /** Accende il motore e lascia partire la prima analisi (che azzera la linea). */
  function withEngineOn(v: Variant = linear) {
    const s = setup(v);
    s.cmp.toggleEngine();
    s.fixture.detectChanges();
    return s;
  }

  /** Il motore emette una PV per la posizione in analisi. */
  function emit(s: ReturnType<typeof setup>, sans: string[]) {
    s.engine.bestLine.set(sans);
    s.fixture.detectChanges();
  }

  it('renders no engine line while the engine is off', () => {
    const s = setup(linear);
    emit(s, ['e4', 'e5']);
    expect(s.fixture.nativeElement.querySelector('.engine-line')).toBeNull();
  });

  it('shows "Analisi in corso…" until the first PV arrives', () => {
    const { fixture } = withEngineOn();
    const panel: HTMLElement = fixture.nativeElement.querySelector('.engine-line');
    expect(panel.textContent).toContain('Linea migliore');
    expect(panel.querySelector('.engine-line__pending')?.textContent).toContain('Analisi in corso');
    expect(panel.querySelector('.engine-line__moves')).toBeNull();
  });

  it('renders the PV in SAN, numbered from the analysed position', () => {
    const s = withEngineOn();
    emit(s, ['e4', 'e5', 'Nf3', 'Nc6']);
    const moves: HTMLElement = s.fixture.nativeElement.querySelector('.engine-line__moves');
    expect(moves.textContent?.trim()).toBe('1. e4 e5 2. Nf3 Nc6');
    expect(moves.textContent).not.toContain('e2e4');
  });

  it('numbers from the current half move when Black is to move', () => {
    const s = withEngineOn();
    s.cmp.next(); // 1.e4 → tocca al Nero
    s.fixture.detectChanges();
    emit(s, ['e5', 'Nf3']);
    const moves: HTMLElement = s.fixture.nativeElement.querySelector('.engine-line__moves');
    expect(moves.textContent?.trim()).toBe('1… e5 2. Nf3');
  });

  it('drops the previous line when the analysed position changes', () => {
    const s = withEngineOn();
    emit(s, ['e4', 'e5']);
    expect(s.fixture.nativeElement.querySelector('.engine-line__moves')).not.toBeNull();
    s.cmp.next(); // nuova posizione: l'effetto rilancia l'analisi e azzera la linea
    s.fixture.detectChanges();
    expect(s.engine.analysed.length).toBe(2);
    expect(s.fixture.nativeElement.querySelector('.engine-line__moves')).toBeNull();
    expect(s.fixture.nativeElement.querySelector('.engine-line__pending')).not.toBeNull();
  });

  it('hides the line together with the evaluation when the engine is switched off', () => {
    const s = withEngineOn();
    emit(s, ['e4', 'e5']);
    s.cmp.toggleEngine();
    s.fixture.detectChanges();
    expect(s.fixture.nativeElement.querySelector('.engine-line')).toBeNull();
    expect(s.fixture.nativeElement.querySelector('app-eval-bar')).toBeNull();
  });

  it('empties the engine state when switching off, not just the markup', () => {
    const s = withEngineOn();
    emit(s, ['e4', 'e5']);
    s.cmp.toggleEngine();
    s.fixture.detectChanges();
    expect(s.engine.stopped).toBe(1);
    expect(s.engine.bestLine()).toEqual([]);
    expect(s.engine.evaluation()).toBeNull();
    expect(s.engine.thinking()).toBe(false);
  });

  it('restarts from the pending state, never from the previous line', () => {
    const s = withEngineOn();
    emit(s, ['e4', 'e5', 'Nf3']);
    s.cmp.toggleEngine(); // spegne
    s.fixture.detectChanges();
    s.cmp.toggleEngine(); // riaccende: l'effetto rilancia l'analisi
    s.fixture.detectChanges();

    expect(s.engine.analysed.length).toBe(2);
    expect(s.fixture.nativeElement.querySelector('.engine-line__moves')).toBeNull();
    expect(s.fixture.nativeElement.querySelector('.engine-line__pending')).not.toBeNull();

    emit(s, ['d4', 'd5']); // solo i dati della nuova analisi
    const moves: HTMLElement = s.fixture.nativeElement.querySelector('.engine-line__moves');
    expect(moves.textContent?.trim()).toBe('1. d4 d5');
  });

  it('keeps the line inside the side panel, with nothing added under the board', () => {
    const s = withEngineOn();
    emit(s, ['e4', 'e5']);
    const el: HTMLElement = s.fixture.nativeElement;
    expect(el.querySelector('.side .engine-panel .engine-line')).not.toBeNull();
    expect(el.querySelector('.board-col .engine-line')).toBeNull();
  });
});

// ISSUE-008 (R23): la navigazione replay resta ai soli quattro controlli.
describe('VariantDetail — controlli di replay senza Auto-play', () => {
  it('exposes exactly first/prev/next/last, with no auto-play control', () => {
    const { fixture, cmp } = setup(linear);
    const controls: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.controls .ctrl'),
    );
    expect(controls.length).toBe(4);
    const labels = controls.map((b) => b.getAttribute('aria-label'));
    expect(labels).toEqual([
      "Vai all'inizio",
      'Mossa precedente',
      'Mossa successiva',
      'Vai alla fine',
    ]);
    expect(fixture.nativeElement.textContent).not.toContain('Auto-play');
    expect(fixture.nativeElement.textContent).not.toContain('Pausa');
    expect(cmp.playing).toBeUndefined();
    expect(cmp.togglePlay).toBeUndefined();
  });

  it('keeps keyboard navigation with the arrow keys', () => {
    const { cmp } = setup(linear);
    cmp.onKey(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(cmp.currentPath()).toEqual([0]);
    cmp.onKey(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(cmp.currentPath()).toEqual([]);
  });
});

// ISSUE-010 (R23): pannello varianti dello studio nel dettaglio.
describe('VariantDetail — pannello varianti', () => {
  const inStudy: Variant = { ...linear, id: 1, studyId: 5 };

  const siblings: Variant[] = [
    { ...linear, id: 1, name: 'Italiana', studyId: 5 },
    { ...linear, id: 2, name: 'Siciliana', moves: ['e4', 'c5'], studyId: 5 },
  ];

  function study(variants: Variant[] | null): Study {
    return {
      id: 5,
      name: 'Repertorio',
      phase: 'OPENING',
      variantCount: variants?.length ?? 0,
      variants,
    };
  }

  function withStudy(v: Variant, variants: Variant[] | null, engine = fakeEngine()) {
    return setup(v, { getStudy: () => of(study(variants)) }, engine);
  }

  it('shows the panel when the study has an alternative variant', () => {
    const { fixture, cmp } = withStudy(inStudy, siblings);
    expect(cmp.hasVariantNav()).toBe(true);
    const nav: HTMLElement = fixture.nativeElement.querySelector('app-study-variant-nav');
    expect(nav).not.toBeNull();
    expect(nav.textContent).toContain('Siciliana');
    // La variante aperta è quella evidenziata.
    const current = nav.querySelector('[aria-current="page"]');
    expect(current?.textContent).toContain('Italiana');
  });

  it('hides the panel for a legacy variant without a study', () => {
    const { fixture, cmp } = setup(linear);
    expect(cmp.hasVariantNav()).toBe(false);
    expect(fixture.nativeElement.querySelector('app-study-variant-nav')).toBeNull();
    expect(fixture.nativeElement.querySelector('.variants-toggle')).toBeNull();
  });

  it('hides the panel when the study has no alternative', () => {
    const { cmp } = withStudy(inStudy, [siblings[0]]);
    expect(cmp.hasVariantNav()).toBe(false);
  });

  it('hides the panel when the study response does not contain the open variant', () => {
    const { cmp } = withStudy(inStudy, [siblings[1], { ...siblings[1], id: 3 }]);
    expect(cmp.studyVariants().length).toBe(2);
    expect(cmp.hasVariantNav()).toBe(false);
  });

  it('hides the panel when the study response carries no variants', () => {
    const { cmp } = withStudy(inStudy, null);
    expect(cmp.hasVariantNav()).toBe(false);
  });

  it('navigates immediately to the selected variant and closes the drawer', () => {
    const { fixture, cmp } = withStudy(inStudy, siblings);
    const router = TestBed.inject(Router);
    let navTarget: string | null = null;
    router.navigateByUrl = ((url: string) => { navTarget = url; return Promise.resolve(true); }) as typeof router.navigateByUrl;

    cmp.toggleVariants();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.variant-drawer')).not.toBeNull();

    cmp.goToVariant(2);
    fixture.detectChanges();
    expect(navTarget).toBe('/variants/2');
    expect(cmp.variantsOpen()).toBe(false);
    expect(fixture.nativeElement.querySelector('.variant-drawer')).toBeNull();
  });

  it('does not navigate when the open variant is selected again', () => {
    const { cmp } = withStudy(inStudy, siblings);
    const router = TestBed.inject(Router);
    let calls = 0;
    router.navigateByUrl = (() => { calls++; return Promise.resolve(true); }) as typeof router.navigateByUrl;
    cmp.toggleVariants();
    cmp.goToVariant(1);
    expect(calls).toBe(0);
    expect(cmp.variantsOpen()).toBe(false);
  });

  it('renders the drawer outside the board column, adding nothing under the board', () => {
    const { fixture, cmp } = withStudy(inStudy, siblings);
    cmp.toggleVariants();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.board-col app-study-variant-nav')).toBeNull();
    expect(el.querySelector('.detail > .variant-rail')).not.toBeNull();
  });
});

// ISSUE-010 (R23): il componente è riusato quando cambia solo `:id`.
describe('VariantDetail — reazione al cambio di parametro', () => {
  const first: Variant = { ...linear, id: 1, name: 'Italiana', studyId: 5 };
  const second: Variant = {
    ...linear,
    id: 2,
    name: 'Siciliana',
    moves: ['e4', 'c5'],
    tree: undefined,
    studyId: 5,
  };
  const study: Study = {
    id: 5,
    name: 'Repertorio',
    phase: 'OPENING',
    variantCount: 2,
    variants: [first, second],
  };

  function withRoute(engine = fakeEngine()) {
    return setup(
      first,
      { getStudy: () => of(study) },
      engine,
      { getVariant: (id: number) => of(id === 1 ? first : second) },
    );
  }

  it('reloads the variant and resets the move path', () => {
    const s = withRoute();
    s.cmp.last();
    expect(s.cmp.currentPath().length).toBe(4);

    s.navigateTo(2);

    expect(s.cmp.variant().id).toBe(2);
    expect(s.cmp.mainlineLength()).toBe(2);
    expect(s.cmp.currentPath()).toEqual([]);
    expect(s.fixture.nativeElement.querySelector('.side-title')?.textContent).toContain('Siciliana');
  });

  it('closes the drawer after a successful navigation', () => {
    const s = withRoute();
    s.cmp.toggleVariants();
    expect(s.cmp.variantsOpen()).toBe(true);
    s.navigateTo(2);
    expect(s.cmp.variantsOpen()).toBe(false);
    expect(s.fixture.nativeElement.querySelector('.variant-drawer')).toBeNull();
  });

  it('restarts the analysis on the new variant, emptying evaluation and PV', () => {
    const s = withRoute();
    s.cmp.toggleEngine();
    s.fixture.detectChanges();
    s.engine.bestLine.set(['e4', 'e5']);
    s.engine.evaluation.set({ depth: 12, scoreCp: 30, mate: null, pv: ['e2e4'] });
    s.fixture.detectChanges();
    expect(s.fixture.nativeElement.querySelector('.engine-line__moves')).not.toBeNull();

    s.navigateTo(2);

    // Il toggle resta acceso, ma i dati mostrati sono solo quelli della nuova analisi.
    expect(s.cmp.engineOn()).toBe(true);
    expect(s.engine.analysed.length).toBe(2);
    expect(s.engine.bestLine()).toEqual([]);
    expect(s.engine.evaluation()).toBeNull();
    expect(s.fixture.nativeElement.querySelector('.engine-line__moves')).toBeNull();
    expect(s.fixture.nativeElement.querySelector('.engine-line__pending')).not.toBeNull();
  });
});

// P1 R23: al cambio rapido di `:id` una risposta della variante precedente non
// deve più poter sovrascrivere lo stato di quella corrente.
describe('VariantDetail — risposte HTTP fuori ordine', () => {
  const first: Variant = { ...linear, id: 1, name: 'Italiana', studyId: 5 };
  const second: Variant = {
    ...linear,
    id: 2,
    name: 'Siciliana',
    moves: ['e4', 'c5'],
    studyId: 6,
  };

  interface Pending<T> {
    arg: number;
    subject: Subject<T>;
  }

  /** Servizio che non risponde subito: ogni chiamata ha un canale tutto suo. */
  function deferred<T>(calls: Pending<T>[]): (arg: number) => Subject<T> {
    return (arg: number) => {
      const subject = new Subject<T>();
      calls.push({ arg, subject });
      return subject;
    };
  }

  function study(id: number, phase: Study['phase'], variants: Variant[]): Study {
    return { id, name: `Studio ${id}`, phase, variantCount: variants.length, variants };
  }

  function schedule(variantId: number): ReviewSchedule {
    return {
      variantId,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 1,
      nextReviewDate: '2026-08-08',
      due: false,
    };
  }

  /** Dettaglio aperto sulla variante 1, con tutte le letture ancora in volo. */
  function controlled() {
    const variantCalls: Pending<Variant>[] = [];
    const studyCalls: Pending<Study>[] = [];
    const reviewCalls: Pending<ReviewSchedule | null>[] = [];
    const s = setup(
      first,
      { getStudy: deferred(studyCalls) },
      fakeEngine(),
      { getVariant: deferred(variantCalls) },
      { getForVariant: deferred(reviewCalls) },
    );
    return { ...s, variantCalls, studyCalls, reviewCalls };
  }

  it('keeps the current variant when the previous response arrives later', () => {
    const s = controlled();
    expect(s.variantCalls.map((c) => c.arg)).toEqual([1]);

    s.navigateTo(2);
    expect(s.variantCalls.map((c) => c.arg)).toEqual([1, 2]);

    // Risposte in ordine inverso: prima la richiesta più recente…
    s.variantCalls[1].subject.next(second);
    s.fixture.detectChanges();
    expect(s.cmp.variant().id).toBe(2);

    // …poi quella ormai sorpassata, che non deve entrare nello stato.
    s.variantCalls[0].subject.next(first);
    s.fixture.detectChanges();

    expect(s.cmp.variant().id).toBe(2);
    expect(s.cmp.mainlineLength()).toBe(2);
    expect(s.fixture.nativeElement.querySelector('.side-title')?.textContent).toContain(
      'Siciliana',
    );
  });

  it('ignores study and review responses of the variant left behind', () => {
    const s = controlled();
    // La prima variante risponde: parte la lettura del suo studio…
    s.variantCalls[0].subject.next(first);
    s.fixture.detectChanges();
    expect(s.studyCalls.map((c) => c.arg)).toEqual([5]);

    // …ma l'utente cambia variante prima che lo studio abbia risposto.
    s.navigateTo(2);
    s.variantCalls[1].subject.next(second);
    s.fixture.detectChanges();
    expect(s.studyCalls.map((c) => c.arg)).toEqual([5, 6]);

    // Prima le letture dipendenti della variante corrente…
    s.studyCalls[1].subject.next(study(6, 'MIDDLEGAME', [second, { ...second, id: 3 }]));
    s.reviewCalls[1].subject.next(schedule(2));
    s.fixture.detectChanges();

    // …poi quelle in ritardo della precedente: devono essere scartate.
    s.studyCalls[0].subject.next(study(5, 'OPENING', [first]));
    s.reviewCalls[0].subject.next(schedule(1));
    s.fixture.detectChanges();

    expect(s.cmp.isOpening()).toBe(false);
    expect(s.cmp.studyVariants().map((v: Variant) => v.id)).toEqual([2, 3]);
    expect(s.cmp.review().variantId).toBe(2);
  });

  it('does not surface the error of a request already superseded', () => {
    const s = controlled();
    s.navigateTo(2);
    s.variantCalls[1].subject.next(second);
    s.fixture.detectChanges();

    s.variantCalls[0].subject.error(new Error('404'));
    s.reviewCalls[0].subject.error(new Error('500'));
    s.fixture.detectChanges();

    expect(s.cmp.error()).toBeNull();
    expect(s.cmp.variant().id).toBe(2);
  });
});

describe('VariantDetail (Mediogioco, ISSUE-016)', () => {
  const CUSTOM_FEN = '4k3/8/8/3pP3/8/8/8/4K3 w - - 0 1';

  const position: Variant = {
    id: 41,
    name: 'Centro bloccato',
    color: 'WHITE',
    moves: ['Ke2'],
    startingFen: CUSTOM_FEN,
    studyId: 6,
    tree: [{ san: 'Ke2', comment: 'Il re va al centro', nag: '!', children: [] }],
  };

  const sibling: Variant = {
    id: 42,
    name: 'Maggioranza in ala',
    color: 'WHITE',
    moves: [],
    tree: [],
    startingFen: CUSTOM_FEN,
    studyId: 6,
  };

  function study(phase: Study['phase'], variants: Variant[] | null = [position, sibling]): Study {
    return {
      id: 6,
      name: 'Strutture di pedoni',
      phase,
      variantCount: variants?.length ?? 0,
      variants,
    };
  }

  /** Dettaglio montato sotto `/middlegame/positions/:id`. */
  function middlegame(
    v: Variant,
    studyService: Partial<StudyService> = { getStudy: () => of(study('MIDDLEGAME')) },
    engine = fakeEngine(),
    reviewService: Partial<ReviewService> = { getForVariant: () => of(null) },
    variantService: Partial<VariantService> = { getVariant: () => of(v) },
    ui: {
      confirmResult?: boolean;
      success?: (text: string) => void;
      error?: (text: string) => void;
    } = {},
  ) {
    const s = setup(
      v,
      studyService,
      engine,
      variantService,
      reviewService,
      { [SECTION_CONTEXT_DATA]: MIDDLEGAME_SECTION_CONTEXT },
      ui,
    );
    return { ...s, el: s.fixture.nativeElement as HTMLElement };
  }

  function hrefs(el: HTMLElement): string[] {
    return Array.from(el.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '');
  }

  it('hides the saved analysis until the user explicitly reveals it', () => {
    const { cmp, el, fixture } = middlegame(position);
    expect(cmp.error()).toBeNull();
    expect(cmp.currentFen()).toBe(CUSTOM_FEN);
    expect(el.querySelector('.side-kicker')?.textContent?.trim()).toBe('Posizione');
    expect(el.querySelector('.side-title')?.textContent).toContain('Centro bloccato');
    expect(cmp.analysisVisible()).toBe(false);
    expect(el.querySelector('.move')).toBeNull();
    expect(el.querySelector('.controls')).toBeNull();
    expect(el.querySelector('.reveal-analysis')?.textContent).toContain('Mostra analisi');

    cmp.revealAnalysis();
    fixture.detectChanges();

    expect(cmp.analysisVisible()).toBe(true);
    expect(el.querySelector('.move')?.textContent).toContain('Ke2');
    expect(el.querySelector('.move-nag')?.textContent).toContain('!');
    expect(el.querySelector('.move-comment')?.textContent).toContain('Il re va al centro');
    // Il lato non e' un dato della posizione: nessun badge di colore.
    expect(el.querySelector('.side-head .badge')).toBeNull();
  });

  it('shows a canonical breadcrumb after the parent study is verified', () => {
    const { el } = middlegame(position);
    const crumbs = Array.from(el.querySelectorAll<HTMLAnchorElement>('.crumbs a'));
    expect(crumbs.map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['Mediogioco', '/middlegame'],
      ['Strutture di pedoni', '/middlegame/studies/6'],
    ]);
    expect(el.querySelector('.crumb-current')?.textContent?.trim()).toBe('Centro bloccato');
  });

  it('does not present the position while the parent phase is still pending', () => {
    const pendingStudy = new Subject<Study>();
    const { cmp, el, fixture } = middlegame(position, {
      getStudy: () => pendingStudy.asObservable(),
    });

    expect(cmp.sectionChecking()).toBe(true);
    expect(cmp.variant()).toBeNull();
    expect(el.querySelector('.detail')).toBeNull();
    expect(el.querySelector('app-chessboard')).toBeNull();
    expect(el.querySelector('.engine-sub')).toBeNull();
    expect(el.querySelector('.train-cta')).toBeNull();
    expect(el.textContent).toContain('Verifica della sezione');

    pendingStudy.next(study('MIDDLEGAME'));
    pendingStudy.complete();
    fixture.detectChanges();

    expect(cmp.sectionChecking()).toBe(false);
    expect(cmp.variant()?.id).toBe(41);
    expect(el.querySelector('.detail')).not.toBeNull();
  });

  it('never presents a delayed response belonging to the wrong phase', () => {
    const pendingStudy = new Subject<Study>();
    const { cmp, el, fixture } = middlegame(position, {
      getStudy: () => pendingStudy.asObservable(),
    });

    expect(el.querySelector('.detail')).toBeNull();
    pendingStudy.next(study('OPENING'));
    pendingStudy.complete();
    fixture.detectChanges();

    expect(cmp.variant()).toBeNull();
    expect(cmp.sectionVerified()).toBe(false);
    expect(el.querySelector('.detail')).toBeNull();
    expect(el.querySelector('.detail-error')?.textContent).toContain(
      'non appartiene alla sezione Mediogioco',
    );
  });

  it('stays usable with an empty tree, on its own starting FEN', () => {
    const { cmp, el } = middlegame(sibling);
    expect(cmp.error()).toBeNull();
    expect(cmp.currentFen()).toBe(CUSTOM_FEN);
    expect(cmp.tokens().length).toBe(0);
    expect(el.querySelector('.panel-note')?.textContent).toContain('Nessuna analisi salvata');
    expect(el.querySelector('.reveal-analysis')).toBeNull();
    expect(el.querySelector('.controls')).toBeNull();
  });

  it('hides the analysis again when a different route id is loaded', () => {
    const { cmp, el, fixture, navigateTo } = middlegame(position);
    cmp.revealAnalysis();
    fixture.detectChanges();
    expect(el.querySelector('.move')).not.toBeNull();

    navigateTo(42);

    expect(cmp.analysisVisible()).toBe(false);
    expect(el.querySelector('.move')).toBeNull();
    expect(el.querySelector('.reveal-analysis')).not.toBeNull();
  });

  it('does not let keyboard or navigation commands advance a hidden line', () => {
    const { cmp } = middlegame(position);
    cmp.next();
    cmp.last();
    cmp.goTo([0]);
    cmp.onKey(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(cmp.currentPath()).toEqual([]);
  });

  it('offers the two distinct editors on canonical routes', () => {
    const { el } = middlegame(position);
    const links = Array.from(
      el.querySelectorAll<HTMLAnchorElement>('.detail-actions a.edit-link'),
    );
    expect(links.map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['Configura posizione iniziale', '/middlegame/positions/41/setup'],
      ['Modifica mosse', '/middlegame/positions/41/edit'],
    ]);
    expect(el.querySelector('.edit-link--danger')?.textContent).toContain('Elimina posizione');
  });

  it('deletes the position and returns to its parent study only after success', async () => {
    let deletedId: number | null = null;
    let successMessage = '';
    const { cmp } = middlegame(
      position,
      undefined,
      undefined,
      undefined,
      {
        getVariant: () => of(position),
        deleteVariant: (id: number) => {
          deletedId = id;
          return of(void 0);
        },
      },
      { success: (text) => (successMessage = text) },
    );
    const router = TestBed.inject(Router);
    let navTarget: string | null = null;
    router.navigateByUrl = ((url: string) => {
      navTarget = url;
      return Promise.resolve(true);
    }) as typeof router.navigateByUrl;

    await cmp.removePosition();

    expect(deletedId).toBe(41);
    expect(successMessage).toBe('Posizione eliminata.');
    expect(navTarget).toBe('/middlegame/studies/6');
  });

  it('keeps the position when deletion is cancelled', async () => {
    let deleteCalls = 0;
    const { cmp } = middlegame(
      position,
      undefined,
      undefined,
      undefined,
      {
        getVariant: () => of(position),
        deleteVariant: () => {
          deleteCalls++;
          return of(void 0);
        },
      },
      { confirmResult: false },
    );
    const router = TestBed.inject(Router);
    let navCalls = 0;
    router.navigateByUrl = (() => {
      navCalls++;
      return Promise.resolve(true);
    }) as typeof router.navigateByUrl;

    await cmp.removePosition();

    expect(deleteCalls).toBe(0);
    expect(navCalls).toBe(0);
  });

  it('stays on the detail and reports an error when deletion fails', async () => {
    let errorMessage = '';
    const { cmp } = middlegame(
      position,
      undefined,
      undefined,
      undefined,
      {
        getVariant: () => of(position),
        deleteVariant: () => throwError(() => new Error('500')),
      },
      { error: (text) => (errorMessage = text) },
    );
    const router = TestBed.inject(Router);
    let navCalls = 0;
    router.navigateByUrl = (() => {
      navCalls++;
      return Promise.resolve(true);
    }) as typeof router.navigateByUrl;

    await cmp.removePosition();

    expect(cmp.deletingPosition()).toBe(false);
    expect(errorMessage).toBe('Eliminazione non riuscita.');
    expect(navCalls).toBe(0);
  });

  it('returns to its study inside the section', () => {
    const { el } = middlegame(position);
    const back = el.querySelector<HTMLAnchorElement>('.back-link');
    expect(back?.textContent).toContain('Torna allo studio');
    expect(back?.getAttribute('href')).toBe('/middlegame/studies/6');
    expect(
      hrefs(el).every((h) => h === '/middlegame' || h.startsWith('/middlegame/')),
    ).toBe(true);
  });

  it('navigates to a sibling position without leaving the section', () => {
    const { cmp } = middlegame(position);
    const router = TestBed.inject(Router);
    let navTarget: string | null = null;
    router.navigateByUrl = ((url: string) => {
      navTarget = url;
      return Promise.resolve(true);
    }) as typeof router.navigateByUrl;

    expect(cmp.hasVariantNav()).toBe(true);
    cmp.goToVariant(42);
    expect(navTarget).toBe('/middlegame/positions/42');
  });

  it('refuses a variant of an opening study', () => {
    const { cmp, el } = middlegame({ ...position, studyId: 5 }, {
      getStudy: () => of(study('OPENING')),
    });
    expect(cmp.variant()).toBeNull();
    expect(el.querySelector('.detail-error')?.textContent).toContain(
      'non appartiene alla sezione Mediogioco',
    );
    expect(el.querySelector('app-chessboard')).toBeNull();
    expect(el.querySelector<HTMLAnchorElement>('.detail-error a')?.getAttribute('href')).toBe(
      '/middlegame',
    );
  });

  it('refuses a position of an endgame study', () => {
    const { cmp, el } = middlegame(position, { getStudy: () => of(study('ENDGAME')) });
    expect(cmp.variant()).toBeNull();
    expect(el.querySelector('.detail-error')?.textContent).toContain(
      'non appartiene alla sezione Mediogioco',
    );
  });

  it('refuses a position without a parent study', () => {
    const { cmp, el } = middlegame({ ...position, studyId: null });
    expect(cmp.variant()).toBeNull();
    expect(el.querySelector('.detail-error')?.textContent).toContain('non appartiene a uno studio');
  });

  it('refuses the position when its study cannot be read', () => {
    const { cmp } = middlegame(position, { getStudy: () => throwError(() => new Error('500')) });
    expect(cmp.variant()).toBeNull();
    expect(cmp.error()).toContain('Studio della posizione non trovato');
  });

  it('has no training, review, stats or play command (ISSUE-016)', () => {
    let reviewCalls = 0;
    const { el } = middlegame(position, undefined, fakeEngine(), {
      getForVariant: () => {
        reviewCalls++;
        return of(null);
      },
    });
    const text = el.textContent ?? '';
    expect(text).not.toContain('Allena');
    expect(text).not.toContain('Statistiche');
    expect(text).not.toContain('Ripeti');
    expect(text).not.toContain('Gioca contro il computer');
    expect(el.querySelector('.train-cta')).toBeNull();
    expect(el.querySelector('.review-hint')).toBeNull();
    expect(el.querySelector('.engine-sub')).toBeNull();
    // Una posizione non si ripete: nessuna richiesta di schedule (R26).
    expect(reviewCalls).toBe(0);
  });

  it('keeps the Stockfish analysis, bar and best line', () => {
    const engine = fakeEngine();
    const { cmp, el, fixture } = middlegame(position, undefined, engine);
    expect(el.querySelector('.engine-toggle')).not.toBeNull();

    cmp.toggleEngine();
    fixture.detectChanges();
    expect(engine.analysed).toEqual([CUSTOM_FEN]);
    expect(el.querySelector('app-eval-bar')).not.toBeNull();
    expect(el.querySelector('.engine-line')).not.toBeNull();
  });

  it('shows the assigned theme, difficulty and notes of a regularized position (R26.3)', () => {
    const themed: Variant = {
      ...position,
      themeId: 1001,
      theme: { id: 1001, code: 'DOUBLE_ATTACK', studyType: 'TACTICAL', displayLabel: 'doppio attacco', displayOrder: 1 },
      themeDescription: 'Debolezza in f7',
      description: 'Il nero ha appena giocato Ce7?!',
      difficulty: 'ADVANCED',
      source: 'Partita personale',
    };
    const { el } = middlegame(themed, undefined, undefined, undefined, { getVariant: () => of(themed) });
    expect(el.querySelector('.theme-chip')?.textContent?.trim()).toBe('doppio attacco');
    expect(el.querySelector('.difficulty-chip')?.textContent?.trim()).toBe('Avanzata');
    expect(el.textContent).toContain('Debolezza in f7');
    expect(el.textContent).toContain('Il nero ha appena giocato Ce7?!');
    expect(el.textContent).toContain('Fonte: Partita personale');
  });

  it('labels a legacy position without a theme as "Tema da assegnare" (R26.3, task 5.4)', () => {
    const legacy: Variant = { ...sibling, themeId: null, theme: null };
    const { el } = middlegame(legacy, undefined, undefined, undefined, { getVariant: () => of(legacy) });
    expect(el.querySelector('.theme-chip--missing')?.textContent?.trim()).toBe('Tema da assegnare');
    // Consultazione e azioni restano disponibili: nessun blocco (task 5.4).
    expect(el.querySelector('.edit-link')).not.toBeNull();
    expect(el.querySelector('a.back-link')).not.toBeNull();
  });

  it('shows the attempts summary: last outcome, count and last understood date (task 5.6)', () => {
    const { el } = middlegame(position, undefined, undefined, undefined, {
      getVariant: () => of(position),
      getAttempts: () =>
        of([
          { id: 2, variantId: 41, outcome: 'UNDERSTOOD', occurredAt: '2026-06-02T10:00:00Z' },
          { id: 1, variantId: 41, outcome: 'FAILED', occurredAt: '2026-06-01T10:00:00Z' },
        ]),
    });
    expect(el.textContent).toContain('Compresa');
    expect(el.textContent).toContain('2 tentativi');
    expect(el.textContent).toContain('Ultima comprensione: 02/06/2026');
  });

  it('shows "Mai tentata" for a position with no recorded attempts, without a percentage', () => {
    const { el } = middlegame(sibling, undefined, undefined, undefined, {
      getVariant: () => of(sibling),
      getAttempts: () => of([]),
    });
    expect(el.textContent).toContain('Mai tentata');
    expect(el.textContent).not.toContain('%');
  });

  it('shows the guided-study CTA for a classified, themed, non-draft position (R26.3, task 1.5)', () => {
    const themedPosition: Variant = {
      ...position,
      themeId: 1001,
      theme: {
        id: 1001,
        code: 'KING_ATTACK',
        studyType: 'TACTICAL',
        displayLabel: 'attacco al re',
        displayOrder: 1,
      },
      eligibleForGuidedStudy: true,
    };
    const { el } = middlegame(
      themedPosition,
      { getStudy: () => of({ ...study('MIDDLEGAME'), studyType: 'TACTICAL' }) },
      undefined,
      undefined,
      { getVariant: () => of(themedPosition) },
    );
    const cta = el.querySelector<HTMLAnchorElement>('a.train-cta');
    expect(cta?.textContent).toContain('Studia questa posizione');
    expect(cta?.getAttribute('href')).toBe('/middlegame/positions/41/study');
  });

  it('hides the guided-study CTA when the parent study is not classified (R26.3, task 1.5)', () => {
    const themedPosition: Variant = {
      ...position,
      themeId: 1001,
      theme: {
        id: 1001,
        code: 'KING_ATTACK',
        studyType: 'TACTICAL',
        displayLabel: 'attacco al re',
        displayOrder: 1,
      },
      eligibleForGuidedStudy: true,
    };
    // Studio «Da classificare»: la fixture di sezione predefinita non valorizza `studyType`.
    const { el } = middlegame(themedPosition, undefined, undefined, undefined, {
      getVariant: () => of(themedPosition),
    });
    expect(el.querySelector('a.train-cta')).toBeNull();
  });

  it('hides the guided-study CTA when the position has no assigned theme (R26.3, task 1.5)', () => {
    const { el } = middlegame(
      position,
      { getStudy: () => of({ ...study('MIDDLEGAME'), studyType: 'TACTICAL' }) },
      undefined,
      undefined,
      { getVariant: () => of(position) },
    );
    expect(el.querySelector('a.train-cta')).toBeNull();
  });

  it('hides the guided-study CTA for a draft position without moves (R26.3, task 1.5)', () => {
    const draftThemed: Variant = {
      ...sibling,
      themeId: 1001,
      theme: {
        id: 1001,
        code: 'KING_ATTACK',
        studyType: 'TACTICAL',
        displayLabel: 'attacco al re',
        displayOrder: 1,
      },
      moves: [],
      tree: [],
      eligibleForGuidedStudy: false,
    };
    const { el } = middlegame(
      draftThemed,
      { getStudy: () => of({ ...study('MIDDLEGAME'), studyType: 'TACTICAL' }) },
      undefined,
      undefined,
      { getVariant: () => of(draftThemed) },
    );
    expect(el.querySelector('a.train-cta')).toBeNull();
  });

  it('keeps play, training, review and stats for an opening variant', () => {
    const openingStudy: Study = { id: 5, name: 'Repertorio', phase: 'OPENING', variantCount: 1 };
    const schedule: ReviewSchedule = {
      variantId: 1,
      easeFactor: 2.5,
      intervalDays: 3,
      repetitions: 2,
      nextReviewDate: '2099-01-01',
      due: false,
    };
    const { fixture } = setup(
      { ...linear, studyId: 5 },
      { getStudy: () => of(openingStudy) },
      fakeEngine(),
      { getVariant: () => of({ ...linear, studyId: 5 }) },
      { getForVariant: () => of(schedule) },
    );
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.move')).not.toBeNull();
    expect(el.querySelector('.reveal-analysis')).toBeNull();
    expect(el.querySelector('.engine-sub')?.textContent).toContain('Gioca contro il computer');
    expect(el.querySelector('.train-cta')?.getAttribute('href')).toBe('/variants/1/train');
    expect(el.querySelector('.review-hint')).not.toBeNull();
    // Nessun dato Mediogioco (tema/difficoltà/tentativi) su una variante di
    // apertura (regressione R26.3).
    expect(el.querySelector('.position-meta')).toBeNull();
    expect(el.querySelector('.attempts-summary')).toBeNull();
    const actions = Array.from(
      el.querySelectorAll<HTMLAnchorElement>('.detail-actions a.edit-link'),
    );
    expect(actions.map((a) => a.getAttribute('href'))).toEqual([
      '/variants/1/edit',
      '/variants/1/stats',
    ]);
    expect(el.querySelector('.back-link')?.getAttribute('href')).toBe('/studies/5');
  });
});

describe('VariantDetail (perimetro dello studio guidato, R26.3 task 8.4)', () => {
  const CUSTOM_FEN = '4k3/8/8/3pP3/8/8/8/4K3 w - - 0 1';

  const eligible: Variant = {
    id: 41,
    name: 'Centro bloccato',
    color: 'WHITE',
    moves: ['Ke2'],
    tree: [{ san: 'Ke2', children: [] }],
    startingFen: CUSTOM_FEN,
    studyId: 6,
    themeId: 1001,
    eligibleForGuidedStudy: true,
  };

  function studyOf(phase: Study['phase'], overrides: Partial<Study> = {}): Study {
    return {
      id: 6,
      name: 'Strutture di pedoni',
      phase,
      studyType: 'TACTICAL',
      variantCount: 1,
      variants: [eligible],
      ...overrides,
    };
  }

  function guidedLinks(el: HTMLElement): string[] {
    return Array.from(el.querySelectorAll('a'))
      .map((a) => a.getAttribute('href') ?? '')
      .filter((h) => h.endsWith('/study'));
  }

  it('offers the manual guided study on an eligible middlegame position', () => {
    const { fixture } = setup(
      eligible,
      { getStudy: () => of(studyOf('MIDDLEGAME')) },
      fakeEngine(),
      { getVariant: () => of(eligible) },
      { getForVariant: () => of(null) },
      { [SECTION_CONTEXT_DATA]: MIDDLEGAME_SECTION_CONTEXT },
    );
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Studia questa posizione');
    expect(guidedLinks(el)).toEqual(['/middlegame/positions/41/study']);
  });

  it('does not offer the manual guided study for an unclassified study or a themeless position', () => {
    for (const [study, position] of [
      [studyOf('MIDDLEGAME', { studyType: null }), eligible],
      [studyOf('MIDDLEGAME'), { ...eligible, themeId: null }],
      [studyOf('MIDDLEGAME'), { ...eligible, moves: [], tree: [] }],
    ] as [Study, Variant][]) {
      // Tre montaggi nello stesso `it`: il modulo va resettato fra l'uno e l'altro.
      TestBed.resetTestingModule();
      const { fixture } = setup(
        position,
        { getStudy: () => of(study) },
        fakeEngine(),
        { getVariant: () => of(position) },
        { getForVariant: () => of(null) },
        { [SECTION_CONTEXT_DATA]: MIDDLEGAME_SECTION_CONTEXT },
      );
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).not.toContain('Studia questa posizione');
      expect(guidedLinks(el)).toEqual([]);
    }
  });

  it('never offers the guided study on an opening variant, keeping training and review', () => {
    const opening: Variant = {
      id: 11,
      name: 'Italiana',
      color: 'WHITE',
      moves: ['e4', 'e5'],
      startingFen: '',
      studyId: 1,
      themeId: 1001,
      eligibleForGuidedStudy: true,
    };
    const { fixture } = setup(opening, {
      getStudy: () => of({ id: 1, name: 'Repertorio', phase: 'OPENING', variantCount: 1, variants: [opening] } as Study),
    });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).not.toContain('Studia questa posizione');
    expect(guidedLinks(el)).toEqual([]);
    // Le Aperture conservano il proprio comando di allenamento (R26.3, task 8.4).
    expect(el.textContent).toContain('Allena questa variante');
  });
});
