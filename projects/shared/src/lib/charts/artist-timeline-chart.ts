import * as Highcharts from 'highcharts';
import { PointOptionsType } from 'highcharts';
import { TempStats } from 'projects/shared/src/lib/app/model';
import { ToggleableChart } from 'projects/shared/src/lib/charts/toggleable-chart';
import { TranslatePipe } from 'projects/shared/src/lib/service/translate.pipe';
import { MapperService } from '../service/mapper.service';
import { UrlService } from '../service/url.service';

export class ArtistTimelineChart extends ToggleableChart {
  constructor(translate: TranslatePipe, url: UrlService, private mapper: MapperService) {
    super();
    this.options = {
      chart: {events: this.events},
      plotOptions: this.plotOptions,
      title: {text: 'Most listened per month'},
      legend: {enabled: false},
      yAxis: {
        title: {
          text: translate.capFirst('translate.scrobbles')
        },
      },
      xAxis: {visible: false},
      series: [{
        name: translate.capFirst('translate.scrobbles'),
        type: 'column',
        data: [],
        groupPadding: 0,
        pointPadding: 0,
        events: {
          click: event => {
            const month = event.point.name.substring(0, event.point.name.indexOf('-') - 1);
            window.open(url.month(month))
          }
        }
      }],
      responsive: this.responsive()
    };
  }

  update(stats: TempStats): void {
    if (!this.chart) {
      return;
    }
    super.update(stats);

    const points: PointOptionsType[] = [];
    const colorMap: { [key: string]: string } = {};
    const colors = Highcharts.getOptions().colors!;

    for (const month of Object.values(stats.monthList)) {
      const items = this.mapper.monthItems(this.type, month);
      const item = items.reduce((a, b) => a.count > b.count ? a : b);
      if (!colorMap[item.name]) {
        colorMap[item.name] = colors[Object.keys(colorMap).length % colors.length];
      }
      points.push({name: month.alias + ' - ' + item.name, color: colorMap[item.name], y: item.count});
    }
    this.chart.series[0].setData(points);
  }
}
