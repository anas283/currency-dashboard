import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type HeroVariant = 'default' | 'dark';

@Component({
  selector: 'app-hero-band',
  standalone: true,
  imports: [],
  templateUrl: './hero-band.component.html',
  styleUrl: './hero-band.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroBandComponent {
  readonly variant = input<HeroVariant>('default');
  readonly headline = input.required<string>();
  readonly subheadline = input<string>('');
}
