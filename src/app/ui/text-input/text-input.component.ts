import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

let inputCounter = 0;

@Component({
  selector: 'app-text-input',
  standalone: true,
  imports: [],
  templateUrl: './text-input.component.html',
  styleUrl: './text-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextInputComponent {
  readonly label = input<string>('');
  readonly placeholder = input<string>('');
  readonly type = input<'text' | 'email' | 'password' | 'number'>('text');
  readonly min = input<string | null>(null);
  readonly value = input<string>('');
  readonly valueChange = output<string>();

  protected readonly inputId = `cx-text-input-${++inputCounter}`;

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.valueChange.emit(target.value);
  }
}
