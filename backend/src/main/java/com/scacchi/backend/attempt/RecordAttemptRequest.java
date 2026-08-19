package com.scacchi.backend.attempt;

import java.util.List;

/**
 * Payload di registrazione di un tentativo (ISSUE-016/R26.3, design.md decisione 7).
 * Un solo endpoint, discriminato dallo {@code studyType} persistito, non dal client:
 * per uno studio {@code TACTICAL} è ammesso solo {@code userMoves} (l'esito è derivato
 * dal backend); per uno studio {@code STRATEGIC} è ammesso solo {@code outcome}
 * ({@code UNDERSTOOD} o {@code NOT_UNDERSTOOD}, mai {@code FAILED}). Un payload che
 * mescola i due modi, o dichiara un esito tattico, viene rifiutato senza creare eventi.
 */
public record RecordAttemptRequest(
    List<String> userMoves,  // tattica: mosse SAN dell'utente, in ordine, dati transitori
    String outcome           // strategia: "UNDERSTOOD" | "NOT_UNDERSTOOD"
) {
}
