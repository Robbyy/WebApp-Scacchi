package com.scacchi.backend.stats;

import com.scacchi.backend.study.GamePhase;
import com.scacchi.backend.study.Study;
import com.scacchi.backend.study.StudyRepository;
import com.scacchi.backend.training.TrainingMove;
import com.scacchi.backend.training.TrainingResult;
import com.scacchi.backend.training.TrainingSession;
import com.scacchi.backend.training.TrainingSessionRepository;
import com.scacchi.backend.variant.Variant;
import com.scacchi.backend.variant.VariantRepository;
import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Aggregazioni statistiche degli allenamenti (Prototipo 18), calcolate lato
 * server dalle sessioni P17. Letture in transazione (le mosse sono LAZY, vedi
 * ADR 0010).
 */
@Service
public class StatsService {

    private static final int TOP_MISTAKES = 5;

    private final TrainingSessionRepository sessions;
    private final StudyRepository studies;
    private final VariantRepository variants;

    public StatsService(
        TrainingSessionRepository sessions, StudyRepository studies, VariantRepository variants) {
        this.sessions = sessions;
        this.studies = studies;
        this.variants = variants;
    }

    /**
     * Statistiche di una variante, solo se di apertura (ISSUE-016): {@code empty} se la
     * variante non esiste o appartiene a uno studio {@code MIDDLEGAME}/{@code ENDGAME}
     * (→ 404 lato controller), coerentemente con {@code /api/stats/studies/{id}} e con
     * il rifiuto training in {@code TrainingSessionService}.
     */
    @Transactional(readOnly = true)
    public Optional<VariantStatsDto> variantStats(Long variantId) {
        return variants.findById(variantId)
            .filter(this::isOpeningPhase)
            .map(v -> aggregateVariant(variantId, sessions.findByVariantIdOrderByIdDesc(variantId)));
    }

    /**
     * Le varianti legacy senza studio sono trattate come Aperture (ISSUE-016); una
     * variante con {@code studyId} orfano (studio non risolvibile) e' trattata allo
     * stesso modo, coerentemente con {@code TrainingSessionService.ensureOpeningPhase}.
     */
    private boolean isOpeningPhase(Variant variant) {
        Long studyId = variant.getStudyId();
        if (studyId == null) {
            return true;
        }
        return studies.findById(studyId).map(Study::getPhase).orElse(GamePhase.OPENING) == GamePhase.OPENING;
    }

    /**
     * Statistiche aggregate di uno studio, solo per studi {@code OPENING} (ISSUE-016):
     * {@code empty} se lo studio non esiste o non è di apertura, perché il training non
     * produce mai sessioni per Mediogioco/Finale e le statistiche non vanno presentate
     * come statistiche di posizione (→ 404 lato controller).
     */
    @Transactional(readOnly = true)
    public Optional<StudyStatsDto> studyStats(Long studyId) {
        return studies.findById(studyId)
            .filter(s -> s.getPhase() == GamePhase.OPENING)
            .map(s -> buildStudyStats(studyId));
    }

    private StudyStatsDto buildStudyStats(Long studyId) {
        List<TrainingSession> all = sessions.findByStudyIdOrderByIdDesc(studyId);

        // Dettaglio per variante (mantiene l'ordine di apparizione).
        Map<Long, List<TrainingSession>> byVariant = all.stream()
            .collect(Collectors.groupingBy(
                TrainingSession::getVariantId, LinkedHashMap::new, Collectors.toList()));
        List<VariantStatsDto> variants = byVariant.entrySet().stream()
            .map(e -> aggregateVariant(e.getKey(), e.getValue()))
            .toList();

        // Totali dello studio: aggregati su tutte le sessioni (sommano le varianti).
        VariantStatsDto total = aggregateVariant(null, all);
        return new StudyStatsDto(
            studyId,
            total.sessionCount(),
            total.completedCount(),
            total.totalMistakes(),
            total.avgMistakes(),
            total.accuracy(),
            total.lastTrainedAt(),
            total.topMistakes(),
            variants
        );
    }

    private static VariantStatsDto aggregateVariant(Long variantId, List<TrainingSession> list) {
        int sessionCount = list.size();
        int completedCount =
            (int) list.stream().filter(s -> s.getResult() == TrainingResult.COMPLETED).count();
        int totalMistakes = list.stream().mapToInt(TrainingSession::getMistakesCount).sum();
        double avgMistakes = sessionCount == 0 ? 0.0 : round2((double) totalMistakes / sessionCount);

        List<TrainingMove> moves = list.stream().flatMap(s -> s.getMoves().stream()).toList();
        long totalMoves = moves.size();
        long correctMoves = moves.stream().filter(TrainingMove::isCorrect).count();
        Double accuracy = totalMoves == 0 ? null : round2((double) correctMoves / totalMoves);

        String lastTrainedAt = list.stream()
            .map(StatsService::sessionInstant)
            .filter(Objects::nonNull)
            .max(Comparator.naturalOrder())
            .map(Instant::toString)
            .orElse(null);

        List<MoveMistakeDto> topMistakes = moves.stream()
            .filter(m -> !m.isCorrect() && m.getExpectedSan() != null)
            .collect(Collectors.groupingBy(TrainingMove::getExpectedSan, Collectors.counting()))
            .entrySet().stream()
            .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
            .limit(TOP_MISTAKES)
            .map(e -> new MoveMistakeDto(e.getKey(), e.getValue().intValue()))
            .toList();

        return new VariantStatsDto(
            variantId, sessionCount, completedCount, totalMistakes, avgMistakes,
            accuracy, lastTrainedAt, topMistakes);
    }

    private static Instant sessionInstant(TrainingSession s) {
        return s.getCompletedAt() != null ? s.getCompletedAt() : s.getCreatedAt();
    }

    private static double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
