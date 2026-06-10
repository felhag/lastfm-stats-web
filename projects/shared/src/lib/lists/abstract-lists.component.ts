import { Directive, inject } from '@angular/core';
import { BehaviorSubject, debounceTime } from 'rxjs';
import { TempStats, Streak, StreakStack, StreakItem, MonthItem } from 'projects/shared/src/lib/app/model';
import { SettingsService, Settings } from 'projects/shared/src/lib/service/settings.service';
import { StatsBuilderService } from 'projects/shared/src/lib/service/stats-builder.service';
import { AbstractUrlService } from '../service/abstract-url.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export interface Top10Item {
  name: string;
  amount: number;
  description?: string;
  date?: Date;
  url?: string;
}

export class ListProvider {
  private sorted?: [string, number][];

  private constructor(
    private readonly entries: [string, number][],
    private readonly mapper: (key: string, value: number) => Top10Item,
  ) {
  }

  get count(): number {
    return this.entries.length;
  }

  slice(limit: number): Top10Item[] {
    this.sorted ??= [...this.entries].sort((a, b) => b[1] - a[1]);
    return this.sorted.slice(0, limit).map(([key, value]) => this.mapper(key, value));
  }

  static build(entries: [string, number][], mapper: (key: string, value: number) => Top10Item): ListProvider {
    return new ListProvider(entries, mapper);
  }

  static eager(items: Top10Item[]): ListProvider {
    return new ListProvider(items.map((item, index) => [String(index), item.amount]), key => items[+key]);
  }
}

@Directive()
export abstract class AbstractListsComponent<S> {
  private builder = inject(StatsBuilderService);
  private settings = inject(SettingsService);
  private urlService = inject(AbstractUrlService);

  stats = new BehaviorSubject<S>(this.emptyStats());
  settingsObj?: Settings;

  constructor() {
    this.settings.state$.pipe(takeUntilDestroyed()).subscribe(settings => this.settingsObj = settings);
    this.builder.tempStats.pipe(takeUntilDestroyed(), debounceTime(0)).subscribe(stats => this.update(stats));
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
              buildUrl?: (t: T) => string,
              buildDate?: (t: T) => Date,
              valueFilter?: (value: number) => boolean,
  ): ListProvider {
    let entries: [string, number][] = Object.keys(countMap).map(k => [k, getValue(getItem(k))]);
    if (valueFilter) {
      entries = entries.filter(([, value]) => valueFilter(value));
    }
    return ListProvider.build(entries, (k, val) => {
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

  getStreakTop10(streaks: Streak[], buildName: (s: Streak) => string, buildUrl?: (item: Streak) => string): ListProvider {
    const entries: [string, number][] = Object.keys(streaks).map(k => [k, streaks[+k].length!]);
    return ListProvider.build(entries, (k, length) => {
      const streak = streaks[+k];
      const start = streak.start.date;
      const end = streak.end.date;
      return {
        amount: length,
        name: buildName(streak),
        description: start.toLocaleDateString() + ' - ' + (streak.ongoing ? '?' : end.toLocaleDateString()),
        url: buildUrl ? buildUrl(streak) : undefined,
        date: new Date( start.getTime() + (end.getTime() - start.getTime()) / 2),
      };
    });
  }

  protected dateString(date: number): string {
    return new Date(date).toLocaleDateString();
  }

  protected abstract doUpdate(stats: TempStats, next: S): void;

  protected abstract emptyStats(): S;

  protected calculateGaps(stats: TempStats,
                          seen: StreakItem[],
                          between: StreakStack,
                          include: 'album' | 'track' | undefined,
                          url: (s: Streak) => string): [ListProvider, ListProvider] {
    const threshold = this.threshold;
    const seenSet = new Set(seen.map(a => a.name));
    const toString = (s: Streak) => s.start.artist + (include ? ' - ' + s.start[include] : '');
    const ba = between.streaks.filter(s => !threshold || seenSet.has(toString(s)));
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

  protected consecutiveStreak(stats: TempStats, stack: StreakStack, toString: (s: Streak) => string): ListProvider {
    const endDate = stats.last?.date || new Date();
    const streak = this.currentStreak(stack, endDate);
    return this.getStreakTop10(streak, toString, s => this.urlService.range(s.start.date, s.end.date));
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

  protected seenThreshold<T extends StreakItem>(seenThingies: { [key: string]: T }): T[] {
    const threshold = this.threshold;
    return Object.values(seenThingies).filter(a => a.scrobbles.length >= threshold);
  }

  protected forceThreshold<T extends StreakItem>(seen: T[]): T[] {
    return this.threshold > 0 ? seen : seen.filter(s => s.scrobbles.length >= this.forcedThreshold);
  }

  protected get threshold(): number {
    return this.settingsObj?.minScrobbles || 0;
  }

  protected abstract get forcedThreshold(): number;

  get minimumForcedThreshold(): number {
    return Math.max(this.threshold, this.forcedThreshold);
  }

  protected including(items: MonthItem[]): string {
    const sorted = [...items.values()].sort((a, b) => b!.count - a!.count);
    return 'Including ' + sorted.splice(0, 3).map(a => a.name).join(', ');
  }

  private countScrobblesUpTo(
    sortedTimestamps: number[],
    cutoff: number,
  ): number {
    let lo = 0;
    let hi = sortedTimestamps.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (sortedTimestamps[mid] <= cutoff) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    return lo;
  }

  private getEndOfMonth(dateInMonth: Date): number {
    const d = new Date(dateInMonth);
    const year = d.getFullYear();
    const month = d.getMonth();
    return new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
  }

  public getRankings<T extends StreakItem>(
    seen: T[],
    monthList: {alias: string, date: Date}[],
    url: (item: T, month: string) => string,
  ): { climbers: ListProvider; fallers: ListProvider } {
    // Collect lightweight descriptors only; building the name/url is deferred to the provider's
    // mapper so we only pay for the items actually rendered (top N inline, all in the dialog).
    const climbers: Gap<T>[] = [];
    const fallers: Gap<T>[] = [];
    seen.filter((c) => c.ranks.length > 1).forEach((item) => {
      item.ranks.forEach((rank, idx) => {
        const nextRank = item.ranks[idx + 1];
        if (nextRank === undefined) {
          return;
        }
        const diff = nextRank - rank;
        if (diff === 0) {
          return;
        }
        const cutoff = this.getEndOfMonth(monthList[idx + 1].date);
        const count = this.countScrobblesUpTo(item.scrobbles, cutoff);
        if (count >= this.minimumForcedThreshold) {
          (diff < 0 ? climbers : fallers).push({diff: Math.abs(diff), item, month: monthList[idx + 1]});
        }
      });
    });
    return {climbers: this.gapsProvider(climbers, url), fallers: this.gapsProvider(fallers, url)};
  }

  private gapsProvider<T extends StreakItem>(gaps: Gap<T>[], url: (item: T, month: string) => string): ListProvider {
    return ListProvider.build(gaps.map((g, i) => [String(i), g.diff]), key => {
      const {diff, item, month} = gaps[+key];
      return {
        name: `${item.name} (${diff} places)`,
        amount: diff,
        description: month.alias,
        date: month.date,
        url: url(item, month.alias)
      };
    });
  }
}

interface Gap<T> {
  diff: number;
  item: T;
  month: {alias: string, date: Date};
}
