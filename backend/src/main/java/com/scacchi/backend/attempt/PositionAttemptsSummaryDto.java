package com.scacchi.backend.attempt;

/**
 * Riepilogo dei tentativi di una posizione, una voce per posizione dello studio
 * (ISSUE-016/R26.3, design.md decisione 8), incluse le posizioni mai tentate
 * ({@code lastOutcome} e {@code lastUnderstoodAt} nulli, {@code attemptCount} zero).
 * Nessuna percentuale di comprensione: solo dati derivati dagli eventi.
 */
public record PositionAttemptsSummaryDto(
    Long variantId,
    String lastOutcome,       // "UNDERSTOOD" | "NOT_UNDERSTOOD" | "FAILED" | null se mai tentata
    int attemptCount,
    String lastUnderstoodAt   // istante dell'ultimo evento UNDERSTOOD, null se nessuno
) {
}
