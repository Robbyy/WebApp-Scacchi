package com.scacchi.backend.variant;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VariantRepository extends JpaRepository<Variant, Long> {

    /** Varianti di uno studio, ordinate per id (Prototipo 11). */
    List<Variant> findByStudyIdOrderByIdAsc(Long studyId);

    /** Conteggio varianti di uno studio (Prototipo 11). */
    long countByStudyId(Long studyId);

    /** Cancellazione a cascata delle varianti di uno studio (Prototipo 11). */
    void deleteByStudyId(Long studyId);

    /** Varianti legacy senza studio: agganciate al default dal seed (Prototipo 11). */
    List<Variant> findByStudyIdIsNull();
}
