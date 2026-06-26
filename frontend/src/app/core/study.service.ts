import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateStudyRequest, ImportStudyRequest, Study } from './study.model';
import { CreateVariantRequest, Variant } from './variant.model';

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

  /** Crea una variante già agganciata allo studio (endpoint nidificato). */
  addVariant(studyId: number, request: CreateVariantRequest): Observable<Variant> {
    return this.http.post<Variant>(`${this.baseUrl}/${studyId}/variants`, request);
  }

  /** Import in blocco: crea uno studio con tutte le sue varianti (Prototipo 14). */
  importStudy(request: ImportStudyRequest): Observable<Study> {
    return this.http.post<Study>(`${this.baseUrl}/import`, request);
  }
}
