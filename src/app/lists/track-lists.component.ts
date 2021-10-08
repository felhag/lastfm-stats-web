import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {TempStats, MonthTrack, Track, Constants} from '../model';
import {SettingsService} from '../service/settings.service';
import {StatsBuilderService} from '../service/stats-builder.service';
import {AbstractListsComponent, Top10Item} from './abstract-lists.component';

export interface TrackStats {
  betweenTracks: Top10Item[];
  ongoingBetweenTracks: Top10Item[];
  weeksPerTrack: Top10Item[];
  uniquePerMonth: Top10Item[];
  newPerMonth: Top10Item[];
  avgScrobbleDesc: Top10Item [];
  avgScrobbleAsc: Top10Item[];
}

@Component({
  selector: 'app-track-lists',
  templateUrl: './track-lists.component.html',
  styleUrls: ['./lists.component.scss']
})
export class TrackListsComponent extends AbstractListsComponent<TrackStats> implements OnInit {
  constructor(builder: StatsBuilderService, settings: SettingsService, route: ActivatedRoute) {
    super(builder, settings, route);
  }

  protected doUpdate(stats: TempStats, next: TrackStats): void {
    const gaps = this.calculateGaps(stats, stats.seenTracks, stats.betweenTracks, 'track', s => this.trackUrl(s.start.artist, s.start.track));
    next.betweenTracks = gaps[0];
    next.ongoingBetweenTracks = gaps[1];

    const seen = Object.values(stats.seenTracks);
    const monthsValues = Object.values(stats.monthList);
    const tracks: { [month: string]: { [track: string]: MonthTrack } } = {};
    monthsValues.forEach(m => {
      const curr: { [track: string]: MonthTrack } = {};
      tracks[m.alias] = curr;
      Object.values(m.artists).forEach(a => Object.values(a.tracks).forEach(t => curr[t.name] = t));
    });

    const trackUrl = (item: Track) => this.trackUrl(item.artist, item.name.substring((item.artist + ' - ').length));
    next.weeksPerTrack = this.getTop10<Track>(seen, s => s.weeks.length, k => seen[+k], a => a.name, (i, v) => `${v} weeks`, trackUrl);
    next.uniquePerMonth = this.getTop10<string>(tracks, m => Object.keys(tracks[m]).length, k => k, (m, k) => `${m} (${k} unique tracks)`, (m, k) => this.including(tracks[m]), m => this.monthUrl(m));
    next.newPerMonth = this.getTop10(tracks, m => Object.values(tracks[m]).filter(a => a.new).length, k => k, (m, k) => `${m} (${k} tracks)`, (m: string) => {
      // only show new artists in Including... text
      return this.including(Object.fromEntries(Object.entries(tracks[m]).filter(([, value]) => value.new)));
    }, m => this.monthUrl(m));

    const seenThreshold = seen.filter(s => s.scrobbleCount >= Constants.SCROBBLE_TRACK_THRESHOLD);
    next.avgScrobbleDesc = this.getTop10<Track>(seenThreshold, s => s.avgScrobble, k => seenThreshold[+k], a => `${a.name} (${a.scrobbleCount} scrobbles)`, (i, v) => new Date(v).toLocaleDateString(), trackUrl);
    next.avgScrobbleAsc = this.getTop10<Track>(seenThreshold, s => -s.avgScrobble, k => seenThreshold[+k], a => `${a.name} (${a.scrobbleCount} scrobbles)`, (i, v) => new Date(Math.abs(v)).toLocaleDateString(), trackUrl);
  }

  private including(tracks: { [p: string]: MonthTrack }): string {
    const keys = Object.keys(tracks);
    keys.sort((a, b) => tracks[b].count - tracks[a].count);
    return 'Including ' + keys.splice(0, 3).join(', ');
  }

  protected emptyStats(): TrackStats {
    return {
      betweenTracks: [],
      ongoingBetweenTracks: [],
      weeksPerTrack: [],
      uniquePerMonth: [],
      newPerMonth: [],
      avgScrobbleDesc: [],
      avgScrobbleAsc: [],
    };
  }

  private trackUrl(artist: string, track: string): string {
    const urlArtist = encodeURIComponent(artist);
    const urlTrack = encodeURIComponent(track);
    return `${this.rootUrl}/music/${urlArtist}/_/${urlTrack}`;
  }
}
