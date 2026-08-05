import { Route } from '@angular/router';
import { routes } from './app.routes';
import { StudyList } from './studies/study-list';
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

  it('still redirects unknown paths to the openings home', () => {
    expect(routeFor('**').redirectTo).toBe('');
  });
});
