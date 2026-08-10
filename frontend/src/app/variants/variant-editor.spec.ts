import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { VariantEditor } from './variant-editor';
import { VariantService } from '../core/variant.service';
import { StockfishService } from '../core/stockfish.service';
import { StudyService } from '../core/study.service';
import { UciScore } from '../core/uci';
import { CreateVariantRequest, Variant } from '../core/variant.model';
import { Study } from '../core/study.model';
import { MoveMade } from '../chessboard/chessboard';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function move(san: string): MoveMade {
  return { san, from: '', to: '', fen: '' };
}

/**
 * Doppio del motore: niente Web Worker nei test. `analyse`/`stop` replicano il
 * contratto reale di `StockfishService` — entrambi svuotano valutazione e linea,
 * così un riavvio mancato è osservabile nei test.
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
  service: Partial<VariantService>,
  routeId?: number,
  studyService: Partial<StudyService> = {},
  queryParams: Record<string, string> = {},
  confirmService: Partial<ConfirmService> = { ask: () => Promise.resolve(true) },
  engine = fakeEngine(),
) {
  const paramMap = new BehaviorSubject(convertToParamMap(routeId ? { id: String(routeId) } : {}));
  TestBed.configureTestingModule({
    imports: [VariantEditor],
    providers: [
      provideRouter([]),
      { provide: VariantService, useValue: service },
      { provide: StockfishService, useValue: engine },
      { provide: StudyService, useValue: studyService },
      { provide: ConfirmService, useValue: confirmService },
      { provide: ToastService, useValue: { success() {}, error() {}, info() {} } },
      {
        provide: ActivatedRoute,
        useValue: {
          paramMap,
          snapshot: {
            paramMap: paramMap.value,
            queryParamMap: convertToParamMap(queryParams),
          },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(VariantEditor);
  fixture.detectChanges();
  /** Simula il cambio di `:id` con lo stesso componente riusato da Angular. */
  const navigateTo = (id: number) => {
    paramMap.next(convertToParamMap({ id: String(id) }));
    fixture.detectChanges();
  };
  return { fixture, cmp: fixture.componentInstance as any, engine, navigateTo };
}

describe('VariantEditor', () => {
  it('plays moves building the mainline', () => {
    const { cmp } = setup({});
    cmp.onMove(move('e4'));
    cmp.onMove(move('e5'));
    cmp.onMove(move('Nf3'));
    expect(cmp.currentPath()).toEqual([0, 0, 0]);
    expect(cmp.tree()[0].san).toBe('e4');
    expect(cmp.tree()[0].children[0].san).toBe('e5');
    expect(cmp.tree()[0].children[0].children[0].san).toBe('Nf3');
  });

  it('creates a variation when playing a different move at a position', () => {
    const { cmp } = setup({});
    cmp.onMove(move('e4'));
    cmp.onMove(move('e5'));
    cmp.goTo([0]); // dopo e4
    cmp.onMove(move('c5'));
    expect(cmp.tree()[0].children.length).toBe(2);
    expect(cmp.tree()[0].children[1].san).toBe('c5');
    expect(cmp.currentPath()).toEqual([0, 1]);
  });

  it('follows an existing child instead of duplicating it', () => {
    const { cmp } = setup({});
    cmp.onMove(move('e4'));
    cmp.onMove(move('e5'));
    cmp.first();
    cmp.onMove(move('e4'));
    expect(cmp.tree().length).toBe(1);
    expect(cmp.currentPath()).toEqual([0]);
  });

  it('deletes a leaf node without confirmation', () => {
    const { cmp } = setup({});
    cmp.onMove(move('e4'));
    cmp.onMove(move('e5'));
    cmp.deleteCurrent();
    expect(cmp.confirmingDelete()).toBe(false);
    expect(cmp.tree()[0].children.length).toBe(0);
    expect(cmp.currentPath()).toEqual([0]);
  });

  it('asks confirmation before deleting a subtree, then deletes on confirm', () => {
    const { cmp } = setup({});
    cmp.onMove(move('e4'));
    cmp.onMove(move('e5'));
    cmp.onMove(move('Nf3'));
    cmp.goTo([0]); // su e4, che ha un sottoalbero
    cmp.deleteCurrent();
    expect(cmp.confirmingDelete()).toBe(true);
    expect(cmp.tree().length).toBe(1); // non ancora cancellato
    cmp.confirmDelete();
    expect(cmp.confirmingDelete()).toBe(false);
    expect(cmp.tree().length).toBe(0);
  });

  it('cancels a pending subtree deletion', () => {
    const { cmp } = setup({});
    cmp.onMove(move('e4'));
    cmp.onMove(move('e5'));
    cmp.goTo([0]);
    cmp.deleteCurrent();
    expect(cmp.confirmingDelete()).toBe(true);
    cmp.cancelDelete();
    expect(cmp.confirmingDelete()).toBe(false);
    expect(cmp.tree()[0].children.length).toBe(1); // intatto
  });

  it('allows leaving when there are no unsaved changes', () => {
    const { cmp } = setup({});
    expect(cmp.canDeactivate()).toBe(true);
  });

  it('guards leaving when there are unsaved changes', async () => {
    const { cmp } = setup({});
    cmp.onMove(move('e4'));
    expect(cmp.dirty()).toBe(true);
    // lo stub di ConfirmService conferma l'uscita
    await expect(Promise.resolve(cmp.canDeactivate())).resolves.toBe(true);
  });

  it('promotes a variation to mainline', () => {
    const { cmp } = setup({});
    cmp.onMove(move('e4'));
    cmp.onMove(move('e5'));
    cmp.goTo([0]); // dopo e4
    cmp.onMove(move('c5')); // variante, path [0,1]
    expect(cmp.onMainline()).toBe(false);
    cmp.makeMainline();
    expect(cmp.tree()[0].children[0].san).toBe('c5');
    expect(cmp.tree()[0].children[1].san).toBe('e5');
    expect(cmp.currentPath()).toEqual([0, 0]);
    expect(cmp.onMainline()).toBe(true);
  });

  it('resets the tree', () => {
    const { cmp } = setup({});
    cmp.onMove(move('e4'));
    cmp.reset();
    expect(cmp.tree()).toEqual([]);
    expect(cmp.currentPath()).toEqual([]);
  });

  it('orients the board for the selected side', () => {
    const { cmp } = setup({});
    expect(cmp.orientation()).toBe('white');
    cmp.color.set('BLACK');
    expect(cmp.orientation()).toBe('black');
  });

  it('refuses to save without a name or without moves', () => {
    let called = false;
    const { cmp } = setup({ createVariant: () => { called = true; return of({} as Variant); } });
    cmp.save(); // niente nome né mosse
    expect(called).toBe(false);
    cmp.name.set('X');
    cmp.save(); // nome ma niente mosse
    expect(called).toBe(false);
    expect(cmp.error()).toBeTruthy();
  });

  it('creates a variant sending tree and mainline, then navigates', () => {
    const created: Variant = { id: 7, name: 'Italiana', color: 'WHITE', moves: ['e4', 'e5'], startingFen: '' };
    let captured: CreateVariantRequest | null = null;
    const { cmp } = setup({
      createVariant: (req: CreateVariantRequest) => {
        captured = req;
        return of(created);
      },
    });
    const router = TestBed.inject(Router);
    let navTarget: unknown[] | null = null;
    router.navigate = ((c: unknown[]) => { navTarget = c; return Promise.resolve(true); }) as typeof router.navigate;

    cmp.onMove(move('e4'));
    cmp.onMove(move('e5'));
    cmp.name.set('Italiana');
    cmp.save();

    expect(captured!.name).toBe('Italiana');
    expect(captured!.moves).toEqual(['e4', 'e5']);
    expect(captured!.tree?.[0].san).toBe('e4');
    expect(navTarget).toEqual(['/variants', 7]);
  });

  it('creates inside a study via the nested endpoint when studyId is present', () => {
    const created: Variant = { id: 8, name: 'Italiana', color: 'WHITE', moves: ['e4'], startingFen: '', studyId: 3 };
    let studyArg: number | null = null;
    let createCalled = false;
    const { cmp } = setup(
      { createVariant: () => { createCalled = true; return of(created); } },
      undefined,
      { addVariant: (id: number) => { studyArg = id; return of(created); } },
      { studyId: '3' },
    );
    const router = TestBed.inject(Router);
    let navTarget: unknown[] | null = null;
    router.navigate = ((c: unknown[]) => { navTarget = c; return Promise.resolve(true); }) as typeof router.navigate;

    expect(cmp.studyId()).toBe(3);
    cmp.onMove(move('e4'));
    cmp.name.set('Italiana');
    cmp.save();

    expect(studyArg).toBe(3);
    expect(createCalled).toBe(false);
    expect(navTarget).toEqual(['/variants', 8]);
  });

  it('loads an existing variant in edit mode and updates it', () => {
    const existing: Variant = {
      id: 5,
      name: 'Italiana',
      color: 'WHITE',
      moves: ['e4', 'e5', 'Nf3'],
      startingFen: START,
    };
    let updateId: number | null = null;
    const { cmp } = setup(
      {
        getVariant: () => of(existing),
        updateVariant: (id: number) => {
          updateId = id;
          return of({ ...existing, name: 'Italiana mod' });
        },
      },
      5,
    );
    const router = TestBed.inject(Router);
    router.navigate = (() => Promise.resolve(true)) as typeof router.navigate;

    expect(cmp.isEdit()).toBe(true);
    expect(cmp.tree()[0].san).toBe('e4');

    cmp.name.set('Italiana mod');
    cmp.save();
    expect(updateId).toBe(5);
  });

  // ISSUE-007: un solo controllo, il toggle del motore, governa anche la barra.
  it('has no separate show/hide button for the evaluation bar', () => {
    const { fixture, cmp } = setup({});
    cmp.toggleEngine();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const labels = Array.from(el.querySelectorAll('.engine-bar button')).map((b) =>
      b.textContent?.trim(),
    );
    expect(labels.some((t) => t?.includes('barra'))).toBe(false);
    expect(cmp.showEvalBar).toBeUndefined();
    expect(fixture.nativeElement.querySelector('app-eval-bar')).not.toBeNull();
  });

  // ISSUE-022 resta fuori dall'editor: la linea migliore è solo nel dettaglio.
  it('does not show the engine best line', () => {
    const { fixture, cmp } = setup({});
    cmp.toggleEngine();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.engine-line')).toBeNull();
  });
});

// ISSUE-010 (R23): cambio variante dall'editor, con e senza modifiche pendenti.
describe('VariantEditor — pannello varianti', () => {
  const START_FEN = START;

  const italiana: Variant = {
    id: 1,
    name: 'Italiana',
    color: 'WHITE',
    moves: ['e4', 'e5'],
    startingFen: START_FEN,
    studyId: 5,
  };
  const siciliana: Variant = {
    id: 2,
    name: 'Siciliana',
    color: 'BLACK',
    moves: ['e4', 'c5'],
    startingFen: START_FEN,
    studyId: 5,
  };

  function study(variants: Variant[] | null): Study {
    return {
      id: 5,
      name: 'Repertorio',
      phase: 'OPENING',
      variantCount: variants?.length ?? 0,
      variants,
    };
  }

  function editorOn(
    variants: Variant[] | null,
    confirmAnswer = true,
    current: Variant = italiana,
  ) {
    const asked: string[] = [];
    const s = setup(
      { getVariant: (id: number) => of(id === 1 ? current : siciliana) },
      current.id,
      { getStudy: () => of(study(variants)) },
      {},
      {
        ask: (o: { title?: string }) => {
          asked.push(o.title ?? '');
          return Promise.resolve(confirmAnswer);
        },
      },
    );
    const router = TestBed.inject(Router);
    const navTargets: unknown[][] = [];
    router.navigate = ((c: unknown[]) => { navTargets.push(c); return Promise.resolve(true); }) as typeof router.navigate;
    return { ...s, asked, navTargets };
  }

  it('offers the drawer, never a permanent third column', () => {
    const { fixture, cmp } = editorOn([italiana, siciliana]);
    expect(cmp.hasVariantNav()).toBe(true);
    expect(fixture.nativeElement.querySelector('.variants-toggle')).not.toBeNull();
    // Nessun rail: il pannello esiste solo quando il drawer è aperto.
    expect(fixture.nativeElement.querySelector('app-study-variant-nav')).toBeNull();

    cmp.toggleVariants();
    fixture.detectChanges();
    const nav: HTMLElement = fixture.nativeElement.querySelector('app-study-variant-nav');
    expect(nav.classList.contains('variant-drawer')).toBe(true);
    expect(fixture.nativeElement.querySelector('.board-col app-study-variant-nav')).toBeNull();
  });

  it('hides the panel while creating a new variant', () => {
    const { cmp } = setup({}, undefined, {}, { studyId: '5' });
    expect(cmp.hasVariantNav()).toBe(false);
  });

  it('hides the panel when the study has no alternative', () => {
    const { cmp } = editorOn([italiana]);
    expect(cmp.hasVariantNav()).toBe(false);
  });

  it('navigates without asking when there are no unsaved changes', async () => {
    const { cmp, asked, navTargets } = editorOn([italiana, siciliana]);
    await cmp.requestVariantChange(2);
    expect(asked).toEqual([]);
    expect(navTargets).toEqual([['/variants', 2, 'edit']]);
    expect(cmp.variantsOpen()).toBe(false);
  });

  it('asks confirmation with unsaved changes and navigates when confirmed', async () => {
    const { cmp, asked, navTargets } = editorOn([italiana, siciliana]);
    cmp.onMove(move('d4'));
    expect(cmp.dirty()).toBe(true);

    await cmp.requestVariantChange(2);

    expect(asked).toEqual(['Modifiche non salvate']);
    expect(navTargets).toEqual([['/variants', 2, 'edit']]);
    // Conferma già data: il guard della route non deve richiederla di nuovo.
    expect(cmp.dirty()).toBe(false);
  });

  it('stays on the current variant when the confirmation is refused', async () => {
    const { cmp, asked, navTargets } = editorOn([italiana, siciliana], false);
    cmp.onMove(move('d4'));

    await cmp.requestVariantChange(2);

    expect(asked).toEqual(['Modifiche non salvate']);
    expect(navTargets).toEqual([]);
    expect(cmp.dirty()).toBe(true);
    expect(cmp.editId()).toBe(1);
    // La modifica pendente (variante `d4` accanto a `e4`) è ancora lì.
    expect(cmp.tree().map((n: { san: string }) => n.san)).toEqual(['e4', 'd4']);
  });

  it('does not navigate nor ask when the open variant is selected again', async () => {
    const { cmp, asked, navTargets } = editorOn([italiana, siciliana]);
    cmp.onMove(move('d4'));
    cmp.toggleVariants();

    await cmp.requestVariantChange(1);

    expect(asked).toEqual([]);
    expect(navTargets).toEqual([]);
    expect(cmp.dirty()).toBe(true);
    expect(cmp.variantsOpen()).toBe(false);
  });

  it('reloads and resets its state when only the route id changes', () => {
    const s = editorOn([italiana, siciliana]);
    s.cmp.onMove(move('d4'));
    s.cmp.toggleVariants();
    expect(s.cmp.dirty()).toBe(true);

    s.navigateTo(2);

    expect(s.cmp.editId()).toBe(2);
    expect(s.cmp.name()).toBe('Siciliana');
    expect(s.cmp.color()).toBe('BLACK');
    expect(s.cmp.tree()[0].san).toBe('e4');
    expect(s.cmp.tree()[0].children[0].san).toBe('c5');
    expect(s.cmp.currentPath()).toEqual([]);
    expect(s.cmp.dirty()).toBe(false);
    expect(s.cmp.variantsOpen()).toBe(false);
    expect(s.cmp.confirmingDelete()).toBe(false);
  });
});

// P1 R23: al cambio rapido di `:id` una risposta della variante precedente non
// deve più poter sovrascrivere quella corrente, nemmeno nella lettura dipendente
// dello studio.
describe('VariantEditor — risposte HTTP fuori ordine', () => {
  const italiana: Variant = {
    id: 1,
    name: 'Italiana',
    color: 'WHITE',
    moves: ['e4', 'e5'],
    startingFen: START,
    studyId: 5,
  };
  const siciliana: Variant = {
    id: 2,
    name: 'Siciliana',
    color: 'BLACK',
    moves: ['e4', 'c5'],
    startingFen: START,
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

  function study(id: number, variants: Variant[]): Study {
    return {
      id,
      name: `Studio ${id}`,
      phase: 'OPENING',
      variantCount: variants.length,
      variants,
    };
  }

  /** Editor aperto sulla variante 1, con entrambe le letture ancora in volo. */
  function controlled() {
    const variantCalls: Pending<Variant>[] = [];
    const studyCalls: Pending<Study>[] = [];
    const s = setup({ getVariant: deferred(variantCalls) }, 1, {
      getStudy: deferred(studyCalls),
    });
    return { ...s, variantCalls, studyCalls };
  }

  it('keeps the current variant when the previous response arrives later', () => {
    const s = controlled();
    expect(s.variantCalls.map((c) => c.arg)).toEqual([1]);

    s.navigateTo(2);
    expect(s.variantCalls.map((c) => c.arg)).toEqual([1, 2]);

    // Risposte in ordine inverso: prima la richiesta più recente…
    s.variantCalls[1].subject.next(siciliana);
    s.fixture.detectChanges();
    expect(s.cmp.name()).toBe('Siciliana');

    // …poi quella sorpassata, che non deve rientrare nell'editor.
    s.variantCalls[0].subject.next(italiana);
    s.fixture.detectChanges();

    expect(s.cmp.editId()).toBe(2);
    expect(s.cmp.name()).toBe('Siciliana');
    expect(s.cmp.color()).toBe('BLACK');
    expect(s.cmp.tree()[0].children[0].san).toBe('c5');
    expect(s.cmp.dirty()).toBe(false);
  });

  it('ignores the study response of the variant left behind', () => {
    const s = controlled();
    s.variantCalls[0].subject.next(italiana);
    s.fixture.detectChanges();
    expect(s.studyCalls.map((c) => c.arg)).toEqual([5]);

    s.navigateTo(2);
    s.variantCalls[1].subject.next(siciliana);
    s.fixture.detectChanges();
    expect(s.studyCalls.map((c) => c.arg)).toEqual([5, 6]);

    s.studyCalls[1].subject.next(study(6, [siciliana, { ...siciliana, id: 3 }]));
    s.fixture.detectChanges();
    s.studyCalls[0].subject.next(study(5, [italiana]));
    s.fixture.detectChanges();

    expect(s.cmp.studyVariants().map((v: Variant) => v.id)).toEqual([2, 3]);
    expect(s.cmp.hasVariantNav()).toBe(true);
  });

  it('does not surface the error of a request already superseded', () => {
    const s = controlled();
    s.navigateTo(2);
    s.variantCalls[1].subject.next(siciliana);
    s.fixture.detectChanges();

    s.variantCalls[0].subject.error(new Error('404'));
    s.fixture.detectChanges();

    expect(s.cmp.error()).toBeNull();
    expect(s.cmp.name()).toBe('Siciliana');
  });
});

// P1 R23: il riavvio dell'analisi non può dipendere dalla sola FEN.
describe('VariantEditor — motore al cambio variante', () => {
  const italiana: Variant = {
    id: 1,
    name: 'Italiana',
    color: 'WHITE',
    moves: ['e4', 'e5'],
    startingFen: START,
    studyId: 5,
  };
  /** Variante diversa, **stessa** posizione di partenza. */
  const spagnola: Variant = {
    id: 2,
    name: 'Spagnola',
    color: 'WHITE',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
    startingFen: START,
    studyId: 5,
  };

  function editorOn() {
    return setup(
      { getVariant: (id: number) => of(id === 1 ? italiana : spagnola) },
      1,
      { getStudy: () => of({ id: 5, name: 'Repertorio', phase: 'OPENING' as const, variantCount: 2, variants: [italiana, spagnola] }) },
    );
  }

  it('restarts the analysis on a different variant with the same FEN', () => {
    const s = editorOn();
    s.cmp.toggleEngine();
    s.fixture.detectChanges();
    expect(s.engine.analysed).toEqual([START]);

    // Dati dell'analisi in corso sulla variante 1.
    s.engine.evaluation.set({ depth: 12, scoreCp: 30, mate: null, pv: ['e2e4'] });
    s.engine.bestLine.set(['e4', 'e5']);
    s.fixture.detectChanges();

    s.navigateTo(2);

    expect(s.cmp.editId()).toBe(2);
    // Stessa FEN, ma variante diversa: l'analisi riparte e i dati precedenti
    // sono stati svuotati.
    expect(s.engine.analysed).toEqual([START, START]);
    expect(s.engine.evaluation()).toBeNull();
    expect(s.engine.bestLine()).toEqual([]);
    expect(s.cmp.engineOn()).toBe(true);
  });

  it('does not analyse while the variant is still loading', () => {
    const variantCalls: { subject: Subject<Variant> }[] = [];
    const s = setup(
      {
        getVariant: () => {
          const subject = new Subject<Variant>();
          variantCalls.push({ subject });
          return subject;
        },
      },
      1,
    );
    s.cmp.toggleEngine();
    s.fixture.detectChanges();
    expect(s.engine.analysed).toEqual([]);

    variantCalls[0].subject.next(italiana);
    s.fixture.detectChanges();
    expect(s.engine.analysed).toEqual([START]);
  });

  it('analyses right away while creating a new variant', () => {
    const s = setup({});
    s.cmp.toggleEngine();
    s.fixture.detectChanges();
    expect(s.engine.analysed.length).toBe(1);
  });
});
