import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ReviewDue } from './review-due';
import { ReviewService } from '../core/review.service';

function setup(due: unknown) {
  TestBed.configureTestingModule({
    imports: [ReviewDue],
    providers: [
      provideRouter([]),
      {
        provide: ReviewService,
        useValue: {
          getDue: () => (due instanceof Error ? throwError(() => due) : of(due)),
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(ReviewDue);
  fixture.detectChanges();
  return { fixture, cmp: fixture.componentInstance as any };
}

describe('ReviewDue', () => {
  it('lists due variants with a human-readable label', () => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 86_400_000).toISOString().slice(0, 10);
    const { cmp } = setup([
      { variantId: 11, variantName: 'Italiana', color: 'WHITE', studyName: 'Repertorio', nextReviewDate: yesterday },
    ]);
    expect(cmp.loading()).toBe(false);
    const rows = cmp.rows();
    expect(rows.length).toBe(1);
    expect(rows[0]).toMatchObject({ variantId: 11, variantName: 'Italiana', late: true });
    expect(rows[0].label).toContain('In ritardo');
  });

  it('shows an empty state when nothing is due', () => {
    const { cmp } = setup([]);
    expect(cmp.rows().length).toBe(0);
    expect(cmp.loading()).toBe(false);
  });

  it('sets an error when the request fails', () => {
    const { cmp } = setup(new Error('boom'));
    expect(cmp.error()).toBeTruthy();
    expect(cmp.loading()).toBe(false);
  });
});
