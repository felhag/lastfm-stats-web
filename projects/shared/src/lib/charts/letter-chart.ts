import { TempStats } from 'projects/shared/src/lib/app/model';
import { ToggleableChart } from 'projects/shared/src/lib/charts/toggleable-chart';
import { TranslatePipe } from 'projects/shared/src/lib/service/translate.pipe';
import { MapperService } from '../service/mapper.service';

export class LetterChart extends ToggleableChart {
  constructor(translate: TranslatePipe, private mapper: MapperService) {
    super();
    this.options = {
      chart: {
        events: this.events
      },
      plotOptions: this.plotOptions,
      title: {text: `Starting letters`},
      legend: {enabled: false},
      xAxis: {type: 'category', labels: { rotation: 0 }},
      yAxis: {title: {text: null}},
      series: [{
        name: translate.capFirst('translate.scrobbles'),
        type: 'column',
        data: []
      }],
      tooltip: {
        format: '{key}: {y}'
      },
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
  }

  update(stats: TempStats): void {
    super.update(stats);
    if (!this.chart) {
      return;
    }

    const letters = Object.values(this.mapper.seen(this.type, stats))
      .map(a => this.mapper.shortName(this.type, a)[0].toLowerCase().charCodeAt(0))
      .reduce((acc: {[key: string]: number}, char) => {
      let key;
      if (char >= 97 && char <= 122) {
        key = String.fromCharCode(char);
      } else if (char >= 48 && char <= 57) {
        key = '0-9';
      } else {
        key = 'Other';
      }
      return (acc[key] = (acc[key] || 0) + 1, acc);
    }, {});

    const data = Object.entries(letters).sort((a, b) => a[0].localeCompare(b[0]));
    const idx = data.findIndex(([key]) => key === 'Other');
    data.splice(data.length, 0, data.splice(idx, 1)[0]);

    this.chart.series[0].remove(false);
    this.chart.addSeries({data, type: 'column'});
  }

  protected load(container: HTMLElement) {
    super.load(container);
    this.update(this.stats!);
  }
}
