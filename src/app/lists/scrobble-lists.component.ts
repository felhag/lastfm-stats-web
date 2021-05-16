import {Component, OnInit} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute} from '@angular/router';
import {TempStats, MonthTrack, Streak, ScrobbleStreakStack} from '../model';
import {SettingsService} from '../service/settings.service';
import {StatsBuilderService} from '../service/stats-builder.service';
import {AbstractListsComponent, Top10Item} from './abstract-lists.component';
import {TrackStats} from './track-lists.component';

export interface ScrobbleStats {
  scrobbleStreak: Top10Item[];
  notListenedStreak: Top10Item[];
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

  protected emptyStats(): ScrobbleStats {
    return {
      scrobbleStreak: [],
      notListenedStreak: [],
    };
  }
}
