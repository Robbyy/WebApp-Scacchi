import { Routes } from '@angular/router';
import { StudyList } from './studies/study-list';
import { StudyDetail } from './studies/study-detail';
import { StudyNew } from './studies/study-new';
import { LichessCallback } from './studies/lichess-callback';
import { VariantList } from './variants/variant-list';
import { VariantEditor } from './variants/variant-editor';
import { PgnImport } from './variants/pgn-import';
import { VariantDetail } from './variants/variant-detail';
import { VariantTraining } from './variants/variant-training';
import { VariantStats } from './stats/variant-stats';
import { StudyStats } from './stats/study-stats';
import { ReviewDue } from './reviews/review-due';
import { PlayVsComputer } from './play/play';
import { ComingSoon } from './sections/coming-soon';
import { canLeaveEditor } from './variants/can-deactivate.guard';
import { PositionEditor } from './positions/position-editor';
import { MIDDLEGAME_SECTION_CONTEXT, SECTION_CONTEXT_DATA } from './core/study-sections';
import { PositionStudyList } from './sections/position-study-list';
import { PositionStudyNew } from './sections/position-study-new';
import { GuidedStudyPosition } from './guided-study/guided-study-position';
import { GuidedStudySequence } from './guided-study/guided-study-sequence';

export const routes: Routes = [
  { path: '', component: StudyList },
  // Sezione Mediogioco (ISSUE-016): route strutturale senza componente, così i
  // `data` con il contesto di sezione (fase attesa, base canonica, modalità
  // posizione) sono ereditati da tutte le sotto-route. Lista e creazione sono
  // pagine posizionali dedicate, riusabili dal Finale; studio, posizione ed
  // editor riusano i componenti condivisi con le Aperture.
  {
    path: 'middlegame',
    data: { [SECTION_CONTEXT_DATA]: MIDDLEGAME_SECTION_CONTEXT },
    children: [
      { path: '', component: PositionStudyList },
      // Creazione manuale, senza il flusso Lichess di `StudyNew` (ISSUE-016).
      // Dichiarata prima di `studies/:id`, così `new` non è letto come id.
      { path: 'studies/new', component: PositionStudyNew },
      // Studio guidato sequenziale (R26.3, design decisione 1): canonica e
      // precedente a `studies/:id`, così `study` non viene letto come id.
      { path: 'studies/:id/study', component: GuidedStudySequence },
      { path: 'studies/:id', component: StudyDetail },
      // Le route statiche precedono le dinamiche e `setup`/`edit` precedono il
      // dettaglio della posizione: `new` non viene catturato come id e la route
      // di consultazione non intercetta i due editor.
      { path: 'positions/new', component: PositionEditor, canDeactivate: [canLeaveEditor] },
      { path: 'positions/:id/setup', component: PositionEditor, canDeactivate: [canLeaveEditor] },
      { path: 'positions/:id/edit', component: VariantEditor, canDeactivate: [canLeaveEditor] },
      // Tentativo manuale dello studio guidato (R26.3): canonica e precedente
      // a `positions/:id`, così `study` non viene letto come id.
      { path: 'positions/:id/study', component: GuidedStudyPosition },
      { path: 'positions/:id', component: VariantDetail },
    ],
  },
  // Sezione Finale (ISSUE-021): ancora sul segnaposto riusabile, che riceve
  // `section` come input dalla route. Arriva con `issue-016-endgame-section`.
  { path: 'endgame', component: ComingSoon, data: { section: 'Finale' } },
  { path: 'reviews', component: ReviewDue },
  { path: 'play', component: PlayVsComputer },
  { path: 'lichess/callback', component: LichessCallback },
  // Pagina unica di creazione/import studio (ISSUE-011): dichiarata prima della
  // route dinamica `studies/:id`, così `new` non viene catturato come id.
  { path: 'studies/new', component: StudyNew },
  // Route storica dell'import Lichess, confluita nella pagina unificata. Il
  // redirect relativo preserva i query param (es. `?studyId=…`).
  { path: 'studies/import-lichess', redirectTo: 'studies/new' },
  { path: 'studies/:id/stats', component: StudyStats },
  { path: 'studies/:id', component: StudyDetail },
  { path: 'variants', component: VariantList },
  { path: 'positions/new', component: PositionEditor, canDeactivate: [canLeaveEditor] },
  { path: 'positions/:id/edit', component: PositionEditor, canDeactivate: [canLeaveEditor] },
  { path: 'variants/new', component: VariantEditor, canDeactivate: [canLeaveEditor] },
  { path: 'variants/import', component: PgnImport },
  { path: 'variants/:id', component: VariantDetail },
  { path: 'variants/:id/edit', component: VariantEditor, canDeactivate: [canLeaveEditor] },
  { path: 'variants/:id/train', component: VariantTraining },
  { path: 'variants/:id/stats', component: VariantStats },
  { path: '**', redirectTo: '' },
];
