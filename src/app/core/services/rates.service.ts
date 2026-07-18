import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, map } from 'rxjs';

import { ENV_TOKEN, EnvironmentConfig } from '../tokens/env.token';
import { CacheService } from './cache.service';
import { LatestResponse, PairResponse } from '../models/api.types';
import sampleRates from '../../../sample-rates.json';

@Injectable({
  providedIn: 'root',
})
export class RatesService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(CacheService);
  private readonly env = inject(ENV_TOKEN, { optional: true }) as EnvironmentConfig | null;

  readonly snapshot = signal<LatestResponse | null>(null);
  readonly base = signal<string>('MYR');
  readonly servedFromCache = signal<boolean>(false);
  readonly status = signal<'live' | 'stale' | 'offline' | 'error'>('live');

  private cacheFetchedAt: number | null = null;
  readonly lastUpdated = computed(() => {
    if (this.servedFromCache()) {
      return this.cacheFetchedAt;
    }
    const unix = this.snapshot()?.time_last_update_unix;
    return unix != null ? unix * 1000 : null;
  });

  private loadPromise?: Promise<void>;

  async loadLatest(): Promise<void> {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this.doLoadLatest().finally(() => {
      this.loadPromise = undefined;
    });

    return this.loadPromise;
  }

  private async doLoadLatest(): Promise<void> {
    const base = this.base();
    const cacheKey = `latest::${base}`;
    const cached = await this.cache.get<LatestResponse>(cacheKey);

    if (cached.value) {
      this.snapshot.set(cached.value);
      this.servedFromCache.set(true);
      this.status.set(cached.stale ? 'stale' : 'live');
      this.cacheFetchedAt = cached.fetchedAt;
    }

    const apiKey = this.env?.apiKey ?? '';
    if (!apiKey) {
      if (!cached.value) {
        this.snapshot.set(this.rebaseSample(base));
        this.status.set('offline');
        this.servedFromCache.set(false);
      }
      return;
    }

    try {
      const data = await firstValueFrom(
        this.http.get<LatestResponse>(`${this.env?.apiBase}/${apiKey}/latest/${base}`),
      );
      this.snapshot.set(data);
      this.servedFromCache.set(false);
      this.status.set('live');
      this.cacheFetchedAt = null;
      void this.cache.set(cacheKey, data);
    } catch {
      if (this.snapshot()) {
        this.status.set(navigator.onLine ? 'stale' : 'offline');
      } else {
        this.snapshot.set(sampleRates as LatestResponse);
        this.status.set('offline');
        this.servedFromCache.set(false);
      }
    }
  }

  // sample-rates.json is always USD-based; re-derive rates for any other base
  // so switching Base actually changes the numbers, not just the column label.
  private rebaseSample(base: string): LatestResponse {
    const original = sampleRates as LatestResponse;
    const baseRate = original.conversion_rates[base];
    if (baseRate == null) {
      return original;
    }

    const conversion_rates: Record<string, number> = {};
    for (const [code, rate] of Object.entries(original.conversion_rates)) {
      conversion_rates[code] = rate / baseRate;
    }

    return { ...original, base_code: base, conversion_rates };
  }

  async convert(amount: number, from: string, to: string): Promise<number | null> {
    const snap = this.snapshot();
    if (snap && snap.conversion_rates[from] != null && snap.conversion_rates[to] != null) {
      return amount * (snap.conversion_rates[to] / snap.conversion_rates[from]);
    }

    const apiKey = this.env?.apiKey ?? '';
    if (!apiKey) {
      return null;
    }

    return firstValueFrom(
      this.http
        .get<PairResponse>(`${this.env?.apiBase}/${apiKey}/pair/${from}/${to}/${amount}`)
        .pipe(map((response) => response.conversion_result))
    ).catch(() => null);
  }
}
