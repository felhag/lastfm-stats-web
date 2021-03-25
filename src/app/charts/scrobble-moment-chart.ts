import {TempStats} from '../model';
import {AbstractChart} from './abstract-chart';
import * as Highcharts from 'highcharts';
import more from 'highcharts/highcharts-more';
more(Highcharts);

export class ScrobbleMomentChart extends AbstractChart {
  options: Highcharts.Options;

  constructor(title: string, categories: string[], private values: (stats: TempStats) => number[]) {
    super();

    this.options = {
      title: {text: title},
      chart: {
        polar: true,
        type: 'column'
      },
      legend: {enabled: false},
      yAxis: {visible: false},
      xAxis: {categories},
      series: [{
        name: 'Scrobbles',
        type: 'column',
        data: []
      }],
      plotOptions: {
        column: {
          groupPadding: 0,
        }
      }
    };
  }

  update(stats: TempStats): void {
    if (!this.chart) {
      return;
    }
    this.chart.series[0].setData(this.values(stats));
  }

  get fullWidth(): boolean {
    return false;
  }
}
