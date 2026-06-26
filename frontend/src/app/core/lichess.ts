import { MoveNode, VariantColor } from './variant.model';
import { parsePgnTree } from './pgn';

/**
 * Logica pura per l'import di studi pubblici Lichess (Prototipo 14): parsing del
 * link, split del PGN multi-capitolo e mappatura di ogni capitolo su una variante
 * locale. Il parsing delle mosse riusa {@link parsePgnTree} (P13): nessun secondo
 * parser. Il fetch di rete è separato in `LichessService`.
 */
export interface LichessStudyRef {
  studyId: string;
  chapterId?: string;
}

/**
 * Estrae `studyId` ed eventuale `chapterId` da un link Lichess. Accetta URL
 * completi (anche senza protocollo, con slash finale o query string) nelle forme
 * `lichess.org/study/{studyId}` e `lichess.org/study/{studyId}/{chapterId}`.
 * Restituisce `null` se il link non è riconosciuto.
 */
export function parseLichessStudyUrl(input: string): LichessStudyRef | null {
  if (!input) {
    return null;
  }
  const match = input
    .trim()
    .match(/lichess\.org\/study\/([A-Za-z0-9]{8})(?:\/([A-Za-z0-9]{8}))?/);
  if (!match) {
    return null;
  }
  return { studyId: match[1], chapterId: match[2] || undefined };
}

/** Capitolo importato con successo (pronto a diventare una variante locale). */
export interface ImportedChapter {
  name: string;
  color: VariantColor;
  tree: MoveNode[];
  mainline: string[];
  nodeCount: number;
  variationCount: number;
  sourcePgn: string;
}

/** Capitolo che non è stato possibile importare (es. mossa illegale, posizione custom). */
export interface ImportedChapterError {
  name: string;
  error: string;
}

export interface LichessStudyImport {
  studyName: string;
  chapters: ImportedChapter[];
  failed: ImportedChapterError[];
}

/**
 * Divide un PGN multi-partita (lo studio Lichess) nei singoli blocchi-capitolo.
 * Ogni capitolo inizia con un tag `[Event ...]` a inizio riga.
 */
export function splitPgnGames(pgn: string): string[] {
  const normalized = pgn.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!normalized) {
    return [];
  }
  return normalized
    .split(/\n(?=\[Event\s)/)
    .map((block) => block.trim())
    .filter(Boolean);
}

/** Legge il valore di un tag PGN `[Name "value"]`, o `null` se assente. */
function pgnTag(pgn: string, name: string): string | null {
  const match = pgn.match(new RegExp('\\[' + name + '\\s+"([^"]*)"\\]'));
  return match ? match[1] : null;
}

/** Dal tag `[Event "Studio: Capitolo"]` ricava nome studio e nome capitolo. */
function namesFromEvent(event: string | null, index: number): { study: string; chapter: string } {
  const fallback = `Capitolo ${index + 1}`;
  if (!event) {
    return { study: '', chapter: fallback };
  }
  const sep = event.indexOf(': ');
  if (sep >= 0) {
    return {
      study: event.slice(0, sep).trim(),
      chapter: event.slice(sep + 2).trim() || fallback,
    };
  }
  return { study: '', chapter: event.trim() || fallback };
}

/** Orientamento del capitolo Lichess → lato da allenare (default Bianco). */
function colorFromOrientation(pgn: string): VariantColor {
  return pgnTag(pgn, 'Orientation') === 'black' ? 'BLACK' : 'WHITE';
}

/**
 * Trasforma il PGN di uno studio Lichess in capitoli importabili. I capitoli con
 * mosse illegali o posizioni di partenza non standard finiscono in `failed` con
 * un messaggio, senza bloccare gli altri.
 */
export function parseLichessStudyPgn(pgn: string): LichessStudyImport {
  const games = splitPgnGames(pgn);
  const chapters: ImportedChapter[] = [];
  const failed: ImportedChapterError[] = [];
  let studyName = '';

  games.forEach((game, index) => {
    const names = namesFromEvent(pgnTag(game, 'Event'), index);
    if (!studyName && names.study) {
      studyName = names.study;
    }
    const parsed = parsePgnTree(game);
    if (!parsed.ok) {
      failed.push({ name: names.chapter, error: parsed.error });
      return;
    }
    chapters.push({
      name: names.chapter,
      color: colorFromOrientation(game),
      tree: parsed.value.tree,
      mainline: parsed.value.mainline,
      nodeCount: parsed.value.nodeCount,
      variationCount: parsed.value.variationCount,
      sourcePgn: game,
    });
  });

  return { studyName: studyName || 'Studio importato', chapters, failed };
}
