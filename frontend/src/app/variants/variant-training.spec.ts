import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { VariantTraining } from './variant-training';
import { VariantService } from '../core/variant.service';
import { MoveNode, Variant } from '../core/variant.model';
import { MoveMade } from '../chessboard/chessboard';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function variant(partial: Partial<Variant>): Variant {
  return { id: 1, name: 'T', color: 'WHITE', moves: [], startingFen: START, ...partial };
}

function move(san: string): MoveMade {
  return { san, from: '', to: '', fen: '' };
}

function setup(v: Variant) {
  TestBed.configureTestingModule({
    imports: [VariantTraining],
    providers: [
      provideRouter([]),
      { provide: VariantService, useValue: { getVariant: () => of(v) } },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } } },
    ],
  });
  const fixture = TestBed.createComponent(VariantTraining);
  const cmp = fixture.componentInstance as any;
  cmp.replyDelayMs = 1_000_000; // il timer non scatta durante il test
  fixture.detectChanges();
  return { fixture, cmp };
}

describe('VariantTraining (albero)', () => {
  it('starts awaiting the user for a white variant', () => {
    const { cmp } = setup(variant({ moves: ['e4', 'e5', 'Nf3', 'Nc6'] }));
    expect(cmp.userColor()).toBe('w');
    expect(cmp.status()).toBe('playing');
    expect(cmp.ply()).toBe(0);
  });

  it('accepts the correct move and the opponent replies', () => {
    const { cmp } = setup(variant({ moves: ['e4', 'e5', 'Nf3', 'Nc6'] }));
    cmp.onUserMove(move('e4'));
    expect(cmp.ply()).toBe(1);
    expect(cmp.status()).toBe('opponent');
    cmp.applyOpponentReply();
    expect(cmp.ply()).toBe(2);
    expect(cmp.status()).toBe('playing');
  });

  it('rejects a wrong move without advancing', () => {
    const { cmp } = setup(variant({ moves: ['e4', 'e5'] }));
    cmp.onUserMove(move('d4'));
    expect(cmp.status()).toBe('wrong');
    expect(cmp.mistakes()).toBe(1);
    expect(cmp.ply()).toBe(0);
  });

  it('auto-plays the first opponent move for a black variant', () => {
    const { cmp } = setup(variant({ color: 'BLACK', moves: ['e4', 'c5', 'Nf3', 'd6'] }));
    expect(cmp.userColor()).toBe('b');
    expect(cmp.orientation()).toBe('black');
    expect(cmp.ply()).toBe(1);
    expect(cmp.status()).toBe('playing');
  });

  it('accepts any of the acceptable moves at a user branch', () => {
    const tree: MoveNode[] = [
      { san: 'e4', children: [{ san: 'e5', children: [] }] },
      { san: 'd4', children: [{ san: 'd5', children: [] }] },
    ];
    const { cmp } = setup(variant({ tree, moves: ['e4', 'e5'] }));
    expect(cmp.expectedMoves()).toEqual(['e4', 'd4']);
    cmp.onUserMove(move('d4'));
    expect(cmp.currentPath()).toEqual([1]);
    expect(cmp.status()).toBe('opponent');
  });

  it('lets the opponent choose among its variations', () => {
    const tree: MoveNode[] = [
      { san: 'e4', children: [{ san: 'e5', children: [] }, { san: 'c5', children: [] }] },
    ];
    const { cmp } = setup(variant({ tree, moves: ['e4', 'e5'] }));
    cmp.onUserMove(move('e4'));
    expect(cmp.status()).toBe('opponent');
    cmp.pickChild = () => 1; // forza il ramo c5
    cmp.applyOpponentReply();
    expect(cmp.currentPath()).toEqual([0, 1]);
    expect(cmp.status()).toBe('completed');
  });

  it('completes at the end of the line', () => {
    const { cmp } = setup(variant({ moves: ['e4', 'e5'] }));
    cmp.onUserMove(move('e4'));
    cmp.applyOpponentReply();
    expect(cmp.status()).toBe('completed');
  });
});
