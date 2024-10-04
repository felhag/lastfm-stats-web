import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ScrobbleStore } from '../service/scrobble.store';
import { AsyncPipe, DatePipe, DecimalPipe, JsonPipe } from '@angular/common';
import { TranslatePipe } from '../service/translate.pipe';
import { filter, map, Observable } from 'rxjs';
import { Constants, TempStats, User } from '../app/model';
import { StatsBuilderService } from '../service/stats-builder.service';
import { EddingtonUtil } from '../service/eddington.util';
import { MapperService } from '../service/mapper.service';
import { MatCard, MatCardContent } from '@angular/material/card';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-general',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    DecimalPipe,
    JsonPipe,
    MatCard,
    MatCardContent,
    TranslatePipe
  ],
  templateUrl: './general.component.html',
  styleUrl: './general.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GeneralComponent {
  readonly user$: Observable<User | undefined>;
  readonly days$: Observable<number>;
  readonly tempStats$: Observable<TempStats>;
  readonly count: (seen: {}) => number = seen => Object.keys(seen).length;

  constructor(public scrobbles: ScrobbleStore,
              private mapper: MapperService,
              stats: StatsBuilderService) {
    this.days$ = scrobbles.first.pipe(
      takeUntilDestroyed(),
      filter(f => !!f),
      map(f => Math.ceil((new Date().getTime() - f.date.getTime()) / Constants.DAY))
    );
    this.user$ = scrobbles.user;
    this.tempStats$ = stats.tempStats;
  }

  everyYearArtist(stats: TempStats) {
    stats.years;
  }

  oneHitWonders(stats: TempStats) {
    return Object.values(stats.seenArtists).filter(a => a.tracks.length === 1).length;
  }

  tracksWithoutAlbum(stats: TempStats) {
    return Object.values(stats.monthList)
      .map(m => m.count - this.mapper.monthItems('album', m).reduce((a,b) => a + b.count, 0))
      .reduce((a,b) => a + b, 0);
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

  max(counts: {[key: number]: number}): number {
    const keys = Object.keys(counts);
    return keys.length ? keys.reduce((a: any, b: any) => counts[a] > counts[b] ? a : b) as any as number : 0;
  }

  min(counts: {[key: number]: number}): number {
    const keys = Object.keys(counts);
    return keys.length ? keys.reduce((a: any, b: any) => counts[a] < counts[b] ? a : b) as any as number : 0;
  }
}
