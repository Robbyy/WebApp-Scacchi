export type VariantColor = 'WHITE' | 'BLACK';

/** Nodo dell'albero di mosse: SAN + seguiti (il primo figlio è la mainline). */
export interface MoveNode {
  san: string;
  children: MoveNode[];
}

/** Variante di apertura, allineata a VariantDto del backend (sezione 6 planning). */
export interface Variant {
  id: number;
  name: string;
  color: VariantColor;
  moves: string[];
  tree?: MoveNode[];
  startingFen: string;
  sourcePgn?: string | null;
  createdAt?: string | null;
}

/** Payload per la creazione/aggiornamento di una variante. */
export interface CreateVariantRequest {
  name: string;
  color: VariantColor;
  moves: string[];
  tree?: MoveNode[];
  sourcePgn?: string | null;
}

/** Errore di validazione restituito dal backend con stato 400 (Prototipo 7). */
export interface VariantValidationError {
  field: string;
  ply?: number | null;
  branchPath?: number[] | null;
  message: string;
}

/**
 * Estrae il messaggio di validazione da un errore HTTP del backend, se presente.
 * Restituisce null per errori privi di corpo strutturato (es. rete, 5xx).
 */
export function validationMessage(err: unknown): string | null {
  const body = (err as { error?: Partial<VariantValidationError> } | null)?.error;
  const msg = body?.message;
  return typeof msg === 'string' && msg.length > 0 ? msg : null;
}
