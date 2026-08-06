import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { StudyNew } from './study-new';
import { LichessService } from '../core/lichess.service';
import { LichessAuthService } from '../core/lichess-auth.service';
import { StudyService } from '../core/study.service';
import { ToastService } from '../core/toast.service';
import { Study } from '../core/study.model';

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

const DRAFT_KEY = 'was.studyNew.draft';

function setup(
  lichess: Partial<LichessService> = {},
  studyService: Partial<StudyService> = {},
  queryParams: Record<string, string> = {},
) {
  // detectExisting() chiama getStudies(): default vuoto se il test non lo specifica.
  const studyServiceWithDefaults: Partial<StudyService> = {
    getStudies: () => of([]),
    ...studyService,
  };
  TestBed.configureTestingModule({
    imports: [StudyNew],
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
  const fixture = TestBed.createComponent(StudyNew);
  fixture.detectChanges();
  return { fixture, cmp: fixture.componentInstance as any };
}

function captureNavigate(): { target: () => unknown[] | null } {
  const router = TestBed.inject(Router);
  let navTarget: unknown[] | null = null;
  router.navigate = ((c: unknown[]) => {
    navTarget = c;
    return Promise.resolve(true);
  }) as typeof router.navigate;
  return { target: () => navTarget };
}

describe('StudyNew', () => {
  beforeEach(() => sessionStorage.clear());

  // — Flusso 1: creazione locale senza link Lichess —

  it('creates an empty local study without a Lichess link', () => {
    let captured: any = null;
    const created: Study = { id: 9, name: 'Nuovo', color: 'WHITE', phase: 'OPENING', variantCount: 0 };
    const { cmp } = setup({}, {
      createStudy: (req: unknown) => { captured = req; return of(created); },
    });
    const nav = captureNavigate();

    cmp.name.set('Nuovo');
    cmp.color.set('WHITE');
    expect(cmp.submitLabel()).toBe('Crea studio');
    cmp.submit();

    expect(captured).toEqual({ name: 'Nuovo', description: null, color: 'WHITE' });
    expect(nav.target()).toEqual(['/studies', 9]);
  });

  it('does not create a study with a blank name', () => {
    let called = false;
    const { cmp } = setup({}, {
      createStudy: () => { called = true; return of({} as Study); },
    });
    cmp.name.set('   ');
    expect(cmp.canSubmit()).toBe(false);
    cmp.submit();
    expect(called).toBe(false);
  });

  it('requires the preview before submitting when a link is pasted', () => {
    let called = false;
    const { cmp } = setup({}, {
      createStudy: () => { called = true; return of({} as Study); },
    });
    cmp.name.set('Nuovo');
    cmp.onUrlChange('https://lichess.org/study/OR3CU5Je');
    expect(cmp.needsPreview()).toBe(true);
    expect(cmp.canSubmit()).toBe(false);
    cmp.submit();
    expect(called).toBe(false);
  });

  // — Anteprima —

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

  it('fetches the study and prefills name and color on a first import', () => {
    let askedId: string | null = null;
    const { cmp } = setup({
      fetchStudyPgn: (id: string) => { askedId = id; return of(STUDY_PGN); },
    });
    cmp.url.set('https://lichess.org/study/OR3CU5Je');
    cmp.loadPreview();
    expect(askedId).toBe('OR3CU5Je');
    expect(cmp.chapters().length).toBe(2);
    expect(cmp.name()).toBe('Repertorio');
    expect(cmp.color()).toBe('MIXED');
    expect(cmp.willUpdate()).toBe(false);
  });

  it('keeps a user-typed name over the Lichess suggestion', () => {
    const { cmp } = setup({ fetchStudyPgn: () => of(STUDY_PGN) });
    cmp.name.set('Il mio nome');
    cmp.url.set('https://lichess.org/study/OR3CU5Je');
    cmp.loadPreview();
    expect(cmp.name()).toBe('Il mio nome');
    expect(cmp.color()).toBe('MIXED'); // il colore vuoto viene comunque suggerito
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

  it('invalidates a stale preview when the URL changes', () => {
    const { cmp } = setup({ fetchStudyPgn: () => of(STUDY_PGN) });
    cmp.url.set('https://lichess.org/study/OR3CU5Je');
    cmp.loadPreview();
    expect(cmp.preview()).not.toBeNull();
    cmp.onUrlChange('https://lichess.org/study/AAAABBBB');
    expect(cmp.preview()).toBeNull();
    // Riscrivere lo stesso URL dell'anteprima non la invalida.
    cmp.loadPreview();
    cmp.onUrlChange('https://lichess.org/study/AAAABBBB ');
    expect(cmp.preview()).not.toBeNull();
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

  // — Flusso 2: primo import come nuovo studio —

  it('imports as a new study with the form metadata and the remote reference', () => {
    let captured: any = null;
    const { cmp } = setup({
      fetchStudyPgn: () => of(STUDY_PGN),
    }, {
      importLichess: (req: unknown) => {
        captured = req;
        return of({ id: 42, name: 'Repertorio', phase: 'OPENING', variantCount: 2 } as Study);
      },
    });
    const nav = captureNavigate();

    cmp.url.set('https://lichess.org/study/OR3CU5Je');
    cmp.loadPreview();
    cmp.description.set('Nota locale');
    expect(cmp.submitLabel()).toBe('Importa come nuovo studio');
    cmp.submit();

    expect(captured.name).toBe('Repertorio');
    expect(captured.description).toBe('Nota locale');
    expect(captured.color).toBe('MIXED');
    expect(captured.variants.length).toBe(2);
    expect(captured.variants[0].tree[0].san).toBe('e4');
    expect(captured.sourceProvider).toBe('LICHESS');
    expect(captured.sourceStudyId).toBe('OR3CU5Je');
    expect(captured.sourceUrl).toBe('https://lichess.org/study/OR3CU5Je');
    expect(nav.target()).toEqual(['/studies', 42]);
  });

  // — Flusso 3: upsert di uno studio già importato —

  it('flags an upsert and shows the local metadata that will stay unchanged', async () => {
    const existing: Study = {
      id: 9, name: 'Mio Repertorio', description: 'Nota mia', color: 'BLACK',
      phase: 'OPENING', variantCount: 2,
      sourceProvider: 'LICHESS', sourceStudyId: 'OR3CU5Je',
    };
    const { fixture, cmp } = setup({
      fetchStudyPgn: () => of(STUDY_PGN),
    }, {
      getStudies: () => of([existing]),
      importLichess: () => of({ ...existing }),
    });
    const nav = captureNavigate();

    cmp.url.set('https://lichess.org/study/OR3CU5Je');
    cmp.loadPreview();
    fixture.detectChanges();
    // NgModel applica lo stato `disabled` al DOM in un microtask successivo.
    await fixture.whenStable();

    expect(cmp.willUpdate()).toBe(true);
    // Il form mostra i metadati locali (che resteranno invariati), disabilitati.
    expect(cmp.name()).toBe('Mio Repertorio');
    expect(cmp.description()).toBe('Nota mia');
    expect(cmp.color()).toBe('BLACK');
    const nameInput = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLInputElement>('app-study-form-fields input[name="name"]');
    expect(nameInput?.disabled).toBe(true);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('restano invariati');
    expect(cmp.submitLabel()).toBe('Aggiorna lo studio');

    cmp.submit();
    expect(nav.target()).toEqual(['/studies', 9]);
  });

  // — Flusso 4: import dentro uno studio esistente (?studyId) —

  it('imports chapters into an existing study with one request per chapter', () => {
    const target: Study = { id: 7, name: 'Destinazione', phase: 'OPENING', variantCount: 1 };
    const addedTo: number[] = [];
    const { cmp } = setup(
      { fetchStudyPgn: () => of(STUDY_PGN) },
      {
        getStudy: () => of(target),
        addVariant: (id: number) => { addedTo.push(id); return of({ id: 1 } as any); },
      },
      { studyId: '7' },
    );
    const nav = captureNavigate();

    expect(cmp.targetStudyId()).toBe(7);
    expect(cmp.targetStudy()?.name).toBe('Destinazione');
    cmp.url.set('https://lichess.org/study/OR3CU5Je');
    cmp.loadPreview();
    // Nel flusso con studyId i campi locali non vengono precompilati né inviati.
    expect(cmp.name()).toBe('');
    expect(cmp.submitLabel()).toBe('Importa nello studio');
    cmp.submit();

    expect(addedTo).toEqual([7, 7]);
    expect(nav.target()).toEqual(['/studies', 7]);
  });

  it('reports the possible partial import when a chapter request fails midway', () => {
    const target: Study = { id: 7, name: 'Destinazione', phase: 'OPENING', variantCount: 0 };
    let calls = 0;
    const { cmp } = setup(
      { fetchStudyPgn: () => of(STUDY_PGN) },
      {
        getStudy: () => of(target),
        addVariant: () => {
          calls += 1;
          return calls === 1
            ? of({ id: 1 } as any)
            : throwError(() => new HttpErrorResponse({ status: 500 }));
        },
      },
      { studyId: '7' },
    );
    cmp.url.set('https://lichess.org/study/OR3CU5Je');
    cmp.loadPreview();
    cmp.submit();
    expect(cmp.error()).toContain('già stati aggiunti');
    expect(cmp.saving()).toBe(false);
  });

  it('shows a dedicated error when the target study does not exist', () => {
    const { fixture, cmp } = setup(
      {},
      { getStudy: () => throwError(() => new HttpErrorResponse({ status: 404 })) },
      { studyId: '99' },
    );
    fixture.detectChanges();
    expect(cmp.targetError()).toContain('non trovato');
    expect(cmp.canSubmit()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).querySelector('form')).toBeNull();
  });

  it('shows a dedicated error when the target study is not an opening study', () => {
    const middlegame: Study = { id: 5, name: 'Posizioni', phase: 'MIDDLEGAME', variantCount: 0 };
    const { cmp } = setup({}, { getStudy: () => of(middlegame) }, { studyId: '5' });
    expect(cmp.targetError()).toContain('Aperture');
    expect(cmp.canSubmit()).toBe(false);
  });

  // — Bozza in sessionStorage per il ritorno OAuth (ISSUE-011) —

  it('restores the draft saved before the OAuth redirect', () => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
      studyId: null,
      url: 'https://lichess.org/study/OR3CU5Je',
      name: 'Bozza',
      description: 'Appunti',
      color: 'WHITE',
    }));
    const { cmp } = setup();
    expect(cmp.url()).toBe('https://lichess.org/study/OR3CU5Je');
    expect(cmp.name()).toBe('Bozza');
    expect(cmp.description()).toBe('Appunti');
    expect(cmp.color()).toBe('WHITE');
  });

  it('does not restore a draft saved for a different studyId context', () => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
      studyId: 3, url: 'https://lichess.org/study/OR3CU5Je', name: 'Bozza', description: '', color: '',
    }));
    const { cmp } = setup();
    expect(cmp.name()).toBe('');
    expect(cmp.url()).toBe('');
  });

  it('persists the draft while typing and clears it when leaving the page in-app', () => {
    const { fixture, cmp } = setup();
    cmp.name.set('In corso');
    cmp.url.set('https://lichess.org/study/OR3CU5Je');
    fixture.detectChanges();

    const stored = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? 'null');
    expect(stored?.name).toBe('In corso');
    expect(stored?.url).toBe('https://lichess.org/study/OR3CU5Je');

    // La navigazione in-app distrugge il componente: la bozza non deve restare.
    fixture.destroy();
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
  });
});
