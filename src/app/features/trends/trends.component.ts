import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-trends',
  standalone: true,
  imports: [],
  template: `<p>Trends placeholder</p>`,
  styles: [`:host { display: block; padding: 1rem; }`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrendsComponent {}
