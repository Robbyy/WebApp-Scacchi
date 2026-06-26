import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { StudyService } from './study.service';
import { Study } from './study.model';

describe('StudyService', () => {
  let service: StudyService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(StudyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists studies via GET /api/studies', () => {
    const studies: Study[] = [
      { id: 1, name: 'Repertorio', variantCount: 2 },
    ];
    let received: Study[] | undefined;
    service.getStudies().subscribe((s) => (received = s));

    const req = httpMock.expectOne('/api/studies');
    expect(req.request.method).toBe('GET');
    req.flush(studies);
    expect(received).toEqual(studies);
  });

  it('fetches a study detail via GET /api/studies/:id', () => {
    let received: Study | undefined;
    service.getStudy(7).subscribe((s) => (received = s));

    const req = httpMock.expectOne('/api/studies/7');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 7, name: 'Siciliana', variantCount: 0, variants: [] });
    expect(received?.id).toBe(7);
  });

  it('creates a study via POST', () => {
    service.createStudy({ name: 'Nuovo', color: 'WHITE' }).subscribe();
    const req = httpMock.expectOne('/api/studies');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Nuovo', color: 'WHITE' });
    req.flush({ id: 9, name: 'Nuovo', color: 'WHITE', variantCount: 0 });
  });

  it('updates a study via PUT /api/studies/:id', () => {
    service.updateStudy(3, { name: 'Rinominato' }).subscribe();
    const req = httpMock.expectOne('/api/studies/3');
    expect(req.request.method).toBe('PUT');
    req.flush({ id: 3, name: 'Rinominato', variantCount: 1 });
  });

  it('deletes a study via DELETE /api/studies/:id', () => {
    let done = false;
    service.deleteStudy(4).subscribe(() => (done = true));
    const req = httpMock.expectOne('/api/studies/4');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    expect(done).toBe(true);
  });

  it('adds a variant to a study via POST /api/studies/:id/variants', () => {
    const request = { name: 'Italiana', color: 'WHITE' as const, moves: ['e4', 'e5'] };
    service.addVariant(5, request).subscribe();
    const req = httpMock.expectOne('/api/studies/5/variants');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ id: 11, name: 'Italiana', color: 'WHITE', moves: ['e4', 'e5'], studyId: 5 });
  });

  it('imports a study in bulk via POST /api/studies/import', () => {
    const request = {
      name: 'Importato',
      color: 'MIXED' as const,
      variants: [{ name: 'Cap. 1', color: 'WHITE' as const, moves: ['e4'] }],
    };
    service.importStudy(request).subscribe();
    const req = httpMock.expectOne('/api/studies/import');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ id: 50, name: 'Importato', variantCount: 1 });
  });

  it('imports/syncs a Lichess study via POST /api/studies/import/lichess', () => {
    const request = {
      name: 'Da Lichess',
      color: 'WHITE' as const,
      sourceProvider: 'LICHESS',
      sourceStudyId: 'OR3CU5Je',
      sourceUrl: 'https://lichess.org/study/OR3CU5Je',
      variants: [{ name: 'Cap. 1', color: 'WHITE' as const, moves: ['e4'] }],
    };
    service.importLichess(request).subscribe();
    const req = httpMock.expectOne('/api/studies/import/lichess');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ id: 60, name: 'Da Lichess', variantCount: 1, sourceStudyId: 'OR3CU5Je' });
  });
});
