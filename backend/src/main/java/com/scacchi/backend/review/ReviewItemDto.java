package com.scacchi.backend.review;

/**
 * Una variante dovuta nella vista "Ripeti oggi" (Prototipo 19): include nome/colore della
 * variante e nome dello studio per la visualizzazione, oltre ai parametri di scheduling.
 */
public record ReviewItemDto(
    Long variantId,
    String variantName,
    String color,
    Long studyId,
    String studyName,
    int intervalDays,
    int repetitions,
    String nextReviewDate,
    String lastReviewedAt) {
}
