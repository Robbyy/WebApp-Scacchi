package com.scacchi.backend.variant;

import java.util.ArrayList;
import java.util.List;

/**
 * Nodo dell'albero di mosse di una variante. Ogni nodo è una mossa SAN con i
 * suoi possibili seguiti: {@code children.get(0)} è la continuazione principale
 * (mainline), gli altri figli sono varianti alternative.
 */
public record MoveNode(String san, List<MoveNode> children) {

    public MoveNode {
        children = children == null ? List.of() : List.copyOf(children);
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
