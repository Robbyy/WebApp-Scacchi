import { daysUntil, formatReviewDate, reviewLabel } from './review-format';

describe('review-format', () => {
  const today = new Date(2026, 5, 28); // 28 giugno 2026 (mese 0-based)

  it('formats an ISO date in it-IT (day only)', () => {
    expect(formatReviewDate('2026-06-29')).toBe('29/06/2026');
    expect(formatReviewDate('2026-06-29T10:00:00Z')).toBe('29/06/2026');
  });

  it('returns a dash for missing or invalid dates', () => {
    expect(formatReviewDate(null)).toBe('—');
    expect(formatReviewDate('nope')).toBe('—');
  });

  it('counts whole days to the target date', () => {
    expect(daysUntil('2026-06-28', today)).toBe(0);
    expect(daysUntil('2026-06-29', today)).toBe(1);
    expect(daysUntil('2026-06-25', today)).toBe(-3);
    expect(daysUntil(null, today)).toBeNull();
  });

  it('labels the next review in plain Italian', () => {
    expect(reviewLabel('2026-06-28', today)).toBe('Da ripetere oggi');
    expect(reviewLabel('2026-06-29', today)).toBe('Domani');
    expect(reviewLabel('2026-07-01', today)).toBe('Tra 3 giorni');
    expect(reviewLabel('2026-06-27', today)).toBe('In ritardo di 1 giorno');
    expect(reviewLabel('2026-06-24', today)).toBe('In ritardo di 4 giorni');
  });
});
