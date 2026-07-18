import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { CURATED_TOP_30, Currency } from '../../core/models/currency';
import { RatesService } from '../../core/services/rates.service';
import { ButtonComponent } from '../../ui/button/button.component';
import { CardComponent } from '../../ui/card/card.component';
import { TextInputComponent } from '../../ui/text-input/text-input.component';

@Component({
  selector: 'app-converter',
  standalone: true,
  imports: [
    ButtonComponent,
    CardComponent,
    DecimalPipe,
    TextInputComponent,
  ],
  templateUrl: './converter.component.html',
  styleUrl: './converter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConverterComponent {
  readonly ratesService = inject(RatesService);

  readonly amount = signal<number>(1000);
  readonly from = signal<string>('MYR');
  readonly to = signal<string>('USD');

  readonly options = computed<Currency[]>(() => {
    const base = this.ratesService.base();
    const baseCurrency = CURATED_TOP_30.find((currency) => currency.code === base);

    if (baseCurrency) {
      return CURATED_TOP_30.slice();
    }

    return [{ code: base, name: base, flag: '' }, ...CURATED_TOP_30];
  });

  readonly resultValue = signal<number | null>(null);

  constructor() {
    effect(() => {
      const amount = this.amount();
      const from = this.from();
      const to = this.to();
      this.ratesService.convert(amount, from, to).then((value) => {
        if (amount === this.amount() && from === this.from() && to === this.to()) {
          this.resultValue.set(value);
        }
      });
    }, { allowSignalWrites: true });
  }

  onAmountChange(value: string): void {
    const parsed = Number.parseFloat(value);
    this.amount.set(Number.isNaN(parsed) ? 0 : Math.max(0, parsed));
  }

  onFromChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.from.set(target.value);
  }

  onToChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.to.set(target.value);
  }

  swap(): void {
    const previousFrom = this.from();
    this.from.set(this.to());
    this.to.set(previousFrom);
  }
}
