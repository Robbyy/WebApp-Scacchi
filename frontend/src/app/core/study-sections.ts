/**
 * Sezioni di studio della topbar (ISSUE-021): la struttura a tre fasi del gioco
 * usata dalla navigazione principale. Le route sono in inglese come quelle già
 * esistenti (`/studies`, `/variants`, `/play`) e coerenti con i valori di dominio
 * `OPENING`/`MIDDLEGAME`/`ENDGAME` di `Study.phase`.
 */
export type StudySection = 'openings' | 'middlegame' | 'endgame';

/** Voce di navigazione: etichetta visibile e route di destinazione. */
export interface StudySectionTab {
  readonly id: StudySection;
  readonly label: string;
  readonly link: string;
}

/** Le tre voci mostrate nella topbar, nell'ordine delle fasi di gioco. */
export const STUDY_SECTION_TABS: readonly StudySectionTab[] = [
  { id: 'openings', label: 'Aperture', link: '/' },
  { id: 'middlegame', label: 'Mediogioco', link: '/middlegame' },
  { id: 'endgame', label: 'Finale', link: '/endgame' },
];

/**
 * Sezione attiva ricavata dall'URL corrente. Tutto ciò che non è Mediogioco o
 * Finale appartiene alle Aperture (`/`, `/studies/...`, `/variants/...`,
 * `/reviews`, `/play`), così il tab resta evidenziato anche nelle pagine di
 * dettaglio. Il prefisso include le eventuali sotto-route future (ISSUE-016).
 */
export function sectionFromUrl(url: string): StudySection {
  const path = url.split(/[?#]/, 1)[0];
  if (path === '/middlegame' || path.startsWith('/middlegame/')) {
    return 'middlegame';
  }
  if (path === '/endgame' || path.startsWith('/endgame/')) {
    return 'endgame';
  }
  return 'openings';
}
