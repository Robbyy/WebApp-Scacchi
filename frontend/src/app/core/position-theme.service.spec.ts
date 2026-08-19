import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { PositionThemeService } from './position-theme.service';
import { PositionTheme } from './position-theme.model';

describe('PositionThemeService', () => {
  let service: PositionThemeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PositionThemeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists tactical themes via GET /api/position-themes?studyType=TACTICAL (R26.3)', () => {
    const themes: PositionTheme[] = [
      { id: 1001, code: 'DOUBLE_ATTACK', studyType: 'TACTICAL', displayLabel: 'doppio attacco', displayOrder: 1 },
    ];
    let received: PositionTheme[] | undefined;
    service.getThemes('TACTICAL').subscribe((t) => (received = t));

    const req = httpMock.expectOne('/api/position-themes?studyType=TACTICAL');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('studyType')).toBe('TACTICAL');
    req.flush(themes);
    expect(received).toEqual(themes);
  });

  it('lists strategic themes via GET /api/position-themes?studyType=STRATEGIC (R26.3)', () => {
    service.getThemes('STRATEGIC').subscribe();
    const req = httpMock.expectOne('/api/position-themes?studyType=STRATEGIC');
    expect(req.request.params.get('studyType')).toBe('STRATEGIC');
    req.flush([]);
  });
});
