import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { CURATED_TOP_30, Currency } from '../../core/models/currency';
import { HistoryService } from '../../core/services/history.service';
import { RatesService } from '../../core/services/rates.service';
import { ChartComponent, ChartDatasetEntry } from '../../shared/components/chart/chart.component';
import { Aggregation } from '../../shared/utils/date-buckets';
import { ButtonComponent } from '../../ui/button/button.component';
import { CardComponent } from '../../ui/card/card.component';

const MAX_SELECTION = 3;
// Brand token colors from _tokens.scss / DESIGN.md for chart line differentiation.
const TREND_COLORS = ['#2ead4b', '#38c8ff', '#d03238'];
const VALID_CODES = new Set(CURATED_TOP_30.map((currency) => currency.code));
const AGGREGATION_OPTIONS: Aggregation[] = ['daily', 'weekly', 'monthly'];
const AGGREGATION_LABELS: Record<Aggregation, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

@Component({
  selector: 'app-trends',
  standalone: true,
  imports: [ButtonComponent, CardComponent, ChartComponent],
  templateUrl: './trends.component.html',
  styleUrl: './trends.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrendsComponent implements OnInit {
  readonly ratesService = inject(RatesService);
  private readonly historyService = inject(HistoryService);
  private readonly route = inject(ActivatedRoute);

  readonly aggregation = signal<Aggregation>('daily');
  readonly selected = signal<string[]>([]);

  readonly currencyOptions: readonly Currency[] = CURATED_TOP_30;
  readonly aggregationOptions = AGGREGATION_OPTIONS;
  readonly aggregationLabels = AGGREGATION_LABELS;
  readonly maxSelection = MAX_SELECTION;

  readonly atMax = computed(() => this.selected().length >= MAX_SELECTION);

  readonly chartLabels = computed(() => this.historyService.series().map((point) => point.date));
  readonly chartDatasets = computed<ChartDatasetEntry[]>(() => {
    const series = this.historyService.series();
    const selected = this.selected();

    return selected.map((code, index) => ({
      label: code,
      data: series.map((point) => point.values[code] ?? 0),
      borderColor: TREND_COLORS[index % TREND_COLORS.length],
    }));
  });

  constructor() {
    effect(() => {
      const base = this.ratesService.base();
      const selected = this.selected();
      const aggregation = this.aggregation();

      void this.historyService.loadHistory(base, selected, aggregation);
    });
  }

  async ngOnInit(): Promise<void> {
    const params = await firstValueFrom(this.route.queryParams);
    const target = params['target'];

    if (typeof target === 'string' && VALID_CODES.has(target)) {
      this.selected.set([target]);
    }
  }

  isSelected(code: string): boolean {
    return this.selected().includes(code);
  }

  toggleCurrency(code: string): void {
    if (this.isSelected(code)) {
      this.selected.update((codes) => codes.filter((current) => current !== code));
      return;
    }

    if (this.atMax()) {
      return;
    }

    this.selected.update((codes) => [...codes, code]);
  }

  setAggregation(value: Aggregation): void {
    this.aggregation.set(value);
  }
}
