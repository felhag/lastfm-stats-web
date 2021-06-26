import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {TempStats, Scrobble, StreakStack, Month, ScrobbleStreakStack, Constants, StreakItem, Streak} from '../model';
import {SettingsService} from './settings.service';

@Injectable({
  providedIn: 'root'
})
export class StatsBuilderService {
  tempStats = new BehaviorSubject<TempStats>(this.emptyStats());

  constructor(private settings: SettingsService) {
  }

  update(scrobbles: Scrobble[], cumulative: boolean): void {
    const next = cumulative ? this.tempStats.value : this.emptyStats();
    let changed = !cumulative;
    for (const scrobble of this.filter(scrobbles)) {
      if (scrobble.date.getFullYear() === 1970) {
        continue;
      }

      const monthYear = `${scrobble.date.getMonth()}-${scrobble.date.getFullYear()}`;
      const weekYear = `W${this.getWeekNumber(scrobble.date)} ${scrobble.date.getFullYear()}`;
      const sod = StreakStack.startOfDay(scrobble.date);
      const dayOfYear = sod.getTime();

      changed = true;
      next.scrobbleCount++;
      next.hours[scrobble.date.getHours()]++;
      next.months[scrobble.date.getMonth()]++;
      next.days[scrobble.date.getDay()]++;
      next.specificDays[dayOfYear] = (next.specificDays[dayOfYear] || 0) + 1;
      next.specificWeeks[weekYear] = (next.specificWeeks[weekYear] || 0) + 1;

      this.handleMonth(next, monthYear, scrobble);
      this.handleArtist(next, scrobble, weekYear);
      this.handleTrack(next, scrobble, weekYear);

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

    if (changed) {
      this.tempStats.next(next);
    }
  }

  private handleMonth(next: TempStats, monthYear: string, scrobble: Scrobble): void {
    let month = next.monthList[monthYear];
    if (!month) {
      month = next.monthList[monthYear] = {alias: this.monthYearDisplay(scrobble.date), artists: {}};
    }

    const monthArtist = month.artists[scrobble.artist];
    const newArtist = next.seenArtists[scrobble.artist] ? undefined : scrobble;
    const newTrack = !newArtist && next.seenArtists[scrobble.artist].tracks.indexOf(scrobble.track) >= 0 ? undefined : scrobble;
    const newTrackItem = {
      name: scrobble.artist + ' - ' + scrobble.track,
      new: newTrack,
      count: 1
    };
    if (!monthArtist) {
      month.artists[scrobble.artist] = {
        name: scrobble.artist,
        new: newArtist,
        count: 1,
        tracks: {[scrobble.track]: newTrackItem}
      };
    } else {
      monthArtist.count++;
      if (!monthArtist.tracks[scrobble.track]) {
        monthArtist.tracks[scrobble.track] = newTrackItem;
      } else {
        monthArtist.tracks[scrobble.track].count++;
      }
    }
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
        scrobbleCount: 1,
        tracks: [scrobble.track],
      };

      this.uniqueTrackAdded(next, scrobble);
    }
  }

  private handleTrack(next: TempStats, scrobble: Scrobble, weekYear: string): void {
    const seen = next.seenTracks;
    const track = scrobble.artist + ' - ' + scrobble.track;
    const seenTrack = seen[track];
    if (seenTrack) {
      this.handleStreakItem(seenTrack, next.betweenTracks, scrobble, weekYear);
    } else {
      seen[track] = {
        artist: scrobble.artist,
        name: track,
        weeks: [weekYear],
        betweenStreak: {start: scrobble, end: scrobble},
        avgScrobble: scrobble.date.getTime(),
        scrobbleCount: 1,
      };
    }
  }

  private handleStreakItem(seen: StreakItem, stack: StreakStack, scrobble: Scrobble, weekYear: string): void {
    seen.betweenStreak.end = scrobble;
    stack.add(seen.betweenStreak);
    seen.betweenStreak = {start: scrobble, end: scrobble};
    seen.avgScrobble = ((seen.avgScrobble * seen.scrobbleCount) + scrobble.date.getTime()) / (seen.scrobbleCount + 1);
    seen.scrobbleCount++;
    if (seen.weeks.indexOf(weekYear) < 0) {
      seen.weeks.push(weekYear);
    }
  }

  private uniqueTrackAdded(next: TempStats, scrobble: Scrobble): void {
    next.trackCount++;
    if (next.trackCount % 1000 === 0) {
      next.trackMilestones.push(scrobble);
    }
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)).getTime();
    return Math.ceil((((d.getTime() - yearStart) / 86400000) + 1) / 7);
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
      notListenedStreak: new StreakStack(),
      betweenArtists: new StreakStack(),
      betweenTracks: new StreakStack(),
      seenArtists: {},
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

  private filter(scrobbles: Scrobble[]): Scrobble[] {
      const start = this.settings.dateRangeStart.value;
      const end = this.settings.dateRangeEnd.value;
      const include = this.settings.artistsInclude.value;
      const artists = this.settings.artists.value || [];
      return scrobbles.filter(s => {
        if ((start && s.date < start) || (end && s.date > end)) {
          return false;
        }
        if (artists.length) {
          const contains = artists.indexOf(s.artist) >= 0;
          return contains === include;
        }
        return true;
      });
  }
}
