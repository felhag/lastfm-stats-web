import { AlignValue } from 'highcharts';
import * as Highcharts from 'highcharts';
import {TempStats} from '../model';

export abstract class AbstractChart {
  abstract options: Highcharts.Options;
  chart?: Highcharts.Chart;

  abstract update(stats: TempStats): void;

  get fullWidth(): boolean {
    return true;
  }

  protected get textColor(): string | undefined {
    return Highcharts.getOptions()?.title?.style?.color || '#333';
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

