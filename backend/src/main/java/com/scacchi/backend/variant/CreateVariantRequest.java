package com.scacchi.backend.variant;

import java.util.List;

/** Richiesta di creazione di una variante (Prototipo 4). */
public record CreateVariantRequest(
    String name,
    String color,        // "WHITE" | "BLACK"
    List<String> moves,  // mosse in notazione SAN
    String sourcePgn
) {
}
