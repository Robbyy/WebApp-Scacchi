import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VariantService } from '../core/variant.service';
import { Variant } from '../core/variant.model';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-variant-list',
  imports: [RouterLink],
  templateUrl: './variant-list.html',
  styleUrl: './variant-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantList implements OnInit {
  private readonly service = inject(VariantService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly variants = signal<Variant[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(true);
  /** Id della variante in fase di eliminazione (per disabilitare il pulsante). */
  protected readonly deletingId = signal<number | null>(null);

  ngOnInit(): void {
    this.service.getVariants().subscribe({
      next: (v) => {
        this.variants.set(v);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossibile caricare le varianti.');
        this.loading.set(false);
      },
    });
  }

  protected async remove(variant: Variant): Promise<void> {
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
    this.service.deleteVariant(variant.id).subscribe({
      next: () => {
        this.variants.update((list) => list.filter((x) => x.id !== variant.id));
        this.deletingId.set(null);
        this.toast.success('Variante eliminata.');
      },
      error: () => {
        this.deletingId.set(null);
        this.toast.error('Eliminazione non riuscita.');
      },
    });
  }
}
