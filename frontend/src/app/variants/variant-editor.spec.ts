import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
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
import { setAnnotation } from '../core/move-tree';
import { MIDDLEGAME_SECTION_CONTEXT, SECTION_CONTEXT_DATA } from '../core/study-sections';

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
  /** `data` della route: con il contesto l'editor è quello di sezione. */
  data: Record<string, unknown> = {},
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
            data,
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
    let navTarget: string | null = null;
    router.navigateByUrl = ((url: string) => { navTarget = url; return Promise.resolve(true); }) as typeof router.navigateByUrl;

    cmp.onMove(move('e4'));
    cmp.onMove(move('e5'));
    cmp.name.set('Italiana');
    cmp.save();

    expect(captured!.name).toBe('Italiana');
    expect(captured!.moves).toEqual(['e4', 'e5']);
    expect(captured!.tree?.[0].san).toBe('e4');
    expect(navTarget).toBe('/variants/7');
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
    let navTarget: string | null = null;
    router.navigateByUrl = ((url: string) => { navTarget = url; return Promise.resolve(true); }) as typeof router.navigateByUrl;

    expect(cmp.studyId()).toBe(3);
    cmp.onMove(move('e4'));
    cmp.name.set('Italiana');
    cmp.save();

    expect(studyArg).toBe(3);
    expect(createCalled).toBe(false);
    expect(navTarget).toBe('/variants/8');
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
    router.navigateByUrl = (() => Promise.resolve(true)) as typeof router.navigateByUrl;

    expect(cmp.isEdit()).toBe(true);
    expect(cmp.tree()[0].san).toBe('e4');

    cmp.name.set('Italiana mod');
    cmp.save();
    expect(updateId).toBe(5);
  });

  it('loads a custom position and saves new moves while preserving its FEN', () => {
    const startingFen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
    const position: Variant = {
      id: 31,
      name: 'Re e pedone',
      color: 'WHITE',
      moves: [],
      tree: [],
      startingFen,
      studyId: 7,
    };
    let captured: CreateVariantRequest | null = null;
    const { cmp, fixture } = setup(
      {
        getVariant: () => of(position),
        updateVariant: (_id: number, request: CreateVariantRequest) => {
          captured = request;
          return of({ ...position, moves: ['Ke2'], tree: [{ san: 'Ke2', children: [] }] });
        },
      },
      31,
      { getStudy: () => of({ id: 7, name: 'Finali pratici', phase: 'ENDGAME', variantCount: 1 }) },
    );
    const router = TestBed.inject(Router);
    router.navigateByUrl = (() => Promise.resolve(true)) as typeof router.navigateByUrl;

    expect(cmp.isPosition()).toBe(true);
    expect(fixture.nativeElement.querySelector('#vcolor')).toBeNull();
    expect(fixture.nativeElement.querySelector('.side-kicker')?.textContent?.trim()).toBe('Modifica posizione');
    expect(cmp.fen()).toBe(startingFen);
    cmp.onMove(move('Ke2'));
    cmp.save();

    expect(captured).not.toBeNull();
    expect(captured!.startingFen).toBe(startingFen);
    expect(captured!.color).toBeUndefined();
    expect(captured!.moves).toEqual(['Ke2']);
    expect(captured!.tree?.[0].san).toBe('Ke2');
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

// R24 (ISSUE-013 + issue-016-move-comments): azioni e annotazioni per mossa.
describe('VariantEditor — menu azioni e annotazioni', () => {
  /** Editor con l'albero e4 ( e5 -> Nf3 ; c5 ) già giocato. */
  function editorWithTree() {
    const s = setup({});
    s.cmp.onMove(move('e4'));
    s.cmp.onMove(move('e5'));
    s.cmp.onMove(move('Nf3'));
    s.cmp.goTo([0]);
    s.cmp.onMove(move('c5')); // variante in [0,1]
    s.fixture.detectChanges();
    return s;
  }

  const el = (s: { fixture: { nativeElement: HTMLElement } }) => s.fixture.nativeElement;
  const actionButtons = (s: { fixture: { nativeElement: HTMLElement } }) =>
    Array.from(el(s).querySelectorAll<HTMLButtonElement>('.move-actions'));
  const moveButtons = (s: { fixture: { nativeElement: HTMLElement } }) =>
    Array.from(el(s).querySelectorAll<HTMLButtonElement>('.move'));
  const menuItems = (s: { fixture: { nativeElement: HTMLElement } }) =>
    Array.from(el(s).querySelectorAll<HTMLButtonElement>('[role="menuitem"]')).map((b) =>
      b.textContent?.trim(),
    );

  it('gives every move an actions button with an accessible label', () => {
    const s = editorWithTree();
    const buttons = actionButtons(s);
    // Ordine PGN: la variante (c5) è resa fra parentesi subito dopo e5.
    expect(buttons.length).toBe(4);
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Azioni per e4',
      'Azioni per e5',
      'Azioni per c5',
      'Azioni per Nf3',
    ]);
    expect(buttons.every((b) => b.getAttribute('aria-haspopup') === 'menu')).toBe(true);
    expect(buttons.every((b) => b.getAttribute('aria-expanded') === 'false')).toBe(true);
  });

  it('opens the menu from the actions button and marks it expanded', () => {
    const s = editorWithTree();
    actionButtons(s)[0].click();
    s.fixture.detectChanges();

    expect(s.cmp.menu().path).toEqual([0]);
    expect(el(s).querySelector('[role="menu"]')).not.toBeNull();
    expect(actionButtons(s)[0].getAttribute('aria-expanded')).toBe('true');
    expect(actionButtons(s)[1].getAttribute('aria-expanded')).toBe('false');
  });

  it('opens the same menu with the right button, leaving the left click to navigation', () => {
    const s = editorWithTree();
    const nf3 = moveButtons(s)[3];
    nf3.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    s.fixture.detectChanges();

    expect(s.cmp.menu().san).toBe('Nf3');
    expect(s.cmp.currentPath()).toEqual([0, 1]); // il tasto destro non naviga

    s.cmp.closeMoveMenu();
    s.fixture.detectChanges();
    moveButtons(s)[3].click();
    expect(s.cmp.currentPath()).toEqual([0, 0, 0]); // il click sinistro sì
  });

  it('offers the promotion only for a move outside the mainline', () => {
    const s = editorWithTree();
    actionButtons(s)[2].click(); // c5, variante
    s.fixture.detectChanges();
    expect(menuItems(s)).toEqual(['Annota la mossa', 'Promuovi a mainline', 'Elimina mossa']);

    s.cmp.closeMoveMenu();
    s.fixture.detectChanges();
    actionButtons(s)[1].click(); // e5, mainline
    s.fixture.detectChanges();
    expect(menuItems(s)).toEqual(['Annota la mossa', 'Elimina mossa']);
  });

  it('closes the menu and gives the focus back to the button that opened it', () => {
    const s = editorWithTree();
    const trigger = actionButtons(s)[0];
    trigger.click();
    s.fixture.detectChanges();

    s.cmp.closeMoveMenu();
    s.fixture.detectChanges();

    expect(s.cmp.menu()).toBeNull();
    expect(el(s).querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('promotes from the menu and focuses the action of the promoted move after reordering', async () => {
    const s = editorWithTree();
    const trigger = actionButtons(s)[2]; // c5
    trigger.click();
    s.fixture.detectChanges();
    s.cmp.onMoveAction('promote');
    s.fixture.detectChanges();
    await s.fixture.whenStable();
    s.fixture.detectChanges();

    expect(s.cmp.tree()[0].children[0].san).toBe('c5');
    expect(s.cmp.currentPath()).toEqual([0, 0]);
    expect(s.cmp.dirty()).toBe(true);
    expect(s.cmp.menu()).toBeNull();
    expect(document.activeElement).not.toBe(trigger);
    expect(document.activeElement).toBe(
      el(s).querySelector<HTMLButtonElement>('[data-move-path="0.0"]'),
    );
  });

  it('deletes a leaf from the menu without confirmation, selecting the parent', () => {
    const s = editorWithTree();
    actionButtons(s)[3].click(); // Nf3, foglia
    s.fixture.detectChanges();
    s.cmp.onMoveAction('delete');
    s.fixture.detectChanges();

    expect(s.cmp.confirmingDelete()).toBe(false);
    expect(s.cmp.tree()[0].children[0].children.length).toBe(0);
    expect(s.cmp.currentPath()).toEqual([0, 0]); // il padre e5
  });

  it('asks confirmation before deleting a subtree from the menu', () => {
    const s = editorWithTree();
    actionButtons(s)[1].click(); // e5, con Nf3 sotto
    s.fixture.detectChanges();
    s.cmp.onMoveAction('delete');
    s.fixture.detectChanges();

    expect(s.cmp.confirmingDelete()).toBe(true);
    expect(s.cmp.pendingDeleteSan()).toBe('e5');
    expect(el(s).textContent).toContain('sottoalbero');
    expect(s.cmp.tree()[0].children.length).toBe(2); // niente di cancellato

    s.cmp.confirmDelete();
    s.fixture.detectChanges();
    expect(s.cmp.tree()[0].children.map((c: { san: string }) => c.san)).toEqual(['c5']);
    expect(s.cmp.currentPath()).toEqual([0]); // il padre e4
  });

  it('leaves the tree untouched when the confirmation is cancelled', () => {
    const s = editorWithTree();
    s.cmp.requestDeleteAt([0]);
    s.fixture.detectChanges();
    expect(s.cmp.confirmingDelete()).toBe(true);
    s.cmp.cancelDelete();
    expect(s.cmp.confirmingDelete()).toBe(false);
    expect(s.cmp.tree().length).toBe(1);
  });

  it('opens the annotation dialog with the current annotation of the move', () => {
    const s = editorWithTree();
    s.cmp.tree.set(setAnnotation(s.cmp.tree(), [0], { comment: 'Apertura di re', nag: '!' }));
    s.fixture.detectChanges();

    actionButtons(s)[0].click();
    s.fixture.detectChanges();
    s.cmp.onMoveAction('annotate');
    s.fixture.detectChanges();

    expect(s.cmp.annotating().path).toEqual([0]);
    expect(s.cmp.annotating().annotation).toEqual({ comment: 'Apertura di re', nag: '!' });
    expect(el(s).querySelector('app-move-annotation-dialog')).not.toBeNull();
    expect(el(s).querySelector('[role="menu"]')).toBeNull();
  });

  it('saves the annotation on the local tree and marks the variant as unsaved', () => {
    const s = editorWithTree();
    actionButtons(s)[1].click();
    s.fixture.detectChanges();
    s.cmp.onMoveAction('annotate');
    s.fixture.detectChanges();
    s.cmp.saveAnnotation({ comment: 'Simmetrica', nag: '!?' });
    s.fixture.detectChanges();

    expect(s.cmp.tree()[0].children[0].comment).toBe('Simmetrica');
    expect(s.cmp.tree()[0].children[0].nag).toBe('!?');
    expect(s.cmp.dirty()).toBe(true);
    expect(s.cmp.annotating()).toBeNull();
  });

  it('cancels the dialog without touching the tree and returns the focus', () => {
    const s = editorWithTree();
    const trigger = actionButtons(s)[1];
    trigger.click();
    s.fixture.detectChanges();
    s.cmp.onMoveAction('annotate');
    s.fixture.detectChanges();
    const before = s.cmp.tree();

    s.cmp.closeAnnotation();
    s.fixture.detectChanges();

    expect(s.cmp.tree()).toBe(before);
    expect(s.cmp.annotating()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('shows the NAG next to the SAN and the comment under the move', () => {
    const s = editorWithTree();
    s.cmp.tree.set(setAnnotation(s.cmp.tree(), [0], { comment: 'Apertura di re', nag: '!' }));
    s.fixture.detectChanges();

    expect(el(s).querySelector('.move-nag')!.textContent?.trim()).toBe('!');
    expect(el(s).querySelector('.move-comment')!.textContent?.trim()).toBe('Apertura di re');
  });

  it('sends the annotated tree on save', () => {
    let captured: CreateVariantRequest | null = null;
    const s = setup({
      createVariant: (req: CreateVariantRequest) => {
        captured = req;
        return of({ id: 9, name: 'X', color: 'WHITE', moves: ['e4'], startingFen: '' } as Variant);
      },
    });
    const router = TestBed.inject(Router);
    router.navigateByUrl = (() => Promise.resolve(true)) as typeof router.navigateByUrl;

    s.cmp.onMove(move('e4'));
    s.cmp.tree.set(setAnnotation(s.cmp.tree(), [0], { comment: 'Nota', nag: '!!' }));
    s.cmp.name.set('X');
    s.cmp.save();

    expect(captured!.tree?.[0].comment).toBe('Nota');
    expect(captured!.tree?.[0].nag).toBe('!!');
    expect(captured!.moves).toEqual(['e4']);
  });

  it('reloads annotations saved on the variant without losing them', () => {
    const annotated: Variant = {
      id: 4,
      name: 'Italiana',
      color: 'WHITE',
      moves: ['e4', 'e5'],
      tree: [
        {
          san: 'e4',
          comment: 'Apertura di re',
          nag: '!',
          children: [{ san: 'e5', children: [] }],
        },
      ],
      startingFen: START,
    };
    let captured: CreateVariantRequest | null = null;
    const s = setup(
      {
        getVariant: () => of(annotated),
        updateVariant: (_id: number, req: CreateVariantRequest) => {
          captured = req;
          return of(annotated);
        },
      },
      4,
    );
    const router = TestBed.inject(Router);
    router.navigateByUrl = (() => Promise.resolve(true)) as typeof router.navigateByUrl;

    expect(s.cmp.tree()[0].comment).toBe('Apertura di re');
    expect(s.cmp.tree()[0].nag).toBe('!');
    s.cmp.save();
    expect(captured!.tree?.[0].comment).toBe('Apertura di re');
    expect(captured!.tree?.[0].nag).toBe('!');
  });

  it('drops menu, dialog and pending deletion when the route variant changes', () => {
    const s = editorWithTree();
    actionButtons(s)[0].click();
    s.fixture.detectChanges();
    s.cmp.requestDeleteAt([0]);
    s.fixture.detectChanges();

    s.cmp['resetTransientState'](null);

    expect(s.cmp.menu()).toBeNull();
    expect(s.cmp.annotating()).toBeNull();
    expect(s.cmp.confirmingDelete()).toBe(false);
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
    const navTargets: string[] = [];
    router.navigateByUrl = ((url: string) => { navTargets.push(url); return Promise.resolve(true); }) as typeof router.navigateByUrl;
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
    expect(navTargets).toEqual(['/variants/2/edit']);
    expect(cmp.variantsOpen()).toBe(false);
  });

  it('asks confirmation with unsaved changes and navigates when confirmed', async () => {
    const { cmp, asked, navTargets } = editorOn([italiana, siciliana]);
    cmp.onMove(move('d4'));
    expect(cmp.dirty()).toBe(true);

    await cmp.requestVariantChange(2);

    expect(asked).toEqual(['Modifiche non salvate']);
    expect(navTargets).toEqual(['/variants/2/edit']);
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

describe('VariantEditor (Mediogioco, ISSUE-016)', () => {
  const CUSTOM_FEN = '4k3/8/8/3pP3/8/8/8/4K3 w - - 0 1';

  const position: Variant = {
    id: 41,
    name: 'Centro bloccato',
    color: 'WHITE',
    moves: ['Ke2'],
    tree: [{ san: 'Ke2', comment: 'Il re va al centro', nag: '!', children: [] }],
    startingFen: CUSTOM_FEN,
    studyId: 6,
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

  function study(phase: Study['phase'], variants: Variant[] = [position, sibling]): Study {
    return { id: 6, name: 'Strutture di pedoni', phase, variantCount: variants.length, variants };
  }

  /** Editor montato sotto `/middlegame/positions/:id/edit`. */
  function middlegame(
    service: Partial<VariantService> = { getVariant: () => of(position) },
    studyService: Partial<StudyService> = { getStudy: () => of(study('MIDDLEGAME')) },
    engine = fakeEngine(),
  ) {
    const s = setup(service, position.id, studyService, {}, { ask: () => Promise.resolve(true) }, engine, {
      [SECTION_CONTEXT_DATA]: MIDDLEGAME_SECTION_CONTEXT,
    });
    const router = TestBed.inject(Router);
    let navTarget: string | null = null;
    router.navigateByUrl = ((url: string) => {
      navTarget = url;
      return Promise.resolve(true);
    }) as typeof router.navigateByUrl;
    return { ...s, el: s.fixture.nativeElement as HTMLElement, navigated: () => navTarget };
  }

  it('loads the position keeping FEN, tree and annotations', () => {
    const { cmp, el } = middlegame();
    expect(cmp.sectionError()).toBeNull();
    expect(cmp.isPosition()).toBe(true);
    expect(cmp.fen()).toBe(CUSTOM_FEN);
    expect(cmp.tree()[0].san).toBe('Ke2');
    expect(el.querySelector('.move-nag')?.textContent).toContain('!');
    expect(el.querySelector('.move-comment')?.textContent).toContain('Il re va al centro');
    // Il lato da allenare non esiste per una posizione.
    expect(el.querySelector('#vcolor')).toBeNull();
  });

  it('keeps the editor hidden and save inert while the parent phase is pending', () => {
    const pendingStudy = new Subject<Study>();
    let updated = false;
    const { cmp, el, fixture } = middlegame(
      {
        getVariant: () => of(position),
        updateVariant: () => {
          updated = true;
          return of(position);
        },
      },
      { getStudy: () => pendingStudy.asObservable() },
    );

    expect(cmp.sectionChecking()).toBe(true);
    expect(cmp.sectionVerified()).toBe(false);
    expect(el.querySelector('.detail')).toBeNull();
    expect(el.querySelector('app-chessboard')).toBeNull();
    expect(el.querySelector('.engine-sub')).toBeNull();
    expect(el.querySelector('#vcolor')).toBeNull();
    expect(el.textContent).toContain('Verifica della sezione');

    cmp.save();
    expect(updated).toBe(false);

    pendingStudy.next(study('MIDDLEGAME'));
    pendingStudy.complete();
    fixture.detectChanges();

    expect(cmp.sectionChecking()).toBe(false);
    expect(cmp.sectionVerified()).toBe(true);
    expect(el.querySelector('.detail')).not.toBeNull();
    expect(cmp.fen()).toBe(CUSTOM_FEN);
  });

  it('never opens or saves a delayed position belonging to the wrong phase', () => {
    const pendingStudy = new Subject<Study>();
    let updated = false;
    const { cmp, el, fixture } = middlegame(
      {
        getVariant: () => of(position),
        updateVariant: () => {
          updated = true;
          return of(position);
        },
      },
      { getStudy: () => pendingStudy.asObservable() },
    );

    pendingStudy.next(study('ENDGAME'));
    pendingStudy.complete();
    fixture.detectChanges();
    cmp.save();

    expect(cmp.sectionVerified()).toBe(false);
    expect(cmp.sectionError()).toContain('non appartiene alla sezione Mediogioco');
    expect(el.querySelector('.detail')).toBeNull();
    expect(updated).toBe(false);
  });

  it('saves the tree preserving the starting FEN and opens the canonical detail', () => {
    let captured: CreateVariantRequest | null = null;
    const { cmp, navigated } = middlegame({
      getVariant: () => of(position),
      updateVariant: (_id: number, request: CreateVariantRequest) => {
        captured = request;
        return of({ ...position, id: 41 });
      },
    });

    cmp.onMove(move('Kd2'));
    cmp.save();

    expect(captured).toEqual({
      name: 'Centro bloccato',
      moves: ['Ke2'],
      tree: [
        { san: 'Ke2', comment: 'Il re va al centro', nag: '!', children: [] },
        { san: 'Kd2', children: [] },
      ],
      startingFen: CUSTOM_FEN,
    });
    expect(navigated()).toBe('/middlegame/positions/41');
  });

  it('changes sibling position without leaving the section', async () => {
    const { cmp, navigated } = middlegame();
    expect(cmp.hasVariantNav()).toBe(true);
    await cmp.requestVariantChange(42);
    expect(navigated()).toBe('/middlegame/positions/42/edit');
  });

  it('cancels back to the position detail', () => {
    const { el } = middlegame();
    const cancel = Array.from(el.querySelectorAll<HTMLAnchorElement>('a')).find((a) =>
      a.textContent?.includes('Annulla'),
    );
    expect(cancel?.getAttribute('href')).toBe('/middlegame/positions/41');
  });

  it('refuses a variant of an opening study without opening the editor', () => {
    const { cmp, el } = middlegame(undefined, { getStudy: () => of(study('OPENING')) });
    expect(cmp.sectionError()).toBe('Questa posizione non appartiene alla sezione Mediogioco.');
    expect(el.querySelector('app-chessboard')).toBeNull();
    expect(el.querySelector('.actions')).toBeNull();
    expect(el.querySelector<HTMLAnchorElement>('.list-error a')?.getAttribute('href')).toBe(
      '/middlegame',
    );
    expect(cmp.tree().length).toBe(0);
  });

  it('refuses a position of an endgame study and saves nothing', () => {
    let updated = false;
    const { cmp } = middlegame(
      {
        getVariant: () => of(position),
        updateVariant: () => {
          updated = true;
          return of(position);
        },
      },
      { getStudy: () => of(study('ENDGAME')) },
    );

    cmp.save();
    expect(cmp.sectionError()).toContain('non appartiene alla sezione Mediogioco');
    expect(updated).toBe(false);
  });

  it('refuses the position when its study cannot be read', () => {
    const { cmp } = middlegame(undefined, { getStudy: () => throwError(() => new Error('500')) });
    expect(cmp.sectionError()).toContain('Studio della posizione non trovato');
  });

  it('keeps Stockfish but not the play command (ISSUE-016)', () => {
    const engine = fakeEngine();
    const { cmp, el, fixture } = middlegame(undefined, undefined, engine);
    expect(el.querySelector('.engine-toggle')).not.toBeNull();
    expect(el.querySelector('.engine-sub')).toBeNull();
    expect(el.textContent).not.toContain('Gioca contro il computer');

    cmp.toggleEngine();
    fixture.detectChanges();
    expect(engine.analysed).toEqual([CUSTOM_FEN]);
    expect(el.querySelector('app-eval-bar')).not.toBeNull();
  });

  it('keeps the unsaved-changes guard', async () => {
    const { cmp } = middlegame();
    expect(await cmp.canDeactivate()).toBe(true);
    cmp.onMove(move('Kd2'));
    expect(cmp.dirty()).toBe(true);
    expect(await cmp.canDeactivate()).toBe(true);
  });

  it('keeps the play command and the generic URLs for an opening variant', () => {
    const opening: Variant = {
      id: 9,
      name: 'Italiana',
      color: 'WHITE',
      moves: ['e4'],
      startingFen: START,
      studyId: 5,
    };
    const { fixture } = setup({ getVariant: () => of(opening) }, 9, {
      getStudy: () => of({ id: 5, name: 'Repertorio', phase: 'OPENING', variantCount: 1, variants: [opening] }),
    });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.engine-sub')?.textContent).toContain('Gioca contro il computer');
    expect(el.querySelector('#vcolor')).not.toBeNull();
    const cancel = Array.from(el.querySelectorAll<HTMLAnchorElement>('a')).find((a) =>
      a.textContent?.includes('Annulla'),
    );
    expect(cancel?.getAttribute('href')).toBe('/');
  });
});
