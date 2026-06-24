import { Routes } from '@angular/router';
import { VariantList } from './variants/variant-list';
import { VariantEditor } from './variants/variant-editor';
import { PgnImport } from './variants/pgn-import';
import { VariantDetail } from './variants/variant-detail';
import { VariantTraining } from './variants/variant-training';

export const routes: Routes = [
  { path: '', component: VariantList },
  { path: 'variants/new', component: VariantEditor },
  { path: 'variants/import', component: PgnImport },
  { path: 'variants/:id', component: VariantDetail },
  { path: 'variants/:id/edit', component: VariantEditor },
  { path: 'variants/:id/train', component: VariantTraining },
  { path: '**', redirectTo: '' },
];
