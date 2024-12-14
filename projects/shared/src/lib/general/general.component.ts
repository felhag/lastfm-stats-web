import { ChangeDetectionStrategy, Component, TemplateRef, ViewChild } from '@angular/core';
import { ScrobbleStore } from '../service/scrobble.store';
import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
import { TranslatePipe } from '../service/translate.pipe';
import { filter, map, Observable } from 'rxjs';
import { Artist, Constants, TempStats, User } from '../app/model';
import { StatsBuilderService } from '../service/stats-builder.service';
import { EddingtonUtil } from '../service/eddington.util';
import { MapperService } from '../service/mapper.service';
import { MatCard, MatCardContent } from '@angular/material/card';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle
} from "@angular/material/dialog";
import { MatButton } from "@angular/material/button";
import { MatList, MatListItem } from "@angular/material/list";
import { MatIcon } from "@angular/material/icon";
import { MatChipListbox, MatChipOption } from "@angular/material/chips";
import { FilterByYearPipe } from "../pipe/filter-by-year.pipe";

@Component({
  selector: 'app-general',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    DecimalPipe,
    FilterByYearPipe,
    MatButton,
    MatCard,
    MatCardContent,
    MatChipListbox,
    MatChipOption,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
    MatIcon,
    MatList,
    MatListItem,
    TranslatePipe,
  ],
  templateUrl: './general.component.html',
  styleUrl: './general.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GeneralComponent {
  @ViewChild('everyYearArtists') everyYearArtistsDialog!: TemplateRef<Artist[]>;
  readonly values: (seen: { [key: string]: Artist }) => Artist[] = Object.values;
  readonly user$: Observable<User | undefined>;
  readonly days$: Observable<number>;
  readonly years$: Observable<[number, number, number, boolean][]>;
  readonly tempStats$: Observable<TempStats>;
  readonly count: (seen: {}) => number = seen => Object.keys(seen).length;

  constructor(public scrobbles: ScrobbleStore,
              private mapper: MapperService,
              private dialog: MatDialog,
              stats: StatsBuilderService) {
    this.days$ = scrobbles.first.pipe(
      takeUntilDestroyed(),
      filter(f => !!f),
      map(f => Math.ceil((new Date().getTime() - f.date.getTime()) / Constants.DAY))
    );
    this.user$ = scrobbles.user;
    this.tempStats$ = stats.tempStats;
    this.years$ = this.tempStats$.pipe(
      filter(stats => !!stats.first && !!stats.last),
      map(stats => {
        const first = stats.first!.date.getFullYear();
        return [...Array(stats.last!.date.getFullYear() - first + 1).keys()]
          .map(i => i + first)
          .map(year => [year, new Date(year, 0, 1).getTime(), new Date(year, 11, 31).getTime(), true]);
      })
    );
  }

  openEveryYearArist(stats: TempStats) {
    const data = {stats};
    this.dialog.open(this.everyYearArtistsDialog, {data});
  }

  oneHitWonders(stats: TempStats) {
    return Object.values(stats.seenArtists).filter(a => a.tracks.length === 1).length;
  }

  tracksWithoutAlbum(stats: TempStats) {
    return Object.values(stats.monthList)
      .map(m => m.count - this.mapper.monthItems('album', m).reduce((a, b) => a + b.count, 0))
      .reduce((a, b) => a + b, 0);
  }

  getEddington(stats: TempStats) {
    return EddingtonUtil.calcEddington(EddingtonUtil.counts(stats));
  }

  nextEddington(stats: TempStats) {
    const counts = EddingtonUtil.counts(stats);
    const eddington = EddingtonUtil.calcEddington(counts);
    return (counts[eddington] || 0) + 1;
  }

  mostPopularMonth(stats: TempStats) {
    return Object.values(stats.monthList).sort(((a, b) => b.count - a.count))[0];
  }

  max(counts: { [key: number]: number }): number {
    const keys = Object.keys(counts);
    return keys.length ? keys.reduce((a: any, b: any) => counts[a] > counts[b] ? a : b) as any as number : 0;
  }

  min(counts: { [key: number]: number }): number {
    const keys = Object.keys(counts);
    return keys.length ? keys.reduce((a: any, b: any) => counts[a] < counts[b] ? a : b) as any as number : 0;
  }

  protected readonly open = open;

  missing(artist: Artist, years: [number, number, number, boolean][]) {
    const deselected = years.filter(year => !year[3])
    if (!deselected.length) {
      return undefined;
    }
    return deselected
      .filter(year => !artist.scrobbles.some(s => s >= year[1] && s < year[2]))
      .map(year => year[0])
      .join(', ');
  }
}
