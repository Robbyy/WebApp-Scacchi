import { accuracyPercent, formatTrainedAt } from './stats-format';

describe('accuracyPercent', () => {
  it('converts a 0..1 accuracy to an integer percent', () => {
    expect(accuracyPercent(0.6)).toBe(60);
    expect(accuracyPercent(1)).toBe(100);
    expect(accuracyPercent(0)).toBe(0);
  });

  it('returns null for null/undefined', () => {
    expect(accuracyPercent(null)).toBeNull();
    expect(accuracyPercent(undefined)).toBeNull();
  });
});

describe('formatTrainedAt', () => {
  it('returns a dash for missing or invalid input', () => {
    expect(formatTrainedAt(null)).toBe('—');
    expect(formatTrainedAt(undefined)).toBe('—');
    expect(formatTrainedAt('not-a-date')).toBe('—');
  });

  it('formats a valid ISO timestamp', () => {
    const out = formatTrainedAt('2026-06-27T10:02:30Z');
    expect(out).not.toBe('—');
    expect(out).toContain('2026');
  });
});
