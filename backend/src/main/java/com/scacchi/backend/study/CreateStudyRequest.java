package com.scacchi.backend.study;

/**
 * Richiesta di creazione/aggiornamento di uno studio (Prototipo 11).
 * {@code name} è obbligatorio; {@code description} e {@code color} sono opzionali.
 * {@code phase} è opzionale in creazione (default {@code OPENING}, ISSUE-016) e non
 * modificabile in aggiornamento: se valorizzata con un valore diverso da quella
 * persistita, la richiesta di update viene rifiutata.
 *
 * <p>{@code studyType} (R26.3) è ammesso solo per {@code phase == MIDDLEGAME}:
 * obbligatorio in creazione, opzionale in aggiornamento dove rappresenta l'unica
 * transizione consentita da legacy «Da classificare» a un valore. Un valore già
 * persistito è immutabile; per {@code OPENING}/{@code ENDGAME} il campo non è
 * accettato (vedi {@code StudyService}).
 */
public record CreateStudyRequest(
    String name,
    String description,
    String color,          // "WHITE" | "BLACK" | "MIXED" (opzionale)
    String phase,          // "OPENING" | "MIDDLEGAME" | "ENDGAME" (opzionale, default OPENING)
    String studyType       // "TACTICAL" | "STRATEGIC" (R26.3, ammesso solo per MIDDLEGAME)
) {
    /** Compatibilità con i chiamanti esistenti che non conoscono ancora la tipologia. */
    public CreateStudyRequest(String name, String description, String color, String phase) {
        this(name, description, color, phase, null);
    }
}
