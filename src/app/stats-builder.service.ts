import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {TempStats, StreakStack, Month, ScrobbleStreakStack, Constants} from './model';
import {Scrobble} from './scrobble-retriever.service';

@Injectable({
  providedIn: 'root'
})
export class StatsBuilderService {
  tempStats = new BehaviorSubject<TempStats>(this.emptyStats());
  listSize = 10;

  constructor() {
  }

  update(scrobbles: Scrobble[], cumulative: boolean): void {
    const next = cumulative ? this.tempStats.value : this.emptyStats();
    let changed = !cumulative;
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
    return Constants.MONTHS[date.getMonth()] + ' ' + date.getFullYear();
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
