import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReviewService } from '../core/review.service';
import { ReviewItem } from '../core/review.model';
import { daysUntil, reviewLabel } from './review-format';

/** Vista "Ripeti oggi" (Prototipo 19): le varianti dovute, con avvio rapido del training. */
@Component({
  selector: 'app-review-due',
  imports: [RouterLink],
  templateUrl: './review-due.html',
  styleUrl: './review-due.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewDue {
  private readonly service = inject(ReviewService);

  protected readonly items = signal<ReviewItem[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(true);

  protected readonly rows = computed(() =>
    this.items().map((i) => ({
      ...i,
      label: reviewLabel(i.nextReviewDate),
      late: (daysUntil(i.nextReviewDate) ?? 0) < 0,
    })),
  );

  constructor() {
    this.service.getDue().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossibile caricare le ripetizioni.');
        this.loading.set(false);
      },
    });
  }
}
