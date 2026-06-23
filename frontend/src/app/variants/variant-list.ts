import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { VariantService } from '../core/variant.service';
import { CreateVariantRequest, Variant, VariantColor } from '../core/variant.model';

@Component({
  selector: 'app-variant-list',
  imports: [RouterLink, FormsModule],
  templateUrl: './variant-list.html',
  styleUrl: './variant-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantList implements OnInit {
  private readonly service = inject(VariantService);

  protected readonly variants = signal<Variant[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(true);

  // Form di creazione (anche solo SAN per ora; l'editor visuale arriva nel P5).
  protected newName = '';
  protected newColor: VariantColor = 'WHITE';
  protected newMoves = '';
  protected readonly formError = signal<string | null>(null);
  protected readonly saving = signal(false);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
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

  protected create(): void {
    const name = this.newName.trim();
    const moves = this.newMoves.trim().split(/\s+/).filter(Boolean);
    if (!name || moves.length === 0) {
      this.formError.set('Inserisci un nome e almeno una mossa.');
      return;
    }
    this.formError.set(null);
    this.saving.set(true);
    const request: CreateVariantRequest = { name, color: this.newColor, moves };
    this.service.createVariant(request).subscribe({
      next: (created) => {
        this.variants.update((list) => [...list, created]);
        this.newName = '';
        this.newMoves = '';
        this.newColor = 'WHITE';
        this.saving.set(false);
      },
      error: () => {
        this.formError.set('Creazione non riuscita.');
        this.saving.set(false);
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
