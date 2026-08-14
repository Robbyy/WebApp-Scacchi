import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudyVariantNav } from './study-variant-nav';
import { Variant } from '../core/variant.model';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function variant(id: number, name: string, moves: string[], color: 'WHITE' | 'BLACK'): Variant {
  return { id, name, color, moves, startingFen: START, studyId: 9 };
}

const list: Variant[] = [
  variant(1, 'Italiana', ['e4', 'e5', 'Nf3'], 'WHITE'),
  variant(2, 'Siciliana', ['e4', 'c5'], 'BLACK'),
  variant(3, 'Francese', ['e4', 'e6'], 'BLACK'),
];

function setup(variants: Variant[], activeId: number, drawer = false, positionMode = false) {
  TestBed.configureTestingModule({ imports: [StudyVariantNav] });
  const fixture = TestBed.createComponent(StudyVariantNav);
  fixture.componentRef.setInput('variants', variants);
  fixture.componentRef.setInput('activeId', activeId);
  fixture.componentRef.setInput('drawer', drawer);
  fixture.componentRef.setInput('positionMode', positionMode);
  fixture.detectChanges();
  return fixture;
}

function items(fixture: ComponentFixture<StudyVariantNav>): HTMLButtonElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('.nav-item'));
}

describe('StudyVariantNav', () => {
  it('is a labelled navigation landmark', () => {
    const fixture = setup(list, 1);
    const nav: HTMLElement = fixture.nativeElement.querySelector('nav');
    expect(nav.getAttribute('aria-label')).toBe('Varianti dello studio');
  });

  it('lists every variant in the order given by the API', () => {
    const fixture = setup(list, 1);
    const names = items(fixture).map((b) => b.querySelector('.nav-item__name')?.textContent?.trim());
    expect(names).toEqual(['Italiana', 'Siciliana', 'Francese']);
  });

  it('shows name, colour and move count for each entry', () => {
    const fixture = setup(list, 1);
    const first = items(fixture)[0];
    expect(first.querySelector('.nav-item__name')?.textContent?.trim()).toBe('Italiana');
    expect(first.querySelector('.badge')?.textContent?.trim()).toBe('Bianco');
    expect(first.querySelector('.nav-item__count')?.textContent?.trim()).toBe('3 mosse');
    expect(items(fixture)[1].querySelector('.badge')?.textContent?.trim()).toBe('Nero');
  });

  it('uses compact positional labels without training colour or move count', () => {
    const fixture = setup(list, 1, false, true);
    const nav: HTMLElement = fixture.nativeElement.querySelector('nav');

    expect(nav.getAttribute('aria-label')).toBe('Posizioni dello studio');
    expect(fixture.nativeElement.querySelector('.nav-title')?.textContent?.trim()).toBe('Posizioni');
    expect(items(fixture).every((item) => item.querySelector('.badge') === null)).toBe(true);
    expect(items(fixture).every((item) => item.querySelector('.nav-item__meta') === null)).toBe(true);
    expect(items(fixture)[0].textContent?.trim()).toBe('Italiana');
  });

  it('marks only the active variant, visually and for assistive tech', () => {
    const fixture = setup(list, 2);
    const current = items(fixture).filter((b) => b.getAttribute('aria-current') === 'page');
    expect(current.length).toBe(1);
    expect(current[0].textContent).toContain('Siciliana');
    expect(current[0].classList.contains('nav-item--active')).toBe(true);
    expect(items(fixture)[0].getAttribute('aria-current')).toBeNull();
  });

  it('only notifies the selection: navigation stays with the parent', () => {
    const fixture = setup(list, 1);
    const selected: number[] = [];
    fixture.componentInstance.variantSelected.subscribe((id) => selected.push(id));
    items(fixture)[2].click();
    expect(selected).toEqual([3]);
  });

  it('has no close control outside the drawer', () => {
    const fixture = setup(list, 1);
    expect(fixture.nativeElement.querySelector('.nav-close')).toBeNull();
  });

  it('focuses the close control when opened as a drawer', () => {
    const fixture = setup(list, 1, true);
    const close: HTMLButtonElement = fixture.nativeElement.querySelector('.nav-close');
    expect(close).not.toBeNull();
    expect(document.activeElement).toBe(close);
  });

  it('closes on the explicit control and on Esc', () => {
    const fixture = setup(list, 1, true);
    let dismissed = 0;
    fixture.componentInstance.dismiss.subscribe(() => dismissed++);

    fixture.nativeElement.querySelector('.nav-close').click();
    expect(dismissed).toBe(1);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(dismissed).toBe(2);
  });

  it('ignores Esc when it is not a drawer', () => {
    const fixture = setup(list, 1);
    let dismissed = 0;
    fixture.componentInstance.dismiss.subscribe(() => dismissed++);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(dismissed).toBe(0);
  });
});
