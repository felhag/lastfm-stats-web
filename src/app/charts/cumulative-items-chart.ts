import * as Highcharts from 'highcharts';
import { Mapper } from '../util/mapper';
import { TempStats, StreakItem } from '../model';
import { ToggleableChart } from './toggleable-chart';

export class CumulativeItemsChart extends ToggleableChart {
  options: Highcharts.Options = {
    chart: {
      zoomType: 'xy',
      events: this.events
    },
    plotOptions: this.plotOptions,
    title: {text: 'Cumulative scrobbles for top 25'},
    legend: {enabled: false},
    xAxis: {type: 'category'},
    yAxis: [{
      title: {
        text: 'Scrobbles'
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

  update(stats: TempStats): void {
    if (!this.chart) {
      return;
    }
    super.update(stats);

    const months = [{alias: 'Account created', artists: new Map(), date: new Date()}, ...Object.values(stats.monthList)];
    const series = [...this.chart!.series];
    const arr = Mapper.seen(this.type, stats);

    Object.values(arr)
      .sort((a, b) => b.scrobbles.length - a.scrobbles.length)
      .slice(0, 25)
      .map((a: StreakItem) => {
        const serie = series.find(s => s.name === a.name);
        const data = Mapper.cumulativeMonths(this.type, months, a);
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
}
