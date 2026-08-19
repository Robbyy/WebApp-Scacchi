import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, Route, Router, provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { StudyList } from './studies/study-list';
import { StudyDetail } from './studies/study-detail';
import { StudyNew } from './studies/study-new';
import { ComingSoon } from './sections/coming-soon';
import { PositionEditor } from './positions/position-editor';
import { VariantDetail } from './variants/variant-detail';
import { VariantEditor } from './variants/variant-editor';
import { canLeaveEditor } from './variants/can-deactivate.guard';
import { MIDDLEGAME_SECTION_CONTEXT, sectionContextFrom } from './core/study-sections';
import { PositionStudyList } from './sections/position-study-list';
import { PositionStudyNew } from './sections/position-study-new';
import { GuidedStudyPosition } from './guided-study/guided-study-position';
import { GuidedStudySequence } from './guided-study/guided-study-sequence';

function routeFor(path: string): Route {
  const route = routes.find((r) => r.path === path);
  expect(route).toBeDefined();
  return route!;
}

/** Sotto-route dichiarate dalla route strutturale `/middlegame` (ISSUE-016). */
function middlegameChildren(): Route[] {
  const children = routeFor('middlegame').children;
  expect(children).toBeDefined();
  return children!;
}

function middlegameRouteFor(path: string): Route {
  const route = middlegameChildren().find((r) => r.path === path);
  expect(route).toBeDefined();
  return route!;
}

function middlegameIndexOf(path: string): number {
  const index = middlegameChildren().findIndex((r) => r.path === path);
  expect(index).toBeGreaterThanOrEqual(0);
  return index;
}

describe('app routes', () => {
  it('keeps the openings home on the root path', () => {
    expect(routeFor('').component).toBe(StudyList);
  });

  it('mounts the middlegame section on a structural route with its context (ISSUE-016)', () => {
    const route = routeFor('middlegame');
    expect(route.component).toBeUndefined();
    expect(route.data).toEqual({ sectionContext: MIDDLEGAME_SECTION_CONTEXT });
    expect(sectionContextFrom(route.data)).toBe(MIDDLEGAME_SECTION_CONTEXT);
    expect(middlegameRouteFor('').component).toBe(PositionStudyList);
  });

  it('mounts the shared study and position pages under the middlegame prefix (ISSUE-016)', () => {
    expect(middlegameRouteFor('studies/:id').component).toBe(StudyDetail);
    expect(middlegameRouteFor('positions/new').component).toBe(PositionEditor);
    expect(middlegameRouteFor('positions/:id/setup').component).toBe(PositionEditor);
    expect(middlegameRouteFor('positions/:id/edit').component).toBe(VariantEditor);
    expect(middlegameRouteFor('positions/:id').component).toBe(VariantDetail);
  });

  it('mounts the guided-study entry points on their canonical routes (R26.3, task 1.2)', () => {
    expect(middlegameRouteFor('positions/:id/study').component).toBe(GuidedStudyPosition);
    expect(middlegameRouteFor('studies/:id/study').component).toBe(GuidedStudySequence);
  });

  it('mounts the manual creation page on the middlegame section (ISSUE-016)', () => {
    const route = middlegameRouteFor('studies/new');
    expect(route.component).toBe(PositionStudyNew);
    // Niente segnaposto e niente `StudyNew`: la sezione non espone Lichess.
    expect(route.component).not.toBe(ComingSoon);
    expect(route.component).not.toBe(StudyNew);
  });

  it('guards the middlegame editors against unsaved changes (ISSUE-016)', () => {
    for (const path of ['positions/new', 'positions/:id/setup', 'positions/:id/edit']) {
      expect(middlegameRouteFor(path).canDeactivate).toEqual([canLeaveEditor]);
    }
  });

  it('declares the static middlegame routes before the dynamic ones (ISSUE-016)', () => {
    expect(middlegameIndexOf('studies/new')).toBeLessThan(middlegameIndexOf('studies/:id'));
    expect(middlegameIndexOf('positions/new')).toBeLessThan(middlegameIndexOf('positions/:id'));
    expect(middlegameIndexOf('positions/:id/setup')).toBeLessThan(middlegameIndexOf('positions/:id'));
    expect(middlegameIndexOf('positions/:id/edit')).toBeLessThan(middlegameIndexOf('positions/:id'));
  });

  it('declares the guided-study routes before the concurrent dynamic ones (R26.3, design decision 1)', () => {
    expect(middlegameIndexOf('studies/:id/study')).toBeLessThan(middlegameIndexOf('studies/:id'));
    expect(middlegameIndexOf('positions/:id/study')).toBeLessThan(middlegameIndexOf('positions/:id'));
  });

  it('mounts the shared placeholder on the endgame section (ISSUE-021)', () => {
    const route = routeFor('endgame');
    expect(route.component).toBe(ComingSoon);
    expect(route.data).toEqual({ section: 'Finale' });
    expect(route.children).toBeUndefined();
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

  it('keeps the generic opening routes unchanged (ISSUE-016)', () => {
    expect(routeFor('studies/:id').component).toBe(StudyDetail);
    expect(routeFor('variants/:id').component).toBe(VariantDetail);
    expect(routeFor('variants/:id/edit').component).toBe(VariantEditor);
    expect(routeFor('positions/new').component).toBe(PositionEditor);
    expect(routeFor('positions/:id/edit').component).toBe(PositionEditor);
  });

  it('still redirects unknown paths to the openings home', () => {
    expect(routeFor('**').redirectTo).toBe('');
  });
});

describe('app routes (navigation)', () => {
  /** Foglia dello stato del router: la route effettivamente selezionata. */
  function matched(router: Router): ActivatedRouteSnapshot {
    let route = router.routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('preserves the query params through the historical import redirect (ISSUE-011)', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/studies/import-lichess?studyId=7');
    expect(router.url).toBe('/studies/new?studyId=7');
  });

  it('opens the middlegame list on the section root (ISSUE-016)', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/middlegame');
    expect(router.url).toBe('/middlegame');
    expect(matched(router).component).toBe(PositionStudyList);
  });

  it('matches the static middlegame routes before the dynamic ones (ISSUE-016)', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/middlegame/studies/new');
    expect(matched(router).component).toBe(PositionStudyNew);
  });

  it('keeps the studyId query param on the new position route (ISSUE-016)', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/middlegame/positions/new?studyId=7');
    expect(router.url).toBe('/middlegame/positions/new?studyId=7');
    const route = matched(router);
    expect(route.component).toBe(PositionEditor);
    expect(route.queryParamMap.get('studyId')).toBe('7');
  });

  it('separates the position detail from its two editors (ISSUE-016)', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/middlegame/positions/4/setup');
    const route = matched(router);
    expect(route.component).toBe(PositionEditor);
    expect(route.paramMap.get('id')).toBe('4');
  });

  it('inherits the section context on the middlegame sub-routes (ISSUE-016)', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/middlegame/positions/4');
    const route = matched(router);
    expect(route.component).toBe(VariantDetail);
    expect(sectionContextFrom(route.data)).toBe(MIDDLEGAME_SECTION_CONTEXT);
  });

  it('leaves the opening routes without a section context (ISSUE-016)', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/variants/4');
    const route = matched(router);
    expect(route.component).toBe(VariantDetail);
    expect(sectionContextFrom(route.data)).toBeNull();
  });

  it('opens the manual guided-study route and inherits the section context (R26.3)', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/middlegame/positions/4/study');
    const route = matched(router);
    expect(route.component).toBe(GuidedStudyPosition);
    expect(route.paramMap.get('id')).toBe('4');
    expect(sectionContextFrom(route.data)).toBe(MIDDLEGAME_SECTION_CONTEXT);
  });

  it('opens the sequential guided-study route and inherits the section context (R26.3)', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/middlegame/studies/6/study');
    const route = matched(router);
    expect(route.component).toBe(GuidedStudySequence);
    expect(route.paramMap.get('id')).toBe('6');
    expect(sectionContextFrom(route.data)).toBe(MIDDLEGAME_SECTION_CONTEXT);
  });

  it('still matches the position and study detail routes unchanged (R26.3 regression)', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/middlegame/positions/4');
    expect(matched(router).component).toBe(VariantDetail);
    await router.navigateByUrl('/middlegame/studies/6');
    expect(matched(router).component).toBe(StudyDetail);
  });

  it('still shows the placeholder on the endgame section (ISSUE-016)', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/endgame');
    expect(router.url).toBe('/endgame');
    expect(matched(router).component).toBe(ComingSoon);
  });
});

describe('app routes — perimetro dello studio guidato (R26.3, task 8.3/8.4)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  /** Ultima route attraversata dalla navigazione corrente. */
  function matched(router: Router): ActivatedRouteSnapshot {
    let route = router.routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route;
  }

  it('declares the guided-study components only under the middlegame section', () => {
    const guided = [GuidedStudyPosition, GuidedStudySequence];
    const outside = routes.filter(
      (r) => r.path !== 'middlegame' && r.component && guided.includes(r.component as never),
    );
    expect(outside).toEqual([]);
    // E nessuna route figlia di un'altra sezione monta gli stessi componenti.
    expect(
      middlegameChildren().filter((r) => guided.includes(r.component as never)).length,
    ).toBe(2);
  });

  it('does not expose a guided-study route on the openings paths', async () => {
    const router = TestBed.inject(Router);
    for (const url of ['/studies/6/study', '/variants/4/study', '/positions/4/study']) {
      await router.navigateByUrl(url).catch(() => undefined);
      const component = matched(router).component;
      expect(component).not.toBe(GuidedStudyPosition);
      expect(component).not.toBe(GuidedStudySequence);
    }
  });

  it('does not expose a guided-study route on the endgame section (R27 perimeter)', async () => {
    const router = TestBed.inject(Router);
    for (const url of ['/endgame/studies/6/study', '/endgame/positions/4/study']) {
      await router.navigateByUrl(url).catch(() => undefined);
      const component = matched(router).component;
      expect(component).not.toBe(GuidedStudyPosition);
      expect(component).not.toBe(GuidedStudySequence);
    }
    // La sezione resta sul segnaposto pianificato per R27.
    await router.navigateByUrl('/endgame');
    expect(matched(router).component).toBe(ComingSoon);
  });
});
