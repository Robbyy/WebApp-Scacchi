import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StudyService } from '../core/study.service';
import { VariantService } from '../core/variant.service';
import { Study, StudyColor } from '../core/study.model';
import { Variant, validationMessage } from '../core/variant.model';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { StudyFormFields } from './study-form-fields';

/**
 * Dettaglio di uno studio (Prototipo 12): intestazione, elenco delle varianti
 * ("capitoli") con creazione/import e cancellazione, ed eliminazione dell'intero
 * studio (a cascata). Sul modello degli *studies* di Lichess. Da R22 i metadati
 * (nome/descrizione/colore) sono modificabili con un form inline espandibile
 * (ISSUE-012) che riusa i campi condivisi con la pagina di creazione.
 */
@Component({
  selector: 'app-study-detail',
  imports: [FormsModule, RouterLink, StudyFormFields],
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

  /** Form inline di modifica dei metadati (ISSUE-012). */
  protected readonly editing = signal(false);
  protected readonly savingEdit = signal(false);
  protected readonly editName = signal('');
  protected readonly editDescription = signal('');
  protected readonly editColor = signal<StudyColor | ''>('');

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.service.getStudy(id).subscribe({
      next: (s) => this.study.set(s),
      error: () => this.error.set('Studio non trovato.'),
    });
  }

  /** Apre il form inline precompilato con i metadati correnti. */
  protected openEdit(): void {
    const s = this.study();
    if (!s) {
      return;
    }
    this.editName.set(s.name);
    this.editDescription.set(s.description ?? '');
    this.editColor.set(s.color ?? '');
    this.editing.set(true);
  }

  protected cancelEdit(): void {
    this.editing.set(false);
  }

  protected saveEdit(): void {
    const s = this.study();
    const name = this.editName().trim();
    if (!s || !name || this.savingEdit()) {
      return;
    }
    this.savingEdit.set(true);
    // `phase` omessa di proposito: è scelta alla creazione e mai modificabile
    // (ISSUE-016); il backend la mantiene quando assente dalla richiesta.
    this.service
      .updateStudy(s.id, {
        name,
        description: this.editDescription().trim() || null,
        color: this.editColor() || null,
      })
      .subscribe({
        next: (updated) => {
          this.study.update((cur) =>
            cur
              ? { ...cur, name: updated.name, description: updated.description, color: updated.color }
              : cur,
          );
          this.savingEdit.set(false);
          this.editing.set(false);
          this.toast.success('Studio aggiornato.');
        },
        error: (err) => {
          this.savingEdit.set(false);
          this.toast.error(validationMessage(err) ?? 'Salvataggio non riuscito.');
        },
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
