package com.scacchi.backend.variant;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Nodo dell'albero di mosse di una variante. Ogni nodo è una mossa SAN con i
 * suoi possibili seguiti: {@code children.get(0)} è la continuazione principale
 * (mainline), gli altri figli sono varianti alternative.
 *
 * <p>Da R24 il nodo porta due annotazioni opzionali (ISSUE-013 +
 * {@code issue-016-move-comments}): un {@code comment} testuale e un solo
 * {@code nag} fra i sei ammessi. Entrambi sono persistiti nello stesso JSON
 * dell'albero: i documenti salvati prima di R24, privi dei due campi, restano
 * validi e si rileggono con le annotazioni assenti. La serializzazione omette i
 * campi nulli, quindi un albero senza annotazioni produce lo stesso JSON di
 * prima.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record MoveNode(String san, List<MoveNode> children, String comment, String nag) {

    /** Lunghezza massima del commento di una mossa (mini-spec R24). */
    public static final int MAX_COMMENT_LENGTH = 1000;

    /** I sei NAG ammessi, mutuamente esclusivi (mini-spec R24). */
    public static final Set<String> NAGS = Set.of("!", "?", "!!", "??", "!?", "?!");

    public MoveNode {
        children = children == null ? List.of() : List.copyOf(children);
        // Il commento è testo semplice: si normalizza qui, un valore vuoto non
        // viene conservato. Il NAG resta grezzo perché un valore fuori insieme
        // dev'essere rifiutato dal validatore, non corretto in silenzio.
        comment = comment == null || comment.isBlank() ? null : comment.trim();
    }

    /**
     * Nodo senza annotazioni: firma storica, mantenuta perché i chiamanti
     * precedenti a R24 continuino a compilare.
     */
    public MoveNode(String san, List<MoveNode> children) {
        this(san, children, null, null);
    }

    /** Sequenza della linea principale: primo figlio a ogni livello. */
    public static List<String> mainline(List<MoveNode> tree) {
        List<String> line = new ArrayList<>();
        List<MoveNode> level = tree;
        while (level != null && !level.isEmpty()) {
            MoveNode first = level.get(0);
            line.add(first.san());
            level = first.children();
        }
        return line;
    }

    /** Costruisce un albero lineare (senza rami) da una lista di mosse SAN. */
    public static List<MoveNode> fromLine(List<String> moves) {
        if (moves == null || moves.isEmpty()) {
            return List.of();
        }
        MoveNode node = null;
        for (int i = moves.size() - 1; i >= 0; i--) {
            node = new MoveNode(moves.get(i), node == null ? List.of() : List.of(node));
        }
        return List.of(node);
    }
}
