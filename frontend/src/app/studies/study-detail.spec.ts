import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { StudyDetail } from './study-detail';
import { StudyService } from '../core/study.service';
import { VariantService } from '../core/variant.service';
import { Study } from '../core/study.model';
import { Variant } from '../core/variant.model';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { MIDDLEGAME_SECTION_CONTEXT, SECTION_CONTEXT_DATA } from '../core/study-sections';

const v1: Variant = { id: 11, name: 'Italiana', color: 'WHITE', moves: ['e4', 'e5'], startingFen: '', studyId: 1 };
const v2: Variant = { id: 12, name: 'Spagnola', color: 'WHITE', moves: ['e4'], startingFen: '', studyId: 1 };
const study: Study = { id: 1, name: 'Repertorio', phase: 'OPENING', variantCount: 2, variants: [v1, v2] };

/**
 * Studio Mediogioco con le stesse due schede, usate qui come posizioni.
 * Classificato `TACTICAL` di default (R26.3): la maggior parte degli
 * scenari felici presuppone uno studio già classificato — lo stato «Da
 * classificare» è coperto a parte dai suoi test dedicati.
 */
function middlegameStudy(variants: Variant[] = [v1, v2], overrides: Partial<Study> = {}): Study {
  return {
    id: 1,
    name: 'Strutture di pedoni',
    phase: 'MIDDLEGAME',
    studyType: 'TACTICAL',
    variantCount: variants.length,
    variants: structuredClone(variants),
    ...overrides,
  };
}

function setup(
  studyService: Partial<StudyService>,
  variantService: Partial<VariantService> = {},
  confirmResult = true,
  /** `data` della route: con il contesto di sezione il dettaglio è Mediogioco. */
  data: Record<string, unknown> = {},
) {
  // Un Mediogioco chiede sempre il riepilogo dei tentativi al caricamento
  // (task 5.6): stub di default innocuo, sovrascrivibile dal singolo test.
  const service: Partial<StudyService> = {
    getAttemptsSummary: () => of([]),
    reorderVariants: (_id: number, variantIds: number[]) =>
      of(variantIds.map((id) => ({ id }) as unknown as Variant)),
    ...studyService,
  };
  TestBed.configureTestingModule({
    imports: [StudyDetail],
    providers: [
      provideRouter([]),
      { provide: StudyService, useValue: service },
      { provide: VariantService, useValue: variantService },
      { provide: ConfirmService, useValue: { ask: () => Promise.resolve(confirmResult) } },
      { provide: ToastService, useValue: { success() {}, error() {}, info() {} } },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }), data } },
      },
    ],
  });
  const fixture = TestBed.createComponent(StudyDetail);
  fixture.detectChanges();
  return { fixture, cmp: fixture.componentInstance as any };
}

/** Come `setup`, ma montando il dettaglio sotto le route `/middlegame`. */
function setupMiddlegame(
  studyService: Partial<StudyService>,
  variantService: Partial<VariantService> = {},
  confirmResult = true,
) {
  const { fixture, cmp } = setup(studyService, variantService, confirmResult, {
    [SECTION_CONTEXT_DATA]: MIDDLEGAME_SECTION_CONTEXT,
  });
  return { fixture, cmp, el: fixture.nativeElement as HTMLElement };
}

function hrefs(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '');
}

describe('StudyDetail', () => {
  it('loads the study with its variants', () => {
    const { cmp } = setup({ getStudy: () => of(study) });
    expect(cmp.study()?.name).toBe('Repertorio');
    expect(cmp.variants().length).toBe(2);
  });

  it('keeps the generic breadcrumb and variant links (ISSUE-016)', () => {
    const { fixture } = setup({ getStudy: () => of(study) });
    const el = fixture.nativeElement as HTMLElement;
    const crumb = el.querySelector<HTMLAnchorElement>('.crumbs a');
    expect(crumb?.textContent?.trim()).toBe('Studi');
    expect(crumb?.getAttribute('href')).toBe('/');
    expect(
      Array.from(el.querySelectorAll<HTMLAnchorElement>('a.variant-main')).map((a) =>
        a.getAttribute('href'),
      ),
    ).toEqual(['/variants/11', '/variants/12']);
  });

  it('keeps the generic position CTA for a non-opening study opened outside a section', () => {
    const { fixture } = setup({ getStudy: () => of(middlegameStudy()) });
    const el = fixture.nativeElement as HTMLElement;
    const cta = el.querySelector<HTMLAnchorElement>('a.new-cta');
    expect(cta?.textContent).toContain('Nuova posizione');
    expect(cta?.getAttribute('href')).toBe('/positions/new?studyId=1');
  });

  it('shows the Lichess import and stats links for an opening study', () => {
    const { fixture } = setup({ getStudy: () => of(study) });
    const el = fixture.nativeElement as HTMLElement;
    const text = el.textContent ?? '';
    expect(text).toContain('Importa da Lichess');
    expect(text).toContain('Statistiche dello studio');
    // ISSUE-011: l'import punta alla pagina unificata, preservando lo studyId.
    const lichessLink = Array.from(el.querySelectorAll<HTMLAnchorElement>('a')).find((a) =>
      a.textContent?.includes('Importa da Lichess'),
    );
    expect(lichessLink?.getAttribute('href')).toBe('/studies/new?studyId=1');
  });

  it('offers the visual position editor only for a non-opening study (R25)', () => {
    // Classificato (R26.3): un Mediogioco «Da classificare» non offre la CTA
    // di creazione, coperto a parte dai test dedicati alla classificazione.
    const classifiedMiddlegame: Study = { ...structuredClone(study), phase: 'MIDDLEGAME', studyType: 'TACTICAL' };
    const { fixture } = setup({ getStudy: () => of(classifiedMiddlegame) });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Importa da Lichess');
    expect(text).not.toContain('Statistiche dello studio');
    expect(text).toContain('Nuova posizione');
    expect(text).not.toContain('Nuova variante');
    expect(text).not.toContain('Importa PGN');
    expect(text).toContain('posizioni');
  });

  it('opens the inline edit form prefilled with the study metadata (ISSUE-012)', () => {
    const withMeta: Study = { ...study, description: 'Vecchia nota', color: 'WHITE' };
    const { fixture, cmp } = setup({ getStudy: () => of(withMeta) });
    cmp.openEdit();
    fixture.detectChanges();

    expect(cmp.editing()).toBe(true);
    expect(cmp.editName()).toBe('Repertorio');
    expect(cmp.editDescription()).toBe('Vecchia nota');
    expect(cmp.editColor()).toBe('WHITE');
    expect((fixture.nativeElement as HTMLElement).querySelector('form.edit-form')).not.toBeNull();
  });

  it('saves the edited metadata with the existing PUT and without sending the phase', () => {
    let capturedId: number | null = null;
    let captured: any = null;
    const { cmp } = setup({
      getStudy: () => of(structuredClone(study)),
      updateStudy: (id: number, req: unknown) => {
        capturedId = id;
        captured = req;
        return of({ ...study, name: 'Rinominato', description: 'Nota', color: 'MIXED', variants: null });
      },
    });
    cmp.openEdit();
    cmp.editName.set('  Rinominato ');
    cmp.editDescription.set('Nota');
    cmp.editColor.set('MIXED');
    cmp.saveEdit();

    expect(capturedId).toBe(1);
    // La fase non è mai inviata: resta quella scelta alla creazione (ISSUE-016).
    expect(captured).toEqual({ name: 'Rinominato', description: 'Nota', color: 'MIXED' });
    expect(cmp.editing()).toBe(false);
    expect(cmp.study()?.name).toBe('Rinominato');
    expect(cmp.study()?.color).toBe('MIXED');
    // L'elenco varianti già caricato non viene perso dall'aggiornamento dei metadati.
    expect(cmp.variants().length).toBe(2);
  });

  it('does not save the edit without a name', () => {
    let called = false;
    const { cmp } = setup({
      getStudy: () => of(structuredClone(study)),
      updateStudy: () => { called = true; return of(structuredClone(study)); },
    });
    cmp.openEdit();
    cmp.editName.set('   ');
    cmp.saveEdit();
    expect(called).toBe(false);
    expect(cmp.editing()).toBe(true);
  });

  it('cancels the edit leaving the study untouched', () => {
    const { cmp } = setup({ getStudy: () => of(structuredClone(study)) });
    cmp.openEdit();
    cmp.editName.set('Altro nome');
    cmp.cancelEdit();
    expect(cmp.editing()).toBe(false);
    expect(cmp.study()?.name).toBe('Repertorio');
  });

  it('removes a variant after confirmation and updates the count', async () => {
    let deletedId: number | null = null;
    const { cmp } = setup(
      { getStudy: () => of(structuredClone(study)) },
      { deleteVariant: (id: number) => { deletedId = id; return of(void 0); } },
    );
    await cmp.removeVariant(v1);
    expect(deletedId).toBe(11);
    expect(cmp.variants().some((x: Variant) => x.id === 11)).toBe(false);
    expect(cmp.study()?.variantCount).toBe(1);
  });

  it('deletes the whole study and navigates home', async () => {
    let deletedStudy: number | null = null;
    const { cmp } = setup(
      {
        getStudy: () => of(structuredClone(study)),
        deleteStudy: (id: number) => { deletedStudy = id; return of(void 0); },
      },
    );
    const router = TestBed.inject(Router);
    let navTarget: unknown[] | null = null;
    router.navigate = ((c: unknown[]) => { navTarget = c; return Promise.resolve(true); }) as typeof router.navigate;

    await cmp.removeStudy();
    expect(deletedStudy).toBe(1);
    expect(navTarget).toEqual(['/']);
  });

  it('does not delete the study when the confirmation is declined', async () => {
    let deletedStudy: number | null = null;
    const { cmp } = setup(
      {
        getStudy: () => of(structuredClone(study)),
        deleteStudy: (id: number) => { deletedStudy = id; return of(void 0); },
      },
      {},
      false,
    );
    await cmp.removeStudy();
    expect(deletedStudy).toBeNull();
  });
});

describe('StudyDetail (Mediogioco, ISSUE-016)', () => {
  it('presents a middlegame study with positional metadata', () => {
    const { cmp, el } = setupMiddlegame({ getStudy: () => of(middlegameStudy()) });
    expect(cmp.study()?.name).toBe('Strutture di pedoni');
    expect(el.querySelector('.study-title')?.textContent).toContain('Strutture di pedoni');
    expect(el.querySelector('.study-count')?.textContent?.trim()).toBe('2 posizioni');
    expect(el.querySelector('.detail-error')).toBeNull();
  });

  it('refuses an opening study id with a section error', () => {
    const { cmp, el } = setupMiddlegame({ getStudy: () => of(structuredClone(study)) });
    expect(cmp.study()).toBeNull();
    expect(el.querySelector('.detail-error')?.textContent).toContain(
      'non appartiene alla sezione Mediogioco',
    );
    expect(el.querySelector('section.study')).toBeNull();
    expect(el.textContent).not.toContain('Repertorio');
  });

  it('refuses an endgame study id with a section error', () => {
    const endgame: Study = { ...middlegameStudy(), phase: 'ENDGAME', name: 'Finali di torre' };
    const { cmp, el } = setupMiddlegame({ getStudy: () => of(endgame) });
    expect(cmp.study()).toBeNull();
    expect(el.querySelector('.detail-error')?.textContent).toContain(
      'non appartiene alla sezione Mediogioco',
    );
    expect(el.textContent).not.toContain('Finali di torre');
  });

  it('returns to the section from the error of a wrong phase', () => {
    const { el } = setupMiddlegame({ getStudy: () => of(structuredClone(study)) });
    const back = el.querySelector<HTMLAnchorElement>('.detail-error a');
    expect(back?.textContent).toContain('torna a Mediogioco');
    expect(back?.getAttribute('href')).toBe('/middlegame');
  });

  it('shows the canonical breadcrumb of the section', () => {
    const { el } = setupMiddlegame({ getStudy: () => of(middlegameStudy()) });
    const crumb = el.querySelector<HTMLAnchorElement>('.crumbs a');
    expect(crumb?.textContent?.trim()).toBe('Mediogioco');
    expect(crumb?.getAttribute('href')).toBe('/middlegame');
    expect(el.querySelector('.crumb-current')?.textContent).toContain('Strutture di pedoni');
  });

  it('opens each position through its canonical route', () => {
    const { el } = setupMiddlegame({ getStudy: () => of(middlegameStudy()) });
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('a.variant-main'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/middlegame/positions/11',
      '/middlegame/positions/12',
    ]);
    expect(links[0].textContent).toContain('Italiana');
    expect(el.textContent).toContain('2 mosse');
  });

  it('creates a new position keeping the parent study', () => {
    const { el } = setupMiddlegame({ getStudy: () => of(middlegameStudy()) });
    const cta = el.querySelector<HTMLAnchorElement>('a.new-cta');
    expect(cta?.textContent).toContain('Nuova posizione');
    expect(cta?.getAttribute('href')).toBe('/middlegame/positions/new?studyId=1');
  });

  it('shows the sequential guided-study CTA for a classified study (R26.3, task 1.5)', () => {
    const { el } = setupMiddlegame({ getStudy: () => of(middlegameStudy()) });
    const cta = Array.from(el.querySelectorAll<HTMLAnchorElement>('a.new-cta')).find((a) =>
      a.textContent?.includes('Studio sequenziale'),
    );
    expect(cta?.getAttribute('href')).toBe('/middlegame/studies/1/study');
  });

  it('hides the sequential guided-study CTA for an unclassified study (R26.3, task 1.5)', () => {
    const { el } = setupMiddlegame({ getStudy: () => of(middlegameStudy([], { studyType: null })) });
    expect(el.textContent).not.toContain('Studio sequenziale');
  });

  it('hides the sequential guided-study CTA for an opening study (R26.3, task 1.5)', () => {
    const { fixture } = setup({ getStudy: () => of(study) });
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Studio sequenziale');
  });

  it('shows an empty state with the creation action', () => {
    const { el } = setupMiddlegame({ getStudy: () => of(middlegameStudy([])) });
    expect(el.querySelector('.list-muted')?.textContent).toContain('Nessuna posizione in questo studio');
    expect(el.querySelector('.variant-cards')).toBeNull();
    expect(el.querySelector<HTMLAnchorElement>('a.new-cta')?.getAttribute('href')).toBe(
      '/middlegame/positions/new?studyId=1',
    );
  });

  it('keeps every generated link inside the section', () => {
    const { el } = setupMiddlegame({ getStudy: () => of(middlegameStudy()) });
    expect(hrefs(el).every((h) => h === '/middlegame' || h.startsWith('/middlegame/'))).toBe(true);
  });

  it('has none of the opening-only actions (ISSUE-016)', () => {
    const positional = { ...middlegameStudy(), color: 'WHITE' as const };
    const { el } = setupMiddlegame({ getStudy: () => of(positional) });
    const text = el.textContent ?? '';
    expect(text).not.toContain('Statistiche dello studio');
    expect(text).not.toContain('Lichess');
    expect(text).not.toContain('Importa PGN');
    expect(text).not.toContain('Nuova variante');
    expect(text).not.toContain('Allena');
    expect(text).not.toContain('variant');
    expect(el.querySelector('.study-subnav')).toBeNull();
    // Nessun badge di colore sulle posizioni: il lato deriva dalla FEN (R25).
    expect(el.querySelector('.variant-meta .badge')).toBeNull();
    expect(el.querySelector('.study-tags .badge')).toBeNull();
  });

  it('hides color and creation prompts while editing positional metadata', () => {
    const positional = { ...middlegameStudy([]), color: 'WHITE' as const };
    const { cmp, el, fixture } = setupMiddlegame({ getStudy: () => of(positional) });

    cmp.openEdit();
    fixture.detectChanges();

    expect(el.querySelector('form.edit-form')).not.toBeNull();
    expect(el.querySelector('select[name="color"]')).toBeNull();
    expect(el.querySelector('a.new-cta')).toBeNull();
    expect(el.querySelector('.list-muted')).toBeNull();
  });

  it('still edits the metadata with the existing contract', () => {
    let captured: any = null;
    const { cmp, el } = setupMiddlegame({
      getStudy: () => of(middlegameStudy()),
      updateStudy: (_id: number, req: unknown) => {
        captured = req;
        return of({ ...middlegameStudy(), name: 'Rinominato', description: 'Nota', color: null });
      },
    });

    cmp.openEdit();
    cmp.editName.set('Rinominato');
    cmp.editDescription.set('Nota');
    cmp.editColor.set('WHITE');
    cmp.saveEdit();

    // La fase non viaggia mai nell'aggiornamento (ISSUE-016).
    expect(captured).toEqual({ name: 'Rinominato', description: 'Nota', color: null });
    expect(cmp.study()?.name).toBe('Rinominato');
    expect(cmp.study()?.phase).toBe('MIDDLEGAME');
    expect(el.querySelector('app-study-form-fields')).toBeNull();
  });

  it('deletes a position with the existing API and updates the count', async () => {
    let deletedId: number | null = null;
    const { cmp } = setupMiddlegame(
      { getStudy: () => of(middlegameStudy()) },
      {
        deleteVariant: (id: number) => {
          deletedId = id;
          return of(void 0);
        },
      },
    );

    await cmp.removeVariant(v1);
    expect(deletedId).toBe(11);
    expect(cmp.variants().map((v: Variant) => v.id)).toEqual([12]);
    expect(cmp.study()?.variantCount).toBe(1);
  });

  it('deletes the study and returns to the section list', async () => {
    let deletedStudy: number | null = null;
    const { cmp } = setupMiddlegame({
      getStudy: () => of(middlegameStudy()),
      deleteStudy: (id: number) => {
        deletedStudy = id;
        return of(void 0);
      },
    });
    const router = TestBed.inject(Router);
    let navTarget: unknown[] | null = null;
    router.navigate = ((c: unknown[]) => {
      navTarget = c;
      return Promise.resolve(true);
    }) as typeof router.navigate;

    await cmp.removeStudy();
    expect(deletedStudy).toBe(1);
    expect(navTarget).toEqual(['/middlegame']);
  });

  it('reports a missing study without claiming a wrong section', () => {
    const { el } = setupMiddlegame({ getStudy: () => throwError(() => new Error('404')) });
    expect(el.querySelector('.detail-error')?.textContent).toContain('Studio non trovato');
  });

  it('does not show Mediogioco-only elements for an endgame study (regression, Finale)', () => {
    const endgame: Study = { id: 3, name: 'Finali di torre', phase: 'ENDGAME', variantCount: 0, variants: [] };
    const { fixture } = setup({ getStudy: () => of(endgame) });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.study-type-badge')).toBeNull();
    expect(el.querySelector('.classify-panel')).toBeNull();
    expect(el.textContent).not.toContain('Da classificare');
  });
});

describe('StudyDetail (classificazione Mediogioco, R26.3 task 2.3/5.2)', () => {
  function unclassifiedStudy(variants: Variant[] = []): Study {
    return middlegameStudy(variants, { studyType: null });
  }

  it('labels an unclassified legacy study as "Da classificare" and hides the creation CTA', () => {
    const { el } = setupMiddlegame({ getStudy: () => of(unclassifiedStudy()) });
    expect(el.querySelector('.study-type-badge')?.textContent?.trim()).toBe('Da classificare');
    expect(el.querySelector('a.new-cta')).toBeNull();
  });

  it('keeps consultation and metadata editing available while unclassified', () => {
    const { el, cmp } = setupMiddlegame({ getStudy: () => of(unclassifiedStudy([v1])) });
    expect(cmp.study()).not.toBeNull();
    expect(el.querySelector('.detail-error')).toBeNull();
    expect(el.querySelector('a.variant-main')).not.toBeNull();
    expect(el.querySelector('.study-edit')).not.toBeNull();
  });

  it('classifies the study once and unlocks the creation CTA', () => {
    let captured: unknown = null;
    const classified = middlegameStudy([], { studyType: 'STRATEGIC' });
    const { cmp, el, fixture } = setupMiddlegame({
      getStudy: () => of(unclassifiedStudy()),
      updateStudy: (_id: number, req: unknown) => {
        captured = req;
        return of(classified);
      },
    });

    expect(el.querySelector('a.new-cta')).toBeNull();
    cmp.openClassify();
    cmp.classifyType.set('STRATEGIC');
    cmp.saveClassify();
    fixture.detectChanges();

    expect(captured).toEqual({
      name: 'Strutture di pedoni',
      description: null,
      color: null,
      studyType: 'STRATEGIC',
    });
    expect(cmp.study()?.studyType).toBe('STRATEGIC');
    expect(cmp.classifying()).toBe(false);
    expect(el.querySelector('.classify-panel')).toBeNull();
    expect(el.querySelector('a.new-cta')).not.toBeNull();
  });

  it('does not classify without choosing a type', () => {
    let called = false;
    const { cmp } = setupMiddlegame({
      getStudy: () => of(unclassifiedStudy()),
      updateStudy: () => {
        called = true;
        return of(unclassifiedStudy());
      },
    });
    cmp.openClassify();
    cmp.saveClassify();
    expect(called).toBe(false);
  });
});

describe('StudyDetail (tema e difficoltà delle posizioni, R26.3 task 5.4)', () => {
  it('labels a position without a theme as "Tema da assegnare" without disabling its links', () => {
    const legacy: Variant = { ...v1, themeId: null, theme: null };
    const { el } = setupMiddlegame({ getStudy: () => of(middlegameStudy([legacy])) });
    expect(el.textContent).toContain('Tema da assegnare');
    expect(el.querySelector<HTMLAnchorElement>('a.variant-main')?.getAttribute('href')).toBe(
      '/middlegame/positions/11',
    );
  });

  it('shows the assigned theme label and difficulty for a regularized position', () => {
    const themed: Variant = {
      ...v1,
      themeId: 1001,
      theme: { id: 1001, code: 'DOUBLE_ATTACK', studyType: 'TACTICAL', displayLabel: 'doppio attacco', displayOrder: 1 },
      difficulty: 'EASY',
      positionOrder: 1,
    };
    const { el } = setupMiddlegame({ getStudy: () => of(middlegameStudy([themed])) });
    expect(el.textContent).toContain('doppio attacco');
    expect(el.textContent).toContain('Facile');
    expect(el.textContent).not.toContain('Tema da assegnare');
  });
});

describe('StudyDetail (riepilogo tentativi, R26.3 task 5.6)', () => {
  it('shows the last outcome and the attempt count per position', () => {
    const { el } = setupMiddlegame({
      getStudy: () => of(middlegameStudy([v1])),
      getAttemptsSummary: () =>
        of([{ variantId: 11, lastOutcome: 'UNDERSTOOD', attemptCount: 3, lastUnderstoodAt: '2026-06-01T10:00:00Z' }]),
    });
    expect(el.textContent).toContain('Compresa');
    expect(el.textContent).toContain('3 tentativi');
  });

  it('shows "Mai tentata" for a position without attempts, with no percentage anywhere', () => {
    const { el } = setupMiddlegame({
      getStudy: () => of(middlegameStudy([v1])),
      getAttemptsSummary: () => of([]),
    });
    expect(el.textContent).toContain('Mai tentata');
    expect(el.textContent).not.toContain('%');
  });

  it('does not fetch the attempts summary for an opening study (regression)', () => {
    let called = false;
    setup({
      getStudy: () => of(study),
      getAttemptsSummary: () => {
        called = true;
        return of([]);
      },
    });
    expect(called).toBe(false);
  });
});

describe('StudyDetail (riordino, R26.3 task 5.5)', () => {
  const p1: Variant = { ...v1, positionOrder: 1 };
  const p2: Variant = { ...v2, positionOrder: 2 };

  it('moves a position down and persists the new order via PUT .../variants/order', () => {
    let captured: number[] | null = null;
    const { cmp } = setupMiddlegame({
      getStudy: () => of(middlegameStudy([p1, p2])),
      reorderVariants: (_id: number, ids: number[]) => {
        captured = ids;
        return of([
          { ...p2, positionOrder: 1 },
          { ...p1, positionOrder: 2 },
        ]);
      },
    });

    cmp.moveDown(0);

    expect(captured).toEqual([12, 11]);
    expect(cmp.variants().map((v: Variant) => v.id)).toEqual([12, 11]);
    expect(cmp.reordering()).toBe(false);
  });

  it('does not move the first position further up nor the last further down', () => {
    const { cmp } = setupMiddlegame({ getStudy: () => of(middlegameStudy([p1, p2])) });
    cmp.moveUp(0);
    cmp.moveDown(1);
    expect(cmp.variants().map((v: Variant) => v.id)).toEqual([11, 12]);
  });

  it('rolls back to the previous order when the reorder request fails', () => {
    const { cmp } = setupMiddlegame({
      getStudy: () => of(middlegameStudy([p1, p2])),
      reorderVariants: () => throwError(() => new Error('conflict')),
    });

    cmp.moveDown(0);

    expect(cmp.variants().map((v: Variant) => v.id)).toEqual([11, 12]);
    expect(cmp.reordering()).toBe(false);
  });

  /** Evento di trascinamento sintetico: in jsdom `DragEvent` non è costruibile. */
  function dragEvent(): Event {
    const event = new Event('dragover', { bubbles: true, cancelable: true });
    return event;
  }

  it('reorders via drag-and-drop using the same atomic contract', () => {
    let captured: number[] | null = null;
    const { cmp } = setupMiddlegame({
      getStudy: () => of(middlegameStudy([p1, p2])),
      reorderVariants: (_id: number, ids: number[]) => {
        captured = ids;
        return of([
          { ...p2, positionOrder: 1 },
          { ...p1, positionOrder: 2 },
        ]);
      },
    });

    cmp.onDragStart(0);
    cmp.onDragOver(dragEvent(), 1);
    cmp.onListDrop(dragEvent());

    expect(captured).toEqual([12, 11]);
  });

  /**
   * Fra una card e l'altra `.variant-cards` lascia 12px che non appartengono a
   * nessuna: rilasciare lì — cosa frequente spostando di una sola posizione —
   * non produceva alcun drop sulla card. Il drop è ora gestito sulla lista, che
   * ricorda l'ultima card sorvolata.
   */
  it('still moves when the pointer is released in the gap between two cards', () => {
    let captured: number[] | null = null;
    const { cmp } = setupMiddlegame({
      getStudy: () => of(middlegameStudy([p1, p2])),
      reorderVariants: (_id: number, ids: number[]) => {
        captured = ids;
        return of([
          { ...p2, positionOrder: 1 },
          { ...p1, positionOrder: 2 },
        ]);
      },
    });

    cmp.onDragStart(0);
    cmp.onDragOver(dragEvent(), 1); // sorvola la seconda card
    cmp.onListDragOver(dragEvent()); // poi lo spazio fra le due
    cmp.onListDrop(dragEvent());

    expect(captured).toEqual([12, 11]);
  });

  /**
   * Un trascinamento abbandonato (rilasciato fuori dalla lista, o annullato con
   * Esc) non produce alcun drop: senza `dragend` la card restava a `opacity: .5`
   * e sembrava disabilitata.
   */
  it('clears the drag state when the drag ends without a drop', () => {
    const { cmp } = setupMiddlegame({ getStudy: () => of(middlegameStudy([p1, p2])) });

    cmp.onDragStart(0);
    expect(cmp.dragIndexIs(0)).toBe(true);

    cmp.onDragEnd();

    expect(cmp.dragIndexIs(0)).toBe(false);
  });

  it('does not reorder when the drag ends outside any card', () => {
    let called = false;
    const { cmp } = setupMiddlegame({
      getStudy: () => of(middlegameStudy([p1, p2])),
      reorderVariants: () => {
        called = true;
        return of([]);
      },
    });

    cmp.onDragStart(0);
    cmp.onDragEnd();

    expect(called).toBe(false);
    expect(cmp.variants().map((v: Variant) => v.id)).toEqual([11, 12]);
  });

  it('does not reorder for an opening study (regression)', () => {
    let called = false;
    const { cmp } = setup({
      getStudy: () => of(study),
      reorderVariants: () => {
        called = true;
        return of([]);
      },
    });
    cmp.moveDown(0);
    expect(called).toBe(false);
  });
});

describe('StudyDetail (perimetro dello studio guidato, R26.3 task 8.4)', () => {
  function ctas(el: HTMLElement): string[] {
    return Array.from(el.querySelectorAll<HTMLAnchorElement>('.actions a')).map(
      (a) => a.textContent?.trim() ?? '',
    );
  }

  it('offers the sequential guided study only on a classified middlegame study', () => {
    const { fixture } = setupMiddlegame({ getStudy: () => of(middlegameStudy()) });
    const el = fixture.nativeElement as HTMLElement;

    expect(ctas(el)).toEqual(['Nuova posizione', 'Studio sequenziale']);
    expect(hrefs(el)).toContain('/middlegame/studies/1/study');
  });

  it('does not offer the sequential guided study on an unclassified middlegame study', () => {
    const { fixture } = setupMiddlegame({
      getStudy: () => of(middlegameStudy([v1, v2], { studyType: null })),
    });
    const el = fixture.nativeElement as HTMLElement;

    expect(ctas(el)).toEqual([]);
    expect(hrefs(el).some((h) => h.endsWith('/study'))).toBe(false);
  });

  it('does not offer the sequential guided study on an opening study', () => {
    const { fixture } = setup({ getStudy: () => of(study) });
    const el = fixture.nativeElement as HTMLElement;

    expect(ctas(el)).toEqual(['Nuova variante', 'Importa PGN', 'Importa da Lichess']);
    expect(el.textContent).not.toContain('Studio sequenziale');
    expect(hrefs(el).some((h) => h.endsWith('/study'))).toBe(false);
  });

  it('does not offer the sequential guided study on an endgame study (R27 perimeter)', () => {
    // Il Finale non è Aperture né Mediogioco: senza il gate esplicito
    // ricadrebbe nel ramo posizionale e mostrerebbe la CTA guidata.
    const endgame = middlegameStudy([v1, v2], { phase: 'ENDGAME', studyType: null });
    const { fixture } = setup({ getStudy: () => of(endgame) });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).not.toContain('Studio sequenziale');
    expect(hrefs(el).some((h) => h.endsWith('/study'))).toBe(false);
  });
});
