import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiService } from './core/api.service';
import { Chessboard, MoveMade } from './chessboard/chessboard';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Chessboard],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly title = signal('WebApp Scacchi');
  protected readonly pingStatus = signal<string>('');
  protected readonly pingError = signal<string | null>(null);
  protected readonly lastMove = signal<MoveMade | null>(null);

  ngOnInit(): void {
    this.api.ping().subscribe({
      next: (res) => this.pingStatus.set(res.status),
      error: (err) => {
        this.pingError.set('Backend non raggiungibile (atteso su :8080).');
        console.error('Ping fallito', err);
      }
    });
  }

  protected onMove(move: MoveMade): void {
    this.lastMove.set(move);
  }
}
