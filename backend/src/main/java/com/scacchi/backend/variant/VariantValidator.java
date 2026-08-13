package com.scacchi.backend.variant;

import com.github.bhlangonijr.chesslib.Board;
import com.github.bhlangonijr.chesslib.Piece;
import com.github.bhlangonijr.chesslib.Rank;
import com.github.bhlangonijr.chesslib.Side;
import com.github.bhlangonijr.chesslib.Square;
import com.github.bhlangonijr.chesslib.move.Move;
import com.github.bhlangonijr.chesslib.move.MoveList;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Component;

/**
 * Validazione del payload di una variante (Prototipo 7).
 *
 * <p>Oltre ai controlli strutturali (nome, colore, presenza di mosse), verifica
 * la <b>legalità scacchistica</b> della linea principale e, ricorsivamente, di
 * ogni ramo dell'albero, ricostruendo la posizione con {@code chesslib}. Per le
 * Aperture parte dalla posizione standard; per le posizioni manuali dalla FEN
 * iniziale già validata. Il backend non si fida ciecamente del frontend.
 *
 * <p>Nota su chesslib: {@code MoveList.loadFromSan} è un semplice decoder SAN→mossa
 * e <b>non</b> verifica la legalità (può produrre mosse illegali). La legalità è
 * quindi controllata esplicitamente con {@code board.legalMoves().contains(move)}.
 *
 * <p>Da R24 la visita controlla anche le annotazioni opzionali del nodo
 * (commento e NAG): un albero senza annotazioni resta valido esattamente come
 * prima.
 */
@Component
public class VariantValidator {

    /** Valida l'intera richiesta; solleva {@link InvalidVariantException} al primo errore. */
    public void validate(CreateVariantRequest request) {
        validateOpening(request);
    }

    /** Valida il contratto Aperture/legacy e rifiuta una FEN custom fuori fase. */
    public void validateOpening(CreateVariantRequest request) {
        if (request != null && request.startingFen() != null && !request.startingFen().isBlank()
            && !VariantService.START_FEN.equals(request.startingFen().trim())) {
            throw error("startingFen", null, null,
                "Una FEN iniziale custom è consentita solo per Mediogioco o Finale.");
        }
        validate(request, VariantService.START_FEN, false, true);
    }

    /**
     * Valida una richiesta nel contesto della sua posizione iniziale effettiva.
     * Le posizioni di Mediogioco/Finale possono avere un albero vuoto e ricevono
     * un colore tecnico derivato dal servizio, non dal client.
     */
    public void validate(
        CreateVariantRequest request, String startingFen, boolean allowEmptyTree, boolean requireColor) {
        if (request == null) {
            throw error("request", null, null, "Richiesta mancante.");
        }
        if (request.name() == null || request.name().isBlank()) {
            throw error("name", null, null, "Il nome della variante è obbligatorio.");
        }
        if (requireColor) {
            if (request.color() == null) {
                throw error("color", null, null, "Il colore è obbligatorio.");
            }
            try {
                Color.valueOf(request.color());
            } catch (IllegalArgumentException e) {
                throw error("color", null, null, "Colore non valido: \"" + request.color() + "\".");
            }
        }

        boolean hasMoves = request.moves() != null && !request.moves().isEmpty();
        boolean hasTree = request.tree() != null && !request.tree().isEmpty();
        if (!allowEmptyTree && !hasMoves && !hasTree) {
            throw error("moves", null, null,
                "Servono almeno una mossa (moves) o un albero (tree).");
        }

        if (!hasMoves && !hasTree) {
            return;
        }

        // tree è la fonte autorevole quando presente; altrimenti si valida la linea.
        String field = hasTree ? "tree" : "moves";
        List<MoveNode> tree = hasTree ? request.tree() : MoveNode.fromLine(request.moves());
        validateNodes(tree, startingFen, new ArrayList<>(), field);
    }

    /**
     * Valida una FEN fornita dall'editor visuale e ne restituisce una forma
     * canonica con contatori iniziali {@code 0 1}.
     */
    public String validateAndNormalizeStartingFen(String rawFen) {
        if (rawFen == null || rawFen.isBlank()) {
            throw error("startingFen", null, null, "La posizione iniziale è obbligatoria.");
        }
        String[] fields = rawFen.trim().split("\\s+");
        if (fields.length != 6) {
            throw error("startingFen", null, null, "La FEN deve contenere sei campi.");
        }
        validatePiecePlacement(fields[0]);
        if (!fields[1].equals("w") && !fields[1].equals("b")) {
            throw error("startingFen", null, null, "Il lato al tratto nella FEN deve essere w o b.");
        }
        validateCastlingSyntax(fields[2]);
        if (!fields[3].equals("-") && !fields[3].matches("[a-h][36]")) {
            throw error("startingFen", null, null, "La casa en-passant non è valida.");
        }
        validateCounter(fields[4], "Il contatore delle semimosse non è valido.", false);
        validateCounter(fields[5], "Il contatore delle mosse non è valido.", true);

        Board board = new Board();
        try {
            board.loadFromFen(String.join(" ", fields));
        } catch (RuntimeException e) {
            throw error("startingFen", null, null, "La FEN non può essere caricata.");
        }

        validateKings(board);
        validatePawns(board);
        validateCastlingPieces(board, fields[2]);
        validateSideThatJustMoved(board);
        validateEnPassant(board, fields[1], fields[3]);
        return board.getFen(false, false) + " 0 1";
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
            if (node == null) {
                throw error(field, childPath.size(), childPath, "Nodo mossa mancante nell'albero.");
            }
            String nextFen = applyMove(fen, node == null ? null : node.san(), childPath, field);
            validateAnnotations(node, childPath, field);
            validateNodes(node.children(), nextFen, childPath, field);
        }
    }

    /**
     * Annotazioni del nodo (R24): commento entro il limite e NAG fra i sei
     * ammessi. I nodi privi di entrambi — cioè tutti quelli salvati prima di
     * R24 — passano senza controlli.
     */
    private void validateAnnotations(MoveNode node, List<Integer> path, String field) {
        String comment = node.comment();
        if (comment != null && comment.length() > MoveNode.MAX_COMMENT_LENGTH) {
            throw error(field, path.size(), path,
                "Commento troppo lungo (massimo " + MoveNode.MAX_COMMENT_LENGTH + " caratteri).");
        }
        String nag = node.nag();
        if (nag != null && !MoveNode.NAGS.contains(nag)) {
            throw error(field, path.size(), path,
                "Annotazione non valida: \"" + nag + "\".");
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

    private void validatePiecePlacement(String placement) {
        String[] ranks = placement.split("/", -1);
        if (ranks.length != 8) {
            throw error("startingFen", null, null, "La FEN deve descrivere otto traverse.");
        }
        for (String rank : ranks) {
            int files = 0;
            for (int i = 0; i < rank.length(); i++) {
                char value = rank.charAt(i);
                if (value >= '1' && value <= '8') {
                    files += value - '0';
                } else if ("prnbqkPRNBQK".indexOf(value) >= 0) {
                    files++;
                } else {
                    throw error("startingFen", null, null, "La disposizione dei pezzi non è valida.");
                }
            }
            if (files != 8) {
                throw error("startingFen", null, null, "Ogni traversa della FEN deve contenere otto case.");
            }
        }
    }

    private void validateCastlingSyntax(String rights) {
        if (rights.equals("-")) {
            return;
        }
        if (!rights.matches("K?Q?k?q?") || rights.isEmpty()) {
            throw error("startingFen", null, null, "I diritti d'arrocco non sono validi.");
        }
    }

    private void validateCounter(String value, String message, boolean positive) {
        try {
            int parsed = Integer.parseInt(value);
            if (parsed < (positive ? 1 : 0)) {
                throw error("startingFen", null, null, message);
            }
        } catch (NumberFormatException e) {
            throw error("startingFen", null, null, message);
        }
    }

    private void validateKings(Board board) {
        if (Long.bitCount(board.getBitboard(Piece.WHITE_KING)) != 1
            || Long.bitCount(board.getBitboard(Piece.BLACK_KING)) != 1) {
            throw error("startingFen", null, null, "La posizione deve contenere un solo re per colore.");
        }
        Square whiteKing = board.getKingSquare(Side.WHITE);
        Square blackKing = board.getKingSquare(Side.BLACK);
        if (Math.abs(whiteKing.getFile().ordinal() - blackKing.getFile().ordinal()) <= 1
            && Math.abs(whiteKing.getRank().ordinal() - blackKing.getRank().ordinal()) <= 1) {
            throw error("startingFen", null, null, "I due re non possono essere adiacenti.");
        }
    }

    private void validatePawns(Board board) {
        for (Square square : Square.values()) {
            if (square == Square.NONE) {
                continue;
            }
            Piece piece = board.getPiece(square);
            if ((piece == Piece.WHITE_PAWN || piece == Piece.BLACK_PAWN)
                && (square.getRank() == Rank.RANK_1 || square.getRank() == Rank.RANK_8)) {
                throw error("startingFen", null, null, "I pedoni non possono trovarsi sulla prima o ottava traversa.");
            }
        }
    }

    private void validateCastlingPieces(Board board, String rights) {
        if (rights.contains("K")
            && (board.getPiece(Square.E1) != Piece.WHITE_KING || board.getPiece(Square.H1) != Piece.WHITE_ROOK)) {
            throw error("startingFen", null, null, "L'arrocco bianco sul lato di re non è coerente con i pezzi.");
        }
        if (rights.contains("Q")
            && (board.getPiece(Square.E1) != Piece.WHITE_KING || board.getPiece(Square.A1) != Piece.WHITE_ROOK)) {
            throw error("startingFen", null, null, "L'arrocco bianco sul lato di donna non è coerente con i pezzi.");
        }
        if (rights.contains("k")
            && (board.getPiece(Square.E8) != Piece.BLACK_KING || board.getPiece(Square.H8) != Piece.BLACK_ROOK)) {
            throw error("startingFen", null, null, "L'arrocco nero sul lato di re non è coerente con i pezzi.");
        }
        if (rights.contains("q")
            && (board.getPiece(Square.E8) != Piece.BLACK_KING || board.getPiece(Square.A8) != Piece.BLACK_ROOK)) {
            throw error("startingFen", null, null, "L'arrocco nero sul lato di donna non è coerente con i pezzi.");
        }
    }

    private void validateSideThatJustMoved(Board board) {
        Side sideToMove = board.getSideToMove();
        Side sideThatJustMoved = sideToMove.flip();
        if (board.squareAttackedBy(board.getKingSquare(sideThatJustMoved), sideToMove) != 0L) {
            throw error("startingFen", null, null,
                "Il lato che ha appena mosso non può lasciare il proprio re sotto scacco.");
        }
    }

    private void validateEnPassant(Board board, String sideToMove, String enPassant) {
        if (enPassant.equals("-")) {
            return;
        }
        Square target = Square.valueOf(enPassant.toUpperCase(Locale.ROOT));
        boolean whiteToMove = sideToMove.equals("w");
        Rank expectedRank = whiteToMove ? Rank.RANK_6 : Rank.RANK_3;
        Rank pawnRank = whiteToMove ? Rank.RANK_5 : Rank.RANK_4;
        Rank originRank = whiteToMove ? Rank.RANK_7 : Rank.RANK_2;
        Piece justMovedPawn = whiteToMove ? Piece.BLACK_PAWN : Piece.WHITE_PAWN;
        Square pawnSquare = Square.encode(pawnRank, target.getFile());
        Square originSquare = Square.encode(originRank, target.getFile());

        if (target.getRank() != expectedRank
            || board.getPiece(target) != Piece.NONE
            || board.getPiece(pawnSquare) != justMovedPawn
            || board.getPiece(originSquare) != Piece.NONE
            || board.getEnPassantTarget() == Square.NONE) {
            throw error("startingFen", null, null,
                "La casa en-passant non è coerente con un doppio passo appena eseguito.");
        }
    }
}
