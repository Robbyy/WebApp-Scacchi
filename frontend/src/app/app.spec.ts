import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router, Routes, provideRouter, withComponentInputBinding } from '@angular/router';
import { App } from './app';
import { ComingSoon } from './sections/coming-soon';

/**
 * Route minime con la stessa forma di `app.routes.ts` per le sezioni: montano
 * solo il segnaposto, così la topbar è verificabile senza pagine che fanno HTTP.
 */
const testRoutes: Routes = [
  { path: '', component: ComingSoon, data: { section: 'Aperture' } },
  { path: 'studies/:id', component: ComingSoon, data: { section: 'Aperture' } },
  { path: 'middlegame', component: ComingSoon, data: { section: 'Mediogioco' } },
  { path: 'endgame', component: ComingSoon, data: { section: 'Finale' } },
];

describe('App', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(testRoutes, withComponentInputBinding()),
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
});
