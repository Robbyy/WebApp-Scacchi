import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { StudyList } from './study-list';
import { StudyService } from '../core/study.service';
import { Study } from '../core/study.model';
import { ReviewService } from '../core/review.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';

const s1: Study = { id: 1, name: 'Repertorio', variantCount: 2 };
const s2: Study = { id: 2, name: 'Siciliana', color: 'BLACK', variantCount: 0 };

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
  it('loads studies from the service', () => {
    const { cmp } = setup({ getStudies: () => of([s1, s2]) });
    expect(cmp.studies().length).toBe(2);
    expect(cmp.loading()).toBe(false);
  });

  it('creates a study and appends it to the list', () => {
    let captured: unknown = null;
    const created: Study = { id: 9, name: 'Nuovo', color: 'WHITE', variantCount: 0 };
    const { cmp } = setup({
      getStudies: () => of([s1]),
      createStudy: (req: unknown) => {
        captured = req;
        return of(created);
      },
    });
    cmp.openForm();
    cmp.newName.set('Nuovo');
    cmp.newColor.set('WHITE');
    cmp.createStudy();
    expect(captured).toEqual({ name: 'Nuovo', description: null, color: 'WHITE' });
    expect(cmp.studies().length).toBe(2);
    expect(cmp.creating()).toBe(false);
  });

  it('does not create a study with a blank name', () => {
    let called = false;
    const { cmp } = setup({
      getStudies: () => of([]),
      createStudy: () => {
        called = true;
        return of(s1);
      },
    });
    cmp.openForm();
    cmp.newName.set('   ');
    cmp.createStudy();
    expect(called).toBe(false);
  });

  it('removes a study after confirmation', async () => {
    let deletedId: number | null = null;
    const { cmp } = setup({
      getStudies: () => of([s1, s2]),
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
        getStudies: () => of([s1, s2]),
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
