import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BadgeVariant = 'positive' | 'negative';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [],
  templateUrl: './badge.component.html',
  styleUrl: './badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeComponent {
  readonly variant = input<BadgeVariant>('positive');
}
