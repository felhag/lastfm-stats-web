import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {TempStats, Streak} from '../model';
import {SettingsService} from '../service/settings.service';
import {StatsBuilderService} from '../service/stats-builder.service';
import { UrlBuilder } from '../util/url-builder';
import {AbstractListsComponent, Top10Item} from './abstract-lists.component';

export interface ScrobbleStats {
  scrobbleStreak: Top10Item[];
  notListenedStreak: Top10Item[];
  mostScrobblesPerDay: Top10Item[];
  mostScrobblesPerWeek: Top10Item[];
  mostScrobbledArtistPerDay: Top10Item[];
}

@Component({
  selector: 'app-scrobble-lists',
  templateUrl: './scrobble-lists.component.html',
  styleUrls: ['./lists.component.scss']
})
export class ScrobbleListsComponent extends AbstractListsComponent<ScrobbleStats> implements OnInit {
  constructor(builder: StatsBuilderService, settings: SettingsService, route: ActivatedRoute) {
    super(builder, settings, route);
  }

  protected doUpdate(stats: TempStats, next: ScrobbleStats): void {
    const now = new Date();
    const endDate = stats.last?.date || now;
    const streak = this.currentScrobbleStreak(stats, endDate);
    next.scrobbleStreak = this.getStreakTop10(streak, (s: Streak) => `${s.length! + 1} days`);
    next.notListenedStreak = this.getStreakTop10(stats.notListenedStreak.streaks, (s: Streak) => `${s.length! - 1} days`);
    next.mostScrobblesPerDay = this.getTop10<number>(stats.specificDays, k => stats.specificDays[k].length, k => +k, k => this.dateString(k), (k, n) => `${n} scrobbles`, k => UrlBuilder.day(this.username, new Date(k)), k => new Date(k));
    next.mostScrobblesPerWeek = this.getTop10<string>(stats.specificWeeks, k => stats.specificWeeks[k], k => k, k => k, (k, n) => `${n} scrobbles`, k => UrlBuilder.week(this.username, k), k => UrlBuilder.weekAsDate(k));

    const artistPerDay = Object.fromEntries(Object.entries(stats.specificDays).map(([day, tracks]) => {
      const artistCounts = tracks.reduce((acc, track) => {
        acc[track.artist] = (acc[track.artist] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });
      const mostListenedArtist = Object.keys(artistCounts).reduce((a, b) => artistCounts[a] > artistCounts[b] ? a : b);
      return [day, {
        name: mostListenedArtist,
        count: artistCounts[mostListenedArtist]
      }];
    }));

    next.mostScrobbledArtistPerDay = this.getTop10(artistPerDay, (k: string) => artistPerDay[k].count, k => k, key => {
      const obj = artistPerDay[key];
      return `${obj.name} (${obj.count} times)`;
    }, i => this.dateString(parseInt(i)), k => UrlBuilder.dayArtist(this.username, parseInt(k), artistPerDay[k].name), k => new Date(parseInt(k)));
  }

  private currentScrobbleStreak(tempStats: TempStats, endDate: Date): Streak[] {
    const current = tempStats.scrobbleStreak.current;
    if (current) {
      const currentStreak = this.ongoingStreak({start: current.start, end: {artist: '?', album: '?', track: '?', date: endDate}});
      return [...tempStats.scrobbleStreak.streaks, currentStreak];
    } else {
      return tempStats.scrobbleStreak.streaks;
    }
  }

  protected emptyStats(): ScrobbleStats {
    return {
      scrobbleStreak: [],
      notListenedStreak: [],
      mostScrobblesPerDay: [],
      mostScrobblesPerWeek: [],
      mostScrobbledArtistPerDay: []
    };
  }
}
