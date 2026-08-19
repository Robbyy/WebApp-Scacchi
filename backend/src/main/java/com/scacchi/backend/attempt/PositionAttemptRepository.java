package com.scacchi.backend.attempt;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PositionAttemptRepository extends JpaRepository<PositionAttempt, Long> {

    /** Storico di una posizione, più recente prima (ISSUE-016/R26.3, design.md decisione 8). */
    List<PositionAttempt> findByVariantIdOrderByOccurredAtDescIdDesc(Long variantId);

    /** Eventi di più posizioni in un'unica query, per il riepilogo a livello studio. */
    List<PositionAttempt> findByVariantIdInOrderByOccurredAtDescIdDesc(Collection<Long> variantIds);
}
