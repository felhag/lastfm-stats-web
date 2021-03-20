import {PointOptionsType} from 'highcharts';
import {TempStats} from '../stats-builder.service';
import {AbstractChart} from './abstract-chart';
import * as Highcharts from 'highcharts';

export class ArtistTimelineChart extends AbstractChart {
  options: Highcharts.Options = {
    title: {text: 'Most listened artist per month'},
    legend: {enabled: false},
    yAxis: {
      title: {
        text: 'Scrobbles'
      },
    },
    xAxis: {visible: false},
    series: [{
      name: 'Scrobbles',
      type: 'column',
      data: [],
      groupPadding: 0,
      pointPadding: 0,
    }]
  };

  update(stats: TempStats): void {
    if (!this.chart) {
      return;
    }

    const points: PointOptionsType[] = [];
    const colorMap: { [key: string]: string } = {};
    let idx = 0;
    for (const month of Object.values(stats.monthList)) {
      const scrobbles = month.scrobblesPerArtist;
      const artist = Object.keys(scrobbles).reduce((a, b) => scrobbles[a] > scrobbles[b] ? a : b);
      if (!colorMap[artist]) {
        colorMap[artist] = Highcharts.getOptions().colors![Object.keys(colorMap).length % 10];
      }
      points.push({name: month.alias + ' - ' + artist, color: colorMap[artist], y: scrobbles[artist]});
      idx++;
    }
    this.chart.series[0].setData(points);
  }
}
