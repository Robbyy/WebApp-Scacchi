package com.scacchi.backend.variant;

import java.util.List;

/**
 * Contratto di una variante di apertura verso il frontend (vedi sezione 6 del
 * planning). I campi {@code sourcePgn} e {@code createdAt} sono predisposti per
 * evoluzioni future (import PGN, storico) e possono essere null nei prototipi.
 */
public record VariantDto(
    Long id,
    String name,
    String color,        // "WHITE" | "BLACK": lato da allenare
    List<String> moves,  // mosse in notazione SAN
    String startingFen,
    String sourcePgn,
    String createdAt
) {
}
