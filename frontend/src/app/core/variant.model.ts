export type VariantColor = 'WHITE' | 'BLACK';

/** Variante di apertura, allineata a VariantDto del backend (sezione 6 planning). */
export interface Variant {
  id: number;
  name: string;
  color: VariantColor;
  moves: string[];
  startingFen: string;
  sourcePgn?: string | null;
  createdAt?: string | null;
}

/** Payload per la creazione di una variante (POST /api/variants). */
export interface CreateVariantRequest {
  name: string;
  color: VariantColor;
  moves: string[];
  sourcePgn?: string | null;
}
