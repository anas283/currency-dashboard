import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { Router } from '@angular/router';

import { LatestResponse } from '../../core/models/api.types';
import { RatesService } from '../../core/services/rates.service';
import { RatesTableComponent } from './rates-table.component';

function createRatesServiceMock(
  baseValue = 'USD',
  snapshotValue: LatestResponse | null = null,
): RatesService {
  const snapshot = signal(snapshotValue);
  const base = signal(baseValue);

  return {
    snapshot,
    base,
    servedFromCache: signal(false),
    status: signal('live'),
    lastUpdated: computed(() =>
      snapshotValue?.time_last_update_unix != null
        ? snapshotValue.time_last_update_unix * 1000
        : null,
    ),
    loadLatest: jasmine.createSpy('loadLatest'),
    convert: jasmine.createSpy('convert'),
  } as unknown as RatesService;
}

const mockSnapshot: LatestResponse = {
  base_code: 'USD',
  time_last_update_unix: 1_000,
  time_next_update_unix: 2_000,
  conversion_rates: {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 148.5,
    AUD: 1.52,
    CAD: 1.35,
    CHF: 0.86,
    CNY: 7.19,
    SEK: 10.35,
    NZD: 1.63,
    MXN: 17.05,
    SGD: 1.34,
    HKD: 7.82,
    NOK: 10.52,
    KRW: 1330,
    TRY: 29.75,
    INR: 83.12,
    RUB: 91.5,
    BRL: 4.95,
    ZAR: 18.9,
    AED: 3.67,
    SAR: 3.75,
    PLN: 3.97,
    THB: 35.2,
    IDR: 15650,
    MYR: 4.72,
    PHP: 55.8,
    CZK: 22.65,
    ILS: 3.65,
    CLP: 880,
    ARS: 350,
    COP: 4000,
  },
};

describe('RatesTableComponent', () => {
  let fixture: ComponentFixture<RatesTableComponent>;
  let component: RatesTableComponent;
  let ratesService: RatesService;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    ratesService = createRatesServiceMock('USD', mockSnapshot);

    await TestBed.configureTestingModule({
      imports: [RatesTableComponent],
      providers: [
        { provide: RatesService, useValue: ratesService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RatesTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function getRows(): HTMLTableRowElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tbody tr'));
  }

  function getHeaderButton(key: 'code' | 'rate' | 'base'): HTMLButtonElement {
    const header = fixture.nativeElement.querySelector(
      `th[sortKey="${key}"]`,
    ) as HTMLTableCellElement;
    return header.querySelector('button') as HTMLButtonElement;
  }

  function getBaseSelect(): HTMLSelectElement {
    return fixture.nativeElement.querySelector('#base-select') as HTMLSelectElement;
  }

  function getToggleButtons(): HTMLButtonElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('.rates-table__toggle app-button button'),
    );
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders rows from the snapshot signal', () => {
    expect(getRows().length).toBe(30);
    expect(getRows()[0].textContent).toContain('USD');
  });

  it('cycles sort direction when a sort header is clicked', () => {
    const codeButton = getHeaderButton('code');

    codeButton.click();
    fixture.detectChanges();
    expect(component.sortKey()).toBe('code');
    expect(component.sortDirection()).toBe('asc');

    codeButton.click();
    fixture.detectChanges();
    expect(component.sortDirection()).toBe('desc');

    codeButton.click();
    fixture.detectChanges();
    expect(component.sortDirection()).toBe('none');
  });

  it('sorts rows by the selected column', () => {
    const codeButton = getHeaderButton('code');

    codeButton.click();
    fixture.detectChanges();

    const rows = getRows();
    expect(rows[0].textContent).toContain('AED');
    expect(rows[rows.length - 1].textContent).toContain('ZAR');
  });

  it('filters rows by search input', () => {
    component.search.set('EUR');
    fixture.detectChanges();

    expect(getRows().length).toBe(1);
    expect(getRows()[0].textContent).toContain('EUR');
  });

  it('filters rows by currency name', () => {
    component.search.set('pound');
    fixture.detectChanges();

    expect(getRows().length).toBe(1);
    expect(getRows()[0].textContent).toContain('GBP');
  });

  it('shows an empty state when the search yields nothing', () => {
    component.search.set('XYZ');
    fixture.detectChanges();

    expect(getRows().length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('No currencies match your search');
  });

  it('updates the base signal and calls loadLatest when the base selector changes', () => {
    const select = getBaseSelect();
    select.value = 'EUR';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(ratesService.base()).toBe('EUR');
    expect(ratesService.loadLatest).toHaveBeenCalled();
  });

  it('navigates to /trends with the target query param when a row is clicked', () => {
    component.search.set('EUR');
    fixture.detectChanges();

    const row = getRows()[0];
    row.click();
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/trends'], {
      queryParams: { target: 'EUR' },
    });
  });

  it('toggles between Top 30 and All currencies', () => {
    const buttons = getToggleButtons();
    expect(getRows().length).toBe(30);

    buttons[1].click();
    fixture.detectChanges();
    expect(component.showAll()).toBe(true);
    expect(getRows().length).toBe(Object.keys(mockSnapshot.conversion_rates).length);

    buttons[0].click();
    fixture.detectChanges();
    expect(component.showAll()).toBe(false);
    expect(getRows().length).toBe(30);
  });
});
