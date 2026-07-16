import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ConverterComponent } from '../converter/converter.component';
import { HeroBandComponent } from '../../ui/hero-band/hero-band.component';
import { CardComponent } from '../../ui/card/card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ConverterComponent, HeroBandComponent, CardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {}
