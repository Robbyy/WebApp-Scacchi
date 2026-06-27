import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateTrainingSessionRequest, TrainingSession } from './training-session.model';

/** Accesso alle API delle sessioni di allenamento (/api/training-sessions) - P17. */
@Injectable({ providedIn: 'root' })
export class TrainingSessionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/training-sessions';

  /** Registra una sessione conclusa. */
  create(request: CreateTrainingSessionRequest): Observable<TrainingSession> {
    return this.http.post<TrainingSession>(this.baseUrl, request);
  }

  /** Storico (riepilogo), opzionalmente filtrato per variante o studio. */
  list(filter?: { variantId?: number; studyId?: number }): Observable<TrainingSession[]> {
    let params = new HttpParams();
    if (filter?.variantId != null) {
      params = params.set('variantId', filter.variantId);
    }
    if (filter?.studyId != null) {
      params = params.set('studyId', filter.studyId);
    }
    return this.http.get<TrainingSession[]>(this.baseUrl, { params });
  }

  /** Dettaglio con l'elenco delle mosse. */
  get(id: number): Observable<TrainingSession> {
    return this.http.get<TrainingSession>(`${this.baseUrl}/${id}`);
  }
}
