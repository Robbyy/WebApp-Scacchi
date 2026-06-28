import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { StudyStats, VariantStats } from './stats.model';

/** Accesso alle API delle statistiche di allenamento (/api/stats) - P18. */
@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/stats';

  getVariantStats(variantId: number): Observable<VariantStats> {
    return this.http.get<VariantStats>(`${this.baseUrl}/variants/${variantId}`);
  }

  getStudyStats(studyId: number): Observable<StudyStats> {
    return this.http.get<StudyStats>(`${this.baseUrl}/studies/${studyId}`);
  }
}
