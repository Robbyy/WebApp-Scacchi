import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MoveAnnotation } from '../core/move-tree';
import { MAX_MOVE_COMMENT_LENGTH } from '../core/variant.model';
import { MoveAnnotationDialog } from './move-annotation-dialog';

@Component({
  imports: [MoveAnnotationDialog],
  template: `
    <app-move-annotation-dialog
      [san]="san()"
      [annotation]="annotation()"
      (save)="saved.push($event)"
      (cancel)="cancelled = cancelled + 1"
    />
  `,
})
class Host {
  readonly san = signal('Bb5');
  readonly annotation = signal<MoveAnnotation>({});
  readonly saved: MoveAnnotation[] = [];
  cancelled = 0;
}

function setup(annotation: MoveAnnotation = {}) {
  TestBed.configureTestingModule({ imports: [Host] });
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.annotation.set(annotation);
  fixture.detectChanges();
  const el: HTMLElement = fixture.nativeElement;
  const textarea = () => el.querySelector<HTMLTextAreaElement>('.dlg-textarea')!;
  const nagButtons = () => Array.from(el.querySelectorAll<HTMLButtonElement>('.dlg-nag'));
  const nag = (value: string) => nagButtons().find((b) => b.textContent?.trim() === value)!;
  const save = () =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('.dlg-btn')).find(
      (b) => b.textContent?.trim() === 'Salva',
    )!;
  const cancel = () =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('.dlg-btn')).find(
      (b) => b.textContent?.trim() === 'Annulla',
    )!;
  /** Digitazione nella textarea, con l'evento che il componente ascolta. */
  const type = (value: string) => {
    textarea().value = value;
    textarea().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  return { fixture, host: fixture.componentInstance, el, textarea, nagButtons, nag, save, cancel, type };
}

describe('MoveAnnotationDialog', () => {
  it('is a modal dialog that names the move', () => {
    const { el } = setup();
    const box = el.querySelector('[role="dialog"]')!;
    expect(box.getAttribute('aria-modal')).toBe('true');
    expect(box.getAttribute('aria-label')).toBe('Annota la mossa Bb5');
  });

  it('offers exactly the six NAGs', () => {
    const { nagButtons } = setup();
    expect(nagButtons().map((b) => b.textContent?.trim())).toEqual([
      '!',
      '!!',
      '?',
      '??',
      '!?',
      '?!',
    ]);
  });

  it('starts from the current annotation of the move', () => {
    const { textarea, nag } = setup({ comment: 'Linea principale', nag: '!' });
    expect(textarea().value).toBe('Linea principale');
    expect(nag('!').getAttribute('aria-pressed')).toBe('true');
    expect(nag('?').getAttribute('aria-pressed')).toBe('false');
  });

  it('creates an annotation', () => {
    const { host, type, nag, save } = setup();
    type('Mossa naturale');
    nag('!?').click();
    save().click();
    expect(host.saved).toEqual([{ comment: 'Mossa naturale', nag: '!?' }]);
  });

  it('keeps a single NAG: choosing another one replaces it', () => {
    const { host, nag, save } = setup();
    nag('!').click();
    nag('??').click();
    save().click();
    expect(host.saved).toEqual([{ comment: undefined, nag: '??' }]);
  });

  it('removes the selected NAG when it is activated again', () => {
    const { fixture, host, nag, save } = setup({ nag: '!' });
    nag('!').click();
    fixture.detectChanges();
    expect(nag('!').getAttribute('aria-pressed')).toBe('false');
    save().click();
    expect(host.saved).toEqual([{ comment: undefined, nag: undefined }]);
  });

  it('deletes an annotation by clearing the comment and the NAG', () => {
    const { host, type, nag, save } = setup({ comment: 'Vecchio', nag: '?' });
    type('   ');
    nag('?').click();
    save().click();
    expect(host.saved).toEqual([{ comment: undefined, nag: undefined }]);
  });

  it('caps the comment at the documented limit', () => {
    const { host, textarea, type, save } = setup();
    expect(textarea().getAttribute('maxlength')).toBe(String(MAX_MOVE_COMMENT_LENGTH));
    type('x'.repeat(MAX_MOVE_COMMENT_LENGTH + 50));
    save().click();
    expect(host.saved[0].comment?.length).toBe(MAX_MOVE_COMMENT_LENGTH);
  });

  it('cancels without producing an annotation, with the button and with Escape', () => {
    const { fixture, host, cancel } = setup();
    cancel().click();
    expect(host.saved).toEqual([]);
    expect(host.cancelled).toBe(1);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(host.cancelled).toBe(2);
  });

  it('starts with the focus in the comment and traps Tab inside the dialog', () => {
    const { el, textarea } = setup();
    expect(document.activeElement).toBe(textarea());

    const buttons = Array.from(el.querySelectorAll<HTMLElement>('button, textarea'));
    const last = buttons[buttons.length - 1];
    last.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(document.activeElement).toBe(buttons[0]);

    buttons[0].focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }));
    expect(document.activeElement).toBe(last);
  });
});
