export type TrainingResult = 'COMPLETED' | 'ABANDONED';

/** Una mossa tentata durante l'allenamento (P17). */
export interface TrainingMove {
  ply: number;
  expectedSan?: string | null;
  playedSan?: string | null;
  correct: boolean;
}

/** Payload per registrare una sessione conclusa. */
export interface CreateTrainingSessionRequest {
  variantId: number;
  result: TrainingResult;
  mistakesCount: number;
  startedAt?: string | null;
  completedAt?: string | null;
  moves: TrainingMove[];
}

/** Sessione di allenamento, allineata a TrainingSessionDto del backend (P17). */
export interface TrainingSession {
  id: number;
  variantId: number;
  studyId?: number | null;
  result: TrainingResult;
  mistakesCount: number;
  moveCount: number;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  /** Presente solo nel dettaglio; assente nello storico (riepilogo). */
  moves?: TrainingMove[] | null;
}
