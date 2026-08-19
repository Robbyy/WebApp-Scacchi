import { buildSequenceSnapshot } from './sequence-snapshot';
import { PositionAttemptsSummary } from './attempt.model';
import { Variant } from './variant.model';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function variant(overrides: Partial<Variant> = {}): Variant {
  return {
    id: 1,
    name: 'Posizione',
    color: 'WHITE',
    moves: ['Qh5'],
    startingFen: START,
    studyId: 6,
    themeId: 1001,
    positionOrder: 1,
    eligibleForGuidedStudy: true,
    ...overrides,
  };
}

function summary(overrides: Partial<PositionAttemptsSummary> = {}): PositionAttemptsSummary {
  return { variantId: 1, lastOutcome: null, attemptCount: 0, lastUnderstoodAt: null, ...overrides };
}

describe('buildSequenceSnapshot (R26.3, task 6.2/6.3)', () => {
  it('excludes drafts and incomplete positions regardless of the filter', () => {
    const variants = [
      variant({ id: 1, eligibleForGuidedStudy: true }),
      variant({ id: 2, eligibleForGuidedStudy: false }), // bozza/tema mancante
      variant({ id: 3, eligibleForGuidedStudy: true }),
    ];
    const summaries = variants.map((v) => summary({ variantId: v.id }));
    const result = buildSequenceSnapshot(variants, summaries, 'AUTHOR', 'ALL');
    expect(result.map((v) => v.id)).toEqual([1, 3]);
  });

  it('orders eligible positions by positionOrder ascending for AUTHOR', () => {
    const variants = [
      variant({ id: 3, positionOrder: 3 }),
      variant({ id: 1, positionOrder: 1 }),
      variant({ id: 2, positionOrder: 2 }),
    ];
    const summaries = variants.map((v) => summary({ variantId: v.id }));
    const result = buildSequenceSnapshot(variants, summaries, 'AUTHOR', 'ALL');
    expect(result.map((v) => v.id)).toEqual([1, 2, 3]);
  });

  it('delegates RANDOM order to the injected shuffle without further reordering', () => {
    const variants = [1, 2, 3].map((id) => variant({ id, positionOrder: id }));
    const summaries = variants.map((v) => summary({ variantId: v.id }));
    const reverseShuffle = (items: readonly Variant[]) => [...items].reverse();
    const result = buildSequenceSnapshot(variants, summaries, 'RANDOM', 'ALL', reverseShuffle);
    expect(result.map((v) => v.id)).toEqual([3, 2, 1]);
  });

  it('includes every eligible position for ALL, excluding only ineligible ones', () => {
    const variants = [1, 2, 3].map((id) => variant({ id, positionOrder: id }));
    const summaries = [
      summary({ variantId: 1, attemptCount: 4, lastOutcome: 'UNDERSTOOD' }),
      summary({ variantId: 2, attemptCount: 0 }),
      summary({ variantId: 3, attemptCount: 2, lastOutcome: 'FAILED' }),
    ];
    const result = buildSequenceSnapshot(variants, summaries, 'AUTHOR', 'ALL');
    expect(result.map((v) => v.id)).toEqual([1, 2, 3]);
  });

  it('filters NEVER_ATTEMPTED to attemptCount zero, including positions missing from the summary', () => {
    const variants = [1, 2, 3].map((id) => variant({ id, positionOrder: id }));
    const summaries = [
      summary({ variantId: 1, attemptCount: 0 }),
      summary({ variantId: 2, attemptCount: 3, lastOutcome: 'UNDERSTOOD' }),
      // La posizione 3 non compare nel riepilogo: trattata come mai tentata.
    ];
    const result = buildSequenceSnapshot(variants, summaries, 'AUTHOR', 'NEVER_ATTEMPTED');
    expect(result.map((v) => v.id)).toEqual([1, 3]);
  });

  it('filters TO_REVIEW to a last outcome of FAILED or NOT_UNDERSTOOD', () => {
    const variants = [1, 2, 3, 4].map((id) => variant({ id, positionOrder: id }));
    const summaries = [
      summary({ variantId: 1, attemptCount: 1, lastOutcome: 'FAILED' }),
      summary({ variantId: 2, attemptCount: 1, lastOutcome: 'NOT_UNDERSTOOD' }),
      summary({ variantId: 3, attemptCount: 1, lastOutcome: 'UNDERSTOOD' }),
      summary({ variantId: 4, attemptCount: 0 }),
    ];
    const result = buildSequenceSnapshot(variants, summaries, 'AUTHOR', 'TO_REVIEW');
    expect(result.map((v) => v.id)).toEqual([1, 2]);
  });

  it('filters UNDERSTOOD to a last outcome of UNDERSTOOD', () => {
    const variants = [1, 2, 3].map((id) => variant({ id, positionOrder: id }));
    const summaries = [
      summary({ variantId: 1, attemptCount: 1, lastOutcome: 'FAILED' }),
      summary({ variantId: 2, attemptCount: 2, lastOutcome: 'UNDERSTOOD' }),
      summary({ variantId: 3, attemptCount: 3, lastOutcome: 'UNDERSTOOD' }),
    ];
    const result = buildSequenceSnapshot(variants, summaries, 'AUTHOR', 'UNDERSTOOD');
    expect(result.map((v) => v.id)).toEqual([2, 3]);
  });

  it('returns an empty snapshot when the filter matches nothing', () => {
    const variants = [variant({ id: 1 })];
    const summaries = [summary({ variantId: 1, attemptCount: 2, lastOutcome: 'UNDERSTOOD' })];
    const result = buildSequenceSnapshot(variants, summaries, 'AUTHOR', 'NEVER_ATTEMPTED');
    expect(result).toEqual([]);
  });
});
