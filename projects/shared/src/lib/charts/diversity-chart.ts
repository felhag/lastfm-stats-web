import { TempStats } from 'projects/shared/src/lib/app/model';
import { ToggleableChart } from 'projects/shared/src/lib/charts/toggleable-chart';
import { MapperService } from '../service/mapper.service';

export class DiversityChart extends ToggleableChart {
  constructor(private mapper: MapperService) {
    super();
    this.options = {
      chart: {
        zooming: { type: 'x' },
        events: this.events
      },
      plotOptions: this.plotOptions,
      title: {text: 'Listening diversity'},
      legend: {enabled: false},
      subtitle: {text: ''},
      xAxis: {type: 'category'},
      yAxis: [{
        min: 0,
        max: 100,
        tickInterval: 20,
        title: {text: ''},
        labels: {format: '{value}%'}
      }, {
        min: 0,
        opposite: true,
        allowDecimals: false,
        title: {text: ''}
      }],
      tooltip: {
        shared: true,
        valueDecimals: 1
      },
      series: [{
        name: '',
        type: 'line',
        marker: {enabled: false, symbol: 'circle'},
        tooltip: {valueSuffix: '%'},
        data: []
      }, {
        name: '',
        type: 'line',
        yAxis: 1,
        marker: {enabled: false, symbol: 'circle'},
        data: []
      }],
      responsive: this.responsive(['left', 'right'])
    };
  }

  update(stats: TempStats): void {
    super.update(stats);
    if (!this.chart) {
      return;
    }

    const months = Object.values(stats.monthList);
    const topShare: number[] = [];
    const effective: number[] = [];
    for (const month of months) {
      const counts = this.mapper.monthItems(this.type, month).map(i => i.count).sort((a, b) => b - a);
      const total = counts.reduce((sum, c) => sum + c, 0);
      if (!total) {
        topShare.push(null as any);
        effective.push(null as any);
        continue;
      }

      let top = 0;
      let ent = 0;
      counts.forEach((count, idx) => {
        if (idx < 5) {
          top += count;
        }
        const p = count / total;
        ent -= p * Math.log(p);
      });
      topShare.push(top / total * 100);
      effective.push(Math.exp(ent));
    }

    const noun = this.type + 's';
    this.chart.update({
      subtitle: {text: `Variety score: the number of equally played ${noun} with the same variety`},
      xAxis: {categories: months.map(m => m.alias)},
      yAxis: [{title: {text: `Top 5 share`}}, {title: {text: 'Variety score'}}],
      series: [
        {type: 'line', name: `Top 5 ${noun} share`},
        {type: 'line', name: 'Variety score'}
      ]
    }, false);
    this.chart.series[0].setData(topShare, false);
    this.chart.series[1].setData(effective, false);
    this.chart.redraw();
  }

  protected load(container: HTMLElement) {
    super.load(container);
    this.update(this.stats!);
  }
}
