package com.scacchi.backend.study;

import com.scacchi.backend.variant.VariantDto;
import java.util.List;

/**
 * Contratto di uno studio verso il frontend (sezione 15 del planning).
 * Nella lista ({@code GET /api/studies}) {@code variants} è {@code null} e conta
 * solo {@code variantCount}; nel dettaglio ({@code GET /api/studies/{id}})
 * {@code variants} contiene l'elenco completo.
 */
public record StudyDto(
    Long id,
    String name,
    String description,
    String color,            // "WHITE" | "BLACK" | "MIXED" | null
    String phase,             // "OPENING" | "MIDDLEGAME" | "ENDGAME" (ISSUE-016)
    int variantCount,
    List<VariantDto> variants,
    String sourceProvider,   // es. "LICHESS" (Prototipo 15), null se locale
    String sourceStudyId,    // id studio remoto (Prototipo 15), null se locale
    String sourceUrl,        // link canonico remoto (Prototipo 15), null se locale
    String lastImportedAt,   // timestamp ultimo import/sync (Prototipo 15), null se locale
    String createdAt
) {
}
