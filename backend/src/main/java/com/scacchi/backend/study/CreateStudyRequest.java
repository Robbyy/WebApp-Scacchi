package com.scacchi.backend.study;

/**
 * Richiesta di creazione/aggiornamento di uno studio (Prototipo 11).
 * {@code name} è obbligatorio; {@code description} e {@code color} sono opzionali.
 */
public record CreateStudyRequest(
    String name,
    String description,
    String color          // "WHITE" | "BLACK" | "MIXED" (opzionale)
) {
}
