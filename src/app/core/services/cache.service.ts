import { Injectable, inject, InjectionToken } from '@angular/core';
import { get, set, clear, createStore, UseStore } from 'idb-keyval';

import { ENV_TOKEN } from '../tokens/env.token';

export const CACHE_STORE = new InjectionToken<UseStore>('CACHE_STORE', {
  factory: () => createStore('currency-cache', 'keyval'),
});

const SCHEMA_VERSION_KEY = 'meta::schemaVersion';
const CURRENT_SCHEMA_VERSION = 1;
const DEFAULT_STALE_THRESHOLD = 15 * 60 * 1000; // 15 minutes

interface CacheEntry<T> {
  value: T;
  fetchedAt: number;
}

@Injectable({
  providedIn: 'root',
})
export class CacheService {
  private readonly env = inject(ENV_TOKEN, { optional: true });
  private readonly store = inject(CACHE_STORE);
  private readonly ready: Promise<void>;

  constructor() {
    this.ready = this.runSchemaGuard();
  }

  async get<T>(key: string): Promise<{ value: T | null; stale: boolean; fetchedAt: number | null }> {
    await this.ready;

    const entry = await get<CacheEntry<T>>(key, this.store);
    if (!entry) {
      return { value: null, stale: true, fetchedAt: null };
    }

    const staleThreshold = this.env?.staleThreshold ?? DEFAULT_STALE_THRESHOLD;
    const stale = Date.now() - entry.fetchedAt > staleThreshold;

    return { value: entry.value, stale, fetchedAt: entry.fetchedAt };
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.ready;
    await set(key, { value, fetchedAt: Date.now() }, this.store);
  }

  async clear(): Promise<void> {
    await this.ready;
    await clear(this.store);
  }

  private async runSchemaGuard(): Promise<void> {
    const version = await get<number>(SCHEMA_VERSION_KEY, this.store);
    if (version !== CURRENT_SCHEMA_VERSION) {
      await clear(this.store);
      await set(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION, this.store);
    }
  }
}
