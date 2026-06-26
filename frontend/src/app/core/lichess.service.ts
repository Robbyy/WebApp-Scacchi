import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Recupero del PGN da studi/capitoli **pubblici** Lichess (Prototipo 14), via gli
 * endpoint pubblici, senza OAuth. Solo lettura; la gestione degli errori
 * (`404`/`429`/rete) è a carico del chiamante che ispeziona lo `status`.
 *
 * Endpoint: `https://lichess.org/api/study/{studyId}.pgn` e
 * `https://lichess.org/api/study/{studyId}/{chapterId}.pgn`.
 */
@Injectable({ providedIn: 'root' })
export class LichessService {
  private readonly http = inject(HttpClient);
  private readonly base = 'https://lichess.org/api/study';

  fetchStudyPgn(studyId: string): Observable<string> {
    return this.fetch(`${this.base}/${studyId}.pgn`);
  }

  fetchChapterPgn(studyId: string, chapterId: string): Observable<string> {
    return this.fetch(`${this.base}/${studyId}/${chapterId}.pgn`);
  }

  private fetch(url: string): Observable<string> {
    const params = new HttpParams()
      .set('comments', 'true')
      .set('variations', 'true')
      .set('orientation', 'true')
      .set('clocks', 'false');
    return this.http.get(url, { params, responseType: 'text' });
  }
}
