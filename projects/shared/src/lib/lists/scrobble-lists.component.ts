import { Component, inject } from '@angular/core';
import { TempStats, Streak } from 'projects/shared/src/lib/app/model';
import { AbstractListsComponent, ListProvider } from 'projects/shared/src/lib/lists/abstract-lists.component';
import { AbstractUrlService } from '../service/abstract-url.service';
import { TranslatePipe } from 'projects/shared/src/lib/service/translate.pipe';
import { Top10listComponent } from './top10list/top10list.component';
import { AsyncPipe } from '@angular/common';

export interface ScrobbleStats {
  scrobbleStreak: ListProvider;
  notListenedStreak: ListProvider;
  mostScrobblesPerDay: ListProvider;
  mostScrobblesPerWeek: ListProvider;
  mostScrobbledArtistPerDay: ListProvider;
  longestSessions: ListProvider;
}


@Component({
    selector: 'app-scrobble-lists',
    templateUrl: './scrobble-lists.component.html',
    styleUrls: ['./lists.component.scss'],
    imports: [Top10listComponent, AsyncPipe, TranslatePipe]
})
export class ScrobbleListsComponent extends AbstractListsComponent<ScrobbleStats> {
  private url = inject(AbstractUrlService);
  private translate = inject(TranslatePipe);
  protected forcedThreshold = -1;
  private readonly dateTimeFormat: Intl.DateTimeFormatOptions = {dateStyle: 'short', timeStyle: 'short'};

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

    next.longestSessions = this.longestSessions(stats);
  }

  private longestSessions(stats: TempStats): ListProvider {
    const current = stats.sessions.current;
    // the ongoing session hasn't been added to the stack yet
    const sessions = current && current.length! > 1 ? [...stats.sessions.streaks, current] : stats.sessions.streaks;
    const scrobbles = this.translate.transform('translate.scrobbles');
    return ListProvider.build(sessions.map((s, idx) => [String(idx), s.length!]), (k, count) => {
      const session = sessions[+k];
      const start = session.start.date;
      const end = session.end.date;
      return {
        amount: count,
        name: `${count} ${scrobbles} (${this.duration(end.getTime() - start.getTime())})`,
        description: `${start.toLocaleString([], this.dateTimeFormat)} - ${end.toLocaleString([], this.dateTimeFormat)}`,
        url: this.url.range(start, end),
        date: new Date(start.getTime() + (end.getTime() - start.getTime()) / 2),
      };
    });
  }

  private duration(ms: number): string {
    const minutes = Math.round(ms / 60000);
    const hours = Math.floor(minutes / 60);
    return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
  }

  protected emptyStats(): ScrobbleStats {
    return {
      scrobbleStreak: ListProvider.eager([]),
      notListenedStreak: ListProvider.eager([]),
      mostScrobblesPerDay: ListProvider.eager([]),
      mostScrobblesPerWeek: ListProvider.eager([]),
      mostScrobbledArtistPerDay: ListProvider.eager([]),
      longestSessions: ListProvider.eager([])
    };
  }
}
