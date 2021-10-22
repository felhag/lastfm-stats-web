import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {TempStats, Streak} from '../model';
import {SettingsService} from '../service/settings.service';
import {StatsBuilderService} from '../service/stats-builder.service';
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
    next.mostScrobblesPerDay = this.getTop10<number>(stats.specificDays, k => stats.specificDays[k].length, k => +k, k => this.dateString(k), (k, n) => `${n} scrobbles`, k => this.dayUrl(k), k => new Date(k));
    next.mostScrobblesPerWeek = this.getTop10<string>(stats.specificWeeks, k => stats.specificWeeks[k], k => k, k => k, (k, n) => `${n} scrobbles`, k => this.weekUrl(k), k => this.weekAsDate(k));

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
    }, i => this.dateString(parseInt(i)), k => this.dayArtistUrl(parseInt(k), artistPerDay[k].name), k => new Date(parseInt(k)));
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

  private weekUrl(weekYear: string): string {
    const start = this.weekAsDate(weekYear);
    const dow = start.getDay();
    start.setDate(dow <= 4 ? start.getDate() - start.getDay() + 1 : start.getDate() + 8 - start.getDay());
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    return `${this.rootUrl}?from=${this.dateUrlParameter(start)}&to=${this.dateUrlParameter(end)}`;
  }

  private weekAsDate(weekYear: string): Date {
    const week = parseInt(weekYear.substring(1, 3));
    const year = parseInt(weekYear.substring(weekYear.length - 4));
    return new Date(year, 0, 1 + (week - 1) * 7);
  }

  private dayUrl(day: number): string {
    return `${this.rootUrl}?from=${this.dateUrlParameter(new Date(day))}&rangetype=1day`;
  }

  private dateUrlParameter(date: Date): string {
     return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }

  private dayArtistUrl(day: number, artist: string): string {
    return `${this.rootUrl}/music/${encodeURIComponent(artist)}?from=${this.dateUrlParameter(new Date(day))}&rangetype=1day`;
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
