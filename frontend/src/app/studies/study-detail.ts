import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StudyService } from '../core/study.service';
import { VariantService } from '../core/variant.service';
import { Study, StudyColor } from '../core/study.model';
import { Variant } from '../core/variant.model';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';

/**
 * Dettaglio di uno studio (Prototipo 12): intestazione, elenco delle varianti
 * ("capitoli") con creazione/import e cancellazione, ed eliminazione dell'intero
 * studio (a cascata). Sul modello degli *studies* di Lichess.
 */
@Component({
  selector: 'app-study-detail',
  imports: [RouterLink],
  templateUrl: './study-detail.html',
  styleUrl: './study-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudyDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(StudyService);
  private readonly variantService = inject(VariantService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly study = signal<Study | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly deletingId = signal<number | null>(null);
  protected readonly deletingStudy = signal(false);

  protected readonly variants = computed<Variant[]>(() => this.study()?.variants ?? []);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.service.getStudy(id).subscribe({
      next: (s) => this.study.set(s),
      error: () => this.error.set('Studio non trovato.'),
    });
  }

  protected async removeVariant(variant: Variant): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Elimina variante',
      message: `Eliminare definitivamente «${variant.name}»? L'operazione non è reversibile.`,
      confirmLabel: 'Elimina',
      danger: true,
    });
    if (!ok) {
      return;
    }
    this.deletingId.set(variant.id);
    this.variantService.deleteVariant(variant.id).subscribe({
      next: () => {
        this.study.update((s) =>
          s
            ? {
                ...s,
                variants: (s.variants ?? []).filter((v) => v.id !== variant.id),
                variantCount: Math.max(0, s.variantCount - 1),
              }
            : s,
        );
        this.deletingId.set(null);
        this.toast.success('Variante eliminata.');
      },
      error: () => {
        this.deletingId.set(null);
        this.toast.error('Eliminazione non riuscita.');
      },
    });
  }

  protected async removeStudy(): Promise<void> {
    const s = this.study();
    if (!s) {
      return;
    }
    const count = s.variantCount;
    const warning =
      count > 0
        ? ` Verranno eliminate anche le sue ${count} variant${count === 1 ? 'e' : 'i'}.`
        : '';
    const ok = await this.confirm.ask({
      title: 'Elimina studio',
      message: `Eliminare definitivamente lo studio «${s.name}»?${warning} L'operazione non è reversibile.`,
      confirmLabel: 'Elimina studio',
      danger: true,
    });
    if (!ok) {
      return;
    }
    this.deletingStudy.set(true);
    this.service.deleteStudy(s.id).subscribe({
      next: () => {
        this.toast.success('Studio eliminato.');
        this.router.navigate(['/']);
      },
      error: () => {
        this.deletingStudy.set(false);
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
