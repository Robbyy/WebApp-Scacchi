import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ApiService } from './core/api.service';
import { ToastHost } from './core/toast-host';
import { ConfirmDialog } from './core/confirm-dialog';
import { MoveSoundService } from './core/move-sound.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, ToastHost, ConfirmDialog],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly api = inject(ApiService);
  private readonly moveSound = inject(MoveSoundService);

  protected readonly title = signal('WebApp Scacchi');
  /** null = verifica in corso, true = online, false = offline. */
  protected readonly online = signal<boolean | null>(null);

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
