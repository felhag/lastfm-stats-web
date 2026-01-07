import * as Highcharts from 'highcharts';
import 'highcharts/modules/heatmap';
import { TempStats, Constants, Track } from 'projects/shared/src/lib/app/model';
import { AbstractChart } from 'projects/shared/src/lib/charts/abstract-chart';
import { TranslatePipe } from 'projects/shared/src/lib/service/translate.pipe';
import { AbstractUrlService } from '../service/abstract-url.service';

export class PunchcardChart extends AbstractChart {
  yearLabel?: HTMLElement;
  prevButton?: HTMLButtonElement;
  nextButton?: HTMLButtonElement;
  toolbar?: HTMLElement;
  data: { [p: number]: Track[] } = {};
  year: number | 'all' = 0;
  first = 0;
  last = 0;
  byUser = false;

  constructor(translate: TranslatePipe, url: AbstractUrlService) {
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
            if (this.year !== 'all') {
              this.openUrl(url.day(PunchcardChart.parseWeek(event.point.x, event.point.y!, (this.year as number))))
            }
          }
        }
      }],
      title: {
        text: 'Number of ' + translate.transform('translate.scrobbles')
      },
      tooltip: {
        formatter(event): string {
          const selected = (event.chart.container.parentNode!.querySelector('.current') as HTMLElement).innerText;
          const point = (this as any).point
          const date = selected === 'all' ?
            `${Constants.MONTHS[point.y!]} ${point.x}` :
            PunchcardChart.parseWeek(point.x, point.y!, parseInt(selected)).toLocaleDateString();
          return `${date}: <b>${point.value} ${translate.transform('translate.scrobbles')}</b>`;
        }
      },
      ...PunchcardChart.getAxisForYear(),
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
                this.year = this.year === 'all' ? this.last : this.year - 1;
                this.updateDays(this.data);
              };
              this.nextButton.onclick = () => {
                this.byUser = true;
                this.year = this.year === this.last ? 'all' : (this.year as number) + 1;
                this.updateDays(this.data);
              };

              const chart = event.target as any as Highcharts.Chart;
              chart.container.parentNode!.appendChild(this.toolbar);
              this.drawLabels();
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
                  return (this.value as string).substring(0, 1);
                }
              }
            },
          }
        }]
      }
    };
  }

  update(stats: TempStats): void {
    if (!stats.last) {
      return;
    }

    this.first = stats.first?.date.getFullYear()!;
    this.last = stats.last?.date.getFullYear();
    if (!this.byUser) {
      this.year = this.last;
    }
    this.updateDays(stats.specificDays);
  }

  updateDays(specificDays: { [p: number]: Track[] }): void {
    const data = this.getData(specificDays);
    if (this.year === 'all') {
      this.chart?.update(PunchcardChart.getAxisForAll(), false);
    } else {
      this.chart?.update(PunchcardChart.getAxisForYear(), false);
    }

    // for some reason clearing the data first is needed after updating to Angular 13...
    if (this.chart) {
      const serie = this.chart!.series[0];
      serie.setData([]);
      serie.setData(data as number[][]);
    } else {
      const serie = this.options.series![0] as any;
      serie.data = data;
    }
    this.data = specificDays;
    if (this.chart) {
      this.drawLabels();
    }
  }

  private getData(specificDays: { [p: number]: Track[] }): number[][] {
    const entries = Object.entries(specificDays);
    if (this.year === 'all') {
      return Array.from(entries.reduce((data, e) => {
        const date = new Date(parseInt(e[0]));
        const key = `${date.getDate()}-${date.getMonth()}`;
        data.set(key, (data.get(key) || 0) + e[1].length);
        return data;
      }, new Map<string, number>())
        .entries())
        .map(([key, value]) => [+key.split('-')[0], +key.split('-')[1], value]);
    } else {
      const fdoy = new Date(this.year, 0, 1);
      if (fdoy.getDay() !== 0) {
        fdoy.setTime(fdoy.getTime() - (fdoy.getDay() * Constants.DAY));
      }
      const start = fdoy.getTime();
      return entries.map(e => {
        const key = parseInt(e[0]);
        const date = new Date(key);

        if (date.getFullYear() !== this.year) {
          return undefined;
        }

        const dow = date.getDay();
        const since = Math.floor(Math.round((key - start) / Constants.DAY) / 7);
        return [since, dow, e[1].length];
      }).filter(r => r) as number[][];
    }
  }

  static parseWeek(x: number, y: number, year: number): Date {
    const fdoy = new Date(year, 0, 1).getDay();
    const days = (1 + (x - 1) * 7) + y + (7 - fdoy);
    return new Date(year, 0, days);
  }

  private drawLabels(): void {
    this.yearLabel!.innerText = String(this.year);
    this.prevButton!.style.visibility = this.year !== 'all' && this.year <= this.first ? 'hidden' : 'visible';
    this.nextButton!.style.visibility = this.year === 'all' ? 'hidden' : 'visible';
  }

  private static getAxisForYear() {
    return {
      xAxis: {
        categories: [...Array(53).keys()].map(k => `W${k + 1}`),
        min: 0,
        max: 52,
      },
      yAxis: PunchcardChart.getYAxis(Constants.DAYS)
    }
  }

  private static getAxisForAll() {
    return {
      xAxis: {
        categories: [...Array(31).keys()].map(k => k.toString()),
        min: 1,
        max: 31,
      },
      yAxis: PunchcardChart.getYAxis(Constants.MONTHS)
    }
  }

  private static getYAxis(categories: string[]) {
    return {
      categories,
      title: undefined,
      reversed: true,
      min: 0,
      max: categories.length - 1,
    }
  }
}
