import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { StudyStats } from './study-stats';
import { StudyService } from '../core/study.service';
import { StatsService } from '../core/stats.service';

function setup(study: unknown, stats: unknown) {
  TestBed.configureTestingModule({
    imports: [StudyStats],
    providers: [
      provideRouter([]),
      { provide: StudyService, useValue: { getStudy: () => of(study) } },
      { provide: StatsService, useValue: { getStudyStats: () => of(stats) } },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } } },
    ],
  });
  const fixture = TestBed.createComponent(StudyStats);
  fixture.detectChanges();
  return { fixture, cmp: fixture.componentInstance as any };
}

describe('StudyStats', () => {
  it('aggregates and resolves variant names for the breakdown', () => {
    const study = {
      id: 1, name: 'Repertorio', variantCount: 2,
      variants: [
        { id: 11, name: 'Italiana', color: 'WHITE', moves: [], startingFen: '' },
        { id: 12, name: 'Siciliana', color: 'BLACK', moves: [], startingFen: '' },
      ],
    };
    const stats = {
      studyId: 1, sessionCount: 3, completedCount: 2, totalMistakes: 4,
      avgMistakes: 1.33, accuracy: 0.7, lastTrainedAt: '2026-06-27T10:00:00Z',
      topMistakes: [{ expectedSan: 'Nf3', count: 2 }],
      variants: [
        { variantId: 11, sessionCount: 2, completedCount: 2, totalMistakes: 3, avgMistakes: 1.5, accuracy: 0.6, lastTrainedAt: null, topMistakes: [] },
        { variantId: 12, sessionCount: 1, completedCount: 0, totalMistakes: 1, avgMistakes: 1, accuracy: 0.5, lastTrainedAt: null, topMistakes: [] },
      ],
    };
    const { cmp } = setup(study, stats);
    expect(cmp.hasData()).toBe(true);
    expect(cmp.accuracyPct()).toBe(70);
    const rows = cmp.rows();
    expect(rows.length).toBe(2);
    expect(rows[0]).toMatchObject({ variantId: 11, name: 'Italiana', accuracyPct: 60 });
    expect(rows[1]).toMatchObject({ variantId: 12, name: 'Siciliana', accuracyPct: 50 });
  });

  it('falls back to a placeholder name for unknown variants', () => {
    const { cmp } = setup(
      { id: 1, name: 'S', variantCount: 0, variants: [] },
      {
        studyId: 1, sessionCount: 1, completedCount: 1, totalMistakes: 0,
        avgMistakes: 0, accuracy: 1, lastTrainedAt: null, topMistakes: [],
        variants: [{ variantId: 99, sessionCount: 1, completedCount: 1, totalMistakes: 0, avgMistakes: 0, accuracy: 1, lastTrainedAt: null, topMistakes: [] }],
      },
    );
    expect(cmp.rows()[0].name).toBe('Variante #99');
  });
});
