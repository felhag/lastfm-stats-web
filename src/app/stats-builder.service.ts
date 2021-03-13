import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {Scrobble} from './scrobble-retriever.service';

export interface Artist {
  weeks: string[];
  name: string;
  first: Scrobble;
  betweenStreak: Streak;
  scrobbleCount: number;
  tracks: string[];
}

export interface Month {
  alias: string;
  newArtists: Scrobble[];
  scrobblesPerArtist: { [key: string]: number };
  avg?: number;
}

export interface TempStats {
  last?: Scrobble;
  monthList: { [key: string]: Month };
  hours: { [key: number]: number };
  days: { [key: number]: number };
  months: { [key: number]: number };
  seenArtists: { [key: string]: Artist };
  scrobbleStreak: ScrobbleStreakStack;
  notListenedStreak: StreakStack;
  betweenArtists: StreakStack;
  scrobbleMilestones: Scrobble[];
  trackMilestones: Scrobble[];
  scrobbleCount: number;
  trackCount: number;
}

export interface Streak {
  start: Scrobble;
  end: Scrobble;
  length?: number;
}

export class StreakStack {
  static readonly DAY = 24 * 60 * 60 * 1000;
  static readonly TWO_DAYS = 2 * StreakStack.DAY;
  streaks: Streak[] = [];
  current?: Streak;

  static calcLength(streak: Streak): Streak {
    streak.length = Math.floor((this.startOfDay(streak.end.date).getTime() - this.startOfDay(streak.start.date).getTime()) / this.DAY);
    return streak;
  }

  static startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  add(streak: Streak): void {
    StreakStack.calcLength(streak);
    if (streak.length! > 0) {
      this.streaks.push(streak);
    }
  }
}

export class ScrobbleStreakStack extends StreakStack {
  push(scrobble: Scrobble): void {
    if (!this.current) {
      this.current = {start: scrobble, end: scrobble, length: 1};
    } else {
      const end = StreakStack.startOfDay(this.current.end.date).getTime();
      const add = StreakStack.startOfDay(scrobble.date).getTime();
      if (add === end) {
        this.current.end = scrobble;
      } else if (add - end < StreakStack.TWO_DAYS) {
        this.current.end = scrobble;
        this.current.length!++;
      } else {
        // finish
        this.add(this.current);
        this.current = undefined;
      }
    }
  }
}

@Injectable({
  providedIn: 'root'
})
export class StatsBuilderService {
  static readonly DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  static readonly MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  tempStats = new BehaviorSubject<TempStats>(this.emptyStats());

  constructor() {
  }

  update(scrobbles: Scrobble[], cumulative: boolean): void {
    const next = cumulative ? this.tempStats.value : this.emptyStats();
    let changed = false;
    for (const scrobble of scrobbles) {
      if (scrobble.date.getFullYear() === 1970) {
        continue;
      }
      changed = true;
      next.scrobbleCount++;
      next.hours[scrobble.date.getHours()]++;
      next.months[scrobble.date.getMonth()]++;
      next.days[scrobble.date.getDay()]++;

      const monthYear = `${scrobble.date.getMonth()}-${scrobble.date.getFullYear()}`;
      const weekYear = `W${this.getWeekNumber(scrobble.date)} ${scrobble.date.getFullYear()}`;
      if (!next.monthList[monthYear]) {
        next.monthList[monthYear] = {alias: this.monthYearDisplay(scrobble.date), newArtists: [], scrobblesPerArtist: {}};
      }
      const month = next.monthList[monthYear];
      this.handleArtist(next, scrobble, weekYear, month);

      if (!month.scrobblesPerArtist[scrobble.artist]) {
        month.scrobblesPerArtist[scrobble.artist] = 1;
      } else {
        month.scrobblesPerArtist[scrobble.artist]++;
      }

      next.scrobbleStreak.push(scrobble);
      const sod = StreakStack.startOfDay(scrobble.date);
      const lastDate = next.last ? StreakStack.startOfDay(next.last.date) : undefined;
      if (lastDate && sod.getTime() - lastDate.getTime() > StreakStack.DAY) {
        next.notListenedStreak.add({start: next.last!, end: scrobble});
      }

      if (next.scrobbleCount % 1000 === 0) {
        next.scrobbleMilestones.push(scrobble);
      }

      next.last = scrobble;
    }

    if (changed) {
      this.tempStats.next(next);
    }
  }

  private handleArtist(next: TempStats, scrobble: Scrobble, weekYear: string, month: Month): void {
    const seen = next.seenArtists;
    const seenArtist = seen[scrobble.artist];
    if (seenArtist) {
      seenArtist.betweenStreak.end = scrobble;
      next.betweenArtists.add(seenArtist.betweenStreak);
      seenArtist.betweenStreak = {start: scrobble, end: scrobble};
      seenArtist.scrobbleCount++;
      if (seenArtist.weeks.indexOf(weekYear) < 0) {
        seenArtist.weeks.push(weekYear);
      }
      if (seenArtist.tracks.indexOf(scrobble.track) < 0) {
        seenArtist.tracks.push(scrobble.track);
        this.uniqueTrackAdded(next, scrobble);
      }
    } else {
      seen[scrobble.artist] = {
        weeks: [weekYear],
        name: scrobble.artist,
        first: scrobble,
        betweenStreak: {start: scrobble, end: scrobble},
        scrobbleCount: 1,
        tracks: [scrobble.track],
      };

      month.newArtists.push(scrobble);
      this.uniqueTrackAdded(next, scrobble);
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
    return StatsBuilderService.MONTHS[date.getMonth()] + ' ' + date.getFullYear();
  }

  private emptyStats(): TempStats {
    return {
      monthList: {},
      days: {0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0},
      hours: {
        0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0,
        13: 0, 14: 0, 15: 0, 16: 0, 17: 0, 18: 0, 19: 0, 20: 0, 21: 0, 22: 0, 23: 0
      },
      months: {0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0},
      scrobbleStreak: new ScrobbleStreakStack(),
      notListenedStreak: new StreakStack(),
      betweenArtists: new StreakStack(),
      seenArtists: {},
      scrobbleMilestones: [],
      scrobbleCount: 0,
      trackMilestones: [],
      trackCount: 0,
    };
  }
}
