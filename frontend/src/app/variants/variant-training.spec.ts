import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { VariantTraining } from './variant-training';
import { VariantService } from '../core/variant.service';
import { Variant } from '../core/variant.model';
import { MoveMade } from '../chessboard/chessboard';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const whiteVariant: Variant = {
  id: 1,
  name: 'Italiana',
  color: 'WHITE',
  moves: ['e4', 'e5', 'Nf3', 'Nc6'],
  startingFen: START,
};

const blackVariant: Variant = {
  id: 2,
  name: 'Siciliana',
  color: 'BLACK',
  moves: ['e4', 'c5', 'Nf3', 'd6'],
  startingFen: START,
};

function move(san: string): MoveMade {
  return { san, from: '', to: '', fen: '' };
}

function setup(v: Variant) {
  TestBed.configureTestingModule({
    imports: [VariantTraining],
    providers: [
      provideRouter([]),
      { provide: VariantService, useValue: { getVariant: () => of(v) } },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: String(v.id) }) } } },
    ],
  });
  const fixture = TestBed.createComponent(VariantTraining);
  const cmp = fixture.componentInstance as any;
  cmp.replyDelayMs = 1_000_000; // evita che il timer scatti durante il test
  fixture.detectChanges();
  return { fixture, cmp };
}

describe('VariantTraining', () => {
  it('starts awaiting the user for a white variant', () => {
    const { cmp } = setup(whiteVariant);
    expect(cmp.userColor()).toBe('w');
    expect(cmp.status()).toBe('playing');
    expect(cmp.index()).toBe(0);
  });

  it('accepts the correct move and lets the opponent reply', () => {
    const { cmp } = setup(whiteVariant);
    cmp.onUserMove(move('e4'));
    expect(cmp.index()).toBe(1);
    expect(cmp.status()).toBe('opponent');
    cmp.applyOpponentReply();
    expect(cmp.index()).toBe(2);
    expect(cmp.status()).toBe('playing');
  });

  it('rejects a wrong move without advancing', () => {
    const { cmp } = setup(whiteVariant);
    cmp.onUserMove(move('d4'));
    expect(cmp.status()).toBe('wrong');
    expect(cmp.mistakes()).toBe(1);
    expect(cmp.index()).toBe(0);
    // ritenta con la mossa corretta
    cmp.onUserMove(move('e4'));
    expect(cmp.index()).toBe(1);
    expect(cmp.status()).toBe('opponent');
  });

  it('auto-plays the first opponent move for a black variant', () => {
    const { cmp } = setup(blackVariant);
    expect(cmp.userColor()).toBe('b');
    expect(cmp.orientation()).toBe('black');
    expect(cmp.index()).toBe(1); // il bianco ha già giocato e4
    expect(cmp.status()).toBe('playing');
    cmp.onUserMove(move('c5'));
    expect(cmp.index()).toBe(2);
    expect(cmp.status()).toBe('opponent');
  });

  it('completes the variant at the end of the line', () => {
    const { cmp } = setup({ ...whiteVariant, moves: ['e4', 'e5'] });
    cmp.onUserMove(move('e4'));
    expect(cmp.status()).toBe('opponent');
    cmp.applyOpponentReply();
    expect(cmp.index()).toBe(2);
    expect(cmp.status()).toBe('completed');
  });

  it('restarts cleanly', () => {
    const { cmp } = setup(whiteVariant);
    cmp.onUserMove(move('d4'));
    expect(cmp.mistakes()).toBe(1);
    cmp.start();
    expect(cmp.index()).toBe(0);
    expect(cmp.mistakes()).toBe(0);
    expect(cmp.status()).toBe('playing');
  });
});
