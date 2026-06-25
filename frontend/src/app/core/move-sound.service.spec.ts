import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MoveSoundService } from './move-sound.service';

interface FakeAudio {
  preload: string;
  src: string;
  currentTime: number;
  play: ReturnType<typeof vi.fn<() => Promise<void>>>;
  pause: ReturnType<typeof vi.fn<() => void>>;
  canPlayType: ReturnType<typeof vi.fn<(mime: string) => string>>;
}

function mockAudio(canPlayOgg = true): FakeAudio[] {
  const created: FakeAudio[] = [];
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    if (tagName !== 'audio') {
      return originalCreateElement(tagName);
    }
    const audio: FakeAudio = {
      preload: '',
      src: '',
      currentTime: 12,
      play: vi.fn<() => Promise<void>>().mockResolvedValue(),
      pause: vi.fn<() => void>(),
      canPlayType: vi
        .fn<(mime: string) => string>()
        .mockImplementation((mime: string) =>
          canPlayOgg && mime === 'audio/ogg' ? 'probably' : '',
        ),
    };
    created.push(audio);
    return audio as unknown as HTMLAudioElement;
  });
  return created;
}

describe('MoveSoundService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('is enabled by default', () => {
    const service = TestBed.inject(MoveSoundService);
    expect(service.enabled()).toBe(true);
  });

  it('toggles and persists the preference', () => {
    const service = TestBed.inject(MoveSoundService);
    service.toggle();
    expect(service.enabled()).toBe(false);
    expect(localStorage.getItem('was.moveSound.enabled')).toBe('0');
    service.toggle();
    expect(service.enabled()).toBe(true);
    expect(localStorage.getItem('was.moveSound.enabled')).toBe('1');
  });

  it('reads a disabled preference from storage', () => {
    localStorage.setItem('was.moveSound.enabled', '0');
    const service = TestBed.inject(MoveSoundService);
    expect(service.enabled()).toBe(false);
  });

  it('plays the Lichess move sound using OGG when supported', () => {
    const created = mockAudio(true);
    const service = TestBed.inject(MoveSoundService);

    service.play();

    expect(created.length).toBe(1);
    expect(created[0].src).toContain('/sounds/lichess-standard/Move.ogg');
    expect(created[0].preload).toBe('auto');
    expect(created[0].pause).toHaveBeenCalled();
    expect(created[0].currentTime).toBe(0);
    expect(created[0].play).toHaveBeenCalled();
  });

  it('plays the Lichess capture sound for captures', () => {
    const created = mockAudio(true);
    const service = TestBed.inject(MoveSoundService);

    service.play('capture');

    expect(created.length).toBe(1);
    expect(created[0].src).toContain('/sounds/lichess-standard/Capture.ogg');
    expect(created[0].play).toHaveBeenCalled();
  });

  it('falls back to MP3 when OGG is not supported', () => {
    const created = mockAudio(false);
    const service = TestBed.inject(MoveSoundService);

    service.play();

    expect(created[0].src).toContain('/sounds/lichess-standard/Move.mp3');
  });

  it('play() is a no-op when disabled', () => {
    const created = mockAudio(true);
    const service = TestBed.inject(MoveSoundService);
    service.setEnabled(false);

    service.play();

    expect(created.length).toBe(0);
  });

  it('play() does not throw when audio creation fails', () => {
    vi.spyOn(document, 'createElement').mockImplementation(() => {
      throw new Error('audio unavailable');
    });
    const service = TestBed.inject(MoveSoundService);

    expect(() => service.play()).not.toThrow();
  });
});
