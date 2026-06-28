package com.scacchi.backend.review;

/**
 * Schedule di ripetizione di una variante (Prototipo 19), per l'indicatore nel dettaglio
 * variante. {@code due} = la prossima ripetizione è oggi o nel passato.
 */
public record ReviewScheduleDto(
    Long variantId,
    Long studyId,
    double easeFactor,
    int intervalDays,
    int repetitions,
    String nextReviewDate,
    String lastReviewedAt,
    boolean due) {
}
