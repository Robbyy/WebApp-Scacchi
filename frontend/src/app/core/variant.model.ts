import type { PositionTheme } from './position-theme.model';

export type VariantColor = 'WHITE' | 'BLACK';

/**
 * Difficoltà di una posizione Mediogioco (ISSUE-016/R26.3), facoltativa e
 * sempre modificabile; non influisce su tema, FEN, albero o storico.
 */
export type Difficulty = 'INTRODUCTORY' | 'EASY' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

/** I cinque livelli, nell'ordine in cui compaiono nei form (dal più semplice). */
export const DIFFICULTIES: readonly Difficulty[] = [
  'INTRODUCTORY',
  'EASY',
  'INTERMEDIATE',
  'ADVANCED',
  'EXPERT',
];

/** Annotazione scacchistica sintetica di una mossa: una sola per nodo (R24). */
export type MoveNag = '!' | '?' | '!!' | '??' | '!?' | '?!';

/** I sei NAG ammessi, nell'ordine in cui compaiono nel dialog di annotazione. */
export const MOVE_NAGS: readonly MoveNag[] = ['!', '!!', '?', '??', '!?', '?!'];

/** Lunghezza massima del commento di una mossa (mini-spec R24). */
export const MAX_MOVE_COMMENT_LENGTH = 1000;

/**
 * Limiti dei metadati Mediogioco (R26.3), gli stessi applicati dal backend in
 * `VariantValidator`: qui sono il `maxlength` dei campi, là il contratto
 * dell'API — che non può dipendere dai vincoli della UI che lo usa.
 */
export const MAX_THEME_DESCRIPTION_LENGTH = 500;
export const MAX_POSITION_DESCRIPTION_LENGTH = 1000;
export const MAX_POSITION_SOURCE_LENGTH = 300;

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

/**
 * Variante di apertura, allineata a VariantDto del backend (sezione 6 planning).
 *
 * <p>I campi da `themeId` a `eligibleForGuidedStudy` (ISSUE-016/R26.3) sono
 * valorizzati soltanto per le posizioni di studi `MIDDLEGAME`; restano
 * assenti/`null` per Aperture, Finale e posizioni legacy senza tema («Tema da
 * assegnare» in UI). `theme` è il dato leggibile del catalogo risolto da
 * `themeId` dal backend (mai duplicato in un campo scrivibile).
 * `eligibleForGuidedStudy` è derivato: tema assegnato e mainline non vuota.
 */
export interface Variant {
  id: number;
  name: string;
  color: VariantColor;
  moves: string[];
  tree?: MoveNode[];
  startingFen: string;
  sourcePgn?: string | null;
  studyId?: number | null;
  themeId?: number | null;
  theme?: PositionTheme | null;
  themeDescription?: string | null;
  description?: string | null;
  difficulty?: Difficulty | null;
  source?: string | null;
  positionOrder?: number | null;
  eligibleForGuidedStudy?: boolean;
  createdAt?: string | null;
}

/**
 * Payload per la creazione/aggiornamento di una variante. I campi da
 * `themeId` a `positionOrder` (ISSUE-016/R26.3) si applicano soltanto alle
 * posizioni di studi Mediogioco: `themeId` è l'unico riferimento al catalogo
 * temi (mai il `code`), obbligatorio in creazione; `positionOrder` è
 * l'indice 1..N+1 richiesto solo in creazione (il riordino successivo passa
 * da {@link VariantOrderRequest}).
 */
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
  themeId?: number | null;
  themeDescription?: string | null;
  description?: string | null;
  difficulty?: Difficulty | null;
  source?: string | null;
  positionOrder?: number | null;
}

/**
 * Payload dell'aggiornamento del solo albero (`PUT /api/variants/{id}/tree`):
 * nome, colore (solo Aperture) e mosse. FEN iniziale e metadati Mediogioco
 * restano quelli persistiti — l'editor delle mosse non li possiede, e con il
 * contratto full-replace di {@link CreateVariantRequest} li azzerava a ogni
 * salvataggio, facendo uscire la posizione dallo studio guidato.
 */
export interface UpdateVariantTreeRequest {
  name: string;
  /** Solo Aperture: per una posizione il colore resta derivato dalla FEN. */
  color?: VariantColor;
  moves: string[];
  tree?: MoveNode[];
}

/**
 * Payload del riordino atomico delle posizioni di uno studio Mediogioco
 * (ISSUE-016/R26.3): la permutazione completa, senza duplicati né ID
 * estranei, degli ID delle posizioni dello studio nell'ordine desiderato.
 */
export interface VariantOrderRequest {
  variantIds: number[];
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
