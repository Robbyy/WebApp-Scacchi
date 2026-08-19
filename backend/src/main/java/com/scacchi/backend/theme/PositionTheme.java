package com.scacchi.backend.theme;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import com.scacchi.backend.study.StudyType;

/**
 * Tema di una posizione Mediogioco (ISSUE-016/R26.3, design.md decisione 3).
 * Catalogo di sola lettura in R26.3: gli ID sono seedati esplicitamente dal
 * changeset {@code 0005-position-theme} (1001-1014 TACTICAL, 2001-2013 STRATEGIC)
 * e non generati dall'applicazione. {@code code} è univoco soltanto insieme a
 * {@code studyType}: lo stesso codice può comparire in entrambi i cataloghi con
 * ID distinti (es. {@code KING_ATTACK} 1012 tattico e 2011 strategico).
 */
@Entity
@Table(name = "position_theme")
public class PositionTheme {

    @Id
    private Long id;

    @Column(nullable = false, length = 64)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(name = "study_type", nullable = false, length = 16)
    private StudyType studyType;

    @Column(name = "display_label", nullable = false, length = 128)
    private String displayLabel;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(nullable = false)
    private boolean active;

    public Long getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public StudyType getStudyType() {
        return studyType;
    }

    public String getDisplayLabel() {
        return displayLabel;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }

    public boolean isActive() {
        return active;
    }
}
