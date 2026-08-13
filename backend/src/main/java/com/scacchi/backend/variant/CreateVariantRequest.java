package com.scacchi.backend.variant;

import java.util.List;

/**
 * Richiesta di creazione/aggiornamento di una variante. Se {@code tree} è
 * presente viene usato come fonte; altrimenti si costruisce un albero lineare
 * da {@code moves}.
 */
public record CreateVariantRequest(
    String name,
    String color,         // "WHITE" | "BLACK"
    List<String> moves,   // linea principale (usata se tree è assente)
    List<MoveNode> tree,  // albero completo (opzionale)
    String sourcePgn,
    /** FEN iniziale visuale: ammessa solo per posizioni di Mediogioco/Finale. */
    String startingFen
) {
    /** Compatibilità con i chiamanti esistenti che non conoscono ancora la FEN custom. */
    public CreateVariantRequest(
        String name, String color, List<String> moves, List<MoveNode> tree, String sourcePgn) {
        this(name, color, moves, tree, sourcePgn, null);
    }
}
