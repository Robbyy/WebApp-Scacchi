import { GamePhase } from './study.model';

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

/** Etichetta visibile di una sezione: la stessa mostrata dai tab della topbar. */
export function sectionLabel(section: StudySection): string {
  return STUDY_SECTION_TABS.find((tab) => tab.id === section)?.label ?? '';
}

/**
 * Contesto dichiarato nei `data` di una route di sezione (ISSUE-016): descrive
 * la sezione, la fase attesa dallo studio (o dallo studio padre di una
 * posizione), la base canonica degli URL e la terminologia posizionale. I
 * componenti condivisi restano unici e leggono da qui, invece di dedurre la
 * sezione dal proprio URL. Le route generiche delle Aperture non lo dichiarano.
 */
export interface SectionRouteContext {
  /** Sezione della topbar a cui appartengono le route. */
  readonly section: StudySection;
  /** Fase che lo studio deve avere esattamente per essere presentato qui. */
  readonly phase: GamePhase;
  /** Base canonica degli URL della sezione, es. `/middlegame`. */
  readonly base: string;
  /** `true` quando i figli dello studio sono posizioni e non varianti. */
  readonly positionMode: boolean;
}

/** Chiave con cui il contesto viaggia nei `data` della route. */
export const SECTION_CONTEXT_DATA = 'sectionContext';

/** Contesto delle route `/middlegame/...` (ISSUE-016); il Finale arriva con R27. */
export const MIDDLEGAME_SECTION_CONTEXT: SectionRouteContext = {
  section: 'middlegame',
  phase: 'MIDDLEGAME',
  base: '/middlegame',
  positionMode: true,
};

/**
 * Contesto dichiarato dalla route corrente, `null` sulle route generiche: i
 * componenti montati dalle Aperture mantengono così il comportamento storico.
 */
export function sectionContextFrom(
  data: { readonly [key: string]: unknown } | null | undefined,
): SectionRouteContext | null {
  return (data?.[SECTION_CONTEXT_DATA] as SectionRouteContext | undefined) ?? null;
}

/**
 * Percorsi canonici di studi e posizioni di una sezione. Senza contesto restano
 * i percorsi generici pre-R26 usati dalle Aperture (`/studies/…`,
 * `/variants/…`, `/positions/…`).
 */
export interface SectionPaths {
  /** Lista degli studi della sezione. */
  readonly studyList: string;
  /** Creazione di uno studio della sezione. */
  readonly newStudy: string;
  /** Dettaglio di uno studio. */
  study(studyId: number): string;
  /** Creazione di una posizione: richiede `?studyId=…` come query param. */
  readonly newPosition: string;
  /** Dettaglio in consultazione di una posizione. */
  position(positionId: number): string;
  /** Editor della posizione iniziale/FEN. */
  positionSetup(positionId: number): string;
  /** Editor dell'albero di mosse. */
  positionEdit(positionId: number): string;
  /** Tentativo manuale dello studio guidato (R26.3), una sola posizione. */
  positionStudy(positionId: number): string;
  /** Configurazione ed esecuzione dello studio guidato sequenziale (R26.3). */
  studyStudy(studyId: number): string;
}

/** Costruisce i percorsi della sezione dal contesto di route (o dalle Aperture). */
export function sectionPaths(context: SectionRouteContext | null | undefined): SectionPaths {
  if (!context) {
    return {
      studyList: '/',
      newStudy: '/studies/new',
      study: (studyId) => `/studies/${studyId}`,
      newPosition: '/positions/new',
      position: (positionId) => `/variants/${positionId}`,
      positionSetup: (positionId) => `/positions/${positionId}/edit`,
      positionEdit: (positionId) => `/variants/${positionId}/edit`,
      // Nessuna route generica di studio guidato (R26.3): esiste soltanto
      // sotto `/middlegame`. Simmetrico agli altri metodi per non rendere
      // opzionale l'interfaccia; mai linkato fuori sezione (gate a monte).
      positionStudy: (positionId) => `/positions/${positionId}/study`,
      studyStudy: (studyId) => `/studies/${studyId}/study`,
    };
  }
  const base = context.base;
  return {
    studyList: base,
    newStudy: `${base}/studies/new`,
    study: (studyId) => `${base}/studies/${studyId}`,
    newPosition: `${base}/positions/new`,
    position: (positionId) => `${base}/positions/${positionId}`,
    positionSetup: (positionId) => `${base}/positions/${positionId}/setup`,
    positionEdit: (positionId) => `${base}/positions/${positionId}/edit`,
    positionStudy: (positionId) => `${base}/positions/${positionId}/study`,
    studyStudy: (studyId) => `${base}/studies/${studyId}/study`,
  };
}
