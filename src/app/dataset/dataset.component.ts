import { Component, OnInit, ViewChild } from '@angular/core';
import { MatSort } from '@angular/material/sort';
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

  @ViewChild(MatSort, { static: true }) sort!: MatSort;

  constructor(private builder: StatsBuilderService) {
  }

  ngOnInit(): void {
    this.height = window.innerHeight - 32;
    this.builder.tempStats.pipe(untilDestroyed(this)).subscribe(stats => this.update(stats));
    this.filter.pipe(
      untilDestroyed(this),
      debounceTime(200)
    ).subscribe(f => this.dataSource.filter = f);

    this.dataSource.filterPredicate = ((track, f) => [track.artist, track.shortName, track.scrobbles.length]
      .join(' ')
      .toLowerCase()
      .indexOf(f.toLowerCase()) >= 0);
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (track, id): string => {
      // @ts-ignore
      const value = track[id];
      if (['artist', 'name'].indexOf(id) >= 0) {
        return value.toLocaleLowerCase();
      } else if (id === 'scrobbles') {
        return value.length;
      } else {
        console.error('cannot find ', id);
        return '';
      }
    };
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
