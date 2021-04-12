import {Subject, BehaviorSubject} from 'rxjs';
import {State} from './service/scrobble-retriever.service';

export interface User {
  name: string;
  url: string;
  playcount: string;
  registered: {
    unixtime: string
  };
  image: {
    '#text': string;
  }[];
}

export interface Scrobble {
  artist: string;
  track: string;
  date: Date;
}

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

export interface Export {
  username: string;
  scrobbles: {artist: string, track: string, date: number}[];
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

export interface Progress {
  user?: User;
  first: BehaviorSubject<Scrobble | undefined>;
  last: BehaviorSubject<Scrobble | undefined>;
  totalPages: number;
  loadScrobbles: number;
  importedScrobbles: number;
  allScrobbles: Scrobble[];
  currentPage: number;
  pageLoadTime?: number;
  state: BehaviorSubject<State>;
  loader: Subject<Scrobble[]>;
}

export class Constants {
  static readonly API_PAGE_SIZE = 1000;
  static readonly DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  static readonly MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
}
