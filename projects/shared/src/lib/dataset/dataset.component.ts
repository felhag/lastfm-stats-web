import { Component, DestroyRef, inject, OnInit, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatRadioButton, MatRadioChange, MatRadioGroup } from '@angular/material/radio';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { BehaviorSubject, combineLatest, debounceTime } from 'rxjs';
import { startWith } from 'rxjs/operators';
import { TableVirtualScrollDataSource, TableVirtualScrollModule } from 'ng-table-virtual-scroll';
import { Album, Artist, DataSetEntry, ItemType, Month, StreakItem, TempStats, Track } from 'projects/shared/src/lib/app/model';
import { DatasetModalComponent } from 'projects/shared/src/lib/dataset/dataset-modal/dataset-modal.component';
import { StatsBuilderService } from 'projects/shared/src/lib/service/stats-builder.service';
import { TranslatePipe } from 'projects/shared/src/lib/service/translate.pipe';
import { MatCell, MatCellDef, MatColumnDef, MatHeaderCell, MatHeaderCellDef, MatHeaderRow, MatHeaderRowDef, MatRow, MatRowDef, MatTable } from '@angular/material/table';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { AsyncPipe, TitleCasePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatInput, MatLabel, MatSuffix } from '@angular/material/input';
import { MatFormField } from '@angular/material/form-field';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from "@angular/material/tooltip";
import { ExportService } from "../service/export-service";

export type DataSetKeys = (keyof DataSetEntry)[]

@Component({
  selector: 'app-dataset',
  templateUrl: './dataset.component.html',
  styleUrls: ['./dataset.component.scss'],
  providers: [TranslatePipe],
  imports: [
    AsyncPipe,
    CdkVirtualScrollViewport,
    MatCard,
    MatCardContent,
    MatCell,
    MatCellDef,
    MatColumnDef,
    MatFormField,
    MatHeaderCell,
    MatHeaderCellDef,
    MatHeaderRow,
    MatHeaderRowDef,
    MatIcon,
    MatIconButton,
    MatInput,
    MatLabel,
    MatRadioButton,
    MatRadioGroup,
    MatRow,
    MatRowDef,
    MatSort,
    MatSortHeader,
    MatSuffix,
    MatTable,
    MatTooltip,
    ReactiveFormsModule,
    TableVirtualScrollModule,
    TitleCasePipe,
  ]
})
export class DatasetComponent implements OnInit {
  private readonly groups = {
    artist: {
      columns: ['name', 'tracks', 'scrobbles', 'rank'] as DataSetKeys,
      data: (stats: TempStats) => stats.seenArtists
    },
    album: {
      columns: ['artist', 'name', 'scrobbles', 'rank'] as DataSetKeys,
      data: (stats: TempStats) => stats.seenAlbums
    },
    track: {
      columns: ['artist', 'name', 'scrobbles', 'rank'] as DataSetKeys,
      data: (stats: TempStats) => stats.seenTracks
    },
  };
  groupedBy = new BehaviorSubject<ItemType>('artist');
  height!: number;
  dataSource = new TableVirtualScrollDataSource<DataSetEntry>();
  months: { [p: string]: Month } = {};

  filterArtist = new FormControl<string>('');
  filterName = new FormControl<string>('');

  @ViewChild(MatSort, {static: true}) sort!: MatSort;
  private destroyRef = inject(DestroyRef);

  constructor(private builder: StatsBuilderService,
              private dialog: MatDialog,
              private translate: TranslatePipe,
              private exportService: ExportService) {
  }

  ngOnInit(): void {
    this.height = window.innerHeight - 32;
    combineLatest([this.builder.tempStats, this.groupedBy]).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(([stats]) => this.update(stats));
    combineLatest([
      this.filterArtist.valueChanges.pipe(startWith('')),
      this.filterName.valueChanges.pipe(startWith('')),
    ]).pipe(
      debounceTime(200),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(f => this.dataSource.filter = f.join());

    // @ts-ignore
    this.dataSource.filterPredicate = (obj =>
      this.filterValue(this.filterArtist.value, this.groupedBy.value === 'artist' ? obj.name : obj.artist) &&
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

  private update(tempStats: TempStats): void {
    const data = Object.values(this.groupedByObj.data(tempStats));
    const ranks = [...data].sort((a, b) => b.scrobbles.length - a.scrobbles.length);
    this.dataSource.data = data.map(item => {
      const albumOrTrack = 'shortName' in item;
      return {
        item,
        type: this.groupedBy.value,
        artist: this.getArtistName(item),
        name: albumOrTrack ? (item as Album | Track).shortName : item.name,
        tracks: albumOrTrack ? undefined : (item as Artist).tracks.length,
        scrobbles: item.scrobbles.length,
        rank: ranks.indexOf(item) + 1
      } as DataSetEntry
    });
    this.months = tempStats.monthList;
  }

  groupBy(change: MatRadioChange): void {
    this.groupedBy.next(change.value);
    this.filterName.setValue('');
  }

  get columns(): DataSetKeys {
    return this.groupedByObj.columns;
  }

  get groupedByObj(): { columns: DataSetKeys, data: (stats: TempStats) => { [key: string]: StreakItem } } {
    return this.groups[this.groupedBy.value];
  }

  open(entry: DataSetEntry): void {
    const width = window.innerWidth;
    const minWidth = width > 1200 ? 1000 : width - 48;
    const data = {entry, months: this.months};
    this.dialog.open(DatasetModalComponent, {minWidth, data});
  }

  getHeader(col: string) {
    if (col === 'name') {
      return this.groupedBy.value;
    } else if (col === 'scrobbles') {
      return this.translate.transform('translate.scrobbles');
    } else {
      return col;
    }
  }

  download() {
    this.exportService.exportCSV(
      this.columns.map(col => col[0].toUpperCase() + col.substring(1)),
      this.dataSource.filteredData.map(entry => this.columns.map(col => String(entry[col]))),
      `lastfmstats-${this.groupedBy.value}s-export.csv`
    )
  }

  private getArtistName(item: StreakItem) {
    if ((item as Track).artist) {
      return (item as Track).artist;
    } else if ((item as Album).artists) {
      const artists = (item as Album).artists;
      return artists.length > 1 ? `Various artists (${artists.length})` : artists[0];
    } else {
      return undefined;
    }
  }
}
