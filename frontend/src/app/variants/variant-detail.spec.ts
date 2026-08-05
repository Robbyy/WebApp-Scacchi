import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { VariantDetail } from './variant-detail';
import { VariantService } from '../core/variant.service';
import { ReviewService } from '../core/review.service';
import { StockfishService } from '../core/stockfish.service';
import { StudyService } from '../core/study.service';
import { UciScore } from '../core/uci';
import { Variant } from '../core/variant.model';
import { Study } from '../core/study.model';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const linear: Variant = {
  id: 1,
  name: 'Lineare',
  color: 'WHITE',
  moves: ['e4', 'e5', 'Nf3', 'Nc6'],
  startingFen: START,
};

const branched: Variant = {
  id: 2,
  name: 'Con varianti',
  color: 'WHITE',
  moves: ['e4', 'e5'],
  startingFen: START,
  tree: [
    {
      san: 'e4',
      children: [
        { san: 'e5', children: [] },
        { san: 'c5', children: [{ san: 'Nf3', children: [] }] },
      ],
    },
  ],
};

/**
 * Doppio del motore: niente Web Worker nei test, segnali pilotabili a mano.
 * `analyse`/`stop` replicano il contratto reale di `StockfishService` — entrambi
 * svuotano valutazione e linea, così la UI non può mostrare dati di un'analisi
 * precedente.
 */
function fakeEngine() {
  return {
    available: signal(true),
    evaluation: signal<UciScore | null>(null),
    bestLine: signal<string[]>([]),
    thinking: signal(false),
    analysed: [] as string[],
    stopped: 0,
    analyse(fen: string) {
      this.analysed.push(fen);
      this.evaluation.set(null);
      this.bestLine.set([]);
      this.thinking.set(true);
    },
    stop() {
      this.stopped++;
      this.evaluation.set(null);
      this.bestLine.set([]);
      this.thinking.set(false);
    },
    dispose() {},
  };
}

function setup(
  v: Variant,
  studyService: Partial<StudyService> = {},
  engine = fakeEngine(),
) {
  TestBed.configureTestingModule({
    imports: [VariantDetail],
    providers: [
      provideRouter([]),
      { provide: VariantService, useValue: { getVariant: () => of(v) } },
      { provide: ReviewService, useValue: { getForVariant: () => of(null) } },
      { provide: StockfishService, useValue: engine },
      { provide: StudyService, useValue: studyService },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: String(v.id) }) } } },
    ],
  });
  const fixture = TestBed.createComponent(VariantDetail);
  fixture.detectChanges();
  return { fixture, cmp: fixture.componentInstance as any, engine };
}

describe('VariantDetail', () => {
  it('derives a linear tree from moves and lists the mainline', () => {
    const { cmp } = setup(linear);
    expect(cmp.mainlineLength()).toBe(4);
    const moves = cmp.tokens().filter((t: any) => t.kind === 'move').map((t: any) => t.san);
    expect(moves).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
  });

  it('navigates forward, to the end, back and to the start', () => {
    const { cmp } = setup(linear);
    expect(cmp.currentPath()).toEqual([]);
    cmp.next();
    expect(cmp.currentPath()).toEqual([0]);
    cmp.last();
    expect(cmp.currentPath()).toEqual([0, 0, 0, 0]);
    cmp.prev();
    expect(cmp.currentPath()).toEqual([0, 0, 0]);
    cmp.first();
    expect(cmp.currentPath()).toEqual([]);
  });

  it('renders variation tokens (parentheses) for a branched tree', () => {
    const { cmp } = setup(branched);
    const kinds = cmp.tokens().map((t: any) => t.kind);
    expect(kinds).toContain('open');
    expect(kinds).toContain('close');
    const variationMove = cmp.tokens().find((t: any) => t.kind === 'move' && t.variation);
    expect(variationMove.san).toBe('c5');
  });

  it('jumps to a variation node and updates the position', () => {
    const { cmp } = setup(branched);
    cmp.goTo([0, 1]); // 1.e4 c5
    expect(cmp.currentPath()).toEqual([0, 1]);
    expect(cmp.currentFen().split(' ')[1]).toBe('w'); // due semimosse: muove il bianco
  });

  it('orients the board for the black side', () => {
    const { cmp } = setup({ ...linear, color: 'BLACK' });
    expect(cmp.orientation()).toBe('black');
  });

  it('shows training/review/stats for a legacy variant without a study (ISSUE-016)', () => {
    const { cmp } = setup(linear);
    expect(cmp.isOpening()).toBe(true);
  });

  it('shows training/review/stats for a variant in an opening study', () => {
    const study: Study = { id: 5, name: 'Repertorio', phase: 'OPENING', variantCount: 1 };
    const { cmp } = setup(
      { ...linear, studyId: 5 },
      { getStudy: () => of(study) },
    );
    expect(cmp.isOpening()).toBe(true);
  });

  it('hides training/review/stats for a position in a middlegame study', () => {
    const study: Study = { id: 6, name: 'Mediogioco', phase: 'MIDDLEGAME', variantCount: 1 };
    const { cmp } = setup(
      { ...linear, studyId: 6 },
      { getStudy: () => of(study) },
    );
    expect(cmp.isOpening()).toBe(false);
  });

  // ISSUE-007: il toggle del motore governa da solo anche la barra.
  it('has no separate show/hide button for the evaluation bar', () => {
    const { fixture, cmp } = setup(linear);
    cmp.toggleEngine();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const labels = Array.from(el.querySelectorAll('.engine-bar button')).map((b) =>
      b.textContent?.trim(),
    );
    expect(labels.some((t) => t?.includes('barra'))).toBe(false);
    expect(cmp.showEvalBar).toBeUndefined();
  });

  it('shows the evaluation bar with the engine on and removes it when off', () => {
    const { fixture, cmp } = setup(linear);
    expect(fixture.nativeElement.querySelector('app-eval-bar')).toBeNull();
    cmp.toggleEngine();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-eval-bar')).not.toBeNull();
    cmp.toggleEngine();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-eval-bar')).toBeNull();
  });
});

// ISSUE-022: la linea migliore vive nel pannello laterale, in SAN.
describe('VariantDetail — linea migliore del motore', () => {
  /** Accende il motore e lascia partire la prima analisi (che azzera la linea). */
  function withEngineOn(v: Variant = linear) {
    const s = setup(v);
    s.cmp.toggleEngine();
    s.fixture.detectChanges();
    return s;
  }

  /** Il motore emette una PV per la posizione in analisi. */
  function emit(s: ReturnType<typeof setup>, sans: string[]) {
    s.engine.bestLine.set(sans);
    s.fixture.detectChanges();
  }

  it('renders no engine line while the engine is off', () => {
    const s = setup(linear);
    emit(s, ['e4', 'e5']);
    expect(s.fixture.nativeElement.querySelector('.engine-line')).toBeNull();
  });

  it('shows "Analisi in corso…" until the first PV arrives', () => {
    const { fixture } = withEngineOn();
    const panel: HTMLElement = fixture.nativeElement.querySelector('.engine-line');
    expect(panel.textContent).toContain('Linea migliore');
    expect(panel.querySelector('.engine-line__pending')?.textContent).toContain('Analisi in corso');
    expect(panel.querySelector('.engine-line__moves')).toBeNull();
  });

  it('renders the PV in SAN, numbered from the analysed position', () => {
    const s = withEngineOn();
    emit(s, ['e4', 'e5', 'Nf3', 'Nc6']);
    const moves: HTMLElement = s.fixture.nativeElement.querySelector('.engine-line__moves');
    expect(moves.textContent?.trim()).toBe('1. e4 e5 2. Nf3 Nc6');
    expect(moves.textContent).not.toContain('e2e4');
  });

  it('numbers from the current half move when Black is to move', () => {
    const s = withEngineOn();
    s.cmp.next(); // 1.e4 → tocca al Nero
    s.fixture.detectChanges();
    emit(s, ['e5', 'Nf3']);
    const moves: HTMLElement = s.fixture.nativeElement.querySelector('.engine-line__moves');
    expect(moves.textContent?.trim()).toBe('1… e5 2. Nf3');
  });

  it('drops the previous line when the analysed position changes', () => {
    const s = withEngineOn();
    emit(s, ['e4', 'e5']);
    expect(s.fixture.nativeElement.querySelector('.engine-line__moves')).not.toBeNull();
    s.cmp.next(); // nuova posizione: l'effetto rilancia l'analisi e azzera la linea
    s.fixture.detectChanges();
    expect(s.engine.analysed.length).toBe(2);
    expect(s.fixture.nativeElement.querySelector('.engine-line__moves')).toBeNull();
    expect(s.fixture.nativeElement.querySelector('.engine-line__pending')).not.toBeNull();
  });

  it('hides the line together with the evaluation when the engine is switched off', () => {
    const s = withEngineOn();
    emit(s, ['e4', 'e5']);
    s.cmp.toggleEngine();
    s.fixture.detectChanges();
    expect(s.fixture.nativeElement.querySelector('.engine-line')).toBeNull();
    expect(s.fixture.nativeElement.querySelector('app-eval-bar')).toBeNull();
  });

  it('empties the engine state when switching off, not just the markup', () => {
    const s = withEngineOn();
    emit(s, ['e4', 'e5']);
    s.cmp.toggleEngine();
    s.fixture.detectChanges();
    expect(s.engine.stopped).toBe(1);
    expect(s.engine.bestLine()).toEqual([]);
    expect(s.engine.evaluation()).toBeNull();
    expect(s.engine.thinking()).toBe(false);
  });

  it('restarts from the pending state, never from the previous line', () => {
    const s = withEngineOn();
    emit(s, ['e4', 'e5', 'Nf3']);
    s.cmp.toggleEngine(); // spegne
    s.fixture.detectChanges();
    s.cmp.toggleEngine(); // riaccende: l'effetto rilancia l'analisi
    s.fixture.detectChanges();

    expect(s.engine.analysed.length).toBe(2);
    expect(s.fixture.nativeElement.querySelector('.engine-line__moves')).toBeNull();
    expect(s.fixture.nativeElement.querySelector('.engine-line__pending')).not.toBeNull();

    emit(s, ['d4', 'd5']); // solo i dati della nuova analisi
    const moves: HTMLElement = s.fixture.nativeElement.querySelector('.engine-line__moves');
    expect(moves.textContent?.trim()).toBe('1. d4 d5');
  });

  it('keeps the line inside the side panel, with nothing added under the board', () => {
    const s = withEngineOn();
    emit(s, ['e4', 'e5']);
    const el: HTMLElement = s.fixture.nativeElement;
    expect(el.querySelector('.side .engine-panel .engine-line')).not.toBeNull();
    expect(el.querySelector('.board-col .engine-line')).toBeNull();
  });
});
