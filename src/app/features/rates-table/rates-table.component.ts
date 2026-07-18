import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';

import { Currency, CURATED_TOP_30 } from '../../core/models/currency';
import { HistoryResponse } from '../../core/models/api.types';
import { CacheService } from '../../core/services/cache.service';
import { RatesService } from '../../core/services/rates.service';
import { SortChange, SortHeaderDirective } from '../../shared/directives/sort-header.directive';
import { SortDirection } from '../../shared/pipes/sort.pipe';
import { ButtonComponent } from '../../ui/button/button.component';
import { CardComponent } from '../../ui/card/card.component';
import { TextInputComponent } from '../../ui/text-input/text-input.component';

interface RateRow extends Currency {
  rate: number;
  base: string;
  delta: number | null;
}

function yesterdayDateKey(): string {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  today.setUTCDate(today.getUTCDate() - 1);
  return today.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-rates-table',
  standalone: true,
  imports: [
    ButtonComponent,
    CardComponent,
    DecimalPipe,
    SortHeaderDirective,
    TextInputComponent,
  ],
  templateUrl: './rates-table.component.html',
  styleUrl: './rates-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatesTableComponent {
  readonly ratesService = inject(RatesService);
  private readonly router = inject(Router);
  private readonly cache = inject(CacheService);

  readonly search = signal('');
  readonly sortKey = signal<string>('code');
  readonly sortDirection = signal<SortDirection>('none');
  readonly showAll = signal(false);

  private readonly currencyMeta = new Map(CURATED_TOP_30.map((currency) => [currency.code, currency]));

  // Best-effort day-over-day delta: reads yesterday's cached snapshot for the
  // current base out of IndexedDB (populated by HistoryService) with no
  // network call. Absent from cache simply means no delta is shown.
  readonly previousRates = signal<Record<string, number> | null>(null);

  constructor() {
    effect(() => {
      const base = this.ratesService.base();
      const key = `history::${base}::${yesterdayDateKey()}`;
      this.previousRates.set(null);
      void this.cache.get<HistoryResponse>(key).then((entry) => {
        if (entry.value) {
          this.previousRates.set(entry.value.conversion_rates);
        }
      });
    });
  }

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
    const previous = this.previousRates();
    const sourceCodes = this.showAll()
      ? Object.keys(snapshot.conversion_rates)
      : CURATED_TOP_30.map((currency) => currency.code);

    return sourceCodes
      .filter((code) => code in snapshot.conversion_rates)
      .map((code) => {
        const meta = this.currencyMeta.get(code);
        const rate = snapshot.conversion_rates[code];
        const previousRate = previous?.[code];
        const delta =
          previousRate != null && previousRate !== 0 ? (rate - previousRate) / previousRate : null;

        return {
          code,
          name: meta?.name ?? code,
          flag: meta?.flag ?? '',
          rate,
          base,
          delta,
        };
      });
  });

  readonly filteredRows = computed(() => {
    const query = this.search().trim().toLowerCase();
    const rows = this.rows();

    if (!query) {
      return rows;
    }

    return rows.filter(
      (row) =>
        row.code.toLowerCase().includes(query) ||
        row.name.toLowerCase().includes(query),
    );
  });

  readonly displayedRows = computed(() => {
    const key = this.sortKey();
    const direction = this.sortDirection();
    const rows = this.filteredRows();

    if (direction === 'none' || rows.length < 2) {
      return rows;
    }

    const sorted = [...rows].sort((a, b) => {
      const aValue = a[key as keyof RateRow];
      const bValue = b[key as keyof RateRow];

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return aValue - bValue;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue);
      }

      return String(aValue).localeCompare(String(bValue));
    });

    return direction === 'desc' ? sorted.reverse() : sorted;
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
