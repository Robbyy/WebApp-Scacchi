package com.scacchi.backend.theme;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.scacchi.backend.study.StudyType;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/**
 * ISSUE-016/R26.3 (change A2, task 2.5): il backend verifica esistenza, stato
 * attivo e compatibilità del tema con lo {@code studyType} persistito, senza
 * fidarsi di un eventuale tipo dichiarato dal client.
 */
@SpringBootTest
@Transactional
class PositionThemeServiceTest {

    @Autowired
    private PositionThemeService service;

    @Autowired
    private EntityManager entityManager;

    @Test
    void acceptsAnActiveThemeCompatibleWithTheStudyType() {
        PositionTheme theme = service.requireActiveCompatibleTheme(1001L, StudyType.TACTICAL);
        assertEquals("DOUBLE_ATTACK", theme.getCode());
    }

    @Test
    void rejectsAMissingThemeId() {
        InvalidThemeException ex = assertThrows(InvalidThemeException.class,
            () -> service.requireActiveCompatibleTheme(null, StudyType.STRATEGIC));
        assertEquals("themeId", ex.getError().field());
    }

    @Test
    void rejectsANonExistentTheme() {
        InvalidThemeException ex = assertThrows(InvalidThemeException.class,
            () -> service.requireActiveCompatibleTheme(999999L, StudyType.TACTICAL));
        assertEquals("themeId", ex.getError().field());
    }

    @Test
    void rejectsAThemeOfTheOtherStudyType() {
        // 2001 è PAWN_STRUCTURE (STRATEGIC): incompatibile con uno studio TACTICAL.
        InvalidThemeException ex = assertThrows(InvalidThemeException.class,
            () -> service.requireActiveCompatibleTheme(2001L, StudyType.TACTICAL));
        assertEquals("themeId", ex.getError().field());
    }

    @Test
    void rejectsAnInactiveTheme() {
        entityManager.createNativeQuery(
                "INSERT INTO position_theme (id, code, study_type, display_label, display_order, active) "
                    + "VALUES (9001, 'RETIRED', 'TACTICAL', 'ritirato', 99, false)")
            .executeUpdate();
        entityManager.flush();
        entityManager.clear();

        InvalidThemeException ex = assertThrows(InvalidThemeException.class,
            () -> service.requireActiveCompatibleTheme(9001L, StudyType.TACTICAL));
        assertEquals("themeId", ex.getError().field());
    }
}
