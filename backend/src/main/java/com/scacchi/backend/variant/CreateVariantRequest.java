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
    String sourcePgn
) {
}
