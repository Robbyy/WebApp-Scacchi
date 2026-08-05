import { STUDY_SECTION_TABS, sectionFromUrl } from './study-sections';

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
