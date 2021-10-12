import * as Highcharts from 'highcharts';
import {TempStats, Constants} from '../model';
import {AbstractChart} from './abstract-chart';
import heatmap from 'highcharts/modules/heatmap';
heatmap(Highcharts);

export class PunchcardChart extends AbstractChart {
  yearLabel?: HTMLElement;
  prevButton?: HTMLButtonElement;
  nextButton?: HTMLButtonElement;
  toolbar?: HTMLElement;

  options: Highcharts.Options = {
    series: [{
      name: 'Scrobbles',
      type: 'heatmap',
      data: [],
      borderWidth: 1,
      dataLabels: {
        enabled: true,
        style: {
          fontSize: '10px'
        }
      },
      custom: {
        component: this,
        data: undefined,
        year: 0,
        first: 0,
        last: 0,
        byUser: false,
      }
    }],
    title: {
      text: 'Number of scrobbles'
    },
    tooltip: {
      formatter(): string {
        const year = this.series.options.custom!.year;
        const week = this.point.x;
        const fdoy = new Date(year, 0, 1).getDay();
        const days = (1 + (week - 1) * 7) + this.point.y! + (7 - fdoy);
        const date = new Date(year, 0, days);
        return `${date.toLocaleDateString()}: <b>${this.point.value} scrobbles</b>`;
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
      labels: {style: {color: this.textColor }},
      min: 0,
      minColor: '#FFFFFF',
      maxColor: Highcharts.getOptions().colors![0]
    },
    chart: {
      events: {
        render(): void {
          const chart = this;
          const custom = chart.series[0].options.custom!;
          const component = custom.component as PunchcardChart;
          if (!component.toolbar) {
            component.toolbar = document.getElementById('punchcard-toolbar')!;
            component.yearLabel = component.toolbar.querySelector('.current') as HTMLElement;
            component.prevButton = component.toolbar.querySelector('.prev') as HTMLButtonElement;
            component.nextButton = component.toolbar.querySelector('.next') as HTMLButtonElement;

            component.prevButton.onclick = () => {
              custom.byUser = true;
              custom.year--;
              component.updateDays(custom.data);
            };
            component.nextButton.onclick = () => {
              custom.byUser = true;
              custom.year++;
              component.updateDays(custom.data);
            };

            chart.container.parentNode!.appendChild(component.toolbar);
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

  update(stats: TempStats): void {
    if (!this.chart || !stats.last) {
      return;
    }

    const custom = this.chart!.series[0].options.custom!;
    custom.first = stats.first?.date.getFullYear();
    custom.last = stats.last?.date.getFullYear();
    if (!custom.byUser && custom.last !== custom.year) {
      custom.year = custom.last;
    }
    this.updateDays(stats.specificDays);
  }

  updateDays(specificDays: { [p: number]: number }): void {
    const serie = this.chart!.series[0];
    const custom = serie.options.custom!;
    const entries = Object.entries(specificDays);
    const year = custom.year;

    const fdoy = new Date(year, 0, 1);
    if (fdoy.getDay() !== 0) {
      fdoy.setTime(fdoy.getTime() - (fdoy.getDay() * Constants.DAY));
    }
    const start = fdoy.getTime();
    const data = entries.map(e => {
      const key = parseInt(e[0]);
      const date = new Date(key);

      if (date.getFullYear() !== year) {
        return undefined;
      }

      const dow = date.getDay();
      const since = Math.floor(Math.round((key - start) / Constants.DAY) / 7);
      return [since, dow, e[1]];
    }).filter(r => r);

    serie.setData(data as number[][]);
    custom.year = year;
    custom.data = specificDays;
    this.yearLabel!.innerText = year;
    this.prevButton!.style.visibility = year <= custom.first ? 'hidden' : 'visible';
    this.nextButton!.style.visibility = year >= custom.last ? 'hidden' : 'visible';
  }
}
