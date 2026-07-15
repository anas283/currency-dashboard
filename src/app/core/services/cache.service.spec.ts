import { TestBed } from '@angular/core/testing';
import { UseStore } from 'idb-keyval';

import { ENV_TOKEN, EnvironmentConfig } from '../tokens/env.token';
import { CACHE_STORE, CacheService } from './cache.service';

function createFakeStore(storage: Map<string, unknown>): UseStore {
  const fakeRequest = <T>(result: T): IDBRequest<T> => {
    const request = {
      result,
      addEventListener: () => void 0,
      removeEventListener: () => void 0,
    } as unknown as IDBRequest<T>;

    Object.defineProperty(request, 'onsuccess', {
      configurable: true,
      set: (fn: (() => void) | null) => {
        if (fn) fn.call(request);
      },
    });
    Object.defineProperty(request, 'oncomplete', {
      configurable: true,
      set: (fn: (() => void) | null) => {
        if (fn) fn.call(request);
      },
    });

    return request;
  };

  const fakeTransaction = (): IDBTransaction => {
    const tx = {
      addEventListener: () => void 0,
      removeEventListener: () => void 0,
    } as unknown as IDBTransaction;

    Object.defineProperty(tx, 'oncomplete', {
      configurable: true,
      set: (fn: (() => void) | null) => {
        if (fn) fn.call(tx);
      },
    });

    return tx;
  };

  return (txMode, callback) => {
    const store = {
      get: (key: IDBValidKey) => fakeRequest<unknown>(storage.get(String(key)) ?? undefined),
      put: (value: unknown, key: IDBValidKey) => {
        storage.set(String(key), value);
        return fakeRequest<undefined>(undefined);
      },
      clear: () => {
        storage.clear();
        return fakeRequest<undefined>(undefined);
      },
      transaction: fakeTransaction(),
    } as unknown as IDBObjectStore;

    return Promise.resolve(callback(store));
  };
}

describe('CacheService', () => {
  let storage: Map<string, unknown>;

  beforeEach(() => {
    storage = new Map();
    TestBed.configureTestingModule({
      providers: [
        { provide: CACHE_STORE, useValue: createFakeStore(storage) },
        { provide: ENV_TOKEN, useValue: { staleThreshold: 60_000 } as EnvironmentConfig },
      ],
    });
  });

  afterEach(() => {
    storage.clear();
  });

  const createService = (): CacheService => TestBed.inject(CacheService);

  it('should return null, stale true, and fetchedAt null for a cache miss', async () => {
    const service = createService();
    const result = await service.get<string>('missing-key');

    expect(result).toEqual({ value: null, stale: true, fetchedAt: null });
  });

  it('should return value and not stale after set', async () => {
    const service = createService();
    await service.set('my-key', 42);
    const result = await service.get<number>('my-key');

    expect(result.value).toBe(42);
    expect(result.stale).toBeFalse();
    expect(result.fetchedAt).toBeGreaterThan(0);
  });

  it('should mark stale when fetchedAt exceeds staleThreshold', async () => {
    const oldTimestamp = Date.now() - 100_000;
    storage.set('meta::schemaVersion', 1);
    storage.set('old-key', { value: 'old', fetchedAt: oldTimestamp });

    const service = createService();
    const result = await service.get<string>('old-key');

    expect(result.value).toBe('old');
    expect(result.stale).toBeTrue();
    expect(result.fetchedAt).toBe(oldTimestamp);
  });

  it('should mark not stale when within staleThreshold', async () => {
    const recentTimestamp = Date.now() - 1_000;
    storage.set('meta::schemaVersion', 1);
    storage.set('recent-key', { value: 'recent', fetchedAt: recentTimestamp });

    const service = createService();
    const result = await service.get<string>('recent-key');

    expect(result.value).toBe('recent');
    expect(result.stale).toBeFalse();
    expect(result.fetchedAt).toBe(recentTimestamp);
  });

  it('should clear the store', async () => {
    const service = createService();
    await service.set('key', 'value');
    await service.clear();
    const result = await service.get<string>('key');

    expect(result.value).toBeNull();
    expect(result.stale).toBeTrue();
  });

  it('should clear store and set schema version when schema mismatch', async () => {
    storage.set('meta::schemaVersion', 0);
    storage.set('old-data', { value: 'data', fetchedAt: Date.now() });

    const service = createService();
    await service.get('any');

    expect(storage.has('old-data')).toBeFalse();
    expect(storage.get('meta::schemaVersion')).toBe(1);
  });

  it('should not clear store when schema version matches', async () => {
    storage.set('meta::schemaVersion', 1);
    storage.set('existing-data', { value: 'data', fetchedAt: Date.now() });

    const service = createService();
    await service.get('existing-data');

    expect(storage.get('existing-data')).toEqual({
      value: 'data',
      fetchedAt: jasmine.any(Number) as unknown as number,
    });
    expect(storage.get('meta::schemaVersion')).toBe(1);
  });

  it('should use default stale threshold when ENV_TOKEN is not provided', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: CACHE_STORE, useValue: createFakeStore(storage) }],
    });
    storage.clear();
    storage.set('meta::schemaVersion', 1);
    storage.set('default-key', { value: 'x', fetchedAt: Date.now() - 16 * 60 * 1000 });

    const service = createService();
    const result = await service.get<string>('default-key');

    expect(result.stale).toBeTrue();
  });
});
