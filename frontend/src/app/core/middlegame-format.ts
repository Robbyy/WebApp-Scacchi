/** Helper di formattazione per la classificazione, i temi e i tentativi Mediogioco (R26.3). */
import { AttemptOutcome } from './attempt.model';
import { GuidedStudyBlockReason } from './guided-study';
import { SequenceFilter, SequenceOrder } from './sequence-snapshot';
import { Difficulty } from './variant.model';
import { PositionTheme, StudyType } from './position-theme.model';

/** Etichetta della tipologia di uno studio Mediogioco, «Da classificare» se assente. */
export function studyTypeLabel(studyType: StudyType | null | undefined): string {
  switch (studyType) {
    case 'TACTICAL':
      return 'Tattica';
    case 'STRATEGIC':
      return 'Strategia';
    default:
      return 'Da classificare';
  }
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  INTRODUCTORY: 'Introduttiva',
  EASY: 'Facile',
  INTERMEDIATE: 'Intermedia',
  ADVANCED: 'Avanzata',
  EXPERT: 'Esperta',
};

/** Etichetta leggibile di una difficoltà; `null` se non impostata (nessun testo da mostrare). */
export function difficultyLabel(difficulty: Difficulty | null | undefined): string | null {
  return difficulty ? DIFFICULTY_LABELS[difficulty] : null;
}

/** Etichetta del tema di una posizione: la label del catalogo o «Tema da assegnare» (legacy). */
export function themeLabel(theme: PositionTheme | null | undefined): string {
  return theme ? theme.displayLabel : 'Tema da assegnare';
}

/** Etichetta dell'ultimo esito di una posizione, o «Mai tentata» senza eventi. */
export function lastOutcomeLabel(outcome: AttemptOutcome | null | undefined): string {
  switch (outcome) {
    case 'UNDERSTOOD':
      return 'Compresa';
    case 'NOT_UNDERSTOOD':
    case 'FAILED':
      return 'Da rivedere';
    default:
      return 'Mai tentata';
  }
}

/** Etichetta dell'ordine di proposta della sequenza (R26.3, task 6.1). */
export function sequenceOrderLabel(order: SequenceOrder): string {
  switch (order) {
    case 'AUTHOR':
      return 'Ordine autore';
    case 'RANDOM':
      return 'Ordine casuale';
  }
}

/** Etichetta del filtro sullo storico applicato alla sequenza (R26.3, task 6.1). */
export function sequenceFilterLabel(filter: SequenceFilter): string {
  switch (filter) {
    case 'ALL':
      return 'Tutte le posizioni';
    case 'NEVER_ATTEMPTED':
      return 'Mai tentate';
    case 'TO_REVIEW':
      return 'Da rivedere';
    case 'UNDERSTOOD':
      return 'Comprese';
  }
}

/**
 * Messaggio dello stato controllato mostrato dalle route guidate (R26.3,
 * task 1.4) quando il gate client rifiuta l'accesso: fase errata, studio non
 * classificato, tema mancante, bozza o contenuto non trovato/non eleggibile.
 */
export function guidedStudyBlockMessage(reason: GuidedStudyBlockReason | null): string {
  switch (reason) {
    case 'NOT_FOUND':
      return 'Contenuto non trovato.';
    case 'WRONG_PHASE':
      return 'Questo contenuto non appartiene alla sezione Mediogioco.';
    case 'UNCLASSIFIED_STUDY':
      return 'Lo studio è «Da classificare»: classificalo prima di avviare lo studio guidato.';
    case 'MISSING_THEME':
      return 'La posizione non ha ancora un tema assegnato.';
    case 'DRAFT':
      return 'La posizione è una bozza senza mosse: non è ancora pronta per lo studio guidato.';
    case 'INELIGIBLE':
      return 'Questa posizione non è ancora eleggibile per lo studio guidato.';
    default:
      return '';
  }
}
