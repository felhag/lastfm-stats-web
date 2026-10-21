import { TempStats } from 'projects/shared/src/lib/app/model';
import { AbstractChart } from 'projects/shared/src/lib/charts/abstract-chart';
import { PlaytimePipe } from '../pipe/playtime.pipe';

const HOUR = 60 * 60 * 1000;

/** Listening time per year, only meaningful for sources that know how long each play lasted (spotify). */
export class PlaytimeChart extends AbstractChart {
  constructor(playtime: PlaytimePipe) {
    super();
    this.options = {
      title: {text: 'Playtime per year'},
      legend: {enabled: false},
      xAxis: {
        categories: [],
        title: {text: 'Year'},
      },
      yAxis: {
        allowDecimals: false,
        title: {text: 'Hours'},
      },
      series: [{
        name: 'Playtime',
        type: 'column',
        data: [],
        tooltip: {
          headerFormat: '',
          pointFormatter(): string {
            const {ms, share} = (this as any).custom as {ms: number, share: number};
            return `<b>${this.category}</b><br>${playtime.transform(ms)} (${share.toFixed(1)}% of all playtime)`;
          }
        }
      }],
      responsive: this.responsive()
    };
  }

  update(stats: TempStats): void {
    if (!stats.playtime) {
      return;
    }
    const years = Object.keys(stats.playtimePerYear).map(y => parseInt(y)).sort((a, b) => a - b);
    const data = years.map(year => {
      const ms = stats.playtimePerYear[year];
      return {
        y: Math.round(ms / HOUR * 10) / 10,
        custom: {ms, share: ms / stats.playtime * 100},
      };
    });
    this.updateXAxis({categories: years.map(String)});
    this.setData(data);
  }
}
