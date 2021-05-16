import * as Highcharts from 'highcharts';
import {TempStats, Month, Constants} from '../model';
import {AbstractChart} from './abstract-chart';

export class CumulativeArtistChart extends AbstractChart {
  options: Highcharts.Options = {
    chart: {zoomType: 'xy'},
    title: {text: 'Cumulative scrobbles for top 25 artists'},
    legend: {enabled: false},
    colors: Constants.COLORS,
    xAxis: {type: 'category'},
    yAxis: [{
      title: {
        text: 'Scrobbles'
      }
    }],
    responsive: this.responsive()
  };

  update(stats: TempStats): void {
    if (!this.chart) {
      return;
    }

    const months = [{alias: 'Account created', artists: {}, newArtists: []}, ...Object.values(stats.monthList)];
    const series = [...this.chart!.series];
    Object.values(stats.seenArtists)
      .sort((a, b) => b.scrobbleCount - a.scrobbleCount)
      .slice(0, 25)
      .map(a => a.name)
      .map(a => {
        const serie = series.find(s => s.name === a);
        const data = this.cumulativeMonths(months, a);
        if (serie) {
          serie.setData(data, false, false, false);
          series.splice(series.indexOf(serie), 1);
        } else {
          this.chart?.addSeries({
            name: a,
            type: 'line',
            data
          }, false);
        }
        return a;
      });

    series.forEach(s => s.remove(false));
    this.chart.update({xAxis: {categories: months.map(m => m.alias)}} as any, true);
  }

  private cumulativeMonths(months: Month[], artist: string): number[] {
    const result: number[] = [];
    months.reduce((acc, cur, idx) => result[idx] = acc + (cur.artists[artist]?.count || 0), 0);
    return result;
  }
}
