package com.scacchi.backend.variant;

/**
 * Difficoltà di una posizione Mediogioco (ISSUE-016/R26.3, design.md decisione 4).
 * Facoltativa e sempre modificabile; non influisce su tema, FEN, albero o storico.
 */
public enum Difficulty {
    INTRODUCTORY,
    EASY,
    INTERMEDIATE,
    ADVANCED,
    EXPERT
}
