import { parseLichessStudyUrl, splitPgnGames, parseLichessStudyPgn } from './lichess';

describe('parseLichessStudyUrl', () => {
  it('parses a study link', () => {
    expect(parseLichessStudyUrl('https://lichess.org/study/OR3CU5Je')).toEqual({
      studyId: 'OR3CU5Je',
      chapterId: undefined,
    });
  });

  it('parses a chapter link', () => {
    expect(parseLichessStudyUrl('https://lichess.org/study/OR3CU5Je/dUBaUslK')).toEqual({
      studyId: 'OR3CU5Je',
      chapterId: 'dUBaUslK',
    });
  });

  it('tolerates trailing slash, query string and missing protocol', () => {
    expect(parseLichessStudyUrl('lichess.org/study/OR3CU5Je/?foo=1')?.studyId).toBe('OR3CU5Je');
    expect(parseLichessStudyUrl('http://www.lichess.org/study/OR3CU5Je#x')?.studyId).toBe(
      'OR3CU5Je',
    );
  });

  it('rejects unrelated or malformed links', () => {
    expect(parseLichessStudyUrl('https://example.com/study/OR3CU5Je')).toBeNull();
    expect(parseLichessStudyUrl('https://lichess.org/OR3CU5Je')).toBeNull();
    expect(parseLichessStudyUrl('')).toBeNull();
  });
});

describe('splitPgnGames', () => {
  it('splits a multi-chapter PGN into games', () => {
    const pgn = `[Event "S: Cap 1"]\n\n1. e4 e5 *\n\n[Event "S: Cap 2"]\n\n1. d4 d5 *`;
    const games = splitPgnGames(pgn);
    expect(games.length).toBe(2);
    expect(games[0]).toContain('Cap 1');
    expect(games[1]).toContain('Cap 2');
  });

  it('returns a single game when there is only one', () => {
    expect(splitPgnGames('[Event "Solo"]\n\n1. e4 *').length).toBe(1);
  });

  it('returns [] for blank input', () => {
    expect(splitPgnGames('   ')).toEqual([]);
  });
});

describe('parseLichessStudyPgn', () => {
  const pgn = [
    '[Event "Repertorio: Italiana"]',
    '[Orientation "white"]',
    '',
    '1. e4 e5 2. Nf3 Nc6 3. Bc4 (3. Bb5 a6) *',
    '',
    '[Event "Repertorio: Siciliana"]',
    '[Orientation "black"]',
    '',
    '1. e4 c5 2. Nf3 d6 *',
  ].join('\n');

  it('derives the study name and one chapter per game', () => {
    const result = parseLichessStudyPgn(pgn);
    expect(result.studyName).toBe('Repertorio');
    expect(result.chapters.length).toBe(2);
    expect(result.failed.length).toBe(0);
  });

  it('maps chapter names, colors and variations', () => {
    const result = parseLichessStudyPgn(pgn);
    expect(result.chapters[0].name).toBe('Italiana');
    expect(result.chapters[0].color).toBe('WHITE');
    expect(result.chapters[0].variationCount).toBe(1);
    expect(result.chapters[1].name).toBe('Siciliana');
    expect(result.chapters[1].color).toBe('BLACK');
    expect(result.chapters[1].mainline).toEqual(['e4', 'c5', 'Nf3', 'd6']);
  });

  it('collects unparseable chapters into failed without dropping the good ones', () => {
    const broken = `[Event "S: Buono"]\n\n1. e4 e5 *\n\n[Event "S: Rotto"]\n\n1. e4 e4 *`;
    const result = parseLichessStudyPgn(broken);
    expect(result.chapters.length).toBe(1);
    expect(result.chapters[0].name).toBe('Buono');
    expect(result.failed.length).toBe(1);
    expect(result.failed[0].name).toBe('Rotto');
  });
});
