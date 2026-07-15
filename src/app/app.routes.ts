import { Routes } from '@angular/router';

import { HomeComponent } from './features/home/home.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  {
    path: 'rates',
    loadComponent: () =>
      import('./features/rates/rates-table.component').then((m) => m.RatesTableComponent),
  },
  {
    path: 'trends',
    loadComponent: () =>
      import('./features/trends/trends.component').then((m) => m.TrendsComponent),
  },
  {
    path: 'converter',
    loadComponent: () =>
      import('./features/converter/converter.component').then((m) => m.ConverterComponent),
  },
];
