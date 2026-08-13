import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { PositionStudyNew } from './position-study-new';
import { StudyService } from '../core/study.service';
import { ToastService } from '../core/toast.service';
import { CreateStudyRequest, Study } from '../core/study.model';
import { MIDDLEGAME_SECTION_CONTEXT, SectionRouteContext } from '../core/study-sections';

function setup(
  service: Partial<StudyService> = {},
  context: SectionRouteContext = MIDDLEGAME_SECTION_CONTEXT,
) {
  TestBed.configureTestingModule({
    imports: [PositionStudyNew],
    providers: [
      provideRouter([]),
      { provide: StudyService, useValue: service },
      { provide: ToastService, useValue: { success() {}, error() {}, info() {} } },
    ],
  });
  const fixture = TestBed.createComponent(PositionStudyNew);
  fixture.componentRef.setInput('sectionContext', context);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, cmp: fixture.componentInstance as any };
}

/** Intercetta la navigazione per URL usata dopo il salvataggio. */
function captureNavigate(): { url: () => string | null } {
  const router = TestBed.inject(Router);
  let target: string | null = null;
  router.navigateByUrl = ((url: string) => {
    target = url;
    return Promise.resolve(true);
  }) as typeof router.navigateByUrl;
  return { url: () => target };
}

const created: Study = { id: 9, name: 'Strutture di pedoni', phase: 'MIDDLEGAME', variantCount: 0 };

describe('PositionStudyNew (ISSUE-016)', () => {
  it('creates the study with the phase of its section', () => {
    let captured: CreateStudyRequest | null = null;
    const { cmp } = setup({
      createStudy: (req: CreateStudyRequest) => {
        captured = req;
        return of(created);
      },
    });
    const nav = captureNavigate();

    cmp.name.set('  Strutture di pedoni  ');
    cmp.description.set('Schemi tipici');
    cmp.color.set('WHITE');
    cmp.submit();

    expect(captured).toEqual({
      name: 'Strutture di pedoni',
      description: 'Schemi tipici',
      color: 'WHITE',
      phase: 'MIDDLEGAME',
    });
    expect(nav.url()).toBe('/middlegame/studies/9');
  });

  it('sends empty optional metadata as null', () => {
    let captured: CreateStudyRequest | null = null;
    const { cmp } = setup({
      createStudy: (req: CreateStudyRequest) => {
        captured = req;
        return of(created);
      },
    });
    captureNavigate();

    cmp.name.set('Solo nome');
    cmp.submit();

    expect(captured).toEqual({
      name: 'Solo nome',
      description: null,
      color: null,
      phase: 'MIDDLEGAME',
    });
  });

  it('takes the phase and the target route from the context, so the page is reusable', () => {
    let captured: CreateStudyRequest | null = null;
    const { cmp } = setup(
      {
        createStudy: (req: CreateStudyRequest) => {
          captured = req;
          return of({ ...created, phase: 'ENDGAME' });
        },
      },
      { section: 'endgame', phase: 'ENDGAME', base: '/endgame', positionMode: true },
    );
    const nav = captureNavigate();

    cmp.name.set('Finali di torre');
    cmp.submit();

    expect(captured).toEqual({
      name: 'Finali di torre',
      description: null,
      color: null,
      phase: 'ENDGAME',
    });
    expect(nav.url()).toBe('/endgame/studies/9');
  });

  it('rejects a blank name without calling the API and stays on the form', () => {
    let called = false;
    const { cmp, el, fixture } = setup({
      createStudy: () => {
        called = true;
        return of(created);
      },
    });
    const nav = captureNavigate();

    cmp.name.set('   ');
    cmp.submit();
    fixture.detectChanges();

    expect(called).toBe(false);
    expect(nav.url()).toBeNull();
    expect(el.querySelector('.page-error')?.textContent).toContain('Inserisci un nome');
    expect(el.querySelector('form')).not.toBeNull();
  });

  it('keeps the metadata and shows the message when the backend rejects them', () => {
    const { cmp, el, fixture } = setup({
      createStudy: () =>
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { message: 'Nome già utilizzato.' },
            }),
        ),
    });
    const nav = captureNavigate();

    cmp.name.set('Duplicato');
    cmp.submit();
    fixture.detectChanges();

    expect(nav.url()).toBeNull();
    expect(cmp.saving()).toBe(false);
    expect(cmp.name()).toBe('Duplicato');
    expect(el.querySelector('.page-error')?.textContent).toContain('Nome già utilizzato.');
    expect(el.querySelector('form')).not.toBeNull();
  });

  it('reuses the shared metadata fields', () => {
    const { el } = setup();
    expect(el.querySelector('app-study-form-fields')).not.toBeNull();
    expect(el.querySelector('input[name="name"]')).not.toBeNull();
    expect(el.querySelector('select[name="color"]')).not.toBeNull();
    expect(el.querySelector('input[name="description"]')).not.toBeNull();
  });

  it('cancels back to the section list', () => {
    const { el } = setup();
    const cancel = Array.from(el.querySelectorAll<HTMLAnchorElement>('a')).find((a) =>
      a.textContent?.includes('Annulla'),
    );
    expect(cancel?.getAttribute('href')).toBe('/middlegame');
    expect(el.querySelector('.crumbs a')?.getAttribute('href')).toBe('/middlegame');
  });

  it('has no Lichess flow at all (ISSUE-016)', () => {
    const { el } = setup();
    const text = el.textContent ?? '';
    expect(text).not.toContain('Lichess');
    expect(text).not.toContain('Anteprima');
    expect(text).not.toContain('Importa');
    expect(el.querySelector('.lichess-block')).toBeNull();
    expect(el.querySelector('.url-input')).toBeNull();
    expect(el.querySelector('.preview')).toBeNull();
  });

  it('never lets the user choose the phase', () => {
    const { el } = setup();
    const selects = Array.from(el.querySelectorAll('select')).map((s) => s.getAttribute('name'));
    expect(selects).toEqual(['color']);
    expect(el.textContent).not.toContain('Fase');
  });
});
