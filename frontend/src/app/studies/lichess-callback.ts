import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LichessAuthService } from '../core/lichess-auth.service';
import { ToastService } from '../core/toast.service';

/**
 * Pagina di ritorno dell'OAuth Lichess (Prototipo 15). Scambia il codice di
 * autorizzazione con un token e rimanda alla pagina di import.
 */
@Component({
  selector: 'app-lichess-callback',
  imports: [RouterLink],
  template: `
    <section class="callback">
      @if (error()) {
        <p class="callback-error">{{ error() }}</p>
        <a routerLink="/studies/import-lichess">Torna all'import</a>
      } @else {
        <p class="callback-msg">Connessione a Lichess in corso&#8230;</p>
      }
    </section>
  `,
  styles: [
    `.callback { max-width: 720px; margin: 3rem auto; padding: 0 1.5rem; text-align: center; }
     .callback-msg { color: var(--text-muted); }
     .callback-error { color: oklch(0.45 0.16 25); }`,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LichessCallback {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(LichessAuthService);
  private readonly toast = inject(ToastService);

  protected readonly error = signal<string | null>(null);

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    const code = params.get('code');
    const state = params.get('state');
    const denied = params.get('error');

    if (denied || !code || !state) {
      this.error.set('Autorizzazione Lichess annullata o non valida.');
      return;
    }

    this.auth.handleCallback(code, state).subscribe({
      next: () => {
        this.toast.success('Connesso a Lichess.');
        this.router.navigateByUrl(this.auth.consumeReturnTo());
      },
      error: () => {
        this.error.set('Connessione a Lichess non riuscita. Riprova.');
      },
    });
  }
}
