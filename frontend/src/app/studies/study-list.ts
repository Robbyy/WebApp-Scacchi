import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StudyService } from '../core/study.service';
import { Study, StudyColor } from '../core/study.model';
import { ReviewService } from '../core/review.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';

/**
 * Home a studi (Prototipo 12): elenco degli studi con eliminazione (a cascata
 * sulle varianti), sul modello degli *studies* di Lichess. La creazione e
 * l'import Lichess vivono nella pagina unificata `/studies/new` (ISSUE-011);
 * le card sono su griglia adattiva a una o due colonne (ISSUE-009).
 */
@Component({
  selector: 'app-study-list',
  imports: [RouterLink],
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
