package com.scacchi.backend.study;

import static org.junit.jupiter.api.Assertions.assertEquals;

import jakarta.persistence.EntityManager;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

@DataJpaTest
class StudyRepositoryTest {

    @Autowired
    private StudyRepository repository;

    @Autowired
    private EntityManager entityManager;

    /**
     * ISSUE-016: la migration Liquibase (0003-study-phase) aggiunge la colonna
     * {@code phase} con un default a livello di database, cosi' le righe già presenti
     * al momento della migrazione (qui simulate con un insert nativo che non la
     * valorizza) diventano {@code OPENING} senza intervento applicativo.
     */
    @Test
    void legacyRowWithoutAnExplicitPhaseDefaultsToOpening() {
        entityManager.createNativeQuery(
                "INSERT INTO study (name, created_at) VALUES ('Legacy senza fase', CURRENT_TIMESTAMP)")
            .executeUpdate();
        entityManager.flush();
        entityManager.clear();

        Study legacy = repository.findByName("Legacy senza fase").orElseThrow();
        assertEquals(GamePhase.OPENING, legacy.getPhase());
    }

    @Test
    void findByPhaseReturnsOnlyStudiesOfThatPhase() {
        Study opening = new Study();
        opening.setName("Apertura");
        opening.setPhase(GamePhase.OPENING);
        repository.save(opening);

        Study endgame = new Study();
        endgame.setName("Finale");
        endgame.setPhase(GamePhase.ENDGAME);
        repository.save(endgame);

        List<Study> endgames = repository.findByPhaseOrderByIdAsc(GamePhase.ENDGAME);
        assertEquals(1, endgames.size());
        assertEquals("Finale", endgames.get(0).getName());
    }
}
