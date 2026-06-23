import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

/** Contratto dell'endpoint di ping: { "status": "pong" }. */
export interface PingResponse {
  status: string;
}

/**
 * Punto di accesso unico alle API del backend.
 * In sviluppo le chiamate a `/api` sono inoltrate al backend (porta 8080)
 * tramite il proxy di Angular (vedi proxy.conf.json).
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  ping(): Observable<PingResponse> {
    return this.http.get<PingResponse>(`${this.baseUrl}/ping`);
  }
}
