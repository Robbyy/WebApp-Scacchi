package com.scacchi.backend.stats;

import java.util.List;

/**
 * Statistiche di allenamento di una variante (Prototipo 18), aggregate dalle
 * sessioni P17. {@code accuracy} è la frazione di mosse corrette (null se non ci
 * sono mosse registrate); {@code topMistakes} elenca le mosse più sbagliate.
 */
public record VariantStatsDto(
    Long variantId,
    int sessionCount,
    int completedCount,
    int totalMistakes,
    double avgMistakes,
    Double accuracy,
    String lastTrainedAt,
    List<MoveMistakeDto> topMistakes
) {
}
