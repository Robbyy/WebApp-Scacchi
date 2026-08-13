export type VariantColor = 'WHITE' | 'BLACK';

/** Annotazione scacchistica sintetica di una mossa: una sola per nodo (R24). */
export type MoveNag = '!' | '?' | '!!' | '??' | '!?' | '?!';

/** I sei NAG ammessi, nell'ordine in cui compaiono nel dialog di annotazione. */
export const MOVE_NAGS: readonly MoveNag[] = ['!', '!!', '?', '??', '!?', '?!'];

/** Lunghezza massima del commento di una mossa (mini-spec R24). */
export const MAX_MOVE_COMMENT_LENGTH = 1000;

/**
 * Nodo dell'albero di mosse: SAN + seguiti (il primo figlio è la mainline).
 * Da R24 può portare un commento testuale e un solo NAG: entrambi sono
 * opzionali, quindi gli alberi salvati prima restano leggibili senza modifiche.
 */
export interface MoveNode {
  san: string;
  children: MoveNode[];
  comment?: string;
  nag?: MoveNag;
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
  studyId?: number | null;
  createdAt?: string | null;
}

/** Payload per la creazione/aggiornamento di una variante. */
export interface CreateVariantRequest {
  name: string;
  /**
   * Le varianti di apertura mantengono esplicitamente il lato da allenare.
   * Per una posizione di mediogioco/finale il backend lo ricava dalla FEN.
   */
  color?: VariantColor;
  moves: string[];
  tree?: MoveNode[];
  sourcePgn?: string | null;
  /** FEN iniziale opzionale; ammessa dal backend solo fuori dagli studi OPENING. */
  startingFen?: string;
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
