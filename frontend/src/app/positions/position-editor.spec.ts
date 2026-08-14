import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PositionEditor } from './position-editor';
import { ConfirmService } from '../core/confirm.service';
import { StudyService } from '../core/study.service';
import { ToastService } from '../core/toast.service';
import { VariantService } from '../core/variant.service';
import { Study } from '../core/study.model';
import { CreateVariantRequest, Variant } from '../core/variant.model';
import { MIDDLEGAME_SECTION_CONTEXT, SECTION_CONTEXT_DATA } from '../core/study-sections';

const study: Study = { id: 7, name: 'Finali pratici', phase: 'ENDGAME', variantCount: 0 };
const saved: Variant = {
  id: 31,
  name: 'Re e pedone',
  color: 'WHITE',
  moves: [],
  tree: [],
  startingFen: '4k3/8/8/8/8/8/8/4K3 w - - 0 1',
  studyId: 7,
};

interface SetupOptions {
  save?: (request: CreateVariantRequest) => unknown;
  phase?: Study['phase'];
  /** Route di setup di una posizione esistente (`positions/:id/setup`). */
  positionId?: number;
  /** Posizione caricata in modifica, per i contratti R25. */
  position?: Variant;
  /** `data` della route: con il contesto l'editor è quello di sezione. */
  data?: Record<string, unknown>;
}

function setup(options: SetupOptions = {}) {
  let captured: CreateVariantRequest | null = null;
  let updatedId: number | null = null;
  let asked = 0;
  const currentStudy = { ...study, phase: options.phase ?? study.phase };
  const positionId = options.positionId ?? null;
  TestBed.configureTestingModule({
    imports: [PositionEditor],
    providers: [
      provideRouter([]),
      {
        provide: StudyService,
        useValue: {
          getStudy: () => of(currentStudy),
          addVariant: (_studyId: number, request: CreateVariantRequest) => {
            captured = request;
            return options.save ? options.save(request) : of(saved);
          },
        },
      },
      {
        provide: VariantService,
        useValue: {
          getVariant: () => of(options.position ?? saved),
          updateVariant: (id: number, request: CreateVariantRequest) => {
            updatedId = id;
            captured = request;
            return options.save ? options.save(request) : of(saved);
          },
        },
      },
      {
        provide: ConfirmService,
        useValue: {
          ask: () => {
            asked++;
            return Promise.resolve(true);
          },
        },
      },
      { provide: ToastService, useValue: { success() {}, error() {}, info() {} } },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: convertToParamMap(positionId === null ? {} : { id: String(positionId) }),
            queryParamMap: convertToParamMap(positionId === null ? { studyId: '7' } : {}),
            data: options.data ?? {},
          },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(PositionEditor);
  const router = TestBed.inject(Router);
  let navTarget: string | null = null;
  router.navigateByUrl = ((url: string) => {
    navTarget = url;
    return Promise.resolve(true);
  }) as typeof router.navigateByUrl;
  fixture.detectChanges();
  return {
    fixture,
    el: fixture.nativeElement as HTMLElement,
    cmp: fixture.componentInstance as any,
    captured: () => captured,
    updatedId: () => updatedId,
    navigated: () => navTarget,
    asked: () => asked,
  };
}

/** Come `setup`, ma montando l'editor sotto le route `/middlegame`. */
function setupMiddlegame(options: SetupOptions = {}) {
  return setup({
    phase: 'MIDDLEGAME',
    ...options,
    data: { [SECTION_CONTEXT_DATA]: MIDDLEGAME_SECTION_CONTEXT },
  });
}

function link(el: HTMLElement, text: string): HTMLAnchorElement | undefined {
  return Array.from(el.querySelectorAll<HTMLAnchorElement>('a')).find((a) =>
    a.textContent?.includes(text),
  );
}

describe('PositionEditor', () => {
  it('renders an invariant 8 by 8 setup grid with contained piece images', () => {
    const { el } = setup();
    const squares = Array.from(el.querySelectorAll<HTMLButtonElement>('.setup-square'));
    expect(squares).toHaveLength(64);
    expect(
      new Set(squares.map((square) => square.getAttribute('aria-label')?.slice(0, 2))).size,
    ).toBe(64);
    expect(
      squares.every((square) => {
        const pieces = square.querySelectorAll(':scope > img.piece');
        return pieces.length <= 1;
      }),
    ).toBe(true);
  });

  it('generates a normalized FEN from visual piece placement and setup controls', () => {
    const { cmp } = setup();
    cmp.selectPiece('wK');
    cmp.placeOn('e1');
    cmp.selectPiece('bK');
    cmp.placeOn('e8');
    cmp.selectPiece('bP');
    cmp.placeOn('d5');
    cmp.selectPiece('wP');
    cmp.placeOn('e5');
    cmp.onSideChange('w');
    cmp.onEnPassantChange('d6');

    expect(cmp.startingFen()).toBe('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
    expect(cmp.validate('Re e pedone')).toBeNull();
  });

  it('saves a valid position without moves and without a training color', () => {
    const { cmp, captured, navigated } = setup();
    cmp.useStandardPosition();
    cmp.onNameChange('Posizione iniziale');
    cmp.save();

    expect(captured()).toEqual({
      name: 'Posizione iniziale',
      moves: [],
      tree: [],
      startingFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    });
    expect(navigated()).toBe('/variants/31/edit');
  });

  it('keeps the backend validation message visible after a failed save', () => {
    const { cmp } = setup({
      save: () => throwError(() => ({ error: { message: 'La posizione lascia il re in scacco.' } })),
    });
    cmp.useStandardPosition();
    cmp.onNameChange('Posizione da rifiutare');
    cmp.save();

    expect(cmp.error()).toBe('La posizione lascia il re in scacco.');
  });

  it('does not expose the editor for an opening study', () => {
    const { cmp } = setup({ phase: 'OPENING' });

    expect(cmp.ready()).toBe(false);
    expect(cmp.error()).toContain('solo negli studi di mediogioco o finale');
  });

  it('keeps the generic breadcrumb and cancel target outside a section (R25)', () => {
    const { el } = setup();
    const crumbs = Array.from(el.querySelectorAll<HTMLAnchorElement>('.crumbs a'));
    expect(crumbs.map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['Studi', '/'],
      ['Finali pratici', '/studies/7'],
    ]);
    expect(link(el, 'Annulla')?.getAttribute('href')).toBe('/studies/7');
  });

  it('keeps the generic cancel target while editing an existing position (R25)', () => {
    const { el } = setup({ positionId: 31 });
    expect(link(el, 'Annulla')?.getAttribute('href')).toBe('/studies/7');
  });
});

describe('PositionEditor (Mediogioco, ISSUE-016)', () => {
  it('creates a position in the parent study of the section', () => {
    const { cmp, captured, navigated } = setupMiddlegame();
    cmp.useStandardPosition();
    cmp.onNameChange('Struttura Carlsbad');
    cmp.save();

    expect(cmp.ready()).toBe(true);
    expect(captured()).toEqual({
      name: 'Struttura Carlsbad',
      moves: [],
      tree: [],
      startingFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    });
    // Dopo il salvataggio si apre l'editor delle mosse canonico.
    expect(navigated()).toBe('/middlegame/positions/31/edit');
  });

  it('updates the starting position from the setup route and opens the move editor', () => {
    const existing: Variant = {
      ...saved,
      tree: [{ san: 'e4', children: [] }],
      moves: ['e4'],
      startingFen: '4k3/8/8/8/8/8/8/4K3 w - - 0 1',
    };
    const { cmp, captured, updatedId, navigated } = setupMiddlegame({
      positionId: 31,
      position: existing,
    });

    expect(cmp.isEdit()).toBe(true);
    // La FEN persistita popola la scacchiera dell'editor (contratto R25).
    expect(cmp.startingFen()).toBe('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    cmp.selectPiece('wP');
    cmp.placeOn('e2');
    cmp.save();

    expect(updatedId()).toBe(31);
    // L'albero già salvato non viene scartato dal solo cambio di posizione.
    expect(captured()).toEqual({
      name: 'Re e pedone',
      moves: ['e4'],
      tree: [{ san: 'e4', children: [] }],
      startingFen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
    });
    expect(navigated()).toBe('/middlegame/positions/31/edit');
  });

  it('refuses an opening parent study without opening the editor', () => {
    const { cmp, el } = setupMiddlegame({ phase: 'OPENING' });

    expect(cmp.ready()).toBe(false);
    expect(cmp.error()).toBe('Questo studio non appartiene alla sezione Mediogioco.');
    expect(el.querySelector('.position-editor')).toBeNull();
    expect(el.querySelector('.setup-board')).toBeNull();
  });

  it('refuses a position of an endgame study without opening the editor', () => {
    const { cmp, el } = setupMiddlegame({ phase: 'ENDGAME', positionId: 31 });

    expect(cmp.ready()).toBe(false);
    expect(cmp.error()).toBe('Questa posizione non appartiene alla sezione Mediogioco.');
    expect(el.querySelector('.setup-board')).toBeNull();
    expect(link(el, 'torna a Mediogioco')?.getAttribute('href')).toBe('/middlegame');
  });

  it('does not save a position of the wrong phase', () => {
    const { cmp, captured, navigated } = setupMiddlegame({ phase: 'ENDGAME' });
    cmp.useStandardPosition();
    cmp.onNameChange('Tentativo');
    cmp.save();

    expect(captured()).toBeNull();
    expect(navigated()).toBeNull();
  });

  it('shows the canonical breadcrumb of the section', () => {
    const { el } = setupMiddlegame();
    const crumbs = Array.from(el.querySelectorAll<HTMLAnchorElement>('.crumbs a'));
    expect(crumbs.map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['Mediogioco', '/middlegame'],
      ['Finali pratici', '/middlegame/studies/7'],
    ]);
    expect(el.querySelector('.crumbs')?.textContent).toContain('Nuova posizione');
  });

  it('cancels a creation back to the parent study', () => {
    const { el } = setupMiddlegame();
    expect(link(el, 'Annulla')?.getAttribute('href')).toBe('/middlegame/studies/7');
  });

  it('cancels a setup back to the position detail', () => {
    const { el } = setupMiddlegame({ positionId: 31 });
    expect(link(el, 'Annulla')?.getAttribute('href')).toBe('/middlegame/positions/31');
  });

  it('keeps every generated link inside the section', () => {
    const { el } = setupMiddlegame({ positionId: 31 });
    const hrefs = Array.from(el.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '');
    expect(hrefs.length).toBeGreaterThan(0);
    expect(hrefs.every((h) => h === '/middlegame' || h.startsWith('/middlegame/'))).toBe(true);
  });

  it('keeps the R25 FEN contracts inside the section', () => {
    const { cmp } = setupMiddlegame();
    cmp.selectPiece('wK');
    cmp.placeOn('e1');
    cmp.selectPiece('bK');
    cmp.placeOn('e8');
    cmp.selectPiece('bP');
    cmp.placeOn('d5');
    cmp.selectPiece('wP');
    cmp.placeOn('e5');
    cmp.onEnPassantChange('d6');
    expect(cmp.startingFen()).toBe('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
    expect(cmp.validate('Presa en passant')).toBeNull();

    // Le validazioni frontend R25 restano attive e bloccano il salvataggio.
    cmp.clearBoard();
    cmp.onNameChange('Senza re');
    cmp.save();
    expect(cmp.error()).toContain('esattamente un re bianco e un re nero');
  });

  it('keeps the unsaved-changes guard of R25', async () => {
    const { cmp, asked } = setupMiddlegame();
    expect(cmp.dirty()).toBe(false);
    expect(await cmp.canDeactivate()).toBe(true);
    expect(asked()).toBe(0);

    cmp.onNameChange('Bozza');
    expect(cmp.dirty()).toBe(true);
    expect(await cmp.canDeactivate()).toBe(true); // il doppio conferma l'uscita
    expect(asked()).toBe(1);
  });
});
