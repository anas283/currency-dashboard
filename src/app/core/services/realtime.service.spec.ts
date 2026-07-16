import { fakeAsync, tick, discardPeriodicTasks, TestBed } from '@angular/core/testing';
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

describe('RealtimeService', () => {
  let service: RealtimeService;
  let ratesService: jasmine.SpyObj<RatesService> & {
    status: WritableSignal<'live' | 'stale' | 'offline' | 'error'>;
    lastUpdated: WritableSignal<number | null>;
  };
  let onlineService: { online: WritableSignal<boolean> };
  let env: EnvironmentConfig;

  beforeEach(() => {
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
    service?.ngOnDestroy();
    TestBed.resetTestingModule();
  });

  const createService = (): RealtimeService => TestBed.inject(RealtimeService);

  it('should be created with live status', fakeAsync(() => {
    service = createService();
    tick(0);

    expect(service).toBeTruthy();
    expect(service.status()).toBe('live');
    expect(service.lastUpdated$()).toBeNull();

    discardPeriodicTasks();
  }));

  it('should poll immediately on start', fakeAsync(() => {
    service = createService();
    tick(0);

    expect(ratesService.loadLatest).toHaveBeenCalledTimes(1);
    expect(service.status()).toBe('live');

    discardPeriodicTasks();
  }));

  it('should poll on each interval tick', fakeAsync(() => {
    service = createService();

    tick(0);
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(1);

    tick(env.pollInterval);
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(2);

    tick(env.pollInterval);
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(3);

    discardPeriodicTasks();
  }));

  it('should pause polling when document is hidden', fakeAsync(() => {
    spyOnProperty(document, 'hidden', 'get').and.returnValue(true);
    service = createService();
    tick(0);

    expect(service.status()).toBe('paused');
    expect(ratesService.loadLatest).not.toHaveBeenCalled();
  }));

  it('should resume polling when document becomes visible', fakeAsync(() => {
    let hidden = true;
    spyOnProperty(document, 'hidden', 'get').and.callFake(() => hidden);
    service = createService();

    tick(0);
    expect(service.status()).toBe('paused');
    expect(ratesService.loadLatest).not.toHaveBeenCalled();

    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    tick(0);

    expect(ratesService.loadLatest).toHaveBeenCalledTimes(1);
    expect(service.status()).toBe('live');

    discardPeriodicTasks();
  }));

  it('should pause polling when offline', fakeAsync(() => {
    onlineService.online.set(false);
    service = createService();
    tick(0);

    expect(service.status()).toBe('offline');
    expect(ratesService.loadLatest).not.toHaveBeenCalled();
  }));

  it('should resume polling when online comes back', fakeAsync(() => {
    onlineService.online.set(false);
    service = createService();

    tick(0);
    expect(service.status()).toBe('offline');
    expect(ratesService.loadLatest).not.toHaveBeenCalled();

    onlineService.online.set(true);
    window.dispatchEvent(new Event('online'));
    tick(0);

    expect(ratesService.loadLatest).toHaveBeenCalledTimes(1);
    expect(service.status()).toBe('live');

    discardPeriodicTasks();
  }));

  it('should backoff exponentially on failures', fakeAsync(() => {
    ratesService.loadLatest.and.callFake(async () => {
      ratesService.status.set('stale');
    });
    service = createService();

    tick(0);
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(1);
    expect(service.status()).toBe('backing-off');

    tick(1_000);
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(2);
    expect(service.status()).toBe('backing-off');

    tick(2_000);
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(3);
    expect(service.status()).toBe('backing-off');

    tick(4_000);
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(4);

    discardPeriodicTasks();
  }));

  it('should reset backoff on success', fakeAsync(() => {
    let calls = 0;
    ratesService.loadLatest.and.callFake(async () => {
      calls++;
      ratesService.status.set(calls <= 2 ? 'stale' : 'live');
    });
    service = createService();

    tick(0);
    expect(service.status()).toBe('backing-off');

    tick(1_000);
    expect(service.status()).toBe('backing-off');

    tick(2_000);
    expect(service.status()).toBe('live');
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(3);

    tick(env.pollInterval);
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(4);

    discardPeriodicTasks();
  }));

  it('should double base interval after 5 consecutive failures', fakeAsync(() => {
    env.pollInterval = 1_000;
    ratesService.loadLatest.and.callFake(async () => {
      ratesService.status.set('stale');
    });
    service = createService();

    tick(0);

    // Failures 2-5 with exponential backoff.
    tick(1_000);
    tick(2_000);
    tick(4_000);
    tick(8_000);

    expect(ratesService.loadLatest).toHaveBeenCalledTimes(5);

    // After the 5th failure, the base interval doubles to 2s. Succeed on the
    // next backoff tick (16s) so future normal polling uses the doubled interval.
    ratesService.loadLatest.and.callFake(async () => {
      ratesService.status.set('live');
    });
    tick(16_000);
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(6);
    expect(service.status()).toBe('live');

    // Next normal poll should use doubled interval (2s).
    tick(2_000);
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(7);

    discardPeriodicTasks();
  }));

  it('should cap doubled base interval at 5 minutes', fakeAsync(() => {
    env.pollInterval = 2 * 60 * 1000; // 2 minutes
    ratesService.loadLatest.and.callFake(async () => {
      ratesService.status.set('stale');
    });
    service = createService();

    tick(0);

    // First 4 additional failures to reach 5 total; baseInterval -> 4m.
    for (let i = 0; i < 4; i++) {
      tick(Math.min(1000 * 2 ** i, 60_000));
    }
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(5);

    // Another 5 failures; baseInterval would go 4m -> 8m but caps at 5m.
    for (let i = 0; i < 5; i++) {
      tick(Math.min(1000 * 2 ** (i + 4), 60_000));
    }
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(10);

    // Succeed; next normal poll should use the capped 5m interval.
    ratesService.loadLatest.and.callFake(async () => {
      ratesService.status.set('live');
    });
    tick(60_000);
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(11);
    expect(service.status()).toBe('live');

    tick(5 * 60 * 1000);
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(12);

    discardPeriodicTasks();
  }));

  it('should refresh immediately', fakeAsync(() => {
    service = createService();

    tick(0);
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(1);

    tick(env.pollInterval / 2);
    service.refresh();
    tick(0);

    expect(ratesService.loadLatest).toHaveBeenCalledTimes(2);

    discardPeriodicTasks();
  }));

  it('should queue refresh when called while a poll is in-flight', fakeAsync(() => {
    let resolveLatest: (value: void | PromiseLike<void>) => void;
    ratesService.loadLatest.and.returnValue(
      new Promise<void>((resolve) => {
        resolveLatest = resolve;
      })
    );

    service = createService();
    tick(0);

    expect(ratesService.loadLatest).toHaveBeenCalledTimes(1);
    expect(service.status()).toBe('polling');

    service.refresh();
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(1);

    resolveLatest!();
    tick(0);

    expect(ratesService.loadLatest).toHaveBeenCalledTimes(2);
    expect(service.status()).toBe('live');

    discardPeriodicTasks();
  }));

  it('should reflect RatesService.lastUpdated through lastUpdated$', () => {
    service = createService();

    expect(service.lastUpdated$()).toBeNull();

    ratesService.lastUpdated.set(1_000);

    expect(service.lastUpdated$()).toBe(1_000);
  });

  it('should report error status when RatesService.status is error', fakeAsync(() => {
    ratesService.loadLatest.and.callFake(async () => {
      ratesService.status.set('error');
    });
    service = createService();

    tick(0);

    expect(service.status()).toBe('error');

    discardPeriodicTasks();
  }));

  it('should use default poll interval when ENV_TOKEN is not provided', fakeAsync(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: RatesService, useValue: ratesService },
        { provide: OnlineService, useValue: onlineService },
      ],
    });
    service = TestBed.inject(RealtimeService);

    tick(0);
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(1);

    discardPeriodicTasks();
  }));

  it('should pause on visibilitychange when document is hidden', fakeAsync(() => {
    spyOnProperty(document, 'hidden', 'get').and.returnValue(true);
    service = createService();

    tick(0);
    expect(service.status()).toBe('paused');

    document.dispatchEvent(new Event('visibilitychange'));
    tick(0);
    expect(service.status()).toBe('paused');
  }));

  it('should skip tick when a poll is already in flight', fakeAsync(() => {
    ratesService.loadLatest.and.returnValue(new Promise<void>(() => undefined));
    service = createService();

    tick(0);
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(1);
    expect(service.status()).toBe('polling');

    tick(env.pollInterval);
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(1);
    expect(service.status()).toBe('polling');

    service.ngOnDestroy();
    discardPeriodicTasks();
  }));

  it('should pause on tick when the browser goes offline', fakeAsync(() => {
    service = createService();

    tick(0);
    expect(ratesService.loadLatest).toHaveBeenCalledTimes(1);

    onlineService.online.set(false);
    tick(env.pollInterval);

    expect(service.status()).toBe('offline');

    discardPeriodicTasks();
  }));
});
