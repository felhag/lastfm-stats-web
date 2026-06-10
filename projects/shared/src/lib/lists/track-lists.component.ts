import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { TempStats, Track, Constants, Month } from 'projects/shared/src/lib/app/model';
import { AbstractListsComponent, ListProvider } from 'projects/shared/src/lib/lists/abstract-lists.component';
import { AbstractUrlService } from '../service/abstract-url.service';
import { TranslatePipe } from 'projects/shared/src/lib/service/translate.pipe';
import { Top10listComponent } from './top10list/top10list.component';
import { AsyncPipe } from '@angular/common';

export interface TrackStats {
  betweenTracks: ListProvider;
  ongoingBetweenTracks: ListProvider;
  weeksPerTrack: ListProvider;
  uniquePerMonth: ListProvider;
  newPerMonth: ListProvider;
  avgScrobbleDesc: ListProvider;
  avgScrobbleAsc: ListProvider;
  trackStreak: ListProvider;
  climbers: ListProvider;
  fallers: ListProvider;
}

@Component({
    selector: 'app-track-lists',
    templateUrl: './track-lists.component.html',
    styleUrls: ['./lists.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [Top10listComponent, AsyncPipe, TranslatePipe]
})
export class TrackListsComponent extends AbstractListsComponent<TrackStats> {
  private url = inject(AbstractUrlService);
  protected forcedThreshold = Constants.SCROBBLE_TRACK_THRESHOLD;

  protected doUpdate(stats: TempStats, next: TrackStats): void {
    const seen = this.seenThreshold(stats.seenTracks);
    const gaps = this.calculateGaps(stats, seen, stats.betweenTracks, 'track', s => this.url.track(s.start.artist, s.start.track));
    next.betweenTracks = gaps[0];
    next.ongoingBetweenTracks = gaps[1];

    const months = stats.monthList;
    const monthsValues = Object.values(stats.monthList);

    next.weeksPerTrack = this.getTrackTop10(seen, s => s.weeks.size, k => seen[+k], a => a.name, (i, v) => `${v} weeks`);
    next.uniquePerMonth = this.getMonthTop10(months, m => m.tracks.size, (m, k) => `${m.alias} (${k} unique tracks)`, m => this.including([...m.tracks.values()]));
    next.newPerMonth = this.getMonthTop10(months, m => [...m.tracks.values()].filter(a => a.new).length, (m, k) => `${m.alias} (${k} tracks)`, m => {
      // only show new artists in Including... text
      return this.including([...m.tracks.values()].filter(a => a.new));
    });

    const seenThreshold = this.forceThreshold(seen);
    next.avgScrobbleDesc = this.getTrackTop10(seenThreshold, s => s.avgScrobble, k => seenThreshold[+k], a => `${a.name} (${a.scrobbles.length} scrobbles)`, (i, v) => new Date(v).toLocaleDateString());
    next.avgScrobbleAsc = this.getTrackTop10(seenThreshold, s => -s.avgScrobble, k => seenThreshold[+k], a => `${a.name} (${a.scrobbles.length} scrobbles)`, (i, v) => new Date(Math.abs(v)).toLocaleDateString());
    next.trackStreak = this.consecutiveStreak(stats, stats.trackStreak, s => `${s.start.artist} - ${s.start.track} (${s.length} times)`);

    const rankings = this.getRankings(seenThreshold, monthsValues, (i, m) => this.url.trackMonth(i.artist, i.shortName, m));
    next.climbers = rankings.climbers;
    next.fallers = rankings.fallers;
  }

  private getMonthTop10(countMap: { [key: string]: any },
                        getValue: (k: Month) => number,
                        buildName: (item: Month, value: number) => string,
                        buildDescription: (item: Month, value: number) => string): ListProvider {
    return this.getTop10<Month>(countMap, getValue, k => countMap[k], buildName, buildDescription, item => this.url.month(item.alias), item => item.date, v => v > 0);
  }

  private getTrackTop10(countMap: { [key: string]: any },
                        getValue: (k: Track) => number,
                        getItem: (k: string) => Track,
                        buildName: (item: Track, value: number) => string,
                        buildDescription: (item: Track, value: number) => string): ListProvider {
    const trackUrl = (item: Track) => this.url.track(item.artist, item.shortName);
    const trackDate = (item: Track) => new Date(item.avgScrobble);
    return this.getTop10<Track>(countMap, getValue, getItem, buildName, buildDescription, trackUrl, trackDate);
  }

  protected emptyStats(): TrackStats {
    return {
      betweenTracks: ListProvider.eager([]),
      ongoingBetweenTracks: ListProvider.eager([]),
      weeksPerTrack: ListProvider.eager([]),
      uniquePerMonth: ListProvider.eager([]),
      newPerMonth: ListProvider.eager([]),
      avgScrobbleDesc: ListProvider.eager([]),
      avgScrobbleAsc: ListProvider.eager([]),
      trackStreak: ListProvider.eager([]),
      climbers: ListProvider.eager([]),
      fallers: ListProvider.eager([]),
    };
  }
}
