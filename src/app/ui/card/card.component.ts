import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type CardVariant =
  | 'content'
  | 'feature-sage'
  | 'feature-green'
  | 'feature-dark';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {
  readonly variant = input<CardVariant>('content');
}
