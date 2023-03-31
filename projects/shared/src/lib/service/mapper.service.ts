import { Injectable } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Month, StreakItem, Track, ItemType, TempStats, Album, MonthItem } from 'projects/shared/src/lib/app/model';
import { AbstractUrlService } from './abstract-url.service';

@UntilDestroy()
@Injectable({
  providedIn: 'root'
})
export class MapperService {
  constructor(private readonly urlService: AbstractUrlService) {
  }

  private mappers = {
    'artist': {
      seen: (stats: TempStats) => stats.seenArtists,
      shortName: (artist: StreakItem) => artist.name,
      monthItems: (month: Month) => [...month.artists.values()],
      monthItem: (month: Month, artist: StreakItem) => month.artists.get(artist.name),
      url: (item: StreakItem) => this.urlService.artist(item.name)
    },
    'album': {
      seen: (stats: TempStats) => stats.seenAlbums,
      shortName: (artist: Track) => artist.shortName,
      monthItems: (month: Month) => [...month.albums.values()],
      monthItem: (month: Month, track: StreakItem) => month.albums.get(track.name),
      url: (item: StreakItem) => this.urlService.album((item as Album).artist, (item as Album).shortName)
    },
    'track': {
      seen: (stats: TempStats) => stats.seenTracks,
      shortName: (artist: Album) => artist.shortName,
      monthItems: (month: Month) => [...month.tracks.values()],
      monthItem: (month: Month, track: StreakItem) => month.tracks.get(track.name),
      url: (item: StreakItem) => this.urlService.track((item as Track).artist, (item as Track).shortName)
    },
  };

  public seen(type: ItemType, stats: TempStats) {
    return this.mappers[type].seen(stats);
  }

  public monthItems(type: ItemType, month: Month): MonthItem[] {
    return this.mappers[type].monthItems(month);
  }

  public monthItem(type: ItemType, month: Month, item: StreakItem): MonthItem {
    return this.mappers[type].monthItem(month, item)!;
  }

  public url(type: ItemType, item: StreakItem) {
    return this.mappers[type].url(item);
  }

  public shortName(type: ItemType, item: StreakItem) {
    return this.mappers[type].shortName(item as any);
  }

  public countPerMonth(type: ItemType, month: Month, item: StreakItem): number {
    return this.monthItem(type, month, item)?.count;
  }

  public cumulativeMonths(type: ItemType, months: Month[], item: StreakItem): number[] {
    const result: number[] = [];
    months.reduce((acc, cur, idx) => result[idx] = acc + (this.countPerMonth(type, cur, item) || 0), 0);
    return result;
  }

  public getWeekYear(date: Date) {
    return `W${this.getWeekNumber(date)} ${date.getFullYear()}`;
  }

  public getMonthYear(date: Date) {
    return `${date.getMonth()}-${date.getFullYear()}`;
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)).getTime();
    return Math.ceil((((d.getTime() - yearStart) / 86400000) + 1) / 7);
  }
}
