package com.scacchi.backend.training;

import java.util.List;

/**
 * Richiesta di registrazione di una sessione di allenamento conclusa (Prototipo 17).
 * {@code studyId} non è richiesto: il backend lo deriva dalla variante.
 */
public record CreateTrainingSessionRequest(
    Long variantId,
    String result,              // "COMPLETED" | "ABANDONED"
    Integer mistakesCount,
    String startedAt,           // ISO-8601 (opzionale)
    String completedAt,         // ISO-8601 (opzionale)
    List<TrainingMoveInput> moves
) {
    /** Una mossa tentata: ply, mossa attesa, mossa giocata, esito. */
    public record TrainingMoveInput(
        int ply,
        String expectedSan,
        String playedSan,
        boolean correct
    ) {
    }
}
