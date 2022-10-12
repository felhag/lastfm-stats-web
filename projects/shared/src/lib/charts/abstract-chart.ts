import { AlignValue } from 'highcharts';
import * as Highcharts from 'highcharts';
import exporting from 'highcharts/modules/exporting';
import offline from 'highcharts/modules/offline-exporting';
import fullscreen from 'highcharts/modules/full-screen';
import { TempStats } from 'projects/shared/src/lib/app/model';

exporting(Highcharts);
offline(Highcharts);
fullscreen(Highcharts);

export abstract class AbstractChart {
  options: Highcharts.Options = {};
  chart?: Highcharts.Chart;

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

