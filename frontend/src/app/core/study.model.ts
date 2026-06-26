import { CreateVariantRequest, Variant } from './variant.model';

/** Colore/orientamento di uno studio: per colore singolo o repertorio misto. */
export type StudyColor = 'WHITE' | 'BLACK' | 'MIXED';

/**
 * Studio che raggruppa più varianti, allineato a StudyDto del backend
 * (sezione 15 planning). Nella lista `variants` è assente e conta `variantCount`;
 * nel dettaglio `variants` contiene l'elenco completo.
 */
export interface Study {
  id: number;
  name: string;
  description?: string | null;
  color?: StudyColor | null;
  variantCount: number;
  variants?: Variant[] | null;
  createdAt?: string | null;
}

/** Payload per la creazione/aggiornamento di uno studio. */
export interface CreateStudyRequest {
  name: string;
  description?: string | null;
  color?: StudyColor | null;
}

/** Payload per l'import in blocco di uno studio con tutte le sue varianti (P14). */
export interface ImportStudyRequest {
  name: string;
  description?: string | null;
  color?: StudyColor | null;
  variants: CreateVariantRequest[];
}
