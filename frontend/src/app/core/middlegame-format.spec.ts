import {
  difficultyLabel,
  guidedStudyBlockMessage,
  lastOutcomeLabel,
  sequenceFilterLabel,
  sequenceOrderLabel,
  studyTypeLabel,
  themeLabel,
} from './middlegame-format';
import { SEQUENCE_FILTERS, SEQUENCE_ORDERS } from './sequence-snapshot';

describe('middlegame-format', () => {
  it('labels the study type, "Da classificare" when absent (R26.3)', () => {
    expect(studyTypeLabel('TACTICAL')).toBe('Tattica');
    expect(studyTypeLabel('STRATEGIC')).toBe('Strategia');
    expect(studyTypeLabel(null)).toBe('Da classificare');
    expect(studyTypeLabel(undefined)).toBe('Da classificare');
  });

  it('labels each of the five difficulties, null when unset', () => {
    expect(difficultyLabel('INTRODUCTORY')).toBe('Introduttiva');
    expect(difficultyLabel('EASY')).toBe('Facile');
    expect(difficultyLabel('INTERMEDIATE')).toBe('Intermedia');
    expect(difficultyLabel('ADVANCED')).toBe('Avanzata');
    expect(difficultyLabel('EXPERT')).toBe('Esperta');
    expect(difficultyLabel(null)).toBeNull();
    expect(difficultyLabel(undefined)).toBeNull();
  });

  it('shows the theme label, or "Tema da assegnare" for a legacy position', () => {
    expect(themeLabel({ id: 1012, code: 'KING_ATTACK', studyType: 'TACTICAL', displayLabel: 'attacco al re', displayOrder: 12 })).toBe(
      'attacco al re',
    );
    expect(themeLabel(null)).toBe('Tema da assegnare');
    expect(themeLabel(undefined)).toBe('Tema da assegnare');
  });

  it('labels the last outcome of a position, "Mai tentata" without events', () => {
    expect(lastOutcomeLabel('UNDERSTOOD')).toBe('Compresa');
    expect(lastOutcomeLabel('NOT_UNDERSTOOD')).toBe('Da rivedere');
    expect(lastOutcomeLabel('FAILED')).toBe('Da rivedere');
    expect(lastOutcomeLabel(null)).toBe('Mai tentata');
    expect(lastOutcomeLabel(undefined)).toBe('Mai tentata');
  });

  it('gives a distinct, non-empty label for each sequence order (task 6.1)', () => {
    const labels = SEQUENCE_ORDERS.map(sequenceOrderLabel);
    expect(labels).toEqual(['Ordine autore', 'Ordine casuale']);
    expect(new Set(labels).size).toBe(SEQUENCE_ORDERS.length);
  });

  it('gives a distinct, non-empty label for each sequence filter (task 6.1)', () => {
    const labels = SEQUENCE_FILTERS.map(sequenceFilterLabel);
    expect(labels).toEqual(['Tutte le posizioni', 'Mai tentate', 'Da rivedere', 'Comprese']);
    expect(new Set(labels).size).toBe(SEQUENCE_FILTERS.length);
  });

  it('gives a distinct, non-empty message for each guided-study block reason (task 1.4)', () => {
    const reasons = [
      'NOT_FOUND',
      'WRONG_PHASE',
      'UNCLASSIFIED_STUDY',
      'MISSING_THEME',
      'DRAFT',
      'INELIGIBLE',
    ] as const;
    const messages = reasons.map((r) => guidedStudyBlockMessage(r));
    expect(messages.every((m) => m.length > 0)).toBe(true);
    expect(new Set(messages).size).toBe(reasons.length);
    expect(guidedStudyBlockMessage(null)).toBe('');
  });
});
