import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  input,
  output,
  viewChild,
  viewChildren,
} from '@angular/core';

/** Comando scelto nel menu azioni di una mossa (R24). */
export type MoveAction = 'annotate' | 'promote' | 'delete';

/** Punto di ancoraggio del menu, in coordinate di viewport. */
export interface MenuAnchor {
  x: number;
  y: number;
}

/** Ingombro del menu (vedi `move-actions-menu.css`), usato per rientrare nel viewport. */
const MENU_WIDTH = 208;
const MENU_HEIGHT = 168;
const MENU_EDGE = 8;

function clamp(value: number, size: number, available: number): number {
  return Math.max(MENU_EDGE, Math.min(value, available - size - MENU_EDGE));
}

/**
 * Menu azioni riferito a una singola mossa (ISSUE-013, R24). Non conosce
 * l'albero: riceve il SAN da mostrare, sa se la promozione è applicabile e si
 * limita a **notificare** il comando scelto. Aggiornamento dell'albero,
 * conferme e annotazione restano del componente padre.
 *
 * È una sovrapposizione `position: fixed` ancorata al controllo che l'ha
 * aperto: a viewport stretti non entra nel flusso, quindi non sposta né
 * ridimensiona la scacchiera. Si chiude con `Esc`, con un click esterno o alla
 * scelta di un comando; il ritorno del focus al pulsante di origine è del padre,
 * che sa quale controllo ha aperto il menu.
 */
@Component({
  selector: 'app-move-actions-menu',
  templateUrl: './move-actions-menu.html',
  styleUrl: './move-actions-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoveActionsMenu implements AfterViewInit {
  /** SAN della mossa a cui si riferiscono i comandi. */
  readonly san = input.required<string>();
  /** Posizione del controllo che ha aperto il menu (viewport). */
  readonly anchor = input.required<MenuAnchor>();
  /** true solo per una mossa fuori dalla mainline: altrimenti il comando non esiste. */
  readonly canPromote = input(false);
  /** Comando scelto dall'utente. */
  readonly action = output<MoveAction>();
  /** Richiesta di chiusura senza comando (`Esc`, click esterno). */
  readonly dismiss = output<void>();

  private readonly firstItem = viewChild<ElementRef<HTMLButtonElement>>('firstItem');
  private readonly menuItems = viewChildren<ElementRef<HTMLButtonElement>>('menuItem');

  /**
   * Posizione effettiva: l'ancora è solo un suggerimento e viene rientrata nel
   * viewport, così a 320px il menu resta interamente visibile senza allargare
   * la pagina.
   */
  protected readonly left = computed(() => clamp(this.anchor().x, MENU_WIDTH, window.innerWidth));
  protected readonly top = computed(() => clamp(this.anchor().y, MENU_HEIGHT, window.innerHeight));

  ngAfterViewInit(): void {
    // Il menu nasce da un'azione esplicita: il focus entra subito nella prima
    // voce, così è percorribile da tastiera senza altri passaggi.
    this.firstItem()?.nativeElement.focus();
  }

  protected choose(action: MoveAction): void {
    this.action.emit(action);
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.dismiss.emit();
      return;
    }

    const items = this.menuItems().map((item) => item.nativeElement);
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    if (current < 0 || items.length === 0) {
      return;
    }

    let next: number | null = null;
    switch (event.key) {
      case 'ArrowDown':
        next = (current + 1) % items.length;
        break;
      case 'ArrowUp':
        next = (current - 1 + items.length) % items.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = items.length - 1;
        break;
    }
    if (next !== null) {
      event.preventDefault();
      items[next].focus();
    }
  }
}
