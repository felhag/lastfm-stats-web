import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TempStats, Album, Constants } from 'projects/shared/src/lib/app/model';
import { SettingsService } from 'projects/shared/src/lib/service/settings.service';
import { StatsBuilderService } from 'projects/shared/src/lib/service/stats-builder.service';
import { AbstractListsComponent, Top10Item } from 'projects/shared/src/lib/lists/abstract-lists.component';
import { AbstractUrlService } from '../service/abstract-url.service';

export interface AlbumStats {
  betweenAlbums: Top10Item[];
  ongoingBetweenAlbums: Top10Item[];
  weeksPerAlbum: Top10Item[];
  albumStreak: Top10Item[];
  avgScrobbleDesc: Top10Item [];
  avgScrobbleAsc: Top10Item[];
  climbers: Top10Item[];
  fallers: Top10Item[];
}

@Component({
  selector: 'app-album-lists',
  templateUrl: './album-lists.component.html',
  styleUrls: ['./lists.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AlbumListsComponent extends AbstractListsComponent<AlbumStats> {
  protected forcedThreshold = Constants.SCROBBLE_ALBUM_THRESHOLD;

  constructor(builder: StatsBuilderService, settings: SettingsService, private url: AbstractUrlService) {
    super(builder, settings, url);
  }

  protected doUpdate(stats: TempStats, next: AlbumStats): void {
    const seen = this.seenThreshold(stats.seenAlbums);
    const gaps = this.calculateGaps(stats, seen, stats.betweenAlbums, 'album', s => this.url.album(s.start.artist, s.start.album));
    const albumUrl = (item: Album) => this.url.album(item.artist, item.shortName);
    const albumDate = (item: Album) => new Date(item.avgScrobble);

    next.betweenAlbums = gaps[0];
    next.ongoingBetweenAlbums = gaps[1];
    next.weeksPerAlbum = this.getTop10<Album>(seen, s => s.weeks.length, k => seen[+k], a => a.name, (i, v) => `${v} weeks`, albumUrl, albumDate);
    next.albumStreak = this.consecutiveStreak(stats, stats.albumStreak, s => `${s.start.artist} - ${s.start.album} (${s.length} times)`);

    const seenThreshold = this.forceThreshold(seen);
    next.avgScrobbleDesc = this.getAlbumTop10(seenThreshold, s => s.avgScrobble, k => seenThreshold[+k], a => `${a.name} (${a.scrobbles.length} scrobbles)`, (i, v) => new Date(v).toLocaleDateString());
    next.avgScrobbleAsc = this.getAlbumTop10(seenThreshold, s => -s.avgScrobble, k => seenThreshold[+k], a => `${a.name} (${a.scrobbles.length} scrobbles)`, (i, v) => new Date(Math.abs(v)).toLocaleDateString());

    const rankings = this.getRankings(seen, Object.values(stats.monthList), (i, m) => this.url.albumMonth(i.artist, i.shortName, m));
    next.climbers = rankings.climbers;
    next.fallers = rankings.fallers;
  }

  private getAlbumTop10(countMap: { [key: string]: any },
                        getValue: (k: Album) => number,
                        getItem: (k: string) => Album,
                        buildName: (item: Album, value: number) => string,
                        buildDescription: (item: Album, value: number) => string): Top10Item[] {
    const albumUrl = (item: Album) => this.url.album(item.artist, item.shortName);
    const albumDate = (item: Album) => new Date(item.avgScrobble);
    return this.getTop10<Album>(countMap, getValue, getItem, buildName, buildDescription, albumUrl, albumDate);
  }

  protected emptyStats(): AlbumStats {
    return {
      betweenAlbums: [],
      ongoingBetweenAlbums: [],
      weeksPerAlbum: [],
      albumStreak: [],
      avgScrobbleDesc: [],
      avgScrobbleAsc: [],
      climbers: [],
      fallers: [],
    };
  }
}
