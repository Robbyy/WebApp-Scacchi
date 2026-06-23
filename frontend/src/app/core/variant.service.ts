import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateVariantRequest, Variant } from './variant.model';

/** Accesso alle API delle varianti (/api/variants). */
@Injectable({ providedIn: 'root' })
export class VariantService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/variants';

  getVariants(): Observable<Variant[]> {
    return this.http.get<Variant[]>(this.baseUrl);
  }

  getVariant(id: number): Observable<Variant> {
    return this.http.get<Variant>(`${this.baseUrl}/${id}`);
  }

  createVariant(request: CreateVariantRequest): Observable<Variant> {
    return this.http.post<Variant>(this.baseUrl, request);
  }

  deleteVariant(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
