import {PointOptionsType} from 'highcharts';
import {TempStats} from '../model';
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
    }],
    responsive: this.responsive()
  };

  update(stats: TempStats): void {
    if (!this.chart) {
      return;
    }

    const points: PointOptionsType[] = [];
    const colorMap: { [key: string]: string } = {};
    const colors = Highcharts.getOptions().colors!;
    let idx = 0;
    for (const month of Object.values(stats.monthList)) {
      const scrobbles = month.artists;
      const artist = Object.keys(scrobbles).reduce((a, b) => scrobbles[a].count > scrobbles[b].count ? a : b);
      if (!colorMap[artist]) {
        colorMap[artist] = colors[Object.keys(colorMap).length % colors.length];
      }
      points.push({name: month.alias + ' - ' + artist, color: colorMap[artist], y: scrobbles[artist].count});
      idx++;
    }
    this.chart.series[0].setData(points);
  }
}
