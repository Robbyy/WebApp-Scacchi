import { CanDeactivateFn } from '@angular/router';

/** Componente che può bloccare l'uscita dalla rotta (es. modifiche non salvate). */
export interface CanComponentDeactivate {
  canDeactivate: () => boolean | Promise<boolean>;
}

/** Guard funzionale: delega al componente la decisione di lasciare la rotta. */
export const canLeaveEditor: CanDeactivateFn<CanComponentDeactivate> = (component) =>
  component.canDeactivate();
