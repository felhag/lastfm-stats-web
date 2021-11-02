import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TempStats, Streak, Album } from '../model';
import { SettingsService } from '../service/settings.service';
import { StatsBuilderService } from '../service/stats-builder.service';
import { AbstractListsComponent, Top10Item } from './abstract-lists.component';

export interface AlbumStats {
  betweenAlbums: Top10Item[];
  ongoingBetweenAlbums: Top10Item[];
  weeksPerAlbum: Top10Item[];
  albumStreak: Top10Item[];
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
  
    const now = new Date();
    const endDate = stats.last?.date || now;
    const streak = this.currentAlbumStreak(stats, endDate);
    next.albumStreak = this.getStreakTop10(streak, (s: Streak) => `${s.start.album} (${s.length! + 1} times)`, (s: Streak) => this.dateUrl(s.start.date));
  }

  private currentAlbumStreak(tempStats: TempStats, endDate: Date): Streak[] {
    const current = tempStats.albumStreak.current;
    if (current) {
      const currentStreak = this.ongoingStreak({start: current.start, end: {artist: '?', album: '?', track: '?', date: endDate}});
      return [...tempStats.albumStreak.streaks, currentStreak];
    } else {
      return tempStats.albumStreak.streaks;
    }
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
      albumStreak: [],
    };
  }
}
