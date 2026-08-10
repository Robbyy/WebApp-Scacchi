import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Variant } from '../core/variant.model';

/**
 * Elenco delle varianti dello studio corrente (ISSUE-010, R23). Riceve la lista
 * nell'ordine fornito dall'API e l'ID attivo, e si limita a **notificare** la
 * selezione: la navigazione — e, nell'editor, il guard sulle modifiche non
 * salvate — restano responsabilità del componente padre.
 *
 * In modalità `drawer` il pannello è una sovrapposizione: espone il controllo di
 * chiusura, lo prende in focus all'apertura e si chiude con `Esc`. Il rail a
 * colonna (dettaglio da 1500px) usa lo stesso markup senza quei controlli.
 */
@Component({
  selector: 'app-study-variant-nav',
  templateUrl: './study-variant-nav.html',
  styleUrl: './study-variant-nav.css',
  host: { '[class.nav-host--drawer]': 'drawer()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudyVariantNav implements AfterViewInit {
  /** Varianti dello studio, nell'ordine restituito da `GET /api/studies/{id}`. */
  readonly variants = input.required<Variant[]>();
  /** ID della variante aperta: riceve lo stile attivo e `aria-current="page"`. */
  readonly activeId = input.required<number>();
  /** true quando il pannello è mostrato come drawer a sovrapposizione. */
  readonly drawer = input(false);
  /** Variante scelta dall'utente: sta al padre decidere se e come navigare. */
  readonly variantSelected = output<number>();
  /** Richiesta di chiusura del drawer (pulsante esplicito o `Esc`). */
  readonly dismiss = output<void>();

  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');

  ngAfterViewInit(): void {
    // Il drawer nasce da un'azione esplicita: il focus parte dal controllo di
    // chiusura, così è richiudibile da tastiera senza attraversare la lista.
    this.closeButton()?.nativeElement.focus();
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (this.drawer() && event.key === 'Escape') {
      event.preventDefault();
      this.dismiss.emit();
    }
  }
}
