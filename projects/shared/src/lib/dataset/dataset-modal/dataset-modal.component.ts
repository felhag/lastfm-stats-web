import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

import * as Highcharts from 'highcharts';
import 'highcharts/modules/annotations';

import { DataSetEntry, StreakStack, Month } from 'projects/shared/src/lib/app/model';
import { TranslatePipe } from 'projects/shared/src/lib/service/translate.pipe';

import { MapperService } from '../../service/mapper.service';
import { HighchartsChartModule } from 'highcharts-angular';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CircleProgressOptions, NgCircleProgressModule } from 'ng-circle-progress';

import { MatIconModule } from '@angular/material/icon';

interface DatasetModalData {
  entry: DataSetEntry;
  months: { [key: string]: Month };
}

@Component({
    selector: 'app-dataset-modal',
    templateUrl: './dataset-modal.component.html',
    styleUrls: ['./dataset-modal.component.scss'],
    providers: [TranslatePipe],
    imports: [
        HighchartsChartModule,
        MatCheckboxModule,
        MatDialogModule,
        MatIconModule,
        MatTooltipModule,
        NgCircleProgressModule
    ]
})
export class DatasetModalComponent implements OnInit {
  Highcharts: typeof Highcharts = Highcharts;
  options: (Partial<CircleProgressOptions> | undefined)[] = [];
  chartOptions: Highcharts.Options = {};
  url?: string;
  chart?: Highcharts.Chart;

  constructor(@Inject(MAT_DIALOG_DATA) public data: DatasetModalData,
              private translate: TranslatePipe,
              private mapper: MapperService) { }

  ngOnInit(): void {
    const scrobblesTitle = this.translate.capFirst('translate.scrobbles');
    const months = this.data.months;
    const highestMonthly = Math.min(
      ...Object.values(months)
        .map(m => this.mapper
          .monthItems(this.entry.type, m)
          .sort((a, b) => a.count > b.count ? -1 : 1)
          .findIndex(m => m.name === this.data.entry.item.name) + 1)
        .filter(idx => idx > 0)
    )
    const ranks = [];
    for (let i = 0; i < this.entry.item.ranks.length; i++) {
      ranks[i] = this.entry.item.ranks[i] || null;
    }

    this.options = [
      this.circleOption(scrobblesTitle, this.entry.scrobbles),
      this.entry.tracks ? this.circleOption('Tracks', this.entry.tracks) : undefined,
      this.circleOption('Weeks', this.entry.item.weeks.length),
      this.circleOption('Highest rank', Math.min(...ranks.filter(r => r).map(r => r!))),
      this.circleOption('Highest monthly', highestMonthly)
    ];

    this.url = this.mapper.url(this.entry.type, this.entry.item);

    const scrobbles = this.mapper.cumulativeMonths(this.entry.type, Object.values(months), this.entry.item);
    const first = ranks.findIndex(p => p !== null);
    const last = Object.keys(months).indexOf(this.mapper.getMonthYear(this.last));

    this.chartOptions = {
      title: {
        text: ''
      },
      xAxis: {
        type: 'category',
        allowDecimals: false,
        categories: Object.values(months).map(m => m.alias),
        crosshair: true
      },
      yAxis: [{
        type: 'logarithmic',
        min: 1,
        reversed: true,
        startOnTick: true,
        allowDecimals: false,
        gridLineWidth: 0,
        title: { text: 'Rank' }
      }, {
        opposite: true,
        title: { text: scrobblesTitle }
      }],
      legend: { enabled: false },
      tooltip: {
        shared: true,
        formatter(event): string {
          const series = event.chart.series;
          const x = (this as any).point.x;
          const scrobbles = series[1].data[x].y;
          const ranks = series[0].data.map(x => x.y as number);
          const prevRank = ranks[Math.max(x - 1, 0)];
          const currRank = ranks[x];
          const diff = currRank - prevRank;
          const arrow = diff === 0 ?
            '<span style="font-weight: bold; color: gray; margin: 0 4px;">=</span>' :
            `<span style="font-weight: bold; transform: rotate(${diff > 0 ? 135 : 45}deg); color: ${diff > 0 ? 'red' : 'green'}; margin: 0 4px;">↑</span>`;
          const rank = currRank ? `<div style="display: inline-flex;">Rank: ${arrow}<strong>${currRank}</strong></div>` : '';
          return `<strong>${this.key}</strong><br>Scrobbles: <strong>${scrobbles}</strong><br>${rank}`;
        },
        useHTML: true
      },
      series: [{
        name: 'Rank',
        type: 'line',
        color: 'var(--primaryColor)',
        data: ranks
      }, {
        name: scrobblesTitle,
        type: 'line',
        yAxis: 1,
        color: 'var(--primaryColorContrast)',
        data: scrobbles
      }],
      responsive: {
        rules: [{
          condition: { minWidth: 769 },
          chartOptions: {
            annotations: [
              this.annotationOptions(first, scrobbles[first]!, `First ${this.translate.transform('translate.scrobble')}: ${this.first.toLocaleString()}`, 'right'),
              this.annotationOptions(last, scrobbles[last]!, `Last ${this.translate.transform('translate.scrobble')}: ${this.last.toLocaleString()}`, 'left'),
              this.mostScrobbledDayAnnotation(scrobbles),
            ]
          }
        }]
      }
    }
  }

  private circleOption(title: string, value: number): Partial<CircleProgressOptions> {
    return {
      subtitle: title,
      titleFormat: (p: number) => Math.round((value / 100) * p)
    };
  }

  private mostScrobbledDayAnnotation(scrobbles: number[]): Highcharts.AnnotationsOptions {
    const days = this.entry.item.scrobbles.reduce(function (rv, x) {
      const key = String(StreakStack.startOfDay(new Date(x)).getTime());
      rv[key] = (rv[key] || 0) + 1;
      return rv;
    }, {} as { [key: string]: number })
    const max = Object.keys(days).reduce((a, b) => days[parseInt(a)] > days[parseInt(b)] ? a : b);
    const day = new Date(parseInt(max));
    const most = Object.keys(this.data.months).indexOf(this.mapper.getMonthYear(day));
    return this.annotationOptions(most, scrobbles[most], `Most ${this.translate.transform('translate.scrobbled')} day: ${day.toLocaleDateString()} (${days[max]} ${this.translate.transform('translate.scrobbles')})`, 'left');
  }

  private annotationOptions(x: number, y: number, text: string, align: Highcharts.AlignValue): Highcharts.AnnotationsOptions {
    return {
      draggable: '',
      labels: [{
        allowOverlap: true,
        align,
        verticalAlign: align === 'left' ? 'bottom' : 'top',
        style: { pointerEvents: 'none' },
        point: {
          x, y,
          xAxis: 0,
          yAxis: 1
        },
        text,
      }]
    }
  }

  private get first(): Date {
    return new Date(this.entry.item.scrobbles[0]);
  }

  private get last(): Date {
    return new Date(this.entry.item.scrobbles[this.entry.item.scrobbles.length - 1]);
  }

  get entry() {
    return this.data.entry;
  }

  showLabels(checked: boolean): void {
    this.chartOptions.responsive?.rules![0].chartOptions!.annotations!.forEach(a => a.visible = checked)
    this.chart?.update(this.chartOptions);
  }
}
