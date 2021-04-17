import {TempStats} from '../model';

export abstract class AbstractChart {
  abstract options: Highcharts.Options;
  updateFlag = false;
  chart?: Highcharts.Chart;

  abstract update(stats: TempStats): void;

  get fullWidth(): boolean {
    return true;
  }

  responsive(): any {
    return {
      rules: [{
        condition: {
          maxWidth: 768
        },
        // Make the labels less space demanding on mobile
        chartOptions: {
          yAxis: [{
            labels: {
              align: 'left',
              x: 0,
              y: -5
            },
            title: {
              text: ''
            }
          }]
        }
      }]
    };
  }
}

