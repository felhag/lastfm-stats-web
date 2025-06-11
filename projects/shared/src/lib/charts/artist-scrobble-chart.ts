import { Constants, TempStats } from 'projects/shared/src/lib/app/model';
import { AbstractChart } from 'projects/shared/src/lib/charts/abstract-chart';
import { TranslatePipe } from 'projects/shared/src/lib/service/translate.pipe';
import { AbstractUrlService } from '../service/abstract-url.service';
import { PointOptionsObject } from "highcharts";

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
      }, {
        type: 'line',
        name: 'Trend Line',
        data: [],
        marker: {
          enabled: false
        },
        states: {
          hover: {
            lineWidth: 0
          }
        },
        enableMouseTracking: false
      }],
      exporting: {
        chartOptions: {
          plotOptions: {
            series: {
              dataLabels: {
                enabled: true,
                formatter(): string {
                  return (this as any).point.name;
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
    let data: PointOptionsObject[] = Object.values(stats.seenArtists).filter(a => a.scrobbles.length >= Constants.SCROBBLE_ARTIST_THRESHOLD).map(artist => ({
      x: artist.scrobbles.length,
      y: artist.tracks.length,
      name: artist.name
    }));
    const trend = this.getTrendLine(data);
    if (data.length > 500) {
      data = data.sort((a, b) => b.x as number - (a.x as number)).slice(0, 499);
    }

    this.setData(data, trend);
  }

  private getTrendLine(data: PointOptionsObject[]) {
    const n = data.length;

    // Calculate the sums needed for linear regression
    const [sumX, sumY, sumXY, sumX2] = data.reduce(((obj, val) => {
      const x = val.x as number;
      const y = val.y!;
      return [obj[0] + x, obj[1] + y, obj[2] + x * y, obj[3] + x ** 2];
    }), [0, 0, 0, 0]);

    // Calculate the slope and intercept of the trend line
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX ** 2);
    const intercept = (sumY - slope * sumX) / n;

    // Find the minimum and maximum x-values from the scatter plot data
    const minX = Math.min(...data.map((obj) => obj.x as number));
    const maxX = Math.max(...data.map((obj) => obj.x as number));

    // Calculate the corresponding y-values for the trend line using the slope and intercept
    return [
      [minX, minX * slope + intercept],
      [maxX, maxX * slope + intercept],
    ];
  }
}
