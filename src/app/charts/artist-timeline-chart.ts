import * as Highcharts from 'highcharts';
import { PointOptionsType } from 'highcharts';
import { Mapper } from '../util/mapper';
import { TempStats } from '../model';
import { UrlBuilder } from '../util/url-builder';
import { ToggleableChart } from './ToggleableChart';

export class ArtistTimelineChart extends ToggleableChart {
  options: Highcharts.Options = {
    chart: {events: this.events},
    plotOptions: this.plotOptions,
    title: {text: 'Most listened per month'},
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
      events: {
        click: event => {
          const month = event.point.name.substring(0, event.point.name.indexOf('-') - 1);
          window.open(UrlBuilder.month(this.username, month))
        }
      }
    }],
    responsive: this.responsive()
  };

  update(stats: TempStats): void {
    if (!this.chart) {
      return;
    }
    super.update(stats);

    const points: PointOptionsType[] = [];
    const colorMap: { [key: string]: string } = {};
    const colors = Highcharts.getOptions().colors!;

    for (const month of Object.values(stats.monthList)) {
      const items = Mapper.monthItems(this.type, month);
      const item = items.reduce((a, b) => a.count > b.count ? a : b);
      if (!colorMap[item.name]) {
        colorMap[item.name] = colors[Object.keys(colorMap).length % colors.length];
      }
      points.push({name: month.alias + ' - ' + item.name, color: colorMap[item.name], y: item.count});
    }
    this.chart.series[0].setData(points);
  }
}
