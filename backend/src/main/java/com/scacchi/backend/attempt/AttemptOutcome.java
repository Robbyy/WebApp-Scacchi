package com.scacchi.backend.attempt;

/**
 * Esito di un tentativo su una posizione Mediogioco (ISSUE-016/R26.3, design.md
 * decisione 6). {@code FAILED} è ammesso solo per l'esito tattico derivato dal
 * backend; le posizioni strategiche accettano soltanto {@code UNDERSTOOD} e
 * {@code NOT_UNDERSTOOD} dichiarati dall'utente.
 */
public enum AttemptOutcome {
    UNDERSTOOD,
    NOT_UNDERSTOOD,
    FAILED
}
