import { AlignValue, PointOptionsType, XAxisOptions } from 'highcharts';
import * as Highcharts from 'highcharts';
import 'highcharts/modules/exporting';
import 'highcharts/modules/offline-exporting';
import 'highcharts/modules/full-screen';
import { TempStats } from 'projects/shared/src/lib/app/model';

export abstract class AbstractChart {
  options: Highcharts.Options = {};
  chart?: Highcharts.Chart;

  private loading = false;

  abstract update(stats: TempStats): void;

  get fullWidth(): boolean {
    return true;
  }

  protected get textColor(): string | undefined {
    return Highcharts.getOptions()?.title?.style?.color || '#333';
  }

  print(): void {
    this.chart?.exportChartLocal();
  }

  fullscreen(): void {
    this.chart?.fullscreen.toggle();
  }

  register(container: HTMLElement): boolean {
    const observer = new IntersectionObserver(entries => {
      if(entries[0].isIntersecting && !this.loading) {
        this.loading = true;
        setTimeout(() => this.load(container), 300);
      }
    }, { threshold: [.8] });

    observer.observe(container);
    return true;
  }

  protected load(container: HTMLElement): void {
    this.chart = Highcharts.chart(container, this.options);
  }

  responsive(yAxis: (AlignValue | undefined)[] = ['left']): any {
    return {
      rules: [{
        condition: {
          maxWidth: 768
        },
        // Make the labels less space demanding on mobile
        chartOptions: {
          yAxis: yAxis.map(y => this.smallAxis(y))
        }
      }]
    };
  }

  protected setData(...data: Array<PointOptionsType>[]) {
    for (let i = 0; i < data.length; i++) {
      if (this.chart) {
        this.chart.series[i].setData(data[i]);
      } else {
        (this.options as any).series[i].data = data[i];
      }
    }
  }

  protected updateXAxis(xAxis: XAxisOptions) {
    if (this.chart) {
      this.chart.update({xAxis}, true);
    } else {
      Object.assign(this.options.xAxis as XAxisOptions, xAxis);
    }
  }

  protected openUrl(url: string): void {
    if (url) {
      window.open(url);
    }
  }

  protected getColors(): string[] {
    return Highcharts.getOptions().colors! as string[];
  }

  private smallAxis(align: AlignValue | undefined): Highcharts.YAxisOptions {
    return {
      visible: !!align,
      labels: {
        align,
        x: 0,
        y: -5
      },
      title: {
        text: ''
      }
    };
  }
}

