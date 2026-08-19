import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PositionEditor } from './position-editor';
import { ConfirmService } from '../core/confirm.service';
import { StudyService } from '../core/study.service';
import { ToastService } from '../core/toast.service';
import { VariantService } from '../core/variant.service';
import { PositionThemeService } from '../core/position-theme.service';
import { Study } from '../core/study.model';
import {
  CreateVariantRequest,
  MAX_POSITION_DESCRIPTION_LENGTH,
  MAX_POSITION_SOURCE_LENGTH,
  MAX_THEME_DESCRIPTION_LENGTH,
  Variant,
} from '../core/variant.model';
import { PositionTheme } from '../core/position-theme.model';
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

/** Catalogo tattico minimo (R26.3), usato dal mock di `PositionThemeService`. */
const TACTICAL_THEMES: PositionTheme[] = [
  { id: 1001, code: 'DOUBLE_ATTACK', studyType: 'TACTICAL', displayLabel: 'doppio attacco', displayOrder: 1 },
  { id: 1002, code: 'PIN', studyType: 'TACTICAL', displayLabel: 'inchiodatura', displayOrder: 2 },
];

interface SetupOptions {
  save?: (request: CreateVariantRequest) => unknown;
  phase?: Study['phase'];
  /** Tipologia dello studio Mediogioco (R26.3): `null` per un legacy «Da classificare». */
  studyType?: Study['studyType'];
  variantCount?: number;
  /** Route di setup di una posizione esistente (`positions/:id/setup`). */
  positionId?: number;
  /** Posizione caricata in modifica, per i contratti R25. */
  position?: Variant;
  /** `data` della route: con il contesto l'editor è quello di sezione. */
  data?: Record<string, unknown>;
  themes?: PositionTheme[];
}

function setup(options: SetupOptions = {}) {
  let captured: CreateVariantRequest | null = null;
  let updatedId: number | null = null;
  let asked = 0;
  const currentStudy: Study = {
    ...study,
    phase: options.phase ?? study.phase,
    studyType: options.studyType,
    variantCount: options.variantCount ?? study.variantCount,
  };
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
        provide: PositionThemeService,
        useValue: {
          getThemes: () => of(options.themes ?? TACTICAL_THEMES),
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

/**
 * Come `setup`, ma montando l'editor sotto le route `/middlegame` con uno
 * studio classificato `TACTICAL` di default (R26.3): la maggior parte degli
 * scenari felici presuppone uno studio già classificato, coerente con il
 * blocco lato backend/UI di una nuova posizione prima della classificazione
 * (task 2.3/5.2), verificato a parte.
 */
function setupMiddlegame(options: SetupOptions = {}) {
  return setup({
    phase: 'MIDDLEGAME',
    studyType: 'TACTICAL',
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
    const { el, cmp } = setup();
    const crumbs = Array.from(el.querySelectorAll('.crumb')).map((c) => c.textContent?.trim());
    expect(crumbs).toEqual(['Studi', 'Finali pratici', 'Nuova posizione']);
    // La traccia non è navigabile, ma i percorsi generici R25 restano quelli.
    expect(el.querySelectorAll('.crumbs a').length).toBe(0);
    expect(cmp.listLink).toBe('/');
    expect(cmp.studyLink()).toBe('/studies/7');
    expect(link(el, 'Annulla')?.getAttribute('href')).toBe('/studies/7');
  });

  it('drops the kicker and the FEN counters note', () => {
    const { el } = setup({ positionId: 31 });
    // Come in R26.2 sull'altro editor posizionale: traccia, route e titolo
    // identificano già la modalità, quindi il kicker sarebbe ridondante.
    expect(el.querySelector('.kicker')).toBeNull();
    const text = el.textContent ?? '';
    // Resta la sola occorrenza della traccia: non è più duplicata sopra il titolo.
    expect((text.match(/Modifica posizione/g) ?? []).length).toBe(1);
    expect(text).not.toContain('I contatori');
    // Titolo, FEN generata e la nota sull'en passant restano al loro posto.
    expect(el.querySelector('h2')?.textContent?.trim()).toBe('Configura la posizione iniziale');
    expect(el.querySelector('textarea')).not.toBeNull();
    expect(text).toContain('Disponibile solo dopo una doppia mossa');
  });

  it('keeps the generic cancel target while editing an existing position (R25)', () => {
    const { el } = setup({ positionId: 31 });
    expect(link(el, 'Annulla')?.getAttribute('href')).toBe('/studies/7');
  });

  it('does not show the Mediogioco metadata fields for an endgame study (regression)', () => {
    const { el, cmp } = setup();
    expect(cmp.isMiddlegame()).toBe(false);
    expect(el.querySelector('.metadata-fields')).toBeNull();
    expect(el.textContent).not.toContain('Dati Mediogioco');
  });
});

describe('PositionEditor (Mediogioco, ISSUE-016/R26.3)', () => {
  it('creates a position with its required theme and default order (task 5.3)', () => {
    const { cmp, captured, navigated } = setupMiddlegame({ variantCount: 2 });
    cmp.useStandardPosition();
    cmp.onNameChange('Struttura Carlsbad');
    cmp.themeId.set(1001);
    cmp.save();

    expect(cmp.ready()).toBe(true);
    // L'ordine predefinito è fine lista (N+1): 2 posizioni esistenti → 3.
    expect(cmp.positionOrder()).toBe(3);
    expect(captured()).toEqual({
      name: 'Struttura Carlsbad',
      moves: [],
      tree: [],
      startingFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      themeId: 1001,
      themeDescription: null,
      description: null,
      difficulty: null,
      source: null,
      positionOrder: 3,
    });
    // Dopo il salvataggio si apre l'editor delle mosse canonico.
    expect(navigated()).toBe('/middlegame/positions/31/edit');
  });

  it('sends the optional metadata (theme description, description, difficulty, source)', () => {
    const { cmp, captured } = setupMiddlegame();
    cmp.useStandardPosition();
    cmp.onNameChange('Attacco al re');
    cmp.themeId.set(1002);
    cmp.themeDescription.set('  Debolezza in f7  ');
    cmp.description.set('  Il nero ha appena giocato Ce7?!  ');
    cmp.difficulty.set('ADVANCED');
    cmp.source.set('  Partita personale  ');
    cmp.save();

    expect(captured()).toEqual({
      name: 'Attacco al re',
      moves: [],
      tree: [],
      startingFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      themeId: 1002,
      themeDescription: 'Debolezza in f7',
      description: 'Il nero ha appena giocato Ce7?!',
      difficulty: 'ADVANCED',
      source: 'Partita personale',
      positionOrder: 1,
    });
  });

  it('rejects a new position without a theme (task 5.3, spec "Reject a new position without theme")', () => {
    const { cmp, captured } = setupMiddlegame();
    cmp.useStandardPosition();
    cmp.onNameChange('Senza tema');
    cmp.save();

    expect(captured()).toBeNull();
    expect(cmp.error()).toContain('tema');
  });

  /**
   * I limiti sono gli stessi che il backend applica in `VariantValidator`: qui
   * impediscono di digitare oltre, là sono il contratto. Il test li lega alle
   * costanti condivise, così non tornano a essere numeri magici nel template.
   */
  it('caps the metadata fields with the shared limits', () => {
    const { el } = setupMiddlegame();
    const maxOf = (name: string) =>
      el.querySelector<HTMLInputElement>(`[name="${name}"]`)?.getAttribute('maxlength');

    expect(maxOf('themeDescription')).toBe(String(MAX_THEME_DESCRIPTION_LENGTH));
    expect(maxOf('description')).toBe(String(MAX_POSITION_DESCRIPTION_LENGTH));
    expect(maxOf('source')).toBe(String(MAX_POSITION_SOURCE_LENGTH));
  });

  it('keeps the metadata panel collapsed on load, with the form actions above the fold', () => {
    const { el, cmp } = setupMiddlegame();
    const panel = el.querySelector<HTMLDetailsElement>('details.metadata-fields');

    expect(cmp.metadataOpen()).toBe(false);
    expect(panel?.open).toBe(false);
    expect(panel?.querySelector('summary')?.textContent?.trim()).toBe('Dati Mediogioco');
    // Da chiuso i campi restano nel DOM: binding e validazione non cambiano.
    expect(panel?.querySelector('select[name="themeId"]')).not.toBeNull();
    expect(panel?.querySelector('select[name="difficulty"]')).not.toBeNull();
  });

  it('reopens the metadata panel when saving without the required theme', () => {
    const { el, fixture, cmp } = setupMiddlegame();
    cmp.useStandardPosition();
    cmp.onNameChange('Senza tema');
    cmp.save();
    fixture.detectChanges();

    expect(cmp.metadataOpen()).toBe(true);
    expect(el.querySelector<HTMLDetailsElement>('details.metadata-fields')?.open).toBe(true);
  });

  it('leaves the metadata panel closed when the failed validation is not about metadata', () => {
    const { cmp } = setupMiddlegame({ positionId: 31, position: { ...saved, themeId: 1001 } });
    cmp.onNameChange('   ');
    cmp.save();

    expect(cmp.error()).toContain('titolo');
    expect(cmp.metadataOpen()).toBe(false);
  });

  it('tracks the panel state when the user toggles it', () => {
    const { el, cmp } = setupMiddlegame();
    const panel = el.querySelector<HTMLDetailsElement>('details.metadata-fields')!;

    panel.open = true;
    panel.dispatchEvent(new Event('toggle'));
    expect(cmp.metadataOpen()).toBe(true);

    panel.open = false;
    panel.dispatchEvent(new Event('toggle'));
    expect(cmp.metadataOpen()).toBe(false);
  });

  it('renders the theme catalog of the classified study type', () => {
    const { el } = setupMiddlegame();
    const options = Array.from(
      el.querySelectorAll<HTMLOptionElement>('select[name="themeId"] option'),
    ).filter((o) => !o.disabled);
    expect(options.map((o) => o.textContent?.trim())).toEqual(['doppio attacco', 'inchiodatura']);
  });

  it('offers the five difficulty levels plus the empty option', () => {
    const { el } = setupMiddlegame();
    const options = Array.from(
      el.querySelectorAll<HTMLOptionElement>('select[name="difficulty"] option'),
    );
    expect(options.map((o) => o.textContent?.trim())).toEqual([
      '—',
      'Introduttiva',
      'Facile',
      'Intermedia',
      'Avanzata',
      'Esperta',
    ]);
  });

  it('blocks creating a new position in an unclassified legacy study (task 2.3/5.2)', () => {
    const { cmp, el } = setupMiddlegame({ studyType: null });

    expect(cmp.ready()).toBe(false);
    expect(cmp.unclassified()).toBe(true);
    expect(cmp.error()).toContain('Classifica lo studio Mediogioco');
    expect(el.querySelector('.position-editor')).toBeNull();
  });

  it('still allows editing an existing position of an unclassified legacy study', () => {
    const legacy: Variant = { ...saved, themeId: null };
    const { cmp, el } = setupMiddlegame({ studyType: null, positionId: 31, position: legacy });

    expect(cmp.ready()).toBe(true);
    expect(cmp.unclassified()).toBe(true);
    // Nessun catalogo da offrire finché lo studio non è classificato.
    expect(el.querySelector('select[name="themeId"]')).toBeNull();
    expect(el.textContent).toContain('Classifica lo studio');
  });

  it('updates the starting position from the setup route and opens the move editor', () => {
    const existing: Variant = {
      ...saved,
      tree: [{ san: 'e4', children: [] }],
      moves: ['e4'],
      startingFen: '4k3/8/8/8/8/8/8/4K3 w - - 0 1',
      themeId: 1001,
    };
    const { cmp, captured, updatedId, navigated } = setupMiddlegame({
      positionId: 31,
      position: existing,
    });

    expect(cmp.isEdit()).toBe(true);
    // La FEN persistita popola la scacchiera dell'editor (contratto R25).
    expect(cmp.startingFen()).toBe('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    // I metadati esistenti popolano il form (task 5.3).
    expect(cmp.themeId()).toBe(1001);
    cmp.selectPiece('wP');
    cmp.placeOn('e2');
    cmp.save();

    expect(updatedId()).toBe(31);
    // L'albero già salvato non viene scartato dal solo cambio di posizione, e
    // il riordino non viaggia con l'update (contratto dedicato, task 3.5/5.5).
    expect(captured()).toEqual({
      name: 'Re e pedone',
      moves: ['e4'],
      tree: [{ san: 'e4', children: [] }],
      startingFen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
      themeId: 1001,
      themeDescription: null,
      description: null,
      difficulty: null,
      source: null,
    });
    expect(navigated()).toBe('/middlegame/positions/31/edit');
  });

  it('assigns the missing theme to a legacy position once the study is classified', () => {
    const legacy: Variant = { ...saved, themeId: null };
    const { cmp, captured } = setupMiddlegame({ positionId: 31, position: legacy });

    expect(cmp.themeId()).toBeNull();
    cmp.themeId.set(1002);
    cmp.save();

    expect((captured() as CreateVariantRequest).themeId).toBe(1002);
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
    const { el, cmp } = setupMiddlegame();
    const crumbs = Array.from(el.querySelectorAll('.crumb')).map((c) => c.textContent?.trim());
    expect(crumbs).toEqual(['Mediogioco', 'Finali pratici', 'Nuova posizione']);
    // Inerte come nell'editor generico, ma i percorsi di sezione restano canonici.
    expect(el.querySelectorAll('.crumbs a').length).toBe(0);
    expect(cmp.listLink).toBe('/middlegame');
    expect(cmp.studyLink()).toBe('/middlegame/studies/7');
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
    cmp.themeId.set(1001);
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
