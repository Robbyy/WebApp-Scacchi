import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'was.moveSound.enabled';

export type MoveSoundKind = 'move' | 'capture';

const SOUND_SOURCES: Record<MoveSoundKind, { ogg: string; mp3: string }> = {
  move: {
    ogg: '/sounds/lichess-standard/Move.ogg',
    mp3: '/sounds/lichess-standard/Move.mp3',
  },
  capture: {
    ogg: '/sounds/lichess-standard/Capture.ogg',
    mp3: '/sounds/lichess-standard/Capture.mp3',
  },
};

/**
 * Suono di mossa della scacchiera (Prototipo 12).
 *
 * Usa gli asset "standard" di Lichess vendorizzati in `public/sounds`, con
 * preferenza OGG e fallback MP3. La preferenza on/off è locale (localStorage),
 * default attivo. Il servizio è centralizzato: lo invocano la scacchiera, il
 * replay e il training, così il feedback sonoro è coerente.
 *
 * Origine asset: https://github.com/lichess-org/lila/tree/master/public/sound/standard
 */
@Injectable({ providedIn: 'root' })
export class MoveSoundService {
  /** Preferenza utente: suono attivo/disattivo (persistita localmente). */
  readonly enabled = signal<boolean>(this.readPreference());

  private readonly players = new Map<MoveSoundKind, HTMLAudioElement>();

  /** Riproduce il suono di mossa, se abilitato. No-op se l'audio non è disponibile. */
  play(kind: MoveSoundKind = 'move'): void {
    if (!this.enabled()) {
      return;
    }
    const player = this.player(kind);
    if (!player) {
      return;
    }
    try {
      player.pause();
      player.currentTime = 0;
      void player.play().catch(() => {
        // Autoplay policy o audio non disponibile: resta un no-op.
      });
    } catch {
      // Alcuni ambienti di test/browser possono non esporre pienamente HTMLAudioElement.
    }
  }

  /** Inverte lo stato del suono e persiste la preferenza. */
  toggle(): void {
    this.setEnabled(!this.enabled());
  }

  setEnabled(value: boolean): void {
    this.enabled.set(value);
    try {
      localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    } catch {
      // localStorage non disponibile: la preferenza resta solo in memoria.
    }
  }

  private readPreference(): boolean {
    try {
      // Default attivo: solo un esplicito "0" disattiva.
      return localStorage.getItem(STORAGE_KEY) !== '0';
    } catch {
      return true;
    }
  }

  private player(kind: MoveSoundKind): HTMLAudioElement | null {
    const cached = this.players.get(kind);
    if (cached) {
      return cached;
    }
    try {
      const audio = document.createElement('audio');
      audio.preload = 'auto';
      audio.src = this.sourceFor(audio, kind);
      this.players.set(kind, audio);
      return audio;
    } catch {
      return null;
    }
  }

  private sourceFor(audio: HTMLAudioElement, kind: MoveSoundKind): string {
    const sources = SOUND_SOURCES[kind];
    return audio.canPlayType('audio/ogg') ? sources.ogg : sources.mp3;
  }
}
