package com.scacchi.backend.variant;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VariantRepository extends JpaRepository<Variant, Long> {

    /** Varianti di uno studio, ordinate per id (Prototipo 11). */
    List<Variant> findByStudyIdOrderByIdAsc(Long studyId);

    /** Posizioni Mediogioco di uno studio, ordinate per ordine esplicito (ISSUE-016/R26.3). */
    List<Variant> findByStudyIdOrderByPositionOrderAsc(Long studyId);

    /** Posizioni da spostare in un inserimento/eliminazione con compattazione (R26.3). */
    List<Variant> findByStudyIdAndPositionOrderGreaterThanEqual(Long studyId, Integer positionOrder);

    /** Conteggio varianti di uno studio (Prototipo 11). */
    long countByStudyId(Long studyId);

    /** Cancellazione a cascata delle varianti di uno studio (Prototipo 11). */
    void deleteByStudyId(Long studyId);

    /** Varianti legacy senza studio: agganciate al default dal seed (Prototipo 11). */
    List<Variant> findByStudyIdIsNull();
}
