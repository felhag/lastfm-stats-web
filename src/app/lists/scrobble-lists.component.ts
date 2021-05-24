import {Component, OnInit} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute} from '@angular/router';
import {TempStats, Streak, ScrobbleStreakStack} from '../model';
import {SettingsService} from '../service/settings.service';
import {StatsBuilderService} from '../service/stats-builder.service';
import {AbstractListsComponent, Top10Item} from './abstract-lists.component';

export interface ScrobbleStats {
  scrobbleStreak: Top10Item[];
  notListenedStreak: Top10Item[];
  mostScrobblesPerDay: Top10Item[];
  mostScrobblesPerWeek: Top10Item[];
}

@Component({
  selector: 'app-scrobble-lists',
  templateUrl: './scrobble-lists.component.html',
  styleUrls: ['./lists.component.scss']
})
export class ScrobbleListsComponent extends AbstractListsComponent<ScrobbleStats> implements OnInit {
  constructor(builder: StatsBuilderService, settings: SettingsService, route: ActivatedRoute, snackbar: MatSnackBar) {
    super(builder, settings, route, snackbar);
  }

  protected doUpdate(stats: TempStats, next: ScrobbleStats): void {
    const now = new Date();
    const endDate = stats.last?.date || now;
    const streak = this.currentScrobbleStreak(stats, endDate);
    next.scrobbleStreak = this.getStreakTop10(streak, (s: Streak) => `${s.length! + 1} days`);
    next.notListenedStreak = this.getStreakTop10(stats.notListenedStreak.streaks, (s: Streak) => `${s.length! - 1} days`);
    next.mostScrobblesPerDay = this.getTop10<number>(stats.specificDays, k => stats.specificDays[k], k => +k, k => this.dateString(k), (k, n) => `${n} scrobbles`, k => this.dayUrl(k));
    next.mostScrobblesPerWeek = this.getTop10<string>(stats.specificWeeks, k => stats.specificWeeks[k], k => k, k => k, (k, n) => `${n} scrobbles`, k => this.weekUrl(k));
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

  private weekUrl(weekYear: string): string {
    const week = parseInt(weekYear.substring(1, 3));
    const year = parseInt(weekYear.substring(weekYear.length - 4));
    const start = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = start.getDay();
    start.setDate(dow <= 4 ? start.getDate() - start.getDay() + 1 : start.getDate() + 8 - start.getDay());
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    return `${this.rootUrl}?from=${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}&to=${end.getFullYear()}-${end.getMonth() + 1}-${end.getDate()}`;
  }

  private dayUrl(day: number): string {
    const date = new Date(day);
    return `${this.rootUrl}?from=${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}&rangetype=1day`;
  }

  protected emptyStats(): ScrobbleStats {
    return {
      scrobbleStreak: [],
      notListenedStreak: [],
      mostScrobblesPerDay: [],
      mostScrobblesPerWeek: [],
    };
  }
}
