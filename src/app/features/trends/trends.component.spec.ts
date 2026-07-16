import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectionStrategy, Component, input, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';

import { TrendsComponent } from './trends.component';
import { HistoryService, HistorySeriesPoint } from '../../core/services/history.service';
import { RatesService } from '../../core/services/rates.service';
import { ChartDatasetEntry } from '../../shared/components/chart/chart.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { CardComponent } from '../../ui/card/card.component';

@Component({
  selector: 'app-chart',
  standalone: true,
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class StubChartComponent {
  readonly labels = input.required<string[]>();
  readonly datasets = input.required<ChartDatasetEntry[]>();
}

describe('TrendsComponent', () => {
  let fixture: ComponentFixture<TrendsComponent>;
  let component: TrendsComponent;
  let historySpy: { loadHistory: jasmine.Spy; selected: WritableSignal<string[]>; series: WritableSignal<HistorySeriesPoint[]> };
  let ratesMock: { base: WritableSignal<string> };

  async function setup(queryParams: Params = {}): Promise<void> {
    TestBed.resetTestingModule();

    historySpy = {
      loadHistory: jasmine.createSpy('loadHistory'),
      selected: signal([]),
      series: signal([]),
    };

    ratesMock = { base: signal('USD') };

    await TestBed.configureTestingModule({
      imports: [TrendsComponent],
      providers: [
        { provide: HistoryService, useValue: historySpy as unknown as HistoryService },
        { provide: RatesService, useValue: ratesMock as unknown as RatesService },
        { provide: ActivatedRoute, useValue: { queryParams: of(queryParams) } },
      ],
    })
      .overrideComponent(TrendsComponent, {
        set: { imports: [ButtonComponent, CardComponent, StubChartComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(TrendsComponent);
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

  function clickChip(code: string): void {
    const chip = fixture.nativeElement.querySelector(`[data-testid="currency-${code}"] button`);
    expect(chip).toBeTruthy();
    (chip as HTMLButtonElement).click();
  }

  it('should create', async () => {
    await setup();
    await flush();
    expect(component).toBeTruthy();
  });

  it('should enforce max-3 selection and disable further picks', async () => {
    await setup();
    await flush();

    clickChip('EUR');
    clickChip('GBP');
    clickChip('JPY');
    clickChip('AUD');
    await flush();

    expect(component.selected()).toEqual(['EUR', 'GBP', 'JPY']);
    expect(historySpy.loadHistory).toHaveBeenCalledWith('USD', ['EUR', 'GBP', 'JPY'], 'daily');

    const audButton = fixture.nativeElement.querySelector('[data-testid="currency-AUD"] button') as HTMLButtonElement;
    expect(audButton.disabled).toBeTrue();
  });

  it('should reload history when aggregation changes', async () => {
    await setup();
    await flush();

    clickChip('EUR');
    await flush();
    historySpy.loadHistory.calls.reset();

    const monthlyButton = fixture.nativeElement.querySelector('[data-testid="aggregation-monthly"] button') as HTMLButtonElement;
    expect(monthlyButton).toBeTruthy();
    monthlyButton.click();
    await flush();

    expect(historySpy.loadHistory).toHaveBeenCalledWith('USD', ['EUR'], 'monthly');
  });

  it('should pre-select currency from query param', async () => {
    await setup({ target: 'EUR' });
    await flush();

    expect(component.selected()).toEqual(['EUR']);
    expect(historySpy.loadHistory).toHaveBeenCalledWith('USD', ['EUR'], 'daily');
  });

  it('should ignore invalid query param target', async () => {
    await setup({ target: 'XYZ' });
    await flush();

    expect(component.selected()).toEqual([]);
  });

  it('should compute chart data from history series', async () => {
    await setup();
    await flush();

    clickChip('EUR');
    clickChip('GBP');
    historySpy.series.set([
      { date: '2024-01-01', values: { EUR: 0.9, GBP: 0.8 } },
      { date: '2024-01-02', values: { EUR: 0.91, GBP: 0.81 } },
    ]);
    await flush();

    const stubChart = fixture.debugElement.query(By.directive(StubChartComponent)).componentInstance as StubChartComponent;
    expect(stubChart.labels()).toEqual(['2024-01-01', '2024-01-02']);
    expect(stubChart.datasets()).toEqual([
      { label: 'EUR', data: [0.9, 0.91], borderColor: '#2563eb' },
      { label: 'GBP', data: [0.8, 0.81], borderColor: '#dc2626' },
    ]);
  });

  it('should render a visually hidden table when currencies are selected', async () => {
    await setup();
    await flush();

    clickChip('EUR');
    historySpy.series.set([{ date: '2024-01-01', values: { EUR: 0.9 } }]);
    await flush();

    const table = fixture.nativeElement.querySelector('table.visually-hidden') as HTMLTableElement;
    expect(table).toBeTruthy();
    expect(table.textContent).toContain('EUR');
    expect(table.textContent).toContain('2024-01-01');
    expect(table.textContent).toContain('0.9');
  });
});
