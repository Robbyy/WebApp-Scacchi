package com.scacchi.backend.variant;

import com.scacchi.backend.theme.PositionThemeDto;
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
 *
 * <p><b>Metadati Mediogioco (ISSUE-016/R26.3):</b> da {@code themeId} a
 * {@code positionOrder} sono valorizzati soltanto per le posizioni di studi
 * {@code MIDDLEGAME}; restano {@code null} per Aperture, Finale e legacy senza tema
 * («Tema da assegnare» in UI). {@code theme} è il dato leggibile del catalogo risolto
 * da {@code themeId} (mai copiato/duplicato in una colonna). {@code eligibleForGuidedStudy}
 * è derivato — non persistito — da tema assegnato e mainline non vuota (non bozza).
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
    Long themeId,                    // R26.3, solo Mediogioco: riferimento a position_theme.id
    PositionThemeDto theme,          // R26.3, dato leggibile del tema risolto da themeId
    String themeDescription,         // R26.3
    String description,              // R26.3
    String difficulty,               // R26.3: INTRODUCTORY|EASY|INTERMEDIATE|ADVANCED|EXPERT
    String source,                   // R26.3
    Integer positionOrder,           // R26.3, solo Mediogioco: ordine contiguo 1..N
    boolean eligibleForGuidedStudy,  // R26.3, derivato: tema assegnato e mainline non vuota
    String createdAt
) {
}
