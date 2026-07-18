import { ComponentFixture, TestBed } from '@angular/core/testing';
import { computed, signal, WritableSignal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { HomeComponent } from './home.component';
import { RatesService } from '../../core/services/rates.service';
import { HistoryService, HistorySeriesPoint } from '../../core/services/history.service';
import { RealtimeService, RealtimeStatus } from '../../core/services/realtime.service';
import { LatestResponse } from '../../core/models/api.types';
import { routes } from '../../app.routes';

function createRatesServiceMock(): RatesService {
  const snapshot = signal<LatestResponse | null>(null);

  return {
    snapshot,
    base: signal('USD'),
    servedFromCache: signal(false),
    status: signal('live'),
    lastUpdated: computed(() => {
      const unix = snapshot()?.time_last_update_unix;
      return unix != null ? unix * 1000 : null;
    }),
    loadLatest: jasmine.createSpy('loadLatest'),
    convert: jasmine.createSpy('convert').and.returnValue(Promise.resolve(null)),
  } as unknown as RatesService;
}

class HistoryServiceStub implements Partial<HistoryService> {
  readonly series: WritableSignal<HistorySeriesPoint[]> = signal([]);
  loadHistory = jasmine.createSpy('loadHistory').and.resolveTo();
}

class RealtimeServiceStub implements Partial<RealtimeService> {
  readonly status: WritableSignal<RealtimeStatus> = signal('live');
  readonly lastUpdated: WritableSignal<number | null> = signal(null);
}

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter(routes),
        { provide: RatesService, useValue: createRatesServiceMock() },
        { provide: HistoryService, useValue: new HistoryServiceStub() },
        { provide: RealtimeService, useValue: new RealtimeServiceStub() },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the converter sidebar, rates table, and trends', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.home__sidebar app-converter')).toBeTruthy();
    expect(compiled.querySelector('app-rates-table')).toBeTruthy();
    expect(compiled.querySelector('app-trends')).toBeTruthy();
  });
});
