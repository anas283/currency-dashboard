import { ChangeDetectionStrategy, Component } from '@angular/core';

import { HeroBandComponent } from '../../ui/hero-band/hero-band.component';
import { CardComponent } from '../../ui/card/card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [HeroBandComponent, CardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {}
