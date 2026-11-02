import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, map, merge, Observable, scan, shareReplay, Subject, withLatestFrom } from 'rxjs';
import {
  AlbumStreakStack,
  Constants,
  hasDate,
  ItemStreakStack,
  MonthItem,
  Scrobble,
  scrobbleCount,
  ScrobbleStreakStack,
  SessionStack,
  StreakItem,
  StreakStack,
  TempStats,
  Track
} from 'projects/shared/src/lib/app/model';
import { Settings, SettingsService } from 'projects/shared/src/lib/service/settings.service';
import { MapperService } from './mapper.service';
import { ScrobbleStore } from './scrobble.store';

/**
 * The values of seenArtists/seenAlbums/seenTracks in insertion order. Enumerating those objects is slow once
 * they hold tens of thousands of keys, and ranks need all of them at every month boundary.
 */
interface SeenLists {
  artists: StreakItem[];
  albums: StreakItem[];
  tracks: StreakItem[];
}

/** Either start over from every scrobble in the store or add a chunk of newly loaded ones to the accumulator. */
type BuildEvent =
  | { kind: 'rebuild' }
  | { kind: 'chunk', scrobbles: Scrobble[], cumulative: boolean };

@Injectable()
export class StatsBuilderService {
  private settings = inject(SettingsService);
  private mapper = inject(MapperService);
  private scrobbles = inject(ScrobbleStore);

  tempStats: Observable<TempStats>;
  rebuild = new Subject<void>();
  private seenLists = new WeakMap<TempStats, SeenLists>();

  constructor() {
    const settings$ = this.settings.state$;
    // Nothing was accumulated while auto update was off, so build everything once loading is done.
    const completed = this.scrobbles.loadingState.pipe(
      filter(state => state === 'COMPLETED'),
      withLatestFrom(settings$),
      filter(([, settings]) => !settings.autoUpdate)
    );
    const rebuild$ = merge(this.rebuild, settings$, completed).pipe(map((): BuildEvent => ({kind: 'rebuild'})));
    const chunk$ = this.scrobbles.chunk.pipe(map(([scrobbles, cumulative]): BuildEvent => ({kind: 'chunk', scrobbles, cumulative})));

    // A single accumulator for both modes: a rebuild replaces it, a chunk extends it. Settings are read when
    // the event is handled, so chunks arriving after a settings change build on the rebuilt stats with the
    // current settings instead of continuing an accumulator made with the old ones.
    this.tempStats = merge(rebuild$, chunk$).pipe(
      withLatestFrom(settings$, this.scrobbles.scrobbles),
      filter(([event, settings]) => event.kind === 'rebuild' || settings.autoUpdate),
      scan((acc, [event, settings, all]) => event.kind === 'rebuild'
        ? this.update(all, settings, this.emptyStats())
        : this.update(event.scrobbles, settings, event.cumulative ? acc : this.emptyStats()),
        this.emptyStats()),
      shareReplay(1)
    );

    // Chunks are emitted as pages arrive and shareReplay only keeps the latest result, so the pipeline has to
    // run from the start rather than from the moment the first tab subscribes.
    this.tempStats.pipe(takeUntilDestroyed()).subscribe();
  }

  update(scrobbles: Scrobble[], settings: Settings, next: TempStats): TempStats {
    for (const scrobble of this.filterWith(scrobbles, settings)) {
      if (scrobble.msPlayed) {
        next.playtime += scrobble.msPlayed;
      }
      if (!hasDate(scrobble)) {
        next.withoutDate++;
        this.handleUndated(next, scrobble);
        continue;
      }

      const year = scrobble.date.getFullYear();

      const monthYear = this.mapper.getMonthYear(scrobble.date);
      const weekYear = this.mapper.getWeekYear(scrobble.date);
      const sod = StreakStack.startOfDay(scrobble.date);
      const dayOfYear = sod.getTime();

      next.scrobbleCount++;
      next.hours[scrobble.date.getHours()]++;
      next.months[scrobble.date.getMonth()]++;
      next.days[(scrobble.date.getDay() + 6) % 7]++;
      next.specificWeeks[weekYear] = (next.specificWeeks[weekYear] || 0) + 1;

      if (!next.years[year]) {
        next.years[year] = 0;
      }
      next.years[year]++;
      if (scrobble.msPlayed) {
        next.playtimePerYear[year] = (next.playtimePerYear[year] || 0) + scrobble.msPlayed;
      }

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
      next.sessions.push(scrobble);
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
      const fullName = scrobble.artist + ' - ' + scrobble.album;
      const key = scrobble.albumId || fullName;
      this.handleMonthItem(scrobble, month.albums, next.seenAlbums, fullName, key);
    }
    this.handleMonthItem(scrobble, month.tracks, next.seenTracks, scrobble.artist + ' - ' + scrobble.track);
  }

  private finishMonth(next: TempStats) {
    const prev = next.last ? next.monthList[this.mapper.getMonthYear(next.last.date)] : undefined;
    if (prev) {
      const handled = Object.keys(next.monthList).length - 1;
      const lists = this.seen(next);
      this.populateRank(lists.artists, handled);
      this.populateRank(lists.albums, handled);
      this.populateRank(lists.tracks, handled);
    }
  }

  private handleMonthItem(scrobble: Scrobble, map: Map<string, MonthItem>, seen: { [key: string]: StreakItem }, name: string, key: string = name) {
    const monthItem = map.get(key);
    if (!monthItem) {
      map.set(key, {
        name,
        new: seen[key]?.scrobbles.length ? undefined : scrobble,
        count: 1,
      });
    } else {
      monthItem.count++;
    }
  }

  private handleUndated(next: TempStats, scrobble: Scrobble): void {
    this.handleArtist(next, scrobble);
    this.handleAlbum(next, scrobble);
    this.handleTrack(next, scrobble);
  }

  /** Without weekYear the scrobble has no date: it only counts towards the item, not its date based stats. */
  private handleArtist(next: TempStats, scrobble: Scrobble, weekYear?: string): void {
    let artist = next.seenArtists[scrobble.artist];
    if (!artist) {
      artist = next.seenArtists[scrobble.artist] = {
        ...this.createStreakItem(scrobble.artist),
        tracks: new Set(),
      };
      this.seen(next).artists.push(artist);
    }
    artist.tracks.add(scrobble.track);
    this.handleStreakItem(artist, next.betweenArtists, scrobble, weekYear);
  }

  private handleAlbum(next: TempStats, scrobble: Scrobble, weekYear?: string): void {
    if (scrobble.album) {
      const fullName = `${scrobble.artist} - ${scrobble.album}`;
      const id = scrobble.albumId || fullName;
      let album = next.seenAlbums[id];
      if (!album) {
        album = next.seenAlbums[id] = {
          ...this.createStreakItem(fullName),
          id,
          artists: [scrobble.artist],
          shortName: scrobble.album,
        };
        this.seen(next).albums.push(album);
      } else if (!album.artists.includes(scrobble.artist)) {
        album.artists.push(scrobble.artist);
        if (album.artists.length === 2) {
          album.name = album.name.replace(`${album.artists[0]} - `, 'Various artists - ');
        }
      }
      this.handleStreakItem(album, next.betweenAlbums, scrobble, weekYear);

      if (weekYear && album.scrobbles.length === 1) {
        next.albumCount++;
        if (next.albumCount % 1000 === 0) {
          next.albumMilestones.push(scrobble);
        }
      }
    }
  }

  private handleTrack(next: TempStats, scrobble: Scrobble, weekYear?: string): Track {
    const fullName = scrobble.artist + ' - ' + scrobble.track;
    let track = next.seenTracks[fullName];
    if (!track) {
      track = next.seenTracks[fullName] = {
        ...this.createStreakItem(fullName),
        artist: scrobble.artist,
        shortName: scrobble.track,
        withAlbum: 0
      };
      this.seen(next).tracks.push(track);
    }
    if (scrobble.album) {
      track.withAlbum++;
    }
    this.handleStreakItem(track, next.betweenTracks, scrobble, weekYear);

    if (weekYear && track.scrobbles.length === 1) {
      next.trackCount++;
      if (next.trackCount % 1000 === 0) {
        next.trackMilestones.push(scrobble);
      }
    }
    return track;
  }

  private seen(stats: TempStats): SeenLists {
    let lists = this.seenLists.get(stats);
    if (!lists) {
      lists = {artists: [], albums: [], tracks: []};
      this.seenLists.set(stats, lists);
    }
    return lists;
  }

  private createStreakItem(name: string): StreakItem {
    return {
      name,
      weeks: new Set(),
      avgScrobble: 0,
      scrobbles: [],
      undated: 0,
      ranks: []
    };
  }

  private handleStreakItem(seen: StreakItem, stack: StreakStack, scrobble: Scrobble, weekYear?: string): void {
    if (!weekYear) {
      seen.undated++;
      return;
    }
    if (seen.betweenStreak) {
      seen.betweenStreak.end = scrobble;
      stack.add(seen.betweenStreak);
    }
    seen.betweenStreak = {start: scrobble, end: scrobble};
    seen.avgScrobble = ((seen.avgScrobble * seen.scrobbles.length) + scrobble.date.getTime()) / (seen.scrobbles.length + 1);
    seen.scrobbles.push(scrobble.date.getTime());
    seen.weeks.add(weekYear);
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
      trackStreak: new ItemStreakStack((a, b) => a.track === b.track && a.artist === b.artist),
      albumStreak: new AlbumStreakStack(),
      notListenedStreak: new StreakStack(2),
      betweenArtists: new StreakStack(),
      betweenAlbums: new StreakStack(),
      betweenTracks: new StreakStack(),
      sessions: new SessionStack(),
      seenArtists: {},
      seenAlbums: {},
      seenTracks: {},
      scrobbleMilestones: [],
      scrobbleCount: 0,
      albumMilestones: [],
      trackMilestones: [],
      albumCount: 0,
      trackCount: 0,
      withoutDate: 0,
      playtime: 0,
      playtimePerYear: {},
    };
  }

  private scrobbleCountObject(keys: number): { [p: string]: any } {
    return Object.fromEntries([...Array(keys).keys()].map(k => [k, 0] ));
  }

  filterWith(scrobbles: Scrobble[], settings: Settings): Scrobble[] {
    const start = settings.dateRangeStart;
    const end = settings.dateRangeEnd;
    const hasDateFilter = start || end;
    const hasArtistFilter = settings.artists.length > 0;
    if (!hasDateFilter && !hasArtistFilter) {
      return scrobbles;
    }
    const artistSet = hasArtistFilter ? new Set(settings.artists) : undefined;
    return scrobbles.filter(s => {
      if (hasDateFilter && ((start && s.date < start) || (end && s.date > end))) {
        return false;
      }
      if (artistSet) {
        return artistSet.has(s.artist) === settings.artistsInclude;
      }
      return true;
    });
  }

  /**
   * Counting sort instead of Array.sort: this runs for every seen item at every month boundary, which
   * dominated large imports. Same result as a stable sort on count desc: ties keep insertion order.
   */
  private populateRank(items: StreakItem[], handled: number) {
    const counts = new Uint32Array(items.length);
    let max = 0;
    for (let i = 0; i < items.length; i++) {
      const count = counts[i] = scrobbleCount(items[i]);
      if (count > max) {
        max = count;
      }
    }
    // offsets[c] becomes the amount of items with a count higher than c
    const offsets = new Uint32Array(max + 2);
    for (let i = 0; i < counts.length; i++) {
      offsets[counts[i]]++;
    }
    let higher = 0;
    for (let c = max; c >= 0; c--) {
      const same = offsets[c];
      offsets[c] = higher;
      higher += same;
    }
    for (let i = 0; i < items.length; i++) {
      items[i].ranks[handled] = ++offsets[counts[i]];
    }
  }
}
