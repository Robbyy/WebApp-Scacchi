import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StudyColor } from '../core/study.model';

/**
 * Campi condivisi dei metadati di uno studio — nome, colore, descrizione
 * (ISSUE-011/ISSUE-012): stesso modello e stessi controlli per la pagina di
 * creazione/import (`/studies/new`) e per il form inline di modifica nel
 * dettaglio studio. La fase non compare: è scelta dal contratto alla creazione
 * e non è mai modificabile (ISSUE-016).
 */
@Component({
  selector: 'app-study-form-fields',
  imports: [FormsModule],
  templateUrl: './study-form-fields.html',
  styleUrl: './study-form-fields.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudyFormFields {
  readonly name = model.required<string>();
  readonly description = model.required<string>();
  readonly color = model.required<StudyColor | ''>();
  /** Il colore è un metadato delle sole Aperture, non degli studi posizionali. */
  readonly showColor = input(true);
  /** Disabilita i campi (upsert Lichess: i metadati locali restano invariati). */
  readonly disabled = input(false);
}
