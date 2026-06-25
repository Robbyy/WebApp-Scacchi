import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

/** Pila di notifiche transitorie, montata una volta a livello di app. */
@Component({
  selector: 'app-toast-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-host" aria-live="polite">
      @for (t of toasts(); track t.id) {
        <div
          class="toast"
          [class.toast--success]="t.kind === 'success'"
          [class.toast--error]="t.kind === 'error'"
          [class.toast--info]="t.kind === 'info'"
          role="status"
        >
          <span class="toast-text">{{ t.text }}</span>
          <button type="button" class="toast-close" (click)="dismiss(t.id)" aria-label="Chiudi">
            &#10005;
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .toast-host {
        position: fixed;
        right: 1rem;
        bottom: 1rem;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        max-width: min(92vw, 360px);
      }
      .toast {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.7rem 0.9rem;
        border-radius: 0.6rem;
        border: 1px solid var(--panel-border);
        background: var(--panel-bg);
        color: var(--text-main);
        box-shadow: 0 8px 24px oklch(0.3 0.05 45 / 0.25);
        font-size: 0.9rem;
        animation: toast-in 0.16s ease;
      }
      .toast-text {
        flex: 1;
      }
      .toast--success {
        border-color: oklch(0.7 0.13 145);
        background: oklch(0.95 0.05 145);
        color: oklch(0.3 0.1 145);
      }
      .toast--error {
        border-color: oklch(0.7 0.14 25);
        background: oklch(0.95 0.05 25);
        color: oklch(0.36 0.14 25);
      }
      .toast-close {
        border: none;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font-size: 0.8rem;
        opacity: 0.7;
        padding: 0.1rem 0.2rem;
      }
      .toast-close:hover {
        opacity: 1;
      }
      @keyframes toast-in {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
      }
    `,
  ],
})
export class ToastHost {
  private readonly service = inject(ToastService);
  protected readonly toasts = this.service.toasts;

  protected dismiss(id: number): void {
    this.service.dismiss(id);
  }
}
