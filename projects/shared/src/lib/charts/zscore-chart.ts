import { PointOptionsObject } from 'highcharts';
import { TempStats } from '../app/model';
import { ToggleableChart } from './toggleable-chart';
import { TranslatePipe } from '../service/translate.pipe';
import { AbstractUrlService } from '../service/abstract-url.service';
import { ZScoreService } from '../service/zscore.service';

export class ZScoreChart extends ToggleableChart {
  constructor(
    private translate: TranslatePipe,
    url: AbstractUrlService,
    private zscoreService: ZScoreService
  ) {
    super();
    this.options = {
      chart: {events: this.events},
      plotOptions: this.plotOptions,
      title: {text: 'Most statistically unlikely per month'},
      subtitle: {text: `(≥1 ${translate.transform('translate.scrobbles')}/month avg)`}, //suitable for default artist display
      legend: {enabled: false},
      tooltip: {
        useHTML: true,
        formatter(): string {
          const point = (this as any).point;
          const z = point.z;
          const plays = point.plays;
          const mean = point.mean;
          const std = point.std;
          const month = point.month;
          const displayName = point.name;
          return `
            <div style="display:flex;align-items:center;gap:10px;">
              <div>
                <strong>${month}</strong><br/>
                Most unusual: <b>${displayName}</b><br/>
                Z-score: <b>${z.toFixed(2)}</b><br/>
                ${translate.capFirst('translate.scrobbles')}: <b>${plays}</b><br/>
                Average: <b>${mean.toFixed(2)}</b><br/>
                Std Dev: <b>${std.toFixed(2)}</b>
              </div>
            </div>
          `;
        }
      },
      yAxis: {
        title: {
          text: 'Z-Score'
        },
      },
      xAxis: {visible: false},
      series: [{
        name: 'Z-Score',
        type: 'column',
        data: [],
        groupPadding: 0,
        pointPadding: 0,
        events: {
          click: event => this.openUrl(url.month((event.point as any).month))
        }
      }],
      responsive: this.responsive()
    };
  }

  update(stats: TempStats): void {
    super.update(stats);

    // Update subtitle based on current type threshold
    const threshold = this.getMinAverageThreshold();
    const subtitleText = `(≥${threshold} ${this.translate.transform('translate.scrobbles')}/month avg)`;
    this.chart?.update({
      subtitle: { text: subtitleText }
    } as any, false);

    const points: PointOptionsObject[] = [];
    const colorMap: { [key: string]: string } = {};
    const colors = this.getColors();

    // Compute z-scores for all months
    const zscoreMap = this.zscoreService.compute(stats, this.type);

    // Get minimum average threshold for current type
    const minAverage = this.getMinAverageThreshold();

    // For each month, find the entry with highest z-score
    for (const month of Object.values(stats.monthList)) {
      const entries = zscoreMap.get(month.alias);
      if (entries && entries.length > 0) {
        // Filter entries by minimum average threshold
        const filteredEntries = entries.filter(entry => entry.mean >= minAverage);

        if (filteredEntries.length > 0) {
          // Find entry with highest z-score
          const maxEntry = filteredEntries.reduce((a, b) => a.z > b.z ? a : b);

          if (maxEntry.z > 0) {
            // Assign consistent color per item
            if (!colorMap[maxEntry.name]) {
              colorMap[maxEntry.name] = colors[Object.keys(colorMap).length % colors.length];
            }

            points.push({
              name: maxEntry.name,
              month: month.alias,
              color: colorMap[maxEntry.name],
              y: maxEntry.z,
              z: maxEntry.z,
              plays: maxEntry.plays,
              mean: maxEntry.mean,
              std: maxEntry.std
            } as PointOptionsObject);
          }
        }
      }
    }

    this.setData(points);
  }

  private getMinAverageThreshold(): number {
    switch (this.type) {
      case 'artist':
        return 1.0;
      case 'album':
        return 0.5;
      case 'track':
        return 0.2;
    }
  }
}
