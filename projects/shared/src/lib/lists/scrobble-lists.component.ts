import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { TempStats, Streak } from 'projects/shared/src/lib/app/model';
import { SettingsService } from 'projects/shared/src/lib/service/settings.service';
import { StatsBuilderService } from 'projects/shared/src/lib/service/stats-builder.service';
import { AbstractListsComponent, Top10Item } from 'projects/shared/src/lib/lists/abstract-lists.component';
import { AbstractUrlService } from '../service/abstract-url.service';

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
  styleUrls: ['./lists.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScrobbleListsComponent extends AbstractListsComponent<ScrobbleStats> implements OnInit {
  protected forcedThreshold = -1;

  constructor(builder: StatsBuilderService, settings: SettingsService, private url: AbstractUrlService) {
    super(builder, settings, url);
  }

  protected doUpdate(stats: TempStats, next: ScrobbleStats): void {
    next.scrobbleStreak = this.consecutiveStreak(stats, stats.scrobbleStreak, s => `${s.length! + 1} days`);
    next.notListenedStreak = this.getStreakTop10(stats.notListenedStreak.streaks, (s: Streak) => `${s.length! - 1} days`, s => this.url.range(s.start.date, s.end.date));
    next.mostScrobblesPerDay = this.getTop10<number>(stats.specificDays, k => stats.specificDays[k].length, k => +k, k => this.dateString(k), (k, n) => `${n} scrobbles`, k => this.url.day(new Date(k)), k => new Date(k));
    next.mostScrobblesPerWeek = this.getTop10<string>(stats.specificWeeks, k => stats.specificWeeks[k], k => k, k => k, (k, n) => `${n} scrobbles`, k => this.url.week(k), k => this.url.weekAsDate(k));

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
    }, i => this.dateString(parseInt(i)), k => this.url.dayArtist(parseInt(k), artistPerDay[k].name), k => new Date(parseInt(k)));
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
