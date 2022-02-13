import { OnInit, Directive } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { TempStats, Streak, StreakStack, StreakItem, Month } from '../model';
import { SettingsService } from '../service/settings.service';
import { StatsBuilderService } from '../service/stats-builder.service';
import { UrlBuilder } from '../util/url-builder';

export interface Top10Item {
  name: string;
  amount: number;
  description?: string;
  date?: Date;
  url?: string;
}

@UntilDestroy()
@Directive()
export abstract class AbstractListsComponent<S> implements OnInit {
  stats = new BehaviorSubject<S>(this.emptyStats());
  username = '';

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
              buildUrl?: (T: any) => string,
              buildDate?: (T: any) => Date,
  ): Top10Item[] {
    const keys: [string, number][] = Object.keys(countMap).map(k => [k, getValue(getItem(k))]);
    keys.sort((a, b) => b[1] - a[1]);
    return keys.splice(0, this.listSize).map(([k, val]) => {
      const item = getItem(k);
      return {
        amount: val,
        name: buildName(item, val),
        description: buildDescription(item, val),
        url: buildUrl ? buildUrl(item) : undefined,
        date: buildDate ? buildDate(item) : undefined,
      };
    });
  }

  getStreakTop10(streaks: Streak[], buildName: (s: Streak) => string, buildUrl?: (item: Streak) => string): Top10Item[] {
    const keys = Object.keys(streaks);
    keys.sort((a, b) => streaks[+b].length! - streaks[+a].length!);
    return keys.splice(0, this.listSize).map(k => {
      const streak = streaks[+k];
      const start = streak.start.date;
      const end = streak.end.date;
      return {
        amount: streak.length!,
        name: buildName(streak),
        description: start.toLocaleDateString() + ' - ' + (streak.ongoing ? '?' : end.toLocaleDateString()),
        url: buildUrl ? buildUrl(streak) : undefined,
        date: new Date( start.getTime() + (end.getTime() - start.getTime()) / 2),
      };
    });
  }

  protected get listSize(): number {
    return this.settings.listSize.value;
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
    const seen = Object.values(seenThingies).filter(a => a.scrobbles.length >= threshold);
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
        .map(a => this.ongoingStreak(between, a)),
      s => `${toString(s)} (${s.length} days)`,
      url
    );
    return [betweenResult, ongoingResult];
  }

  protected ongoingStreak(stack: StreakStack, a: Streak): Streak {
    stack.calcLength(a);
    a.ongoing = true;
    return a;
  }

  protected consecutiveStreak(stats: TempStats, stack: StreakStack, toString: (s: Streak) => string): Top10Item[] {
    const endDate = stats.last?.date || new Date();
    const streak = this.currentStreak(stack, endDate);
    return this.getStreakTop10(streak, toString, s => UrlBuilder.range(this.username, s.start.date, s.end.date));
  }

  protected currentStreak(stack: StreakStack, endDate: Date): Streak[] {
    const current = stack.current;
    if (current && current.length! > 1) {
      const currentStreak = this.ongoingStreak(stack, {start: current.start, end: {artist: '?', album: '?', track: '?', date: endDate}, length: current.length});
      return [...stack.streaks, currentStreak];
    } else {
      return stack.streaks;
    }
  }

  public getRankings<T extends StreakItem>(
    countMap: { [p: string]: T },
    monthList: Month[],
    url: (item: T, month: string) => string,
  )
  : { climbers: Top10Item[]; fallers: Top10Item[] } {
    const climbers: Top10Item[] = [];
    const fallers: Top10Item[] = [];
    Object.values(countMap).filter(c => c.ranks.length > 1).forEach(item => {
      item.ranks.forEach((rank, idx) => {
        const diff = item.ranks[idx + 1] - rank;
        if (diff < 0) {
          this.addGap(climbers, Math.abs(diff), item, idx, monthList, url);
        } else if (diff > 0) {
          this.addGap(fallers, diff, item, idx, monthList, url);
        }
      });
    });
    return { fallers: fallers.splice(0, this.listSize), climbers: climbers.splice(0, this.listSize) };
  }

  private addGap<T extends StreakItem>(gaps: Top10Item[], diff: number, item: T, monthIdx: number, monthList: Month[], url: (item: T, month: string) => string): void {
    let i = 0;
    while (gaps[i]?.amount > diff && i < 10) {
      i++;
    }
    if (i >= 10) {
      return;
    }

    const month = monthList.find(m => m.index === monthIdx)!;
    gaps.splice(i, 0, {
      name: `${item.name} (${diff} places)`,
      amount: Math.abs(diff),
      description: month.alias,
      date: month.date,
      url: url(item, month.alias)
    } as Top10Item);
  }
}
