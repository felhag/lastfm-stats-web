import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Month, TempStats, Artist, Constants, MonthArtist } from '../model';
import { SettingsService } from '../service/settings.service';
import { StatsBuilderService } from '../service/stats-builder.service';
import { AbstractListsComponent, Top10Item } from './abstract-lists.component';

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
}

@Component({
  selector: 'app-lists',
  templateUrl: './artist-lists.component.html',
  styleUrls: ['./lists.component.scss']
})
export class ArtistListsComponent extends AbstractListsComponent<ArtistStats> implements OnInit {
  constructor(builder: StatsBuilderService, settings: SettingsService, route: ActivatedRoute) {
    super(builder, settings, route);
  }

  protected doUpdate(stats: TempStats, next: ArtistStats): void {
    const gaps = this.calculateGaps(stats, stats.seenArtists, stats.betweenArtists, undefined, s => this.artistUrl(s.start.artist));
    next.betweenArtists = gaps[0];
    next.ongoingBetweenArtists = gaps[1];

    const months = stats.monthList;
    Object.values(months).forEach(m => {
      const values = Object.values(m.artists).map(a => a.count);
      const sum = values.reduce((a, b) => a + b, 0);
      m.avg = (sum / values.length) || 0;
    });

    next.newArtistsPerMonth = this.getMonthTop10(months, m => Object.values(m.artists).filter(a => a.new).length, k => months[k], (m, k) => `${m.alias} (${k} artists)`, (m: Month) => {
      // only show new artists in Including... text
      const newArtists = Object.values(m.artists).filter(a => a.new).map(s => s.name);
      const result = Object.keys(m.artists).filter(spa => newArtists.indexOf(spa) >= 0).reduce((r: any, e) => {
        r[e] = m.artists[e].count;
        return r;
      }, {});
      return this.including(result);
    });

    next.uniqueArtists = this.getMonthTop10(months, m => Object.keys(m.artists).length, k => months[k], (m, k) => `${m.alias} (${k} unique artists)`, (m: Month) => this.including(m.artists));

    const seen = Object.values(stats.seenArtists);
    const arr = Object.values(months)
      .map(m => Object.values(m.artists).filter(a => a.new).map(a => ({artist: a.name, month: m.alias, amount: a.count, date: m.date})))
      .flat();
    const xTimes = (item: any, v: number) => `${v} times`;

    next.avgTrackPerArtist = this.getMonthTop10(months, m => m.avg!, k => months[k], (m, v) => `${m.alias} (${Math.round(v)} scrobbles per artist)`, v => this.including(v.artists));
    next.mostListenedNewArtist = this.getTop10(arr, a => a.amount, k => arr[+k], a => `${a.artist} (${a.month})`, xTimes, a => this.artistMonthUrl(a.artist, a.month), i => i.date);

    next.weeksPerArtist = this.getArtistTop10(seen, s => s.weeks.length, k => seen[+k], a => a.name, (i, v) => `${v} weeks`);
    next.tracksPerArtist = this.getArtistTop10(seen, s => s.tracks.length, k => seen[+k], a => a.name, (i, v) => `${v} tracks`);

    const seenThreshold = seen.filter(s => s.scrobbles.length >= Constants.SCROBBLE_ARTIST_THRESHOLD);
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
  }

  private getMonthTop10(countMap: { [key: string]: any },
                        getValue: (k: Month) => number,
                        getItem: (k: string) => Month,
                        buildName: (item: Month, value: number) => string,
                        buildDescription: (item: Month, value: number) => string): Top10Item[] {
    return this.getTop10<Month>(countMap, getValue, getItem, buildName, buildDescription, item => this.monthUrl(item.alias), item => item.date);
  }

  private getArtistTop10(countMap: { [key: string]: any },
                         getValue: (k: Artist) => number,
                         getItem: (k: string) => Artist,
                         buildName: (item: Artist, value: number) => string,
                         buildDescription: (item: Artist, value: number) => string): Top10Item[] {
    return this.getTop10<Artist>(countMap, getValue, getItem, buildName, buildDescription, item => this.artistUrl(item.name), item => new Date(item.avgScrobble));
  }

  private calcDeltas(arr: number[]): number {
    if (arr.length <= 1) {
      return 0;
    }
    const result = arr.map((v, i, a) => i === 0 ? 0 : (a[i] - a[i - 1]));
    result.shift();
    return result.reduce((s, n) => s + n) / result.length;
  }

  private including(artists: { [p: string]: MonthArtist }): string {
    const keys = Object.keys(artists);
    keys.sort((a, b) => artists[b].count - artists[a].count);
    return 'Including ' + keys.splice(0, 3).join(', ');
  }

  private artistUrl(artist: string): string {
    return `${this.rootUrl}/music/${encodeURIComponent(artist)}`;
  }

  private artistMonthUrl(artist: string, month: string): string {
    return this.monthUrl(month, this.artistUrl(artist));
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
    };
  }
}
