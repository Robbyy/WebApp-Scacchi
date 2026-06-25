import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateStudyRequest, Study } from './study.model';

/** Accesso alle API degli studi (/api/studies) - Prototipo 11. */
@Injectable({ providedIn: 'root' })
export class StudyService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/studies';

  /** Lista studi con il solo conteggio varianti. */
  getStudies(): Observable<Study[]> {
    return this.http.get<Study[]>(this.baseUrl);
  }

  /** Dettaglio di uno studio con l'elenco completo delle varianti. */
  getStudy(id: number): Observable<Study> {
    return this.http.get<Study>(`${this.baseUrl}/${id}`);
  }

  createStudy(request: CreateStudyRequest): Observable<Study> {
    return this.http.post<Study>(this.baseUrl, request);
  }

  updateStudy(id: number, request: CreateStudyRequest): Observable<Study> {
    return this.http.put<Study>(`${this.baseUrl}/${id}`, request);
  }

  /** Elimina lo studio e, a cascata, tutte le sue varianti. */
  deleteStudy(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
