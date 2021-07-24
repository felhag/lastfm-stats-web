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

export interface StreakItem {
  weeks: string[];
  name: string;
  betweenStreak: Streak;
  scrobbleCount: number;
  avgScrobble: number;
}

export interface Artist extends StreakItem {
  tracks: string[];
}

export interface Track extends StreakItem {
  artist: string;
}

export interface Month {
  alias: string;
  artists: { [key: string]: MonthArtist};
  avg?: number;
}

export interface MonthArtist {
  name: string;
  count: number;
  new?: Scrobble;
  tracks: { [key: string]: MonthTrack };
}

export interface MonthTrack {
  name: string;
  count: number;
  new?: Scrobble;
}

export interface Export {
  username: string;
  scrobbles: { artist: string, track: string, date: number }[];
}

export interface TempStats {
  first?: Scrobble;
  last?: Scrobble;
  monthList: { [key: string]: Month };
  hours: { [key: number]: number };
  days: { [key: number]: number };
  months: { [key: number]: number };
  specificDays: { [key: number]: number };
  specificWeeks: { [key: string]: number };
  seenArtists: { [key: string]: Artist };
  seenTracks: { [key: string]: Track };
  scrobbleStreak: ScrobbleStreakStack;
  notListenedStreak: StreakStack;
  betweenArtists: StreakStack;
  betweenTracks: StreakStack;
  scrobbleMilestones: Scrobble[];
  trackMilestones: Scrobble[];
  scrobbleCount: number;
  trackCount: number;
}

export interface Streak {
  start: Scrobble;
  end: Scrobble;
  length?: number;
  ongoing?: boolean;
}

export class StreakStack {
  streaks: Streak[] = [];
  current?: Streak;

  static calcLength(streak: Streak): Streak {
    streak.ongoing = false;
    streak.length = Math.floor((this.startOfDay(streak.end.date).getTime() - this.startOfDay(streak.start.date).getTime()) / Constants.DAY);
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
      this.current = {start: scrobble, end: scrobble, length: 1, ongoing: true};
    } else {
      const end = StreakStack.startOfDay(this.current.end.date).getTime();
      const add = StreakStack.startOfDay(scrobble.date).getTime();
      if (add === end) {
        this.current.end = scrobble;
      } else if (add - end < Constants.TWO_DAYS) {
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
  pageSize: number;
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
  static readonly DAY = 24 * 60 * 60 * 1000;
  static readonly TWO_DAYS = 2 * Constants.DAY;
  static readonly API_PAGE_SIZE = 1000;
  static readonly RETRIES = 2;
  static readonly SCROBBLE_ARTIST_THRESHOLD = 50;
  static readonly SCROBBLE_TRACK_THRESHOLD = 10;
  static readonly DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  static readonly MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  static readonly COLORS = [
    // highcharts colors
    '#7cb5ec', '#434348', '#90ed7d', '#f7a35c', '#8085e9', '#f15c80', '#e4d354', '#2b908f', '#f45b5b', '#91e8e1',
    // 50 other colors
    '#e77c36', '#3e59ce', '#52c04c', '#9043c1', '#81b744', '#976ee7', '#b0b834', '#cd6ee4', '#498929', '#e55ac5',
    '#d03896', '#43a664', '#a641a5', '#d7a136', '#707bec', '#6e7720', '#6a49a7', '#baa957', '#5a8ce5', '#d0482a',
    '#4fce8d', '#36bddc', '#d3404e', '#44c3b8', '#dd3e77', '#3a7a41', '#e46fb3', '#69b78e', '#aa367c', '#98b36b',
    '#9360b1', '#b56c2b', '#5563b4', '#8e6d2e', '#d08ede', '#627037', '#9d9adc', '#a55232', '#5ba2d8', '#e09970',
    '#4468a2', '#e27387', '#2a8168', '#a93e5b', '#745796', '#ad5b5a', '#c27cae', '#8a4262', '#ea97b2', '#995688'];
}
