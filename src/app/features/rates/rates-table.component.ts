import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-rates-table',
  standalone: true,
  imports: [],
  template: `<p>Rates table placeholder</p>`,
  styles: [`:host { display: block; padding: 1rem; }`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatesTableComponent {}
