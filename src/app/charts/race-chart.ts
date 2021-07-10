import {TempStats, Constants, Month} from '../model';
import {AbstractChart} from './abstract-chart';
import * as Highcharts from 'highcharts';

export class RaceChart extends AbstractChart {
  data: [string, [string, number][]][] = [];
  months: Month[] = [];
  artists: string[] = [];
  current = -1;
  timer?: number;
  button?: Highcharts.SVGElement;
  input?: HTMLInputElement;

  options: Highcharts.Options = {
    chart: {
      animation: {
        duration: 1000
      },
      height: 800,
      events: {
        render(): void {
          const chart = this;
          const custom = chart.series[0].options.custom!;
          const component = custom.component;
          if (!component.button) {
            component.button = chart.renderer.button('Play', 0, 4, () => component.toggle(), {padding: 4}).add();
            component.input = Highcharts.createElement(
              'input', {
                type: 'range',
                value: 0,
                min: 0,
                max: component.months.length,
                onchange: (v: any) => component.tick(parseInt(v.target.value))
              }, {
                position: 'absolute',
                top: '52px', // position under title
                left: '16px',
                minWidth: 'calc(100% - 32px)',
                zIndex: '1'
              }, chart.container.parentNode as HTMLElement);
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
    colors: Constants.COLORS,
    title: { text: 'Artists race chart' },
    xAxis: { type: 'category' },
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
      }],
      name: '',
      data: [],
      custom: {
        component: this
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

  private getData(month: Month): [string, number][] {
    return this.artists
      .map(a => ({name: a, count: this.cumulativeUntil(month, a) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 25)
      .map(a => [a.name, a.count]);
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

  private play(): void {
    this.button?.attr({text : 'Pause'});
    this.timer = setInterval(() => this.tick(this.current + 1), 1000);
  }

  /**
   * Pause the timeline, either when the range is ended, or when clicking the pause button.
   * Pausing stops the timer and resets the button to play mode.
   */
  private pause(): void {
    this.button?.attr({text : 'Play'});
    clearTimeout(this.timer);
    this.timer = undefined;
  }
}
