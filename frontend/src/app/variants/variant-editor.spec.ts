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
  it('plays moves building the mainline', () => {
    const { cmp } = setup({});
    cmp.onMove(move('e4'));
    cmp.onMove(move('e5'));
    cmp.onMove(move('Nf3'));
    expect(cmp.currentPath()).toEqual([0, 0, 0]);
    expect(cmp.tree()[0].san).toBe('e4');
    expect(cmp.tree()[0].children[0].san).toBe('e5');
    expect(cmp.tree()[0].children[0].children[0].san).toBe('Nf3');
  });

  it('creates a variation when playing a different move at a position', () => {
    const { cmp } = setup({});
    cmp.onMove(move('e4'));
    cmp.onMove(move('e5'));
    cmp.goTo([0]); // dopo e4
    cmp.onMove(move('c5'));
    expect(cmp.tree()[0].children.length).toBe(2);
    expect(cmp.tree()[0].children[1].san).toBe('c5');
    expect(cmp.currentPath()).toEqual([0, 1]);
  });

  it('follows an existing child instead of duplicating it', () => {
    const { cmp } = setup({});
    cmp.onMove(move('e4'));
    cmp.onMove(move('e5'));
    cmp.first();
    cmp.onMove(move('e4'));
    expect(cmp.tree().length).toBe(1);
    expect(cmp.currentPath()).toEqual([0]);
  });

  it('deletes a leaf node without confirmation', () => {
    const { cmp } = setup({});
    cmp.onMove(move('e4'));
    cmp.onMove(move('e5'));
    cmp.deleteCurrent();
    expect(cmp.confirmingDelete()).toBe(false);
    expect(cmp.tree()[0].children.length).toBe(0);
    expect(cmp.currentPath()).toEqual([0]);
  });

  it('asks confirmation before deleting a subtree, then deletes on confirm', () => {
    const { cmp } = setup({});
    cmp.onMove(move('e4'));
    cmp.onMove(move('e5'));
    cmp.onMove(move('Nf3'));
    cmp.goTo([0]); // su e4, che ha un sottoalbero
    cmp.deleteCurrent();
    expect(cmp.confirmingDelete()).toBe(true);
    expect(cmp.tree().length).toBe(1); // non ancora cancellato
    cmp.confirmDelete();
    expect(cmp.confirmingDelete()).toBe(false);
    expect(cmp.tree().length).toBe(0);
  });

  it('cancels a pending subtree deletion', () => {
    const { cmp } = setup({});
    cmp.onMove(move('e4'));
    cmp.onMove(move('e5'));
    cmp.goTo([0]);
    cmp.deleteCurrent();
    expect(cmp.confirmingDelete()).toBe(true);
    cmp.cancelDelete();
    expect(cmp.confirmingDelete()).toBe(false);
    expect(cmp.tree()[0].children.length).toBe(1); // intatto
  });

  it('promotes a variation to mainline', () => {
    const { cmp } = setup({});
    cmp.onMove(move('e4'));
    cmp.onMove(move('e5'));
    cmp.goTo([0]); // dopo e4
    cmp.onMove(move('c5')); // variante, path [0,1]
    expect(cmp.onMainline()).toBe(false);
    cmp.makeMainline();
    expect(cmp.tree()[0].children[0].san).toBe('c5');
    expect(cmp.tree()[0].children[1].san).toBe('e5');
    expect(cmp.currentPath()).toEqual([0, 0]);
    expect(cmp.onMainline()).toBe(true);
  });

  it('resets the tree', () => {
    const { cmp } = setup({});
    cmp.onMove(move('e4'));
    cmp.reset();
    expect(cmp.tree()).toEqual([]);
    expect(cmp.currentPath()).toEqual([]);
  });

  it('orients the board for the selected side', () => {
    const { cmp } = setup({});
    expect(cmp.orientation()).toBe('white');
    cmp.color.set('BLACK');
    expect(cmp.orientation()).toBe('black');
  });

  it('refuses to save without a name or without moves', () => {
    let called = false;
    const { cmp } = setup({ createVariant: () => { called = true; return of({} as Variant); } });
    cmp.save(); // niente nome né mosse
    expect(called).toBe(false);
    cmp.name.set('X');
    cmp.save(); // nome ma niente mosse
    expect(called).toBe(false);
    expect(cmp.error()).toBeTruthy();
  });

  it('creates a variant sending tree and mainline, then navigates', () => {
    const created: Variant = { id: 7, name: 'Italiana', color: 'WHITE', moves: ['e4', 'e5'], startingFen: '' };
    let captured: CreateVariantRequest | null = null;
    const { cmp } = setup({
      createVariant: (req: CreateVariantRequest) => {
        captured = req;
        return of(created);
      },
    });
    const router = TestBed.inject(Router);
    let navTarget: unknown[] | null = null;
    router.navigate = ((c: unknown[]) => { navTarget = c; return Promise.resolve(true); }) as typeof router.navigate;

    cmp.onMove(move('e4'));
    cmp.onMove(move('e5'));
    cmp.name.set('Italiana');
    cmp.save();

    expect(captured!.name).toBe('Italiana');
    expect(captured!.moves).toEqual(['e4', 'e5']);
    expect(captured!.tree?.[0].san).toBe('e4');
    expect(navTarget).toEqual(['/variants', 7]);
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
    const { cmp } = setup(
      {
        getVariant: () => of(existing),
        updateVariant: (id: number) => {
          updateId = id;
          return of({ ...existing, name: 'Italiana mod' });
        },
      },
      5,
    );
    const router = TestBed.inject(Router);
    router.navigate = (() => Promise.resolve(true)) as typeof router.navigate;

    expect(cmp.isEdit()).toBe(true);
    expect(cmp.tree()[0].san).toBe('e4');

    cmp.name.set('Italiana mod');
    cmp.save();
    expect(updateId).toBe(5);
  });
});
