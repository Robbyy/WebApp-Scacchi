/**
 * Esito di un tentativo su una posizione Mediogioco (ISSUE-016/R26.3).
 * `FAILED` è ammesso solo per l'esito tattico derivato dal backend; le
 * posizioni strategiche accettano soltanto `UNDERSTOOD` e `NOT_UNDERSTOOD`
 * dichiarati dall'utente.
 */
export type AttemptOutcome = 'UNDERSTOOD' | 'NOT_UNDERSTOOD' | 'FAILED';

/** Evento di tentativo persistito, allineato a PositionAttemptDto del backend. */
export interface PositionAttempt {
  id: number;
  variantId: number;
  outcome: AttemptOutcome;
  occurredAt: string;
}

/**
 * Payload di registrazione di un tentativo (R26.3): un solo endpoint,
 * discriminato dal backend in base allo `studyType` persistito. Per una
 * posizione tattica sono ammesse solo `userMoves`; per una strategica solo
 * `outcome` (`UNDERSTOOD` o `NOT_UNDERSTOOD`, mai `FAILED`).
 */
export interface RecordAttemptRequest {
  userMoves?: string[];
  outcome?: 'UNDERSTOOD' | 'NOT_UNDERSTOOD';
}

/**
 * Riepilogo dei tentativi di una posizione (R26.3), una voce per posizione
 * dello studio, incluse le posizioni mai tentate (`lastOutcome` e
 * `lastUnderstoodAt` nulli, `attemptCount` zero). Nessuna percentuale.
 */
export interface PositionAttemptsSummary {
  variantId: number;
  lastOutcome: AttemptOutcome | null;
  attemptCount: number;
  lastUnderstoodAt: string | null;
}

/**
 * Deriva il riepilogo di una posizione dal suo storico (più recente prima,
 * contratto di `GET /api/variants/{id}/attempts`), per le pagine che leggono
 * la sola posizione invece del riepilogo aggregato dello studio.
 */
export function deriveAttemptsSummary(
  variantId: number,
  attempts: readonly PositionAttempt[],
): PositionAttemptsSummary {
  if (attempts.length === 0) {
    return { variantId, lastOutcome: null, attemptCount: 0, lastUnderstoodAt: null };
  }
  const lastUnderstood = attempts.find((a) => a.outcome === 'UNDERSTOOD');
  return {
    variantId,
    lastOutcome: attempts[0].outcome,
    attemptCount: attempts.length,
    lastUnderstoodAt: lastUnderstood ? lastUnderstood.occurredAt : null,
  };
}
