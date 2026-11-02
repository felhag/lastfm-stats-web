import { Constants, hasDate, Scrobble } from '../app/model';
import { WordcloudChart } from '../charts/wordcloud-chart';

export interface RecapItem {
  name: string;
  sub?: string;
  count: number;
}

/** Consecutive scrobbles of the same artist/album/track. */
export interface RecapRun extends RecapItem {
  start: Date;
  end: Date;
}

/** An artist's all-time rank at the end of the year, compared to its all-time rank when the year started. */
export interface RecapRankChange {
  name: string;
  rank: number;
  previousRank: number;
}

export interface RecapDiscovery extends RecapItem {
  /** First scrobble of the artist, ever. */
  first: Date;
}

export interface RecapSession {
  start: Date;
  end: Date;
  count: number;
}

export interface Recap {
  year: number;
  /** True when the requested year hasn't finished yet. */
  ongoing: boolean;
  total: number;
  previousTotal: number;
  /** Scrobbles of the previous year up to the same date as {@link daysElapsed}, equal to previousTotal for a finished year. */
  previousToDate: number;
  daysInYear: number;
  /** Days of the year that have passed (including today), equal to daysInYear for a finished year. */
  daysElapsed: number;
  daysListened: number;
  uniqueArtists: number;
  uniqueAlbums: number;
  uniqueTracks: number;
  topArtists: RecapItem[];
  topAlbums: RecapItem[];
  topTracks: RecapItem[];
  /** Scrobbles of the top artists per {@link WEEKS} part of the year for the streamgraph, and per month for its tooltip. */
  artistWeeks: { name: string, weeks: number[], months: number[] }[];
  /** Most played track of the #1 artist. */
  topArtistTrack?: RecapItem;
  /** Artists that rose the most in the all-time ranking during the year. */
  climbers: RecapRankChange[];
  /** Artists that dropped the most in the all-time ranking during the year. */
  fallers: RecapRankChange[];
  newArtists: number;
  topNewArtists: RecapItem[];
  /** Every new artist, for the discoveries scatter. */
  discoveries: RecapDiscovery[];
  months: number[];
  busiestMonth: number;
  busiestDay?: { date: Date, count: number };
  topHour: number;
  topWeekday: number;
  longestStreak?: { start: Date, end: Date, length: number };
  longestBreak?: { start: Date, end: Date, length: number };
  firstScrobble?: Scrobble;
  /** Scrobbles per day of the year, index 0 is January 1st. */
  perDay: number[];
  /**
   * Same as perDay for the previous year, aligned on the calendar date of this year: a February 29th that
   * doesn't exist this year adds up to March 1st, and this year's February 29th stays empty.
   */
  previousPerDay: number[];
  /** Scrobbles per weekday (Monday first) and hour: index is weekday * 24 + hour. */
  weekHours: number[];
  sessions: { count: number, average: number, longest?: RecapSession, all: RecapSession[] };
  artistRun?: RecapRun;
  albumRun?: RecapRun;
  trackRun?: RecapRun;
  words: { name: string, weight: number, tracks: number }[];
}

const TOP = 5;
/** The year is split into 52 equal parts instead of calendar weeks, so the first and last aren't partial weeks. */
export const WEEKS = 52;
// Fallers come from the all-time top at the start of the year. Climbers can come from anywhere, as long as they
// have enough scrobbles: at the bottom of the ranking a few scrobbles already move an artist thousands of places.
const FALLER_POOL = 100;
const RANK_CHANGES = 5;
const WORDS = 80;
// On top of the wordcloud chart's exclusions: filler words that would otherwise top every year.
const STOP_WORDS = new Set([...WordcloudChart.EXCLUDE]);

/**
 * Builds a recap for a single year. Deliberately independent of TempStats: it only runs when the
 * recap page is opened and keeps its per-year maps local, so it doesn't cost anything on rebuilds.
 */
export function buildRecap(scrobbles: Scrobble[], year: number): Recap {
  const jan1 = new Date(year, 0, 1).getTime();
  const daysInYear = Math.round((new Date(year + 1, 0, 1).getTime() - jan1) / Constants.DAY);
  const perDay = new Array<number>(daysInYear).fill(0);
  const previousPerDay = new Array<number>(daysInYear).fill(0);
  const months = new Array<number>(12).fill(0);
  const hours = new Array<number>(24).fill(0);
  const weekdays = new Array<number>(7).fill(0);
  const weekHours = new Array<number>(7 * 24).fill(0);

  const artists = new Map<string, number>();
  const albums = new Map<string, RecapItem>();
  const tracks = new Map<string, RecapItem>();
  // Scrobbles per artist before this year.
  const knownArtists = new Map<string, number>();
  // First scrobble per artist this year, which is the very first one for the artists that turn out to be new.
  const firstHeard = new Map<string, Date>();

  const artistRun = new RunTracker();
  const albumRun = new RunTracker();
  const trackRun = new RunTracker();
  const sessions = new SessionTracker();

  let total = 0;
  let previousTotal = 0;
  let firstScrobble: Scrobble | undefined;
  // Where this year's scrobbles are, so the streamgraph only has to revisit those.
  let first = -1;
  let last = -1;
  let index = -1;

  for (const scrobble of scrobbles) {
    index++;
    if (!hasDate(scrobble)) {
      continue;
    }
    const date = scrobble.date;
    const y = date.getFullYear();
    if (y < year) {
      knownArtists.set(scrobble.artist, (knownArtists.get(scrobble.artist) || 0) + 1);
      if (y === year - 1) {
        previousTotal++;
        previousPerDay[dayIndex(new Date(year, date.getMonth(), date.getDate()), jan1)]++;
      }
      continue;
    } else if (y > year) {
      continue;
    }

    const weekday = (date.getDay() + 6) % 7;
    total++;
    firstScrobble ??= scrobble;
    if (first < 0) {
      first = index;
    }
    last = index;
    months[date.getMonth()]++;
    hours[date.getHours()]++;
    weekdays[weekday]++;
    weekHours[weekday * 24 + date.getHours()]++;
    perDay[dayIndex(date, jan1)]++;

    const albumKey = scrobble.album ? scrobble.albumId || scrobble.artist + ' - ' + scrobble.album : undefined;
    const trackKey = scrobble.artist + ' - ' + scrobble.track;
    artists.set(scrobble.artist, (artists.get(scrobble.artist) || 0) + 1);
    if (!(firstHeard.get(scrobble.artist)! <= date)) {
      firstHeard.set(scrobble.artist, date);
    }
    if (albumKey) {
      increment(albums, albumKey, scrobble.album, scrobble.artist);
    }
    increment(tracks, trackKey, scrobble.track, scrobble.artist);

    artistRun.push(scrobble.artist, scrobble);
    albumRun.push(albumKey, scrobble);
    trackRun.push(trackKey, scrobble);
    sessions.push(date);
  }

  const artistItems = [...artists.entries()].map(([name, count]) => ({name, count}));
  const topArtists = top(artistItems);
  const {climbers, fallers} = rankChanges(artists, knownArtists);
  const newArtistItems = artistItems.filter(a => !knownArtists.has(a.name));
  const topArtist = topArtists[0]?.name;
  const trackItems = [...tracks.values()];

  let daysListened = 0;
  let busiestDay: Recap['busiestDay'];
  let longestStreak: Recap['longestStreak'];
  let longestBreak: Recap['longestBreak'];
  let run = 0;
  let lastListened = -1;
  for (let i = 0; i < daysInYear; i++) {
    if (!perDay[i]) {
      run = 0;
      continue;
    }
    daysListened++;
    run++;
    if (!busiestDay || perDay[i] > busiestDay.count) {
      busiestDay = {date: new Date(year, 0, i + 1), count: perDay[i]};
    }
    if (!longestStreak || run > longestStreak.length) {
      longestStreak = {start: new Date(year, 0, i - run + 2), end: new Date(year, 0, i + 1), length: run};
    }
    const gap = i - lastListened - 1;
    if (lastListened >= 0 && gap > 0 && (!longestBreak || gap > longestBreak.length)) {
      longestBreak = {start: new Date(year, 0, lastListened + 2), end: new Date(year, 0, i), length: gap};
    }
    lastListened = i;
  }

  const now = new Date();
  const ongoing = now.getFullYear() === year;
  const daysElapsed = ongoing ? dayIndex(now, jan1) + 1 : daysInYear;
  return {
    year,
    ongoing,
    total,
    previousTotal,
    previousToDate: ongoing ? sum(previousPerDay, daysElapsed) : previousTotal,
    daysInYear,
    daysElapsed,
    daysListened,
    uniqueArtists: artists.size,
    uniqueAlbums: albums.size,
    uniqueTracks: tracks.size,
    topArtists,
    artistWeeks: artistWeeks(scrobbles, first, last, topArtists, year, jan1, daysInYear),
    topAlbums: top([...albums.values()]),
    topTracks: top([...trackItems]),
    topArtistTrack: topArtist ? top(trackItems.filter(t => t.sub === topArtist), 1)[0] : undefined,
    climbers,
    fallers,
    newArtists: newArtistItems.length,
    discoveries: newArtistItems.map(a => ({...a, first: firstHeard.get(a.name)!})),
    topNewArtists: top(newArtistItems),
    months,
    busiestMonth: indexOfMax(months),
    busiestDay,
    topHour: indexOfMax(hours),
    topWeekday: indexOfMax(weekdays),
    longestStreak,
    longestBreak,
    firstScrobble,
    perDay,
    previousPerDay,
    weekHours,
    sessions: sessions.result(),
    artistRun: artistRun.result(s => ({name: s.artist})),
    albumRun: albumRun.result(s => ({name: s.album, sub: s.artist})),
    trackRun: trackRun.result(s => ({name: s.track, sub: s.artist})),
    words: words(trackItems),
  };
}

/** Years that contain at least one dated scrobble, newest first. */
export function recapYears(scrobbles: Scrobble[]): number[] {
  const years = new Set<number>();
  for (const scrobble of scrobbles) {
    if (hasDate(scrobble)) {
      years.add(scrobble.date.getFullYear());
    }
  }
  return [...years].sort((a, b) => b - a);
}

/** Tracks the longest run of consecutive scrobbles sharing the same key. */
class RunTracker {
  private key?: string;
  private start?: Scrobble;
  private count = 0;
  private best?: { start: Scrobble, end: Scrobble, count: number };

  push(key: string | undefined, scrobble: Scrobble): void {
    if (key !== undefined && key === this.key) {
      this.count++;
    } else {
      this.key = key;
      this.start = scrobble;
      this.count = 1;
    }
    if (key === undefined) {
      return;
    }
    if (this.best && this.best.start === this.start) {
      this.best.end = scrobble;
      this.best.count = this.count;
    } else if (!this.best || this.count > this.best.count) {
      this.best = {start: this.start!, end: scrobble, count: this.count};
    }
  }

  result(item: (s: Scrobble) => { name: string, sub?: string }): RecapRun | undefined {
    // a single scrobble isn't a run
    return this.best && this.best.count > 1 ? {
      ...item(this.best.start),
      count: this.best.count,
      start: this.best.start.date,
      end: this.best.end.date
    } : undefined;
  }
}

/** A session ends after {@link Constants.SESSION_GAP} without scrobbles, same as the sessions list. */
// A single scrobble isn't a session, so those are left out entirely (also from the count and average).
class SessionTracker {
  private readonly all: RecapSession[] = [];
  private scrobbles = 0;
  private current?: RecapSession;
  private longest?: RecapSession;

  push(date: Date): void {
    if (this.current && date.getTime() - this.current.end.getTime() <= Constants.SESSION_GAP) {
      this.current.end = date;
      this.current.count++;
      if (this.current.count === 2) {
        this.all.push(this.current);
        this.scrobbles += 2;
      } else {
        this.scrobbles++;
      }
    } else {
      this.current = {start: date, end: date, count: 1};
    }
    if (this.current.count > 1 && (!this.longest || this.current.count > this.longest.count)) {
      this.longest = this.current;
    }
  }

  result(): Recap['sessions'] {
    const count = this.all.length;
    return {count, average: count ? this.scrobbles / count : 0, longest: this.longest, all: this.all};
  }
}

/**
 * Only known once the year has been walked, so the top artists' scrobbles are counted in a second pass. That keeps
 * it to a few arrays, instead of a weekly array for every artist of the year.
 */
function artistWeeks(scrobbles: Scrobble[], first: number, last: number, artists: RecapItem[], year: number, jan1: number, daysInYear: number): Recap['artistWeeks'] {
  const counts = new Map(artists.map(a => [a.name, {name: a.name, weeks: new Array<number>(WEEKS).fill(0), months: new Array<number>(12).fill(0)}]));
  for (let i = first; i >= 0 && i <= last; i++) {
    const scrobble = scrobbles[i];
    const artist = counts.get(scrobble.artist);
    if (artist && hasDate(scrobble) && scrobble.date.getFullYear() === year) {
      artist.weeks[Math.floor(dayIndex(scrobble.date, jan1) * WEEKS / daysInYear)]++;
      artist.months[scrobble.date.getMonth()]++;
    }
  }
  return [...counts.values()];
}

function sum(values: number[], count: number): number {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += values[i];
  }
  return total;
}

function dayIndex(date: Date, jan1: number): number {
  return Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - jan1) / Constants.DAY);
}

/** Words used in track titles, weighted by how often the track was played. */
function words(tracks: RecapItem[]): Recap['words'] {
  const counts = new Map<string, { plays: number, tracks: number }>();
  for (const track of tracks) {
    const seen = new Set<string>();
    for (const word of track.name.split(' ')) {
      const w = word.toLowerCase().replace(/[^\p{Letter}\p{Nd}]/gu, '');
      if (w.length > 2 && !STOP_WORDS.has(w) && !seen.has(w)) {
        seen.add(w);
        const count = counts.get(w) ?? {plays: 0, tracks: 0};
        count.plays += track.count;
        count.tracks++;
        counts.set(w, count);
      }
    }
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1].plays - a[1].plays).slice(0, WORDS);
  const max = sorted[0]?.[1].plays ?? 1;
  const min = sorted[sorted.length - 1]?.[1].plays ?? 0;
  // map to .25 - 1, so the least used words stay readable
  return sorted.map(([name, {plays, tracks}]) => ({name, tracks, weight: .25 + .75 * (max === min ? 1 : (plays - min) / (max - min))}));
}

function rankChanges(artists: Map<string, number>, before: Map<string, number>): Pick<Recap, 'climbers' | 'fallers'> {
  const after = new Map(before);
  artists.forEach((count, name) => after.set(name, (after.get(name) || 0) + count));
  const previousRanks = ranking(before);
  const ranks = ranking(after);
  // Artists without a previous rank are new this year, the discoveries step covers those.
  const changes = (names: string[]) => names
    .filter(name => previousRanks.has(name))
    .map(name => ({name, rank: ranks.get(name)!, previousRank: previousRanks.get(name)!}));

  const climbers = changes([...artists.keys()].filter(name => after.get(name)! >= Constants.SCROBBLE_ARTIST_THRESHOLD))
    .filter(c => c.previousRank > c.rank)
    .sort((a, b) => (b.previousRank - b.rank) - (a.previousRank - a.rank))
    .slice(0, RANK_CHANGES);
  const fallers = changes([...previousRanks.keys()].slice(0, FALLER_POOL))
    .filter(c => c.rank > c.previousRank)
    .sort((a, b) => (b.rank - b.previousRank) - (a.rank - a.previousRank))
    .slice(0, RANK_CHANGES);
  return {climbers, fallers};
}

/**
 * 1-based rank per artist, in order. Ties share the highest rank (1, 2, 2, 4): lots of artists have the same few
 * scrobbles, numbering them one by one would make their rank depend on the order they were first played in.
 */
function ranking(counts: Map<string, number>): Map<string, number> {
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const ranks = new Map<string, number>();
  sorted.forEach(([name, count], i) => ranks.set(name, i && count === sorted[i - 1][1] ? ranks.get(sorted[i - 1][0])! : i + 1));
  return ranks;
}

function increment(map: Map<string, RecapItem>, key: string, name: string, sub: string): void {
  const item = map.get(key);
  if (item) {
    item.count++;
  } else {
    map.set(key, {name, sub, count: 1});
  }
}

function top(items: RecapItem[], size = TOP): RecapItem[] {
  return items.sort((a, b) => b.count - a.count).slice(0, size);
}

function indexOfMax(values: number[]): number {
  return values.reduce((max, v, i) => v > values[max] ? i : max, 0);
}
