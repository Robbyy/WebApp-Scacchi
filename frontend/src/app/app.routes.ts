import { Routes } from '@angular/router';
import { VariantList } from './variants/variant-list';
import { VariantDetail } from './variants/variant-detail';

export const routes: Routes = [
  { path: '', component: VariantList },
  { path: 'variants/:id', component: VariantDetail },
  { path: '**', redirectTo: '' },
];
