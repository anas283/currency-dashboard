import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-converter',
  standalone: true,
  imports: [],
  template: `<p>Converter placeholder</p>`,
  styles: [`:host { display: block; padding: 1rem; }`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConverterComponent {}
