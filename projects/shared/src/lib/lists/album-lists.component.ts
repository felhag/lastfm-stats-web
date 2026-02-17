import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TempStats, Album, Constants, Track, StreakItem, App } from 'projects/shared/src/lib/app/model';
import { SettingsService } from 'projects/shared/src/lib/service/settings.service';
import { StatsBuilderService } from 'projects/shared/src/lib/service/stats-builder.service';
import { AbstractListsComponent, Top10Item } from 'projects/shared/src/lib/lists/abstract-lists.component';
import { AbstractUrlService } from '../service/abstract-url.service';
import { normalizeName } from '../service/normalize-name';
import { TranslatePipe } from 'projects/shared/src/lib/service/translate.pipe';
import { Top10listComponent } from './top10list/top10list.component';
import { AsyncPipe } from '@angular/common';

export interface AlbumStats {
  betweenAlbums: Top10Item[];
  ongoingBetweenAlbums: Top10Item[];
  weeksPerAlbum: Top10Item[];
  albumStreak: Top10Item[];
  avgScrobbleDesc: Top10Item [];
  avgScrobbleAsc: Top10Item[];
  climbers: Top10Item[];
  fallers: Top10Item[];
  differentArtists: Top10Item[];
  withoutAlbum: Top10Item[];
}

@Component({
    selector: 'app-album-lists',
    templateUrl: './album-lists.component.html',
    styleUrls: ['./lists.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [Top10listComponent, AsyncPipe, TranslatePipe]
})
export class AlbumListsComponent extends AbstractListsComponent<AlbumStats> {
  protected forcedThreshold = Constants.SCROBBLE_ALBUM_THRESHOLD;

  constructor(builder: StatsBuilderService,
              settings: SettingsService,
              private url: AbstractUrlService,
              private translate: TranslatePipe,
              private app: App) {
    super(builder, settings, url);
  }

  protected doUpdate(stats: TempStats, next: AlbumStats): void {
    const seen = this.seenThreshold(stats.seenAlbums);
    const norm = this.settingsObj?.filterRemasters ? normalizeName : (n: string) => n;
    const gaps = this.calculateGaps(stats, seen, stats.betweenAlbums, 'album', s => this.url.album(s.start.artist, norm(s.start.album)));
    const albumDate = (item: StreakItem) => new Date(item.avgScrobble);
    const scrobbles = this.translate.transform('translate.scrobbles');

    next.betweenAlbums = gaps[0];
    next.ongoingBetweenAlbums = gaps[1];
    next.weeksPerAlbum = this.getTop10<Album>(seen, s => s.weeks.length, k => seen[+k], a => a.name, (i, v) => `${v} weeks`, this.albumUrlFnc, albumDate);
    next.albumStreak = this.consecutiveStreak(stats, stats.albumStreak, s => `${s.start.artist} - ${norm(s.start.album)} (${s.length} times)`);

    const seenThreshold = this.forceThreshold(seen);
    next.avgScrobbleDesc = this.getAlbumTop10(seenThreshold, s => s.avgScrobble, k => seenThreshold[+k], a => `${a.name} (${a.scrobbles.length} ${scrobbles})`, (i, v) => new Date(v).toLocaleDateString());
    next.avgScrobbleAsc = this.getAlbumTop10(seenThreshold, s => -s.avgScrobble, k => seenThreshold[+k], a => `${a.name} (${a.scrobbles.length} ${scrobbles})`, (i, v) => new Date(Math.abs(v)).toLocaleDateString());

    const rankings = this.getRankings(seenThreshold, Object.values(stats.monthList), (i, m) => this.url.albumMonth(i.artists[0], i.shortName, m));
    next.climbers = rankings.climbers;
    next.fallers = rankings.fallers;

    if (this.isLastFm) {
      next.differentArtists = this.getTop10<Album>(seen, s => s.artists.length, k => seen[+k], a => `${a.shortName} (${a.scrobbles.length} ${scrobbles})`, (a, v) => `${v} artists`, this.albumUrlFnc, albumDate).filter(top => top.amount > 1);

      const tracks = this.seenThreshold(stats.seenTracks);
      next.withoutAlbum = this.getTop10<Track>(seen, s => s.scrobbles.length - s.withAlbum, k => tracks[+k], a => a.name, (_, v) => `${v} ${scrobbles}`, t => this.url.track(t.artist, t.shortName), albumDate).filter(top => top.amount > 0);
    }
  }

  private getAlbumTop10(countMap: { [key: string]: any },
                        getValue: (k: Album) => number,
                        getItem: (k: string) => Album,
                        buildName: (item: Album, value: number) => string,
                        buildDescription: (item: Album, value: number) => string): Top10Item[] {
    const albumDate = (item: Album) => new Date(item.avgScrobble);
    return this.getTop10<Album>(countMap, getValue, getItem, buildName, buildDescription, this.albumUrlFnc, albumDate);
  }

  private albumUrlFnc = (item: Album) => {
    return item.artists.length === 1 ? this.url.album(item.artists[0], item.shortName) : '';
  };

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
      differentArtists: [],
      withoutAlbum: [],
    };
  }

  get isLastFm() {
    return this.app === App.lastfm;
  }
}
