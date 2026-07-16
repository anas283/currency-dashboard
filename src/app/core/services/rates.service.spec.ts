import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { ENV_TOKEN, EnvironmentConfig } from '../tokens/env.token';
import { CacheService } from './cache.service';
import { RatesService } from './rates.service';
import { LatestResponse, PairResponse } from '../models/api.types';

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

describe('RatesService', () => {
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
  });

  const createService = (): RatesService => TestBed.inject(RatesService);

  it('should be created', () => {
    const service = createService();

    expect(service).toBeTruthy();
    expect(service.base()).toBe('USD');
    expect(service.snapshot()).toBeNull();
    expect(service.status()).toBe('live');
    expect(service.servedFromCache()).toBeFalse();
  });

  it('should fetch latest rates, update snapshot, and cache the response', async () => {
    const service = createService();
    cacheSpy.get.and.resolveTo({ value: null, stale: true, fetchedAt: null });

    const promise = service.loadLatest();
    await promise;

    const req = httpTestingController.expectOne('https://api.example.com/test-key/latest/USD');
    const response: LatestResponse = {
      base_code: 'USD',
      conversion_rates: { USD: 1, EUR: 0.92 },
      time_last_update_unix: 1_000,
      time_next_update_unix: 2_000,
    };
    req.flush(response);

    await promise;

    expect(service.snapshot()).toEqual(response);
    expect(service.status()).toBe('live');
    expect(service.servedFromCache()).toBeFalse();
    expect(cacheSpy.set).toHaveBeenCalledWith('latest::USD', response);
  });

  it('should serve fresh cache then refresh from API on success', async () => {
    const service = createService();
    const cached: LatestResponse = {
      base_code: 'USD',
      conversion_rates: { USD: 1, EUR: 0.93 },
      time_last_update_unix: 500,
      time_next_update_unix: 1_500,
    };
    cacheSpy.get.and.resolveTo({ value: cached, stale: false, fetchedAt: 999 });

    const promise = service.loadLatest();
    await promise;

    const req = httpTestingController.expectOne('https://api.example.com/test-key/latest/USD');
    expect(service.snapshot()).toEqual(cached);
    expect(service.status()).toBe('live');
    expect(service.servedFromCache()).toBeTrue();
    expect(service.lastUpdated()).toBe(999);

    const response: LatestResponse = {
      base_code: 'USD',
      conversion_rates: { USD: 1, EUR: 0.94 },
      time_last_update_unix: 1_000,
      time_next_update_unix: 2_000,
    };
    req.flush(response);
    await promise;

    expect(service.snapshot()).toEqual(response);
    expect(service.status()).toBe('live');
    expect(service.servedFromCache()).toBeFalse();
    expect(service.lastUpdated()).toBe(1_000);
    expect(cacheSpy.set).toHaveBeenCalledWith('latest::USD', response);
  });

  it('should serve stale cache then refresh from API on success', async () => {
    const service = createService();
    const cached: LatestResponse = {
      base_code: 'USD',
      conversion_rates: { USD: 1, EUR: 0.9 },
      time_last_update_unix: 100,
      time_next_update_unix: 200,
    };
    cacheSpy.get.and.resolveTo({ value: cached, stale: true, fetchedAt: 100 });

    const promise = service.loadLatest();
    await promise;
    const req = httpTestingController.expectOne('https://api.example.com/test-key/latest/USD');
    expect(service.snapshot()).toEqual(cached);
    expect(service.status()).toBe('stale');
    expect(service.servedFromCache()).toBeTrue();

    const response: LatestResponse = {
      base_code: 'USD',
      conversion_rates: { USD: 1, EUR: 0.95 },
      time_last_update_unix: 300,
      time_next_update_unix: 400,
    };
    req.flush(response);
    await promise;

    expect(service.snapshot()).toEqual(response);
    expect(service.status()).toBe('live');
    expect(service.servedFromCache()).toBeFalse();
  });

  it('should keep cache and mark stale on API 401 when online', async () => {
    spyOnProperty(window.navigator, 'onLine', 'get').and.returnValue(true);
    const service = createService();
    const cached: LatestResponse = {
      base_code: 'USD',
      conversion_rates: { USD: 1, EUR: 0.91 },
      time_last_update_unix: 50,
      time_next_update_unix: 150,
    };
    cacheSpy.get.and.resolveTo({ value: cached, stale: false, fetchedAt: 123 });

    const promise = service.loadLatest();
    await promise;
    const req = httpTestingController.expectOne('https://api.example.com/test-key/latest/USD');
    req.flush({ error: true, message: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    await promise;

    expect(service.snapshot()).toEqual(cached);
    expect(service.status()).toBe('stale');
    expect(service.servedFromCache()).toBeTrue();
  });

  it('should keep cache and mark offline on API 5xx when offline', async () => {
    spyOnProperty(window.navigator, 'onLine', 'get').and.returnValue(false);
    const service = createService();
    const cached: LatestResponse = {
      base_code: 'USD',
      conversion_rates: { USD: 1, EUR: 0.88 },
      time_last_update_unix: 10,
      time_next_update_unix: 20,
    };
    cacheSpy.get.and.resolveTo({ value: cached, stale: false, fetchedAt: 123 });

    const promise = service.loadLatest();
    await promise;
    const req = httpTestingController.expectOne('https://api.example.com/test-key/latest/USD');
    req.flush({ error: true, message: 'bad gateway' }, { status: 502, statusText: 'Bad Gateway' });
    await promise;

    expect(service.snapshot()).toEqual(cached);
    expect(service.status()).toBe('offline');
    expect(service.servedFromCache()).toBeTrue();
  });

  it('should fall back to sample data on network error with no cache', async () => {
    spyOnProperty(window.navigator, 'onLine', 'get').and.returnValue(false);
    const service = createService();
    cacheSpy.get.and.resolveTo({ value: null, stale: true, fetchedAt: null });

    const promise = service.loadLatest();
    await promise;
    const req = httpTestingController.expectOne('https://api.example.com/test-key/latest/USD');
    req.error(new ProgressEvent('error'));
    await promise;

    expect(service.snapshot()).not.toBeNull();
    expect(service.snapshot()?.base_code).toBe('USD');
    expect(service.status()).toBe('offline');
    expect(service.servedFromCache()).toBeFalse();
  });

  it('should load sample data and mark offline when no API key and no cache', async () => {
    env.apiKey = '';
    const service = createService();
    cacheSpy.get.and.resolveTo({ value: null, stale: true, fetchedAt: null });

    await service.loadLatest();

    httpTestingController.expectNone('https://api.example.com/test-key/latest/USD');
    expect(service.snapshot()).not.toBeNull();
    expect(service.snapshot()?.base_code).toBe('USD');
    expect(service.status()).toBe('offline');
    expect(service.servedFromCache()).toBeFalse();
  });

  it('should not call API when no API key but cache exists', async () => {
    env.apiKey = '';
    const service = createService();
    const cached: LatestResponse = {
      base_code: 'USD',
      conversion_rates: { USD: 1, EUR: 0.97 },
      time_last_update_unix: 10,
      time_next_update_unix: 20,
    };
    cacheSpy.get.and.resolveTo({ value: cached, stale: false, fetchedAt: 123 });

    await service.loadLatest();

    httpTestingController.expectNone('https://api.example.com/test-key/latest/USD');
    expect(service.snapshot()).toEqual(cached);
    expect(service.status()).toBe('live');
    expect(service.servedFromCache()).toBeTrue();
  });

  it('convert should compute from snapshot rates', async () => {
    const service = createService();
    service.snapshot.set({
      base_code: 'USD',
      conversion_rates: { USD: 1, EUR: 0.5, GBP: 0.8 },
      time_last_update_unix: 1,
      time_next_update_unix: 2,
    });

    const result = await service.convert(100, 'USD', 'EUR');

    expect(result).toBe(50);
  });

  it('convert should fall back to pair API when snapshot lacks currency', async () => {
    const service = createService();
    service.snapshot.set({
      base_code: 'USD',
      conversion_rates: { USD: 1 },
      time_last_update_unix: 1,
      time_next_update_unix: 2,
    });

    const convertPromise = service.convert(200, 'USD', 'EUR');
    const req = httpTestingController.expectOne('https://api.example.com/test-key/pair/USD/EUR/200');
    const pairResponse: PairResponse = {
      base_code: 'USD',
      target_code: 'EUR',
      conversion_rate: 0.92,
      conversion_result: 184,
    };
    req.flush(pairResponse);

    const result = await convertPromise;
    expect(result).toBe(184);
  });

  it('convert should return null when snapshot lacks currency and no API key', async () => {
    env.apiKey = '';
    const service = createService();
    service.snapshot.set({
      base_code: 'USD',
      conversion_rates: { USD: 1 },
      time_last_update_unix: 1,
      time_next_update_unix: 2,
    });

    const result = await service.convert(100, 'USD', 'EUR');

    httpTestingController.expectNone('https://api.example.com/test-key/pair/USD/EUR/100');
    expect(result).toBeNull();
  });

  it('should report lastUpdated from cache timestamp when snapshot has none', () => {
    const service = createService();

    expect(service.lastUpdated()).toBeNull();
  });

  it('should fall back to sample data and no pair conversion when ENV_TOKEN is not provided', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CacheService, useValue: cacheSpy },
      ],
    });
    httpTestingController = TestBed.inject(HttpTestingController);

    const service = TestBed.inject(RatesService);
    cacheSpy.get.and.resolveTo({ value: null, stale: true, fetchedAt: null });

    await service.loadLatest();

    httpTestingController.expectNone(() => true);
    expect(service.snapshot()).not.toBeNull();
    expect(service.status()).toBe('offline');

    const converted = await service.convert(100, 'XYZ', 'EUR');
    expect(converted).toBeNull();
    httpTestingController.expectNone('https://api.example.com/test-key/pair/XYZ/EUR/100');
  });
});
