import {Injectable} from '@angular/core';
import {Scrobble} from './scrobble-retriever.service';
import {Top10Item, Stats} from './stats/stats.component';

interface Artist {
  weeks: string[];
  name: string;
  first: Scrobble;
  betweenStreak: Streak;
}

interface Month {
  alias: string;
  newArtists: string[];
  scrobblesPerArtist: { [key: string]: number };
  avg?: number;
}

interface TempStats {
  last?: Scrobble;
  monthList: { [key: string]: Month };
  hours: { [key: number]: number };
  days: { [key: number]: number };
  months: { [key: number]: number };
  seenArtists: { [key: string]: Artist };
  scrobbleStreak: ScrobbleStreakStack;
  notListenedStreak: StreakStack;
  betweenArtists: StreakStack;
}

interface Streak {
  start: Scrobble;
  end: Scrobble;
  length?: number;
}

class StreakStack {
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

class ScrobbleStreakStack extends StreakStack {
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
  readonly DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  readonly MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  tempStats: TempStats = {
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
  };

  constructor() {
  }

  update(stats: Stats, scrobbles: Scrobble[]): Stats {
    for (const scrobble of scrobbles) {
      if (scrobble.date.getFullYear() === 1970) {
        continue;
      }
      this.tempStats.hours[scrobble.date.getHours()]++;
      this.tempStats.months[scrobble.date.getMonth()]++;
      this.tempStats.days[scrobble.date.getDay()]++;

      const monthYear = `${scrobble.date.getMonth()}-${scrobble.date.getFullYear()}`;
      const weekYear = `W${this.getWeekNumber(scrobble.date)} ${scrobble.date.getFullYear()}`;
      if (!this.tempStats.monthList[monthYear]) {
        this.tempStats.monthList[monthYear] = {alias: this.monthYearDisplay(scrobble.date), newArtists: [], scrobblesPerArtist: {}};
      }
      const month = this.tempStats.monthList[monthYear];
      const seen = this.tempStats.seenArtists;
      const seenArtist = seen[scrobble.artist];
      if (seenArtist) {
        seenArtist.betweenStreak.end = scrobble;
        this.tempStats.betweenArtists.add(seenArtist.betweenStreak);
        seenArtist.betweenStreak = {start: scrobble, end: scrobble};
        if (seenArtist.weeks.indexOf(weekYear) < 0) {
          seenArtist.weeks.push(weekYear);
        }
      } else {
        seen[scrobble.artist] = {
          weeks: [weekYear],
          name: scrobble.artist,
          first: scrobble,
          betweenStreak: {start: scrobble, end: scrobble},
        };

        month.newArtists.push(scrobble.artist);
      }

      if (!month.scrobblesPerArtist[scrobble.artist]) {
        month.scrobblesPerArtist[scrobble.artist] = 1;
      } else {
        month.scrobblesPerArtist[scrobble.artist]++;
      }

      this.tempStats.scrobbleStreak.push(scrobble);
      const sod = StreakStack.startOfDay(scrobble.date);
      const lastDate = this.tempStats.last ? StreakStack.startOfDay(this.tempStats.last.date) : undefined;
      if (lastDate && sod.getTime() - lastDate.getTime() > StreakStack.DAY) {
        this.tempStats.notListenedStreak.add({start: this.tempStats.last!, end: scrobble});
      }

      this.tempStats.last = scrobble;
    }
    return this.updateStats(stats);
  }

  private updateStats(stats: Stats): Stats {
    const endDate = this.tempStats.last!.date;
    const seen = Object.values(this.tempStats.seenArtists);
    stats.scrobbleStreak = this.getStreakTop10(this.tempStats.scrobbleStreak.streaks);
    stats.notListenedStreak = this.getStreakTop10(this.tempStats.notListenedStreak.streaks);
    stats.betweenArtists = this.getStreakTop10(this.tempStats.betweenArtists.streaks, s => `${s.start.artist} (${s.length} days)`);
    stats.ongoingBetweenArtists = this.getStreakTop10(
      seen
        .map(a => a.betweenStreak)
        .map(a => ({start: a.start, end: {artist: a.start.artist, track: '?', date: endDate}}))
        .map(a => StreakStack.calcLength(a)),
      s => `${s.start.artist} (${s.length} days)`
    );

    const months = this.tempStats.monthList;
    const monthsValues = Object.values(months);
    monthsValues.forEach(m => {
      const values = Object.values(m.scrobblesPerArtist);
      const sum = values.reduce((a, b) => a + b, 0);
      m.avg = (sum / values.length) || 0;
    });

    stats.newArtistsPerMonth = this.getTop10(months, m => m.newArtists.length, k => months[k], (m, k) => `${m.alias} (${k} artists)` , m => this.including(m));
    stats.uniqueArtists = this.getTop10(months, m => Object.keys(m.scrobblesPerArtist).length, k => months[k], (m, k) => `${m.alias} (${k} artists)`, m => this.including(m));

    const arr = Object.values(months)
      .map(m => Object.keys(m.scrobblesPerArtist).filter(k => m.newArtists.indexOf(k) >= 0).map(a => ({artist: a, month: m.alias, amount: m.scrobblesPerArtist[a]})))
      .flat();

    stats.avgTrackPerArtistAsc = this.getTop10(months, m => m.avg!, k => months[k], m => `${m.alias} (${Math.round(m.avg)} scrobbles per artist)` , v => this.including(v));
    stats.avgTrackPerArtistDesc = this.getTop10(months, m => m.avg!, k => months[k], m => `${m.alias} (${Math.round(m.avg)} scrobbles per artist)` , v => this.including(v)); // reverse
    stats.mostListenedNewArtist = this.getTop10(arr, a => a.amount, k => arr[+k], a => `${a.artist} (${a.month})`, a => `${a.amount} times`);

    stats.weeksPerArtist = this.getTop10(seen, s => s.weeks.length, k => seen[+k], a => a.name, (i, v) => `${v} weeks`);

    const xTimes = (item: any, v: number) => `${v} times`;
    stats.scrobbledHours = this.getTop10(this.tempStats.hours, k => this.tempStats.hours[k], k => k, k => `${k}:00-${k}:59`, xTimes);
    stats.scrobbledDays = this.getTop10(this.tempStats.days, k => this.tempStats.days[k], k => k, k => this.DAYS[k], xTimes);
    stats.scrobbledMonths = this.getTop10(this.tempStats.months, k => this.tempStats.months[k], k => k, k => this.MONTHS[k], xTimes);

    return stats;
  }

  getTop10(countMap: {},
           getValue: (k: any) => number,
           getItem: (k: string) => any,
           buildName: (k: any, value: number) => string,
           buildDescription: (item: any, value: number) => string
  ): Top10Item[] {
    const keys = Object.keys(countMap);
    keys.sort((a, b) => getValue(getItem(b)) - getValue(getItem(a)));
    return keys.splice(0, 10).map(k => {
      const item = getItem(k);
      const val = getValue(item);
      return {
        amount: val,
        name: buildName(item, val),
        description: buildDescription(item, val)
      };
    });
  }

  getStreakTop10(streaks: Streak[], buildName = (s: Streak) => `${s.length} days`): Top10Item[]  {
    const keys = Object.keys(streaks);
    keys.sort((a, b) => streaks[+b].length! - streaks[+a].length!);
    return keys.splice(0, 10).map(k => {
      const streak = streaks[+k];
      return {
        amount: streak.length!,
        name: buildName(streak),
        description: streak.start.date.toLocaleDateString() + ' - ' + streak.end.date.toLocaleDateString()
      };
    });
  }

  private including(m: Month): string {
    const keys = Object.keys(m.scrobblesPerArtist);
    keys.sort((a, b) => m.scrobblesPerArtist[b] - m.scrobblesPerArtist[a]);
    return  keys.splice(0, 3).join(', ');
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)).getTime();
    return Math.ceil((((d.getTime() - yearStart) / 86400000) + 1) / 7);
  }

  private monthYearDisplay(date: Date): string {
    return this.MONTHS[date.getMonth()] + ' ' + date.getFullYear();
  }
}
