import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { Subject, of, throwError } from 'rxjs';
import { GuidedStudySequence } from './guided-study-sequence';
import { StudyService } from '../core/study.service';
import { VariantService } from '../core/variant.service';
import { ConfirmOptions, ConfirmService } from '../core/confirm.service';
import { StockfishService } from '../core/stockfish.service';
import { Study } from '../core/study.model';
import { Variant } from '../core/variant.model';
import { PositionAttempt, PositionAttemptsSummary } from '../core/attempt.model';
import { MIDDLEGAME_SECTION_CONTEXT, SECTION_CONTEXT_DATA } from '../core/study-sections';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function variant(overrides: Partial<Variant> = {}): Variant {
  return {
    id: 1,
    name: 'Posizione',
    color: 'WHITE',
    moves: ['Qh5'],
    startingFen: START,
    studyId: 6,
    themeId: 1001,
    positionOrder: 1,
    eligibleForGuidedStudy: true,
    ...overrides,
  };
}

function summary(overrides: Partial<PositionAttemptsSummary> = {}): PositionAttemptsSummary {
  return { variantId: 1, lastOutcome: null, attemptCount: 0, lastUnderstoodAt: null, ...overrides };
}

function summariesFor(variants: Variant[], overrides: Partial<PositionAttemptsSummary>[] = []) {
  return variants.map((v, i) => summary({ variantId: v.id, ...overrides[i] }));
}

function classifiedStudy(overrides: Partial<Study> = {}): Study {
  return {
    id: 6,
    name: 'Strutture di pedoni',
    phase: 'MIDDLEGAME',
    studyType: 'TACTICAL',
    variantCount: 3,
    variants: [
      variant({ id: 1, positionOrder: 1 }),
      variant({ id: 2, positionOrder: 2 }),
      variant({ id: 3, positionOrder: 3 }),
    ],
    ...overrides,
  };
}

interface SetupOptions {
  variantService?: Partial<VariantService>;
  /** Default: conferma sempre accettata, così i test che non la esercitano non devono passarla. */
  confirmService?: Partial<ConfirmService>;
  /** Assente di default: TestBed fornisce il vero `StockfishService` (root-provided, inerte senza Worker). */
  engine?: Partial<StockfishService>;
  id?: number;
}

function setup(studyService: Partial<StudyService>, options: SetupOptions = {}) {
  // Alcuni test istanziano più componenti nello stesso `it` (es. simulare un
  // reload con un nuovo mount): resettare il modulo li rende indipendenti.
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [GuidedStudySequence],
    providers: [
      provideRouter([]),
      { provide: StudyService, useValue: studyService },
      { provide: VariantService, useValue: options.variantService ?? {} },
      { provide: ConfirmService, useValue: options.confirmService ?? { ask: () => Promise.resolve(true) } },
      ...(options.engine ? [{ provide: StockfishService, useValue: options.engine }] : []),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: convertToParamMap({ id: String(options.id ?? 6) }),
            data: { [SECTION_CONTEXT_DATA]: MIDDLEGAME_SECTION_CONTEXT },
          },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(GuidedStudySequence);
  fixture.detectChanges();
  return { fixture, cmp: fixture.componentInstance as any, el: fixture.nativeElement as HTMLElement };
}

function clickSquare(el: HTMLElement, square: string): void {
  (el.querySelector(`[data-square="${square}"]`) as HTMLButtonElement).click();
}

function playMove(fixture: { detectChanges(): void }, el: HTMLElement, from: string, to: string): void {
  clickSquare(el, from);
  fixture.detectChanges();
  clickSquare(el, to);
  fixture.detectChanges();
}

function attemptResult(overrides: Partial<PositionAttempt> = {}): PositionAttempt {
  return { id: 1, variantId: 1, outcome: 'UNDERSTOOD', occurredAt: '2026-08-19T00:00:00Z', ...overrides };
}

describe('GuidedStudySequence (R26.3, task 1.3/1.4)', () => {
  it('shows a loading state before the study resolves', () => {
    const pending = new Subject<Study>();
    const { cmp, el } = setup({ getStudy: () => pending.asObservable() });
    expect(cmp.loading()).toBe(true);
    expect(el.querySelector('.detail-muted')).not.toBeNull();
  });

  it('shows a controlled state for a study outside Mediogioco (wrong phase)', () => {
    const { cmp, el } = setup({
      getStudy: () => of({ ...classifiedStudy(), phase: 'OPENING', studyType: null }),
    });
    expect(cmp.gate().reason).toBe('WRONG_PHASE');
    expect(el.querySelector('section.study')).toBeNull();
    expect(el.textContent).toContain('non appartiene alla sezione Mediogioco');
  });

  it('shows a controlled state for an unclassified study', () => {
    const { cmp, el } = setup({ getStudy: () => of(classifiedStudy({ studyType: null })) });
    expect(cmp.gate().reason).toBe('UNCLASSIFIED_STUDY');
    expect(el.querySelector('section.study')).toBeNull();
    expect(el.textContent).toContain('Da classificare');
  });

  it('shows a not-found state and returns to the section when the study cannot be loaded', () => {
    const { cmp, el } = setup({ getStudy: () => throwError(() => new Error('404')) });
    expect(cmp.gate().reason).toBe('NOT_FOUND');
    const back = el.querySelector<HTMLAnchorElement>('.detail-error a');
    expect(back?.getAttribute('href')).toBe('/middlegame');
  });

  it('shows a controlled error and does not enter configuration when the attempts summary fails to load', () => {
    const { cmp, el } = setup({
      getStudy: () => of(classifiedStudy()),
      getAttemptsSummary: () => throwError(() => new Error('500')),
    });
    expect(cmp.loading()).toBe(false);
    expect(cmp.summariesError()).toBe(true);
    expect(el.querySelector('select')).toBeNull();
    expect(el.textContent).toContain('Impossibile caricare lo storico');
  });
});

describe('GuidedStudySequence configuration and snapshot (R26.3, task 6.1-6.4)', () => {
  it('shows independent order and filter selects and requires both before starting', () => {
    const study = classifiedStudy();
    const { cmp, el } = setup({
      getStudy: () => of(study),
      getAttemptsSummary: () => of(summariesFor(study.variants!)),
    });
    expect(el.textContent).toContain('Strutture di pedoni');
    expect(el.textContent).toContain('Tattica');
    const selects = el.querySelectorAll('select');
    expect(selects.length).toBe(2);

    cmp.startSequence();
    expect(cmp.phase()).toBe('CONFIG');
    expect(cmp.startError()).toContain('ordine e filtro');

    cmp.orderChoice.set('AUTHOR');
    cmp.startSequence();
    expect(cmp.phase()).toBe('CONFIG');
    expect(cmp.startError()).not.toBeNull();
  });

  it('builds an ALL snapshot excluding drafts and incomplete positions', () => {
    const variants = [
      variant({ id: 1, positionOrder: 1, eligibleForGuidedStudy: true }),
      variant({ id: 2, positionOrder: 2, eligibleForGuidedStudy: false }),
      variant({ id: 3, positionOrder: 3, eligibleForGuidedStudy: true }),
    ];
    const { cmp } = setup({
      getStudy: () => of(classifiedStudy({ variants })),
      getAttemptsSummary: () => of(summariesFor(variants)),
    });
    cmp.orderChoice.set('AUTHOR');
    cmp.filterChoice.set('ALL');
    cmp.startSequence();
    expect(cmp.snapshot().map((v: Variant) => v.id)).toEqual([1, 3]);
    expect(cmp.phase()).toBe('RUNNING');
  });

  it('orders positions by positionOrder ascending in author order regardless of input order', () => {
    const variants = [
      variant({ id: 3, positionOrder: 3 }),
      variant({ id: 1, positionOrder: 1 }),
      variant({ id: 2, positionOrder: 2 }),
    ];
    const { cmp } = setup({
      getStudy: () => of(classifiedStudy({ variants })),
      getAttemptsSummary: () => of(summariesFor(variants)),
    });
    cmp.orderChoice.set('AUTHOR');
    cmp.filterChoice.set('ALL');
    cmp.startSequence();
    expect(cmp.snapshot().map((v: Variant) => v.id)).toEqual([1, 2, 3]);
  });

  it('generates the random order once and keeps the snapshot stable when an attempt changes history', () => {
    const variants = [1, 2, 3, 4, 5].map((id) => variant({ id, positionOrder: id }));
    const recordAttempt = vi.fn(() =>
      of({ id: 100, variantId: 1, outcome: 'FAILED' as const, occurredAt: '2026-08-19T00:00:00Z' }),
    );
    const { cmp } = setup(
      {
        getStudy: () => of(classifiedStudy({ variants })),
        getAttemptsSummary: () => of(summariesFor(variants)),
      },
      { variantService: { recordAttempt } },
    );
    cmp.orderChoice.set('RANDOM');
    cmp.filterChoice.set('ALL');
    cmp.startSequence();
    const snapshotAfterStart = cmp.snapshot();
    expect(snapshotAfterStart.length).toBe(5);

    cmp.recordAttempt({ userMoves: ['Qh5'] }).subscribe();
    expect(recordAttempt).toHaveBeenCalledWith(snapshotAfterStart[0].id, { userMoves: ['Qh5'] });
    expect(cmp.snapshot()).toBe(snapshotAfterStart);
  });

  it('filters never-attempted positions, including one missing from the summary', () => {
    const variants = [1, 2, 3].map((id) => variant({ id, positionOrder: id }));
    const summaries = [
      summary({ variantId: 1, attemptCount: 0 }),
      summary({ variantId: 2, attemptCount: 2, lastOutcome: 'UNDERSTOOD' }),
    ];
    const { cmp } = setup({
      getStudy: () => of(classifiedStudy({ variants })),
      getAttemptsSummary: () => of(summaries),
    });
    cmp.orderChoice.set('AUTHOR');
    cmp.filterChoice.set('NEVER_ATTEMPTED');
    cmp.startSequence();
    expect(cmp.snapshot().map((v: Variant) => v.id)).toEqual([1, 3]);
  });

  it('filters positions to review (last outcome FAILED or NOT_UNDERSTOOD)', () => {
    const variants = [1, 2, 3].map((id) => variant({ id, positionOrder: id }));
    const summaries = [
      summary({ variantId: 1, attemptCount: 1, lastOutcome: 'FAILED' }),
      summary({ variantId: 2, attemptCount: 1, lastOutcome: 'NOT_UNDERSTOOD' }),
      summary({ variantId: 3, attemptCount: 1, lastOutcome: 'UNDERSTOOD' }),
    ];
    const { cmp } = setup({
      getStudy: () => of(classifiedStudy({ variants })),
      getAttemptsSummary: () => of(summaries),
    });
    cmp.orderChoice.set('AUTHOR');
    cmp.filterChoice.set('TO_REVIEW');
    cmp.startSequence();
    expect(cmp.snapshot().map((v: Variant) => v.id)).toEqual([1, 2]);
  });

  it('filters understood positions', () => {
    const variants = [1, 2, 3].map((id) => variant({ id, positionOrder: id }));
    const summaries = [
      summary({ variantId: 1, attemptCount: 1, lastOutcome: 'FAILED' }),
      summary({ variantId: 2, attemptCount: 1, lastOutcome: 'UNDERSTOOD' }),
      summary({ variantId: 3, attemptCount: 1, lastOutcome: 'UNDERSTOOD' }),
    ];
    const { cmp } = setup({
      getStudy: () => of(classifiedStudy({ variants })),
      getAttemptsSummary: () => of(summaries),
    });
    cmp.orderChoice.set('AUTHOR');
    cmp.filterChoice.set('UNDERSTOOD');
    cmp.startSequence();
    expect(cmp.snapshot().map((v: Variant) => v.id)).toEqual([2, 3]);
  });

  it('shows an empty state without creating a sequence when the filter has no matches', () => {
    const variants = [variant({ id: 1, positionOrder: 1 })];
    const { fixture, cmp, el } = setup({
      getStudy: () => of(classifiedStudy({ variants })),
      getAttemptsSummary: () => of([summary({ variantId: 1, attemptCount: 3, lastOutcome: 'UNDERSTOOD' })]),
    });
    cmp.orderChoice.set('AUTHOR');
    cmp.filterChoice.set('NEVER_ATTEMPTED');
    cmp.startSequence();
    fixture.detectChanges();
    expect(cmp.phase()).toBe('EMPTY');
    expect(cmp.snapshot()).toEqual([]);
    expect(el.textContent).toContain('Nessuna posizione trovata');
    expect(el.querySelector('app-guided-study-attempt')).toBeNull();

    cmp.backToConfig();
    expect(cmp.phase()).toBe('CONFIG');
  });

  it('always starts at the configuration screen on mount, regardless of a prior instance (reload / direct access)', () => {
    const study = classifiedStudy();
    const first = setup({
      getStudy: () => of(study),
      getAttemptsSummary: () => of(summariesFor(study.variants!)),
    });
    first.cmp.orderChoice.set('RANDOM');
    first.cmp.filterChoice.set('ALL');
    first.cmp.startSequence();
    expect(first.cmp.phase()).toBe('RUNNING');

    // Un nuovo mount (reload o accesso diretto) non eredita nulla dal precedente.
    const second = setup({
      getStudy: () => of(study),
      getAttemptsSummary: () => of(summariesFor(study.variants!)),
    });
    expect(second.cmp.phase()).toBe('CONFIG');
    expect(second.cmp.orderChoice()).toBe('');
    expect(second.cmp.filterChoice()).toBe('');
  });

  it('never reads or writes localStorage/sessionStorage while configuring and running the sequence', () => {
    const localSetSpy = vi.spyOn(Storage.prototype, 'setItem');
    const study = classifiedStudy();
    const { cmp } = setup(
      {
        getStudy: () => of(study),
        getAttemptsSummary: () => of(summariesFor(study.variants!)),
      },
      {
        variantService: {
          recordAttempt: () => of({ id: 1, variantId: 1, outcome: 'FAILED' as const, occurredAt: 'x' }),
        },
      },
    );
    cmp.orderChoice.set('AUTHOR');
    cmp.filterChoice.set('ALL');
    cmp.startSequence();
    cmp.recordAttempt({ userMoves: ['Qh5'] }).subscribe();

    expect(localSetSpy).not.toHaveBeenCalled();
    localSetSpy.mockRestore();
  });

  it('passes the first snapshot position to the reusable attempt container', () => {
    const variants = [
      variant({ id: 1, positionOrder: 1 }),
      variant({ id: 2, positionOrder: 2 }),
    ];
    const { fixture, cmp, el } = setup({
      getStudy: () => of(classifiedStudy({ variants })),
      getAttemptsSummary: () => of(summariesFor(variants)),
    });
    cmp.orderChoice.set('AUTHOR');
    cmp.filterChoice.set('ALL');
    cmp.startSequence();
    fixture.detectChanges();
    expect(el.querySelector('app-guided-study-attempt')).not.toBeNull();
    expect(cmp.currentVariant().id).toBe(1);
  });
});

describe('GuidedStudySequence navigation and summary (R26.3, task 7.1-7.7)', () => {
  it(
    'shows the position count, enables «Posizione successiva» only after a real outcome, ' +
      'and never advances automatically (task 7.1)',
    () => {
      const variants = [
        variant({ id: 1, positionOrder: 1, moves: ['e4'] }),
        variant({ id: 2, positionOrder: 2, moves: ['e4'] }),
      ];
      const recordAttempt = vi.fn(() => of(attemptResult({ variantId: 1, outcome: 'UNDERSTOOD' })));
      const { fixture, cmp, el } = setup(
        {
          getStudy: () => of(classifiedStudy({ variants })),
          getAttemptsSummary: () => of(summariesFor(variants)),
        },
        { variantService: { recordAttempt } },
      );
      cmp.orderChoice.set('AUTHOR');
      cmp.filterChoice.set('ALL');
      cmp.startSequence();
      fixture.detectChanges();
      expect(el.textContent).toContain('Posizione 1 di 2');
      expect(findButton(el, 'Salta posizione')).not.toBeNull();
      expect(findButton(el, 'Posizione successiva')).toBeNull();

      // Nessun avanzamento automatico prima di un esito: `next()` non fa nulla.
      cmp.next();
      expect(cmp.currentVariant().id).toBe(1);

      // Mossa reale corretta: il figlio invia `userMoves` e riceve l'esito dal backend vero (mock).
      playMove(fixture, el, 'e2', 'e4');
      expect(recordAttempt).toHaveBeenCalledWith(1, { userMoves: ['e4'] });
      expect(cmp.hasOutcomeForCurrent()).toBe(true);
      expect(findButton(el, 'Salta posizione')).toBeNull();
      expect(findButton(el, 'Posizione successiva')).not.toBeNull();
      // Ancora nessun avanzamento automatico: la posizione resta la stessa finché non si clicca.
      expect(cmp.currentVariant().id).toBe(1);
      expect(el.textContent).toContain('Posizione 1 di 2');

      cmp.next();
      fixture.detectChanges();
      expect(cmp.currentVariant().id).toBe(2);
      expect(el.textContent).toContain('Posizione 2 di 2');
      expect(findButton(el, 'Salta posizione')).not.toBeNull();
    },
  );

  it('skips without calling the attempts API or touching history, and without asking confirmation when no move was played (task 7.2/7.3)', async () => {
    const variants = [
      variant({ id: 1, positionOrder: 1 }),
      variant({ id: 2, positionOrder: 2 }),
    ];
    const recordAttempt = vi.fn();
    const getAttemptsSummary = vi.fn(() => of(summariesFor(variants)));
    const ask = vi.fn(() => Promise.resolve(true));
    const { fixture, cmp } = setup(
      { getStudy: () => of(classifiedStudy({ variants })), getAttemptsSummary },
      { variantService: { recordAttempt }, confirmService: { ask } },
    );
    cmp.orderChoice.set('AUTHOR');
    cmp.filterChoice.set('ALL');
    cmp.startSequence();
    fixture.detectChanges(); // monta il tentativo riusabile: `hasLocalMoves()` deve riflettere una board reale
    expect(getAttemptsSummary).toHaveBeenCalledTimes(1);
    expect(cmp.attempt()?.hasLocalMoves()).toBe(false);

    await cmp.skip();

    expect(ask).not.toHaveBeenCalled();
    expect(recordAttempt).not.toHaveBeenCalled();
    expect(getAttemptsSummary).toHaveBeenCalledTimes(1); // nessuna rilettura/modifica dello storico
    expect(cmp.currentVariant().id).toBe(2);
    expect(cmp.summary().noOutcome).toBe(1);
  });

  it('requires confirmation before skipping a position with local moves, and a cancel leaves everything untouched (task 7.3)', async () => {
    const variants = [
      variant({ id: 1, positionOrder: 1, moves: ['e4', 'e5'] }),
      variant({ id: 2, positionOrder: 2, moves: ['e4', 'e5'] }),
    ];
    const recordAttempt = vi.fn();
    const ask = vi.fn((_: ConfirmOptions) => Promise.resolve(false));
    const { fixture, cmp, el } = setup(
      {
        getStudy: () => of(classifiedStudy({ studyType: 'STRATEGIC', variants })),
        getAttemptsSummary: () => of(summariesFor(variants)),
      },
      { variantService: { recordAttempt }, confirmService: { ask } },
    );
    cmp.orderChoice.set('AUTHOR');
    cmp.filterChoice.set('ALL');
    cmp.startSequence();
    fixture.detectChanges();

    // Mossa legale che diverge dalla mainline strategica ("e4" atteso al ply 1): mosse locali senza alcun esito.
    playMove(fixture, el, 'd2', 'd4');
    expect(cmp.attempt()?.hasLocalMoves()).toBe(true);

    await cmp.skip();

    expect(ask).toHaveBeenCalledTimes(1);
    expect(ask.mock.calls[0][0].message).toContain('mosse');
    // Annullamento: nessuno stato toccato.
    expect(recordAttempt).not.toHaveBeenCalled();
    expect(cmp.currentVariant().id).toBe(1);
    expect(cmp.hasOutcomeForCurrent()).toBe(false);
    expect(cmp.summary().noOutcome).toBe(0);
    expect(cmp.attempt()?.hasLocalMoves()).toBe(true);
  });

  it('confirming the skip discards local moves, resets the engine, and starts the next position clean (task 7.3)', async () => {
    const variants = [
      variant({ id: 1, positionOrder: 1, moves: ['e4', 'e5'] }),
      variant({ id: 2, positionOrder: 2, moves: ['e4', 'e5'] }),
    ];
    const stop = vi.fn();
    const ask = vi.fn(() => Promise.resolve(true));
    const { fixture, cmp, el } = setup(
      {
        getStudy: () => of(classifiedStudy({ studyType: 'STRATEGIC', variants })),
        getAttemptsSummary: () => of(summariesFor(variants)),
      },
      {
        confirmService: { ask },
        engine: { available: (() => true) as any, requestBestMove: () => {}, stop },
      },
    );
    cmp.orderChoice.set('AUTHOR');
    cmp.filterChoice.set('ALL');
    cmp.startSequence();
    fixture.detectChanges();

    playMove(fixture, el, 'd2', 'd4'); // devia: mosse locali presenti
    expect(cmp.attempt()?.hasLocalMoves()).toBe(true);
    const stopCallsBeforeSkip = stop.mock.calls.length;

    await cmp.skip();
    fixture.detectChanges();

    expect(cmp.currentVariant().id).toBe(2);
    expect(cmp.summary().noOutcome).toBe(1);
    // Il figlio si è rimontato sulla nuova posizione: nessuna mossa locale residua.
    expect(cmp.attempt()?.hasLocalMoves()).toBe(false);
    // Il cambio di posizione ferma il motore/scarta lo stato locale (stesso percorso di reset del figlio).
    expect(stop.mock.calls.length).toBeGreaterThan(stopCallsBeforeSkip);
  });

  it('classifies a retried position by its last outcome without recounting the proposal (task 7.4)', () => {
    const variants = [variant({ id: 1, positionOrder: 1, moves: ['e4'] })];
    const { fixture, cmp } = setup({
      getStudy: () => of(classifiedStudy({ variants })),
      getAttemptsSummary: () => of(summariesFor(variants)),
    });
    cmp.orderChoice.set('AUTHOR');
    cmp.filterChoice.set('ALL');
    cmp.startSequence();
    fixture.detectChanges();
    expect(cmp.positionNumber()).toBe(1);

    cmp.onAttemptRecorded(attemptResult({ variantId: 1, outcome: 'FAILED' }));
    expect(cmp.summary().failed).toBe(1);
    expect(cmp.summary().understood).toBe(0);
    expect(cmp.positionNumber()).toBe(1); // nessuna nuova proposta per la riprova

    // Riprova nella stessa posizione (simulata: nuovo esito dal figlio riusato, stessa posizione corrente).
    cmp.onAttemptRecorded(attemptResult({ variantId: 1, outcome: 'UNDERSTOOD' }));
    expect(cmp.summary().failed).toBe(0);
    expect(cmp.summary().understood).toBe(1);
    expect(cmp.positionNumber()).toBe(1);

    cmp.next();
    expect(cmp.phase()).toBe('SUMMARY');
    expect(cmp.summary()).toEqual({
      proposed: 1,
      understood: 1,
      notUnderstood: 0,
      failed: 0,
      noOutcome: 0,
    });
  });

  it('shows a final summary with mutually exclusive categories summing to the proposed positions (task 7.5)', async () => {
    const variants = [1, 2, 3, 4, 5].map((id) => variant({ id, positionOrder: id }));
    const { fixture, cmp, el } = setup(
      {
        getStudy: () => of(classifiedStudy({ variants })),
        getAttemptsSummary: () => of(summariesFor(variants)),
      },
      { confirmService: { ask: () => Promise.resolve(true) } },
    );
    cmp.orderChoice.set('AUTHOR');
    cmp.filterChoice.set('ALL');
    cmp.startSequence();
    fixture.detectChanges();

    // Combinazione sintetica delle quattro categorie: verifica l'aggregazione
    // del riepilogo, non un vincolo reale di un singolo studyType (design R26.3).
    cmp.onAttemptRecorded(attemptResult({ variantId: 1, outcome: 'UNDERSTOOD' }));
    cmp.next();
    cmp.onAttemptRecorded(attemptResult({ variantId: 2, outcome: 'NOT_UNDERSTOOD' }));
    cmp.next();
    cmp.onAttemptRecorded(attemptResult({ variantId: 3, outcome: 'FAILED' }));
    cmp.next();
    await cmp.skip(); // posizione 4: senza esito
    cmp.onAttemptRecorded(attemptResult({ variantId: 5, outcome: 'UNDERSTOOD' }));
    cmp.next();
    fixture.detectChanges();

    expect(cmp.phase()).toBe('SUMMARY');
    const summary = cmp.summary();
    expect(summary).toEqual({
      proposed: 5,
      understood: 2,
      notUnderstood: 1,
      failed: 1,
      noOutcome: 1,
    });
    expect(summary.understood + summary.notUnderstood + summary.failed + summary.noOutcome).toBe(
      summary.proposed,
    );
    expect(el.textContent).toContain('Proposte: 5');
    expect(el.textContent).toContain('Comprese: 2');
    expect(el.textContent).toContain('Non comprese: 1');
    expect(el.textContent).toContain('Errate: 1');
    expect(el.textContent).toContain('Senza esito: 1');
    expect(el.querySelector('app-guided-study-attempt')).toBeNull();

    // «Nuova sequenza» riparte dalla configurazione senza portarsi dietro il riepilogo.
    cmp.backToConfig();
    expect(cmp.phase()).toBe('CONFIG');
    expect(cmp.summary().proposed).toBe(0);
  });

  it('leaves the sequence early without persisting a session, keeping only the events already saved (task 7.6)', () => {
    const variants = [
      variant({ id: 1, positionOrder: 1, moves: ['e4'] }),
      variant({ id: 2, positionOrder: 2, moves: ['e4'] }),
      variant({ id: 3, positionOrder: 3, moves: ['e4'] }),
    ];
    const recordAttempt = vi.fn(() => of(attemptResult({ variantId: 1, outcome: 'UNDERSTOOD' })));
    const getAttemptsSummary = vi.fn(() => of(summariesFor(variants)));
    const { fixture, cmp, el } = setup(
      { getStudy: () => of(classifiedStudy({ variants })), getAttemptsSummary },
      { variantService: { recordAttempt } },
    );
    cmp.orderChoice.set('AUTHOR');
    cmp.filterChoice.set('ALL');
    cmp.startSequence();
    fixture.detectChanges();

    // Un evento reale, confermato dal backend (mock), resta l'unico dato persistito.
    playMove(fixture, el, 'e2', 'e4');
    expect(recordAttempt).toHaveBeenCalledTimes(1);
    cmp.next();
    fixture.detectChanges();
    expect(cmp.currentVariant().id).toBe(2);

    const exitLink = el.querySelector<HTMLAnchorElement>('.back-link');
    expect(exitLink?.textContent).toContain('Torna allo studio');
    expect(exitLink?.getAttribute('href')).toBe('/middlegame/studies/6');

    // Uscita anticipata (navigazione via router, qui simulata con la distruzione
    // del fixture): nessuna chiamata aggiuntiva, nessun riepilogo dichiarato
    // concluso, l'evento già registrato resta l'unico dato persistito.
    expect(() => fixture.destroy()).not.toThrow();
    expect(recordAttempt).toHaveBeenCalledTimes(1);
    expect(getAttemptsSummary).toHaveBeenCalledTimes(1);
  });
});

function findButton(el: HTMLElement, label: string): HTMLButtonElement | null {
  return (
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === label,
    ) ?? null
  );
}

// --- Gruppo 8: accessibilità, layout e ordine DOM ----------------------------

function progressRegion(el: HTMLElement): HTMLElement {
  return el.querySelector<HTMLElement>('.sequence-progress')!;
}

/** Avvia una sequenza `AUTHOR`/`ALL` sulle posizioni date. */
function running(variants: Variant[], options: SetupOptions = {}) {
  const s = setup(
    {
      getStudy: () => of(classifiedStudy({ variants })),
      getAttemptsSummary: () => of(summariesFor(variants)),
    },
    options,
  );
  s.cmp.orderChoice.set('AUTHOR');
  s.cmp.filterChoice.set('ALL');
  s.cmp.startSequence();
  s.fixture.detectChanges();
  return s;
}

describe('GuidedStudySequence — regione live e focus (R26.3, task 8.1)', () => {
  it('keeps the progress live region in the DOM from the configuration screen on', () => {
    const variants = [variant({ id: 1, positionOrder: 1 }), variant({ id: 2, positionOrder: 2 })];
    const { fixture, cmp, el } = setup({
      getStudy: () => of(classifiedStudy({ variants })),
      getAttemptsSummary: () => of(summariesFor(variants)),
    });

    const region = progressRegion(el);
    expect(region.getAttribute('role')).toBe('status');
    expect(region.getAttribute('aria-live')).toBe('polite');
    // Vuota in configurazione: presente per l'annuncio, invisibile nel layout.
    expect(region.textContent?.trim()).toBe('');
    expect(region.classList.contains('sequence-progress--empty')).toBe(true);

    cmp.orderChoice.set('AUTHOR');
    cmp.filterChoice.set('ALL');
    cmp.startSequence();
    fixture.detectChanges();

    // Stesso nodo: cambia solo il testo, così l'annuncio parte davvero.
    expect(progressRegion(el)).toBe(region);
    expect(region.textContent?.trim()).toBe('Posizione 1 di 2');
  });

  it('moves the focus to the progress region when the sequence starts and when it advances', async () => {
    const variants = [variant({ id: 1, positionOrder: 1 }), variant({ id: 2, positionOrder: 2 })];
    const { fixture, cmp, el } = running(variants);

    expect(document.activeElement).toBe(progressRegion(el));
    expect(progressRegion(el).getAttribute('tabindex')).toBe('-1');

    await cmp.skip();
    fixture.detectChanges();

    // «Salta posizione» viene sostituito dall'altro ramo: senza spostamento il
    // focus resterebbe orfano sul body.
    expect(document.activeElement).toBe(progressRegion(el));
    expect(progressRegion(el).textContent?.trim()).toBe('Posizione 2 di 2');
  });

  it('moves the focus to the summary title when the last position closes the sequence', async () => {
    const variants = [variant({ id: 1, positionOrder: 1 })];
    const { fixture, cmp, el } = running(variants);

    await cmp.skip();
    fixture.detectChanges();

    expect(cmp.phase()).toBe('SUMMARY');
    const title = el.querySelector<HTMLElement>('.sequence-summary-title')!;
    expect(title.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(title);
    // Il riepilogo non annuncia due volte: il titolo focalizzato basta.
    expect(progressRegion(el).textContent?.trim()).toBe('');
  });

  it('moves the focus to the empty state when the filter matches nothing', () => {
    const variants = [variant({ id: 1, positionOrder: 1 })];
    const { fixture, cmp, el } = setup({
      getStudy: () => of(classifiedStudy({ variants })),
      getAttemptsSummary: () =>
        of([summary({ variantId: 1, attemptCount: 3, lastOutcome: 'UNDERSTOOD' })]),
    });
    cmp.orderChoice.set('AUTHOR');
    cmp.filterChoice.set('NEVER_ATTEMPTED');
    cmp.startSequence();
    fixture.detectChanges();

    expect(cmp.phase()).toBe('EMPTY');
    const empty = el.querySelector<HTMLElement>('.sequence-empty')!;
    expect(empty.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(empty);
  });

  it('moves the focus back to the configuration form when a new sequence is requested', async () => {
    const variants = [variant({ id: 1, positionOrder: 1 })];
    const { fixture, cmp, el } = running(variants);
    await cmp.skip();
    fixture.detectChanges();

    cmp.backToConfig();
    fixture.detectChanges();

    const form = el.querySelector<HTMLElement>('.sequence-config')!;
    expect(form.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(form);
  });
});

describe('GuidedStudySequence — layout, ordine DOM e contenuto nascosto (R26.3, task 8.2/8.3)', () => {
  it('mounts the attempt outside the narrow study column, in the positional container', () => {
    const variants = [variant({ id: 1, positionOrder: 1 })];
    const { el } = running(variants);

    const attempt = el.querySelector('app-guided-study-attempt')!;
    // Fuori da `.study` (max 720 px): board e pannello usano il contenitore
    // posizionale largo dell'host, identico alla modalità manuale.
    expect(el.querySelector('.study app-guided-study-attempt')).toBeNull();
    expect(attempt.querySelector(':scope > .board-col')).not.toBeNull();
    expect(attempt.querySelector(':scope > .side')).not.toBeNull();
  });

  it('keeps the reading order: heading, progress, attempt, sequence commands, exit', () => {
    const variants = [variant({ id: 1, positionOrder: 1 })];
    const { el } = running(variants);

    const order = Array.from(
      el.querySelectorAll(
        '.study-head, .sequence-progress, app-guided-study-attempt, .sequence-nav, .sequence-exit',
      ),
    ).map((node) => node.className.split(' ')[0] || node.tagName.toLowerCase());
    expect(order).toEqual([
      'study-head',
      'sequence-progress',
      'app-guided-study-attempt',
      'sequence-nav',
      'sequence-exit',
    ]);
  });

  it('exposes no board or solution control while configuring the sequence', () => {
    const variants = [variant({ id: 1, positionOrder: 1 })];
    const { el } = setup({
      getStudy: () => of(classifiedStudy({ variants })),
      getAttemptsSummary: () => of(summariesFor(variants)),
    });

    expect(el.querySelector('app-guided-study-attempt')).toBeNull();
    expect(el.querySelector('app-chessboard')).toBeNull();
    expect(el.querySelectorAll('.move').length).toBe(0);
    expect(el.querySelectorAll('.ctrl').length).toBe(0);
    // Solo i controlli della configurazione sono raggiungibili con il tab.
    const tabbable = Array.from(
      el.querySelectorAll<HTMLElement>('a[href], button, select, [tabindex]'),
    ).filter((node) => (node.getAttribute('tabindex') ?? '0') !== '-1');
    expect(tabbable.map((node) => node.tagName.toLowerCase())).toEqual([
      'a',
      'a',
      'select',
      'select',
      'button',
      'a',
    ]);
  });

  it('keeps the exit link reachable in every phase without ending the sequence', async () => {
    const variants = [variant({ id: 1, positionOrder: 1 })];
    const { fixture, cmp, el } = running(variants);
    expect(el.querySelector('.sequence-exit a')?.getAttribute('href')).toBe('/middlegame/studies/6');

    await cmp.skip();
    fixture.detectChanges();

    expect(cmp.phase()).toBe('SUMMARY');
    expect(el.querySelector('.sequence-exit a')?.getAttribute('href')).toBe('/middlegame/studies/6');
  });
});
