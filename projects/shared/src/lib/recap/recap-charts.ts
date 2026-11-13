import { Directive, effect, ElementRef, inject, input, OnDestroy } from '@angular/core';
import * as Highcharts from 'highcharts';
import 'highcharts/modules/heatmap';
import 'highcharts/modules/streamgraph';
import 'highcharts/modules/wordcloud';
import 'highcharts/modules/xrange';
import { Constants } from '../app/model';
import { Recap, RecapSession, WEEKS } from './recap';

const TEXT = 'rgba(255, 255, 255, 0.8)';
const LINE = 'rgba(255, 255, 255, 0.2)';
/** The streamgraph's bands, the top artists list uses the same colors instead of a legend. */
export const ARTIST_COLORS = ['#ffffff', '#ffe082', '#80deea', '#f48fb1', '#c5e1a5'];

/** Shared look for all recap charts: transparent on top of the slide gradients, white text. */
const THEME: Highcharts.Options = {
  chart: {
    backgroundColor: 'transparent',
    style: {fontFamily: 'Roboto, "Helvetica Neue", sans-serif'},
    spacing: [8, 0, 8, 0],
  },
  title: {text: undefined},
  credits: {enabled: false},
  exporting: {enabled: false},
  legend: {
    itemStyle: {color: '#fff', fontWeight: '400'},
    itemHoverStyle: {color: '#fff'},
  },
  xAxis: {
    lineColor: LINE,
    tickColor: LINE,
    labels: {style: {color: TEXT}},
    title: {text: undefined},
  },
  yAxis: {
    gridLineColor: LINE,
    labels: {style: {color: TEXT}},
    title: {text: undefined},
  },
};

/**
 * Renders a Highcharts chart once it scrolls into view, so the intro animation plays when the
 * slide is actually visible. Changing the options (e.g. switching year) redraws it.
 */
@Directive({selector: '[appRecapChart]'})
export class RecapChartDirective implements OnDestroy {
  readonly options = input.required<Highcharts.Options>({alias: 'appRecapChart'});

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private chart?: Highcharts.Chart;
  private observer?: IntersectionObserver;

  constructor() {
    effect(() => {
      const options = Highcharts.merge(THEME, this.options());
      this.destroy();
      this.observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          this.observer?.disconnect();
          this.chart = Highcharts.chart(this.element, options);
        }
      }, {threshold: .3});
      this.observer.observe(this.element);
    });
  }

  ngOnDestroy(): void {
    this.destroy();
  }

  private destroy(): void {
    this.observer?.disconnect();
    this.chart?.destroy();
    this.chart = undefined;
  }
}

export interface RecapCharts {
  cumulative: Highcharts.Options;
  discoveries?: Highcharts.Options;
  artists: Highcharts.Options;
  calendar: Highcharts.Options;
  clock: Highcharts.Options;
  sessions: Highcharts.Options;
  words?: Highcharts.Options;
}

export function recapCharts(recap: Recap, noun: string): RecapCharts {
  return {
    cumulative: cumulative(recap, noun),
    discoveries: recap.discoveries.length ? discoveries(recap, noun) : undefined,
    artists: artists(recap, noun),
    calendar: calendar(recap, noun),
    clock: clock(recap, noun),
    sessions: sessions(recap, noun),
    words: recap.words.length ? words(recap) : undefined,
  };
}

/** Running total through the year, compared with the year before. */
function cumulative(recap: Recap, noun: string): Highcharts.Options {
  const days = recap.perDay.slice(0, recap.daysElapsed);
  const series: Highcharts.SeriesOptionsType[] = [{
    type: 'areaspline',
    name: String(recap.year),
    data: runningTotal(days),
    color: '#fff',
    fillOpacity: .25,
    lineWidth: 3,
  }];
  if (recap.previousTotal) {
    series.push({
      type: 'spline',
      name: String(recap.year - 1),
      data: runningTotal(recap.previousPerDay),
      color: 'rgba(255, 255, 255, 0.6)',
      dashStyle: 'Dash',
      lineWidth: 2,
    });
  }
  return {
    chart: {height: 260},
    xAxis: {type: 'datetime', labels: {format: '{value:%b}'}},
    yAxis: {min: 0},
    legend: {enabled: series.length > 1},
    tooltip: {shared: true, xDateFormat: '%B %e', valueSuffix: ` ${noun}`},
    plotOptions: {
      series: {
        marker: {enabled: false},
        pointStart: Date.UTC(recap.year, 0, 1),
        pointInterval: Constants.DAY,
      }
    },
    series,
  };
}

/** The top artists flowing through the year, the thicker a band the more that artist was played. */
function artists(recap: Recap, noun: string): Highcharts.Options {
  const weekLength = recap.daysInYear / WEEKS * Constants.DAY;
  // an ongoing year stops at the current week, instead of every band dropping to zero
  const weeks = recap.ongoing ? Math.floor((Date.now() - new Date(recap.year, 0, 1).getTime()) / weekLength) + 1 : WEEKS;
  return {
    chart: {type: 'streamgraph', height: 240},
    colors: ARTIST_COLORS,
    legend: {enabled: false},
    xAxis: {
      type: 'datetime',
      min: Date.UTC(recap.year, 0, 1),
      max: Date.UTC(recap.year + 1, 0, 1) - 1,
      labels: {format: '{value:%b}'},
      crosshair: {color: LINE},
    },
    // a streamgraph centers around zero, its values mean nothing on their own
    yAxis: {visible: false, startOnTick: false, endOnTick: false},
    // the weekly bands are noisy, so the tooltip sums up the whole month of the hovered week instead
    tooltip: {
      shared: true,
      formatter(this: any) {
        const month = new Date(this.x).getUTCMonth();
        const rows = recap.artistWeeks
          .map((artist, i) => ({name: artist.name, count: artist.months[month], color: ARTIST_COLORS[i % ARTIST_COLORS.length]}))
          .filter(row => row.count)
          .sort((a, b) => b.count - a.count)
          .map(row => `<span style="color:${row.color}">\u25CF</span> ${escape(row.name)}: <b>${row.count}</b>`);
        return [`<b>${Constants.MONTHS[month]}</b>`, ...(rows.length ? rows : [`No ${noun}`])].join('<br>');
      }
    },
    plotOptions: {
      streamgraph: {
        marker: {enabled: false},
        lineWidth: 0,
        fillOpacity: .85,
        pointStart: Date.UTC(recap.year, 0, 1),
        pointInterval: weekLength,
      }
    },
    series: recap.artistWeeks.map(artist => ({type: 'streamgraph', name: artist.name, data: artist.weeks.slice(0, weeks)})),
  };
}

/**
 * Every new artist as a dot: when it was first played, and how much it was played after that. The ones that stuck
 * float to the top, one-offs line the bottom.
 */
function discoveries(recap: Recap, noun: string): Highcharts.Options {
  const data = recap.discoveries.map(artist => ({
    x: wallClock(artist.first),
    y: artist.count,
    name: artist.name,
  }));
  return {
    chart: {type: 'scatter', height: 220},
    xAxis: {
      type: 'datetime',
      min: Date.UTC(recap.year, 0, 1),
      max: Date.UTC(recap.year + 1, 0, 1) - 1,
      labels: {format: '{value:%b}'},
    },
    yAxis: {min: 0, gridLineWidth: 0},
    legend: {enabled: false},
    tooltip: {
      headerFormat: '',
      pointFormatter(this: any) {
        return `<b>${this.name}</b><br>First heard on ${Highcharts.dateFormat('%B %e', this.x)}<br>${this.y} ${noun}`;
      }
    },
    series: [{
      type: 'scatter',
      name: 'Discoveries',
      data,
      turboThreshold: 0,
      color: 'rgba(255, 255, 255, 0.45)',
      marker: {radius: 3, symbol: 'circle'},
    }],
  };
}

/** Every day of the year as a cell, GitHub contributions style. */
function calendar(recap: Recap, noun: string): Highcharts.Options {
  const offset = (new Date(recap.year, 0, 1).getDay() + 6) % 7;
  const data = recap.perDay.map((value, i) => ({
    x: Math.floor((i + offset) / 7),
    y: (i + offset) % 7,
    value,
    name: new Date(recap.year, 0, i + 1).toDateString(),
  })).filter(day => day.value);
  const monthStarts = Constants.MONTHS.map((_, m) => Math.floor((dayOfYear(recap.year, m) + offset) / 7));
  return {
    chart: {type: 'heatmap', height: 200},
    xAxis: {
      min: 0,
      max: 53,
      lineWidth: 0,
      tickLength: 0,
      tickPositions: monthStarts,
      labels: {
        autoRotation: undefined,
        style: {textOverflow: 'none'},
        formatter: ctx => Constants.MONTHS[monthStarts.indexOf(ctx.value as number)]?.substring(0, 3) ?? ''
      },
    },
    yAxis: {
      categories: Constants.DAYS.map(d => d.substring(0, 3)),
      reversed: true,
      gridLineWidth: 0,
      tickPositions: [0, 2, 4, 6],
      min: 0,
      max: 6,
    },
    ...heatColors(),
    tooltip: {pointFormat: `{point.name}: <b>{point.value}</b> ${noun}`, headerFormat: ''},
    series: [{type: 'heatmap', name: noun, data, borderWidth: 0, pointPadding: 1}],
    responsive: {
      rules: [{
        condition: {maxWidth: 600},
        // three letter months don't fit on phones
        chartOptions: {xAxis: {labels: {formatter: ctx => Constants.MONTHS[monthStarts.indexOf(ctx.value as number)]?.charAt(0) ?? ''}}}
      }]
    },
  };
}

/** Weekday x hour of day. */
function clock(recap: Recap, noun: string): Highcharts.Options {
  // hours without any scrobbles are left out, the slide's background shows through instead
  const data = recap.weekHours.map((value, i) => [i % 24, Math.floor(i / 24), value]).filter(([, , value]) => value);
  return {
    chart: {type: 'heatmap', height: 280},
    xAxis: {
      categories: [...Array(24).keys()].map(h => String(h).padStart(2, '0')),
      // keep every hour and weekday on the axes, also when their cells are all left out
      min: 0,
      max: 23,
      lineWidth: 0,
      tickLength: 0,
    },
    yAxis: {
      categories: Constants.DAYS.map(d => d.substring(0, 3)),
      reversed: true,
      gridLineWidth: 0,
      min: 0,
      max: 6,
    },
    ...heatColors(),
    tooltip: {
      headerFormat: '',
      pointFormatter(this: any) {
        return `${Constants.DAYS[this.y]} ${this.x}:00 - ${this.x + 1}:00: <b>${this.value}</b> ${noun}`;
      }
    },
    series: [{type: 'heatmap', name: noun, data, borderWidth: 0, pointPadding: 1.5}],
  };
}

/** Every session as a segment on a single bar spanning the year, bigger sessions are brighter. */
function sessions(recap: Recap, noun: string): Highcharts.Options {
  const all = recap.sessions.all;
  const max = Math.max(...all.map(s => s.count), 1);
  const data = all.map(session => ({
    x: wallClock(session.start),
    x2: wallClock(session.end),
    y: 0,
    color: `rgba(255, 255, 255, ${.3 + .7 * session.count / max})`,
    session,
  }));
  return {
    chart: {type: 'xrange', height: 120},
    xAxis: {
      type: 'datetime',
      min: Date.UTC(recap.year, 0, 1),
      // just before the next January, so it doesn't get a label
      max: Date.UTC(recap.year + 1, 0, 1) - 1,
      labels: {format: '{value:%b}'},
    },
    yAxis: {categories: [''], gridLineWidth: 0, labels: {enabled: false}},
    legend: {enabled: false},
    tooltip: {
      headerFormat: '',
      pointFormatter(this: any) {
        const session: RecapSession = this.session;
        const time = (d: Date) => Highcharts.dateFormat('%H:%M', wallClock(d));
        return `${Highcharts.dateFormat('%A, %B %e', wallClock(session.start))}, ${time(session.start)} - ${time(session.end)}: <b>${session.count}</b> ${noun}`;
      }
    },
    series: [{
      type: 'xrange',
      name: 'Sessions',
      data,
      borderWidth: 0,
      borderRadius: 0,
      pointWidth: 48,
      // most sessions only last a few hours, which would be invisible on a scale of a year
      minPointLength: 2,
    }],
  };
}

function words(recap: Recap): Highcharts.Options {
  return {
    chart: {height: 360},
    colors: ['#ffffff', '#ffe082', '#80deea', '#f48fb1', '#c5e1a5'],
    tooltip: {enabled: false},
    series: [{
      type: 'wordcloud',
      name: 'Words',
      colorByPoint: true,
      rotation: {from: 0, to: 0, orientations: 1},
      minFontSize: 10,
      maxFontSize: 64,
      style: {fontFamily: 'Roboto, "Helvetica Neue", sans-serif', fontWeight: '500'},
      data: recap.words,
    }],
  };
}

function escape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Charts are rendered in UTC: shift local dates so the axis and tooltips show the local time. */
function wallClock(date: Date): number {
  return date.getTime() - date.getTimezoneOffset() * 60000;
}

function heatColors(): Highcharts.Options {
  return {
    colorAxis: {min: 0, minColor: 'rgba(255, 255, 255, 0.08)', maxColor: '#ffffff'},
    legend: {enabled: false},
  };
}

function runningTotal(days: number[]): number[] {
  let sum = 0;
  return days.map(d => sum += d);
}

function dayOfYear(year: number, month: number): number {
  return Math.round((new Date(year, month, 1).getTime() - new Date(year, 0, 1).getTime()) / Constants.DAY);
}
