import {Component, OnInit} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute} from '@angular/router';
import {Month, Streak, StreakStack, TempStats, ScrobbleStreakStack, Artist, Constants, MonthArtist} from '../model';
import {SettingsService} from '../service/settings.service';
import {StatsBuilderService} from '../service/stats-builder.service';
import {AbstractListsComponent, Top10Item} from './abstract-lists.component';

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
}

@Component({
  selector: 'app-lists',
  templateUrl: './artist-lists.component.html',
  styleUrls: ['./lists.component.scss']
})
export class ArtistListsComponent extends AbstractListsComponent<ArtistStats> implements OnInit {
  constructor(builder: StatsBuilderService, settings: SettingsService, route: ActivatedRoute, snackbar: MatSnackBar) {
    super(builder, settings, route, snackbar);
  }

  protected doUpdate(stats: TempStats, next: ArtistStats): void {
    const seen = Object.values(stats.seenArtists);
    const now = new Date();
    next.betweenArtists = this.getStreakTop10(stats.betweenArtists.streaks, s => `${s.start.artist} (${s.length! - 1} days)`, s => this.artistUrl(s.start.artist));
    next.ongoingBetweenArtists = this.getStreakTop10(
      seen
        .map(a => a.betweenStreak)
        .map(a => ({start: a.start, end: {artist: a.start.artist, track: '?', date: now}}))
        .map(a => StreakStack.calcLength(a)),
      s => `${s.start.artist} (${s.length} days)`,
      s => this.artistUrl(s.start.artist)
    );

    const months = stats.monthList;
    const monthsValues = Object.values(months);
    monthsValues.forEach(m => {
      const values = Object.values(m.artists).map(a => a.count);
      const sum = values.reduce((a, b) => a + b, 0);
      m.avg = (sum / values.length) || 0;
    });

    const artistUrl = (item: Artist) => this.artistUrl(item.name);
    const monthUrl = (item: Month) => this.monthUrl(item.alias);
    next.newArtistsPerMonth = this.getTop10(months, m => Object.values(m.artists).filter(a => (a as any).new).length, k => months[k], (m, k) => `${m.alias} (${k} artists)`, (m: Month) => {
      // only show new artists in Including... text
      const newArtists = Object.values(m.artists).filter(a => a.new).map(s => s.name);
      const result = Object.keys(m.artists).filter(spa => newArtists.indexOf(spa) >= 0).reduce((r: any, e) => {
        r[e] = m.artists[e].count;
        return r;
      }, {});
      return this.including(result);
    }, monthUrl);

    next.uniqueArtists = this.getTop10<Month>(months, m => Object.keys(m.artists).length, k => months[k], (m, k) => `${m.alias} (${k} unique artists)`, (m: Month) => this.including(m.artists), monthUrl);

    const arr = Object.values(months)
      .map(m => Object.values(m.artists).filter(a => a.new).map(a => ({artist: a.name, month: m.alias, amount: a.count})))
      .flat();
    const xTimes = (item: any, v: number) => `${v} times`;

    next.avgTrackPerArtist = this.getTop10<Month>(months, m => m.avg!, k => months[k], (m, v) => `${m.alias} (${Math.round(v)} scrobbles per artist)`, v => this.including(v.artists), monthUrl);
    next.mostListenedNewArtist = this.getTop10(arr, a => a.amount, k => arr[+k], a => `${a.artist} (${a.month})`, xTimes, a => this.artistMonthUrl(a.artist, a.month));

    next.weeksPerArtist = this.getTop10<Artist>(seen, s => s.weeks.length, k => seen[+k], a => a.name, (i, v) => `${v} weeks`, artistUrl);
    next.tracksPerArtist = this.getTop10<Artist>(seen, s => s.tracks.length, k => seen[+k], a => a.name, (i, v) => `${v} tracks`, artistUrl);

    const seenThreshold = seen.filter(s => s.scrobbleCount >= Constants.SCROBBLE_ARTIST_THRESHOLD);
    const ohw = seen.filter(a => a.tracks.length === 1);
    const sptDescription = (a: Artist, v: number) => `${Math.round(v)} scrobbles per track (${a.tracks.length} track${a.tracks.length > 1 ? 's' : ''})`;
    next.oneHitWonders = this.getTop10<Artist>(ohw, s => s.scrobbleCount, k => ohw[+k], a => a.name + ' - ' + a.tracks[0], xTimes, artistUrl);
    next.scrobblesPerTrack = this.getTop10<Artist>(seenThreshold, s => s.scrobbleCount / s.tracks.length, k => seenThreshold[+k], a => a.name, sptDescription, artistUrl);

    next.avgScrobbleDesc = this.getTop10<Artist>(seenThreshold, s => s.avgScrobble, k => seenThreshold[+k], a => `${a.name} (${a.scrobbleCount} scrobbles)`, (i, v) => this.dateString(v), artistUrl);
    next.avgScrobbleAsc = this.getTop10<Artist>(seenThreshold, s => -s.avgScrobble, k => seenThreshold[+k], a => `${a.name} (${a.scrobbleCount} scrobbles)`, (i, v) => this.dateString(Math.abs(v)), artistUrl);
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
    };
  }
  }
