import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { StudyService } from '../core/study.service';
import { StatsService } from '../core/stats.service';
import { Study } from '../core/study.model';
import { StudyStats as StudyStatsModel, VariantStats } from '../core/stats.model';
import { formatTrainedAt, accuracyPercent } from './stats-format';

interface VariantStatsRow extends VariantStats {
  name: string;
  accuracyPct: number | null;
}

/** Vista statistiche aggregate di uno studio (Prototipo 18). */
@Component({
  selector: 'app-study-stats',
  imports: [RouterLink],
  templateUrl: './study-stats.html',
  styleUrl: './stats.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudyStats {
  private readonly route = inject(ActivatedRoute);
  private readonly studyService = inject(StudyService);
  private readonly statsService = inject(StatsService);

  protected readonly study = signal<Study | null>(null);
  protected readonly stats = signal<StudyStatsModel | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(true);

  protected readonly hasData = computed(() => (this.stats()?.sessionCount ?? 0) > 0);
  protected readonly accuracyPct = computed(() => accuracyPercent(this.stats()?.accuracy));
  protected readonly lastTrained = computed(() => formatTrainedAt(this.stats()?.lastTrainedAt));

  /** Righe per variante con il nome risolto dallo studio. */
  protected readonly rows = computed<VariantStatsRow[]>(() => {
    const s = this.stats();
    const names = new Map((this.study()?.variants ?? []).map((v) => [v.id, v.name]));
    return (s?.variants ?? []).map((v) => ({
      ...v,
      name: names.get(v.variantId) ?? `Variante #${v.variantId}`,
      accuracyPct: accuracyPercent(v.accuracy),
    }));
  });

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    forkJoin({
      study: this.studyService.getStudy(id),
      stats: this.statsService.getStudyStats(id),
    }).subscribe({
      next: ({ study, stats }) => {
        this.study.set(study);
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
