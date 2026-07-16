import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';

import { Currency, CURATED_TOP_30 } from '../../core/models/currency';
import { RatesService } from '../../core/services/rates.service';
import { SortChange, SortHeaderDirective } from '../../shared/directives/sort-header.directive';
import { CurrencyFilterPipe } from '../../shared/pipes/currency-filter.pipe';
import { SortDirection, SortPipe } from '../../shared/pipes/sort.pipe';
import { ButtonComponent } from '../../ui/button/button.component';
import { CardComponent } from '../../ui/card/card.component';
import { TextInputComponent } from '../../ui/text-input/text-input.component';

interface RateRow extends Currency {
  rate: number;
  base: string;
}

@Component({
  selector: 'app-rates-table',
  standalone: true,
  imports: [
    ButtonComponent,
    CardComponent,
    CurrencyFilterPipe,
    DecimalPipe,
    SortHeaderDirective,
    SortPipe,
    TextInputComponent,
  ],
  templateUrl: './rates-table.component.html',
  styleUrl: './rates-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatesTableComponent {
  readonly ratesService = inject(RatesService);
  private readonly router = inject(Router);

  readonly search = signal('');
  readonly sortKey = signal<string>('code');
  readonly sortDirection = signal<SortDirection>('none');
  readonly showAll = signal(false);

  private readonly currencyMeta = new Map(CURATED_TOP_30.map((currency) => [currency.code, currency]));

  readonly baseOptions = computed(() => {
    const snapshot = this.ratesService.snapshot();
    if (snapshot) {
      return Object.keys(snapshot.conversion_rates).sort();
    }
    return CURATED_TOP_30.map((currency) => currency.code);
  });

  readonly rows = computed<RateRow[]>(() => {
    const snapshot = this.ratesService.snapshot();
    if (!snapshot) {
      return [];
    }

    const base = this.ratesService.base();
    const sourceCodes = this.showAll()
      ? Object.keys(snapshot.conversion_rates)
      : CURATED_TOP_30.map((currency) => currency.code);

    return sourceCodes
      .filter((code) => code in snapshot.conversion_rates)
      .map((code) => {
        const meta = this.currencyMeta.get(code);
        return {
          code,
          name: meta?.name ?? code,
          flag: meta?.flag ?? '',
          rate: snapshot.conversion_rates[code],
          base,
        };
      });
  });

  onSortChange(change: SortChange): void {
    this.sortKey.set(change.key);
    this.sortDirection.set(change.direction);
  }

  onBaseChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.ratesService.base.set(target.value);
    void this.ratesService.loadLatest();
  }

  onRowClick(code: string): void {
    void this.router.navigate(['/trends'], { queryParams: { target: code } });
  }
}
