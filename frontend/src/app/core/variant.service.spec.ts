import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { VariantService } from './variant.service';

describe('VariantService (R26.3 attempts)', () => {
  let service: VariantService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(VariantService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('records a tactical attempt via POST /api/variants/:id/attempts', () => {
    let received: unknown;
    service.recordAttempt(31, { userMoves: ['Nxe5', 'Qh5'] }).subscribe((r) => (received = r));
    const req = httpMock.expectOne('/api/variants/31/attempts');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ userMoves: ['Nxe5', 'Qh5'] });
    const attempt = { id: 1, variantId: 31, outcome: 'UNDERSTOOD', occurredAt: '2026-06-01T10:00:00Z' };
    req.flush(attempt);
    expect(received).toEqual(attempt);
  });

  it('records a strategic attempt via POST /api/variants/:id/attempts', () => {
    service.recordAttempt(31, { outcome: 'NOT_UNDERSTOOD' }).subscribe();
    const req = httpMock.expectOne('/api/variants/31/attempts');
    expect(req.request.body).toEqual({ outcome: 'NOT_UNDERSTOOD' });
    req.flush({ id: 2, variantId: 31, outcome: 'NOT_UNDERSTOOD', occurredAt: '2026-06-01T10:00:00Z' });
  });

  it('lists the attempt history via GET /api/variants/:id/attempts, most recent first', () => {
    let received: unknown;
    service.getAttempts(31).subscribe((r) => (received = r));
    const req = httpMock.expectOne('/api/variants/31/attempts');
    expect(req.request.method).toBe('GET');
    const attempts = [
      { id: 2, variantId: 31, outcome: 'UNDERSTOOD', occurredAt: '2026-06-02T10:00:00Z' },
      { id: 1, variantId: 31, outcome: 'FAILED', occurredAt: '2026-06-01T10:00:00Z' },
    ];
    req.flush(attempts);
    expect(received).toEqual(attempts);
  });
});
