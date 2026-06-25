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
    int variantCount,
    List<VariantDto> variants,
    String createdAt
) {
}
