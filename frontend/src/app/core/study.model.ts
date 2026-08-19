import { CreateVariantRequest, Variant } from './variant.model';
import type { StudyType } from './position-theme.model';

/** Colore/orientamento di uno studio: per colore singolo o repertorio misto. */
export type StudyColor = 'WHITE' | 'BLACK' | 'MIXED';

/**
 * Fase di gioco dello studio (ISSUE-016): `OPENING` per varianti/capitoli
 * allenabili, `MIDDLEGAME`/`ENDGAME` per posizioni create manualmente. Scelta
 * alla creazione e non modificabile in seguito.
 */
export type GamePhase = 'OPENING' | 'MIDDLEGAME' | 'ENDGAME';

export type { StudyType };

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
  phase: GamePhase;
  /**
   * Tipologia Mediogioco (ISSUE-016/R26.3): `null` per Aperture/Finale e per
   * un Mediogioco legacy «Da classificare»; immutabile dopo la prima
   * valorizzazione.
   */
  studyType?: StudyType | null;
  variantCount: number;
  variants?: Variant[] | null;
  /** Provenienza remota (P15): valorizzati per gli studi importati da Lichess. */
  sourceProvider?: string | null;
  sourceStudyId?: string | null;
  sourceUrl?: string | null;
  lastImportedAt?: string | null;
  createdAt?: string | null;
}

/**
 * Payload per la creazione/aggiornamento di uno studio. `phase` è opzionale in
 * creazione (default `OPENING`) e non modificabile in aggiornamento (ISSUE-016).
 * `studyType` (R26.3) è obbligatorio in creazione per un Mediogioco, opzionale
 * in aggiornamento dove rappresenta l'unica transizione da «Da classificare»
 * a un valore; assente per Aperture/Finale.
 */
export interface CreateStudyRequest {
  name: string;
  description?: string | null;
  color?: StudyColor | null;
  phase?: GamePhase | null;
  studyType?: StudyType | null;
}

/** Payload per l'import in blocco di uno studio con tutte le sue varianti (P14/P15). */
export interface ImportStudyRequest {
  name: string;
  description?: string | null;
  color?: StudyColor | null;
  /** Riferimento remoto per l'upsert/sync (P15). */
  sourceProvider?: string | null;
  sourceStudyId?: string | null;
  sourceUrl?: string | null;
  variants: CreateVariantRequest[];
}
