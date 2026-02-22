import { PointOptionsObject } from 'highcharts';
import { TempStats } from '../app/model';
import { ToggleableChart } from './toggleable-chart';
import { TranslatePipe } from '../service/translate.pipe';
import { AbstractUrlService } from '../service/abstract-url.service';
import { ZScoreService } from '../service/zscore.service';
import { MapperService } from '../service/mapper.service';

export class ZScoreChart extends ToggleableChart {
  constructor(
    private translate: TranslatePipe,
    url: AbstractUrlService,
    private mapper: MapperService,
    private zscoreService: ZScoreService
  ) {
    super();
    this.options = {
      chart: {events: this.events},
      plotOptions: this.plotOptions,
      title: {text: 'Most statistically unlikely per month'},
      subtitle: {text: ''},
      legend: {enabled: false},
      tooltip: {
        useHTML: true,
        formatter(): string {
          const point = (this as any).point;
          const z = point.z;
          const plays = point.plays;
          const mean = point.mean;
          const std = point.std;
          const artist = point.artist;
          const itemName = point.itemName;
          const [month] = point.name.split(/ - (.*)/s);
          // Display "artist - name" for albums/tracks, just name for artists
          const displayName = artist !== itemName ? `${artist} - ${itemName}` : artist;
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
          click: event => this.openUrl(url.month(event.point.name.substring(0, event.point.name.indexOf('-') - 1)))
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

    // Get months in chronological order
    const months = Object.values(stats.monthList).sort((a, b) =>
      a.date.getTime() - b.date.getTime()
    );

    // For each month, find the entry with highest z-score
    for (const month of months) {
      const year = month.date.getFullYear();
      const monthNum = month.date.getMonth() + 1;
      const yearMonth = `${year}-${String(monthNum).padStart(2, '0')}`;

      const entries = zscoreMap.get(yearMonth);
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
              name: month.alias + ' - ' + maxEntry.name,
              artist: maxEntry.artist,
              itemName: maxEntry.name,
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
