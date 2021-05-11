import * as Highcharts from 'highcharts';
import {TempStats} from '../model';
import {AbstractChart} from './abstract-chart';
import wordcloud from 'highcharts/modules/wordcloud';
wordcloud(Highcharts);

export class WordcloudChart extends AbstractChart {
  options: Highcharts.Options = {
    series: [{
      type: 'wordcloud',
      data: [],
      name: 'Occurrences'
    }],
    title: {
      text: 'Wordcloud of artists and tracks'
    },
    tooltip: {
      formatter(): string {
        return this.key + '<br><span style="color:' + this.point.color + '">\u25CF</span>' + this.y;
      }
    }
  };

  update(stats: TempStats): void {
    if (!this.chart) {
      return;
    }

    const words: {[key: string]: number} = {};
    Object.values(stats.seenArtists).forEach(a => a.name.split(' ')
      .concat(a.tracks.flatMap(t => t.split(' ')))
      .map(w => w.toLowerCase().replace(/[^a-z0-9\'-]/g, ''))
      .forEach(w => words[w] = (words[w] || 0) + 1));

    const data = Object.keys(words)
      .sort((a, b) => words[b] - words[a])
      .slice(0, 100)
      .map(k => ({name: k, weight: Math.min(words[k], 750), y: words[k]}));
    this.chart.series[0].setData(data);
  }
}
