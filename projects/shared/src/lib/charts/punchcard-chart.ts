import * as Highcharts from 'highcharts';
import {TempStats, Constants, Track} from 'projects/shared/src/lib/app/model';
import { TranslatePipe } from 'projects/shared/src/lib/service/translate.pipe';
import { UrlBuilder } from 'projects/shared/src/lib/util/url-builder';
import {AbstractChart} from 'projects/shared/src/lib/charts/abstract-chart';
import heatmap from 'highcharts/modules/heatmap';
heatmap(Highcharts);

export class PunchcardChart extends AbstractChart {
  yearLabel?: HTMLElement;
  prevButton?: HTMLButtonElement;
  nextButton?: HTMLButtonElement;
  toolbar?: HTMLElement;
  data: { [p: number]: Track[] } = {};
  year = 0;
  first = 0;
  last = 0;
  byUser = false;

  constructor(translate: TranslatePipe) {
    super();
    this.options = {
      series: [{
        name: translate.capFirst('translate.scrobbles'),
        type: 'heatmap',
        data: [],
        borderWidth: 1,
        dataLabels: {
          enabled: true,
          style: {
            fontSize: '10px'
          }
        },
        events: {
          click: event => {
            const date = PunchcardChart.parseWeek(event.point.x, event.point.y!, this.year);
            window.open(UrlBuilder.day(this.username, date));
          }
        }
      }],
      title: {
        text: 'Number of ' + translate.transform('translate.scrobbles')
      },
      tooltip: {
        formatter(event): string {
          const year = parseInt((event.chart.container.parentNode!.querySelector('.current') as HTMLElement).innerText);
          const date = PunchcardChart.parseWeek(this.point.x, this.point.y!, year);
          return `${date.toLocaleDateString()}: <b>${this.point.value} ${translate.transform('translate.scrobbles')}</b>`;
        }
      },
      xAxis: {
        categories: [...Array(53).keys()].map(k => `W${k}`)
      },
      yAxis: {
        categories: Constants.DAYS,
        title: undefined,
        reversed: true
      },
      colorAxis: {
        labels: {style: {color: this.textColor}},
        min: 0,
        minColor: '#FFFFFF',
        maxColor: Highcharts.getOptions().colors![0]
      },
      chart: {
        events: {
          render: event => {
            if (!this.toolbar) {
              this.toolbar = document.getElementById('punchcard-toolbar')!;
              this.yearLabel = this.toolbar.querySelector('.current') as HTMLElement;
              this.prevButton = this.toolbar.querySelector('.prev') as HTMLButtonElement;
              this.nextButton = this.toolbar.querySelector('.next') as HTMLButtonElement;

              this.prevButton.onclick = () => {
                this.byUser = true;
                this.year--;
                this.updateDays(this.data);
              };
              this.nextButton.onclick = () => {
                this.byUser = true;
                this.year++;
                this.updateDays(this.data);
              };

              const chart = event.target as any as Highcharts.Chart;
              chart.container.parentNode!.appendChild(this.toolbar);
            }
          }
        }
      },
      responsive: {
        rules: [{
          condition: {
            maxWidth: 768
          },
          // Make the labels less space demanding on mobile
          chartOptions: {
            yAxis: {
              labels: {
                formatter(): string {
                  return (this.value as string).substr(0, 1);
                }
              }
            },
          }
        }]
      }
    };
  }

  update(stats: TempStats): void {
    if (!this.chart || !stats.last) {
      return;
    }

    this.first = stats.first?.date.getFullYear()!;
    this.last = stats.last?.date.getFullYear();
    if (!this.byUser && this.last !== this.year) {
      this.year = this.last;
    }
    this.updateDays(stats.specificDays);
  }

  updateDays(specificDays: { [p: number]: Track[] }): void {
    const serie = this.chart!.series[0];
    const entries = Object.entries(specificDays);
    const fdoy = new Date(this.year, 0, 1);
    if (fdoy.getDay() !== 0) {
      fdoy.setTime(fdoy.getTime() - (fdoy.getDay() * Constants.DAY));
    }
    const start = fdoy.getTime();
    const data = entries.map(e => {
      const key = parseInt(e[0]);
      const date = new Date(key);

      if (date.getFullYear() !== this.year) {
        return undefined;
      }

      const dow = date.getDay();
      const since = Math.floor(Math.round((key - start) / Constants.DAY) / 7);
      return [since, dow, e[1].length];
    }).filter(r => r);

    // for some reason clearing the data first is needed after updating to Angular 13...
    serie.setData([]);
    serie.setData(data as number[][]);
    this.data = specificDays;
    this.yearLabel!.innerText = String(this.year);
    this.prevButton!.style.visibility = this.year <= this.first ? 'hidden' : 'visible';
    this.nextButton!.style.visibility = this.year >= this.last ? 'hidden' : 'visible';
  }

  static parseWeek(x: number, y: number, year: number): Date {
    const fdoy = new Date(year, 0, 1).getDay();
    const days = (1 + (x - 1) * 7) + y + (7 - fdoy);
    return new Date(year, 0, days);
  }
}
