import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  OnDestroy,
  viewChild,
} from '@angular/core';
import { Chart, ChartConfiguration, ChartDataset } from 'chart.js/auto';

export interface ChartDatasetEntry {
  label: string;
  data: number[];
  borderColor: string;
}

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [],
  templateUrl: './chart.component.html',
  styleUrl: './chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartComponent implements AfterViewInit, OnDestroy {
  readonly labels = input.required<string[]>();
  readonly datasets = input.required<ChartDatasetEntry[]>();

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('chartCanvas');
  private chart: Chart<'line', number[], string> | undefined;

  get chartInstance(): Chart<'line', number[], string> | undefined {
    return this.chart;
  }

  constructor() {
    effect(() => {
      const currentLabels = this.labels();
      const currentDatasets = this.datasets();

      if (!this.chart) {
        return;
      }

      this.chart.data.labels = currentLabels;
      this.chart.data.datasets = this.toChartDatasets(currentDatasets);
      this.chart.update('none');
    });
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef().nativeElement;
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Unable to obtain 2D rendering context for chart canvas.');
    }

    const config: ChartConfiguration<'line', number[], string> = {
      type: 'line',
      data: {
        labels: this.labels(),
        datasets: this.toChartDatasets(this.datasets()),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
          },
        },
      },
    };

    this.chart = new Chart<'line', number[], string>(context, config);
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.chart = undefined;
  }

  private toChartDatasets(entries: ChartDatasetEntry[]): ChartDataset<'line', number[]>[] {
    return entries.map((entry) => ({
      label: entry.label,
      data: entry.data,
      borderColor: entry.borderColor,
      type: 'line' as const,
      borderWidth: 2,
      fill: false,
    }));
  }
}
