import { Routes } from '@angular/router';
import { VariantList } from './variants/variant-list';
import { VariantDetail } from './variants/variant-detail';
import { VariantTraining } from './variants/variant-training';

export const routes: Routes = [
  { path: '', component: VariantList },
  { path: 'variants/:id', component: VariantDetail },
  { path: 'variants/:id/train', component: VariantTraining },
  { path: '**', redirectTo: '' },
];
