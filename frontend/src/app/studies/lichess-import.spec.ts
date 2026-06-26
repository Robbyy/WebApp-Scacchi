import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { LichessImport } from './lichess-import';
import { LichessService } from '../core/lichess.service';
import { LichessAuthService } from '../core/lichess-auth.service';
import { StudyService } from '../core/study.service';
import { ToastService } from '../core/toast.service';

const STUDY_PGN = [
  '[Event "Repertorio: Italiana"]',
  '[Orientation "white"]',
  '',
  '1. e4 e5 2. Nf3 Nc6 3. Bc4 *',
  '',
  '[Event "Repertorio: Siciliana"]',
  '[Orientation "black"]',
  '',
  '1. e4 c5 *',
].join('\n');

function setup(
  lichess: Partial<LichessService>,
  studyService: Partial<StudyService> = {},
  queryParams: Record<string, string> = {},
) {
  // detectExisting() chiama getStudies(): default vuoto se il test non lo specifica.
  const studyServiceWithDefaults: Partial<StudyService> = {
    getStudies: () => of([]),
    ...studyService,
  };
  TestBed.configureTestingModule({
    imports: [LichessImport],
    providers: [
      provideRouter([]),
      { provide: LichessService, useValue: lichess },
      { provide: StudyService, useValue: studyServiceWithDefaults },
      {
        provide: LichessAuthService,
        useValue: { connected: () => false, token: () => null, connect: async () => {}, disconnect: () => {} },
      },
      { provide: ToastService, useValue: { success() {}, error() {}, info() {} } },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } },
      },
    ],
  });
  const fixture = TestBed.createComponent(LichessImport);
  fixture.detectChanges();
  return { fixture, cmp: fixture.componentInstance as any };
}

describe('LichessImport', () => {
  it('rejects an invalid Lichess URL without fetching', () => {
    let fetched = false;
    const { cmp } = setup({
      fetchStudyPgn: () => { fetched = true; return of(''); },
    });
    cmp.url.set('https://example.com/foo');
    cmp.loadPreview();
    expect(fetched).toBe(false);
    expect(cmp.error()).toBeTruthy();
    expect(cmp.preview()).toBeNull();
  });

  it('fetches a study and builds the preview', () => {
    let askedId: string | null = null;
    const { cmp } = setup({
      fetchStudyPgn: (id: string) => { askedId = id; return of(STUDY_PGN); },
    });
    cmp.url.set('https://lichess.org/study/OR3CU5Je');
    cmp.loadPreview();
    expect(askedId).toBe('OR3CU5Je');
    expect(cmp.chapters().length).toBe(2);
    expect(cmp.studyName()).toBe('Repertorio');
    expect(cmp.studyColor()).toBe('MIXED');
  });

  it('uses the chapter endpoint when the URL has a chapter id', () => {
    let chapterArgs: string[] | null = null;
    const { cmp } = setup({
      fetchChapterPgn: (s: string, c: string) => { chapterArgs = [s, c]; return of(STUDY_PGN); },
    });
    cmp.url.set('https://lichess.org/study/OR3CU5Je/dUBaUslK');
    cmp.loadPreview();
    expect(chapterArgs).toEqual(['OR3CU5Je', 'dUBaUslK']);
  });

  it('imports as a new study via the upsert endpoint with the remote reference', () => {
    let captured: any = null;
    const { cmp } = setup({
      fetchStudyPgn: () => of(STUDY_PGN),
    }, {
      getStudies: () => of([]),
      importLichess: (req: unknown) => { captured = req; return of({ id: 42, name: 'Repertorio', variantCount: 2 }); },
    });
    const router = TestBed.inject(Router);
    let navTarget: unknown[] | null = null;
    router.navigate = ((c: unknown[]) => { navTarget = c; return Promise.resolve(true); }) as typeof router.navigate;

    cmp.url.set('https://lichess.org/study/OR3CU5Je');
    cmp.loadPreview();
    expect(cmp.willUpdate()).toBe(false);
    cmp.doImport();

    expect(captured.variants.length).toBe(2);
    expect(captured.variants[0].tree[0].san).toBe('e4');
    expect(captured.sourceProvider).toBe('LICHESS');
    expect(captured.sourceStudyId).toBe('OR3CU5Je');
    expect(captured.sourceUrl).toBe('https://lichess.org/study/OR3CU5Je');
    expect(navTarget).toEqual(['/studies', 42]);
  });

  it('flags an already-imported study as an update (no duplicate)', () => {
    const existing = {
      id: 9, name: 'Mio Repertorio', variantCount: 2,
      sourceProvider: 'LICHESS', sourceStudyId: 'OR3CU5Je',
    };
    let captured: any = null;
    const { cmp } = setup({
      fetchStudyPgn: () => of(STUDY_PGN),
    }, {
      getStudies: () => of([existing as any]),
      importLichess: (req: unknown) => { captured = req; return of({ ...existing }); },
    });
    const router = TestBed.inject(Router);
    router.navigate = (() => Promise.resolve(true)) as typeof router.navigate;

    cmp.url.set('https://lichess.org/study/OR3CU5Je');
    cmp.loadPreview();
    expect(cmp.willUpdate()).toBe(true);
    expect(cmp.existingStudy()?.name).toBe('Mio Repertorio');
    cmp.doImport();
    expect(captured.sourceStudyId).toBe('OR3CU5Je');
  });

  it('imports chapters into an existing study when studyId is present', () => {
    const addedTo: number[] = [];
    const { cmp } = setup(
      { fetchStudyPgn: () => of(STUDY_PGN) },
      { addVariant: (id: number) => { addedTo.push(id); return of({ id: 1 } as any); } },
      { studyId: '7' },
    );
    const router = TestBed.inject(Router);
    let navTarget: unknown[] | null = null;
    router.navigate = ((c: unknown[]) => { navTarget = c; return Promise.resolve(true); }) as typeof router.navigate;

    expect(cmp.studyId()).toBe(7);
    cmp.url.set('https://lichess.org/study/OR3CU5Je');
    cmp.loadPreview();
    cmp.doImport();

    expect(addedTo).toEqual([7, 7]);
    expect(navTarget).toEqual(['/studies', 7]);
  });

  it('shows a dedicated message for a 404 from Lichess', () => {
    const { cmp } = setup({
      fetchStudyPgn: () => throwError(() => new HttpErrorResponse({ status: 404 })),
    });
    cmp.url.set('https://lichess.org/study/OR3CU5Je');
    cmp.loadPreview();
    expect(cmp.error()).toContain('non pubblico');
    expect(cmp.preview()).toBeNull();
  });
});
