import { Routes } from '@angular/router';
import { StudyList } from './studies/study-list';
import { StudyDetail } from './studies/study-detail';
import { VariantList } from './variants/variant-list';
import { VariantEditor } from './variants/variant-editor';
import { PgnImport } from './variants/pgn-import';
import { VariantDetail } from './variants/variant-detail';
import { VariantTraining } from './variants/variant-training';
import { canLeaveEditor } from './variants/can-deactivate.guard';

export const routes: Routes = [
  { path: '', component: StudyList },
  { path: 'studies/:id', component: StudyDetail },
  { path: 'variants', component: VariantList },
  { path: 'variants/new', component: VariantEditor, canDeactivate: [canLeaveEditor] },
  { path: 'variants/import', component: PgnImport },
  { path: 'variants/:id', component: VariantDetail },
  { path: 'variants/:id/edit', component: VariantEditor, canDeactivate: [canLeaveEditor] },
  { path: 'variants/:id/train', component: VariantTraining },
  { path: '**', redirectTo: '' },
];
