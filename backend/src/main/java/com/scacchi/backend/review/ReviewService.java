package com.scacchi.backend.review;

import com.scacchi.backend.study.Study;
import com.scacchi.backend.study.StudyRepository;
import com.scacchi.backend.variant.Variant;
import com.scacchi.backend.variant.VariantRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Spaced repetition (Prototipo 19): a fine allenamento aggiorna la schedule della variante
 * con l'algoritmo {@link ReviewScheduler}, ed espone le varianti "dovute" e la schedule di
 * una singola variante. Le schedule orfane (variante eliminata) vengono ignorate in lettura,
 * coerentemente con sessioni e statistiche (P17/P18), che non sono cancellate a cascata.
 */
@Service
public class ReviewService {

    private final ReviewScheduleRepository repository;
    private final VariantRepository variantRepository;
    private final StudyRepository studyRepository;

    public ReviewService(
        ReviewScheduleRepository repository,
        VariantRepository variantRepository,
        StudyRepository studyRepository) {
        this.repository = repository;
        this.variantRepository = variantRepository;
        this.studyRepository = studyRepository;
    }

    /**
     * Registra l'esito di un allenamento concluso e ricalcola la prossima ripetizione.
     * Crea la schedule se la variante non ne aveva ancora una. Invocato dentro la stessa
     * transazione della creazione della sessione (P17).
     */
    @Transactional
    public void recordSession(Long variantId, Long studyId, boolean completed, int mistakesCount) {
        int quality = ReviewScheduler.quality(completed, mistakesCount);
        ReviewSchedule schedule = repository.findByVariantId(variantId).orElseGet(() -> {
            ReviewSchedule fresh = new ReviewSchedule();
            fresh.setVariantId(variantId);
            fresh.setEaseFactor(ReviewScheduler.INITIAL_EASE);
            fresh.setIntervalDays(0);
            fresh.setRepetitions(0);
            return fresh;
        });
        schedule.setStudyId(studyId);

        ReviewScheduler.Outcome outcome = ReviewScheduler.next(
            schedule.getEaseFactor(), schedule.getIntervalDays(), schedule.getRepetitions(), quality);
        schedule.setEaseFactor(outcome.easeFactor());
        schedule.setIntervalDays(outcome.intervalDays());
        schedule.setRepetitions(outcome.repetitions());
        schedule.setNextReviewDate(LocalDate.now().plusDays(outcome.intervalDays()));
        schedule.setLastReviewedAt(Instant.now());
        repository.save(schedule);
    }

    /** Varianti da ripetere oggi (o in ritardo), con nome variante e studio risolti. */
    @Transactional(readOnly = true)
    public List<ReviewItemDto> due() {
        List<ReviewSchedule> due =
            repository.findByNextReviewDateLessThanEqualOrderByNextReviewDateAsc(LocalDate.now());
        if (due.isEmpty()) {
            return List.of();
        }

        Map<Long, Variant> variants = variantRepository
            .findAllById(due.stream().map(ReviewSchedule::getVariantId).toList())
            .stream()
            .collect(Collectors.toMap(Variant::getId, v -> v));
        Map<Long, String> studyNames = studyRepository
            .findAllById(due.stream()
                .map(ReviewSchedule::getStudyId)
                .filter(Objects::nonNull)
                .distinct()
                .toList())
            .stream()
            .collect(Collectors.toMap(Study::getId, Study::getName));

        List<ReviewItemDto> items = new ArrayList<>();
        for (ReviewSchedule s : due) {
            Variant variant = variants.get(s.getVariantId());
            if (variant == null) {
                continue; // schedule orfana: variante eliminata
            }
            items.add(new ReviewItemDto(
                s.getVariantId(),
                variant.getName(),
                variant.getColor().name(),
                s.getStudyId(),
                s.getStudyId() == null ? null : studyNames.get(s.getStudyId()),
                s.getIntervalDays(),
                s.getRepetitions(),
                s.getNextReviewDate().toString(),
                s.getLastReviewedAt() == null ? null : s.getLastReviewedAt().toString()));
        }
        return items;
    }

    /** Schedule di una variante, se pianificata (cioè già allenata almeno una volta). */
    @Transactional(readOnly = true)
    public Optional<ReviewScheduleDto> forVariant(Long variantId) {
        LocalDate today = LocalDate.now();
        return repository.findByVariantId(variantId).map(s -> new ReviewScheduleDto(
            s.getVariantId(),
            s.getStudyId(),
            s.getEaseFactor(),
            s.getIntervalDays(),
            s.getRepetitions(),
            s.getNextReviewDate().toString(),
            s.getLastReviewedAt() == null ? null : s.getLastReviewedAt().toString(),
            !s.getNextReviewDate().isAfter(today)));
    }
}
