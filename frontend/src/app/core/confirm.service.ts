import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmRequest extends ConfirmOptions {
  id: number;
}

/**
 * Conferma modale riusabile (Prototipo 9). `ask` apre il dialog e restituisce
 * una Promise risolta a true (conferma) o false (annulla). Il rendering è in
 * {@link ConfirmDialog}, montato una sola volta a livello di app.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private seq = 0;
  readonly request = signal<ConfirmRequest | null>(null);
  private resolver: ((value: boolean) => void) | null = null;

  ask(options: ConfirmOptions): Promise<boolean> {
    // Una eventuale richiesta in sospeso viene annullata.
    this.settle(false);
    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
      this.request.set({ ...options, id: ++this.seq });
    });
  }

  resolve(value: boolean): void {
    this.settle(value);
  }

  private settle(value: boolean): void {
    const resolver = this.resolver;
    this.resolver = null;
    this.request.set(null);
    if (resolver) {
      resolver(value);
    }
  }
}
