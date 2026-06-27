package com.scacchi.backend.training;

import java.util.List;

/**
 * Contratto di una sessione di allenamento verso il frontend (Prototipo 17).
 * Nella lista {@code moves} è {@code null} (riepilogo); nel dettaglio è valorizzato.
 */
public record TrainingSessionDto(
    Long id,
    Long variantId,
    Long studyId,
    String result,
    int mistakesCount,
    int moveCount,
    String startedAt,
    String completedAt,
    String createdAt,
    List<TrainingMoveDto> moves
) {
    public record TrainingMoveDto(
        int ply,
        String expectedSan,
        String playedSan,
        boolean correct
    ) {
    }
}
