import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { VariantDetail } from './variant-detail';
import { VariantService } from '../core/variant.service';
import { Variant } from '../core/variant.model';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const baseVariant: Variant = {
  id: 1,
  name: 'Test',
  color: 'WHITE',
  moves: ['e4', 'e5', 'Nf3', 'Nc6'],
  startingFen: START,
};

function setup(v: Variant = baseVariant) {
  TestBed.configureTestingModule({
    imports: [VariantDetail],
    providers: [
      provideRouter([]),
      { provide: VariantService, useValue: { getVariant: () => of(v) } },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } } },
    ],
  });
  const fixture = TestBed.createComponent(VariantDetail);
  fixture.detectChanges();
  // accesso ai membri protetti per il test
  return { fixture, cmp: fixture.componentInstance as any };
}

describe('VariantDetail', () => {
  it('builds a FEN history with N+1 positions', () => {
    const { cmp } = setup();
    expect(cmp.totalMoves()).toBe(4);
    expect(cmp.fenHistory().length).toBe(5);
  });

  it('navigates forward, to the end, back and to the start', () => {
    const { cmp } = setup();
    expect(cmp.index()).toBe(0);
    cmp.next();
    expect(cmp.index()).toBe(1);
    cmp.last();
    expect(cmp.index()).toBe(4);
    cmp.prev();
    expect(cmp.index()).toBe(3);
    cmp.first();
    expect(cmp.index()).toBe(0);
  });

  it('does not navigate before the start or past the end', () => {
    const { cmp } = setup();
    cmp.prev();
    expect(cmp.index()).toBe(0);
    cmp.last();
    cmp.next();
    expect(cmp.index()).toBe(4);
  });

  it('orients the board for the black side', () => {
    const { cmp } = setup({ ...baseVariant, color: 'BLACK' });
    expect(cmp.orientation()).toBe('black');
  });
});
