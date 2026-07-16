import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ConverterComponent } from '../converter/converter.component';
import { RatesTableComponent } from '../rates-table/rates-table.component';
import { TrendsComponent } from '../trends/trends.component';
import { OfflineIndicatorComponent } from '../offline-indicator/offline-indicator.component';
import { HeroBandComponent } from '../../ui/hero-band/hero-band.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    ConverterComponent,
    RatesTableComponent,
    TrendsComponent,
    OfflineIndicatorComponent,
    HeroBandComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {}
