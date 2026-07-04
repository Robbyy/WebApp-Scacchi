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
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Importa da Lichess');
    expect(text).toContain('Statistiche dello studio');
  });

  it('hides the Lichess import and stats links for a non-opening study (ISSUE-016)', () => {
    const middlegameStudy: Study = { ...structuredClone(study), phase: 'MIDDLEGAME' };
    const { fixture } = setup({ getStudy: () => of(middlegameStudy) });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Importa da Lichess');
    expect(text).not.toContain('Statistiche dello studio');
    // Le posizioni restano creabili manualmente (P16-016): "Nuova variante"/"Importa PGN" restano visibili.
    expect(text).toContain('Nuova variante');
    expect(text).toContain('Importa PGN');
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
