import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { StatsService } from './stats.service';

describe('StatsService', () => {
  let service: StatsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(StatsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('gets variant stats from /api/stats/variants/:id', () => {
    service.getVariantStats(3).subscribe();
    const req = httpMock.expectOne('/api/stats/variants/3');
    expect(req.request.method).toBe('GET');
    req.flush({ variantId: 3, sessionCount: 0, completedCount: 0, totalMistakes: 0, avgMistakes: 0, topMistakes: [] });
  });

  it('gets study stats from /api/stats/studies/:id', () => {
    service.getStudyStats(7).subscribe();
    const req = httpMock.expectOne('/api/stats/studies/7');
    expect(req.request.method).toBe('GET');
    req.flush({ studyId: 7, sessionCount: 0, completedCount: 0, totalMistakes: 0, avgMistakes: 0, topMistakes: [], variants: [] });
  });
});
