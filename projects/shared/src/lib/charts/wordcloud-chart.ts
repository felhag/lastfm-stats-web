import { AbstractChart } from 'projects/shared/src/lib/charts/abstract-chart';
import { MapperService } from '../service/mapper.service';
import { TempStats, ItemType } from 'projects/shared/src/lib/app/model';
import * as Highcharts from 'highcharts';
import wordcloud from 'highcharts/modules/wordcloud';
wordcloud(Highcharts);

export class WordcloudChart extends AbstractChart {
  constructor(private mapper: MapperService) {
    super();
  }

  private readonly EXCLUDE = ['the', 'and', 'for', 'you', 'your', 'mix', 'remix', 'remaster', 'remastered', 'version', 'edition', 'feat', '-'];

  toolbar?: HTMLElement;
  stats?: TempStats;
  types: ItemType[] = ['artist', 'album', 'track'];

  options: Highcharts.Options = {
    chart: {
      events: {
        render: event => {
          if (!this.toolbar) {
            this.toolbar = document.getElementById('toggleable-scrobbles-toolbar')!.cloneNode(true) as HTMLElement;

            const toggles = this.toolbar.querySelectorAll('.toggle') as NodeListOf<HTMLButtonElement>;
            const toggleTypes: ItemType[] = ['artist', 'album', 'track']

            toggles.forEach(button => {
              button.classList.add('mat-primary');
              return button.onclick = () => {
                button.classList.toggle('mat-primary');
                this.changeTypes(toggleTypes.filter((type, index) => toggles[index].classList.contains('mat-primary')))
              };
            });
            const chart = event.target as any as Highcharts.Chart;
            chart.container.parentNode!.appendChild(this.toolbar);
          }
        }
      }
    },
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
    this.stats = stats;

    const words: {[key: string]: number} = {};
    this.types.flatMap(type => Object.values(this.mapper.seen(type, this.stats!))
      .map(item => this.mapper.shortName(type, item)))
      .flatMap(name => name.split(' '))
      .map(w => w.toLowerCase().replace(/[^\p{Letter}\p{Nd}]/gu, ''))
      .filter(w => w.length > 2)
      .forEach(w => words[w] = (words[w] || 0) + 1);

    const data = Object.keys(words)
      .filter(k => this.EXCLUDE.indexOf(k) < 0)
      .sort((a, b) => words[b] - words[a])
      .slice(0, 100);

    const amounts = data.map(a => words[a]);
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    const gap = max - min;
    const serie = data.map(k => {

      // create range from .25 to 1
      const percentage = (words[k] - min) / gap;
      return {
        weight: percentage + (1 - percentage) / 4,
        name: k,
        y: words[k]
      };
    });

    this.chart.series[0].setData(serie);
  }

  changeTypes(types: ItemType[]) {
    this.types = types;
    this.update(this.stats!);
  }
}
