package com.scacchi.backend.study;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudyRepository extends JpaRepository<Study, Long> {

    /** Usato dal seed per ritrovare (idempotente) lo studio di default. */
    Optional<Study> findByName(String name);
}
