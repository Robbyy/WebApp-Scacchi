import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ApiService } from './core/api.service';
import { ToastHost } from './core/toast-host';
import { ConfirmDialog } from './core/confirm-dialog';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, ToastHost, ConfirmDialog],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly title = signal('WebApp Scacchi');
  /** null = verifica in corso, true = online, false = offline. */
  protected readonly online = signal<boolean | null>(null);

  ngOnInit(): void {
    this.api.ping().subscribe({
      next: () => this.online.set(true),
      error: () => this.online.set(false)
    });
  }
}
