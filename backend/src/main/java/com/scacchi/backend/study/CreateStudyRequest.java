package com.scacchi.backend.study;

/**
 * Richiesta di creazione/aggiornamento di uno studio (Prototipo 11).
 * {@code name} è obbligatorio; {@code description} e {@code color} sono opzionali.
 * {@code phase} è opzionale in creazione (default {@code OPENING}, ISSUE-016) e non
 * modificabile in aggiornamento: se valorizzata con un valore diverso da quella
 * persistita, la richiesta di update viene rifiutata.
 */
public record CreateStudyRequest(
    String name,
    String description,
    String color,          // "WHITE" | "BLACK" | "MIXED" (opzionale)
    String phase           // "OPENING" | "MIDDLEGAME" | "ENDGAME" (opzionale, default OPENING)
) {
}
