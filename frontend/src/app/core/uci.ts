/**
 * Parsing minimale dell'output UCI di Stockfish (Prototipo 16) e formattazione
 * della valutazione per la barra. Logica pura, testabile senza il Web Worker.
 */
export interface UciScore {
  depth: number;
  /** Centipawn dal punto di vista del Bianco (null se è matto). */
  scoreCp: number | null;
  /** Matto in N dal punto di vista del Bianco (positivo = matta il Bianco). */
  mate: number | null;
  /** Prima mossa della linea principale (bestmove provvisorio), se presente. */
  pv: string | null;
}

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
  const pvMatch = line.match(/\bpv (\S+)/);
  return {
    depth: depth ?? 0,
    scoreCp: cp === null ? null : cp * sign,
    mate: mate === null ? null : mate * sign,
    pv: pvMatch ? pvMatch[1] : null,
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

function numberAfter(line: string, re: RegExp): number | null {
  const match = line.match(re);
  return match ? Number(match[1]) : null;
}
