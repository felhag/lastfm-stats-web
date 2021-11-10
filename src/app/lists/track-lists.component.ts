import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TempStats, Streak, Track, Constants, Month, MonthItem } from '../model';
import { SettingsService } from '../service/settings.service';
import { StatsBuilderService } from '../service/stats-builder.service';
import { UrlBuilder } from '../util/url-builder';
import { AbstractListsComponent, Top10Item } from './abstract-lists.component';

export interface TrackStats {
  betweenTracks: Top10Item[];
  ongoingBetweenTracks: Top10Item[];
  weeksPerTrack: Top10Item[];
  uniquePerMonth: Top10Item[];
  newPerMonth: Top10Item[];
  avgScrobbleDesc: Top10Item [];
  avgScrobbleAsc: Top10Item[];
  trackStreak: Top10Item[];
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
    const gaps = this.calculateGaps(stats, stats.seenTracks, stats.betweenTracks, 'track', s => UrlBuilder.track(this.username, s.start.artist, s.start.track));
    next.betweenTracks = gaps[0];
    next.ongoingBetweenTracks = gaps[1];

    const seen = Object.values(stats.seenTracks);
    const monthsValues = Object.values(stats.monthList);
    const tracks: { [month: string]: { [track: string]: MonthItem } } = {};
    monthsValues.forEach(m => {
      const curr: { [track: string]: MonthItem } = {};
      tracks[m.alias] = curr;
      Object.values(m.artists).forEach(a => Object.values(a.tracks).forEach(t => curr[t.name] = t));
    });

    next.weeksPerTrack = this.getTrackTop10(seen, s => s.weeks.length, k => seen[+k], a => a.name, (i, v) => `${v} weeks`);
    next.uniquePerMonth = this.getMonthTop10(tracks, monthsValues, m => Object.keys(tracks[m]).length, (m, k) => `${m} (${k} unique tracks)`, m => this.including(tracks[m]));
    next.newPerMonth = this.getMonthTop10(tracks, monthsValues, m => Object.values(tracks[m]).filter(a => a.new).length, (m, k) => `${m} (${k} tracks)`, (m: string) => {
      // only show new artists in Including... text
      return this.including(Object.fromEntries(Object.entries(tracks[m]).filter(([, value]) => value.new)));
    });

    const seenThreshold = seen.filter(s => s.scrobbles.length >= Constants.SCROBBLE_TRACK_THRESHOLD);
    next.avgScrobbleDesc = this.getTrackTop10(seenThreshold, s => s.avgScrobble, k => seenThreshold[+k], a => `${a.name} (${a.scrobbles.length} scrobbles)`, (i, v) => new Date(v).toLocaleDateString());
    next.avgScrobbleAsc = this.getTrackTop10(seenThreshold, s => -s.avgScrobble, k => seenThreshold[+k], a => `${a.name} (${a.scrobbles.length} scrobbles)`, (i, v) => new Date(Math.abs(v)).toLocaleDateString());

    const now = new Date();
    const endDate = stats.last?.date || now;
    const streak = this.currentTrackStreak(stats, endDate);
    next.trackStreak = this.getStreakTop10(streak, (s: Streak) => `${s.start.artist} - ${s.start.track} (${s.length! + 1} times)`, s => UrlBuilder.day(this.username, s.start.date));
  }

  private currentTrackStreak(tempStats: TempStats, endDate: Date): Streak[] {
    const current = tempStats.trackStreak.current;
    if (current) {
      const currentStreak = this.ongoingStreak({start: current.start, end: {artist: '?', album: '?', track: '?', date: endDate}});
      return [...tempStats.trackStreak.streaks, currentStreak];
    } else {
      return tempStats.trackStreak.streaks;
    }
  }

  private getMonthTop10(tracks: { [month: string]: { [track: string]: MonthItem } },
                        months: Month[],
                        getValue: (k: string) => number,
                        buildName: (item: string, value: number) => string,
                        buildDescription: (item: string, value: number) => string): Top10Item[] {
    return this.getTop10<string>(tracks, getValue, k => k, buildName, buildDescription, m => UrlBuilder.month(this.username, m), m => months.find(x => x.alias === m)!.date);
  }

  private getTrackTop10(countMap: { [key: string]: any },
                        getValue: (k: Track) => number,
                        getItem: (k: string) => Track,
                        buildName: (item: Track, value: number) => string,
                        buildDescription: (item: Track, value: number) => string): Top10Item[] {
    const trackUrl = (item: Track) => UrlBuilder.track(this.username, item.artist, item.shortName);
    const trackDate = (item: Track) => new Date(item.avgScrobble);
    return this.getTop10<Track>(countMap, getValue, getItem, buildName, buildDescription, trackUrl, trackDate);
  }

  private including(tracks: { [p: string]: MonthItem }): string {
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
      trackStreak: [],
    };
  }
}
