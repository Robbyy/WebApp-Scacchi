import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Chessboard, MoveMade } from './chessboard';

function clickSquare(fixture: ComponentFixture<Chessboard>, square: string): void {
  const el = fixture.nativeElement.querySelector(
    `[data-square="${square}"]`,
  ) as HTMLButtonElement;
  el.click();
}

function eventWithDataTransfer(type: string, dataTransfer: Record<string, unknown>): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
  return event;
}

function dragSquare(fixture: ComponentFixture<Chessboard>, from: string, to: string): void {
  const source = fixture.nativeElement.querySelector(
    `[data-square="${from}"]`,
  ) as HTMLButtonElement;
  const target = fixture.nativeElement.querySelector(
    `[data-square="${to}"]`,
  ) as HTMLButtonElement;
  let payload = '';
  const dataTransfer = {
    effectAllowed: '',
    dropEffect: '',
    setData: (_type: string, value: string) => {
      payload = value;
    },
    getData: () => payload,
  };

  source.dispatchEvent(eventWithDataTransfer('dragstart', dataTransfer));
  fixture.detectChanges();
  target.dispatchEvent(eventWithDataTransfer('dragover', dataTransfer));
  target.dispatchEvent(eventWithDataTransfer('drop', dataTransfer));
  source.dispatchEvent(eventWithDataTransfer('dragend', dataTransfer));
  fixture.detectChanges();
}

describe('Chessboard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Chessboard] }).compileComponents();
  });

  it('renders 64 squares', () => {
    const fixture = TestBed.createComponent(Chessboard);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.square').length).toBe(64);
  });

  it('shows 32 pieces at the initial position', () => {
    const fixture = TestBed.createComponent(Chessboard);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.piece').length).toBe(32);
  });

  it('emits a legal move (e2-e4) in SAN', () => {
    const fixture = TestBed.createComponent(Chessboard);
    fixture.detectChanges();
    let emitted: MoveMade | undefined;
    fixture.componentInstance.moveMade.subscribe((m) => (emitted = m));

    clickSquare(fixture, 'e2');
    fixture.detectChanges();
    clickSquare(fixture, 'e4');

    expect(emitted).toBeDefined();
    expect(emitted!.san).toBe('e4');
    expect(emitted!.from).toBe('e2');
    expect(emitted!.to).toBe('e4');
  });

  it('emits a legal drag-and-drop move (e2-e4) in SAN', () => {
    const fixture = TestBed.createComponent(Chessboard);
    fixture.detectChanges();
    let emitted: MoveMade | undefined;
    fixture.componentInstance.moveMade.subscribe((m) => (emitted = m));

    dragSquare(fixture, 'e2', 'e4');

    expect(emitted).toBeDefined();
    expect(emitted!.san).toBe('e4');
    expect(emitted!.from).toBe('e2');
    expect(emitted!.to).toBe('e4');
  });

  it('does not emit on an illegal move (e2-e5)', () => {
    const fixture = TestBed.createComponent(Chessboard);
    fixture.detectChanges();
    let count = 0;
    fixture.componentInstance.moveMade.subscribe(() => count++);

    clickSquare(fixture, 'e2');
    fixture.detectChanges();
    clickSquare(fixture, 'e5');

    expect(count).toBe(0);
  });

  it('hides the piece on the origin square while dragging', () => {
    const fixture = TestBed.createComponent(Chessboard);
    fixture.detectChanges();
    const source = fixture.nativeElement.querySelector(
      '[data-square="e2"]',
    ) as HTMLButtonElement;
    const dataTransfer = {
      effectAllowed: '',
      dropEffect: '',
      setData: () => {},
      getData: () => 'e2',
    };

    source.dispatchEvent(eventWithDataTransfer('dragstart', dataTransfer));
    fixture.detectChanges();

    const img = source.querySelector('img.piece') as HTMLImageElement;
    expect(img.classList.contains('piece--dragging')).toBe(true);

    source.dispatchEvent(eventWithDataTransfer('dragend', dataTransfer));
    fixture.detectChanges();
    expect(img.classList.contains('piece--dragging')).toBe(false);
  });

  it('does not emit on an illegal drag-and-drop move (e2-e5)', () => {
    const fixture = TestBed.createComponent(Chessboard);
    fixture.detectChanges();
    let count = 0;
    fixture.componentInstance.moveMade.subscribe(() => count++);

    dragSquare(fixture, 'e2', 'e5');

    expect(count).toBe(0);
  });

  it('does not emit drag-and-drop moves when not interactive', () => {
    const fixture = TestBed.createComponent(Chessboard);
    fixture.componentRef.setInput('interactive', false);
    fixture.detectChanges();
    let count = 0;
    fixture.componentInstance.moveMade.subscribe(() => count++);

    dragSquare(fixture, 'e2', 'e4');

    expect(count).toBe(0);
  });

  it('ignores selecting an opponent piece first', () => {
    const fixture = TestBed.createComponent(Chessboard);
    fixture.detectChanges();
    let count = 0;
    fixture.componentInstance.moveMade.subscribe(() => count++);

    clickSquare(fixture, 'e7'); // pezzo nero, ma muove il bianco
    fixture.detectChanges();
    clickSquare(fixture, 'e5');

    expect(count).toBe(0);
  });

  it('passes the turn to black after a white move', () => {
    const fixture = TestBed.createComponent(Chessboard);
    fixture.detectChanges();

    clickSquare(fixture, 'e2');
    fixture.detectChanges();
    clickSquare(fixture, 'e4');

    expect(fixture.componentInstance.currentFen().split(' ')[1]).toBe('b');
  });

  it('asks for the promotion piece and applies the chosen one', () => {
    const fixture = TestBed.createComponent(Chessboard);
    // pedone bianco in a7, pronto a promuovere
    fixture.componentRef.setInput('position', '8/P7/8/7k/8/8/8/4K3 w - - 0 1');
    fixture.detectChanges();

    let emitted: MoveMade | undefined;
    fixture.componentInstance.moveMade.subscribe((m) => (emitted = m));

    clickSquare(fixture, 'a7');
    fixture.detectChanges();
    clickSquare(fixture, 'a8');
    fixture.detectChanges();

    // nessuna mossa emessa: si attende la scelta del pezzo
    expect(emitted).toBeUndefined();
    expect(fixture.nativeElement.querySelector('.promo-picker')).not.toBeNull();

    // scegli la Torre
    (fixture.componentInstance as unknown as { choosePromotion(p: string): void }).choosePromotion('r');
    fixture.detectChanges();

    expect(emitted).toBeDefined();
    expect(emitted!.san).toBe('a8=R');
    expect(fixture.nativeElement.querySelector('.promo-picker')).toBeNull();
  });

  it('auto-queen is not forced: promoting to knight yields a knight move', () => {
    const fixture = TestBed.createComponent(Chessboard);
    fixture.componentRef.setInput('position', '8/P7/8/7k/8/8/8/4K3 w - - 0 1');
    fixture.detectChanges();

    let emitted: MoveMade | undefined;
    fixture.componentInstance.moveMade.subscribe((m) => (emitted = m));

    clickSquare(fixture, 'a7');
    fixture.detectChanges();
    clickSquare(fixture, 'a8');
    fixture.detectChanges();
    (fixture.componentInstance as unknown as { choosePromotion(p: string): void }).choosePromotion('n');

    expect(emitted!.san).toBe('a8=N');
  });
});
