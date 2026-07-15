import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { ENV_TOKEN, EnvironmentConfig } from '../tokens/env.token';
import { CacheService } from './cache.service';
import { ApiError, HistoryResponse } from '../models/api.types';
import { aggregate, Aggregation, DataPoint } from '../../shared/utils/date-buckets';

export interface HistorySeriesPoint {
  date: string;
  values: Record<string, number>;
}

function isApiError(response: HistoryResponse | ApiError): response is ApiError {
  return (response as ApiError).error === true;
}

function isQuotaReached(response: ApiError): boolean {
  return response.errorType === 'quota-reached';
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toUtcDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getPastDateStrings(days: number): string[] {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dates: string[] = [];

  for (let i = days; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    dates.push(formatDateKey(d));
  }

  return dates;
}

function buildSeries(
  dateResponses: Map<string, HistoryResponse>,
  currencies: string[],
  aggregation: Aggregation
): HistorySeriesPoint[] {
  const aggregatedByCurrency = new Map<string, Map<string, number>>();

  for (const currency of currencies) {
    const points: DataPoint[] = [];

    for (const [dateStr, response] of dateResponses) {
      const rate = response.conversion_rates[currency];
      if (rate == null) {
        continue;
      }
      points.push({ date: toUtcDate(dateStr), value: rate });
    }

    const aggregated = aggregate(points, aggregation);
    const valuesByDate = new Map<string, number>();

    for (const point of aggregated) {
      valuesByDate.set(formatDateKey(point.date), point.value);
    }

    aggregatedByCurrency.set(currency, valuesByDate);
  }

  const allDates = new Set<string>();
  for (const valuesByDate of aggregatedByCurrency.values()) {
    for (const dateStr of valuesByDate.keys()) {
      allDates.add(dateStr);
    }
  }

  const sortedDates = Array.from(allDates).sort();

  return sortedDates.map((dateStr) => {
    const values: Record<string, number> = {};
    for (const currency of currencies) {
      const value = aggregatedByCurrency.get(currency)?.get(dateStr);
      if (value != null) {
        values[currency] = value;
      }
    }
    return { date: dateStr, values };
  });
}

@Injectable({
  providedIn: 'root',
})
export class HistoryService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(CacheService);
  private readonly env = inject(ENV_TOKEN, { optional: true }) as EnvironmentConfig | null;

  readonly selected = signal<string[]>([]);
  readonly series = signal<HistorySeriesPoint[]>([]);

  async loadHistory(base: string, currencies: string[], aggregation: Aggregation): Promise<void> {
    this.selected.set(currencies);

    const dateStrings = getPastDateStrings(30);
    const apiKey = this.env?.apiKey ?? '';
    const dateResponses = new Map<string, HistoryResponse>();

    if (apiKey) {
      const missingDates: string[] = [];

      for (const dateStr of dateStrings) {
        const cached = await this.cache.get<HistoryResponse>(`history::${base}::${dateStr}`);
        if (cached.value) {
          dateResponses.set(dateStr, cached.value);
        } else {
          missingDates.push(dateStr);
        }
      }

      let quotaReached = false;
      for (let i = 0; i < missingDates.length; i++) {
        if (quotaReached) {
          break;
        }

        const dateStr = missingDates[i];
        const [year, month, day] = dateStr.split('-');
        const url = `${this.env?.apiBase}/${apiKey}/history/${base}/${year}/${month}/${day}`;

        try {
          const response = await firstValueFrom(this.http.get<HistoryResponse | ApiError>(url));
          if (isApiError(response)) {
            if (isQuotaReached(response)) {
              quotaReached = true;
            }
            continue;
          }
          dateResponses.set(dateStr, response);
          await this.cache.set(`history::${base}::${dateStr}`, response);
        } catch {
          // Network or transport errors leave this date unfilled.
          continue;
        }

        if (i < missingDates.length - 1) {
          await delay(200);
        }
      }
    } else {
      for (const dateStr of dateStrings) {
        const cached = await this.cache.get<HistoryResponse>(`history::${base}::${dateStr}`);
        if (cached.value) {
          dateResponses.set(dateStr, cached.value);
        }
      }
    }

    this.series.set(buildSeries(dateResponses, currencies, aggregation));
  }
}
