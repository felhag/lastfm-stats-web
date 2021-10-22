import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TempStats, Album } from '../model';
import { SettingsService } from '../service/settings.service';
import { StatsBuilderService } from '../service/stats-builder.service';
import { AbstractListsComponent, Top10Item } from './abstract-lists.component';

export interface AlbumStats {
  betweenAlbums: Top10Item[];
  ongoingBetweenAlbums: Top10Item[];
  weeksPerAlbum: Top10Item[];
}

@Component({
  selector: 'app-album-lists',
  templateUrl: './album-lists.component.html',
  styleUrls: ['./lists.component.scss']
})
export class AlbumListsComponent extends AbstractListsComponent<AlbumStats> {
  constructor(builder: StatsBuilderService, settings: SettingsService, route: ActivatedRoute) {
    super(builder, settings, route);
  }

  protected doUpdate(stats: TempStats, next: AlbumStats): void {
    const seen = Object.values(stats.seenAlbums);
    const gaps = this.calculateGaps(stats, stats.seenAlbums, stats.betweenAlbums, 'album', s => this.albumUrl(s.start.artist, s.start.album));
    const albumUrl = (item: Album) => this.albumUrl(item.artist, item.name.substring((item.artist + ' - ').length));
    const albumDate = (item: Album) => new Date(item.avgScrobble);

    next.betweenAlbums = gaps[0];
    next.ongoingBetweenAlbums = gaps[1];
    next.weeksPerAlbum = this.getTop10<Album>(seen, s => s.weeks.length, k => seen[+k], a => a.name, (i, v) => `${v} weeks`, albumUrl, albumDate);
  }

  private albumUrl(artist: string, album: string): string {
    const urlArtist = encodeURIComponent(artist);
    const urlAlbum = encodeURIComponent(album);
    return `${this.rootUrl}/music/${urlArtist}/${urlAlbum}`;
  }

  protected emptyStats(): AlbumStats {
    return {
      betweenAlbums: [],
      ongoingBetweenAlbums: [],
      weeksPerAlbum: [],
    };
  }
}
