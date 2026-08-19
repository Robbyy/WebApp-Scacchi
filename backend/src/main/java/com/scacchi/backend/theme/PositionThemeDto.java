package com.scacchi.backend.theme;

/**
 * Contratto di un tema verso il frontend (ISSUE-016/R26.3). {@code code} è
 * l'identificativo tecnico (non mostrato come descrizione); {@code displayLabel}
 * è l'etichetta leggibile, modificabile senza cambiare {@code id} o {@code code}.
 */
public record PositionThemeDto(
    Long id,
    String code,
    String studyType,      // "TACTICAL" | "STRATEGIC"
    String displayLabel,
    int displayOrder
) {
}
