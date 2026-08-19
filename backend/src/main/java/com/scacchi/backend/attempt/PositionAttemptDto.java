package com.scacchi.backend.attempt;

/** Contratto verso il frontend di un evento di tentativo (ISSUE-016/R26.3). */
public record PositionAttemptDto(
    Long id,
    Long variantId,
    String outcome,      // "UNDERSTOOD" | "NOT_UNDERSTOOD" | "FAILED"
    String occurredAt
) {
}
