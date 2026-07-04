import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { VariantDetail } from './variant-detail';
import { VariantService } from '../core/variant.service';
import { ReviewService } from '../core/review.service';
import { StudyService } from '../core/study.service';
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

function setup(v: Variant, studyService: Partial<StudyService> = {}) {
  TestBed.configureTestingModule({
    imports: [VariantDetail],
    providers: [
      provideRouter([]),
      { provide: VariantService, useValue: { getVariant: () => of(v) } },
      { provide: ReviewService, useValue: { getForVariant: () => of(null) } },
      { provide: StudyService, useValue: studyService },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: String(v.id) }) } } },
    ],
  });
  const fixture = TestBed.createComponent(VariantDetail);
  fixture.detectChanges();
  return { fixture, cmp: fixture.componentInstance as any };
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
});
