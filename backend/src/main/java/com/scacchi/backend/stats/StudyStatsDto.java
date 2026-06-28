package com.scacchi.backend.stats;

import java.util.List;

/**
 * Statistiche aggregate di uno studio (Prototipo 18): i totali dello studio
 * sommano quelli delle sue varianti, con il dettaglio per variante in
 * {@code variants}.
 */
public record StudyStatsDto(
    Long studyId,
    int sessionCount,
    int completedCount,
    int totalMistakes,
    double avgMistakes,
    Double accuracy,
    String lastTrainedAt,
    List<MoveMistakeDto> topMistakes,
    List<VariantStatsDto> variants
) {
}
