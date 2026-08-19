import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateVariantRequest, UpdateVariantTreeRequest, Variant } from './variant.model';
import { PositionAttempt, RecordAttemptRequest } from './attempt.model';

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

  /**
   * Aggiornamento completo: sostituisce anche FEN iniziale e metadati
   * Mediogioco. Usarlo solo da chi possiede quei campi (l'editor di setup);
   * per le sole mosse esiste {@link updateVariantTree}.
   */
  updateVariant(id: number, request: CreateVariantRequest): Observable<Variant> {
    return this.http.put<Variant>(`${this.baseUrl}/${id}`, request);
  }

  /** Aggiorna il solo albero, lasciando intatti FEN iniziale e metadati. */
  updateVariantTree(id: number, request: UpdateVariantTreeRequest): Observable<Variant> {
    return this.http.put<Variant>(`${this.baseUrl}/${id}/tree`, request);
  }

  deleteVariant(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /**
   * Registra un tentativo su una posizione Mediogioco (R26.3): un solo
   * endpoint, discriminato dal backend in base allo studio persistito.
   */
  recordAttempt(variantId: number, request: RecordAttemptRequest): Observable<PositionAttempt> {
    return this.http.post<PositionAttempt>(`${this.baseUrl}/${variantId}/attempts`, request);
  }

  /** Storico dei tentativi di una posizione, più recente prima (R26.3). */
  getAttempts(variantId: number): Observable<PositionAttempt[]> {
    return this.http.get<PositionAttempt[]>(`${this.baseUrl}/${variantId}/attempts`);
  }
}
