import { Component, OnInit, ViewChild } from '@angular/core';
import { MatRadioChange } from '@angular/material/radio';
import { MatSort } from '@angular/material/sort';
import { untilDestroyed, UntilDestroy } from '@ngneat/until-destroy';
import { TableVirtualScrollDataSource } from 'ng-table-virtual-scroll';
import { Subject, debounceTime } from 'rxjs';
import { StreakItem, Album, Track, Artist } from '../model';
import { StatsBuilderService } from '../service/stats-builder.service';

interface DataSetEntry {
  artist: string;
  name: string;
  tracks: number;
  scrobbles: number;
  rank: number;
}

@UntilDestroy()
@Component({
  selector: 'app-dataset',
  templateUrl: './dataset.component.html',
  styleUrls: ['./dataset.component.scss']
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
  groupedBy: 'artist' | 'album' | 'track' = 'artist';
  height!: number;
  dataSource = new TableVirtualScrollDataSource<DataSetEntry>();
  filter = new Subject<string>();

  @ViewChild(MatSort, { static: true }) sort!: MatSort;

  constructor(private builder: StatsBuilderService) {
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

  private update() {
    this.dataSource.data = Object.values(this.groupedByObj.data()).map(d => {
      const albumOrTrack = 'shortName' in d;
      return {
        artist: albumOrTrack ? (d as Album | Track).artist : undefined,
        name: albumOrTrack ? (d as Album | Track).shortName : d.name,
        tracks: albumOrTrack ? undefined : (d as Artist).tracks.length,
        scrobbles: d.scrobbles.length,
        rank: d.ranks[d.ranks.length - 1]
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
}
