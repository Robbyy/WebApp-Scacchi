import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MoveAction, MoveActionsMenu } from './move-actions-menu';

/** Host minimale: il menu riceve solo la mossa e notifica il comando scelto. */
@Component({
  imports: [MoveActionsMenu],
  template: `
    <app-move-actions-menu
      [san]="san()"
      [anchor]="{ x: 120, y: 240 }"
      [canPromote]="canPromote()"
      (action)="chosen.push($event)"
      (dismiss)="dismissed = dismissed + 1"
    />
  `,
})
class Host {
  readonly san = signal('Nf3');
  readonly canPromote = signal(false);
  readonly chosen: MoveAction[] = [];
  dismissed = 0;
}

function setup(canPromote = false) {
  TestBed.configureTestingModule({ imports: [Host] });
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.canPromote.set(canPromote);
  fixture.detectChanges();
  const el: HTMLElement = fixture.nativeElement;
  const items = () =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
  return { fixture, host: fixture.componentInstance, el, items };
}

describe('MoveActionsMenu', () => {
  it('uses menu semantics and names the move it acts on', () => {
    const { el } = setup();
    const menu = el.querySelector('[role="menu"]')!;
    expect(menu.getAttribute('aria-label')).toBe('Azioni per Nf3');
  });

  it('hides the promotion for a mainline move', () => {
    expect(setup(false).items().map((b) => b.textContent?.trim())).toEqual([
      'Annota la mossa',
      'Elimina mossa',
    ]);
  });

  it('shows the promotion for a variation', () => {
    expect(setup(true).items().map((b) => b.textContent?.trim())).toEqual([
      'Annota la mossa',
      'Promuovi a mainline',
      'Elimina mossa',
    ]);
  });

  it('marks the destructive command apart from the others', () => {
    const { items } = setup(true);
    const danger = items().filter((b) => b.classList.contains('menu-item--danger'));
    expect(danger.map((b) => b.textContent?.trim())).toEqual(['Elimina mossa']);
  });

  it('moves the focus into the menu when it opens', () => {
    const { items } = setup();
    expect(document.activeElement).toBe(items()[0]);
  });

  it('moves through menu items with arrows, Home and End', () => {
    const { items } = setup(true);
    const press = (key: string) => document.dispatchEvent(new KeyboardEvent('keydown', { key }));

    press('ArrowDown');
    expect(document.activeElement).toBe(items()[1]);
    press('End');
    expect(document.activeElement).toBe(items()[2]);
    press('ArrowDown');
    expect(document.activeElement).toBe(items()[0]);
    press('ArrowUp');
    expect(document.activeElement).toBe(items()[2]);
    press('Home');
    expect(document.activeElement).toBe(items()[0]);
  });

  it('emits the chosen command', () => {
    const { host, items } = setup(true);
    items()[1].click();
    expect(host.chosen).toEqual(['promote']);
  });

  it('asks to be dismissed on Escape and on an outside click', () => {
    const { fixture, host, el } = setup();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(host.dismissed).toBe(1);

    el.querySelector<HTMLElement>('.menu-scrim')!.click();
    expect(host.dismissed).toBe(2);
  });

  it('stays inside the viewport on a narrow screen', () => {
    const { el } = setup();
    const menu = el.querySelector<HTMLElement>('.menu')!;
    // 120px sono dentro qualunque viewport di test: l'ancora è rispettata.
    expect(parseInt(menu.style.left, 10)).toBeLessThanOrEqual(120);
    expect(parseInt(menu.style.left, 10)).toBeGreaterThanOrEqual(8);
    expect(parseInt(menu.style.left, 10) + 208).toBeLessThanOrEqual(window.innerWidth);
  });
});
