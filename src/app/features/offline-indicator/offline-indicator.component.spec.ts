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

type RealtimeServiceShape = Pick<
  RealtimeService,
  'status' | 'lastUpdated' | 'refresh' | 'ngOnDestroy'
>;

class RealtimeServiceStub implements RealtimeServiceShape {
  readonly status: WritableSignal<RealtimeStatus> = signal('live');
  readonly lastUpdated: WritableSignal<number | null> = signal(null);

  refresh = jasmine.createSpy('refresh');
  ngOnDestroy = jasmine.createSpy('ngOnDestroy');
}

describe('OfflineIndicatorComponent', () => {
  let fixture: ComponentFixture<OfflineIndicatorComponent>;
  let realtimeService: RealtimeServiceStub;

  beforeEach(() => {
    TestBed.resetTestingModule();

    TestBed.configureTestingModule({
      imports: [OfflineIndicatorComponent],
      providers: [
        { provide: RealtimeService, useClass: RealtimeServiceStub },
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

  it('should render "Live" when live and no timestamp is available', fakeAsync(() => {
    createFixture();
    realtimeService.status.set('live');
    realtimeService.lastUpdated.set(null);

    detectChanges();
    tick(0);

    expect(getBadgeText()).toBe('Live');

    discardPeriodicTasks();
  }));

  it('should render "Live · updated Xs ago" when live', fakeAsync(() => {
    const now = Date.now();
    createFixture();
    realtimeService.status.set('live');
    realtimeService.lastUpdated.set(now - 30_000);

    detectChanges();
    tick(0);

    expect(getBadgeText()).toContain('Live · updated');
    expect(getBadgeText()).toContain('s ago');

    discardPeriodicTasks();
  }));

  it('should refresh the "Xs ago" text every second when live', fakeAsync(() => {
    const now = Date.now();
    createFixture();
    realtimeService.status.set('live');
    realtimeService.lastUpdated.set(now - 30_000);

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

  it('should render "Live · updated Xm ago" once stale past 60s', fakeAsync(() => {
    const now = Date.now();
    createFixture();
    realtimeService.status.set('live');
    realtimeService.lastUpdated.set(now - 90_000);

    detectChanges();
    tick(0);

    expect(getBadgeText()).toContain('Live · updated');
    expect(getBadgeText()).toContain('m ago');
    expect(getBadgeText()).not.toContain('s ago');

    discardPeriodicTasks();
  }));

  it('should refresh the "Xm ago" text every minute when backing-off', fakeAsync(() => {
    const now = Date.now();
    createFixture();
    realtimeService.status.set('backing-off');
    realtimeService.lastUpdated.set(now - 120_000);

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

  it('should render "Backing off" when backing-off and no timestamp is available', fakeAsync(() => {
    createFixture();
    realtimeService.status.set('backing-off');
    realtimeService.lastUpdated.set(null);

    detectChanges();
    tick(0);

    expect(getBadgeText()).toBe('Backing off');

    discardPeriodicTasks();
  }));

  it('should render "Backing off · fetched Xm ago" when backing-off', fakeAsync(() => {
    const now = Date.now();
    createFixture();
    realtimeService.status.set('backing-off');
    realtimeService.lastUpdated.set(now - 120_000);

    detectChanges();
    tick(0);

    expect(getBadgeText()).toContain('Backing off · fetched');
    expect(getBadgeText()).toContain('m ago');

    discardPeriodicTasks();
  }));

  it('should render "Paused" when paused', fakeAsync(() => {
    createFixture();
    realtimeService.status.set('paused');

    detectChanges();
    tick(0);

    expect(getBadgeText()).toBe('Paused');

    discardPeriodicTasks();
  }));

  it('should render "Offline — showing cached data" when offline', fakeAsync(() => {
    createFixture();
    realtimeService.status.set('offline');

    detectChanges();
    tick(0);

    expect(getBadgeText()).toBe('Offline — showing cached data');

    discardPeriodicTasks();
  }));

  it('should render "Error — using cached data" when in error state', fakeAsync(() => {
    createFixture();
    realtimeService.status.set('error');

    detectChanges();
    tick(0);

    expect(getBadgeText()).toBe('Error — using cached data');

    discardPeriodicTasks();
  }));

  it('should use the positive badge variant for live and polling states', fakeAsync(() => {
    createFixture();
    realtimeService.status.set('live');
    detectChanges();
    tick(0);
    expect(
      fixture.nativeElement.querySelector('.badge')
    ).toHaveClass('badge--positive');

    realtimeService.status.set('polling');
    detectChanges();
    tick(0);
    expect(
      fixture.nativeElement.querySelector('.badge')
    ).toHaveClass('badge--positive');

    discardPeriodicTasks();
  }));

  it('should use the negative badge variant for backing-off, paused, offline, and error states', fakeAsync(() => {
    createFixture();
    realtimeService.status.set('backing-off');
    detectChanges();
    tick(0);
    expect(
      fixture.nativeElement.querySelector('.badge')
    ).toHaveClass('badge--negative');

    realtimeService.status.set('paused');
    detectChanges();
    tick(0);
    expect(
      fixture.nativeElement.querySelector('.badge')
    ).toHaveClass('badge--negative');

    realtimeService.status.set('offline');
    detectChanges();
    tick(0);
    expect(
      fixture.nativeElement.querySelector('.badge')
    ).toHaveClass('badge--negative');

    realtimeService.status.set('error');
    detectChanges();
    tick(0);
    expect(
      fixture.nativeElement.querySelector('.badge')
    ).toHaveClass('badge--negative');

    discardPeriodicTasks();
  }));
});
