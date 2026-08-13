import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { VariantDetail } from './variant-detail';
import { VariantService } from '../core/variant.service';
import { ReviewService } from '../core/review.service';
import { StockfishService } from '../core/stockfish.service';
import { StudyService } from '../core/study.service';
import { UciScore } from '../core/uci';
import { Variant } from '../core/variant.model';
import { Study } from '../core/study.model';
import { ReviewSchedule } from '../core/review.model';

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
) {
  const paramMap = new BehaviorSubject(convertToParamMap({ id: String(v.id) }));
  TestBed.configureTestingModule({
    imports: [VariantDetail],
    providers: [
      provideRouter([]),
      { provide: VariantService, useValue: variantService },
      { provide: ReviewService, useValue: reviewService },
      { provide: StockfishService, useValue: engine },
      { provide: StudyService, useValue: studyService },
      {
        provide: ActivatedRoute,
        useValue: { paramMap, snapshot: { paramMap: paramMap.value } },
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

  it('labels a non-opening child as a position and opens its FEN editor', () => {
    const study: Study = { id: 6, name: 'Mediogioco', phase: 'MIDDLEGAME', variantCount: 1 };
    const { fixture } = setup(
      { ...linear, studyId: 6 },
      { getStudy: () => of(study) },
    );
    const element: HTMLElement = fixture.nativeElement;
    const edit = element.querySelector('.detail-actions .edit-link') as HTMLAnchorElement;

    expect(element.querySelector('.side-kicker')?.textContent?.trim()).toBe('Posizione');
    expect(edit.textContent).toContain('Modifica posizione');
    expect(edit.getAttribute('href')).toBe('/positions/1/edit');
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
    let navTarget: unknown[] | null = null;
    router.navigate = ((c: unknown[]) => { navTarget = c; return Promise.resolve(true); }) as typeof router.navigate;

    cmp.toggleVariants();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.variant-drawer')).not.toBeNull();

    cmp.goToVariant(2);
    fixture.detectChanges();
    expect(navTarget).toEqual(['/variants', 2]);
    expect(cmp.variantsOpen()).toBe(false);
    expect(fixture.nativeElement.querySelector('.variant-drawer')).toBeNull();
  });

  it('does not navigate when the open variant is selected again', () => {
    const { cmp } = withStudy(inStudy, siblings);
    const router = TestBed.inject(Router);
    let calls = 0;
    router.navigate = (() => { calls++; return Promise.resolve(true); }) as typeof router.navigate;
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
