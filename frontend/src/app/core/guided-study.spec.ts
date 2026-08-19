import { positionGuidedStudyGate, studyGuidedStudyGate } from './guided-study';
import { Study } from './study.model';
import { Variant } from './variant.model';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function study(overrides: Partial<Study> = {}): Study {
  return {
    id: 1,
    name: 'Strutture di pedoni',
    phase: 'MIDDLEGAME',
    studyType: 'TACTICAL',
    variantCount: 1,
    ...overrides,
  };
}

function variant(overrides: Partial<Variant> = {}): Variant {
  return {
    id: 10,
    name: 'Combinazione',
    color: 'WHITE',
    moves: ['Qh5'],
    startingFen: START,
    studyId: 1,
    themeId: 1001,
    eligibleForGuidedStudy: true,
    ...overrides,
  };
}

describe('positionGuidedStudyGate', () => {
  it('is eligible for a classified study, themed and non-draft position', () => {
    expect(positionGuidedStudyGate(study(), variant())).toEqual({ eligible: true, reason: null });
  });

  it('blocks a missing study or variant as not found', () => {
    expect(positionGuidedStudyGate(null, variant())).toEqual({ eligible: false, reason: 'NOT_FOUND' });
    expect(positionGuidedStudyGate(study(), null)).toEqual({ eligible: false, reason: 'NOT_FOUND' });
  });

  it('blocks a position outside the expected phase', () => {
    expect(positionGuidedStudyGate(study({ phase: 'OPENING', studyType: null }), variant())).toEqual({
      eligible: false,
      reason: 'WRONG_PHASE',
    });
  });

  it('blocks an unclassified middlegame study', () => {
    expect(positionGuidedStudyGate(study({ studyType: null }), variant())).toEqual({
      eligible: false,
      reason: 'UNCLASSIFIED_STUDY',
    });
  });

  it('blocks a position without an assigned theme', () => {
    expect(positionGuidedStudyGate(study(), variant({ themeId: null }))).toEqual({
      eligible: false,
      reason: 'MISSING_THEME',
    });
  });

  it('blocks a draft position (no mainline)', () => {
    expect(positionGuidedStudyGate(study(), variant({ moves: [] }))).toEqual({
      eligible: false,
      reason: 'DRAFT',
    });
  });

  it('falls back to the backend eligibility flag as a safety net', () => {
    expect(
      positionGuidedStudyGate(study(), variant({ eligibleForGuidedStudy: false })),
    ).toEqual({ eligible: false, reason: 'INELIGIBLE' });
  });
});

describe('studyGuidedStudyGate', () => {
  it('is eligible for a classified middlegame study, regardless of positions', () => {
    expect(studyGuidedStudyGate(study())).toEqual({ eligible: true, reason: null });
  });

  it('blocks a missing study as not found', () => {
    expect(studyGuidedStudyGate(null)).toEqual({ eligible: false, reason: 'NOT_FOUND' });
  });

  it('blocks a study outside the expected phase', () => {
    expect(studyGuidedStudyGate(study({ phase: 'ENDGAME', studyType: null }))).toEqual({
      eligible: false,
      reason: 'WRONG_PHASE',
    });
  });

  it('blocks an unclassified middlegame study', () => {
    expect(studyGuidedStudyGate(study({ studyType: null }))).toEqual({
      eligible: false,
      reason: 'UNCLASSIFIED_STUDY',
    });
  });
});
