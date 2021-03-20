import {TempStats} from '../model';
import {AbstractChart} from './abstract-chart';
import * as Highcharts from 'highcharts';

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
          color: Highcharts.getOptions().colors![1]
        }
      }
    }, {
      gridLineWidth: 0,
      opposite: true,
      title: {
        text: 'Artists',
        style: {
          color: Highcharts.getOptions().colors![0]
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
    },{
      name: 'Artists',
      yAxis: 1,
      data: [],
      type: 'line',
    }, {
      name: 'Tracks',
      yAxis: 2,
      data: [],
      type: 'line',
    }]
  };

  update(stats: TempStats): void {
    if (!this.chart) {
      return;
    }
    let i = 0;
    const uniqueArtists: Highcharts.PointOptionsObject[] = [];
    for (const month of Object.values(stats.monthList)) {
      for (const scrobble of month.newArtists) {
        i++;
        if (i % 100 === 0) {
          uniqueArtists.push({
            x: scrobble.date.getTime(),
            y: i,
            name: scrobble.artist
          });
        }
      }
    }

    const scrobbles = stats.scrobbleMilestones.map((scrobble, idx) => ({
      x: scrobble.date.getTime(),
      y: idx * 1000,
      name: scrobble.artist + ' - ' + scrobble.track
    }));

    const tracks = stats.trackMilestones.map((scrobble, idx) => ({
      x: scrobble.date.getTime(),
      y: idx * 1000,
      name: scrobble.artist + ' - ' + scrobble.track
    }));

    this.chart.series[0].setData(scrobbles);
    this.chart.series[1].setData(uniqueArtists);
    this.chart.series[2].setData(tracks);
  }
}
