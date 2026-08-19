package com.scacchi.backend.attempt;

import com.github.bhlangonijr.chesslib.Board;
import com.github.bhlangonijr.chesslib.move.Move;
import com.github.bhlangonijr.chesslib.move.MoveList;
import com.scacchi.backend.study.GamePhase;
import com.scacchi.backend.study.Study;
import com.scacchi.backend.study.StudyRepository;
import com.scacchi.backend.study.StudyType;
import com.scacchi.backend.variant.ValidationError;
import com.scacchi.backend.variant.Variant;
import com.scacchi.backend.variant.VariantRepository;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Storico e validazione dei tentativi su posizioni Mediogioco (ISSUE-016/R26.3,
 * design.md decisioni 6-9). Dipende dai repository di {@code variant} e
 * {@code study} (non dai rispettivi service) per evitare un ciclo di bean con
 * {@code StudyService}, che a sua volta delega qui il riepilogo di studio.
 */
@Service
public class PositionAttemptService {

    private final PositionAttemptRepository repository;
    private final VariantRepository variantRepository;
    private final StudyRepository studyRepository;

    public PositionAttemptService(
        PositionAttemptRepository repository, VariantRepository variantRepository,
        StudyRepository studyRepository) {
        this.repository = repository;
        this.variantRepository = variantRepository;
        this.studyRepository = studyRepository;
    }

    /**
     * Registra un tentativo (task 4.2). {@code empty} se la posizione non esiste
     * (→ 404 lato controller). Rifiuta fase diversa da Mediogioco, studio non
     * classificato, posizione bozza o senza tema, e payload incoerente con lo
     * {@code studyType} persistito, senza creare alcun evento.
     */
    @Transactional
    public Optional<PositionAttemptDto> recordAttempt(Long variantId, RecordAttemptRequest request) {
        Variant variant = variantRepository.findById(variantId).orElse(null);
        if (variant == null) {
            return Optional.empty();
        }
        RecordAttemptRequest safeRequest = request == null ? new RecordAttemptRequest(null, null) : request;
        Study study = variant.getStudyId() == null
            ? null
            : studyRepository.findById(variant.getStudyId()).orElse(null);
        GamePhase phase = study != null ? study.getPhase() : GamePhase.OPENING;
        if (phase != GamePhase.MIDDLEGAME) {
            throw new InvalidAttemptException(new ValidationError(
                "phase", null, null, "Il tentativo è disponibile solo per posizioni di Mediogioco."));
        }
        if (study.getStudyType() == null) {
            throw new InvalidAttemptException(new ValidationError("studyType", null, null,
                "Classifica lo studio Mediogioco (tattico o strategico) prima di registrare un tentativo."));
        }
        if (variant.getMoves() == null || variant.getMoves().isEmpty()) {
            throw new InvalidAttemptException(new ValidationError(
                "variantId", null, null,
                "La posizione è una bozza priva di soluzione: nessun tentativo possibile."));
        }
        if (variant.getThemeId() == null) {
            throw new InvalidAttemptException(new ValidationError(
                "themeId", null, null, "Assegna un tema alla posizione prima di registrare un tentativo."));
        }

        AttemptOutcome outcome = study.getStudyType() == StudyType.TACTICAL
            ? resolveTacticalOutcome(variant, safeRequest)
            : resolveStrategicOutcome(safeRequest);

        PositionAttempt attempt = new PositionAttempt();
        attempt.setVariantId(variantId);
        attempt.setOutcome(outcome);
        return Optional.of(toDto(repository.save(attempt)));
    }

    /** Storico di una posizione, più recente prima (task 4.5). {@code empty} se non esiste. */
    public Optional<List<PositionAttemptDto>> findByVariantId(Long variantId) {
        if (!variantRepository.existsById(variantId)) {
            return Optional.empty();
        }
        return Optional.of(repository.findByVariantIdOrderByOccurredAtDescIdDesc(variantId).stream()
            .map(PositionAttemptService::toDto)
            .toList());
    }

    /**
     * Riepilogo per posizione di uno studio, incluse le posizioni mai tentate
     * (task 4.5). {@code empty} se lo studio non esiste.
     */
    public Optional<List<PositionAttemptsSummaryDto>> getStudySummary(Long studyId) {
        if (!studyRepository.existsById(studyId)) {
            return Optional.empty();
        }
        List<Variant> positions = variantRepository.findByStudyIdOrderByPositionOrderAsc(studyId);
        if (positions.isEmpty()) {
            return Optional.of(List.of());
        }
        List<Long> variantIds = positions.stream().map(Variant::getId).toList();
        Map<Long, List<PositionAttempt>> byVariant = repository
            .findByVariantIdInOrderByOccurredAtDescIdDesc(variantIds).stream()
            .collect(Collectors.groupingBy(PositionAttempt::getVariantId));
        return Optional.of(positions.stream()
            .map(v -> summarize(v.getId(), byVariant.getOrDefault(v.getId(), List.of())))
            .toList());
    }

    private static PositionAttemptsSummaryDto summarize(Long variantId, List<PositionAttempt> mostRecentFirst) {
        if (mostRecentFirst.isEmpty()) {
            return new PositionAttemptsSummaryDto(variantId, null, 0, null);
        }
        String lastOutcome = mostRecentFirst.get(0).getOutcome().name();
        String lastUnderstoodAt = mostRecentFirst.stream()
            .filter(a -> a.getOutcome() == AttemptOutcome.UNDERSTOOD)
            .findFirst()
            .map(a -> a.getOccurredAt().toString())
            .orElse(null);
        return new PositionAttemptsSummaryDto(variantId, lastOutcome, mostRecentFirst.size(), lastUnderstoodAt);
    }

    /**
     * Tattica (task 4.3): il backend ricostruisce la mainline dalla {@code startingFen},
     * applica le risposte avversarie attese e confronta le sole mosse dell'utente ai ply
     * dispari. Una deviazione legale ferma la validazione con {@code FAILED}; una mossa
     * illegale o un prefisso incompleto sono errori di validazione, non un esito.
     */
    private static AttemptOutcome resolveTacticalOutcome(Variant variant, RecordAttemptRequest request) {
        if (request.outcome() != null && !request.outcome().isBlank()) {
            throw new InvalidAttemptException(new ValidationError("outcome", null, null,
                "Una posizione tattica deriva l'esito dalle mosse: non è ammesso dichiararlo."));
        }
        List<String> mainline = variant.getMoves();
        List<String> userMoves = request.userMoves() == null ? List.of() : request.userMoves();

        Board board = new Board();
        board.loadFromFen(variant.getStartingFen());
        int userIndex = 0;
        for (int i = 0; i < mainline.size(); i++) {
            int ply = i + 1;
            boolean userTurn = ply % 2 == 1;
            String currentFen = board.getFen();
            Move expectedMove = decode(currentFen, mainline.get(i));
            if (userTurn) {
                if (userIndex >= userMoves.size()) {
                    throw new InvalidAttemptException(new ValidationError("userMoves", ply, null,
                        "Il tentativo non è ancora concluso: manca la mossa al ply " + ply + "."));
                }
                String userSan = userMoves.get(userIndex++);
                Move userMove = decode(currentFen, userSan);
                if (userMove == null) {
                    throw new InvalidAttemptException(new ValidationError("userMoves", ply, null,
                        "Mossa illegale o non riconosciuta: \"" + userSan + "\"."));
                }
                board.doMove(userMove);
                if (!userMove.equals(expectedMove)) {
                    return AttemptOutcome.FAILED;
                }
            } else {
                board.doMove(expectedMove);
            }
        }
        return AttemptOutcome.UNDERSTOOD;
    }

    /** Decodifica una SAN nella posizione data; {@code null} se illegale o non riconosciuta. */
    private static Move decode(String fen, String san) {
        if (san == null || san.isBlank()) {
            return null;
        }
        Move move = null;
        try {
            MoveList decoded = new MoveList(fen);
            decoded.loadFromSan(san.trim());
            if (!decoded.isEmpty()) {
                move = decoded.get(decoded.size() - 1);
            }
        } catch (Exception ignored) {
            // SAN non decodificabile: trattata come illegale sotto.
        }
        Board board = new Board();
        board.loadFromFen(fen);
        if (move == null || !board.legalMoves().contains(move)) {
            return null;
        }
        return move;
    }

    /**
     * Strategia (task 4.4): solo {@code UNDERSTOOD}/{@code NOT_UNDERSTOOD} dichiarati
     * dall'utente; {@code FAILED} e {@code userMoves} sono rifiutati.
     */
    private static AttemptOutcome resolveStrategicOutcome(RecordAttemptRequest request) {
        if (request.userMoves() != null && !request.userMoves().isEmpty()) {
            throw new InvalidAttemptException(new ValidationError("userMoves", null, null,
                "Una posizione strategica non accetta mosse: registra solo l'esito."));
        }
        String outcome = request.outcome();
        if (outcome == null || outcome.isBlank()) {
            throw new InvalidAttemptException(new ValidationError(
                "outcome", null, null, "L'esito è obbligatorio per una posizione strategica."));
        }
        AttemptOutcome parsed;
        try {
            parsed = AttemptOutcome.valueOf(outcome);
        } catch (IllegalArgumentException e) {
            throw new InvalidAttemptException(new ValidationError(
                "outcome", null, null, "Esito non valido: \"" + outcome + "\"."));
        }
        if (parsed == AttemptOutcome.FAILED) {
            throw new InvalidAttemptException(new ValidationError(
                "outcome", null, null, "L'esito FAILED non è consentito per le posizioni strategiche."));
        }
        return parsed;
    }

    private static PositionAttemptDto toDto(PositionAttempt a) {
        return new PositionAttemptDto(
            a.getId(),
            a.getVariantId(),
            a.getOutcome().name(),
            a.getOccurredAt() == null ? null : a.getOccurredAt().toString()
        );
    }
}
