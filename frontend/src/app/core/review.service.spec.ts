import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ReviewService } from './review.service';

describe('ReviewService', () => {
  let service: ReviewService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ReviewService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReviewService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('fetches the variants due for review', () => {
    let count = -1;
    service.getDue().subscribe((items) => (count = items.length));
    const req = httpMock.expectOne('/api/reviews/due');
    expect(req.request.method).toBe('GET');
    req.flush([{ variantId: 1, variantName: 'Italiana' }]);
    expect(count).toBe(1);
  });

  it('fetches the schedule for a single variant', () => {
    let due: boolean | undefined;
    service.getForVariant(3).subscribe((s) => (due = s?.due));
    const req = httpMock.expectOne('/api/reviews/variants/3');
    expect(req.request.method).toBe('GET');
    req.flush({ variantId: 3, due: true });
    expect(due).toBe(true);
  });
});
