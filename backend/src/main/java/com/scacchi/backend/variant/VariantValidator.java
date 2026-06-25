package com.scacchi.backend.variant;

import com.github.bhlangonijr.chesslib.Board;
import com.github.bhlangonijr.chesslib.move.Move;
import com.github.bhlangonijr.chesslib.move.MoveList;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Validazione del payload di una variante (Prototipo 7).
 *
 * <p>Oltre ai controlli strutturali (nome, colore, presenza di mosse), verifica
 * la <b>legalità scacchistica</b> della linea principale e, ricorsivamente, di
 * ogni ramo dell'albero, ricostruendo la posizione con {@code chesslib} a partire
 * dalla posizione iniziale standard. Vedi decisione R13 nel planning: il backend
 * non si fida più ciecamente del frontend.
 *
 * <p>Nota su chesslib: {@code MoveList.loadFromSan} è un semplice decoder SAN→mossa
 * e <b>non</b> verifica la legalità (può produrre mosse illegali). La legalità è
 * quindi controllata esplicitamente con {@code board.legalMoves().contains(move)}.
 */
@Component
public class VariantValidator {

    /** Valida l'intera richiesta; solleva {@link InvalidVariantException} al primo errore. */
    public void validate(CreateVariantRequest request) {
        if (request == null) {
            throw error("request", null, null, "Richiesta mancante.");
        }
        if (request.name() == null || request.name().isBlank()) {
            throw error("name", null, null, "Il nome della variante è obbligatorio.");
        }
        if (request.color() == null) {
            throw error("color", null, null, "Il colore è obbligatorio.");
        }
        try {
            Color.valueOf(request.color());
        } catch (IllegalArgumentException e) {
            throw error("color", null, null, "Colore non valido: \"" + request.color() + "\".");
        }

        boolean hasMoves = request.moves() != null && !request.moves().isEmpty();
        boolean hasTree = request.tree() != null && !request.tree().isEmpty();
        if (!hasMoves && !hasTree) {
            throw error("moves", null, null,
                "Servono almeno una mossa (moves) o un albero (tree).");
        }

        // tree è la fonte autorevole quando presente; altrimenti si valida la linea.
        String field = hasTree ? "tree" : "moves";
        List<MoveNode> tree = hasTree ? request.tree() : MoveNode.fromLine(request.moves());
        validateNodes(tree, VariantService.START_FEN, new ArrayList<>(), field);
    }

    /** Visita in profondità: ogni figlio è validato nella posizione del padre. */
    private void validateNodes(List<MoveNode> nodes, String fen, List<Integer> path, String field) {
        if (nodes == null) {
            return;
        }
        for (int i = 0; i < nodes.size(); i++) {
            MoveNode node = nodes.get(i);
            List<Integer> childPath = new ArrayList<>(path);
            childPath.add(i);
            String nextFen = applyMove(fen, node == null ? null : node.san(), childPath, field);
            validateNodes(node.children(), nextFen, childPath, field);
        }
    }

    /** Verifica la legalità della mossa SAN nella posizione data; restituisce la FEN risultante. */
    private String applyMove(String fen, String san, List<Integer> path, String field) {
        if (san == null || san.isBlank()) {
            throw error(field, path.size(), path, "Mossa vuota nell'albero.");
        }
        Move move = null;
        try {
            MoveList decoded = new MoveList(fen);
            decoded.loadFromSan(san.trim());
            if (!decoded.isEmpty()) {
                move = decoded.get(decoded.size() - 1);
            }
        } catch (Exception ignored) {
            // SAN non decodificabile: trattato come illegale qui sotto.
        }

        Board board = new Board();
        board.loadFromFen(fen);
        if (move == null || !board.legalMoves().contains(move)) {
            throw error(field, path.size(), path,
                "Mossa illegale o non riconosciuta: \"" + san + "\".");
        }
        board.doMove(move);
        return board.getFen();
    }

    private static InvalidVariantException error(
        String field, Integer ply, List<Integer> path, String message) {
        List<Integer> branchPath = path == null ? null : List.copyOf(path);
        return new InvalidVariantException(new ValidationError(field, ply, branchPath, message));
    }
}
