import { ComponentFixture, TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';

import { HomeComponent } from './home.component';
import { RatesService } from '../../core/services/rates.service';
import { LatestResponse } from '../../core/models/api.types';

function createRatesServiceMock(): RatesService {
  const snapshot = signal<LatestResponse | null>(null);

  return {
    snapshot,
    base: signal('USD'),
    servedFromCache: signal(false),
    status: signal('live'),
    lastUpdated: computed(() => snapshot()?.time_last_update_unix ?? null),
    loadLatest: jasmine.createSpy('loadLatest'),
    convert: jasmine.createSpy('convert').and.returnValue(Promise.resolve(null)),
  } as unknown as RatesService;
}

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [{ provide: RatesService, useValue: createRatesServiceMock() }],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render hero band, converter, and placeholder sections', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-hero-band')).toBeTruthy();
    expect(compiled.querySelector('app-hero-band app-converter')).toBeTruthy();
    expect(compiled.textContent).toContain('Amount');
    expect(compiled.textContent).toContain('Rates table placeholder');
    expect(compiled.textContent).toContain('Trends placeholder');
  });
});
