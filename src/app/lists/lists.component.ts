import {Component, OnInit} from '@angular/core';
import {UntilDestroy, untilDestroyed} from '@ngneat/until-destroy';
import {BehaviorSubject} from 'rxjs';
import {filter} from 'rxjs/operators';
import {StatsBuilderService} from '../stats-builder.service';
import {Month, Streak, StreakStack, TempStats, ScrobbleStreakStack, Constants, Artist} from '../model';

export interface Top10Item {
  name: string;
  amount: number;
  description?: string;
  date?: string;
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
  avgTrackPerArtist: Top10Item[];
  oneHitWonders: Top10Item[];
  scrobblesPerTrack: Top10Item[];
}

@UntilDestroy()
@Component({
  selector: 'app-lists',
  templateUrl: './lists.component.html',
  styleUrls: ['./lists.component.scss']
})
export class ListsComponent implements OnInit {
  stats = new BehaviorSubject<Stats>(this.emptyStats());

  constructor(private builder: StatsBuilderService) {
  }

  ngOnInit(): void {
    this.builder.tempStats.pipe(
      untilDestroyed(this),
      filter(s => !!s.last)
    ).subscribe(stats => this.updateStats(stats));
  }

  private updateStats(tempStats: TempStats): void {
    const next = this.emptyStats();
    const endDate = tempStats.last!.date;
    const seen = Object.values(tempStats.seenArtists);
    const streak = this.currentScrobbleStreak(tempStats, endDate);
    next.scrobbleStreak = this.getStreakTop10(streak);
    next.notListenedStreak = this.getStreakTop10(tempStats.notListenedStreak.streaks);
    next.betweenArtists = this.getStreakTop10(tempStats.betweenArtists.streaks, s => `${s.start.artist} (${s.length} days)`);
    next.ongoingBetweenArtists = this.getStreakTop10(
      seen
        .map(a => a.betweenStreak)
        .map(a => ({start: a.start, end: {artist: a.start.artist, track: '?', date: endDate}}))
        .map(a => StreakStack.calcLength(a)),
      s => `${s.start.artist} (${s.length} days)`
    );

    const months = tempStats.monthList;
    const monthsValues = Object.values(months);
    monthsValues.forEach(m => {
      const values = Object.values(m.scrobblesPerArtist);
      const sum = values.reduce((a, b) => a + b, 0);
      m.avg = (sum / values.length) || 0;
    });

    next.newArtistsPerMonth = this.getTop10(months, m => m.newArtists.length, k => months[k], (m, k) => `${m.alias} (${k} artists)`, (m: Month) => {
      // only show new artists in Including... text
      const newArtists = m.newArtists.map(s => s.artist);
      const result = Object.keys(m.scrobblesPerArtist).filter(spa => newArtists.indexOf(spa) >= 0).reduce((r: any, e) => {
        r[e] = m.scrobblesPerArtist[e];
        return r;
      }, {});
      return this.including(result);
    });
    next.uniqueArtists = this.getTop10(months, m => Object.keys(m.scrobblesPerArtist).length, k => months[k], (m, k) => `${m.alias} (${k} unique artists)`, m => this.including(m.scrobblesPerArtist));

    const arr = Object.values(months)
      .map(m => Object.keys(m.scrobblesPerArtist)
        .filter(k => m.newArtists.map(a => a.artist).indexOf(k) >= 0)
        .map(a => ({artist: a, month: m.alias, amount: m.scrobblesPerArtist[a]})))
      .flat();
    const xTimes = (item: any, v: number) => `${v} times`;

    next.avgTrackPerArtist = this.getTop10(months, m => m.avg, k => months[k], (m, v) => `${m.alias} (${Math.round(v)} scrobbles per artist)`, v => this.including(v.scrobblesPerArtist));
    next.mostListenedNewArtist = this.getTop10(arr, a => a.amount, k => arr[+k], a => `${a.artist} (${a.month})`, xTimes);

    next.weeksPerArtist = this.getTop10(seen, s => s.weeks.length, k => seen[+k], a => a.name, (i, v) => `${v} weeks`);
    next.tracksPerArtist = this.getTop10(seen, s => s.tracks.length, k => seen[+k], a => a.name, (i, v) => `${v} tracks`);

    const ohw = seen.filter(a => a.tracks.length === 1);
    const sptDescription = (a: Artist, v: number) => `${Math.round(v)} scrobbles per track (${a.tracks.length} track${a.tracks.length > 1 ? 's' : '' })`;
    next.oneHitWonders = this.getTop10(ohw, s => s.scrobbleCount, k => ohw[+k], a => a.name + ' - ' + a.tracks[0], xTimes);
    next.scrobblesPerTrack = this.getTop10(seen, s => s.scrobbleCount / s.tracks.length, k => seen[+k], a => a.name, sptDescription);

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
           buildName: (k: any, value: number) => string,
           buildDescription: (item: any, value: number) => string
  ): Top10Item[] {
    const keys = Object.keys(countMap);
    keys.sort((a, b) => getValue(getItem(b)) - getValue(getItem(a)));
    return keys.splice(0, 10).map(k => {
      const item = getItem(k);
      const val = getValue(item);
      return {
        amount: val,
        name: buildName(item, val),
        description: buildDescription(item, val)
      };
    });
  }

  getStreakTop10(streaks: Streak[], buildName = (s: Streak) => `${s.length} days`): Top10Item[] {
    const keys = Object.keys(streaks);
    keys.sort((a, b) => streaks[+b].length! - streaks[+a].length!);
    return keys.splice(0, 10).map(k => {
      const streak = streaks[+k];
      return {
        amount: streak.length!,
        name: buildName(streak),
        description: streak.start.date.toLocaleDateString() + ' - ' + streak.end.date.toLocaleDateString()
      };
    });
  }

  private including(scrobblesPerArtist: { [key: string]: number }): string {
    const keys = Object.keys(scrobblesPerArtist);
    keys.sort((a, b) => scrobblesPerArtist[b] - scrobblesPerArtist[a]);
    return 'Including ' + keys.splice(0, 3).join(', ');
  }

  private emptyStats(): Stats {
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
      avgTrackPerArtist: [],
      oneHitWonders: [],
      scrobblesPerTrack: [],
    };
  }
}
