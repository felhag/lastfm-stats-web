import { Component, OnInit } from '@angular/core';
import { untilDestroyed, UntilDestroy } from '@ngneat/until-destroy';
import { TableVirtualScrollDataSource } from 'ng-table-virtual-scroll';
import { Subject, debounceTime } from 'rxjs';
import { TempStats, Track } from '../model';
import { StatsBuilderService } from '../service/stats-builder.service';

@UntilDestroy()
@Component({
  selector: 'app-dataset',
  templateUrl: './dataset.component.html',
  styleUrls: ['./dataset.component.scss']
})
export class DatasetComponent implements OnInit {
  height!: number;
  columns: string[] = ['artist', 'name', 'scrobbles'];
  dataSource = new TableVirtualScrollDataSource<Track>();
  filter = new Subject<string>();

  constructor(private builder: StatsBuilderService) {
  }

  ngOnInit(): void {
    this.height = window.innerHeight - 32;
    this.builder.tempStats.pipe(untilDestroyed(this)).subscribe(stats => this.update(stats));
    this.filter.pipe(
      untilDestroyed(this),
      debounceTime(200)
    ).subscribe(f => this.dataSource.filter = f);

    this.dataSource.filterPredicate = ((obj, f) => [obj.artist, obj.shortName, obj.scrobbles.length].join(' ').toLowerCase().indexOf(f.toLowerCase()) >= 0);
  }

  private update(tempStats: TempStats) {
    this.dataSource.data = Object.values(tempStats.seenTracks).sort((a, b) => {
      if (a.artist === b.artist) {
        return a.name > b.name ? 1 : -1;
      }
      return a.artist > b.artist ? 1 : -1;
    });
  }
}
