package com.scacchi.backend.variant;

import java.util.List;

/**
 * Aggiornamento del solo albero di una variante/posizione
 * ({@code PUT /api/variants/{id}/tree}).
 *
 * <p>Contratto dell'editor delle mosse, che possiede soltanto nome, colore (per
 * le Aperture) e albero. FEN iniziale e metadati Mediogioco (tema, descrizioni,
 * difficoltà, fonte, ordine) restano quelli persistiti: con il contratto
 * full-replace di {@code PUT /api/variants/{id}} venivano azzerati a ogni
 * salvataggio delle mosse, perché l'editor non li invia.
 */
public record UpdateVariantTreeRequest(
    String name,
    /** Solo Aperture: per una posizione il colore resta derivato dalla FEN persistita. */
    String color,
    List<String> moves,   // linea principale (usata se tree è assente)
    List<MoveNode> tree   // albero completo (opzionale)
) {
}
