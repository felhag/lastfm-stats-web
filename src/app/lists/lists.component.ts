import {Component, OnInit} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute} from '@angular/router';
import {UntilDestroy} from '@ngneat/until-destroy';
import {AbstractListsComponent} from '../abstract-lists.component';
import {Month, Streak, StreakStack, TempStats, ScrobbleStreakStack, Artist, Constants} from '../model';
import {SettingsService} from '../service/settings.service';
import {StatsBuilderService} from '../service/stats-builder.service';

export interface Top10Item {
  name: string;
  amount: number;
  description?: string;
  date?: string;
  url?: string;
}

export interface Stats {
  scrobbleStreak: Top10Item[];
  notListenedStreak: Top10Item[];
  betweenArtists: Top10Item[];
  ongoingBetweenArtists: Top10Item[];
  weeksPerArtist: Top10Item[];
  tracksPerArtist: Top10Item[];
  newArtistsPerMonth: Top10Item[];
  mostListenedNewArtist: Top10Item[];
  uniqueArtists: Top10Item[];
  uniqueTracks: Top10Item[];
  avgTrackPerArtist: Top10Item[];
  oneHitWonders: Top10Item[];
  scrobblesPerTrack: Top10Item[];
  avgScrobbleDesc: Top10Item[];
  avgScrobbleAsc: Top10Item[];
}

@Component({
  selector: 'app-lists',
  templateUrl: './lists.component.html',
  styleUrls: ['./lists.component.scss']
})
export class ListsComponent extends AbstractListsComponent<Stats> implements OnInit {
  constructor(builder: StatsBuilderService, settings: SettingsService, route: ActivatedRoute, snackbar: MatSnackBar) {
    super(builder, settings, route, snackbar);
  }

  protected updateStats(tempStats: TempStats): void {
    const next = this.emptyStats();
    const now = new Date();
    const endDate = tempStats.last?.date || now;
    const seen = Object.values(tempStats.seenArtists);
    const streak = this.currentScrobbleStreak(tempStats, endDate);
    next.scrobbleStreak = this.getStreakTop10(streak, (s: Streak) => `${s.length! + 1} days`);
    next.notListenedStreak = this.getStreakTop10(tempStats.notListenedStreak.streaks, (s: Streak) => `${s.length! - 1} days`);
    next.betweenArtists = this.getStreakTop10(tempStats.betweenArtists.streaks, s => `${s.start.artist} (${s.length! - 1} days)`, s => this.artistUrl(s.start.artist));
    next.ongoingBetweenArtists = this.getStreakTop10(
      seen
        .map(a => a.betweenStreak)
        .map(a => ({start: a.start, end: {artist: a.start.artist, track: '?', date: now}}))
        .map(a => StreakStack.calcLength(a)),
      s => `${s.start.artist} (${s.length} days)`,
      s => this.artistUrl(s.start.artist)
    );

    const months = tempStats.monthList;
    const monthsValues = Object.values(months);
    monthsValues.forEach(m => {
      const values = Object.values(m.artists).map(a => a.count);
      const sum = values.reduce((a, b) => a + b, 0);
      m.avg = (sum / values.length) || 0;
    });

    const tracks: { [key: string]: string[] } = {};
    monthsValues.forEach(m => tracks[m.alias] = Object.keys(m.artists).flatMap(a => Object.keys(m.artists[a].tracks).map(t => a + ' - ' + t)));

    const artistUrl = (item: Artist) => this.artistUrl(item.name);
    const monthUrl = (item: Month) => this.monthUrl(item.alias);
    next.newArtistsPerMonth = this.getTop10(months, m => m.newArtists.length, k => months[k], (m, k) => `${m.alias} (${k} artists)`, (m: Month) => {
      // only show new artists in Including... text
      const newArtists = m.newArtists.map(s => s.artist);
      const result = Object.keys(m.artists).filter(spa => newArtists.indexOf(spa) >= 0).reduce((r: any, e) => {
        r[e] = m.artists[e].count;
        return r;
      }, {});
      return this.including(result);
    }, monthUrl);


    next.uniqueArtists = this.getTop10(months, m => Object.keys(m.artists).length, k => months[k], (m, k) => `${m.alias} (${k} unique artists)`, (m: Month) => this.including(m.artists), monthUrl);
    next.uniqueTracks = this.getTop10(tracks, tx => tracks[tx].length, k => k, (m, k) => `${m} (${k} unique tracks)`, (m: string) => m, m => this.monthUrl(m));

    const arr = Object.values(months)
      .map(m => Object.keys(m.artists)
        .filter(k => m.newArtists.map(a => a.artist).indexOf(k) >= 0)
        .map(a => ({artist: a, month: m.alias, amount: m.artists[a].count})))
      .flat();
    const xTimes = (item: any, v: number) => `${v} times`;

    next.avgTrackPerArtist = this.getTop10(months, m => m.avg, k => months[k], (m, v) => `${m.alias} (${Math.round(v)} scrobbles per artist)`, v => this.including(v.artists), monthUrl);
    next.mostListenedNewArtist = this.getTop10(arr, a => a.amount, k => arr[+k], a => `${a.artist} (${a.month})`, xTimes, a => this.artistMonthUrl(a.artist, a.month));

    next.weeksPerArtist = this.getTop10(seen, s => s.weeks.length, k => seen[+k], a => a.name, (i, v) => `${v} weeks`, artistUrl);
    next.tracksPerArtist = this.getTop10(seen, s => s.tracks.length, k => seen[+k], a => a.name, (i, v) => `${v} tracks`, artistUrl);

    const seenThreshold = seen.filter(s => s.scrobbleCount >= Constants.SCROBBLE_THRESHOLD);
    const ohw = seen.filter(a => a.tracks.length === 1);
    const sptDescription = (a: Artist, v: number) => `${Math.round(v)} scrobbles per track (${a.tracks.length} track${a.tracks.length > 1 ? 's' : ''})`;
    next.oneHitWonders = this.getTop10(ohw, s => s.scrobbleCount, k => ohw[+k], a => a.name + ' - ' + a.tracks[0], xTimes, artistUrl);
    next.scrobblesPerTrack = this.getTop10(seenThreshold, s => s.scrobbleCount / s.tracks.length, k => seenThreshold[+k], a => a.name, sptDescription, artistUrl);

    next.avgScrobbleDesc = this.getTop10(seenThreshold, s => s.avgScrobble, k => seenThreshold[+k], a => `${a.name} (${a.scrobbleCount} scrobbles)`, (i, v) => new Date(v).toLocaleDateString(), artistUrl);
    next.avgScrobbleAsc = this.getTop10(seenThreshold, s => -s.avgScrobble, k => seenThreshold[+k], a => `${a.name} (${a.scrobbleCount} scrobbles)`, (i, v) => new Date(Math.abs(v)).toLocaleDateString(), artistUrl);

    this.stats.next(next);
  }

  private currentScrobbleStreak(tempStats: TempStats, endDate: Date): Streak[] {
    const current = tempStats.scrobbleStreak.current;
    if (current) {
      const currentStreak: Streak = {start: current.start, end: {artist: '?', track: '?', date: endDate}};
      ScrobbleStreakStack.calcLength(currentStreak);
      return [...tempStats.scrobbleStreak.streaks, currentStreak];
    } else {
      return tempStats.scrobbleStreak.streaks;
    }
  }

  getTop10(countMap: {},
           getValue: (k: any) => number,
           getItem: (k: string) => any,
           buildName: (item: any, value: number) => string,
           buildDescription: (item: any, value: number) => string,
           buildUrl?: (item: any) => string
  ): Top10Item[] {
    const keys = Object.keys(countMap);
    keys.sort((a, b) => getValue(getItem(b)) - getValue(getItem(a)));
    return keys.splice(0, this.listSize).map(k => {
      const item = getItem(k);
      const val = getValue(item);
      return {
        amount: val,
        name: buildName(item, val),
        description: buildDescription(item, val),
        url: buildUrl ? buildUrl(item) : undefined
      };
    });
  }

  getStreakTop10(streaks: Streak[], buildName: (s: Streak) => string, buildUrl?: (item: Streak) => string): Top10Item[] {
    const keys = Object.keys(streaks);
    keys.sort((a, b) => streaks[+b].length! - streaks[+a].length!);
    return keys.splice(0, this.listSize).map(k => {
      const streak = streaks[+k];
      return {
        amount: streak.length!,
        name: buildName(streak),
        description: streak.start.date.toLocaleDateString() + ' - ' + streak.end.date.toLocaleDateString(),
        url: buildUrl ? buildUrl(streak) : undefined
      };
    });
  }

  private including(artists: { [p: string]: { count: number; tracks: { [p: string]: number } } }): string {
    const keys = Object.keys(artists);
    keys.sort((a, b) => artists[b].count - artists[a].count);
    return 'Including ' + keys.splice(0, 3).join(', ');
  }

  private artistUrl(artist: string): string {
    return `${this.rootUrl}/music/${artist.replaceAll(' ', '+')}`;
  }

  private artistMonthUrl(artist: string, month: string): string {
    return this.monthUrl(month, this.artistUrl(artist));
  }

  protected emptyStats(): Stats {
    return {
      scrobbleStreak: [],
      notListenedStreak: [],
      betweenArtists: [],
      ongoingBetweenArtists: [],
      weeksPerArtist: [],
      tracksPerArtist: [],
      newArtistsPerMonth: [],
      mostListenedNewArtist: [],
      uniqueArtists: [],
      uniqueTracks: [],
      avgTrackPerArtist: [],
      oneHitWonders: [],
      scrobblesPerTrack: [],
      avgScrobbleDesc: [],
      avgScrobbleAsc: [],
    };
  }
}
