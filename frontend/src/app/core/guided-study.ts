import { GamePhase, Study } from './study.model';
import { Variant } from './variant.model';

/**
 * Motivo per cui una posizione o uno studio Mediogioco non è (ancora)
 * eleggibile per lo studio guidato (R26.3, task 1.4). Il gate è solo una
 * protezione lato client per non proporre mosse/esiti su contenuto non
 * pronto: il backend resta l'autorità che rivalida al momento del tentativo
 * (design decisione 2).
 */
export type GuidedStudyBlockReason =
  | 'NOT_FOUND'
  | 'WRONG_PHASE'
  | 'UNCLASSIFIED_STUDY'
  | 'MISSING_THEME'
  | 'DRAFT'
  | 'INELIGIBLE';

export interface GuidedStudyGate {
  eligible: boolean;
  reason: GuidedStudyBlockReason | null;
}

const ELIGIBLE: GuidedStudyGate = { eligible: true, reason: null };

function blocked(reason: GuidedStudyBlockReason): GuidedStudyGate {
  return { eligible: false, reason };
}

/**
 * Eleggibilità di una posizione al tentativo manuale/sequenziale (design
 * decisione 2): studio della fase attesa e classificato, tema assegnato,
 * mainline non vuota (non bozza). L'ultimo controllo rilegge il flag
 * derivato dal backend (`eligibleForGuidedStudy`) come rete di sicurezza.
 */
export function positionGuidedStudyGate(
  study: Study | null,
  variant: Variant | null,
  expectedPhase: GamePhase = 'MIDDLEGAME',
): GuidedStudyGate {
  if (!study || !variant) {
    return blocked('NOT_FOUND');
  }
  if (study.phase !== expectedPhase) {
    return blocked('WRONG_PHASE');
  }
  if (!study.studyType) {
    return blocked('UNCLASSIFIED_STUDY');
  }
  if (variant.themeId == null) {
    return blocked('MISSING_THEME');
  }
  if (!variant.moves || variant.moves.length === 0) {
    return blocked('DRAFT');
  }
  if (!variant.eligibleForGuidedStudy) {
    return blocked('INELIGIBLE');
  }
  return ELIGIBLE;
}

/**
 * Eleggibilità di uno studio alla configurazione sequenziale: fase attesa e
 * classificato. Non richiede posizioni eleggibili: uno snapshot vuoto è uno
 * stato valido della configurazione (gruppo 6/7), non un motivo di blocco.
 */
export function studyGuidedStudyGate(
  study: Study | null,
  expectedPhase: GamePhase = 'MIDDLEGAME',
): GuidedStudyGate {
  if (!study) {
    return blocked('NOT_FOUND');
  }
  if (study.phase !== expectedPhase) {
    return blocked('WRONG_PHASE');
  }
  if (!study.studyType) {
    return blocked('UNCLASSIFIED_STUDY');
  }
  return ELIGIBLE;
}
