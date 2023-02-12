import { Injectable } from '@angular/core';
import { Subject, combineLatest, scan, Observable, switchMap, map, merge, shareReplay, filter, take } from 'rxjs';
import { TempStats, Scrobble, StreakStack, ScrobbleStreakStack, Constants, StreakItem, Track, Album, MonthItem, ItemStreakStack } from 'projects/shared/src/lib/app/model';
import { SettingsService, Settings } from 'projects/shared/src/lib/service/settings.service';
import { MapperService } from './mapper.service';
import { ScrobbleStore } from './scrobble.store';

@Injectable()
export class StatsBuilderService {
  tempStats: Observable<TempStats>;
  rebuild = new Subject<void>();

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
    for (const scrobble of this.filterWith(scrobbles, settings)) {
      if (scrobble.date.getFullYear() === 1970) {
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
        date: scrobble.date
      };
    }

    const monthArtist = month.artists.get(scrobble.artist);
    const newArtist = next.seenArtists[scrobble.artist] ? undefined : scrobble;
    const newAlbumItem = this.newMonthItem(next, scrobble, scrobble.album, newArtist);
    const newTrackItem = this.newMonthItem(next, scrobble, scrobble.track, newArtist);
    if (!monthArtist) {
      month.artists.set(scrobble.artist, {
        name: scrobble.artist,
        new: newArtist,
        count: 1,
        albums: {[scrobble.album]: newAlbumItem},
        tracks: {[scrobble.track]: newTrackItem}
      });
    } else {
      monthArtist.count++;
      if (!monthArtist.albums[scrobble.album]) {
        monthArtist.albums[scrobble.album] = newAlbumItem;
      } else {
        monthArtist.albums[scrobble.album].count++;
      }
      if (!monthArtist.tracks[scrobble.track]) {
        monthArtist.tracks[scrobble.track] = newTrackItem;
      } else {
        monthArtist.tracks[scrobble.track].count++;
      }
    }
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

  private newMonthItem(next: TempStats, scrobble: Scrobble, name: string, newArtist?: Scrobble): MonthItem {
    const newItem = !newArtist && next.seenArtists[scrobble.artist].tracks.indexOf(name) >= 0 ? undefined : scrobble;
    return {
      name: scrobble.artist + ' - ' + name,
      new: newItem,
      count: 1
    };
  }

  private handleArtist(next: TempStats, scrobble: Scrobble, weekYear: string): void {
    const seen = next.seenArtists;
    const seenArtist = seen[scrobble.artist];
    if (seenArtist) {
      this.handleStreakItem(seenArtist, next.betweenArtists, scrobble, weekYear);
      if (seenArtist.tracks.indexOf(scrobble.track) < 0) {
        seenArtist.tracks.push(scrobble.track);
        this.uniqueTrackAdded(next, scrobble);
      }
    } else {
      seen[scrobble.artist] = {
        weeks: [weekYear],
        name: scrobble.artist,
        betweenStreak: {start: scrobble, end: scrobble},
        avgScrobble: scrobble.date.getTime(),
        scrobbles: [scrobble.date.getTime()],
        tracks: [scrobble.track],
        ranks: []
      };

      this.uniqueTrackAdded(next, scrobble);
    }
  }

  private handleAlbum(next: TempStats, scrobble: Scrobble, weekYear: string): void {
    if (scrobble.album) {
      this.handleItem(next.seenAlbums, next.betweenAlbums, scrobble.album, scrobble, weekYear);
    }
  }

  private handleTrack(next: TempStats, scrobble: Scrobble, weekYear: string): Track {
    return this.handleItem(next.seenTracks, next.betweenTracks, scrobble.track, scrobble, weekYear);
  }

  private handleItem<T extends Track | Album>(seen: { [key: string]: T }, between: StreakStack, item: string, scrobble: Scrobble, weekYear: string): T {
    const fullName = scrobble.artist + ' - ' + item;
    const seenTrack = seen[fullName];
    if (seenTrack) {
      return this.handleStreakItem(seenTrack, between, scrobble, weekYear);
    } else {
      const result: Track | Album = {
        artist: scrobble.artist,
        shortName: item,
        name: fullName,
        weeks: [weekYear],
        betweenStreak: {start: scrobble, end: scrobble},
        avgScrobble: scrobble.date.getTime(),
        scrobbles: [scrobble.date.getTime()],
        ranks: []
      };
      seen[fullName] = result as T;
      return result as T;
    }
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
      scrobbleStreak: new ScrobbleStreakStack(),
      artistStreak: new ItemStreakStack((a, b) => a.artist === b.artist),
      trackStreak: new ItemStreakStack((a, b) => a.track === b.track && a.artist === b.artist),
      albumStreak: new ItemStreakStack((a, b) => a.album === b.album && a.artist === b.artist),
      notListenedStreak: new StreakStack(),
      betweenArtists: new StreakStack(),
      betweenAlbums: new StreakStack(),
      betweenTracks: new StreakStack(),
      seenArtists: {},
      seenAlbums: {},
      seenTracks: {},
      scrobbleMilestones: [],
      scrobbleCount: 0,
      trackMilestones: [],
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
