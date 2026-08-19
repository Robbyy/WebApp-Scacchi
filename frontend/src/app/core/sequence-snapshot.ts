import { PositionAttemptsSummary } from './attempt.model';
import { Variant } from './variant.model';

/**
 * Ordine di proposta delle posizioni nello studio sequenziale (R26.3, design
 * decisione 9): `AUTHOR` segue `positionOrder`, `RANDOM` mescola lo snapshot
 * una sola volta all'avvio.
 */
export type SequenceOrder = 'AUTHOR' | 'RANDOM';

/** I due ordini, nell'ordine in cui compaiono nella configurazione. */
export const SEQUENCE_ORDERS: readonly SequenceOrder[] = ['AUTHOR', 'RANDOM'];

/**
 * Filtro sullo storico applicato allo snapshot (R26.3, design decisione 9):
 * definizioni esatte in {@link matchesSequenceFilter}, nessuna percentuale.
 */
export type SequenceFilter = 'ALL' | 'NEVER_ATTEMPTED' | 'TO_REVIEW' | 'UNDERSTOOD';

/** I quattro filtri, nell'ordine in cui compaiono nella configurazione. */
export const SEQUENCE_FILTERS: readonly SequenceFilter[] = [
  'ALL',
  'NEVER_ATTEMPTED',
  'TO_REVIEW',
  'UNDERSTOOD',
];

/**
 * Mescola una copia dell'elenco con Fisher-Yates. La "stabilità" richiesta dal
 * design (generare l'ordine casuale una sola volta) è responsabilità del
 * chiamante, che invoca questa funzione un'unica volta per avvio della
 * sequenza e conserva il risultato: la funzione stessa resta non deterministica.
 */
export function shuffleStable<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function matchesSequenceFilter(
  summary: PositionAttemptsSummary | undefined,
  filter: SequenceFilter,
): boolean {
  switch (filter) {
    case 'ALL':
      return true;
    case 'NEVER_ATTEMPTED':
      return (summary?.attemptCount ?? 0) === 0;
    case 'TO_REVIEW':
      return summary?.lastOutcome === 'FAILED' || summary?.lastOutcome === 'NOT_UNDERSTOOD';
    case 'UNDERSTOOD':
      return summary?.lastOutcome === 'UNDERSTOOD';
  }
}

/**
 * Costruisce lo snapshot locale delle posizioni eleggibili per la sequenza
 * (R26.3, task 6.2/6.3): parte dalle sole posizioni con
 * `eligibleForGuidedStudy` (tema assegnato e mainline non vuota, derivato dal
 * backend — esclude bozze e posizioni incomplete), applica il filtro
 * sull'ultimo esito del riepilogo e infine l'ordine scelto. Puro e senza
 * effetti collaterali: il chiamante decide quando invocarla (una sola volta
 * per avvio) e conserva il risultato senza ricostruirlo.
 */
export function buildSequenceSnapshot(
  variants: readonly Variant[],
  summaries: readonly PositionAttemptsSummary[],
  order: SequenceOrder,
  filter: SequenceFilter,
  shuffle: (items: readonly Variant[]) => Variant[] = shuffleStable,
): Variant[] {
  const summaryByVariantId = new Map(summaries.map((s) => [s.variantId, s]));
  const filtered = variants
    .filter((v) => v.eligibleForGuidedStudy === true)
    .filter((v) => matchesSequenceFilter(summaryByVariantId.get(v.id), filter));

  if (order === 'RANDOM') {
    return shuffle(filtered);
  }
  return [...filtered].sort((a, b) => (a.positionOrder ?? 0) - (b.positionOrder ?? 0));
}
