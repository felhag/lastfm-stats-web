import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatRadioChange } from '@angular/material/radio';
import { MatSort } from '@angular/material/sort';
import { untilDestroyed, UntilDestroy } from '@ngneat/until-destroy';
import { TableVirtualScrollDataSource } from 'ng-table-virtual-scroll';
import { TranslatePipe } from 'projects/shared/src/lib/service/translate.pipe';
import { Subject, debounceTime } from 'rxjs';
import { StreakItem, Album, Track, Artist, DataSetEntry, ItemType } from 'projects/shared/src/lib/app/model';
import { StatsBuilderService } from 'projects/shared/src/lib/service/stats-builder.service';
import { DatasetModalComponent } from 'projects/shared/src/lib/dataset/dataset-modal/dataset-modal.component';

@UntilDestroy()
@Component({
  selector: 'app-dataset',
  templateUrl: './dataset.component.html',
  styleUrls: ['./dataset.component.scss'],
  providers: [TranslatePipe]
})
export class DatasetComponent implements OnInit {
  private readonly groups = {
    artist: {
      columns: ['name', 'tracks', 'scrobbles', 'rank'],
      data: () => this.builder.tempStats.value.seenArtists
    },
    album: {
      columns: ['artist', 'name', 'scrobbles', 'rank'],
      data: () => this.builder.tempStats.value.seenAlbums
    },
    track: {
      columns: ['artist', 'name', 'scrobbles', 'rank'],
      data: () => this.builder.tempStats.value.seenTracks
    },
  };
  groupedBy: ItemType = 'artist';
  height!: number;
  dataSource = new TableVirtualScrollDataSource<DataSetEntry>();
  filter = new Subject<string>();

  @ViewChild(MatSort, { static: true }) sort!: MatSort;

  constructor(private builder: StatsBuilderService,
              private dialog: MatDialog,
              private translate: TranslatePipe) {
  }

  ngOnInit(): void {
    this.height = window.innerHeight - 32;
    this.builder.tempStats.pipe(untilDestroyed(this)).subscribe(() => this.update());
    this.filter.pipe(
      untilDestroyed(this),
      debounceTime(200)
    ).subscribe(f => this.dataSource.filter = f);

    // @ts-ignore
    this.dataSource.filterPredicate = ((obj, f) => this.columns.map(col => obj[col])
      .join(' ')
      .toLowerCase()
      .indexOf(f.toLowerCase()) >= 0);
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (track, id): string => {
      // @ts-ignore
      const value = track[id];
      if (['artist', 'name', 'shortName'].indexOf(id) >= 0) {
        return value.toLocaleLowerCase();
      } else {
        return value;
      }
    };
  }

  private update(): void {
    const data = this.groupedByObj.data();
    this.dataSource.data = Object.values(data).map(item => {
      const albumOrTrack = 'shortName' in item;
      return {
        item,
        type: this.groupedBy,
        artist: albumOrTrack ? (item as Album | Track).artist : undefined,
        name: albumOrTrack ? (item as Album | Track).shortName : item.name,
        tracks: albumOrTrack ? undefined : (item as Artist).tracks.length,
        scrobbles: item.scrobbles.length,
        rank: item.ranks[item.ranks.length - 1] || Object.keys(data).length
      } as DataSetEntry
    });
  }

  groupBy(change: MatRadioChange): void {
    this.groupedBy = change.value;
    this.update();
  }

  get columns(): string[] {
    return this.groupedByObj.columns;
  }

  get groupedByObj(): {columns: string[], data: () => { [key: string]: StreakItem }} {
    return this.groups[this.groupedBy];
  }

  open(data: DataSetEntry): void {
    const width = window.innerWidth;
    const minWidth = width > 1200 ? 1000 : width - 48;
    this.dialog.open(DatasetModalComponent, {minWidth, data});
  }

  getHeader(col: string) {
    if (col === 'name') {
      return this.groupedBy;
    } else if (col === 'scrobbles') {
      return this.translate.transform('translate.scrobbles');
    } else {
      return col;
    }
  }
}
