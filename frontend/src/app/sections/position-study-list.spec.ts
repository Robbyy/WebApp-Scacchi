import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { PositionStudyList } from './position-study-list';
import { StudyService } from '../core/study.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { GamePhase, Study } from '../core/study.model';
import { MIDDLEGAME_SECTION_CONTEXT, SectionRouteContext } from '../core/study-sections';

const m1: Study = { id: 1, name: 'Strutture di pedoni', phase: 'MIDDLEGAME', variantCount: 3 };
const m2: Study = {
  id: 2,
  name: 'Attacco sul re',
  description: 'Schemi tipici',
  color: 'WHITE',
  phase: 'MIDDLEGAME',
  variantCount: 1,
};

function setup(
  service: Partial<StudyService>,
  confirmResult = true,
  context: SectionRouteContext = MIDDLEGAME_SECTION_CONTEXT,
) {
  TestBed.configureTestingModule({
    imports: [PositionStudyList],
    providers: [
      provideRouter([]),
      { provide: StudyService, useValue: service },
      { provide: ConfirmService, useValue: { ask: () => Promise.resolve(confirmResult) } },
      { provide: ToastService, useValue: { success() {}, error() {}, info() {} } },
    ],
  });
  const fixture = TestBed.createComponent(PositionStudyList);
  fixture.componentRef.setInput('sectionContext', context);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, cmp: fixture.componentInstance as any };
}

/** Servizio minimo: la lista deve usare solo la lettura filtrata per fase. */
function phaseService(studies: Study[], extra: Partial<StudyService> = {}): Partial<StudyService> {
  return { getStudiesByPhase: () => of(studies), ...extra };
}

describe('PositionStudyList (ISSUE-016)', () => {
  it('loads only the studies of the section phase', () => {
    let askedPhase: GamePhase | null = null;
    let genericCalls = 0;
    const { cmp } = setup({
      getStudiesByPhase: (phase: GamePhase) => {
        askedPhase = phase;
        return of([m1, m2]);
      },
      getStudies: () => {
        genericCalls++;
        return of([]);
      },
    });

    expect(askedPhase).toBe('MIDDLEGAME');
    expect(genericCalls).toBe(0);
    expect(cmp.studies().length).toBe(2);
    expect(cmp.loading()).toBe(false);
  });

  it('takes the phase from the route context, so the page is reusable', () => {
    let askedPhase: GamePhase | null = null;
    setup(
      {
        getStudiesByPhase: (phase: GamePhase) => {
          askedPhase = phase;
          return of([]);
        },
      },
      true,
      { section: 'endgame', phase: 'ENDGAME', base: '/endgame', positionMode: true },
    );
    expect(askedPhase).toBe('ENDGAME');
  });

  it('shows the loading state until the studies arrive', () => {
    const pending = new Subject<Study[]>();
    const { el, fixture } = setup({ getStudiesByPhase: () => pending.asObservable() });
    expect(el.textContent).toContain('Caricamento');

    pending.next([m1]);
    pending.complete();
    fixture.detectChanges();
    expect(el.textContent).not.toContain('Caricamento');
    expect(el.querySelectorAll('.study-card').length).toBe(1);
  });

  it('shows an error state when the request fails', () => {
    const { el, cmp } = setup({ getStudiesByPhase: () => throwError(() => new Error('down')) });
    expect(cmp.loading()).toBe(false);
    expect(el.querySelector('.list-error')?.textContent).toContain('Impossibile caricare gli studi');
    expect(el.querySelector('.study-cards')).toBeNull();
  });

  it('keeps a single creation action and shows both empty middlegame groups', () => {
    const { el } = setup(phaseService([]));
    expect(el.querySelector('.list-empty')).toBeNull();
    expect(el.querySelector('[data-study-group="tactical"]')?.textContent).toContain(
      'Nessuno studio di tattica',
    );
    expect(el.querySelector('[data-study-group="strategic"]')?.textContent).toContain(
      'Nessuno studio di strategia',
    );
    expect(el.querySelector('[data-study-group="unclassified"]')).toBeNull();
    const ctas = el.querySelectorAll<HTMLAnchorElement>('a.new-cta');
    expect(ctas.length).toBe(1);
    expect(ctas[0].getAttribute('href')).toBe('/middlegame/studies/new');
  });

  it('links the header CTA to the canonical creation page', () => {
    const { el } = setup(phaseService([m1]));
    const cta = el.querySelector<HTMLAnchorElement>('.head-actions a.new-cta');
    expect(cta?.textContent).toContain('Nuovo studio');
    expect(cta?.getAttribute('href')).toBe('/middlegame/studies/new');
  });

  it('opens each study through its canonical section route', () => {
    const { el } = setup(phaseService([m1, m2]));
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('a.study-main'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/middlegame/studies/1',
      '/middlegame/studies/2',
    ]);
    expect(links[0].textContent).toContain('Strutture di pedoni');
    expect(links[1].textContent).toContain('Schemi tipici');
  });

  it('counts the children as positions', () => {
    const { el } = setup(phaseService([m1, m2]));
    const counts = Array.from(el.querySelectorAll('.study-count')).map((s) => s.textContent?.trim());
    expect(counts).toEqual(['3 posizioni', '1 posizione']);
    expect(el.textContent).not.toContain('varianti');
  });

  it('never presents a legacy color on positional study cards', () => {
    const { el } = setup(phaseService([m2]));
    expect(el.querySelector('.study-meta .badge')).toBeNull();
    expect(el.textContent).not.toContain('Bianco');
  });

  it('groups middlegame studies by type while preserving their relative order', () => {
    const tactical1: Study = {
      id: 3,
      name: 'Struttura IQP',
      phase: 'MIDDLEGAME',
      variantCount: 0,
      studyType: 'TACTICAL',
    };
    const tactical2: Study = {
      id: 4,
      name: 'Attacco doppio',
      phase: 'MIDDLEGAME',
      variantCount: 0,
      studyType: 'TACTICAL',
    };
    const strategic1: Study = {
      id: 5,
      name: 'Pedone isolato',
      phase: 'MIDDLEGAME',
      variantCount: 0,
      studyType: 'STRATEGIC',
    };
    const strategic2: Study = {
      id: 6,
      name: 'Case deboli',
      phase: 'MIDDLEGAME',
      variantCount: 0,
      studyType: 'STRATEGIC',
    };
    const unclassified: Study = {
      id: 7,
      name: 'Archivio legacy',
      phase: 'MIDDLEGAME',
      variantCount: 0,
      studyType: null,
    };
    const { el } = setup(
      phaseService([strategic1, tactical1, unclassified, tactical2, strategic2]),
    );

    const groups = Array.from(el.querySelectorAll<HTMLElement>('[data-study-group]'));
    expect(groups.map((group) => group.dataset['studyGroup'])).toEqual([
      'tactical',
      'strategic',
      'unclassified',
    ]);
    expect(groups.map((group) => group.querySelector('h3')?.textContent?.trim())).toEqual([
      'Studi di tattica',
      'Studi di strategia',
      'Da classificare',
    ]);
    const names = (key: string) =>
      Array.from(
        el.querySelectorAll<HTMLElement>(`[data-study-group="${key}"] .study-name`),
      ).map((name) => name.textContent?.trim());
    expect(names('tactical')).toEqual(['Struttura IQP', 'Attacco doppio']);
    expect(names('strategic')).toEqual(['Pedone isolato', 'Case deboli']);
    expect(names('unclassified')).toEqual(['Archivio legacy']);
    expect(el.querySelector('.study-type-badge')).toBeNull();
  });

  it('keeps the unclassified group hidden when no legacy study exists', () => {
    const tactical: Study = {
      id: 3,
      name: 'Tattica',
      phase: 'MIDDLEGAME',
      variantCount: 0,
      studyType: 'TACTICAL',
    };
    const { el } = setup(phaseService([tactical]));

    expect(el.querySelector('[data-study-group="unclassified"]')).toBeNull();
    expect(el.querySelector('[data-study-group="strategic"]')?.textContent).toContain(
      'Nessuno studio di strategia',
    );
  });

  it('keeps the single ungrouped list outside middlegame', () => {
    const endgameStudy: Study = { id: 5, name: 'Finale di torri', phase: 'ENDGAME', variantCount: 0 };
    const { el } = setup(
      phaseService([endgameStudy]),
      true,
      { section: 'endgame', phase: 'ENDGAME', base: '/endgame', positionMode: true },
    );
    expect(el.querySelector('[data-study-group="all"]')).not.toBeNull();
    expect(el.querySelector('.study-group-title')).toBeNull();
    expect(el.querySelector('.study-type-badge')).toBeNull();
  });

  it('keeps the original empty state outside middlegame', () => {
    const { el } = setup(
      phaseService([]),
      true,
      { section: 'endgame', phase: 'ENDGAME', base: '/endgame', positionMode: true },
    );

    expect(el.querySelector('.list-empty')?.textContent).toContain('Nessuno studio di Finale');
    expect(el.querySelector('[data-study-group]')).toBeNull();
    expect(el.querySelectorAll('a.new-cta').length).toBe(1);
  });

  it('removes the legacy group when its last study is deleted', async () => {
    const legacy: Study = {
      id: 8,
      name: 'Da sistemare',
      phase: 'MIDDLEGAME',
      variantCount: 0,
      studyType: null,
    };
    const { cmp, el, fixture } = setup(
      phaseService([legacy], { deleteStudy: () => of(void 0) }),
    );
    expect(el.querySelector('[data-study-group="unclassified"]')).not.toBeNull();

    await cmp.remove(legacy);
    fixture.detectChanges();

    expect(el.querySelector('[data-study-group="unclassified"]')).toBeNull();
    expect(el.querySelectorAll('[data-study-group]').length).toBe(2);
  });

  it('removes a study after confirmation', async () => {
    let deletedId: number | null = null;
    const { cmp } = setup(
      phaseService([m1, m2], {
        deleteStudy: (id: number) => {
          deletedId = id;
          return of(void 0);
        },
      }),
    );

    await cmp.remove(m1);
    expect(deletedId).toBe(1);
    expect(cmp.studies().map((s: Study) => s.id)).toEqual([2]);
  });

  it('keeps the study when the confirmation is declined', async () => {
    let deletedId: number | null = null;
    const { cmp } = setup(
      phaseService([m1, m2], {
        deleteStudy: (id: number) => {
          deletedId = id;
          return of(void 0);
        },
      }),
      false,
    );

    await cmp.remove(m1);
    expect(deletedId).toBeNull();
    expect(cmp.studies().length).toBe(2);
  });

  it('keeps the study in the list when the deletion fails', async () => {
    const { cmp } = setup(
      phaseService([m1], { deleteStudy: () => throwError(() => new Error('boom')) }),
    );

    await cmp.remove(m1);
    expect(cmp.studies().length).toBe(1);
    expect(cmp.deletingId()).toBeNull();
  });

  it('has none of the opening-only actions (ISSUE-016)', () => {
    const { el } = setup(phaseService([m1, m2]));
    const text = el.textContent ?? '';
    expect(text).not.toContain('Ripeti oggi');
    expect(text).not.toContain('Lichess');
    expect(text).not.toContain('PGN');
    expect(text).not.toContain('Allena');
    expect(text).not.toContain('Statistiche');
    expect(el.querySelector('.due-badge')).toBeNull();
    const hrefs = Array.from(el.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '');
    expect(hrefs.some((h) => h.startsWith('/reviews'))).toBe(false);
    expect(hrefs.every((h) => h.startsWith('/middlegame'))).toBe(true);
  });
});
