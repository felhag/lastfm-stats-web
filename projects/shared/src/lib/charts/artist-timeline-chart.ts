import { PointOptionsObject } from 'highcharts';
import { TempStats } from 'projects/shared/src/lib/app/model';
import { ToggleableChart } from 'projects/shared/src/lib/charts/toggleable-chart';
import { TranslatePipe } from 'projects/shared/src/lib/service/translate.pipe';
import { MapperService } from '../service/mapper.service';
import { AbstractUrlService } from '../service/abstract-url.service';

export class ArtistTimelineChart extends ToggleableChart {
  constructor(translate: TranslatePipe, url: AbstractUrlService, private mapper: MapperService) {
    super();
    this.options = {
      chart: {events: this.events},
      plotOptions: this.plotOptions,
      title: {text: 'Most listened per month'},
      legend: {enabled: false},
      tooltip: {
        useHTML: true,
        formatter(): string {
          const point = (this as any).point;
          const value = point.y;
          const count = point.count;
          const percent = count ? Math.round((value / count) * 100) : 0;
          const [month, artist] = point.name.split(/ - (.*)/s)
          return `
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="
                width:40px;
                height:40px;
                border-radius:50%;
                background: conic-gradient(var(--primaryColor) ${percent}%, var(--primaryColorContrast) 0);
                position:relative;
              ">
                <div style="
                  position:absolute;
                  top:50%;
                  left:50%;
                  width:26px;
                  height:26px;
                  background:#fff;
                  border-radius:50%;
                  transform:translate(-50%, -50%);
                "></div>
              </div>
              <div>
                <strong>${month}</strong><br/>
                Most ${translate.transform('translate.scrobbled')}: <b>${artist}</b><br/>
                Number of ${translate.transform('translate.scrobbles')}: <b>${value}</b> (${Math.round(value / count * 100)}%)<br/>
                Total ${translate.transform('translate.scrobbles')}: <b>${count}</b>
              </div>
            </div>
          `;
        }
      },
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
          click: event => this.openUrl(url.month(event.point.name.substring(0, event.point.name.indexOf('-') - 1)))
        }
      }],
      responsive: this.responsive()
    };
  }

  update(stats: TempStats): void {
    super.update(stats);

    const points: PointOptionsObject[] = [];
    const colorMap: { [key: string]: string } = {};
    const colors = this.getColors();

    for (const month of Object.values(stats.monthList)) {
      const items = this.mapper.monthItems(this.type, month);
      if (items.length) {
        const item = items.reduce((a, b) => a.count > b.count ? a : b);
        if (!colorMap[item.name]) {
          colorMap[item.name] = colors[Object.keys(colorMap).length % colors.length];
        }
        points.push({
          name: month.alias + ' - ' + item.name,
          color: colorMap[item.name],
          y: item.count,
          count: month.count,
        } as PointOptionsObject);
      }
    }
    this.setData(points);
  }
}
