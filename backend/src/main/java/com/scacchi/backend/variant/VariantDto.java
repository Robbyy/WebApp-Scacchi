package com.scacchi.backend.variant;

import java.util.List;

/**
 * Contratto di una variante di apertura verso il frontend (vedi sezione 6 del
 * planning). {@code moves} è la linea principale (mainline), derivata da
 * {@code tree}; quest'ultimo contiene l'intero albero con le sotto-varianti.
 * I campi {@code sourcePgn} e {@code createdAt} sono predisposti per evoluzioni
 * future e possono essere null.
 *
 * <p><b>Fase (ISSUE-016):</b> {@code Variant} non ha un proprio campo fase. La fase
 * (Apertura/Mediogioco/Finale) si deriva sempre dallo studio padre ({@code studyId} →
 * {@code Study.phase}): in uno studio {@code OPENING} l'elemento è una variante/capitolo
 * allenabile, in uno studio {@code MIDDLEGAME}/{@code ENDGAME} è una posizione creata
 * manualmente. Le varianti legacy senza {@code studyId} sono trattate come {@code OPENING}.
 */
public record VariantDto(
    Long id,
    String name,
    String color,        // "WHITE" | "BLACK": lato da allenare
    List<String> moves,  // linea principale in notazione SAN
    List<MoveNode> tree, // albero completo (mainline + varianti)
    String startingFen,
    String sourcePgn,
    Long studyId,        // studio di appartenenza (null per varianti legacy) - Prototipo 11
    String createdAt
) {
}
