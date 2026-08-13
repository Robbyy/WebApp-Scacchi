import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { StudyDetail } from './study-detail';
import { StudyService } from '../core/study.service';
import { VariantService } from '../core/variant.service';
import { Study } from '../core/study.model';
import { Variant } from '../core/variant.model';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';

const v1: Variant = { id: 11, name: 'Italiana', color: 'WHITE', moves: ['e4', 'e5'], startingFen: '', studyId: 1 };
const v2: Variant = { id: 12, name: 'Spagnola', color: 'WHITE', moves: ['e4'], startingFen: '', studyId: 1 };
const study: Study = { id: 1, name: 'Repertorio', phase: 'OPENING', variantCount: 2, variants: [v1, v2] };

function setup(
  studyService: Partial<StudyService>,
  variantService: Partial<VariantService> = {},
  confirmResult = true,
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
        useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } },
      },
    ],
  });
  const fixture = TestBed.createComponent(StudyDetail);
  fixture.detectChanges();
  return { fixture, cmp: fixture.componentInstance as any };
}

describe('StudyDetail', () => {
  it('loads the study with its variants', () => {
    const { cmp } = setup({ getStudy: () => of(study) });
    expect(cmp.study()?.name).toBe('Repertorio');
    expect(cmp.variants().length).toBe(2);
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
