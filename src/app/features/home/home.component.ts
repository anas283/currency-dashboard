import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ConverterComponent } from '../converter/converter.component';
import { RatesTableComponent } from '../rates-table/rates-table.component';
import { TrendsComponent } from '../trends/trends.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ConverterComponent, RatesTableComponent, TrendsComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {}
