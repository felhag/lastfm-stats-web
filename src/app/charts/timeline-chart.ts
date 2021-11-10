import * as Highcharts from 'highcharts';
import {TempStats} from '../model';
import {AbstractChart} from './abstract-chart';

export class TimelineChart extends AbstractChart {
  options: Highcharts.Options = {
    title: {text: 'Scrobbles, artists and tracks over time'},
    xAxis: {
      type: 'datetime'
    },
    tooltip: {
      formatter(): string {
        return new Date(this.x).toLocaleString() + '<br><b>' + this.key + '</b><br><span style="color:' + this.point.color + '">\u25CF</span>' + Highcharts.numberFormat(this.y, 0, '', '.');
      }
    },
    yAxis: [{
      title: {
        text: 'Scrobbles',
        style: {
          color: Highcharts.getOptions().colors![0]
        }
      }
    }, {
      gridLineWidth: 0,
      opposite: true,
      title: {
        text: 'Artists',
        style: {
          color: Highcharts.getOptions().colors![1]
        }
      }
    }, {
      gridLineWidth: 0,
      opposite: true,
      title: {
        text: 'Tracks',
        style: {
          color: Highcharts.getOptions().colors![2]
        }
      }
    }],
    series: [{
      name: 'Scrobbles',
      data: [],
      type: 'line',
    }, {
      name: 'Artists',
      yAxis: 1,
      data: [],
      type: 'line',
    }, {
      name: 'Tracks',
      yAxis: 2,
      data: [],
      type: 'line',
    }],
    responsive: this.responsive(['left', 'right', undefined])
  };

  update(stats: TempStats): void {
    if (!this.chart || !stats.first) {
      return;
    }
    let i = 0;
    const uniqueArtists: Highcharts.PointOptionsObject[] = [];
    for (const month of Object.values(stats.monthList)) {
      Object.values(month.artists)
        .filter(a => a.new)
        .forEach(a => {
          i++;
          if (i % 100 === 0) {
            const scrobble = a.new!;
            uniqueArtists.push({
              x: scrobble.date.getTime(),
              y: i,
              name: scrobble.artist
            });
          }
      });
    }

    const scrobbles = stats.scrobbleMilestones.map((scrobble, idx) => ({
      x: scrobble.date.getTime(),
      y: (idx + 1) * 1000,
      name: scrobble.artist + ' - ' + scrobble.track
    }));

    const tracks = stats.trackMilestones.map((scrobble, idx) => ({
      x: scrobble.date.getTime(),
      y: (idx + 1) * 1000,
      name: scrobble.artist + ' - ' + scrobble.track
    }));

    const start = {
      x: stats.first!.date.getTime(),
      y: 0,
      name: 'Account created'
    };
    [scrobbles, uniqueArtists, tracks].forEach(arr => arr.unshift(start));

    this.chart.series[0].setData(scrobbles);
    this.chart.series[1].setData(uniqueArtists);
    this.chart.series[2].setData(tracks);
  }
}
