import { Component, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatRadioChange } from '@angular/material/radio';
import { MatSort } from '@angular/material/sort';
import { untilDestroyed, UntilDestroy } from '@ngneat/until-destroy';
import { TableVirtualScrollDataSource } from 'ng-table-virtual-scroll';
import { StreakItem, Album, Track, Artist, DataSetEntry, ItemType, App } from 'projects/shared/src/lib/app/model';
import { DatasetModalComponent } from 'projects/shared/src/lib/dataset/dataset-modal/dataset-modal.component';
import { StatsBuilderService } from 'projects/shared/src/lib/service/stats-builder.service';
import { TranslatePipe } from 'projects/shared/src/lib/service/translate.pipe';
import { debounceTime, combineLatest } from 'rxjs';
import { startWith } from 'rxjs/operators';

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

  filterArtist = new FormControl<string>('');
  filterName = new FormControl<string>('');

  @ViewChild(MatSort, { static: true }) sort!: MatSort;

  constructor(private builder: StatsBuilderService,
              private dialog: MatDialog,
              private translate: TranslatePipe,
              private app: App) {
  }

  ngOnInit(): void {
    this.height = window.innerHeight - 32;
    this.builder.tempStats.pipe(untilDestroyed(this)).subscribe(() => this.update());
    combineLatest([
      this.filterArtist.valueChanges.pipe(startWith('')),
      this.filterName.valueChanges.pipe(startWith('')),
    ]).pipe(
      debounceTime(200),
      untilDestroyed(this)
    ).subscribe(f => this.dataSource.filter = f.join());

    // @ts-ignore
    this.dataSource.filterPredicate = (obj =>
      this.filterValue(this.filterArtist.value, this.groupedBy === 'artist' ? obj.name : obj.artist) &&
      this.filterValue(this.filterName.value, obj.name));
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

  private filterValue(search: string | null, value: string): boolean {
    return !search || value.toLowerCase().indexOf(search.toLowerCase()) >= 0;
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
    this.filterName.setValue('');
    this.update();
  }

  get columns(): string[] {
    return this.groupedByObj.columns;
  }

  get showAlbums(): boolean {
    return this.app === App.lastfm;
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
