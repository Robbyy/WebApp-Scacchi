/** Helper di formattazione per la spaced repetition (Prototipo 19). */

/** Parsa "yyyy-MM-dd" (o un ISO datetime) come mezzanotte UTC; null se non valido. */
function parseDateOnly(iso: string | null | undefined): number | null {
  if (!iso) {
    return null;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) {
    return null;
  }
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Data ISO → data leggibile (it-IT, solo giorno), o "—" se assente/non valida. */
export function formatReviewDate(iso: string | null | undefined): string {
  const t = parseDateOnly(iso);
  if (t === null) {
    return '—';
  }
  return new Date(t).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Giorni interi da oggi alla data indicata (negativo = scaduta), confrontando solo le
 * date (ignorando l'ora). null se la data non è valida.
 */
export function daysUntil(iso: string | null | undefined, today: Date = new Date()): number | null {
  const target = parseDateOnly(iso);
  if (target === null) {
    return null;
  }
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target - todayUtc) / 86_400_000);
}

/** Etichetta umana per la prossima ripetizione: "Da ripetere oggi", "Domani", ecc. */
export function reviewLabel(iso: string | null | undefined, today: Date = new Date()): string {
  const days = daysUntil(iso, today);
  if (days === null) {
    return '—';
  }
  if (days < 0) {
    const late = -days;
    return `In ritardo di ${late} giorn${late === 1 ? 'o' : 'i'}`;
  }
  if (days === 0) {
    return 'Da ripetere oggi';
  }
  if (days === 1) {
    return 'Domani';
  }
  return `Tra ${days} giorni`;
}
