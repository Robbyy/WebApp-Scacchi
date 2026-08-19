/**
 * Tipologia di uno studio Mediogioco (ISSUE-016/R26.3): `TACTICAL` o
 * `STRATEGIC`. Definita qui (e non in `study.model.ts`) perché sia
 * `Study` sia `PositionTheme` la referenziano senza creare un import
 * circolare fra `study.model.ts` e `variant.model.ts`.
 */
export type StudyType = 'TACTICAL' | 'STRATEGIC';

/**
 * Tema del catalogo Mediogioco (ISSUE-016/R26.3), allineato a
 * `PositionThemeDto` del backend. `code` è l'identificativo tecnico, non
 * mostrato come descrizione; `displayLabel` è l'etichetta leggibile.
 */
export interface PositionTheme {
  id: number;
  code: string;
  studyType: StudyType;
  displayLabel: string;
  displayOrder: number;
}
