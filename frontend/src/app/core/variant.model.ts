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
