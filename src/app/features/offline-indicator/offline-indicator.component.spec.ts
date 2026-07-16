import {
  ComponentFixture,
  discardPeriodicTasks,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';

import { OfflineIndicatorComponent } from './offline-indicator.component';
import {
  RealtimeService,
  RealtimeStatus,
} from '../../core/services/realtime.service';
import { RatesService } from '../../core/services/rates.service';
import { LatestResponse } from '../../core/models/api.types';

type RealtimeServiceShape = Pick<
  RealtimeService,
  'status' | 'lastUpdated$' | 'refresh' | 'ngOnDestroy'
>;

type RatesServiceShape = Pick<
  RatesService,
  'snapshot' | 'base' | 'servedFromCache' | 'status' | 'loadLatest' | 'convert'
>;

class RealtimeServiceStub implements RealtimeServiceShape {
  readonly status: WritableSignal<RealtimeStatus> = signal('live');
  readonly lastUpdated$: WritableSignal<number | null> = signal(null);

  refresh = jasmine.createSpy('refresh');
  ngOnDestroy = jasmine.createSpy('ngOnDestroy');
}

class RatesServiceStub implements RatesServiceShape {
  readonly snapshot = signal<LatestResponse | null>(null);
  readonly base = signal('USD');
  readonly servedFromCache = signal(false);
  readonly status = signal<'live' | 'stale' | 'offline' | 'error'>('live');

  loadLatest = jasmine.createSpy('loadLatest').and.resolveTo();
  convert = jasmine.createSpy('convert').and.resolveTo(null);
}

describe('OfflineIndicatorComponent', () => {
  let fixture: ComponentFixture<OfflineIndicatorComponent>;
  let realtimeService: RealtimeServiceStub;
  let ratesService: RatesServiceStub;

  beforeEach(() => {
    TestBed.resetTestingModule();

    TestBed.configureTestingModule({
      imports: [OfflineIndicatorComponent],
      providers: [
        { provide: RealtimeService, useClass: RealtimeServiceStub },
        { provide: RatesService, useClass: RatesServiceStub },
      ],
    });
  });

  afterEach(() => {
    fixture?.destroy();
    TestBed.resetTestingModule();
  });

  function createFixture(): void {
    fixture = TestBed.createComponent(OfflineIndicatorComponent);
    realtimeService = TestBed.inject(
      RealtimeService
    ) as unknown as RealtimeServiceStub;
    ratesService = TestBed.inject(RatesService) as unknown as RatesServiceStub;
  }

  function detectChanges(): void {
    fixture.detectChanges();
  }

  function getBadgeText(): string {
    return (
      (fixture.nativeElement.querySelector('.badge') as HTMLElement)
        ?.textContent ?? ''
    );
  }

  it('should create', fakeAsync(() => {
    createFixture();
    detectChanges();
    tick(0);

    expect(fixture.componentInstance).toBeTruthy();

    discardPeriodicTasks();
  }));

  it('should render "Live" when rates are live and no timestamp is available', fakeAsync(() => {
    createFixture();
    ratesService.status.set('live');
    realtimeService.lastUpdated$.set(null);

    detectChanges();
    tick(0);

    expect(getBadgeText()).toBe('Live');

    discardPeriodicTasks();
  }));

  it('should render "Live · updated Xs ago" when rates are live', fakeAsync(() => {
    const now = Date.now();
    createFixture();
    ratesService.status.set('live');
    realtimeService.lastUpdated$.set(now - 30_000);

    detectChanges();
    tick(0);

    expect(getBadgeText()).toContain('Live · updated');
    expect(getBadgeText()).toContain('s ago');

    discardPeriodicTasks();
  }));

  it('should refresh the "Xs ago" text every second when live', fakeAsync(() => {
    const now = Date.now();
    createFixture();
    ratesService.status.set('live');
    realtimeService.lastUpdated$.set(now - 30_000);

    detectChanges();
    tick(0);

    const firstMatch = getBadgeText().match(/updated (\d+)s ago/);
    expect(firstMatch).toBeTruthy();
    const firstSeconds = Number(firstMatch![1]);

    tick(1000);
    detectChanges();

    const secondMatch = getBadgeText().match(/updated (\d+)s ago/);
    expect(secondMatch).toBeTruthy();
    expect(Number(secondMatch![1])).toBe(firstSeconds + 1);

    discardPeriodicTasks();
  }));

  it('should refresh the "Xm ago" text every minute when stale', fakeAsync(() => {
    const now = Date.now();
    createFixture();
    ratesService.status.set('stale');
    realtimeService.lastUpdated$.set(now - 120_000);

    detectChanges();
    tick(0);

    const firstMatch = getBadgeText().match(/fetched (\d+)m ago/);
    expect(firstMatch).toBeTruthy();
    const firstMinutes = Number(firstMatch![1]);

    tick(60_000);
    detectChanges();

    const secondMatch = getBadgeText().match(/fetched (\d+)m ago/);
    expect(secondMatch).toBeTruthy();
    expect(Number(secondMatch![1])).toBe(firstMinutes + 1);

    discardPeriodicTasks();
  }));

  it('should render "Cached" when rates are stale and no timestamp is available', fakeAsync(() => {
    createFixture();
    ratesService.status.set('stale');
    realtimeService.lastUpdated$.set(null);

    detectChanges();
    tick(0);

    expect(getBadgeText()).toBe('Cached');

    discardPeriodicTasks();
  }));

  it('should render "Cached · fetched Xm ago" when rates are stale', fakeAsync(() => {
    const now = Date.now();
    createFixture();
    ratesService.status.set('stale');
    realtimeService.lastUpdated$.set(now - 120_000);

    detectChanges();
    tick(0);

    expect(getBadgeText()).toContain('Cached · fetched');
    expect(getBadgeText()).toContain('m ago');

    discardPeriodicTasks();
  }));

  it('should render "Offline — showing cached data" when offline', fakeAsync(() => {
    createFixture();
    ratesService.status.set('offline');

    detectChanges();
    tick(0);

    expect(getBadgeText()).toBe('Offline — showing cached data');

    discardPeriodicTasks();
  }));

  it('should render "Error — using cached data" when in error state', fakeAsync(() => {
    createFixture();
    ratesService.status.set('error');

    detectChanges();
    tick(0);

    expect(getBadgeText()).toBe('Error — using cached data');

    discardPeriodicTasks();
  }));

  it('should use the positive badge variant for live and stale states', fakeAsync(() => {
    createFixture();
    ratesService.status.set('live');
    detectChanges();
    tick(0);
    expect(
      fixture.nativeElement.querySelector('.badge')
    ).toHaveClass('badge--positive');

    ratesService.status.set('stale');
    detectChanges();
    tick(0);
    expect(
      fixture.nativeElement.querySelector('.badge')
    ).toHaveClass('badge--positive');

    discardPeriodicTasks();
  }));

  it('should use the negative badge variant for offline and error states', fakeAsync(() => {
    createFixture();
    ratesService.status.set('offline');
    detectChanges();
    tick(0);
    expect(
      fixture.nativeElement.querySelector('.badge')
    ).toHaveClass('badge--negative');

    ratesService.status.set('error');
    detectChanges();
    tick(0);
    expect(
      fixture.nativeElement.querySelector('.badge')
    ).toHaveClass('badge--negative');

    discardPeriodicTasks();
  }));
});
