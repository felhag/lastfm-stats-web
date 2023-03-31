import {TempStats} from 'projects/shared/src/lib/app/model';
import {AbstractChart} from 'projects/shared/src/lib/charts/abstract-chart';
import * as Highcharts from 'highcharts';
import more from 'highcharts/highcharts-more';
import { TranslatePipe } from 'projects/shared/src/lib/service/translate.pipe';
more(Highcharts);

export class ScrobbleMomentChart extends AbstractChart {
  toolbar?: HTMLElement;
  stats?: TempStats;
  type: 'total' | 'avg' = 'total';
  options: Highcharts.Options;

  constructor(translate: TranslatePipe,
              title: string,
              categories: string[],
              private values: (stats: TempStats) => {[key: number]: number},
              private countForKey?: (stats: TempStats, key: number) => number) {
    super();

    this.options = {
      title: {text: `${translate.capFirst('translate.scrobbled')} ${title}`},
      chart: {
        polar: true,
        type: 'column',
        events: {
          render: event => {
            if (!this.toolbar && this.countForKey) {
              this.toolbar = document.getElementById('scrobble-moment-toolbar')!.cloneNode(true) as HTMLElement;
              const total = this.toolbar.querySelector('.total') as HTMLElement;
              const avg = this.toolbar.querySelector('.avg') as HTMLElement;
              total.onclick = () => {
                avg.classList.remove('mat-primary');
                total.classList.add('mat-primary');
                this.toggle('total');
              };
              avg.onclick = () => {
                total.classList.remove('mat-primary');
                avg.classList.add('mat-primary');
                this.toggle('avg');
              };

              const chart = event.target as any as Highcharts.Chart;
              chart.container.parentNode!.appendChild(this.toolbar);
            }
          }
        }
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
    this.stats = stats;

    const values = this.values(this.stats!);
    if (this.type === 'total') {
      this.setData(Object.values(values));
    } else {
      const avg = Object.entries(values).map(([key, value]) => value > 0 ? Math.round(value / this.countForKey!(this.stats!, parseInt(key))) : 0);
      this.setData(avg);
    }
  }

  toggle(type: 'total' | 'avg') {
    this.type = type;
    this.update(this.stats!);
  }

  get fullWidth(): boolean {
    return false;
  }
}
