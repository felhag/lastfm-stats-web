import {PointOptionsObject} from 'highcharts';
import * as Highcharts from 'highcharts';
import {TempStats, Month} from '../model';
import { UrlBuilder } from '../util/url-builder';
import {AbstractChart} from './abstract-chart';

export class RaceChart extends AbstractChart {
  colors: {[key: string]: string} = {};
  months: Month[] = [];
  artists: string[] = [];
  current = -1;
  timer?: number;
  toolbar?: HTMLElement;
  button?: HTMLElement;
  input?: HTMLInputElement;
  speedText?: HTMLElement;
  speed = 1000;

  options: Highcharts.Options = {
    chart: {
      animation: {
        duration: this.speed
      },
      height: 800,
      events: {
        render(): void {
          const chart = this;
          const custom = chart.series[0].options.custom!;
          const component = custom.component as RaceChart;
          if (!component.toolbar) {
            component.toolbar = document.getElementById('race-chart-toolbar')!;
            component.speedText = component.toolbar.querySelector('.current') as HTMLElement;
            component.button = component.toolbar.querySelector('.play mat-icon') as HTMLElement;
            component.input = component.toolbar.querySelector('input') as HTMLInputElement;
            component.input.onclick = (ev: any) => component.tick(parseInt(ev.target.value));
            (component.toolbar.querySelector('.play') as HTMLButtonElement).onclick = () => component.toggle();
            (component.toolbar.querySelector('.rewind') as HTMLButtonElement).onclick = () => component.changeSpeed(500);
            (component.toolbar.querySelector('.forward') as HTMLButtonElement).onclick = () => component.changeSpeed(-500);

            chart.container.parentNode!.appendChild(component.toolbar);
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
        text: 'Scrobbles'
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
      custom: {
        component: this
      },
      events: {
        click: event => window.open(UrlBuilder.artist(this.username, event.point.name))
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
    return this.months.slice(0, this.months.indexOf(until) + 1).reduce((acc, cur) => acc + (cur.artists[artist]?.count || 0), 0);
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

  changeSpeed(amount: number): void {
    this.speed = Math.max(500, this.speed + amount);
    this.chart?.update({chart: {animation: {duration: this.speed}}});
    this.speedText!.innerText = String((this.speed / 1000)) + 's';
    if (this.timer) {
      this.pause();
      this.play();
    }
  }

  private play(): void {
    this.button!.innerHTML = 'pause';
    this.tick(this.current + 1);
    this.timer = setInterval(() => this.tick(this.current + 1), this.speed);
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
