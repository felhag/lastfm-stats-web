import {TempStats} from 'projects/shared/src/lib/app/model';
import {AbstractChart} from 'projects/shared/src/lib/charts/abstract-chart';
import * as Highcharts from 'highcharts';
import more from 'highcharts/highcharts-more';
import { TranslatePipe } from 'projects/shared/src/lib/service/translate.pipe';
more(Highcharts);

export class ScrobbleMomentChart extends AbstractChart {
  options: Highcharts.Options;

  constructor(translate: TranslatePipe, title: string, categories: string[], private values: (stats: TempStats) => number[]) {
    super();

    this.options = {
      title: {text: `${translate.capFirst('translate.scrobbled')} ${title}`},
      chart: {
        polar: true,
        type: 'column'
      },
      legend: {enabled: false},
      yAxis: {visible: false},
      xAxis: {categories},
      series: [{
        name: translate.capFirst('translate.scrobbles'),
        type: 'column',
        data: []
      }],
      plotOptions: {
        column: {
          groupPadding: 0,
        }
      },
      responsive: {
        rules: [{
          condition: {
            maxWidth: 575
          },
          // Make the labels less space demanding on mobile
          chartOptions: {
            xAxis: {
              labels: {
                formatter(): string {
                  const value = this.value as any;
                  const first = value.charAt ? value.charAt(0) : undefined;
                  if (['0', '1', '2'].indexOf(first) < 0) {
                    return value.length > 3 ? value.substr(0, 3) + '.' : value;
                  } else {
                    return value;
                  }
                }
              }
            },
            pane: {
              size: '80%'
            },
          }
        }]
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
