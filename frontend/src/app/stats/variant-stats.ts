import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { VariantService } from '../core/variant.service';
import { StatsService } from '../core/stats.service';
import { Variant } from '../core/variant.model';
import { VariantStats as VariantStatsModel } from '../core/stats.model';
import { formatTrainedAt, accuracyPercent } from './stats-format';

/** Vista statistiche di una variante (Prototipo 18). */
@Component({
  selector: 'app-variant-stats',
  imports: [RouterLink],
  templateUrl: './variant-stats.html',
  styleUrl: './stats.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantStats {
  private readonly route = inject(ActivatedRoute);
  private readonly variantService = inject(VariantService);
  private readonly statsService = inject(StatsService);

  protected readonly variant = signal<Variant | null>(null);
  protected readonly stats = signal<VariantStatsModel | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(true);

  protected readonly hasData = computed(() => (this.stats()?.sessionCount ?? 0) > 0);
  protected readonly accuracyPct = computed(() => accuracyPercent(this.stats()?.accuracy));
  protected readonly lastTrained = computed(() => formatTrainedAt(this.stats()?.lastTrainedAt));

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    forkJoin({
      variant: this.variantService.getVariant(id),
      stats: this.statsService.getVariantStats(id),
    }).subscribe({
      next: ({ variant, stats }) => {
        this.variant.set(variant);
        this.stats.set(stats);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossibile caricare le statistiche.');
        this.loading.set(false);
      },
    });
  }
}
