import { Component, OnInit, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { ApiService } from './core/api.service';
import { ToastHost } from './core/toast-host';
import { ConfirmDialog } from './core/confirm-dialog';
import { MoveSoundService } from './core/move-sound.service';
import { STUDY_SECTION_TABS, sectionFromUrl } from './core/study-sections';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, ToastHost, ConfirmDialog],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly api = inject(ApiService);
  private readonly moveSound = inject(MoveSoundService);
  private readonly router = inject(Router);

  protected readonly title = signal('WebApp Scacchi');
  /** null = verifica in corso, true = online, false = offline. */
  protected readonly online = signal<boolean | null>(null);

  /** Tab di navigazione Aperture/Mediogioco/Finale (ISSUE-021). */
  protected readonly sections = STUDY_SECTION_TABS;

  /** Sezione corrente, per lo stato visivo attivo e `aria-current`. */
  protected readonly activeSection = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => sectionFromUrl(e.urlAfterRedirects)),
    ),
    { initialValue: sectionFromUrl(this.router.url) },
  );

  /** Preferenza locale del suono di mossa (toggle nell'header). */
  protected readonly soundEnabled = this.moveSound.enabled;

  ngOnInit(): void {
    this.api.ping().subscribe({
      next: () => this.online.set(true),
      error: () => this.online.set(false)
    });
  }

  protected toggleSound(): void {
    this.moveSound.toggle();
  }
}
