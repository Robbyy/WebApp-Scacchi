import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router, Routes, provideRouter, withComponentInputBinding } from '@angular/router';
import { App } from './app';
import { LichessAuthService } from './core/lichess-auth.service';
import { ComingSoon } from './sections/coming-soon';

/**
 * Route minime con la stessa forma di `app.routes.ts` per le sezioni: montano
 * solo il segnaposto, così la topbar è verificabile senza pagine che fanno HTTP.
 */
const testRoutes: Routes = [
  { path: '', component: ComingSoon, data: { section: 'Aperture' } },
  { path: 'studies/:id', component: ComingSoon, data: { section: 'Aperture' } },
  { path: 'variants/:id', component: ComingSoon, data: { section: 'Aperture' } },
  // Sotto-route canoniche di Mediogioco (ISSUE-016): stessa forma di
  // `app.routes.ts`, così il tab attivo è verificabile anche nei dettagli.
  {
    path: 'middlegame',
    children: [
      { path: '', component: ComingSoon, data: { section: 'Mediogioco' } },
      { path: 'studies/:id', component: ComingSoon, data: { section: 'Mediogioco' } },
      { path: 'positions/:id', component: ComingSoon, data: { section: 'Mediogioco' } },
      { path: 'positions/:id/setup', component: ComingSoon, data: { section: 'Mediogioco' } },
      { path: 'positions/:id/edit', component: ComingSoon, data: { section: 'Mediogioco' } },
    ],
  },
  { path: 'endgame', component: ComingSoon, data: { section: 'Finale' } },
];

/** Doppio del servizio OAuth Lichess: stato mutabile e chiamate registrate. */
class LichessAuthMock {
  state = false;
  connectedWith: string | null = null;
  disconnected = false;
  readonly connected = () => this.state;
  readonly token = () => (this.state ? 'tok' : null);
  connect(returnTo: string): Promise<void> {
    this.connectedWith = returnTo;
    return Promise.resolve();
  }
  disconnect(): void {
    this.disconnected = true;
    this.state = false;
  }
}

describe('App', () => {
  let httpMock: HttpTestingController;
  let lichess: LichessAuthMock;

  beforeEach(async () => {
    lichess = new LichessAuthMock();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(testRoutes, withComponentInputBinding()),
        { provide: LichessAuthService, useValue: lichess },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  /** Crea l'app e sblocca il ping di stato del backend. */
  function createApp() {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    httpMock.expectOne('/api/ping').flush({ status: 'pong' });
    fixture.detectChanges();
    return fixture;
  }

  function tabs(el: HTMLElement): HTMLAnchorElement[] {
    return Array.from(el.querySelectorAll<HTMLAnchorElement>('.section-tab'));
  }

  it('creates the app and pings the backend', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    httpMock.expectOne('/api/ping').flush({ status: 'pong' });
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows the brand title', () => {
    const compiled = createApp().nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand')?.textContent).toContain('WebApp Scacchi');
  });

  it('marks the backend online when ping succeeds', () => {
    const compiled = createApp().nativeElement as HTMLElement;
    expect(compiled.querySelector('.conn--ok')).not.toBeNull();
  });

  it('shows the three study sections as links in a labelled nav (ISSUE-021)', () => {
    const compiled = createApp().nativeElement as HTMLElement;
    const nav = compiled.querySelector('nav.section-nav');
    expect(nav?.getAttribute('aria-label')).toBe('Sezione di studio');
    expect(tabs(compiled).map((a) => a.textContent?.trim())).toEqual([
      'Aperture',
      'Mediogioco',
      'Finale',
    ]);
    expect(tabs(compiled).map((a) => a.getAttribute('href'))).toEqual([
      '/',
      '/middlegame',
      '/endgame',
    ]);
  });

  it('renders the nav right after the brand', () => {
    const compiled = createApp().nativeElement as HTMLElement;
    const children = Array.from(compiled.querySelector('.topbar')!.children);
    expect(children.map((c) => c.className)).toEqual([
      'brand',
      'section-nav',
      'topbar-right',
    ]);
  });

  it('marks Aperture as the current section on the home route', () => {
    const compiled = createApp().nativeElement as HTMLElement;
    const [aperture, middlegame, endgame] = tabs(compiled);
    expect(aperture.getAttribute('aria-current')).toBe('page');
    expect(aperture.classList).toContain('section-tab--active');
    expect(middlegame.getAttribute('aria-current')).toBeNull();
    expect(endgame.getAttribute('aria-current')).toBeNull();
  });

  it('moves the current section when navigating to Mediogioco', async () => {
    const fixture = createApp();
    await TestBed.inject(Router).navigateByUrl('/middlegame');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const [aperture, middlegame] = tabs(compiled);
    expect(middlegame.getAttribute('aria-current')).toBe('page');
    expect(middlegame.classList).toContain('section-tab--active');
    expect(aperture.getAttribute('aria-current')).toBeNull();
    expect(compiled.querySelector('.soon-title')?.textContent).toContain('Mediogioco');
  });

  it('moves the current section when navigating to Finale', async () => {
    const fixture = createApp();
    await TestBed.inject(Router).navigateByUrl('/endgame');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const endgame = tabs(compiled)[2];
    expect(endgame.getAttribute('aria-current')).toBe('page');
    expect(compiled.querySelector('.soon-title')?.textContent).toContain('Finale');
  });

  it('keeps Mediogioco as the current section inside its sub-routes (ISSUE-016)', async () => {
    const fixture = createApp();
    const router = TestBed.inject(Router);
    const compiled = fixture.nativeElement as HTMLElement;

    for (const url of [
      '/middlegame/studies/3',
      '/middlegame/positions/4',
      '/middlegame/positions/4/setup',
      '/middlegame/positions/4/edit',
    ]) {
      await router.navigateByUrl(url);
      fixture.detectChanges();

      const [aperture, middlegame, endgame] = tabs(compiled);
      expect(middlegame.getAttribute('aria-current')).toBe('page');
      expect(middlegame.classList).toContain('section-tab--active');
      expect(aperture.getAttribute('aria-current')).toBeNull();
      expect(endgame.getAttribute('aria-current')).toBeNull();
    }
  });

  it('keeps Aperture as the current section inside the opening pages', async () => {
    const fixture = createApp();
    await TestBed.inject(Router).navigateByUrl('/studies/7');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const [aperture, middlegame, endgame] = tabs(compiled);
    expect(aperture.getAttribute('aria-current')).toBe('page');
    expect(middlegame.getAttribute('aria-current')).toBeNull();
    expect(endgame.getAttribute('aria-current')).toBeNull();
  });

  it('keeps Aperture as the current section on the generic position routes (ISSUE-016)', async () => {
    const fixture = createApp();
    await TestBed.inject(Router).navigateByUrl('/variants/4');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const [aperture, middlegame, endgame] = tabs(compiled);
    expect(aperture.getAttribute('aria-current')).toBe('page');
    expect(middlegame.getAttribute('aria-current')).toBeNull();
    expect(endgame.getAttribute('aria-current')).toBeNull();
  });

  // — Comando Connetti/Disconnetti Lichess in topbar (ISSUE-011, R22) —

  it('shows the compact Lichess command in the topbar service cluster', () => {
    const compiled = createApp().nativeElement as HTMLElement;
    const btn = compiled.querySelector<HTMLButtonElement>('.topbar-right .lichess-toggle');
    expect(btn).not.toBeNull();
    expect(btn?.getAttribute('aria-pressed')).toBe('false');
    expect(btn?.getAttribute('aria-label')).toContain('connetti');
    expect(btn?.textContent).toContain('Lichess');
  });

  it('starts the Lichess connection returning to the current page', async () => {
    const fixture = createApp();
    await TestBed.inject(Router).navigateByUrl('/studies/7');
    fixture.detectChanges();

    const btn = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.lichess-toggle');
    btn?.click();
    expect(lichess.connectedWith).toBe('/studies/7');
    expect(lichess.disconnected).toBe(false);
  });

  it('shows the connected state and disconnects on click', () => {
    lichess.state = true;
    const fixture = createApp();
    const btn = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.lichess-toggle');
    expect(btn?.getAttribute('aria-pressed')).toBe('true');
    expect(btn?.classList).toContain('lichess-toggle--on');

    btn?.click();
    expect(lichess.disconnected).toBe(true);
    expect(lichess.connectedWith).toBeNull();
  });
});
