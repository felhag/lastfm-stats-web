import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

import { CircleProgressOptions } from 'ng-circle-progress/lib/ng-circle-progress.component';
import { DataSetEntry, StreakStack } from '../../model';
import { StatsBuilderService } from '../../service/stats-builder.service';

import { UsernameService } from '../../service/username.service';
import { Mapper } from '../../util/mapper';

import * as Highcharts from 'highcharts';
import annotations from 'highcharts/modules/annotations';
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
  url?: string;

  constructor(@Inject(MAT_DIALOG_DATA) public data: DataSetEntry,
              private stats: StatsBuilderService,
              private username: UsernameService) { }

  ngOnInit(): void {
    this.options = [
      this.circleOption('Scrobbles', this.data.scrobbles),
      this.data.tracks ? this.circleOption('Tracks', this.data.tracks) : undefined,
      this.circleOption('Weeks', this.data.item.weeks.length),
    ];

    this.url = Mapper.url(this.data.type, this.username.username!, this.data.item);

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
        color: 'var(--primaryColor)',
        data
      }],
      responsive: {
        rules: [{
          condition: { minWidth: 769 },
          chartOptions: {
            annotations: [
              this.annotationOptions(first, data[first]!, 'First scrobble: ' + this.first.toLocaleString(), 'right'),
              this.annotationOptions(last, data[last]!, 'Last scrobble: ' + this.last.toLocaleString(), 'left'),
              this.mostScrobbledDayAnnotation(data),
            ],}
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

  private mostScrobbledDayAnnotation(data: any[]): Highcharts.AnnotationsOptions {
    const days = this.data.item.scrobbles.reduce(function (rv, x) {
      const key = String(StreakStack.startOfDay(new Date(x)).getTime());
      rv[key] = (rv[key] || 0) + 1;
      return rv;
    }, {} as { [key: string]: number })
    const max = Object.keys(days).reduce((a, b) => days[parseInt(a)] > days[parseInt(b)] ? a : b);
    const day = new Date(parseInt(max));
    const most = Object.keys(this.stats.tempStats.value.monthList).indexOf(Mapper.getMonthYear(day));
    return this.annotationOptions(most, data[most], `Most scrobbled day: ${day.toLocaleDateString()} (${days[max]} scrobbles)`, 'left');
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
