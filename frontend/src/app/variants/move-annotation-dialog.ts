import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MoveAnnotation } from '../core/move-tree';
import { MAX_MOVE_COMMENT_LENGTH, MOVE_NAGS, MoveNag } from '../core/variant.model';

/**
 * Dialog di annotazione di una mossa (`issue-016-move-comments`, R24): una
 * textarea per il commento e i sei pulsanti NAG, mutuamente esclusivi.
 *
 * Il NAG selezionato è distinguibile (`aria-pressed`) e una seconda attivazione
 * lo rimuove; «Salva» emette le annotazioni normalizzate, «Annulla» non produce
 * modifiche. Finché è aperto il focus resta dentro il dialog; restituirlo
 * all'azione di origine è del componente padre, che sa da dove è partito.
 */
@Component({
  selector: 'app-move-annotation-dialog',
  templateUrl: './move-annotation-dialog.html',
  styleUrl: './move-annotation-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoveAnnotationDialog implements AfterViewInit {
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  /** SAN della mossa in annotazione, mostrato nel titolo. */
  readonly san = input.required<string>();
  /** Annotazioni attuali del nodo: il dialog parte da queste. */
  readonly annotation = input<MoveAnnotation>({});
  /** Annotazioni confermate dall'utente. */
  readonly save = output<MoveAnnotation>();
  /** Chiusura senza modifiche (`Annulla`, `Esc`, click sullo sfondo). */
  readonly cancel = output<void>();

  protected readonly nags = MOVE_NAGS;
  protected readonly maxLength = MAX_MOVE_COMMENT_LENGTH;

  protected readonly comment = signal('');
  protected readonly nag = signal<MoveNag | null>(null);

  protected readonly remaining = computed(() => this.maxLength - this.comment().length);

  private readonly textarea = viewChild<ElementRef<HTMLTextAreaElement>>('commentBox');

  constructor() {
    // L'annotazione di partenza arriva come input: si copia nello stato locale,
    // così l'albero non cambia finché l'utente non salva.
    effect(() => {
      const current = this.annotation();
      this.comment.set(current.comment ?? '');
      this.nag.set(current.nag ?? null);
    });
  }

  ngAfterViewInit(): void {
    this.textarea()?.nativeElement.focus();
  }

  protected onCommentChange(value: string): void {
    this.comment.set(value.slice(0, this.maxLength));
  }

  /** Un NAG per volta: riattivare quello selezionato lo rimuove. */
  protected toggleNag(value: MoveNag): void {
    this.nag.update((current) => (current === value ? null : value));
  }

  protected confirm(): void {
    const comment = this.comment().trim();
    this.save.emit({
      comment: comment.length > 0 ? comment : undefined,
      nag: this.nag() ?? undefined,
    });
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancel.emit();
      return;
    }
    if (event.key === 'Tab') {
      this.trapFocus(event);
    }
  }

  /** Il Tab non esce dal dialog finché è aperto: il giro è circolare. */
  private trapFocus(event: KeyboardEvent): void {
    const focusable = Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>('button, textarea'),
    ).filter((el) => !el.hasAttribute('disabled'));
    if (focusable.length === 0) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !this.host.nativeElement.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
