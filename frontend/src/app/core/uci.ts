/**
 * Parsing minimale dell'output UCI di Stockfish (Prototipo 16) e formattazione
 * della valutazione per la barra. Logica pura, testabile senza il Web Worker.
 */
import { Chess } from 'chess.js';

export interface UciScore {
  depth: number;
  /** Centipawn dal punto di vista del Bianco (null se è matto). */
  scoreCp: number | null;
  /** Matto in N dal punto di vista del Bianco (positivo = matta il Bianco). */
  mate: number | null;
  /**
   * Linea principale completa in coordinate UCI (ISSUE-022), es.
   * `['e2e4', 'e7e5', 'g1f3']`. Vuota se la riga non porta una `pv`.
   */
  pv: string[];
}

/** Una mossa UCI: caselle di partenza/arrivo più l'eventuale promozione. */
const UCI_MOVE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

/**
 * Interpreta una riga `info ... score ...`. Lo score di Stockfish è dal punto di
 * vista del lato al tratto: viene convertito al punto di vista del Bianco usando
 * {@code sideToMove}. Ritorna null se la riga non porta una valutazione.
 */
export function parseInfoLine(line: string, sideToMove: 'w' | 'b'): UciScore | null {
  if (!line.startsWith('info') || !line.includes('score')) {
    return null;
  }
  const sign = sideToMove === 'b' ? -1 : 1;
  const depth = numberAfter(line, /\bdepth (\d+)/);
  const cp = numberAfter(line, /score cp (-?\d+)/);
  const mate = numberAfter(line, /score mate (-?\d+)/);
  return {
    depth: depth ?? 0,
    scoreCp: cp === null ? null : cp * sign,
    mate: mate === null ? null : mate * sign,
    pv: parsePv(line),
  };
}

/** Estrae la mossa da una riga `bestmove e2e4 ...`; null se "(none)" o assente. */
export function parseBestMove(line: string): string | null {
  const match = line.match(/^bestmove (\S+)/);
  if (!match || match[1] === '(none)') {
    return null;
  }
  return match[1];
}

/**
 * Converte la linea principale UCI in SAN partendo da {@code fen} (ISSUE-022).
 * Si ferma alla prima mossa non applicabile invece di scartare l'intera linea:
 * meglio una PV parziale che nessuna linea.
 */
export function pvToSan(fen: string, pv: string[]): string[] {
  if (!fen || pv.length === 0) {
    return [];
  }
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return [];
  }
  const sans: string[] = [];
  for (const uci of pv) {
    if (!UCI_MOVE.test(uci)) {
      break;
    }
    try {
      sans.push(
        chess.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci.length > 4 ? uci[4] : undefined,
        }).san,
      );
    } catch {
      break;
    }
  }
  return sans;
}

/**
 * Numera una linea SAN a partire dalla posizione analizzata: `"12. Nf3 Nc6 13. Bb5"`,
 * oppure `"12… Nc6 13. Bb5"` se nella FEN muove il Nero.
 */
export function numberedPv(fen: string, sans: string[]): string {
  if (sans.length === 0) {
    return '';
  }
  const fields = fen.split(' ');
  let blackToMove = fields[1] === 'b';
  const parsed = Number(fields[5]);
  let moveNumber = Number.isFinite(parsed) && parsed >= 1 ? Math.trunc(parsed) : 1;

  const out: string[] = [];
  for (const san of sans) {
    if (!blackToMove) {
      out.push(`${moveNumber}.`);
    } else if (out.length === 0) {
      // La linea parte a metà mossa: si annota "12…" una sola volta.
      out.push(`${moveNumber}…`);
    }
    out.push(san);
    if (blackToMove) {
      moveNumber++;
    }
    blackToMove = !blackToMove;
  }
  return out.join(' ');
}

/**
 * Formatta una valutazione per la barra: testo leggibile (es. "+1.5", "-0.8",
 * "#3", "#-2") e una frazione 0..1 che indica quanto è in vantaggio il Bianco.
 */
export function formatEval(score: UciScore): { text: string; whiteFraction: number } {
  if (score.mate !== null) {
    const text = `#${score.mate}`;
    const whiteFraction = score.mate > 0 ? 0.98 : score.mate < 0 ? 0.02 : 0.5;
    return { text, whiteFraction };
  }
  if (score.scoreCp === null) {
    return { text: '0.0', whiteFraction: 0.5 };
  }
  const pawns = score.scoreCp / 100;
  const text = `${pawns > 0 ? '+' : ''}${pawns.toFixed(1)}`;
  // Sigmoide (scala ~Elo): mappa i centipawn su una probabilità di vantaggio.
  const raw = 1 / (1 + Math.pow(10, -score.scoreCp / 400));
  const whiteFraction = Math.min(0.98, Math.max(0.02, raw));
  return { text, whiteFraction };
}

/**
 * Sequenza di mosse dopo il token `pv`. Si ferma al primo token che non è una
 * mossa UCI, così eventuali campi emessi dopo la linea non finiscono nella PV.
 */
function parsePv(line: string): string[] {
  const idx = line.indexOf(' pv ');
  if (idx < 0) {
    return [];
  }
  const moves: string[] = [];
  for (const token of line.slice(idx + 4).trim().split(/\s+/)) {
    if (!UCI_MOVE.test(token)) {
      break;
    }
    moves.push(token);
  }
  return moves;
}

function numberAfter(line: string, re: RegExp): number | null {
  const match = line.match(re);
  return match ? Number(match[1]) : null;
}
