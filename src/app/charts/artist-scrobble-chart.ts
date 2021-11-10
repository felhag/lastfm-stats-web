import {TempStats, Constants} from '../model';
import { UrlBuilder } from '../util/url-builder';
import {AbstractChart} from './abstract-chart';
import * as Highcharts from 'highcharts';

export class ArtistScrobbleChart extends AbstractChart {
  options: Highcharts.Options = {
    title: {text: 'Tracks per artist'},
    subtitle: {text: `(${Constants.SCROBBLE_ARTIST_THRESHOLD}+ scrobbles)`},
    chart: {
      type: 'scatter',
      zoomType: 'xy',
    },
    xAxis: {
      title: {
        text: 'Scrobbles'
      },
      min: 0
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
          pointFormat: '<span style="color:{point.color}">\u25CF</span>{point.name}<br>Scrobbles: {point.x}<br>Tracks: {point.y}',
        }
      }
    },
    series: [{
      name: 'Artists',
      type: 'scatter',
      data: [],
      events: {
        click: event => window.open(UrlBuilder.artist(this.username, event.point.name))
      }
    }],
    responsive: this.responsive()
  };

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
