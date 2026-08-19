import {
  MIDDLEGAME_SECTION_CONTEXT,
  SECTION_CONTEXT_DATA,
  STUDY_SECTION_TABS,
  sectionContextFrom,
  sectionFromUrl,
  sectionLabel,
  sectionPaths,
} from './study-sections';

describe('study sections (ISSUE-021)', () => {
  it('declares the three phases in order with their routes', () => {
    expect(STUDY_SECTION_TABS.map((t) => [t.label, t.link])).toEqual([
      ['Aperture', '/'],
      ['Mediogioco', '/middlegame'],
      ['Finale', '/endgame'],
    ]);
  });

  it('maps the placeholder routes to their section', () => {
    expect(sectionFromUrl('/middlegame')).toBe('middlegame');
    expect(sectionFromUrl('/endgame')).toBe('endgame');
  });

  it('maps every opening route to Aperture', () => {
    expect(sectionFromUrl('/')).toBe('openings');
    expect(sectionFromUrl('/studies/12')).toBe('openings');
    expect(sectionFromUrl('/variants/3/train')).toBe('openings');
    expect(sectionFromUrl('/reviews')).toBe('openings');
    expect(sectionFromUrl('/play')).toBe('openings');
  });

  it('keeps future sub-routes inside their section but not similar prefixes', () => {
    expect(sectionFromUrl('/middlegame/positions/4')).toBe('middlegame');
    expect(sectionFromUrl('/endgame/positions/4')).toBe('endgame');
    expect(sectionFromUrl('/middlegames')).toBe('openings');
  });

  it('ignores query string and fragment', () => {
    expect(sectionFromUrl('/endgame?from=topbar')).toBe('endgame');
    expect(sectionFromUrl('/middlegame#intro')).toBe('middlegame');
  });
});

describe('section route context (ISSUE-016)', () => {
  it('describes the middlegame routes with phase, base and position mode', () => {
    expect(MIDDLEGAME_SECTION_CONTEXT).toEqual({
      section: 'middlegame',
      phase: 'MIDDLEGAME',
      base: '/middlegame',
      positionMode: true,
    });
    expect(sectionFromUrl(MIDDLEGAME_SECTION_CONTEXT.base)).toBe('middlegame');
  });

  it('labels a section like its topbar tab', () => {
    expect(sectionLabel('middlegame')).toBe('Mediogioco');
    expect(sectionLabel('endgame')).toBe('Finale');
    expect(sectionLabel('openings')).toBe('Aperture');
    expect(sectionLabel(MIDDLEGAME_SECTION_CONTEXT.section)).toBe('Mediogioco');
  });

  it('reads the context declared in the route data', () => {
    const data = { [SECTION_CONTEXT_DATA]: MIDDLEGAME_SECTION_CONTEXT };
    expect(sectionContextFrom(data)).toBe(MIDDLEGAME_SECTION_CONTEXT);
  });

  it('has no context on the generic opening routes', () => {
    expect(sectionContextFrom(undefined)).toBeNull();
    expect(sectionContextFrom(null)).toBeNull();
    expect(sectionContextFrom({})).toBeNull();
    expect(sectionContextFrom({ section: 'Finale' })).toBeNull();
  });

  it('builds the canonical middlegame paths from the context', () => {
    const paths = sectionPaths(MIDDLEGAME_SECTION_CONTEXT);
    expect(paths.studyList).toBe('/middlegame');
    expect(paths.newStudy).toBe('/middlegame/studies/new');
    expect(paths.study(7)).toBe('/middlegame/studies/7');
    expect(paths.newPosition).toBe('/middlegame/positions/new');
    expect(paths.position(4)).toBe('/middlegame/positions/4');
    expect(paths.positionSetup(4)).toBe('/middlegame/positions/4/setup');
    expect(paths.positionEdit(4)).toBe('/middlegame/positions/4/edit');
    // R26.3, task 1.2: rotte canoniche dello studio guidato.
    expect(paths.positionStudy(4)).toBe('/middlegame/positions/4/study');
    expect(paths.studyStudy(7)).toBe('/middlegame/studies/7/study');
  });

  it('keeps every canonical path inside the middlegame section', () => {
    const paths = sectionPaths(MIDDLEGAME_SECTION_CONTEXT);
    const all = [
      paths.studyList,
      paths.newStudy,
      paths.study(7),
      paths.newPosition,
      paths.position(4),
      paths.positionSetup(4),
      paths.positionEdit(4),
      paths.positionStudy(4),
      paths.studyStudy(7),
    ];
    expect(all.map(sectionFromUrl)).toEqual(all.map(() => 'middlegame'));
  });

  it('falls back to the pre-R26 generic paths without a context', () => {
    const paths = sectionPaths(null);
    expect(paths.studyList).toBe('/');
    expect(paths.newStudy).toBe('/studies/new');
    expect(paths.study(7)).toBe('/studies/7');
    expect(paths.newPosition).toBe('/positions/new');
    expect(paths.position(4)).toBe('/variants/4');
    expect(paths.positionSetup(4)).toBe('/positions/4/edit');
    expect(paths.positionEdit(4)).toBe('/variants/4/edit');
    expect(paths.studyList).toBe(sectionPaths(undefined).studyList);
  });
});
