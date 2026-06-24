package com.scacchi.backend.variant;

import java.util.List;

/**
 * Contratto di una variante di apertura verso il frontend (vedi sezione 6 del
 * planning). {@code moves} è la linea principale (mainline), derivata da
 * {@code tree}; quest'ultimo contiene l'intero albero con le sotto-varianti.
 * I campi {@code sourcePgn} e {@code createdAt} sono predisposti per evoluzioni
 * future e possono essere null.
 */
public record VariantDto(
    Long id,
    String name,
    String color,        // "WHITE" | "BLACK": lato da allenare
    List<String> moves,  // linea principale in notazione SAN
    List<MoveNode> tree, // albero completo (mainline + varianti)
    String startingFen,
    String sourcePgn,
    String createdAt
) {
}
