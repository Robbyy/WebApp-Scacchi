package com.scacchi.backend.training;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrainingSessionRepository extends JpaRepository<TrainingSession, Long> {

    /** Storico per una variante, dal più recente (Prototipo 17). */
    List<TrainingSession> findByVariantIdOrderByIdDesc(Long variantId);

    /** Storico per uno studio, dal più recente (Prototipo 17). */
    List<TrainingSession> findByStudyIdOrderByIdDesc(Long studyId);
}
