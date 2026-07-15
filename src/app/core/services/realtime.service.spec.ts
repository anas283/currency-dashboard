import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';

import { ENV_TOKEN, EnvironmentConfig } from '../tokens/env.token';
import { OnlineService } from './online.service';
import { RatesService } from './rates.service';
import { RealtimeService } from './realtime.service';

function createEnv(overrides?: Partial<EnvironmentConfig>): EnvironmentConfig {
  return {
    apiBase: 'https://api.example.com',
    apiKey: 'test-key',
    pollInterval: 60_000,
    staleThreshold: 15 * 60 * 1000,
    ...overrides,
  };
}

async function drainMicrotasks(rounds = 10): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await Promise.resolve();
  }
}

describe('RealtimeService', () => {
  let service: RealtimeService;
  let ratesService: jasmine.SpyObj<RatesService> & {
    status: WritableSignal<'live' | 'stale' | 'offline' | 'error'>;
    lastUpdated: WritableSignal<number | null>;
  };
  let onlineService: { online: WritableSignal<boolean> };
  let env: EnvironmentConfig;

  beforeEach(() => {
    jasmine.clock().install();

    const ratesStatus = signal<'live' | 'stale' | 'offline' | 'error'>('live');
    const ratesLastUpdated = signal<number | null>(null);

    ratesService = {
      loadLatest: jasmine.createSpy('loadLatest').and.resolveTo(),
      status: ratesStatus,
      lastUpdated: ratesLastUpdated,
    } as unknown as typeof ratesService;

    onlineService = {
      online: signal(true),
    };

    env = createEnv();

    TestBed.configureTestingModule({
      providers: [
        { provide: RatesService, useValue: ratesService },
        { provide: OnlineService, useValue: onlineService },
        { provide: ENV_TOKEN, useValue: env },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    jasmine.clock().uninstall();
  });

  const createService = (): RealtimeService => TestBed.inject(RealtimeService);

  it('should be created with live status', () => {
    service = createService();

    expect(service).toBeTruthy();
    expect(service.status()).toBe('live');
    expect(service.lastUpdated$()).toBeNull();
  });

  it('should poll immediately on start', async () => {
    service = createService();

    jasmine.clock().tick(0);
    await drainMicrotasks();

    expect(ratesService.loadLatest).toHaveBeenCalledTimes(1);
    expect(service.status()).toBe('live');
  });

  it('should poll on each interval tick', async () => {
    service = createService();

    jasmine.clock().tick(0);
    await drainMicrotasks();
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(1);

    jasmine.clock().tick(env.pollInterval);
    await drainMicrotasks();
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(2);

    jasmine.clock().tick(env.pollInterval);
    await drainMicrotasks();
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(3);
  });

  it('should pause polling when document is hidden', async () => {
    spyOnProperty(document, 'hidden', 'get').and.returnValue(true);
    service = createService();

    jasmine.clock().tick(0);
    await drainMicrotasks();

    expect(service.status()).toBe('paused');
    expect(ratesService.loadLatest).not.toHaveBeenCalled();
  });

  it('should resume polling when document becomes visible', async () => {
    let hidden = true;
    spyOnProperty(document, 'hidden', 'get').and.callFake(() => hidden);
    service = createService();

    jasmine.clock().tick(0);
    await drainMicrotasks();
    expect(service.status()).toBe('paused');
    expect(ratesService.loadLatest).not.toHaveBeenCalled();

    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    jasmine.clock().tick(0);
    await drainMicrotasks();

    expect(ratesService.loadLatest).toHaveBeenCalledTimes(1);
    expect(service.status()).toBe('live');
  });

  it('should pause polling when offline', async () => {
    onlineService.online.set(false);
    service = createService();

    jasmine.clock().tick(0);
    await drainMicrotasks();

    expect(service.status()).toBe('offline');
    expect(ratesService.loadLatest).not.toHaveBeenCalled();
  });

  it('should resume polling when online comes back', async () => {
    onlineService.online.set(false);
    service = createService();

    jasmine.clock().tick(0);
    await drainMicrotasks();
    expect(service.status()).toBe('offline');
    expect(ratesService.loadLatest).not.toHaveBeenCalled();

    onlineService.online.set(true);
    window.dispatchEvent(new Event('online'));
    jasmine.clock().tick(0);
    await drainMicrotasks();

    expect(ratesService.loadLatest).toHaveBeenCalledTimes(1);
    expect(service.status()).toBe('live');
  });

  it('should backoff exponentially on failures', async () => {
    ratesService.loadLatest.and.callFake(async () => {
      ratesService.status.set('stale');
    });
    service = createService();

    jasmine.clock().tick(0);
    await drainMicrotasks();
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(1);
    expect(service.status()).toBe('backing-off');

    jasmine.clock().tick(1_000);
    await drainMicrotasks();
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(2);
    expect(service.status()).toBe('backing-off');

    jasmine.clock().tick(2_000);
    await drainMicrotasks();
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(3);
    expect(service.status()).toBe('backing-off');

    jasmine.clock().tick(4_000);
    await drainMicrotasks();
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(4);
  });

  it('should reset backoff on success', async () => {
    let calls = 0;
    ratesService.loadLatest.and.callFake(async () => {
      calls++;
      ratesService.status.set(calls <= 2 ? 'stale' : 'live');
    });
    service = createService();

    jasmine.clock().tick(0);
    await drainMicrotasks();
    expect(service.status()).toBe('backing-off');

    jasmine.clock().tick(1_000);
    await drainMicrotasks();
    expect(service.status()).toBe('backing-off');

    jasmine.clock().tick(2_000);
    await drainMicrotasks();
    expect(service.status()).toBe('live');
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(3);

    jasmine.clock().tick(env.pollInterval);
    await drainMicrotasks();
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(4);
  });

  it('should double base interval after 5 consecutive failures', async () => {
    env.pollInterval = 1_000;
    ratesService.loadLatest.and.callFake(async () => {
      ratesService.status.set('stale');
    });
    service = createService();

    jasmine.clock().tick(0);
    await drainMicrotasks();

    // Failures 2-5 with exponential backoff.
    jasmine.clock().tick(1_000);
    await drainMicrotasks();
    jasmine.clock().tick(2_000);
    await drainMicrotasks();
    jasmine.clock().tick(4_000);
    await drainMicrotasks();
    jasmine.clock().tick(8_000);
    await drainMicrotasks();

    expect(ratesService.loadLatest).toHaveBeenCalledTimes(5);

    // After the 5th failure, the base interval doubles to 2s. Succeed on the
    // next backoff tick (16s) so future normal polling uses the doubled interval.
    ratesService.loadLatest.and.callFake(async () => {
      ratesService.status.set('live');
    });
    jasmine.clock().tick(16_000);
    await drainMicrotasks();
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(6);
    expect(service.status()).toBe('live');

    // Next normal poll should use doubled interval (2s).
    jasmine.clock().tick(2_000);
    await drainMicrotasks();
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(7);
  });

  it('should cap doubled base interval at 5 minutes', async () => {
    env.pollInterval = 2 * 60 * 1000; // 2 minutes
    ratesService.loadLatest.and.callFake(async () => {
      ratesService.status.set('stale');
    });
    service = createService();

    jasmine.clock().tick(0);
    await drainMicrotasks();

    // First 4 additional failures to reach 5 total; baseInterval -> 4m.
    for (let i = 0; i < 4; i++) {
      jasmine.clock().tick(Math.min(1000 * 2 ** i, 60_000));
      await drainMicrotasks();
    }
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(5);

    // Another 5 failures; baseInterval would go 4m -> 8m but caps at 5m.
    for (let i = 0; i < 5; i++) {
      jasmine.clock().tick(Math.min(1000 * 2 ** (i + 4), 60_000));
      await drainMicrotasks();
    }
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(10);

    // Succeed; next normal poll should use the capped 5m interval.
    ratesService.loadLatest.and.callFake(async () => {
      ratesService.status.set('live');
    });
    jasmine.clock().tick(60_000);
    await drainMicrotasks();
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(11);
    expect(service.status()).toBe('live');

    jasmine.clock().tick(5 * 60 * 1000);
    await drainMicrotasks();
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(12);
  });

  it('should refresh immediately', async () => {
    service = createService();

    jasmine.clock().tick(0);
    await drainMicrotasks();
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(1);

    jasmine.clock().tick(env.pollInterval / 2);
    service.refresh();
    jasmine.clock().tick(0);
    await drainMicrotasks();

    expect(ratesService.loadLatest).toHaveBeenCalledTimes(2);
  });

  it('should reflect RatesService.lastUpdated through lastUpdated$', async () => {
    service = createService();

    expect(service.lastUpdated$()).toBeNull();

    ratesService.lastUpdated.set(1_000);

    expect(service.lastUpdated$()).toBe(1_000);
  });

  it('should report error status when RatesService.status is error', async () => {
    ratesService.loadLatest.and.callFake(async () => {
      ratesService.status.set('error');
    });
    service = createService();

    jasmine.clock().tick(0);
    await drainMicrotasks();

    expect(service.status()).toBe('error');
  });
});
