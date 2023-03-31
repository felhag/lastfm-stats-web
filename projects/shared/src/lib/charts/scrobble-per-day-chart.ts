import { TempStats, Constants } from 'projects/shared/src/lib/app/model';
import { AbstractChart } from 'projects/shared/src/lib/charts/abstract-chart';
import { TranslatePipe } from 'projects/shared/src/lib/service/translate.pipe';

export class ScrobblePerDayChart extends AbstractChart {
  constructor(translate: TranslatePipe) {
    super();
    this.options = {
      title: {text: translate.capFirst('translate.scrobble') + ' count per day'},
      legend: {enabled: false},
      yAxis: [{
        allowDecimals: false,
        title: {
          text: 'Amount of days'
        },
      }, {
        opposite: true,
        allowDecimals: false,
        title: {
          text: 'Days ' + translate.transform('translate.scrobbled'),
        }
      }],
      xAxis: {
        title: {
          text: translate.capFirst('translate.scrobbles')
        },
      },
      series: [{
        name: translate.capFirst('translate.scrobbles'),
        type: 'column',
        data: [],
        groupPadding: 0,
        pointPadding: 0,
        tooltip: {
          headerFormat: '',
          pointFormatter(): string {
            return `<b>${this.y}</b> day${this.y === 1 ? '' : 's'} with <b>${this.name}</b> ${translate.transform('translate.scrobble')}${this.name === '1' ? '' : 's'}.`;
          }
        }
      }, {
        type: 'scatter',
        data: [],
        yAxis: 1,
        marker: {
          radius: 4
        },
        dataLabels: {
          enabled: true,
          format: '{point.name}',
          style: {
            color: this.textColor,
            textOutline: 0
          } as any
        },
        tooltip: {
          useHTML: true,
          headerFormat: '',
          pointFormat: `{point.name}<br>Average ${translate.capFirst('translate.scrobbles')} per day: <b>{point.avg}</b><br>Days ${translate.capFirst('translate.scrobbled')}:<b style="text-align: right;">{point.y}</b>`
        } as any
      }],
      responsive: this.responsive(['left', 'right'])
    };
  }

  update(stats: TempStats): void {
    if (!stats.first) {
      return;
    }

    const counts: {[key: number]: number} = {};
    const years: {[key: number]: [number, number]} = {};
    Object.entries(stats.specificDays).forEach(([day, tracks]) => {
      const count = tracks.length;
      if (!counts[count]) {
        counts[count] = 1;
      } else {
        counts[count]++;
      }

      const year = new Date(parseInt(day)).getFullYear();
      if (!years[year]) {
        years[year] = [count, 1];
      } else {
        years[year] = [years[year][0] + count, years[year][1] + 1];
      }
    });

    const sorted = Object.keys(counts).map(c => parseInt(c)).sort((a, b) => a - b);
    const yearData = Object.entries(years).map(([year, count]) => {
      const days = this.getDaysOfYear(parseInt(year), stats.first!.date, stats.last!.date!);
      const avg = Math.floor(count[0] / days);
      const output = sorted.reduce((prev, curr) => Math.abs(curr - avg) < Math.abs(prev - avg) ? curr : prev);
      return {
        x: sorted.indexOf(output),
        y: count[1],
        name: year,
        avg: Math.round(avg)
      };
    });

    this.updateChart({xAxis: {categories: sorted}} as any);
    this.setData(Object.entries(counts), yearData);
  }

  private getDaysOfYear(year: number, first: Date, last: Date): number {
    const start = year === first.getFullYear() ?
      new Date(year, first.getMonth(), first.getDate(), 0, 0, 0) :
      new Date(year, 0, 0);
    const end = year === last.getFullYear() ?
      new Date(year, last.getMonth(), last.getDate(), 23, 59, 59) :
      new Date(year, 11, 31, 23, 59, 59);

    return Math.ceil((end.getTime() - start.getTime()) / Constants.DAY);
  }
}
