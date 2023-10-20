import * as Highcharts from 'highcharts';
import {TempStats} from 'projects/shared/src/lib/app/model';
import {AbstractChart} from 'projects/shared/src/lib/charts/abstract-chart';
import { TranslatePipe } from 'projects/shared/src/lib/service/translate.pipe';

export class TimelineChart extends AbstractChart {
  constructor(translate: TranslatePipe) {
    super();

    this.options = {
      title: {text: translate.capFirst('translate.scrobbles') + ', artists and tracks over time'},
      xAxis: {
        type: 'datetime'
      },
      tooltip: {
        formatter(): string {
          const date = new Date(this.x as number).toLocaleString();
          const value = Highcharts.numberFormat(this.y as number, 0, '', '.');
          return `${date}<br><b>${this.key}</b><br><span style="color:${this.point.color}">\u25CF</span>${value} ${this.series.name.toLowerCase()}`
        }
      },
      yAxis: [{
        title: {
          text: translate.capFirst('translate.scrobbles'),
          style: {
            color: this.getColors()[0]
          }
        }
      }, {
        gridLineWidth: 0,
        opposite: true,
        title: {
          text: 'Artists, albums & tracks'
        }
      }],
      series: [
        this.serie(translate.capFirst('translate.scrobbles'), 0),
        this.serie('Artists', 1),
        this.serie('Tracks', 1),
        this.serie('Albums', 1)
      ],
      responsive: this.responsive(['left', 'right', undefined])
    };
  }

  private serie(name: string, yAxis: number): Highcharts.SeriesOptionsType {
    return {
      name,
      yAxis,
      data: [],
      type: 'line',
      marker: {
        enabled: false,
        symbol: 'circle'
      }
    }
  }

  update(stats: TempStats): void {
    if (!stats.first) {
      return;
    }

    let i = 0;
    const uniqueArtists: Highcharts.PointOptionsObject[] = [];
    for (const month of Object.values(stats.monthList)) {
      [...month.artists.values()]
        .filter(a => a.new)
        .forEach(a => {
          i++;
          if (i % 100 === 0) {
            const scrobble = a.new!;
            uniqueArtists.push({
              x: scrobble.date.getTime(),
              y: i,
              name: scrobble.artist
            });
          }
      });
    }

    const scrobbles = stats.scrobbleMilestones.map((scrobble, idx) => ({
      x: scrobble.date.getTime(),
      y: (idx + 1) * 1000,
      name: scrobble.artist + ' - ' + scrobble.track
    }));

    const albums = stats.albumMilestones.map((scrobble, idx) => ({
      x: scrobble.date.getTime(),
      y: (idx + 1) * 1000,
      name: scrobble.artist + ' - ' + scrobble.track
    }));

    const tracks = stats.trackMilestones.map((scrobble, idx) => ({
      x: scrobble.date.getTime(),
      y: (idx + 1) * 1000,
      name: scrobble.artist + ' - ' + scrobble.track
    }));

    const start = {
      x: stats.first!.date.getTime(),
      y: 0,
      name: 'Account created'
    };
    [scrobbles, uniqueArtists, albums, tracks].forEach(arr => arr.unshift(start));

    this.setData(scrobbles, uniqueArtists, tracks, albums);
  }
}
