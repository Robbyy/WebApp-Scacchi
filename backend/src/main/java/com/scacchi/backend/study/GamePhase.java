package com.scacchi.backend.study;

/**
 * Fase di gioco a cui appartiene uno studio (ISSUE-016). Determina se gli elementi
 * figli ({@code Variant}) dello studio sono varianti/capitoli di apertura allenabili
 * ({@code OPENING}) oppure posizioni di Mediogioco/Finale create manualmente
 * ({@code MIDDLEGAME}, {@code ENDGAME}), non allenabili col training loop SM-2.
 */
public enum GamePhase {
    OPENING,
    MIDDLEGAME,
    ENDGAME
}
