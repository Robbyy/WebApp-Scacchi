import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PositionTheme, StudyType } from './position-theme.model';

/**
 * Accesso in sola lettura al catalogo temi di Mediogioco (/api/position-themes,
 * ISSUE-016/R26.3). `studyType` è obbligatorio: i due cataloghi restano
 * indipendenti, non esiste un elenco combinato.
 */
@Injectable({ providedIn: 'root' })
export class PositionThemeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/position-themes';

  getThemes(studyType: StudyType): Observable<PositionTheme[]> {
    return this.http.get<PositionTheme[]>(this.baseUrl, {
      params: new HttpParams().set('studyType', studyType),
    });
  }
}
