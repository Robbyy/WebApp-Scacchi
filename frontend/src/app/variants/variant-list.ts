import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VariantService } from '../core/variant.service';
import { Variant } from '../core/variant.model';

@Component({
  selector: 'app-variant-list',
  imports: [RouterLink],
  templateUrl: './variant-list.html',
  styleUrl: './variant-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantList implements OnInit {
  private readonly service = inject(VariantService);

  protected readonly variants = signal<Variant[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(true);

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

  protected remove(variant: Variant): void {
    this.service.deleteVariant(variant.id).subscribe({
      next: () => this.variants.update((list) => list.filter((x) => x.id !== variant.id)),
      error: () => this.error.set('Eliminazione non riuscita.'),
    });
  }
}
