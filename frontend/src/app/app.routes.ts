import { Routes } from '@angular/router';
import { StudyList } from './studies/study-list';
import { StudyDetail } from './studies/study-detail';
import { LichessImport } from './studies/lichess-import';
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
import { canLeaveEditor } from './variants/can-deactivate.guard';

export const routes: Routes = [
  { path: '', component: StudyList },
  { path: 'reviews', component: ReviewDue },
  { path: 'play', component: PlayVsComputer },
  { path: 'lichess/callback', component: LichessCallback },
  { path: 'studies/import-lichess', component: LichessImport },
  { path: 'studies/:id/stats', component: StudyStats },
  { path: 'studies/:id', component: StudyDetail },
  { path: 'variants', component: VariantList },
  { path: 'variants/new', component: VariantEditor, canDeactivate: [canLeaveEditor] },
  { path: 'variants/import', component: PgnImport },
  { path: 'variants/:id', component: VariantDetail },
  { path: 'variants/:id/edit', component: VariantEditor, canDeactivate: [canLeaveEditor] },
  { path: 'variants/:id/train', component: VariantTraining },
  { path: 'variants/:id/stats', component: VariantStats },
  { path: '**', redirectTo: '' },
];
