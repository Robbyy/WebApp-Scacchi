package com.scacchi.backend.study;

/**
 * Tipologia di uno studio Mediogioco (ISSUE-016/R26.3): {@code TACTICAL} o
 * {@code STRATEGIC}. Applicabile solo a {@code Study.phase == MIDDLEGAME};
 * obbligatoria per i nuovi studi, valorizzabile una sola volta per i legacy
 * «Da classificare» e immutabile dopo la prima valorizzazione (vedi
 * {@code StudyService}).
 */
public enum StudyType {
    TACTICAL,
    STRATEGIC
}
