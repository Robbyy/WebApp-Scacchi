import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TrainingSessionService } from './training-session.service';

describe('TrainingSessionService', () => {
  let service: TrainingSessionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TrainingSessionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('posts a session to /api/training-sessions', () => {
    const req = {
      variantId: 3,
      result: 'COMPLETED' as const,
      mistakesCount: 1,
      moves: [{ ply: 1, expectedSan: 'e4', playedSan: 'e4', correct: true }],
    };
    service.create(req).subscribe();
    const r = httpMock.expectOne('/api/training-sessions');
    expect(r.request.method).toBe('POST');
    expect(r.request.body).toEqual(req);
    r.flush({ id: 1, variantId: 3, result: 'COMPLETED', mistakesCount: 1, moveCount: 1 });
  });

  it('lists sessions filtered by variant', () => {
    service.list({ variantId: 7 }).subscribe();
    const r = httpMock.expectOne((req) => req.url === '/api/training-sessions');
    expect(r.request.params.get('variantId')).toBe('7');
    r.flush([]);
  });

  it('gets a session detail by id', () => {
    service.get(5).subscribe();
    const r = httpMock.expectOne('/api/training-sessions/5');
    expect(r.request.method).toBe('GET');
    r.flush({ id: 5, variantId: 3, result: 'COMPLETED', mistakesCount: 0, moveCount: 0, moves: [] });
  });
});
