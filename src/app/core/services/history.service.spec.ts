import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { ENV_TOKEN, EnvironmentConfig } from '../tokens/env.token';
import { CacheService } from './cache.service';
import { HistoryResponse, ApiError } from '../models/api.types';
import { HistoryService } from './history.service';

function createCacheSpy(): jasmine.SpyObj<CacheService> {
  return jasmine.createSpyObj<CacheService>('CacheService', ['get', 'set', 'clear']);
}

function createEnv(overrides?: Partial<EnvironmentConfig>): EnvironmentConfig {
  return {
    apiBase: 'https://api.example.com',
    apiKey: 'test-key',
    pollInterval: 60_000,
    staleThreshold: 15 * 60 * 1000,
    ...overrides,
  };
}

function parseDateKey(key: string): { base: string; date: string } | null {
  const match = /^history::([^:]+)::(.+)$/.exec(key);
  return match ? { base: match[1], date: match[2] } : null;
}

function createHistoryResponse(dateStr: string, rates: Record<string, number>): HistoryResponse {
  const [year, month, day] = dateStr.split('-').map(Number);
  return {
    base_code: 'USD',
    year,
    month,
    day,
    conversion_rates: rates,
  };
}

function getExpectedDateStrings(): string[] {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dates: string[] = [];
  for (let i = 30; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

const originalDate = window.Date;

function freezeDate(iso: string): void {
  const fixed = new Date(iso);
  const stubDate = function (this: unknown, ...args: unknown[]): Date {
    if (args.length === 0) {
      return new originalDate(fixed.valueOf());
    }
    return new originalDate(...(args as []));
  } as unknown as DateConstructor;
  stubDate.now = () => fixed.getTime();
  stubDate.parse = originalDate.parse;
  stubDate.UTC = originalDate.UTC;
  (window as unknown as { Date: DateConstructor }).Date = stubDate;
}

async function drainMicrotasks(rounds = 20): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await Promise.resolve();
  }
}

describe('HistoryService', () => {
  let httpTestingController: HttpTestingController;
  let cacheSpy: jasmine.SpyObj<CacheService>;
  let env: EnvironmentConfig;

  beforeEach(() => {
    cacheSpy = createCacheSpy();
    env = createEnv();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CacheService, useValue: cacheSpy },
        { provide: ENV_TOKEN, useValue: env },
      ],
    });
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    TestBed.resetTestingModule();
    (window as unknown as { Date: DateConstructor }).Date = originalDate;
  });

  const createService = (): HistoryService => TestBed.inject(HistoryService);

  it('should be created with empty selected and series', () => {
    const service = createService();

    expect(service).toBeTruthy();
    expect(service.selected()).toEqual([]);
    expect(service.series()).toEqual([]);
  });

  it('should serve warm cache and make no HTTP calls', async () => {
    const service = createService();
    const dates = getExpectedDateStrings();

    cacheSpy.get.and.callFake(<T>(key: string): Promise<{ value: T | null; stale: boolean; fetchedAt: number | null }> => {
      const parsed = parseDateKey(key);
      if (parsed?.base === 'USD') {
        return Promise.resolve({
          value: createHistoryResponse(parsed.date, { EUR: 0.9, GBP: 0.8 }) as T | null,
          stale: false,
          fetchedAt: Date.now(),
        });
      }
      return Promise.resolve({ value: null as T | null, stale: true, fetchedAt: null });
    });

    await service.loadHistory('USD', ['EUR'], 'daily');

    httpTestingController.expectNone(() => true);
    expect(service.selected()).toEqual(['EUR']);
    expect(service.series().length).toBe(dates.length);
    expect(service.series().map((point) => point.date)).toEqual(dates);
    expect(service.series()[0].values).toEqual({ EUR: 0.9 });
  });

  it('should use cached dates only when no API key is configured', async () => {
    env.apiKey = '';
    const service = createService();
    const dates = getExpectedDateStrings();
    const cachedDate = dates[0];

    cacheSpy.get.and.callFake(<T>(key: string): Promise<{ value: T | null; stale: boolean; fetchedAt: number | null }> => {
      const parsed = parseDateKey(key);
      if (parsed?.base === 'USD' && parsed.date === cachedDate) {
        return Promise.resolve({
          value: createHistoryResponse(parsed.date, { EUR: 0.85 }) as T | null,
          stale: false,
          fetchedAt: Date.now(),
        });
      }
      return Promise.resolve({ value: null as T | null, stale: true, fetchedAt: null });
    });

    await service.loadHistory('USD', ['EUR'], 'daily');

    httpTestingController.expectNone(() => true);
    expect(service.series().length).toBe(1);
    expect(service.series()[0]).toEqual({ date: cachedDate, values: { EUR: 0.85 } });
  });

  it('should return an empty series when no API key and no cache', async () => {
    env.apiKey = '';
    const service = createService();
    cacheSpy.get.and.resolveTo({ value: null, stale: true, fetchedAt: null });

    await service.loadHistory('USD', ['EUR'], 'daily');

    httpTestingController.expectNone(() => true);
    expect(service.series()).toEqual([]);
  });

  it('should fetch missing dates sequentially and cache each response', async () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2024-06-15T00:00:00Z'));

    try {
      const service = createService();
      const dates = getExpectedDateStrings();
      const cachedDate = dates[0];

      cacheSpy.get.and.callFake(<T>(key: string): Promise<{ value: T | null; stale: boolean; fetchedAt: number | null }> => {
        const parsed = parseDateKey(key);
        if (parsed?.base === 'USD' && parsed.date === cachedDate) {
          return Promise.resolve({
            value: createHistoryResponse(parsed.date, { EUR: 0.85 }) as T | null,
            stale: false,
            fetchedAt: Date.now(),
          });
        }
        return Promise.resolve({ value: null as T | null, stale: true, fetchedAt: null });
      });

      const promise = service.loadHistory('USD', ['EUR'], 'daily');
      await drainMicrotasks(40);

      const missingDates = dates.slice(1);
      for (let i = 0; i < missingDates.length; i++) {
        const dateStr = missingDates[i];
        const [year, month, day] = dateStr.split('-');
        const req = httpTestingController.expectOne(
          `https://api.example.com/test-key/history/USD/${year}/${month}/${day}`
        );
        req.flush(createHistoryResponse(dateStr, { EUR: 0.9 + i * 0.01 }));
        await drainMicrotasks(5);

        if (i < missingDates.length - 1) {
          httpTestingController.expectNone(() => true);
          jasmine.clock().tick(200);
          await drainMicrotasks(5);
        }
      }

      await promise;
      expect(service.selected()).toEqual(['EUR']);
      expect(service.series().length).toBe(dates.length);
      expect(cacheSpy.set).toHaveBeenCalledTimes(missingDates.length);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('should stop fetching and use cached dates when quota is reached', async () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2024-06-15T00:00:00Z'));

    try {
      const service = createService();
      const dates = getExpectedDateStrings();
      const cachedDate = dates[0];

      cacheSpy.get.and.callFake(<T>(key: string): Promise<{ value: T | null; stale: boolean; fetchedAt: number | null }> => {
        const parsed = parseDateKey(key);
        if (parsed?.base === 'USD' && parsed.date === cachedDate) {
          return Promise.resolve({
            value: createHistoryResponse(parsed.date, { EUR: 0.85 }) as T | null,
            stale: false,
            fetchedAt: Date.now(),
          });
        }
        return Promise.resolve({ value: null as T | null, stale: true, fetchedAt: null });
      });

      const promise = service.loadHistory('USD', ['EUR'], 'daily');
      await drainMicrotasks(40);

      const missingDates = dates.slice(1);
      const firstMissing = missingDates[0];
      const [year, month, day] = firstMissing.split('-');
      const req = httpTestingController.expectOne(
        `https://api.example.com/test-key/history/USD/${year}/${month}/${day}`
      );
      const error: ApiError = { error: true, errorType: 'quota-reached', message: 'Quota reached' };
      req.flush(error);
      await drainMicrotasks(5);

      httpTestingController.verify();
      await promise;
      expect(service.series().length).toBe(1);
      expect(service.series()[0]).toEqual({ date: cachedDate, values: { EUR: 0.85 } });
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('should aggregate series through the date-buckets utility', async () => {
    freezeDate('2024-06-15T00:00:00Z');

    const service = createService();

    cacheSpy.get.and.callFake(<T>(key: string): Promise<{ value: T | null; stale: boolean; fetchedAt: number | null }> => {
      const parsed = parseDateKey(key);
      if (parsed?.base === 'USD') {
        return Promise.resolve({
          value: createHistoryResponse(parsed.date, { EUR: 1 }) as T | null,
          stale: false,
          fetchedAt: Date.now(),
        });
      }
      return Promise.resolve({ value: null as T | null, stale: true, fetchedAt: null });
    });

    await service.loadHistory('USD', ['EUR'], 'weekly');

    httpTestingController.verify();

    const result = service.series();
    expect(result.length).toBeGreaterThan(0);
    for (const point of result) {
      expect(point.values['EUR']).toBe(1);
    }
  });

  it('should filter series to selected currencies only', async () => {
    freezeDate('2024-06-15T00:00:00Z');

    const service = createService();

    cacheSpy.get.and.callFake(<T>(key: string): Promise<{ value: T | null; stale: boolean; fetchedAt: number | null }> => {
      const parsed = parseDateKey(key);
      if (parsed?.base === 'USD') {
        return Promise.resolve({
          value: createHistoryResponse(parsed.date, { EUR: 0.9, GBP: 0.8, JPY: 150 }) as T | null,
          stale: false,
          fetchedAt: Date.now(),
        });
      }
      return Promise.resolve({ value: null as T | null, stale: true, fetchedAt: null });
    });

    await service.loadHistory('USD', ['EUR', 'JPY'], 'daily');

    httpTestingController.verify();

    expect(service.selected()).toEqual(['EUR', 'JPY']);
    for (const point of service.series()) {
      expect(Object.keys(point.values)).toEqual(['EUR', 'JPY']);
    }
  });

  it('should skip dates where a selected currency is missing from the response', async () => {
    freezeDate('2024-06-15T00:00:00Z');

    const service = createService();
    const dates = getExpectedDateStrings();

    cacheSpy.get.and.callFake(<T>(key: string): Promise<{ value: T | null; stale: boolean; fetchedAt: number | null }> => {
      const parsed = parseDateKey(key);
      if (parsed?.base === 'USD') {
        const rates: Record<string, number> = parsed.date === dates[0] ? { EUR: 0.9 } : { GBP: 0.8 };
        return Promise.resolve({
          value: createHistoryResponse(parsed.date, rates) as T | null,
          stale: false,
          fetchedAt: Date.now(),
        });
      }
      return Promise.resolve({ value: null as T | null, stale: true, fetchedAt: null });
    });

    await service.loadHistory('USD', ['EUR', 'GBP'], 'daily');

    httpTestingController.verify();

    const result = service.series();
    expect(result.length).toBe(dates.length);
    expect(result[0].values).toEqual({ EUR: 0.9 });
    for (let i = 1; i < result.length; i++) {
      expect(result[i].values).toEqual({ GBP: 0.8 });
    }
  });

  it('should use cached dates only when ENV_TOKEN is not provided', async () => {
    freezeDate('2024-06-15T00:00:00Z');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CacheService, useValue: cacheSpy },
      ],
    });
    httpTestingController = TestBed.inject(HttpTestingController);

    const service = TestBed.inject(HistoryService);

    cacheSpy.get.and.callFake(<T>(key: string): Promise<{ value: T | null; stale: boolean; fetchedAt: number | null }> => {
      const parsed = parseDateKey(key);
      if (parsed?.base === 'USD') {
        return Promise.resolve({
          value: createHistoryResponse(parsed.date, { EUR: 0.9 }) as T | null,
          stale: false,
          fetchedAt: Date.now(),
        });
      }
      return Promise.resolve({ value: null as T | null, stale: true, fetchedAt: null });
    });

    await service.loadHistory('USD', ['EUR'], 'daily');

    httpTestingController.expectNone(() => true);
    expect(service.series().length).toBeGreaterThan(0);
  });
});
