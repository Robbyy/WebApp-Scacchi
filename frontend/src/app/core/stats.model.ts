/** Una mossa spesso sbagliata in allenamento (P18). */
export interface MoveMistake {
  expectedSan: string;
  count: number;
}

/** Statistiche di allenamento di una variante (P18), allineate a VariantStatsDto. */
export interface VariantStats {
  variantId: number;
  sessionCount: number;
  completedCount: number;
  totalMistakes: number;
  avgMistakes: number;
  /** Frazione di mosse corrette (0..1), null se nessuna mossa registrata. */
  accuracy?: number | null;
  lastTrainedAt?: string | null;
  topMistakes: MoveMistake[];
}

/** Statistiche aggregate di uno studio (P18): totali + dettaglio per variante. */
export interface StudyStats {
  studyId: number;
  sessionCount: number;
  completedCount: number;
  totalMistakes: number;
  avgMistakes: number;
  accuracy?: number | null;
  lastTrainedAt?: string | null;
  topMistakes: MoveMistake[];
  variants: VariantStats[];
}
