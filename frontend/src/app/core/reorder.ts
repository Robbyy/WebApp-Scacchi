/**
 * Spostamento di un elemento dentro una lista, usato per costruire la
 * permutazione richiesta dal riordino atomico delle posizioni
 * (`PUT /api/studies/{id}/variants/order`, R26.3).
 *
 * Vive qui perché serve a due percorsi distinti: le frecce e il drag-and-drop
 * del dettaglio studio, e il campo «Ordine» dell'editor di setup.
 */

/** Copia della lista con l'elemento spostato da un indice all'altro. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
