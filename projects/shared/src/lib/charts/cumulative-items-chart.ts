import { TempStats, StreakItem } from 'projects/shared/src/lib/app/model';
import { ToggleableChart } from 'projects/shared/src/lib/charts/toggleable-chart';
import { TranslatePipe } from 'projects/shared/src/lib/service/translate.pipe';
import { MapperService } from '../service/mapper.service';

export class CumulativeItemsChart extends ToggleableChart {
  constructor(translate: TranslatePipe, private mapper: MapperService) {
    super();
    this.options = {
      chart: {
        zooming: { type: 'xy' },
        events: this.events
      },
      plotOptions: this.plotOptions,
      title: {text: `Cumulative ${translate.transform('translate.scrobbles')}`},
      legend: {enabled: false},
      xAxis: {type: 'category'},
      yAxis: [{
        title: {
          text: translate.capFirst('translate.scrobbles')
        }
      }],
      exporting: {
        sourceHeight: 1024,
        chartOptions: {
          legend: {
            enabled: true
          }
        }
      },
      responsive: this.responsive()
    };
  }

  update(stats: TempStats): void {
    super.update(stats);
    if (!this.chart) {
      return;
    }

    const months = [{
      alias: 'Account created',
      artists: new Map(),
      albums: new Map(),
      tracks: new Map(),
      date: new Date()
    }, ...Object.values(stats.monthList)];
    const series = [...this.chart!.series];
    const arr = this.mapper.seen(this.type, stats);

    Object.values(arr)
      .sort((a, b) => b.scrobbles.length - a.scrobbles.length)
      .slice(0, 25)
      .map((a: StreakItem) => {
        const serie = series.find(s => s.name === a.name);
        const data = this.mapper.cumulativeMonths(this.type, months, a);
        if (serie) {
          serie.setData(data, false, false, false);
          series.splice(series.indexOf(serie), 1);
        } else {
          this.chart?.addSeries({
            name: a.name,
            type: 'line',
            data
          }, false);
        }
        return a;
      });

    series.forEach(s => s.remove(false));
    this.chart.update({xAxis: {categories: months.map(m => m.alias)}} as any, true);
  }

  protected load(container: HTMLElement) {
    super.load(container);
    this.update(this.stats!);
  }
}
