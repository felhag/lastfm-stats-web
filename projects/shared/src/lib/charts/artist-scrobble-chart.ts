import { TempStats, Constants } from 'projects/shared/src/lib/app/model';
import { AbstractChart } from 'projects/shared/src/lib/charts/abstract-chart';
import { TranslatePipe } from 'projects/shared/src/lib/service/translate.pipe';
import { AbstractUrlService } from '../service/abstract-url.service';

export class ArtistScrobbleChart extends AbstractChart {

  constructor(translate: TranslatePipe, url: AbstractUrlService) {
    super();
    this.options = {
      title: {text: 'Tracks per artist'},
      subtitle: {text: `(${Constants.SCROBBLE_ARTIST_THRESHOLD}+ ${translate.transform('translate.scrobbles')})`},
      chart: {
        type: 'scatter',
        zooming: { type: 'xy' }
      },
      xAxis: {
        title: {
          text: translate.capFirst('translate.scrobbles')
        },
        min: 50
      },
      yAxis: {
        title: {
          text: 'Tracks'
        },
        min: 0
      },
      legend: {
        enabled: false
      },
      plotOptions: {
        scatter: {
          tooltip: {
            headerFormat: '',
            pointFormat: '<span style="color:{point.color}">\u25CF</span>{point.name}<br>' + translate.capFirst('translate.scrobbles') + ': {point.x}<br>Tracks: {point.y}',
          }
        }
      },
      series: [{
        name: 'Artists',
        type: 'scatter',
        data: [],
        events: {
          click: event => this.openUrl(url.artist(event.point.name))
        }
      }],
      exporting: {
        chartOptions: {
          plotOptions: {
            series: {
              dataLabels: {
                enabled: true,
                formatter(): string {
                  return this.point.name;
                }
              }
            }
          }
        }
      },
      responsive: this.responsive()
    };

  }

  update(stats: TempStats): void {
    if (!this.chart) {
      return;
    }

    let data = Object.values(stats.seenArtists).filter(a => a.scrobbles.length >= Constants.SCROBBLE_ARTIST_THRESHOLD).map(artist => ({
      x: artist.scrobbles.length,
      y: artist.tracks.length,
      name: artist.name
    }));
    if (data.length > 500) {
      data = data.sort((a, b) => b.x - a.x).slice(0, 499);
    }

    this.chart.series[0].setData(data);
  }
}
