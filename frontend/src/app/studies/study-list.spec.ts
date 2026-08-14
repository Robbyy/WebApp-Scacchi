import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { StudyList } from './study-list';
import { StudyService } from '../core/study.service';
import { Study } from '../core/study.model';
import { ReviewService } from '../core/review.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';

const s1: Study = { id: 1, name: 'Repertorio', phase: 'OPENING', variantCount: 2 };
const s2: Study = { id: 2, name: 'Siciliana', color: 'BLACK', phase: 'OPENING', variantCount: 0 };
const s3: Study = { id: 3, name: 'Finali', phase: 'ENDGAME', variantCount: 1 };

function setup(service: Partial<StudyService>, confirmResult = true) {
  TestBed.configureTestingModule({
    imports: [StudyList],
    providers: [
      provideRouter([]),
      { provide: StudyService, useValue: service },
      { provide: ReviewService, useValue: { getDue: () => of([]) } },
      { provide: ConfirmService, useValue: { ask: () => Promise.resolve(confirmResult) } },
      { provide: ToastService, useValue: { success() {}, error() {}, info() {} } },
    ],
  });
  const fixture = TestBed.createComponent(StudyList);
  fixture.detectChanges();
  return { fixture, cmp: fixture.componentInstance as any };
}

describe('StudyList', () => {
  it('loads only the opening phase from the service', () => {
    let askedPhase: Study['phase'] | null = null;
    const { cmp } = setup({
      getStudiesByPhase: (phase) => {
        askedPhase = phase;
        return of([s1, s2]);
      },
    });
    expect(askedPhase).toBe('OPENING');
    expect(cmp.studies().length).toBe(2);
    expect(cmp.loading()).toBe(false);
  });

  it('links the "Nuovo studio" CTA to the unified creation page (ISSUE-011)', () => {
    const { fixture } = setup({ getStudiesByPhase: () => of([s1]) });
    const cta = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('a.new-cta:not(.new-cta--ghost)');
    expect(cta?.textContent).toContain('Nuovo studio');
    expect(cta?.getAttribute('href')).toBe('/studies/new');
  });

  it('no longer hosts the inline creation form nor the Lichess CTA (ISSUE-011)', () => {
    const { fixture } = setup({ getStudiesByPhase: () => of([s1]) });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('form')).toBeNull();
    expect(el.textContent).not.toContain('Importa da Lichess');
  });

  it('uses positional terminology for middlegame and endgame studies (R25)', () => {
    const { fixture } = setup({ getStudiesByPhase: () => of([s3]) });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('1 posizione');
    expect(text).not.toContain('1 variante');
  });

  it('removes a study after confirmation', async () => {
    let deletedId: number | null = null;
    const { cmp } = setup({
      getStudiesByPhase: () => of([s1, s2]),
      deleteStudy: (id: number) => {
        deletedId = id;
        return of(void 0);
      },
    });
    await cmp.remove(s1);
    expect(deletedId).toBe(1);
    expect(cmp.studies().some((x: Study) => x.id === 1)).toBe(false);
  });

  it('does not remove a study when the confirmation is declined', async () => {
    let deletedId: number | null = null;
    const { cmp } = setup(
      {
        getStudiesByPhase: () => of([s1, s2]),
        deleteStudy: (id: number) => {
          deletedId = id;
          return of(void 0);
        },
      },
      false,
    );
    await cmp.remove(s1);
    expect(deletedId).toBeNull();
    expect(cmp.studies().length).toBe(2);
  });
});
