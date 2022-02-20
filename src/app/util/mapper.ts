import { Month, StreakItem, Track, ItemType, TempStats, Album, MonthItem } from '../model';

export class Mapper {
  private static mappers = {
    'artist': {
      seen: (stats: TempStats) => stats.seenArtists,
      monthItems: (month: Month) => [...month.artists.values()],
      monthItem: (month: Month, artist: StreakItem) => month.artists.get(artist.name),
    },
    'album': {
      seen: (stats: TempStats) => stats.seenAlbums,
      monthItems: (month: Month) => [...month.artists.values()].flatMap(a => Object.values(a.albums)),
      monthItem: (month: Month, track: StreakItem) => month.artists.get((track as Album).artist)?.albums[(track as Album).shortName],
    },
    'track': {
      seen: (stats: TempStats) => stats.seenTracks,
      monthItems: (month: Month) => [...month.artists.values()].flatMap(a => Object.values(a.tracks)),
      monthItem: (month: Month, track: StreakItem) => month.artists.get((track as Track).artist)?.tracks[(track as Track).shortName],
    },
  };

  public static seen(type: ItemType, stats: TempStats) {
    return this.mappers[type].seen(stats);
  }

  public static monthItems(type: ItemType, month: Month): MonthItem[] {
    return this.mappers[type].monthItems(month);
  }

  public static monthItem(type: ItemType, month: Month, item: StreakItem): MonthItem {
    return this.mappers[type].monthItem(month, item)!;
  }

  public static countPerMonth(type: ItemType, month: Month, item: StreakItem): number {
    return this.monthItem(type, month, item)?.count;
  }

  public static getWeekYear(date: Date) {
    return `W${this.getWeekNumber(date)} ${date.getFullYear()}`;
  }

  public static getMonthYear(date: Date) {
    return `${date.getMonth()}-${date.getFullYear()}`;
  }

  private static getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)).getTime();
    return Math.ceil((((d.getTime() - yearStart) / 86400000) + 1) / 7);
  }
}
