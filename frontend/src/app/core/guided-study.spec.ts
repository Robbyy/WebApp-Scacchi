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

  // Il backend deriva `eligibleForGuidedStudy` da tema assegnato e mainline non
  // vuota: nei casi bloccati il flag è quindi sempre `false`, e i due controlli
  // locali servono solo a scegliere il messaggio.

  it('blocks a position without an assigned theme', () => {
    expect(
      positionGuidedStudyGate(
        study(),
        variant({ themeId: null, eligibleForGuidedStudy: false }),
      ),
    ).toEqual({ eligible: false, reason: 'MISSING_THEME' });
  });

  it('blocks a draft position (no mainline)', () => {
    expect(
      positionGuidedStudyGate(study(), variant({ moves: [], eligibleForGuidedStudy: false })),
    ).toEqual({ eligible: false, reason: 'DRAFT' });
  });

  /**
   * Posizione con tema e mosse che il backend dichiara comunque non eleggibile:
   * il client non conosce il motivo e blocca con il messaggio generico invece
   * di lasciarla passare. È il caso di una regola aggiunta solo lato server.
   */
  it('blocks on the backend flag alone when the client sees no local reason', () => {
    expect(
      positionGuidedStudyGate(study(), variant({ eligibleForGuidedStudy: false })),
    ).toEqual({ eligible: false, reason: 'INELIGIBLE' });
  });

  /** Il flag assente (risposta parziale) non vale come eleggibilità. */
  it('does not treat a missing eligibility flag as eligible', () => {
    expect(
      positionGuidedStudyGate(study(), variant({ eligibleForGuidedStudy: undefined })),
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
