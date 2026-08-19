package com.scacchi.backend.variant;

import java.util.List;

/**
 * Richiesta di creazione/aggiornamento di una variante. Se {@code tree} è
 * presente viene usato come fonte; altrimenti si costruisce un albero lineare
 * da {@code moves}.
 *
 * <p>I campi da {@code themeId} a {@code positionOrder} (ISSUE-016/R26.3, design.md
 * decisioni 4-5) sono applicati soltanto alle posizioni di studi Mediogioco:
 * {@code themeId} è l'unico riferimento al catalogo temi (mai il {@code code}),
 * obbligatorio in creazione e opzionale in aggiornamento (posizione legacy «Tema da
 * assegnare»); {@code positionOrder} è l'indice 1..N+1 richiesto solo in creazione,
 * il riordino successivo passa dal contratto dedicato {@code PUT .../variants/order}.
 */
public record CreateVariantRequest(
    String name,
    String color,         // "WHITE" | "BLACK"
    List<String> moves,   // linea principale (usata se tree è assente)
    List<MoveNode> tree,  // albero completo (opzionale)
    String sourcePgn,
    /** FEN iniziale visuale: ammessa solo per posizioni di Mediogioco/Finale. */
    String startingFen,
    Long themeId,               // R26.3, solo Mediogioco: riferimento a position_theme.id
    String themeDescription,    // R26.3, facoltativo
    String description,         // R26.3, facoltativo
    String difficulty,          // R26.3, facoltativo: INTRODUCTORY|EASY|INTERMEDIATE|ADVANCED|EXPERT
    String source,               // R26.3, facoltativo
    Integer positionOrder        // R26.3, solo creazione: indice 1..N+1 (default fine lista)
) {
    /** Compatibilità con i chiamanti esistenti che non conoscono ancora i metadati R26.3. */
    public CreateVariantRequest(
        String name, String color, List<String> moves, List<MoveNode> tree,
        String sourcePgn, String startingFen) {
        this(name, color, moves, tree, sourcePgn, startingFen, null, null, null, null, null, null);
    }

    /** Compatibilità con i chiamanti esistenti che non conoscono ancora la FEN custom. */
    public CreateVariantRequest(
        String name, String color, List<String> moves, List<MoveNode> tree, String sourcePgn) {
        this(name, color, moves, tree, sourcePgn, null);
    }
}
