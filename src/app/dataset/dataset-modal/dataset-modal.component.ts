import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

import { CircleProgressOptions } from 'ng-circle-progress/lib/ng-circle-progress.component';
import { DataSetEntry, StreakStack } from '../../model';
import { StatsBuilderService } from '../../service/stats-builder.service';

import * as Highcharts from 'highcharts';
import annotations from 'highcharts/modules/annotations';
import { Mapper } from '../../util/mapper';
annotations(Highcharts);

@Component({
  selector: 'app-dataset-modal',
  templateUrl: './dataset-modal.component.html',
  styleUrls: ['./dataset-modal.component.scss']
})
export class DatasetModalComponent implements OnInit {
  Highcharts: typeof Highcharts = Highcharts;
  options: (Partial<CircleProgressOptions> | undefined)[] = [];
  chartOptions: Highcharts.Options = {};

  constructor(@Inject(MAT_DIALOG_DATA) public data: DataSetEntry, private stats: StatsBuilderService) { }

  ngOnInit(): void {
    this.options = [
      this.circleOption('Scrobbles', this.data.scrobbles),
      this.data.tracks ? this.circleOption('Tracks', this.data.tracks) : undefined,
      this.circleOption('Weeks', this.data.item.weeks.length),
    ];

    const data = [];
    for (let i = 0; i < this.data.item.ranks.length; i++) {
      data[i] = this.data.item.ranks[i] || null;
    }

    const months = this.stats.tempStats.value.monthList;
    const first = data.findIndex(p => p !== null);
    const last = Object.keys(months).indexOf(Mapper.getMonthYear(this.last));

    this.chartOptions = {
      title: {
        text: 'Rank',
      },
      xAxis: {
        type: 'category',
        allowDecimals: false,
        categories: Object.values(months).map(m => m.alias)
      },
      yAxis: {
        reversed: true
      },
      series: [{
        name: 'Rank',
        type: 'line',
        data
      }],
      annotations: [
        this.annotationOptions(first, data[first]!, 'First scrobble: ' + this.first.toLocaleString(), 'top'),
        this.annotationOptions(last, data[last]!, 'Last scrobble: ' + this.last.toLocaleString(), 'bottom'),
        this.mostScrobbledDayAnnotation(data),
      ]
    }
  }

  private circleOption(title: string, value: number): Partial<CircleProgressOptions> {
    return {
      subtitle: title,
      maxPercent: value,
      titleFormat: (p: number) => Math.round((value / 100) * p)
    };
  }

  private mostScrobbledDayAnnotation(data: any[]): Highcharts.AnnotationsOptions {
    const days = this.data.item.scrobbles.reduce(function (rv, x) {
      const key = String(StreakStack.startOfDay(new Date(x)).getTime());
      rv[key] = (rv[key] || 0) + 1;
      return rv;
    }, {} as { [key: string]: number })
    const max = Object.keys(days).reduce((a, b) => days[parseInt(a)] > days[parseInt(b)] ? a : b);
    const day = new Date(parseInt(max));
    const most = Object.keys(this.stats.tempStats.value.monthList).indexOf(Mapper.getMonthYear(day));
    return this.annotationOptions(most, data[most], `Most scrobbled day: ${day.toLocaleDateString()} (${days[max]} scrobbles)`, 'middle');
  }

  private annotationOptions(x: number, y: number, text: string, align: Highcharts.VerticalAlignValue): Highcharts.AnnotationsOptions {
    return {
      draggable: '',
      labelOptions: {
        verticalAlign: align,
        allowOverlap: true,
        shape: 'connector',
        borderColor: 'currentColor',
        style: {
          color: 'currentColor',
          pointerEvents: 'none'
        }
      },
      labels: [{
        point: {
          x, y,
          xAxis: 0,
          yAxis: 0
        },
        text
      }]
    }
  }

  private get first(): Date {
    return new Date(this.data.item.scrobbles[0]);
  }

  private get last(): Date {
    return new Date(this.data.item.scrobbles[this.data.item.scrobbles.length - 1]);
  }
}
