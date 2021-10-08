import {OnInit, Directive} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {UntilDestroy, untilDestroyed} from '@ngneat/until-destroy';
import {BehaviorSubject} from 'rxjs';
import {map} from 'rxjs/operators';
import {Constants, TempStats, Streak, StreakStack, StreakItem} from '../model';
import {SettingsService} from '../service/settings.service';
import {StatsBuilderService} from '../service/stats-builder.service';

export interface Top10Item {
  name: string;
  amount: number;
  description?: string;
  date?: string;
  url?: string;
}

@UntilDestroy()
@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class AbstractListsComponent<S> implements OnInit {
  stats = new BehaviorSubject<S>(this.emptyStats());
  username?: string;

  protected constructor(private builder: StatsBuilderService,
                        protected settings: SettingsService,
                        private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    this.route.parent!.paramMap.pipe(map(params => params.get('username'))).subscribe(name => this.username = name!);
    this.builder.tempStats.pipe(untilDestroyed(this)).subscribe(stats => this.update(stats));
  }

  private update(stats: TempStats): void {
    const next = this.emptyStats();
    this.doUpdate(stats, next);
    this.stats.next(next);
  }

  getTop10<T>(countMap: { [key: string]: any },
              getValue: (k: T) => number,
              getItem: (k: string) => T,
              buildName: (item: T, value: number) => string,
              buildDescription: (item: T, value: number) => string,
              buildUrl?: (item: any) => string
  ): Top10Item[] {
    const keys = Object.keys(countMap);
    keys.sort((a, b) => getValue(getItem(b)) - getValue(getItem(a)));
    return keys.splice(0, this.listSize).map(k => {
      const item = getItem(k);
      const val = getValue(item);
      return {
        amount: val,
        name: buildName(item, val),
        description: buildDescription(item, val),
        url: buildUrl ? buildUrl(item) : undefined
      };
    });
  }

  getStreakTop10(streaks: Streak[], buildName: (s: Streak) => string, buildUrl?: (item: Streak) => string): Top10Item[] {
    const keys = Object.keys(streaks);
    keys.sort((a, b) => streaks[+b].length! - streaks[+a].length!);
    return keys.splice(0, this.listSize).map(k => {
      const streak = streaks[+k];
      return {
        amount: streak.length!,
        name: buildName(streak),
        description: streak.start.date.toLocaleDateString() + ' - ' + (streak.ongoing ? '?' : streak.end.date.toLocaleDateString()),
        url: buildUrl ? buildUrl(streak) : undefined
      };
    });
  }

  protected get listSize(): number {
    return this.settings.listSize.value;
  }

  protected monthUrl(month: string, baseUrl?: string): string {
    const split = month.split(' ');
    const url = baseUrl || this.rootUrl;
    return `${url}?from=${split[1]}-${Constants.MONTHS.indexOf(split[0]) + 1}-01&rangetype=1month`;
  }

  protected get rootUrl(): string {
    return `https://www.last.fm/user/${this.username}/library`;
  }

  protected dateString(date: number): string {
    return new Date(date).toLocaleDateString();
  }

  protected abstract doUpdate(stats: TempStats, next: S): void;

  protected abstract emptyStats(): S;

  protected calculateGaps(stats: TempStats,
                          seenThingies: { [key: string]: StreakItem },
                          between: StreakStack,
                          include: 'album' | 'track' | undefined,
                          url: (s: Streak) => string): [Top10Item[], Top10Item[]] {
    const threshold = this.settings.minScrobbles.value || 0;
    const seen = Object.values(seenThingies).filter(a => a.scrobbleCount >= threshold);
    const seenStrings = seen.map(a => a.name);
    const toString = (s: Streak) => s.start.artist + (include ? ' - ' + s.start[include] : '');
    const ba = between.streaks.filter(s => !threshold || seenStrings.indexOf(toString(s)) >= 0);
    const endDate = stats.last?.date || new Date();
    const betweenResult = this.getStreakTop10(ba, s => `${toString(s)} (${s.length! - 1} days)`, url);
    const ongoingResult = this.getStreakTop10(
      seen
        .map(a => a.betweenStreak)
        .map(a => ({start: a.start, end: {
          artist: a.start.artist,
          album: include === 'album' ? a.start.album : '?',
          track: include === 'track' ? a.start.track : '?',
          date: endDate}}))
        .map(a => this.ongoingStreak(a)),
      s => `${s.start.artist} - ${s.start.track} (${s.length} days)`,
      url
    );
    return [betweenResult, ongoingResult];
  }

  protected ongoingStreak(a: Streak): Streak {
    StreakStack.calcLength(a);
    a.ongoing = true;
    return a;
  }
}
