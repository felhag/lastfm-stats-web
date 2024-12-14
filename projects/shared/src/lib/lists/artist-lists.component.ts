import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TempStats, Artist, Constants, MonthItem } from 'projects/shared/src/lib/app/model';
import { SettingsService } from 'projects/shared/src/lib/service/settings.service';
import { StatsBuilderService } from 'projects/shared/src/lib/service/stats-builder.service';
import { AbstractListsComponent, Top10Item } from 'projects/shared/src/lib/lists/abstract-lists.component';
import { AbstractUrlService } from '../service/abstract-url.service';
import { TranslatePipe } from 'projects/shared/src/lib/service/translate.pipe';
import { Top10listComponent } from './top10list/top10list.component';
import { AsyncPipe } from '@angular/common';

type MonthWithAvg = {
  avg: number;
  date: Date;
  alias: string;
  artists: MonthItem[],
};

export interface ArtistStats {
  betweenArtists: Top10Item[];
  ongoingBetweenArtists: Top10Item[];
  weeksPerArtist: Top10Item[];
  tracksPerArtist: Top10Item[];
  newArtistsPerMonth: Top10Item[];
  mostListenedNewArtist: Top10Item[];
  uniqueArtists: Top10Item[];
  avgTrackPerArtist: Top10Item[];
  oneHitWonders: Top10Item[];
  scrobblesPerTrack: Top10Item[];
  avgScrobbleDesc: Top10Item[];
  avgScrobbleAsc: Top10Item[];
  avgDelta: Top10Item[];
  latestNew: Top10Item[];
  artistStreak: Top10Item[];
  climbers: Top10Item[];
  fallers: Top10Item[];
}

@Component({
    selector: 'app-lists',
    templateUrl: './artist-lists.component.html',
    styleUrls: ['./lists.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [Top10listComponent, AsyncPipe, TranslatePipe]
})
export class ArtistListsComponent extends AbstractListsComponent<ArtistStats> {
  protected forcedThreshold = Constants.SCROBBLE_ARTIST_THRESHOLD;

  constructor(builder: StatsBuilderService, settings: SettingsService, private url: AbstractUrlService) {
    super(builder, settings, url);
  }

  protected doUpdate(stats: TempStats, next: ArtistStats): void {
    const seen = this.seenThreshold(stats.seenArtists);
    const gaps = this.calculateGaps(stats, seen, stats.betweenArtists, undefined, s => this.url.artist(s.start.artist));
    next.betweenArtists = gaps[0];
    next.ongoingBetweenArtists = gaps[1];

    const months = this.getMonths(stats);

    next.newArtistsPerMonth = this.getMonthTop10(months, m => m.artists.filter(a => a.new).length, k => months[k], (m, k) => `${m.alias} (${k} artists)`, m => {
      // only show new artists in Including... text
      return this.including(m.artists.filter(a => a.new));
    });

    next.uniqueArtists = this.getMonthTop10(months, m => m.artists.length, k => months[k], (m, k) => `${m.alias} (${k} unique artists)`, m => this.including(m.artists));

    const arr = Object.values(months)
      .map(m => [...m.artists.values()].filter(a => a.new).map(a => ({artist: a.name, month: m.alias, amount: a.count, date: m.date})))
      .flat();
    const xTimes = (item: any, v: number) => `${v} times`;

    next.avgTrackPerArtist = this.getMonthTop10(months, m => m.avg!, k => months[k], (m, v) => `${m.alias} (${Math.round(v)} scrobbles per artist)`, v => this.including(v.artists));
    next.mostListenedNewArtist = this.getTop10(arr, a => a.amount, k => arr[+k], a => `${a.artist} (${a.month})`, xTimes, a => this.url.artistMonth(a.artist, a.month), i => i.date);

    next.weeksPerArtist = this.getArtistTop10(seen, s => s.weeks.length, k => seen[+k], a => a.name, (i, v) => `${v} weeks`);
    next.tracksPerArtist = this.getArtistTop10(seen, s => s.tracks.length, k => seen[+k], a => a.name, (i, v) => `${v} tracks`);

    const seenThreshold = this.forceThreshold(seen);
    const spt = seenThreshold.filter(s => s.tracks.length > 1);
    const ohw = seen.filter(a => a.tracks.length === 1);
    const sptDescription = (a: Artist, v: number) => `${Math.round(v)} scrobbles per track (${a.tracks.length} track${a.tracks.length > 1 ? 's' : ''})`;
    next.oneHitWonders = this.getArtistTop10(ohw, s => s.scrobbles.length, k => ohw[+k], a => a.name + ' - ' + a.tracks[0], xTimes);
    next.scrobblesPerTrack = this.getArtistTop10(spt, s => s.scrobbles.length / s.tracks.length, k => spt[+k], a => a.name, sptDescription);

    next.avgScrobbleDesc = this.getArtistTop10(seenThreshold, s => s.avgScrobble, k => seenThreshold[+k], a => `${a.name} (${a.scrobbles.length} scrobbles)`, (i, v) => this.dateString(v));
    next.avgScrobbleAsc = this.getArtistTop10(seenThreshold, s => -s.avgScrobble, k => seenThreshold[+k], a => `${a.name} (${a.scrobbles.length} scrobbles)`, (i, v) => this.dateString(Math.abs(v)));

    const std = seenThreshold.map(a => ({
      ...a,
      deltas: this.calcDeltas(a.scrobbles),
    }));
    next.avgDelta = this.getArtistTop10(std, s => (s as any).deltas, k => std[+k], a => `${a.name} (${Math.round((a as any).deltas / Constants.DAY)} days)`,
      i => `${i.scrobbles.length} scrobbles between ${this.dateString(i.scrobbles[0])} and ${this.dateString(i.scrobbles[i.scrobbles.length - 1])}`);
    next.latestNew = this.getArtistTop10(seen, s => s.scrobbles[0], k => seen[+k], a => `${a.name} (${a.scrobbles.length} scrobbles)`, (i, v) => this.dateString(v));
    next.artistStreak = this.consecutiveStreak(stats, stats.artistStreak, s => `${s.start.artist} (${s.length} times)`);

    const rankings = this.getRankings(seenThreshold, Object.values(months), (i, m) => this.url.artistMonth(i.name, m));
    next.climbers = rankings.climbers;
    next.fallers = rankings.fallers;
  }

  private getMonths(stats: TempStats): { [key: string]: MonthWithAvg } {
    const result: { [key: string]: MonthWithAvg } = {};
    Object.keys(stats.monthList).forEach(m => {
      const month = stats.monthList[m];
      const artists = [...month.artists.values()];
      const sum = artists.map(a => a.count).reduce((a, b) => a + b, 0);
      const avg = (sum / artists.length) || 0;
      result[m] = {
        avg,
        artists,
        alias: month.alias,
        date: month.date
      }
    });
    return result;
  }

  private getMonthTop10(countMap: { [key: string]: any },
                        getValue: (k: MonthWithAvg) => number,
                        getItem: (k: string) => MonthWithAvg,
                        buildName: (item: MonthWithAvg, value: number) => string,
                        buildDescription: (item: MonthWithAvg, value: number) => string): Top10Item[] {
    return this.getTop10<MonthWithAvg>(countMap, getValue, getItem, buildName, buildDescription, item => this.url.month(item.alias), item => item.date).filter(m => m.amount > 0);
  }

  private getArtistTop10(countMap: { [key: string]: any },
                         getValue: (k: Artist) => number,
                         getItem: (k: string) => Artist,
                         buildName: (item: Artist, value: number) => string,
                         buildDescription: (item: Artist, value: number) => string): Top10Item[] {
    return this.getTop10<Artist>(countMap, getValue, getItem, buildName, buildDescription, item => this.url.artist(item.name), item => new Date(item.avgScrobble));
  }

  private calcDeltas(arr: number[]): number {
    if (arr.length <= 1) {
      return 0;
    }
    const result = arr.map((v, i, a) => i === 0 ? 0 : (a[i] - a[i - 1]));
    result.shift();
    return result.reduce((s, n) => s + n) / result.length;
  }

  protected emptyStats(): ArtistStats {
    return {
      betweenArtists: [],
      ongoingBetweenArtists: [],
      weeksPerArtist: [],
      tracksPerArtist: [],
      newArtistsPerMonth: [],
      mostListenedNewArtist: [],
      uniqueArtists: [],
      avgTrackPerArtist: [],
      oneHitWonders: [],
      scrobblesPerTrack: [],
      avgScrobbleDesc: [],
      avgScrobbleAsc: [],
      avgDelta: [],
      latestNew: [],
      artistStreak: [],
      climbers: [],
      fallers: [],
    };
  }
}
