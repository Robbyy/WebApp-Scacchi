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

/** Studio Mediogioco con le stesse due schede, usate qui come posizioni. */
function middlegameStudy(variants: Variant[] = [v1, v2]): Study {
  return {
    id: 1,
    name: 'Strutture di pedoni',
    phase: 'MIDDLEGAME',
    variantCount: variants.length,
    variants: structuredClone(variants),
  };
}

function setup(
  studyService: Partial<StudyService>,
  variantService: Partial<VariantService> = {},
  confirmResult = true,
  /** `data` della route: con il contesto di sezione il dettaglio è Mediogioco. */
  data: Record<string, unknown> = {},
) {
  TestBed.configureTestingModule({
    imports: [StudyDetail],
    providers: [
      provideRouter([]),
      { provide: StudyService, useValue: studyService },
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
    const middlegameStudy: Study = { ...structuredClone(study), phase: 'MIDDLEGAME' };
    const { fixture } = setup({ getStudy: () => of(middlegameStudy) });
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
});
