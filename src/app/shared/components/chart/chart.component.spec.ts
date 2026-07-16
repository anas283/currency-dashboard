import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';

import { ChartComponent, ChartDatasetEntry } from './chart.component';

describe('ChartComponent', () => {
  let fixture: ComponentFixture<ChartComponent>;
  let component: ChartComponent;

  const initialLabels = ['Jan', 'Feb', 'Mar'];
  const initialDatasets: ChartDatasetEntry[] = [
    { label: 'EUR', data: [1.0, 1.2, 1.1], borderColor: '#00ff00' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChartComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('labels', initialLabels);
    fixture.componentRef.setInput('datasets', initialDatasets);
  });

  it('should create a chart instance after view init', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(component.chartInstance).toBeTruthy();
  }));

  it('should update the chart when inputs change', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const chart = component.chartInstance;
    expect(chart).toBeTruthy();
    spyOn(chart!, 'update').and.callThrough();

    const updatedLabels = ['Apr', 'May', 'Jun'];
    const updatedDatasets: ChartDatasetEntry[] = [
      { label: 'GBP', data: [0.8, 0.9, 0.85], borderColor: '#ff0000' },
    ];

    fixture.componentRef.setInput('labels', updatedLabels);
    fixture.componentRef.setInput('datasets', updatedDatasets);
    fixture.detectChanges();
    tick();

    expect(chart!.update).toHaveBeenCalledWith('none');
    expect(chart!.data.labels).toEqual(updatedLabels);
    expect(chart!.data.datasets[0]?.label).toBe('GBP');
  }));

  it('should destroy the chart when the component is destroyed', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const chart = component.chartInstance;
    expect(chart).toBeTruthy();
    spyOn(chart!, 'destroy').and.callThrough();

    fixture.destroy();

    expect(chart!.destroy).toHaveBeenCalled();
  }));

  it('should render a visually hidden table mirror of the data', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const table = compiled.querySelector('table.visually-hidden');
    expect(table).toBeTruthy();
    expect(table?.textContent).toContain('EUR');
    expect(table?.textContent).toContain('1.2');
  });
});
