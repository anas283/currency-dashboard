import { ComponentFixture, TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';

import { ConverterComponent } from './converter.component';
import { LatestResponse } from '../../core/models/api.types';
import { RatesService } from '../../core/services/rates.service';

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
    convert: jasmine.createSpy('convert'),
  } as unknown as RatesService;
}

describe('ConverterComponent', () => {
  let fixture: ComponentFixture<ConverterComponent>;
  let component: ConverterComponent;
  let ratesService: RatesService;

  async function setup(convertValue: number | null = null): Promise<void> {
    TestBed.resetTestingModule();

    ratesService = createRatesServiceMock();
    (ratesService.convert as jasmine.Spy).and.returnValue(
      Promise.resolve(convertValue),
    );

    await TestBed.configureTestingModule({
      imports: [ConverterComponent],
      providers: [{ provide: RatesService, useValue: ratesService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ConverterComponent);
    component = fixture.componentInstance;
  }

  afterEach(() => {
    fixture?.destroy();
    TestBed.resetTestingModule();
  });

  async function flush(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function getSwapButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector(
      '[data-testid="swap-button"] button',
    ) as HTMLButtonElement;
  }

  function getResultText(): string {
    return (
      fixture.nativeElement.querySelector(
        '[data-testid="converter-result"]',
      ) as HTMLElement
    )?.textContent ?? '';
  }

  it('should create', async () => {
    await setup();
    await flush();
    expect(component).toBeTruthy();
  });

  it('should compute and display the converted result when inputs change', async () => {
    await setup(92);
    component.amount.set(100);
    component.from.set('USD');
    component.to.set('EUR');

    await flush();

    expect(ratesService.convert).toHaveBeenCalledWith(100, 'USD', 'EUR');
    expect(getResultText()).toContain('92.00');
    expect(getResultText()).toContain('EUR');
  });

  it('should swap from and to while keeping the amount', async () => {
    await setup();
    component.amount.set(250);
    component.from.set('USD');
    component.to.set('GBP');
    await flush();

    getSwapButton().click();
    await flush();

    expect(component.from()).toBe('GBP');
    expect(component.to()).toBe('USD');
    expect(component.amount()).toBe(250);
  });

  it('should call convert for currencies missing from the snapshot (pair fallback)', async () => {
    await setup(14_800);
    ratesService.snapshot.set({
      base_code: 'USD',
      conversion_rates: { USD: 1, EUR: 0.92 },
      time_last_update_unix: 1,
      time_next_update_unix: 2,
    });

    component.amount.set(100);
    component.from.set('USD');
    component.to.set('JPY');

    await flush();

    expect(ratesService.convert).toHaveBeenCalledWith(100, 'USD', 'JPY');
    expect(getResultText()).toContain('14,800.00');
    expect(getResultText()).toContain('JPY');
  });

  it('should show an em dash when the result is unavailable', async () => {
    await setup(null);
    component.amount.set(100);
    component.from.set('USD');
    component.to.set('EUR');

    await flush();

    expect(getResultText()).toContain('—');
  });

  it('should include the base currency plus the top 30 in the selectors', async () => {
    await setup();
    ratesService.base.set('XYZ');

    await flush();

    const options = Array.from(
      fixture.nativeElement.querySelectorAll('#converter-from option'),
    ) as HTMLOptionElement[];
    const codes = options.map((option) => option.value);

    expect(codes[0]).toBe('XYZ');
    expect(codes).toContain('USD');
    expect(codes).toContain('EUR');
    expect(codes.length).toBe(31);
  });
});
