import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Route, Router, provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { StudyList } from './studies/study-list';
import { StudyNew } from './studies/study-new';
import { ComingSoon } from './sections/coming-soon';

function routeFor(path: string): Route {
  const route = routes.find((r) => r.path === path);
  expect(route).toBeDefined();
  return route!;
}

describe('app routes', () => {
  it('keeps the openings home on the root path', () => {
    expect(routeFor('').component).toBe(StudyList);
  });

  it('mounts the shared placeholder on the middlegame section (ISSUE-021)', () => {
    const route = routeFor('middlegame');
    expect(route.component).toBe(ComingSoon);
    expect(route.data).toEqual({ section: 'Mediogioco' });
  });

  it('mounts the shared placeholder on the endgame section (ISSUE-021)', () => {
    const route = routeFor('endgame');
    expect(route.component).toBe(ComingSoon);
    expect(route.data).toEqual({ section: 'Finale' });
  });

  it('declares the unified creation page before the dynamic study route (ISSUE-011)', () => {
    expect(routeFor('studies/new').component).toBe(StudyNew);
    const newIndex = routes.findIndex((r) => r.path === 'studies/new');
    const dynamicIndex = routes.findIndex((r) => r.path === 'studies/:id');
    expect(newIndex).toBeGreaterThanOrEqual(0);
    expect(newIndex).toBeLessThan(dynamicIndex);
  });

  it('redirects the historical import route to the unified page (ISSUE-011)', () => {
    expect(routeFor('studies/import-lichess').redirectTo).toBe('studies/new');
  });

  it('still redirects unknown paths to the openings home', () => {
    expect(routeFor('**').redirectTo).toBe('');
  });
});

describe('app routes (navigation)', () => {
  it('preserves the query params through the historical import redirect (ISSUE-011)', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/studies/import-lichess?studyId=7');
    expect(router.url).toBe('/studies/new?studyId=7');
  });
});
