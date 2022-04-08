import * as Highcharts from 'highcharts';
import { PointOptionsObject } from 'highcharts';
import { TempStats, Month } from 'projects/shared/src/lib/app/model';
import { AbstractChart } from 'projects/shared/src/lib/charts/abstract-chart';
import { TranslatePipe } from 'projects/shared/src/lib/service/translate.pipe';
import { AbstractUrlService } from '../service/abstract-url.service';

export class RaceChart extends AbstractChart {
  private readonly defaultSpeed = 2000;
  colors: {[key: string]: string} = {};
  months: Month[] = [];
  artists: string[] = [];
  current = -1;
  timer?: number;
  toolbar?: HTMLElement;
  button?: HTMLElement;
  input?: HTMLInputElement;
  speedText?: HTMLElement;
  speed = this.defaultSpeed;

  constructor(translate: TranslatePipe, url: AbstractUrlService) {
    super();
    this.options = {
      chart: {
        animation: {
          duration: this.speed
        },
        height: 800,
        events: {
          render: event => {
            if (!this.toolbar) {
              this.toolbar = document.getElementById('race-chart-toolbar')!;
              this.speedText = this.toolbar.querySelector('.current') as HTMLElement;
              this.button = this.toolbar.querySelector('.play mat-icon') as HTMLElement;
              this.input = this.toolbar.querySelector('input') as HTMLInputElement;
              this.input.onclick = (ev: any) => this.tick(parseInt(ev.target.value));
              (this.toolbar.querySelector('.play') as HTMLButtonElement).onclick = () => this.toggle();
              (this.toolbar.querySelector('.rewind') as HTMLButtonElement).onclick = () => this.changeSpeed(() => this.speed * 2);
              (this.toolbar.querySelector('.forward') as HTMLButtonElement).onclick = () => this.changeSpeed(() => this.speed / 2);

              const chart = event.target as any as Highcharts.Chart;
              chart.container.parentNode!.appendChild(this.toolbar);
            }
          }
        }
      },
      plotOptions: {
        series: {
          animation: false,
          groupPadding: 0,
          pointPadding: 0.1,
          borderWidth: 0
        } as any
      },
      title: {text: 'Artists race chart'},
      xAxis: {type: 'category'},
      yAxis: [{
        opposite: true,
        title: {
          text: translate.capFirst('translate.scrobbles')
        },
        tickAmount: 5
      }],
      legend: {
        floating: true,
        align: 'right',
        verticalAlign: 'bottom',
        itemStyle: {
          fontWeight: 'bold',
          fontSize: '50px',
        },
        symbolHeight: 0.001,
        symbolWidth: 0.001,
        symbolRadius: 0.001,
      },
      series: [{
        colorByPoint: true,
        dataSorting: {
          enabled: true,
          matchByName: true
        },
        type: 'bar',
        dataLabels: [{
          enabled: true,
          style: {
            color: this.textColor,
            textOutline: 0
          } as any
        }],
        name: '',
        data: [],
        events: {
          click: event => window.open(url.artist(event.point.name))
        }
      }],
      responsive: {
        rules: [{
          condition: {
            maxWidth: 768
          },
          chartOptions: {
            legend: {
              itemStyle: {
                fontSize: '24px',
              }
            }
          }
        }]
      }
    };
  }

  update(stats: TempStats): void {
    this.months = Object.values(stats.monthList);
    this.artists = Object.keys(stats.seenArtists);

    if (this.input) {
      this.input.setAttribute('max', String(this.months.length - 1));
    }

    if (this.chart && this.months.length && (this.current === this.months.length || !this.chart.series[0].data.length)) {
      this.tick(0);
    }
  }

  private getData(month: Month): PointOptionsObject[] {
    return this.artists
      .map(a => ({name: a, count: this.cumulativeUntil(month, a)}))
      .sort((a, b) => b.count - a.count)
      .slice(0, 25)
      .map(a => ({
        y: a.count,
        name: a.name,
        color: this.getColor(a.name)
      }));
  }

  private getColor(name: string): string {
    if (this.colors[name]) {
      return this.colors[name];
    }
    const colors = Highcharts.getOptions().colors!;
    const color = colors[Object.keys(this.colors).length % colors.length];
    this.colors[name] = color;
    return color;
  }

  private cumulativeUntil(until: Month, artist: string): number {
    return this.months.slice(0, this.months.indexOf(until) + 1).reduce((acc, cur) => acc + (cur.artists.get(artist)?.count || 0), 0);
  }

  /**
   * Update the chart. This happens either on updating (moving) the range input,
   * or from a timer when the timeline is playing.
   */
  tick(target: number): void {
    const maxIdx = this.months.length - 1;
    const next = Math.min(target, maxIdx);
    if (next === this.current) {
      return;
    }
    this.current = next;
    this.input!.value = String(this.current);

    if (this.current >= maxIdx) { // Auto-pause
      this.pause();
    }

    const month = this.months[this.current];
    const data = this.getData(month);
    this.chart?.series[0].update({
      type: 'bar',
      name: month.alias,
      data
    });
  }

  toggle(): void {
    if (this.timer) {
      this.pause();
    } else {
      this.play();
    }
  }

  changeSpeed(modify: () => number): void {
    this.speed = Math.min(8000, Math.max(500, modify()));
    this.chart?.update({chart: {animation: {duration: this.speed}}});
    this.speedText!.innerText = String(Math.round(this.defaultSpeed / this.speed * 100) / 100).padEnd(3, '.0');
    if (this.timer) {
      this.pause();
      this.play();
    }
  }

  private play(): void {
    this.button!.innerHTML = 'pause';
    this.tick(this.current + 1);
    this.timer = window.setInterval(() => this.tick(this.current + 1), this.speed * 1.5);
  }

  /**
   * Pause the timeline, either when the range is ended, or when clicking the pause button.
   * Pausing stops the timer and resets the button to play mode.
   */
  private pause(): void {
    this.button!.innerHTML = 'play_arrow';
    clearTimeout(this.timer);
    this.timer = undefined;
  }
}
