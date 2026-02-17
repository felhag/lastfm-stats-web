import { Injectable } from '@angular/core';
import { combineLatest, filter, map, merge, Observable, scan, shareReplay, Subject, switchMap, take } from 'rxjs';
import {
  AlbumStreakStack,
  Constants,
  ItemStreakStack,
  MonthItem,
  Scrobble,
  ScrobbleStreakStack,
  StreakItem,
  StreakStack,
  TempStats,
  Track
} from 'projects/shared/src/lib/app/model';
import { Settings, SettingsService } from 'projects/shared/src/lib/service/settings.service';
import { MapperService } from './mapper.service';
import { ScrobbleStore } from './scrobble.store';
import { normalizeName } from './normalize-name';

@Injectable()
export class StatsBuilderService {
  tempStats: Observable<TempStats>;
  rebuild = new Subject<void>();
  private normalize: (name: string) => string = (n) => n;

  constructor(private settings: SettingsService,
              private mapper: MapperService,
              private scrobbles: ScrobbleStore) {
    const settings$ = this.settings.state$;
    const completed = combineLatest([
      this.scrobbles.state$.pipe(filter(s => s.state === 'COMPLETED')),
      settings$.pipe(filter(settings => !settings.autoUpdate))
    ]);
    const rebuild = merge(this.rebuild, completed, settings$).pipe(
      switchMap(() => combineLatest([
        this.scrobbles.scrobbles.pipe(take(1)),
        settings$
      ])),
      map(([scrobbles, settings]) => this.update(scrobbles, settings, this.emptyStats()))
    );
    const chunk = combineLatest([
      this.scrobbles.chunk,
      settings$.pipe(take(1))
    ]).pipe(
      filter(([, settings]) => settings.autoUpdate),
      scan((acc, [[scrobbles, cumulative], settings]) => this.update(scrobbles, settings, cumulative ? acc : this.emptyStats()), this.emptyStats()),
    );
    this.tempStats = merge(rebuild, chunk).pipe(shareReplay(1));

    // TODO: If no scrobbles need to be loaded the tempStats subscriptions are registered after emitting data
    this.tempStats.pipe(take(1)).subscribe(/* force execution of tempstats observable... */);
  }

  update(scrobbles: Scrobble[], settings: Settings, next: TempStats): TempStats {
    this.normalize = settings.filterRemasters ? normalizeName : (n) => n;
    for (const scrobble of this.filterWith(scrobbles, settings)) {
      const year = scrobble.date.getFullYear();
      if (year === 1970) {
        continue;
      }

      const monthYear = this.mapper.getMonthYear(scrobble.date);
      const weekYear = this.mapper.getWeekYear(scrobble.date);
      const sod = StreakStack.startOfDay(scrobble.date);
      const dayOfYear = sod.getTime();

      next.scrobbleCount++;
      next.hours[scrobble.date.getHours()]++;
      next.months[scrobble.date.getMonth()]++;
      next.days[scrobble.date.getDay()]++;
      next.specificWeeks[weekYear] = (next.specificWeeks[weekYear] || 0) + 1;

      if (!next.years[year]) {
        next.years[year] = 0;
      }
      next.years[year]++;

      this.handleMonth(next, monthYear, scrobble);
      this.handleArtist(next, scrobble, weekYear);
      this.handleAlbum(next, scrobble, weekYear);
      const track = this.handleTrack(next, scrobble, weekYear);

      if (!next.specificDays[dayOfYear]) {
        next.specificDays[dayOfYear] = [] as Track[];
      }
      next.specificDays[dayOfYear].push(track);

      next.trackStreak.push(scrobble);
      next.artistStreak.push(scrobble);
      next.albumStreak.push(scrobble);

      next.scrobbleStreak.push(scrobble);
      const lastDate = next.last ? StreakStack.startOfDay(next.last.date) : undefined;
      if (lastDate && sod.getTime() - lastDate.getTime() > Constants.DAY) {
        next.notListenedStreak.add({start: next.last!, end: scrobble});
      }

      if (next.scrobbleCount % 1000 === 0) {
        next.scrobbleMilestones.push(scrobble);
      }
      if (!next.first) {
        next.first = scrobble;
      }
      next.last = scrobble;
    }
    return next;
  }

  private handleMonth(next: TempStats, monthYear: string, scrobble: Scrobble): void {
    let month = next.monthList[monthYear];
    if (!month) {
      this.finishMonth(next);
      month = next.monthList[monthYear] = {
        alias: this.monthYearDisplay(scrobble.date),
        artists: new Map(),
        albums: new Map(),
        tracks: new Map(),
        date: scrobble.date,
        count: 0
      };
    }
    month.count++;

    this.handleMonthItem(scrobble, month.artists, next.seenArtists, scrobble.artist);
    if (scrobble.album) {
      const fullName = scrobble.artist + ' - ' + this.normalize(scrobble.album);
      const key = scrobble.albumId || fullName;
      this.handleMonthItem(scrobble, month.albums, next.seenAlbums, fullName, key);
    }
    this.handleMonthItem(scrobble, month.tracks, next.seenTracks, scrobble.artist + ' - ' + this.normalize(scrobble.track));
  }

  private finishMonth(next: TempStats) {
    const prev = next.last ? next.monthList[this.mapper.getMonthYear(next.last.date)] : undefined;
    if (prev) {
      const handled = Object.keys(next.monthList).length - 1;
      this.populateRank(next.seenArtists, handled);
      this.populateRank(next.seenAlbums, handled);
      this.populateRank(next.seenTracks, handled);
    }
  }

  private handleMonthItem(scrobble: Scrobble, map: Map<string, MonthItem>, seen: { [key: string]: StreakItem }, name: string, key: string = name) {
    const monthItem = map.get(key);
    if (!monthItem) {
      map.set(key, {
        name,
        new: seen[key] ? undefined : scrobble,
        count: 1,
      });
    } else {
      monthItem.count++;
    }
  }

  private handleArtist(next: TempStats, scrobble: Scrobble, weekYear: string): void {
    const seen = next.seenArtists;
    const seenArtist = seen[scrobble.artist];
    if (seenArtist) {
      this.handleStreakItem(seenArtist, next.betweenArtists, scrobble, weekYear);
      if (seenArtist.tracks.indexOf(this.normalize(scrobble.track)) < 0) {
        seenArtist.tracks.push(this.normalize(scrobble.track));
        this.uniqueTrackAdded(next, scrobble);
      }
    } else {
      seen[scrobble.artist] = {
        weeks: [weekYear],
        name: scrobble.artist,
        betweenStreak: {start: scrobble, end: scrobble},
        avgScrobble: scrobble.date.getTime(),
        scrobbles: [scrobble.date.getTime()],
        tracks: [this.normalize(scrobble.track)],
        ranks: []
      };

      this.uniqueTrackAdded(next, scrobble);
    }
  }

  private handleAlbum(next: TempStats, scrobble: Scrobble, weekYear: string): void {
    if (scrobble.album) {
      const fullName = scrobble.artist + ' - ' + this.normalize(scrobble.album);
      const id = scrobble.albumId || fullName;
      const seenItem = next.seenAlbums[id];
      if (seenItem) {
        const handled = this.handleStreakItem(seenItem, next.betweenAlbums, scrobble, weekYear);
        if (!handled.artists.includes(scrobble.artist)) {
          handled.artists.push(scrobble.artist);
          if (handled.artists.length === 2) {
            handled.name = handled.name.replace(handled.artists[0] + ' - ', 'Various artists - ');
          }
        }
      } else {
        next.seenAlbums[id] = {
          ...this.createStreakItem(fullName, weekYear, scrobble),
          id,
          artists: [scrobble.artist],
          shortName: this.normalize(scrobble.album),
        };
        next.albumCount++;
        if (next.albumCount % 1000 === 0) {
          next.albumMilestones.push(scrobble);
        }
      }
    }
  }

  private handleTrack(next: TempStats, scrobble: Scrobble, weekYear: string): Track {
    const fullName = scrobble.artist + ' - ' + this.normalize(scrobble.track);
    const seenItem = next.seenTracks[fullName];
    if (seenItem) {
      const handled = this.handleStreakItem(seenItem, next.betweenTracks, scrobble, weekYear);
      handled.withAlbum = handled.withAlbum + (scrobble.album ? 1 : 0);
      return handled;
    } else {
      const result: Track = {
        ...this.createStreakItem(fullName, weekYear, scrobble),
        artist: scrobble.artist,
        shortName: this.normalize(scrobble.track),
        withAlbum: scrobble.album ? 1 : 0
      };
      next.seenTracks[fullName] = result;
      return result;
    }
  }

  private createStreakItem(name: string, weekYear: string, scrobble: Scrobble): StreakItem {
    return {
      name,
      weeks: [weekYear],
      betweenStreak: {start: scrobble, end: scrobble},
      avgScrobble: scrobble.date.getTime(),
      scrobbles: [scrobble.date.getTime()],
      ranks: []
    };
  }

  private handleStreakItem<T extends StreakItem>(seen: T, stack: StreakStack, scrobble: Scrobble, weekYear: string): T {
    seen.betweenStreak.end = scrobble;
    stack.add(seen.betweenStreak);
    seen.betweenStreak = {start: scrobble, end: scrobble};
    seen.avgScrobble = ((seen.avgScrobble * seen.scrobbles.length) + scrobble.date.getTime()) / (seen.scrobbles.length + 1);
    seen.scrobbles.push(scrobble.date.getTime());
    if (seen.weeks.indexOf(weekYear) < 0) {
      seen.weeks.push(weekYear);
    }
    return seen;
  }

  private uniqueTrackAdded(next: TempStats, scrobble: Scrobble): void {
    next.trackCount++;
    if (next.trackCount % 1000 === 0) {
      next.trackMilestones.push(scrobble);
    }
  }

  private monthYearDisplay(date: Date): string {
    return Constants.MONTHS[date.getMonth()] + ' ' + date.getFullYear();
  }

  private emptyStats(): TempStats {
    return {
      monthList: {},
      specificDays: {},
      specificWeeks: {},
      days: this.scrobbleCountObject(7),
      hours: this.scrobbleCountObject(24),
      months: this.scrobbleCountObject(12),
      years: {},
      scrobbleStreak: new ScrobbleStreakStack(),
      artistStreak: new ItemStreakStack((a, b) => a.artist === b.artist),
      trackStreak: new ItemStreakStack((a, b) => this.normalize(a.track) === this.normalize(b.track) && a.artist === b.artist),
      albumStreak: new AlbumStreakStack(),
      notListenedStreak: new StreakStack(),
      betweenArtists: new StreakStack(),
      betweenAlbums: new StreakStack(),
      betweenTracks: new StreakStack(),
      seenArtists: {},
      seenAlbums: {},
      seenTracks: {},
      scrobbleMilestones: [],
      scrobbleCount: 0,
      albumMilestones: [],
      trackMilestones: [],
      albumCount: 0,
      trackCount: 0,
    };
  }

  private scrobbleCountObject(keys: number): { [p: string]: any } {
    return Object.fromEntries([...Array(keys).keys()].map(k => [k, 0] ));
  }

  private filterWith(scrobbles: Scrobble[], settings: Settings): Scrobble[] {
    const start = settings.dateRangeStart;
    const end = settings.dateRangeEnd;
    return scrobbles.filter(s => {
      if ((start && s.date < start) || (end && s.date > end)) {
        return false;
      }
      if (settings.artists.length) {
        const contains = settings.artists.indexOf(s.artist) >= 0;
        return contains === settings.artistsInclude;
      }
      return true;
    });
  }

  private populateRank(data: { [p: string]: StreakItem }, handled: number) {
    Object.values(data)
      .sort((a, b) => b.scrobbles.length - a.scrobbles.length)
      .forEach((artist, idx) => artist.ranks[handled] = idx + 1);
  }
}
