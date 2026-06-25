package com.scacchi.backend.variant;

import java.util.List;

/**
 * Corpo di un errore di validazione (Prototipo 7). Restituito con stato 400.
 *
 * @param field      campo della richiesta in errore ("name", "color", "moves", "tree", ...)
 * @param ply        semimossa in errore (1-based), null per errori strutturali
 * @param branchPath percorso nel'albero fino alla mossa in errore (indici dei figli), null se non pertinente
 * @param message    messaggio leggibile
 */
public record ValidationError(String field, Integer ply, List<Integer> branchPath, String message) {
}
