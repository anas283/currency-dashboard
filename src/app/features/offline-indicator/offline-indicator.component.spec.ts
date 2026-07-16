import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { OfflineIndicatorComponent } from './offline-indicator.component';
import { RealtimeService } from '../../core/services/realtime.service';
import { RatesService } from '../../core/services/rates.service';

function createRealtimeServiceMock(): RealtimeService {
  return {
    status: signal('live'),
    lastUpdated$: signal<number | null>(null),
  } as unknown as RealtimeService;
}

function createRatesServiceMock(): RatesService {
  return {
    status: signal<'live' | 'stale' | 'offline' | 'error'>('live'),
    servedFromCache: signal(false),
  } as unknown as RatesService;
}

describe('OfflineIndicatorComponent', () => {
  let fixture: ComponentFixture<OfflineIndicatorComponent>;
  let realtimeService: RealtimeService;
  let ratesService: RatesService;

  async function setup(): Promise<void> {
    TestBed.resetTestingModule();

    realtimeService = createRealtimeServiceMock();
    ratesService = createRatesServiceMock();

    await TestBed.configureTestingModule({
      imports: [OfflineIndicatorComponent],
      providers: [
        { provide: RealtimeService, useValue: realtimeService },
        { provide: RatesService, useValue: ratesService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OfflineIndicatorComponent);
  }

  afterEach(() => {
    fixture?.destroy();
    TestBed.resetTestingModule();
  });

  async function flush(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function getBadgeText(): string {
    return (fixture.nativeElement.querySelector('.badge') as HTMLElement)?.textContent ?? '';
  }

  it('should create', async () => {
    await setup();
    await flush();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render "Live" when rates are live and no timestamp is available', async () => {
    await setup();
    ratesService.status.set('live');
    (realtimeService.lastUpdated$ as ReturnType<typeof signal<number | null>>).set(null);

    await flush();

    expect(getBadgeText()).toBe('Live');
  });

  it('should render "Live · updated Xs ago" when rates are live', async () => {
    await setup();
    const nowSeconds = Math.floor(Date.now() / 1000);
    ratesService.status.set('live');
    (realtimeService.lastUpdated$ as ReturnType<typeof signal<number | null>>).set(nowSeconds - 30);

    await flush();

    expect(getBadgeText()).toContain('Live · updated');
    expect(getBadgeText()).toContain('s ago');
  });

  it('should render "Cached" when rates are stale and no timestamp is available', async () => {
    await setup();
    ratesService.status.set('stale');
    (realtimeService.lastUpdated$ as ReturnType<typeof signal<number | null>>).set(null);

    await flush();

    expect(getBadgeText()).toBe('Cached');
  });

  it('should render "Cached · fetched Xm ago" when rates are stale', async () => {
    await setup();
    const nowSeconds = Math.floor(Date.now() / 1000);
    ratesService.status.set('stale');
    (realtimeService.lastUpdated$ as ReturnType<typeof signal<number | null>>).set(nowSeconds - 120);

    await flush();

    expect(getBadgeText()).toContain('Cached · fetched');
    expect(getBadgeText()).toContain('m ago');
  });

  it('should render "Offline — showing cached data" when offline', async () => {
    await setup();
    ratesService.status.set('offline');

    await flush();

    expect(getBadgeText()).toBe('Offline — showing cached data');
  });

  it('should render "Error — using cached data" when in error state', async () => {
    await setup();
    ratesService.status.set('error');

    await flush();

    expect(getBadgeText()).toBe('Error — using cached data');
  });

  it('should use the positive badge variant for live and stale states', async () => {
    await setup();
    ratesService.status.set('live');
    await flush();
    expect(fixture.nativeElement.querySelector('.badge')).toHaveClass('badge--positive');

    ratesService.status.set('stale');
    await flush();
    expect(fixture.nativeElement.querySelector('.badge')).toHaveClass('badge--positive');
  });

  it('should use the negative badge variant for offline and error states', async () => {
    await setup();
    ratesService.status.set('offline');
    await flush();
    expect(fixture.nativeElement.querySelector('.badge')).toHaveClass('badge--negative');

    ratesService.status.set('error');
    await flush();
    expect(fixture.nativeElement.querySelector('.badge')).toHaveClass('badge--negative');
  });
});
