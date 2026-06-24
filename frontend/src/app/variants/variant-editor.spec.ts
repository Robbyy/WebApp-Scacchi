import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { VariantEditor } from './variant-editor';
import { VariantService } from '../core/variant.service';
import { CreateVariantRequest, Variant } from '../core/variant.model';
import { MoveMade } from '../chessboard/chessboard';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function move(san: string): MoveMade {
  return { san, from: '', to: '', fen: '' };
}

function setup(service: Partial<VariantService>, routeId?: number) {
  TestBed.configureTestingModule({
    imports: [VariantEditor],
    providers: [
      provideRouter([]),
      { provide: VariantService, useValue: service },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { paramMap: convertToParamMap(routeId ? { id: String(routeId) } : {}) },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(VariantEditor);
  fixture.detectChanges();
  return { fixture, cmp: fixture.componentInstance as any };
}

describe('VariantEditor', () => {
  it('accumulates played moves', () => {
    const { cmp } = setup({});
    cmp.onMove(move('e4'));
    cmp.onMove(move('e5'));
    cmp.onMove(move('Nf3'));
    expect(cmp.moves()).toEqual(['e4', 'e5', 'Nf3']);
    expect(cmp.turn()).toBe('b');
  });

  it('undoes the last move', () => {
    const { cmp } = setup({});
    cmp.onMove(move('e4'));
    cmp.onMove(move('e5'));
    cmp.undo();
    expect(cmp.moves()).toEqual(['e4']);
  });

  it('resets the board and the moves', () => {
    const { cmp } = setup({});
    cmp.onMove(move('e4'));
    cmp.onMove(move('e5'));
    cmp.reset();
    expect(cmp.moves()).toEqual([]);
    expect(cmp.turn()).toBe('w');
  });

  it('orients the board for the selected side', () => {
    const { cmp } = setup({});
    expect(cmp.orientation()).toBe('white');
    cmp.color.set('BLACK');
    expect(cmp.orientation()).toBe('black');
  });

  it('refuses to save without a name', () => {
    let called = false;
    const { cmp } = setup({ createVariant: () => { called = true; return of({} as Variant); } });
    cmp.onMove(move('e4'));
    cmp.name.set('  ');
    cmp.save();
    expect(called).toBe(false);
    expect(cmp.error()).toBeTruthy();
  });

  it('refuses to save without moves', () => {
    let called = false;
    const { cmp } = setup({ createVariant: () => { called = true; return of({} as Variant); } });
    cmp.name.set('Vuota');
    cmp.save();
    expect(called).toBe(false);
    expect(cmp.error()).toBeTruthy();
  });

  it('creates a valid variant and navigates to it', () => {
    const created: Variant = { id: 7, name: 'Italiana base', color: 'WHITE', moves: ['e4', 'e5'], startingFen: '' };
    let captured: CreateVariantRequest | null = null;
    const { cmp } = setup({
      createVariant: (req: CreateVariantRequest) => {
        captured = req;
        return of(created);
      },
    });
    const router = TestBed.inject(Router);
    let navTarget: unknown[] | null = null;
    router.navigate = ((commands: unknown[]) => {
      navTarget = commands;
      return Promise.resolve(true);
    }) as typeof router.navigate;

    cmp.onMove(move('e4'));
    cmp.onMove(move('e5'));
    cmp.name.set('Italiana base');
    cmp.save();

    expect(captured).toEqual({ name: 'Italiana base', color: 'WHITE', moves: ['e4', 'e5'] });
    expect(navTarget).toEqual(['/variants', 7]);
    expect(cmp.isEdit()).toBe(false);
  });

  it('loads an existing variant in edit mode and updates it', () => {
    const existing: Variant = {
      id: 5,
      name: 'Italiana',
      color: 'WHITE',
      moves: ['e4', 'e5', 'Nf3'],
      startingFen: START,
    };
    let updateId: number | null = null;
    let captured: CreateVariantRequest | null = null;
    const { cmp } = setup(
      {
        getVariant: () => of(existing),
        updateVariant: (id: number, req: CreateVariantRequest) => {
          updateId = id;
          captured = req;
          return of({ ...existing, name: 'Italiana mod' });
        },
      },
      5,
    );
    const router = TestBed.inject(Router);
    router.navigate = (() => Promise.resolve(true)) as typeof router.navigate;

    expect(cmp.isEdit()).toBe(true);
    expect(cmp.moves()).toEqual(['e4', 'e5', 'Nf3']);
    expect(cmp.name()).toBe('Italiana');

    cmp.name.set('Italiana mod');
    cmp.save();

    expect(updateId).toBe(5);
    expect(captured).toEqual({ name: 'Italiana mod', color: 'WHITE', moves: ['e4', 'e5', 'Nf3'] });
  });
});
