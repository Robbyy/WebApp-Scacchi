/** Helper di formattazione per le viste statistiche (Prototipo 18). */

/** Accuracy 0..1 → percentuale intera, o null se assente. */
export function accuracyPercent(accuracy: number | null | undefined): number | null {
  return accuracy == null ? null : Math.round(accuracy * 100);
}

/** ISO timestamp → data/ora leggibile (it-IT), o "—" se assente/non valido. */
export function formatTrainedAt(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
