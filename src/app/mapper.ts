import { Month, StreakItem, Track, ItemType, TempStats, Album, MonthItem } from './model';

export class Mapper {
  private static mappers = {
    'artist': {
      seen: (stats: TempStats) => stats.seenArtists,
      monthItems: (month: Month) => Object.values(month.artists),
      monthItem: (month: Month, artist: StreakItem) => month.artists[artist.name],
    },
    'album': {
      seen: (stats: TempStats) => stats.seenAlbums,
      monthItems: (month: Month) => Object.values(month.artists).flatMap(a => Object.values(a.albums)),
      monthItem: (month: Month, track: StreakItem) => month.artists[(track as Album).artist]?.albums[(track as Album).shortName],
    },
    'track': {
      seen: (stats: TempStats) => stats.seenTracks,
      monthItems: (month: Month) => Object.values(month.artists).flatMap(a => Object.values(a.tracks)),
      monthItem: (month: Month, track: StreakItem) => month.artists[(track as Track).artist]?.tracks[(track as Track).shortName],
    },
  };

  public static seen(type: ItemType, stats: TempStats) {
    return this.mappers[type].seen(stats);
  }

  public static monthItems(type: ItemType, month: Month): MonthItem[] {
    return this.mappers[type].monthItems(month);
  }

  public static monthItem(type: ItemType, month: Month, item: StreakItem): MonthItem {
    return this.mappers[type].monthItem(month, item);
  }

  public static countPerMonth(type: ItemType, month: Month, item: StreakItem): number {
    return this.monthItem(type, month, item)?.count;
  }
}
