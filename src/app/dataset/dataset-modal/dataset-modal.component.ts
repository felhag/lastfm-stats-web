import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

import { CircleProgressOptions } from 'ng-circle-progress/lib/ng-circle-progress.component';
import { DataSetEntry } from '../../model';

@Component({
  selector: 'app-dataset-modal',
  templateUrl: './dataset-modal.component.html',
  styleUrls: ['./dataset-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DatasetModalComponent implements OnInit {
  options: Partial<CircleProgressOptions>[] = [];

  constructor(@Inject(MAT_DIALOG_DATA) public data: DataSetEntry) { }

  ngOnInit(): void {
    this.options = [
      this.circleOption('Scrobbles', this.data.scrobbles),
      this.circleOption('Tracks', this.data.tracks),
      this.circleOption('Weeks', this.data.item.weeks.length),
    ];
  }

  private circleOption(title: string, value: number): Partial<CircleProgressOptions> {
    return {
      subtitle: title,
      maxPercent: value,
      titleFormat: (p: number) => Math.round((value / 100) * p)
    };
  }

  get first(): Date {
    return new Date(this.data.item.scrobbles[0]);
  }

  get last(): Date {
    return new Date(this.data.item.scrobbles[this.data.item.scrobbles.length - 1]);
  }
}
