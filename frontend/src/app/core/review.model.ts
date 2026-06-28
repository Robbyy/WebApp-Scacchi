import { VariantColor } from './variant.model';

/** Una variante dovuta nella vista "Ripeti oggi" (P19), allineata a ReviewItemDto. */
export interface ReviewItem {
  variantId: number;
  variantName: string;
  color: VariantColor;
  studyId?: number | null;
  studyName?: string | null;
  intervalDays: number;
  repetitions: number;
  /** Data ISO (yyyy-MM-dd) della ripetizione prevista. */
  nextReviewDate: string;
  lastReviewedAt?: string | null;
}

/** Schedule di ripetizione di una variante (P19), allineata a ReviewScheduleDto. */
export interface ReviewSchedule {
  variantId: number;
  studyId?: number | null;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewDate: string;
  lastReviewedAt?: string | null;
  /** true se la prossima ripetizione è oggi o nel passato. */
  due: boolean;
}
