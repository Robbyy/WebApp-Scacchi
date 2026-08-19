package com.scacchi.backend.theme;

import com.scacchi.backend.study.StudyType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PositionThemeRepository extends JpaRepository<PositionTheme, Long> {

    /** Temi attivi di una tipologia, nell'ordine del catalogo (ISSUE-016/R26.3). */
    List<PositionTheme> findByStudyTypeAndActiveTrueOrderByDisplayOrderAsc(StudyType studyType);
}
