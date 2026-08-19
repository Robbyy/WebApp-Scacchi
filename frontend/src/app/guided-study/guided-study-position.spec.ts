import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { Subject, of, throwError } from 'rxjs';
import { GuidedStudyPosition } from './guided-study-position';
import { VariantService } from '../core/variant.service';
import { StudyService } from '../core/study.service';
import { Variant } from '../core/variant.model';
import { Study } from '../core/study.model';
import { PositionAttempt } from '../core/attempt.model';
import { MIDDLEGAME_SECTION_CONTEXT, SECTION_CONTEXT_DATA } from '../core/study-sections';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const theme = {
  id: 1001,
  code: 'KING_ATTACK',
  studyType: 'TACTICAL' as const,
  displayLabel: 'attacco al re',
  displayOrder: 1,
};

function eligiblePosition(overrides: Partial<Variant> = {}): Variant {
  return {
    id: 41,
    name: 'Combinazione decisiva',
    color: 'WHITE',
    moves: ['Qh5'],
    startingFen: START,
    studyId: 6,
    themeId: 1001,
    theme,
    eligibleForGuidedStudy: true,
    ...overrides,
  };
}

function classifiedStudy(overrides: Partial<Study> = {}): Study {
  return {
    id: 6,
    name: 'Strutture di pedoni',
    phase: 'MIDDLEGAME',
    studyType: 'TACTICAL',
    variantCount: 1,
    ...overrides,
  };
}

function setup(
  variantService: Partial<VariantService>,
  studyService: Partial<StudyService> = { getStudy: () => of(classifiedStudy()) },
  id = 41,
) {
  TestBed.configureTestingModule({
    imports: [GuidedStudyPosition],
    providers: [
      provideRouter([]),
      // Lo storico viene sempre richiesto dalla modalità manuale: i test che
      // non lo esercitano ricevono un catalogo vuoto senza duplicare stub.
      { provide: VariantService, useValue: { getAttempts: () => of([]), ...variantService } },
      { provide: StudyService, useValue: studyService },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: convertToParamMap({ id: String(id) }),
            data: { [SECTION_CONTEXT_DATA]: MIDDLEGAME_SECTION_CONTEXT },
          },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(GuidedStudyPosition);
  fixture.detectChanges();
  return { fixture, cmp: fixture.componentInstance as any, el: fixture.nativeElement as HTMLElement };
}

describe('GuidedStudyPosition (R26.3, task 1.3/1.4)', () => {
  it('shows a loading state before the position resolves', () => {
    const pending = new Subject<Variant>();
    const { cmp, el } = setup({ getVariant: () => pending.asObservable() });
    expect(cmp.loading()).toBe(true);
    expect(el.querySelector('.detail-muted')).not.toBeNull();
    expect(el.querySelector('app-chessboard')).toBeNull();
  });

  it('mounts the reusable attempt component for an eligible position (R26.3, task 2.1)', () => {
    const { cmp, el } = setup({ getVariant: () => of(eligiblePosition()) });
    expect(cmp.gate().eligible).toBe(true);
    expect(el.querySelector('app-guided-study-attempt')).not.toBeNull();
    // Il tentativo (board, header, stato) vive nel componente riusabile:
    // qui si verifica solo che la posizione caricata gli arrivi correttamente.
    expect(el.querySelector('app-chessboard')).not.toBeNull();
    expect(el.querySelector('.side-title')?.textContent).toContain('Combinazione decisiva');
    expect(el.querySelector('.crumb-current')?.textContent).toContain('Combinazione decisiva');
    expect(el.querySelector('.theme-chip')?.textContent?.trim()).toBe('attacco al re');
    // Nessuna logica tattica/strategica ancora (gruppi 3/4): il tentativo
    // resta in attesa della mossa, senza mainline, rami né replay rivelati.
    expect(el.querySelector('.controls')).toBeNull();
    expect(el.querySelector('.move')).toBeNull();
  });

  it('shows a controlled state for a position outside Mediogioco (wrong phase)', () => {
    const { cmp, el } = setup(
      { getVariant: () => of(eligiblePosition()) },
      { getStudy: () => of({ ...classifiedStudy(), phase: 'OPENING', studyType: null }) },
    );
    expect(cmp.gate().reason).toBe('WRONG_PHASE');
    expect(el.querySelector('app-chessboard')).toBeNull();
    expect(el.textContent).toContain('non appartiene alla sezione Mediogioco');
    const back = el.querySelector<HTMLAnchorElement>('.detail-error a');
    expect(back?.getAttribute('href')).toBe('/middlegame/studies/6');
  });

  it('shows a controlled state for an unclassified study', () => {
    const { cmp, el } = setup(
      { getVariant: () => of(eligiblePosition()) },
      { getStudy: () => of({ ...classifiedStudy(), studyType: null }) },
    );
    expect(cmp.gate().reason).toBe('UNCLASSIFIED_STUDY');
    expect(el.querySelector('app-chessboard')).toBeNull();
    expect(el.textContent).toContain('Da classificare');
  });

  it('shows a controlled state for a position without an assigned theme', () => {
    const { cmp, el } = setup({
      getVariant: () => of(eligiblePosition({ themeId: null, theme: null })),
    });
    expect(cmp.gate().reason).toBe('MISSING_THEME');
    expect(el.querySelector('app-chessboard')).toBeNull();
    expect(el.textContent).toContain('non ha ancora un tema assegnato');
  });

  it('shows a controlled state for a draft position without moves', () => {
    const { cmp, el } = setup({
      getVariant: () => of(eligiblePosition({ moves: [], eligibleForGuidedStudy: false })),
    });
    expect(cmp.gate().reason).toBe('DRAFT');
    expect(el.querySelector('app-chessboard')).toBeNull();
    expect(el.textContent).toContain('bozza');
  });

  it('shows a not-found state and returns to the section when the position cannot be loaded', () => {
    const { cmp, el } = setup({ getVariant: () => throwError(() => new Error('404')) });
    expect(cmp.gate().reason).toBe('NOT_FOUND');
    expect(el.querySelector<HTMLAnchorElement>('.detail-error a')?.getAttribute('href')).toBe(
      '/middlegame',
    );
  });

  it('never enables any control on a blocked state', () => {
    const { el } = setup({
      getVariant: () => of(eligiblePosition({ themeId: null, theme: null })),
    });
    expect(el.querySelector('button')).toBeNull();
  });
});

describe('GuidedStudyPosition — invio del tentativo tattico (R26.3, task 3.1/3.2/3.4)', () => {
  function clickSquare(el: HTMLElement, square: string): void {
    (el.querySelector(`[data-square="${square}"]`) as HTMLButtonElement).click();
  }

  it('wires recordAttempt to VariantService.recordAttempt with the current position id', () => {
    const recordAttempt = vi.fn(() =>
      of({ id: 1, variantId: 41, outcome: 'UNDERSTOOD' as const, occurredAt: '2026-08-17T00:00:00Z' }),
    );
    const { fixture, el } = setup({
      getVariant: () => of(eligiblePosition({ moves: ['e4', 'e5'], tree: undefined })),
      recordAttempt,
    });

    clickSquare(el, 'e2');
    fixture.detectChanges();
    clickSquare(el, 'e4');
    fixture.detectChanges();

    expect(recordAttempt).toHaveBeenCalledWith(41, { userMoves: ['e4'] });
    expect(el.textContent).toContain('Esito registrato: compresa');
  });
});

describe('GuidedStudyPosition — modalità manuale e storico (R26.3, gruppo 5)', () => {
  function clickSquare(el: HTMLElement, square: string): void {
    (el.querySelector(`[data-square="${square}"]`) as HTMLButtonElement).click();
  }

  function clickButton(el: HTMLElement, label: string): void {
    const button = Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find(
      (candidate) => candidate.textContent?.trim() === label,
    );
    button?.click();
  }

  it('shows the previous summary without revealing author content for the new attempt', () => {
    const { el } = setup({
      getVariant: () => of(eligiblePosition()),
      getAttempts: () =>
        of([
          {
            id: 11,
            variantId: 41,
            outcome: 'UNDERSTOOD' as const,
            occurredAt: '2026-08-18T10:00:00Z',
          },
          {
            id: 10,
            variantId: 41,
            outcome: 'NOT_UNDERSTOOD' as const,
            occurredAt: '2026-08-10T10:00:00Z',
          },
        ]),
    });

    const summary = el.querySelector('.attempts-summary');
    expect(summary?.textContent).toContain('Compresa');
    expect(summary?.textContent).toContain('2 tentativi');
    expect(summary?.textContent).toContain('Ultima comprensione: 18/08/2026');
    expect(el.querySelector('.controls')).toBeNull();
    expect(el.querySelector('.move')).toBeNull();
  });

  it('refreshes the summary only after a confirmed attempt and preserves independent retries', () => {
    const getAttempts = vi
      .fn()
      .mockReturnValueOnce(
        of([
          {
            id: 10,
            variantId: 41,
            outcome: 'NOT_UNDERSTOOD' as const,
            occurredAt: '2026-08-10T10:00:00Z',
          },
        ]),
      )
      .mockReturnValueOnce(
        of([
          {
            id: 11,
            variantId: 41,
            outcome: 'UNDERSTOOD' as const,
            occurredAt: '2026-08-18T10:00:00Z',
          },
          {
            id: 10,
            variantId: 41,
            outcome: 'NOT_UNDERSTOOD' as const,
            occurredAt: '2026-08-10T10:00:00Z',
          },
        ]),
      );
    const recordAttempt = vi.fn(() =>
      of({ id: 11, variantId: 41, outcome: 'UNDERSTOOD' as const, occurredAt: '2026-08-18T10:00:00Z' }),
    );
    const { fixture, el } = setup({
      getVariant: () => of(eligiblePosition({ moves: ['e4'], tree: undefined })),
      getAttempts,
      recordAttempt,
    });

    clickSquare(el, 'e2');
    fixture.detectChanges();
    clickSquare(el, 'e4');
    fixture.detectChanges();

    expect(recordAttempt).toHaveBeenCalledWith(41, { userMoves: ['e4'] });
    expect(getAttempts).toHaveBeenCalledTimes(2);
    expect(el.querySelector('.attempts-summary')?.textContent).toContain('Compresa');
    expect(el.querySelector('.attempts-summary')?.textContent).toContain('2 tentativi');

    clickButton(el, 'Riprova');
    fixture.detectChanges();
    expect(recordAttempt).toHaveBeenCalledTimes(1);
    expect(el.querySelector('.controls')).toBeNull();
    expect(el.querySelector('.attempts-summary')?.textContent).toContain('2 tentativi');
  });

  it('does not refresh or overwrite history when the outcome API rejects the attempt', () => {
    const getAttempts = vi.fn(() =>
      of([
        {
          id: 10,
          variantId: 41,
          outcome: 'NOT_UNDERSTOOD' as const,
          occurredAt: '2026-08-10T10:00:00Z',
        },
      ]),
    );
    const { fixture, el } = setup({
      getVariant: () => of(eligiblePosition({ moves: ['e4'], tree: undefined })),
      getAttempts,
      recordAttempt: () => throwError(() => ({ error: { message: 'Rete non disponibile.' } })),
    });

    clickSquare(el, 'e2');
    fixture.detectChanges();
    clickSquare(el, 'e4');
    fixture.detectChanges();

    expect(getAttempts).toHaveBeenCalledTimes(1);
    expect(el.querySelector('.attempts-summary')?.textContent).toContain('Da rivedere');
    expect(el.querySelector('.attempts-summary')?.textContent).toContain('1 tentativo');
  });

  it('keeps the newest confirmed summary when an older history reload resolves later', () => {
    const stale = new Subject<PositionAttempt[]>();
    const getAttempts = vi
      .fn()
      .mockReturnValueOnce(of([]))
      .mockReturnValueOnce(stale.asObservable())
      .mockReturnValueOnce(
        of([
          {
            id: 12,
            variantId: 41,
            outcome: 'UNDERSTOOD' as const,
            occurredAt: '2026-08-19T10:00:00Z',
          },
          {
            id: 11,
            variantId: 41,
            outcome: 'NOT_UNDERSTOOD' as const,
            occurredAt: '2026-08-18T10:00:00Z',
          },
        ]),
      );
    const { cmp } = setup({ getVariant: () => of(eligiblePosition()), getAttempts });

    cmp.onAttemptRecorded({
      id: 11,
      variantId: 41,
      outcome: 'NOT_UNDERSTOOD',
      occurredAt: '2026-08-18T10:00:00Z',
    });
    cmp.onAttemptRecorded({
      id: 12,
      variantId: 41,
      outcome: 'UNDERSTOOD',
      occurredAt: '2026-08-19T10:00:00Z',
    });
    stale.next([
      { id: 11, variantId: 41, outcome: 'NOT_UNDERSTOOD', occurredAt: '2026-08-18T10:00:00Z' },
    ]);
    stale.complete();

    expect(cmp.attemptsSummary().lastOutcome).toBe('UNDERSTOOD');
    expect(cmp.attemptsSummary().attemptCount).toBe(2);
  });

  it('offers an explicit exit without creating an attempt before an outcome', () => {
    const recordAttempt = vi.fn();
    const { fixture, el } = setup({ getVariant: () => of(eligiblePosition()), recordAttempt });

    const exit = el.querySelector<HTMLAnchorElement>('.guided-study-exit');
    expect(exit?.textContent).toContain('Esci e torna allo studio');
    expect(exit?.getAttribute('href')).toBe('/middlegame/studies/6');
    expect(recordAttempt).not.toHaveBeenCalled();

    fixture.destroy();
    expect(recordAttempt).not.toHaveBeenCalled();
  });

  it('ignores a delayed history response after the manual route has been left', () => {
    const pending = new Subject<PositionAttempt[]>();
    const { fixture, cmp } = setup({
      getVariant: () => of(eligiblePosition()),
      getAttempts: () => pending.asObservable(),
    });

    fixture.destroy();
    pending.next([
      { id: 11, variantId: 41, outcome: 'UNDERSTOOD', occurredAt: '2026-08-18T10:00:00Z' },
    ]);
    pending.complete();

    expect(cmp.attemptsSummary()).toBeNull();
  });
});

// --- Gruppo 8: layout e ordine DOM della modalità manuale --------------------

describe('GuidedStudyPosition — layout e ordine DOM (R26.3, task 8.2/8.3)', () => {
  it('mounts the attempt as the single positional container, without a nested .detail wrapper', () => {
    const { el } = setup({ getVariant: () => of(eligiblePosition()) });

    const attempt = el.querySelector('app-guided-study-attempt')!;
    // Il contenitore posizionale è l'host del tentativo: un secondo wrapper
    // raddoppierebbe padding e max-width rispetto a R26.1.
    expect(el.querySelector('.detail')).toBeNull();
    expect(attempt.querySelector(':scope > .board-col app-chessboard')).not.toBeNull();
    expect(attempt.querySelector(':scope > .side')).not.toBeNull();
  });

  it('keeps the reading order: breadcrumb, attempt, history, exit', () => {
    const { el } = setup({ getVariant: () => of(eligiblePosition()) });

    // Ordine di lettura: percorso, tentativo, poi il contenitore con storico e
    // uscita — gli ultimi due sono figli del wrapper che li allinea alla colonna.
    const blocks = [
      '.crumbs',
      'app-guided-study-attempt',
      '.guided-study-outro',
      '.attempts-summary',
      '.guided-study-exit',
    ];
    const order = Array.from(el.querySelectorAll(blocks.join(', '))).map((node) =>
      blocks.find((b) => node.matches(b)),
    );
    expect(order).toEqual(blocks);
  });

  it('aligns history and exit with the positional container of board and panel', () => {
    const { el } = setup({ getVariant: () => of(eligiblePosition()) });

    // Fratelli dell'host del tentativo: senza il contenitore dedicato
    // occuperebbero l'intera larghezza della pagina, disallineandosi dalla
    // colonna. Il padding sta sul wrapper, non sul pannello, che conserva il
    // proprio padding interno.
    const outro = el.querySelector('.guided-study-outro')!;
    expect(outro.querySelector(':scope > .attempts-summary')).not.toBeNull();
    expect(outro.querySelector(':scope > .detail-actions .guided-study-exit')).not.toBeNull();
    expect(el.querySelector('.attempts-summary')?.classList.contains('guided-study-outro')).toBe(
      false,
    );
  });

  it('exposes no author move or replay control before the solution is revealed', () => {
    const { el } = setup({ getVariant: () => of(eligiblePosition()) });

    expect(el.querySelectorAll('.move').length).toBe(0);
    expect(el.querySelectorAll('.ctrl').length).toBe(0);
    expect(el.querySelector('.attempt-solution')).toBeNull();
    // La regione live esiste già, ma resta fuori dal tab order.
    expect(el.querySelector('.attempt-status')?.getAttribute('tabindex')).toBe('-1');
  });
});
