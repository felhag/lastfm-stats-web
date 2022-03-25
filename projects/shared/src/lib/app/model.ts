import { Subject, BehaviorSubject } from 'rxjs';

export enum App { 'lastfm', 'spotify'}

export type ItemType = 'artist' | 'album' | 'track';

export type State =
  'LOADINGUSER' | 'CALCULATINGPAGES' | 'RETRIEVING' |       // happy flow states
  'LOADFAILED' | 'LOADFAILEDDUEPRIVACY' | 'USERNOTFOUND' |  // initial error states
  'LOADSTUCK' | 'INTERRUPTED' | 'COMPLETED';                // completed states

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
  album: string;
  track: string;
  date: Date;
}

export interface StreakItem {
  weeks: string[];
  name: string;
  betweenStreak: Streak;
  avgScrobble: number;
  scrobbles: number[];
  ranks: number[];
}

export interface Artist extends StreakItem {
  tracks: string[];
}

export interface Album extends StreakItem {
  artist: string;
  shortName: string;
}

export interface Track extends StreakItem {
  artist: string;
  shortName: string;
}

export interface Month {
  alias: string;
  artists: Map<string, MonthArtist>;
  date: Date;
  avg?: number;
}

export interface MonthItem {
  name: string;
  count: number;
  new?: Scrobble;
}

export interface MonthArtist extends MonthItem {
  albums: { [key: string]: MonthItem };
  tracks: { [key: string]: MonthItem };
}

export interface Export {
  username: string;
  scrobbles: { artist: string, album: string, track: string, date: number }[];
}

export interface DataSetEntry {
  item: StreakItem;
  type: ItemType;
  artist: string;
  name: string;
  tracks: number;
  scrobbles: number;
  rank: number;
}

export interface TempStats {
  first?: Scrobble;
  last?: Scrobble;
  monthList: { [key: string]: Month };
  hours: { [key: number]: number };
  days: { [key: number]: number };
  months: { [key: number]: number };
  specificDays: { [key: number]: Track[] };
  specificWeeks: { [key: string]: number };
  seenArtists: { [key: string]: Artist };
  seenAlbums: { [key: string]: Album };
  seenTracks: { [key: string]: Track };
  scrobbleStreak: ScrobbleStreakStack;
  trackStreak: ItemStreakStack;
  artistStreak: ItemStreakStack;
  albumStreak: ItemStreakStack;
  notListenedStreak: StreakStack;
  betweenArtists: StreakStack;
  betweenAlbums: StreakStack;
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

  calcLength(streak: Streak): Streak {
    streak.ongoing = false;
    streak.length = Math.floor((StreakStack.startOfDay(streak.end.date).getTime() - StreakStack.startOfDay(streak.start.date).getTime()) / Constants.DAY);
    return streak;
  }

  static startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  protected create(scrobble: Scrobble): void {
    this.current = {start: scrobble, end: scrobble, length: 1, ongoing: true};
  }

  protected finish(scrobble: Scrobble): void {
    this.add(this.current!);
    this.create(scrobble);
  }

  add(streak: Streak): void {
    this.calcLength(streak);
    if (streak.length! > 1) {
      this.streaks.push(streak);
    }
  }
}

export class ScrobbleStreakStack extends StreakStack {
  push(scrobble: Scrobble): void {
    if (!this.current) {
      this.create(scrobble);
    } else {
      const end = StreakStack.startOfDay(this.current.end.date).getTime();
      const add = StreakStack.startOfDay(scrobble.date).getTime();
      if (add === end) {
        this.current.end = scrobble;
      } else if (add - end < Constants.TWO_DAYS) {
        this.current.end = scrobble;
        this.current.length!++;
      } else {
        this.finish(scrobble);
      }
    }
  }
}

export class ItemStreakStack extends StreakStack {
  constructor(private compare: (a: Scrobble, b: Scrobble) => boolean) {
    super();
  }

  calcLength(streak: Streak): Streak {
    // length is calculated on the fly
    streak.ongoing = false;
    return streak;
  }

  push(scrobble: Scrobble): void {
    if (!this.current) {
      this.create(scrobble);
    } else {
      if (this.compare(this.current.start, scrobble)) {
        this.current.length!++;
        this.current.end = scrobble;
      } else {
        this.finish(scrobble);
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
  static readonly API_PAGE_SIZE_REDUCED = 500;
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
  static readonly DARK_COLORS = [Constants.COLORS[0], '#c6bbbb', ...Constants.COLORS.slice(2)];
  static readonly DATE_COLORS = ['#FF0000', '#FF2000', '#FF4000', '#FF6000', '#FF8000', '#FFA000', '#FFC000',
    '#FFE000', '#FFFF00', '#E0FF00', '#C0FF00', '#A0FF00', '#80FF00', '#60FF00', '#40FF00', '#20FF00', '#10FF00'];
}
