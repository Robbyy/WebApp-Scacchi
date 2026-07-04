package com.scacchi.backend.training;

import com.scacchi.backend.review.ReviewService;
import com.scacchi.backend.study.GamePhase;
import com.scacchi.backend.study.Study;
import com.scacchi.backend.study.StudyRepository;
import com.scacchi.backend.training.CreateTrainingSessionRequest.TrainingMoveInput;
import com.scacchi.backend.training.TrainingSessionDto.TrainingMoveDto;
import com.scacchi.backend.variant.ValidationError;
import com.scacchi.backend.variant.Variant;
import com.scacchi.backend.variant.VariantRepository;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Registra e rilegge le sessioni di allenamento (Prototipo 17). Lo {@code studyId}
 * viene derivato dalla variante al momento del salvataggio (denormalizzato per le
 * future statistiche, P18). Niente logica di motore: l'allenamento memorizza solo
 * le mosse.
 */
@Service
public class TrainingSessionService {

    private final TrainingSessionRepository repository;
    private final VariantRepository variantRepository;
    private final StudyRepository studyRepository;
    private final ReviewService reviewService;

    public TrainingSessionService(
        TrainingSessionRepository repository,
        VariantRepository variantRepository,
        StudyRepository studyRepository,
        ReviewService reviewService) {
        this.repository = repository;
        this.variantRepository = variantRepository;
        this.studyRepository = studyRepository;
        this.reviewService = reviewService;
    }

    /**
     * Registra una sessione conclusa; {@code empty} se la variante non esiste (→ 404).
     * Rifiuta (ISSUE-016) le varianti/posizioni di studi {@code MIDDLEGAME}/{@code ENDGAME}:
     * training e review SM-2 restano solo per le Aperture.
     */
    @Transactional
    public Optional<TrainingSessionDto> create(CreateTrainingSessionRequest request) {
        validate(request);
        Optional<Variant> variant = variantRepository.findById(request.variantId());
        if (variant.isEmpty()) {
            return Optional.empty();
        }
        ensureOpeningPhase(variant.get());
        TrainingSession session = new TrainingSession();
        session.setVariantId(variant.get().getId());
        session.setStudyId(variant.get().getStudyId());
        session.setResult(TrainingResult.valueOf(request.result()));
        session.setMistakesCount(
            request.mistakesCount() == null ? 0 : Math.max(0, request.mistakesCount()));
        session.setStartedAt(parseInstant(request.startedAt()));
        session.setCompletedAt(parseInstant(request.completedAt()));
        session.setMoves(mapMoves(request.moves()));
        TrainingSession saved = repository.save(session);
        // Spaced repetition (P19): l'esito ripianifica la prossima ripetizione della variante.
        reviewService.recordSession(
            saved.getVariantId(),
            saved.getStudyId(),
            saved.getResult() == TrainingResult.COMPLETED,
            saved.getMistakesCount());
        return Optional.of(toDto(saved, true));
    }

    /** Storico (riepilogo, senza mosse), opzionalmente filtrato per variante o studio. */
    @Transactional(readOnly = true)
    public List<TrainingSessionDto> findAll(Long variantId, Long studyId) {
        List<TrainingSession> sessions;
        if (variantId != null) {
            sessions = repository.findByVariantIdOrderByIdDesc(variantId);
        } else if (studyId != null) {
            sessions = repository.findByStudyIdOrderByIdDesc(studyId);
        } else {
            sessions = repository.findAll(org.springframework.data.domain.Sort.by(
                org.springframework.data.domain.Sort.Direction.DESC, "id"));
        }
        return sessions.stream().map(s -> toDto(s, false)).toList();
    }

    /** Dettaglio con l'elenco completo delle mosse. */
    @Transactional(readOnly = true)
    public Optional<TrainingSessionDto> findById(Long id) {
        return repository.findById(id).map(s -> toDto(s, true));
    }

    /**
     * Le varianti legacy senza studio sono trattate come Aperture (ISSUE-016). Una
     * variante orfana (studio cancellato senza cascata, caso non atteso) è trattata
     * allo stesso modo, per non rompere l'allenamento esistente.
     */
    private void ensureOpeningPhase(Variant variant) {
        Long studyId = variant.getStudyId();
        if (studyId == null) {
            return;
        }
        GamePhase phase = studyRepository.findById(studyId).map(Study::getPhase).orElse(GamePhase.OPENING);
        if (phase != GamePhase.OPENING) {
            throw new InvalidTrainingSessionException(new ValidationError(
                "variantId", null, null,
                "Il training non è disponibile per le posizioni di Mediogioco/Finale."));
        }
    }

    private static void validate(CreateTrainingSessionRequest request) {
        if (request == null || request.variantId() == null) {
            throw new InvalidTrainingSessionException(
                new ValidationError("variantId", null, null, "La variante è obbligatoria."));
        }
        if (request.result() == null) {
            throw new InvalidTrainingSessionException(
                new ValidationError("result", null, null, "L'esito è obbligatorio."));
        }
        try {
            TrainingResult.valueOf(request.result());
        } catch (IllegalArgumentException e) {
            throw new InvalidTrainingSessionException(new ValidationError(
                "result", null, null, "Esito non valido: \"" + request.result() + "\"."));
        }
    }

    private static List<TrainingMove> mapMoves(List<TrainingMoveInput> moves) {
        if (moves == null) {
            return List.of();
        }
        return moves.stream()
            .map(m -> new TrainingMove(m.ply(), m.expectedSan(), m.playedSan(), m.correct()))
            .toList();
    }

    private static Instant parseInstant(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Instant.parse(value);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private static TrainingSessionDto toDto(TrainingSession s, boolean withMoves) {
        List<TrainingMoveDto> moves = withMoves
            ? s.getMoves().stream()
                .map(m -> new TrainingMoveDto(m.getPly(), m.getExpectedSan(), m.getPlayedSan(), m.isCorrect()))
                .toList()
            : null;
        return new TrainingSessionDto(
            s.getId(),
            s.getVariantId(),
            s.getStudyId(),
            s.getResult().name(),
            s.getMistakesCount(),
            s.getMoves().size(),
            instant(s.getStartedAt()),
            instant(s.getCompletedAt()),
            instant(s.getCreatedAt()),
            moves
        );
    }

    private static String instant(Instant value) {
        return value == null ? null : value.toString();
    }
}
