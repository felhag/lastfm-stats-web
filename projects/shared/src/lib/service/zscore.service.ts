import { Injectable } from '@angular/core';
import { ItemType, Month, TempStats, ZScoreEntry, Album, Track } from '../app/model';

interface WelfordState {
  count: number;
  mean: number;
  M2: number;
  firstMonthIndex: number;
}

@Injectable({
  providedIn: 'root'
})
export class ZScoreService {
  compute(stats: TempStats, type: ItemType): Map<string, ZScoreEntry[]> {
    const result = new Map<string, ZScoreEntry[]>();

    // Get months in chronological order
    const months = Object.values(stats.monthList).sort((a, b) =>
      a.date.getTime() - b.date.getTime()
    );

    if (months.length === 0) {
      return result;
    }

    // Build inventory of all unique items and track first occurrence
    const itemKeys = new Set<string>();
    const firstOccurrence = new Map<string, number>();

    months.forEach((month, monthIndex) => {
      const items = this.getMonthItems(month, type);
      items.forEach(([key]) => {
        if (!itemKeys.has(key)) {
          itemKeys.add(key);
          firstOccurrence.set(key, monthIndex);
        }
      });
    });

    // Track Welford state for each item
    const states = new Map<string, WelfordState>();
    itemKeys.forEach(key => {
      states.set(key, {
        count: 0,
        mean: 0,
        M2: 0,
        firstMonthIndex: firstOccurrence.get(key)!
      });
    });

    // Process each month chronologically
    months.forEach((month, monthIndex) => {
      const monthEntries: ZScoreEntry[] = [];
      const yearMonth = this.toYearMonth(month);

      // Process each item that exists at this point in time
      states.forEach((state, itemKey) => {
        // Only process if the item has appeared by this month
        if (state.firstMonthIndex > monthIndex) {
          return;
        }

        // Get plays for this month (0 if not present)
        const plays = this.getPlaysForItem(month, type, itemKey);

        // Update Welford state
        state.count += 1;
        const delta = plays - state.mean;
        state.mean += delta / state.count;
        const delta2 = plays - state.mean;
        state.M2 += delta * delta2;

        // Compute z-score
        let z = 0;
        if (state.count >= 2) {
          const variance = state.M2 / state.count;
          const std = Math.sqrt(variance);
          if (std > 0) {
            z = (plays - state.mean) / std;
          }
        }

        // Extract artist and name from key
        const { artist, name } = this.parseItemKey(itemKey, type, stats);

        // Create entry
        const entry: ZScoreEntry = {
          key: itemKey,
          artist,
          name,
          plays,
          mean: state.mean,
          std: state.count >= 2 ? Math.sqrt(state.M2 / state.count) : 0,
          z,
          historyCount: state.count
        };

        monthEntries.push(entry);
      });

      result.set(yearMonth, monthEntries);
    });

    return result;
  }

  private getMonthItems(month: Month, type: ItemType): [string, number][] {
    switch (type) {
      case 'artist':
        return Array.from(month.artists.entries()).map(([key, item]) => [key, item.count]);
      case 'album':
        return Array.from(month.albums.entries()).map(([key, item]) => [key, item.count]);
      case 'track':
        return Array.from(month.tracks.entries()).map(([key, item]) => [key, item.count]);
    }
  }

  private getPlaysForItem(month: Month, type: ItemType, itemKey: string): number {
    switch (type) {
      case 'artist':
        return month.artists.get(itemKey)?.count || 0;
      case 'album':
        return month.albums.get(itemKey)?.count || 0;
      case 'track':
        return month.tracks.get(itemKey)?.count || 0;
    }
  }

  private parseItemKey(itemKey: string, type: ItemType, stats: TempStats): { artist: string; name: string } {
    switch (type) {
      case 'artist':
        return { artist: itemKey, name: itemKey };
      case 'album': {
        const album = stats.seenAlbums[itemKey] as Album | undefined;
        if (album) {
          return {
            artist: album.artists[0] || 'Unknown Artist',
            name: album.shortName
          };
        }
        return { artist: 'Unknown', name: itemKey };
      }
      case 'track': {
        const track = stats.seenTracks[itemKey] as Track | undefined;
        if (track) {
          return {
            artist: track.artist,
            name: track.shortName
          };
        }
        return { artist: 'Unknown', name: itemKey };
      }
    }
  }

  private toYearMonth(month: Month): string {
    const year = month.date.getFullYear();
    const monthNum = month.date.getMonth() + 1;
    return `${year}-${String(monthNum).padStart(2, '0')}`;
  }
}
