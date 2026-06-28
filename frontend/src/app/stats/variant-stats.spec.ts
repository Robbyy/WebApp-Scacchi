import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { VariantStats } from './variant-stats';
import { VariantService } from '../core/variant.service';
import { StatsService } from '../core/stats.service';

function setup(variant: unknown, stats: unknown) {
  TestBed.configureTestingModule({
    imports: [VariantStats],
    providers: [
      provideRouter([]),
      { provide: VariantService, useValue: { getVariant: () => of(variant) } },
      { provide: StatsService, useValue: { getVariantStats: () => of(stats) } },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '3' }) } } },
    ],
  });
  const fixture = TestBed.createComponent(VariantStats);
  fixture.detectChanges();
  return { fixture, cmp: fixture.componentInstance as any };
}

const variant = { id: 3, name: 'Italiana', color: 'WHITE', moves: ['e4'], startingFen: '' };

describe('VariantStats', () => {
  it('loads variant and stats and exposes derived values', () => {
    const { cmp } = setup(variant, {
      variantId: 3, sessionCount: 2, completedCount: 2, totalMistakes: 2,
      avgMistakes: 1, accuracy: 0.6, lastTrainedAt: '2026-06-27T10:00:00Z',
      topMistakes: [{ expectedSan: 'Nf3', count: 2 }],
    });
    expect(cmp.loading()).toBe(false);
    expect(cmp.hasData()).toBe(true);
    expect(cmp.accuracyPct()).toBe(60);
    expect(cmp.lastTrained()).toContain('2026');
    expect(cmp.stats().topMistakes[0].expectedSan).toBe('Nf3');
  });

  it('flags no data when there are no sessions', () => {
    const { cmp } = setup(variant, {
      variantId: 3, sessionCount: 0, completedCount: 0, totalMistakes: 0,
      avgMistakes: 0, accuracy: null, lastTrainedAt: null, topMistakes: [],
    });
    expect(cmp.hasData()).toBe(false);
    expect(cmp.accuracyPct()).toBeNull();
  });
});
