import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { StudyService } from '../core/study.service';
import { ToastService } from '../core/toast.service';
import { StudyColor } from '../core/study.model';
import { validationMessage } from '../core/variant.model';
import { SectionRouteContext, sectionLabel, sectionPaths } from '../core/study-sections';
import { StudyFormFields } from '../studies/study-form-fields';

/**
 * Creazione manuale di uno studio posizionale (ISSUE-016): nome obbligatorio,
 * descrizione facoltativa, fase presa dal contesto di route e mai
 * scelta dall'utente. La pagina è riusabile dal Finale (R27) senza modifiche.
 *
 * Riusa `StudyFormFields` — il confine già condiviso dei metadati — ma non la
 * logica di `StudyNew`: niente link o anteprima Lichess, niente OAuth, niente
 * bozza in `sessionStorage`, niente import in uno studio esistente.
 */
@Component({
  selector: 'app-position-study-new',
  imports: [FormsModule, RouterLink, StudyFormFields],
  templateUrl: './position-study-new.html',
  // Stessa presentazione della pagina di creazione delle Aperture (intestazione,
  // pannello del form, pulsanti), riusata dal foglio esistente.
  styleUrl: '../studies/study-new.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PositionStudyNew {
  private readonly router = inject(Router);
  private readonly studies = inject(StudyService);
  private readonly toast = inject(ToastService);

  /** Contesto della sezione, iniettato dai `data` della route (ISSUE-016). */
  readonly sectionContext = input.required<SectionRouteContext>();

  /** Etichetta della sezione, la stessa dei tab della topbar. */
  protected readonly label = computed(() => sectionLabel(this.sectionContext().section));
  /** Percorsi canonici della sezione: nessun URL generico `/studies/...`. */
  protected readonly paths = computed(() => sectionPaths(this.sectionContext()));

  /** Campi condivisi dei metadati (ISSUE-011/012): la fase non è esposta. */
  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly color = signal<StudyColor | ''>('');

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    if (this.saving()) {
      return;
    }
    const name = this.name().trim();
    if (!name) {
      this.error.set('Inserisci un nome per lo studio.');
      return;
    }
    this.error.set(null);
    this.saving.set(true);
    this.studies
      .createStudy({
        name,
        description: this.description().trim() || null,
        // Il colore è un metadato delle Aperture e non viene scelto qui.
        color: null,
        // Fase imposta dalla sezione e non modificabile in seguito (ISSUE-016).
        phase: this.sectionContext().phase,
      })
      .subscribe({
        next: (study) => {
          this.toast.success('Studio creato.');
          void this.router.navigateByUrl(this.paths().study(study.id));
        },
        error: (err) => {
          // L'errore resta nel form: i metadati inseriti non vanno persi.
          this.saving.set(false);
          const message = validationMessage(err) ?? 'Creazione non riuscita.';
          this.error.set(message);
          this.toast.error(message);
        },
      });
  }
}
