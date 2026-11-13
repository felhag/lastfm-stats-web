import { TempStats } from 'projects/shared/src/lib/app/model';
import { ToggleableChart } from 'projects/shared/src/lib/charts/toggleable-chart';
import { TranslatePipe } from 'projects/shared/src/lib/service/translate.pipe';
import { MapperService } from '../service/mapper.service';

export class DiscoveryChart extends ToggleableChart {
  constructor(translate: TranslatePipe, private mapper: MapperService) {
    super();
    this.options = {
      chart: {
        events: this.events
      },
      plotOptions: {
        ...this.plotOptions,
        area: {
          stacking: 'percent',
          marker: {enabled: false, symbol: 'circle'},
          lineWidth: 1
        }
      },
      title: {text: `${translate.capFirst('translate.scrobbles')} by discovery year`},
      legend: {enabled: false},
      xAxis: {type: 'category'},
      yAxis: [{
        title: {text: ''},
        labels: {format: '{value}%'}
      }, {
        min: 0,
        opposite: true,
        allowDecimals: false,
        title: {text: ''}
      }],
      tooltip: {
        shared: true,
        pointFormatter(): string {
          const point = this;
          if (point.series.type === 'line') {
            return `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${point.y}</b>`;
          }
          if (!point.y) {
            return '';
          }
          return `<span style="color:${point.color}">●</span> Discovered in ${point.series.name}: <b>${(point.percentage as number).toFixed(1)}%</b> (${point.y} ${translate.transform('translate.scrobbles')})<br/>`;
        }
      },
      exporting: {
        sourceHeight: 1024
      },
      series: [],
      responsive: this.responsive(['left', 'right'])
    };
  }

  update(stats: TempStats): void {
    super.update(stats);
    if (!this.chart || !stats.first || !stats.last) {
      return;
    }

    const firstYear = stats.first.date.getFullYear();
    const years = stats.last.date.getFullYear() - firstYear + 1;
    // Year boundaries, so each timestamp can be bucketed without creating a Date
    const boundaries = Array.from({length: years + 1}, (_, idx) => new Date(firstYear + idx, 0, 1).getTime());
    const perDiscoveryYear: number[][] = Array.from({length: years}, () => new Array(years).fill(0));
    const newItems: number[] = new Array(years).fill(0);

    for (const item of Object.values(this.mapper.seen(this.type, stats))) {
      let year = 0;
      let discoveryYear = -1;
      for (const ts of item.scrobbles) {
        while (year < years - 1 && ts >= boundaries[year + 1]) {
          year++;
        }
        if (discoveryYear < 0) {
          discoveryYear = year;
          newItems[year]++;
        }
        perDiscoveryYear[discoveryYear][year]++;
      }
    }

    while (this.chart.series.length) {
      this.chart.series[0].remove(false);
    }
    perDiscoveryYear.forEach((data, idx) => this.chart!.addSeries({
      type: 'area',
      name: String(firstYear + idx),
      data: data.map((count, year) => year < idx ? null : count)
    }, false));

    const noun = this.type + 's';
    this.chart.addSeries({
      type: 'line',
      name: `New ${noun}`,
      yAxis: 1,
      zIndex: 1,
      color: this.textColor,
      marker: {enabled: true, symbol: 'circle'},
      data: newItems
    }, false);

    this.chart.update({
      yAxis: [{}, {title: {text: `New ${noun}`}}],
      xAxis: {categories: boundaries.slice(0, years).map((_, idx) => String(firstYear + idx))}
    }, true);
  }

  protected load(container: HTMLElement) {
    super.load(container);
    this.update(this.stats!);
  }
}
