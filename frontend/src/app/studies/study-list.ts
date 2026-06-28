import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StudyService } from '../core/study.service';
import { Study, StudyColor } from '../core/study.model';
import { ReviewService } from '../core/review.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { validationMessage } from '../core/variant.model';

/**
 * Home a studi (Prototipo 12): elenco degli studi con creazione ed eliminazione
 * (a cascata sulle varianti). Sostituisce la vecchia lista varianti come pagina
 * iniziale, sul modello degli *studies* di Lichess.
 */
@Component({
  selector: 'app-study-list',
  imports: [RouterLink, FormsModule],
  templateUrl: './study-list.html',
  styleUrl: './study-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudyList implements OnInit {
  private readonly service = inject(StudyService);
  private readonly reviews = inject(ReviewService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly studies = signal<Study[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly deletingId = signal<number | null>(null);
  /** Quante varianti sono da ripetere oggi (badge "Ripeti oggi"); P19. */
  protected readonly dueCount = signal(0);

  /** Form "Nuovo studio". */
  protected readonly creating = signal(false);
  protected readonly newName = signal('');
  protected readonly newDescription = signal('');
  protected readonly newColor = signal<StudyColor | ''>('');
  protected readonly saving = signal(false);

  ngOnInit(): void {
    this.service.getStudies().subscribe({
      next: (s) => {
        this.studies.set(s);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossibile caricare gli studi.');
        this.loading.set(false);
      },
    });
    // Conteggio delle varianti dovute oggi (best-effort: un errore non blocca la home).
    this.reviews.getDue().subscribe({
      next: (items) => this.dueCount.set(items.length),
      error: () => this.dueCount.set(0),
    });
  }

  protected openForm(): void {
    this.creating.set(true);
  }

  protected cancelForm(): void {
    this.creating.set(false);
    this.newName.set('');
    this.newDescription.set('');
    this.newColor.set('');
  }

  protected createStudy(): void {
    const name = this.newName().trim();
    if (!name) {
      return;
    }
    this.saving.set(true);
    this.service
      .createStudy({
        name,
        description: this.newDescription().trim() || null,
        color: this.newColor() || null,
      })
      .subscribe({
        next: (study) => {
          this.studies.update((list) => [...list, study]);
          this.saving.set(false);
          this.cancelForm();
          this.toast.success('Studio creato.');
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.error(validationMessage(err) ?? 'Creazione non riuscita.');
        },
      });
  }

  protected async remove(study: Study): Promise<void> {
    const count = study.variantCount;
    const warning =
      count > 0
        ? ` Verranno eliminate anche le sue ${count} variant${count === 1 ? 'e' : 'i'}.`
        : '';
    const ok = await this.confirm.ask({
      title: 'Elimina studio',
      message: `Eliminare definitivamente lo studio «${study.name}»?${warning} L'operazione non è reversibile.`,
      confirmLabel: 'Elimina studio',
      danger: true,
    });
    if (!ok) {
      return;
    }
    this.deletingId.set(study.id);
    this.service.deleteStudy(study.id).subscribe({
      next: () => {
        this.studies.update((list) => list.filter((x) => x.id !== study.id));
        this.deletingId.set(null);
        this.toast.success('Studio eliminato.');
      },
      error: () => {
        this.deletingId.set(null);
        this.toast.error('Eliminazione non riuscita.');
      },
    });
  }

  protected colorLabel(color: StudyColor | null | undefined): string {
    switch (color) {
      case 'WHITE':
        return 'Bianco';
      case 'BLACK':
        return 'Nero';
      case 'MIXED':
        return 'Misto';
      default:
        return '';
    }
  }
}
