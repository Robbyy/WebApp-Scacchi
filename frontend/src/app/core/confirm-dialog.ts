import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import { ConfirmService } from './confirm.service';

/** Rendering del dialog di conferma globale (Prototipo 9). */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (req(); as r) {
      <div class="cd-overlay" (click)="cancel()">
        <div
          class="cd-box"
          role="alertdialog"
          aria-modal="true"
          (click)="$event.stopPropagation()"
        >
          @if (r.title) {
            <h2 class="cd-title">{{ r.title }}</h2>
          }
          <p class="cd-message">{{ r.message }}</p>
          <div class="cd-actions">
            <button type="button" class="cd-btn" (click)="cancel()">
              {{ r.cancelLabel || 'Annulla' }}
            </button>
            <button
              type="button"
              class="cd-btn cd-btn--confirm"
              [class.cd-btn--danger]="r.danger"
              (click)="confirm()"
            >
              {{ r.confirmLabel || 'Conferma' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .cd-overlay {
        position: fixed;
        inset: 0;
        z-index: 1100;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        background: oklch(0.2 0.03 40 / 0.5);
      }
      .cd-box {
        width: min(92vw, 420px);
        padding: 1.25rem 1.35rem;
        border-radius: 0.9rem;
        background: var(--panel-bg);
        border: 1px solid var(--panel-border);
        box-shadow: 0 18px 48px oklch(0.2 0.05 40 / 0.45);
      }
      .cd-title {
        margin: 0 0 0.5rem;
        font-size: 1.15rem;
        color: var(--text-main);
      }
      .cd-message {
        margin: 0 0 1.1rem;
        color: var(--text-main);
        font-size: 0.95rem;
        line-height: 1.5;
      }
      .cd-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
      }
      .cd-btn {
        padding: 0.5rem 1rem;
        border: 1px solid var(--panel-border);
        border-radius: 0.6rem;
        background: oklch(0.965 0.018 80);
        color: var(--wood-dark);
        font: inherit;
        font-weight: 600;
        cursor: pointer;
      }
      .cd-btn:hover {
        background: var(--wood-light);
      }
      .cd-btn--confirm {
        color: var(--board-light);
        border-color: transparent;
        background: linear-gradient(135deg, var(--wood-medium), var(--wood-dark));
      }
      .cd-btn--danger {
        background: linear-gradient(135deg, oklch(0.6 0.16 25), oklch(0.48 0.16 25));
      }
    `,
  ],
})
export class ConfirmDialog {
  private readonly service = inject(ConfirmService);
  protected readonly req = this.service.request;

  protected confirm(): void {
    this.service.resolve(true);
  }

  protected cancel(): void {
    this.service.resolve(false);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.req()) {
      this.cancel();
    }
  }
}
