import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ReviewItem, ReviewSchedule } from './review.model';

/** Accesso alle API della spaced repetition (/api/reviews) - P19. */
@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/reviews';

  /** Varianti da ripetere oggi (o in ritardo). */
  getDue(): Observable<ReviewItem[]> {
    return this.http.get<ReviewItem[]>(`${this.baseUrl}/due`);
  }

  /** Schedule di una variante; il backend risponde 204 (→ null) se non pianificata. */
  getForVariant(variantId: number): Observable<ReviewSchedule | null> {
    return this.http.get<ReviewSchedule | null>(`${this.baseUrl}/variants/${variantId}`);
  }
}
