package com.scacchi.backend.review;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewScheduleRepository extends JpaRepository<ReviewSchedule, Long> {

    /** La schedule di una variante (al più una per variante). */
    Optional<ReviewSchedule> findByVariantId(Long variantId);

    /** Varianti dovute: prossima ripetizione entro la data indicata, dalla più scaduta. */
    List<ReviewSchedule> findByNextReviewDateLessThanEqualOrderByNextReviewDateAsc(LocalDate date);
}
